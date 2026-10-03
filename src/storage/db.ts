import { bytesToHex, hexToBytes, utf8Decode, utf8Encode } from "@/crypto/bytes";
import {
  decryptWithKey,
  encryptWithKey,
  generateWrappingKey,
  type EncryptedBlob,
} from "@/crypto/secret";
import { verifyAct } from "@/protocol/act";
import { clampRemaining } from "@/protocol/graph";
import { decodeAct, encodeAct } from "@/protocol/serialization";
import type { Act, ActStatus, Contact, LedgerEntry } from "@/protocol/types";

const DB_NAME = "normal-project";
/** Keep in sync with history-db.ts */
const DB_VERSION = 2;

export interface StoredIdentity {
  publicKeyHex: string;
  fingerprint: string;
  createdAt: number;
  wordCount: 12 | 24;
  mnemonicBlob: EncryptedBlob;
}

export interface AppSettings {
  theme: "dark" | "light" | "system";
  lang: "ru" | "en";
  autoClear: boolean;
  labUnlocked: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: "dark",
  lang: "ru",
  autoClear: false,
  labUnlocked: false,
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("identity")) db.createObjectStore("identity");
      if (!db.objectStoreNames.contains("keys")) db.createObjectStore("keys");
      if (!db.objectStoreNames.contains("acts")) {
        const acts = db.createObjectStore("acts", { keyPath: "hashHex" });
        acts.createIndex("timestamp", "timestamp");
        acts.createIndex("status", "status");
        acts.createIndex("from", "fromHex");
        acts.createIndex("to", "toHex");
      }
      if (!db.objectStoreNames.contains("contacts")) {
        db.createObjectStore("contacts", { keyPath: "publicKeyHex" });
      }
      if (!db.objectStoreNames.contains("settings")) db.createObjectStore("settings");
      if (!db.objectStoreNames.contains("events")) {
        db.createObjectStore("events", { autoIncrement: true });
      }
      if (!db.objectStoreNames.contains("history")) {
        db.createObjectStore("history", { keyPath: "seq" });
      }
      if (!db.objectStoreNames.contains("meta")) {
        db.createObjectStore("meta");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB: не удалось открыть базу"));
  });
}

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Ошибка записи журнала"));
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Транзакция журнала сорвалась"));
    tx.onabort = () => reject(tx.error ?? new Error("Транзакция журнала прервана"));
  });
}

export async function saveIdentity(record: StoredIdentity, wrappingKey: CryptoKey, mnemonic: string) {
  const blob = await encryptWithKey(wrappingKey, utf8Encode(mnemonic));
  record.mnemonicBlob = blob;
  const db = await openDb();
  try {
    const tx = db.transaction(["identity", "keys"], "readwrite");
    tx.objectStore("identity").put(record, "current");
    tx.objectStore("keys").put(wrappingKey, "wrap");
    await txDone(tx);
  } finally {
    db.close();
  }
}

export async function loadIdentity(): Promise<{
  record: StoredIdentity;
  mnemonic: string;
} | null> {
  const db = await openDb();
  try {
    const tx = db.transaction(["identity", "keys"], "readonly");
    const record = await reqToPromise(tx.objectStore("identity").get("current") as IDBRequest<StoredIdentity | undefined>);
    const key = await reqToPromise(tx.objectStore("keys").get("wrap") as IDBRequest<CryptoKey | undefined>);
    await txDone(tx);
    if (!record || !key) return null;
    const mnemonic = utf8Decode(await decryptWithKey(key, record.mnemonicBlob));
    return { record, mnemonic };
  } finally {
    db.close();
  }
}

export async function clearIdentity() {
  const db = await openDb();
  try {
    const tx = db.transaction(["identity", "keys"], "readwrite");
    tx.objectStore("identity").delete("current");
    tx.objectStore("keys").delete("wrap");
    await txDone(tx);
  } finally {
    db.close();
  }
}

export async function wipeUserData() {
  const db = await openDb();
  try {
    const names = ["identity", "keys", "acts", "contacts", "history", "meta"] as const;
    const existing = names.filter((n) => db.objectStoreNames.contains(n));
    const tx = db.transaction(existing, "readwrite");
    for (const n of existing) tx.objectStore(n).clear();
    await txDone(tx);
  } finally {
    db.close();
  }
}

export { generateWrappingKey };

interface StoredAct {
  hashHex: string;
  fromHex: string;
  toHex: string;
  timestamp: number;
  status: ActStatus;
  remainingAmount: number;
  addedAt: number;
  wire: Uint8Array;
}

function toStored(entry: LedgerEntry): StoredAct {
  const remainingAmount = clampRemaining(entry.act.amount, entry.remainingAmount, Boolean(entry.act.sigM2));
  return {
    hashHex: bytesToHex(entry.act.hash),
    fromHex: bytesToHex(entry.act.from),
    toHex: bytesToHex(entry.act.to),
    timestamp: entry.act.timestamp,
    status: entry.status,
    remainingAmount,
    addedAt: entry.addedAt,
    wire: encodeAct(entry.act),
  };
}

function fromStored(row: StoredAct): LedgerEntry {
  const act = decodeAct(row.wire);
  verifyAct(act);
  return {
    act,
    status: row.status,
    remainingAmount: clampRemaining(act.amount, row.remainingAmount, Boolean(act.sigM2)),
    addedAt: row.addedAt,
  };
}

export async function putAct(entry: LedgerEntry): Promise<void> {
  try {
    verifyAct(entry.act);
    const db = await openDb();
    try {
      const tx = db.transaction("acts", "readwrite");
      tx.objectStore("acts").put(toStored(entry));
      await txDone(tx);
    } finally {
      db.close();
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Неизвестная ошибка записи журнала";
    throw new Error(`Журнал не записан: ${message}`);
  }
}

export async function putActs(entries: LedgerEntry[]): Promise<void> {
  try {
    const db = await openDb();
    try {
      const tx = db.transaction("acts", "readwrite");
      const store = tx.objectStore("acts");
      for (const entry of entries) {
        verifyAct(entry.act);
        store.put(toStored(entry));
      }
      await txDone(tx);
    } finally {
      db.close();
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Неизвестная ошибка записи журнала";
    throw new Error(`Журнал не записан: ${message}`);
  }
}

export async function loadActs(): Promise<LedgerEntry[]> {
  const db = await openDb();
  try {
    const tx = db.transaction("acts", "readonly");
    const rows = await reqToPromise(tx.objectStore("acts").getAll() as IDBRequest<StoredAct[]>);
    await txDone(tx);
    const entries: LedgerEntry[] = [];
    for (const row of rows ?? []) {
      try {
        entries.push(fromStored(row));
      } catch (err) {
        console.warn("Акт не прошёл проверку целостности", row.hashHex, err);
      }
    }
    entries.sort((a, b) => a.act.timestamp - b.act.timestamp || a.addedAt - b.addedAt);
    return entries;
  } finally {
    db.close();
  }
}

export async function saveContacts(contacts: Contact[]): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction("contacts", "readwrite");
    const store = tx.objectStore("contacts");
    store.clear();
    for (const c of contacts) store.put(c);
    await txDone(tx);
  } finally {
    db.close();
  }
}

export async function loadContacts(): Promise<Contact[]> {
  const db = await openDb();
  try {
    const tx = db.transaction("contacts", "readonly");
    const rows = await reqToPromise(tx.objectStore("contacts").getAll() as IDBRequest<Contact[]>);
    await txDone(tx);
    return rows ?? [];
  } finally {
    db.close();
  }
}

export async function loadSettings(): Promise<AppSettings> {
  const db = await openDb();
  try {
    const tx = db.transaction("settings", "readonly");
    const row = await reqToPromise(tx.objectStore("settings").get("app") as IDBRequest<AppSettings | undefined>);
    await txDone(tx);
    return { ...DEFAULT_SETTINGS, ...row };
  } finally {
    db.close();
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction("settings", "readwrite");
    tx.objectStore("settings").put(settings, "app");
    await txDone(tx);
  } finally {
    db.close();
  }
}

export async function appendEvent(event: Record<string, unknown>): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction("events", "readwrite");
    tx.objectStore("events").add({ ...event, at: Date.now() });
    await txDone(tx);
  } finally {
    db.close();
  }
}

export async function exportLedgerJson(entries: LedgerEntry[]): Promise<string> {
  const acts = entries.map((e) => ({
    hash: bytesToHex(e.act.hash),
    from: bytesToHex(e.act.from),
    to: bytesToHex(e.act.to),
    amount: e.act.amount,
    note: e.act.note,
    timestamp: e.act.timestamp,
    nonce: bytesToHex(e.act.nonce),
    sigM1: bytesToHex(e.act.sigM1),
    sigM2: e.act.sigM2 ? bytesToHex(e.act.sigM2) : null,
    status: e.status,
    remainingAmount: e.remainingAmount,
  }));
  return JSON.stringify({ proto: "normal-project", ver: 1, exportedAt: Date.now(), acts }, null, 2);
}

export function importLedgerJson(json: string): LedgerEntry[] {
  const data = JSON.parse(json) as { acts?: Array<Record<string, unknown>> };
  if (!Array.isArray(data.acts)) throw new Error("Файл журнала повреждён");
  return data.acts.map((row) => {
    const act: Act = {
      version: 1,
      from: hexToBytes(String(row.from)),
      to: hexToBytes(String(row.to)),
      amount: Number(row.amount),
      note: String(row.note ?? ""),
      timestamp: Number(row.timestamp),
      nonce: hexToBytes(String(row.nonce)),
      hash: hexToBytes(String(row.hash ?? "00".repeat(32))),
      sigM1: hexToBytes(String(row.sigM1)),
      sigM2: row.sigM2 ? hexToBytes(String(row.sigM2)) : null,
    };
    verifyAct(act);
    return {
      act,
      status: (row.status as ActStatus) ?? (act.sigM2 ? "finalized" : "pending_m2"),
      remainingAmount: clampRemaining(
        act.amount,
        Number(row.remainingAmount ?? (act.sigM2 ? act.amount : 0)),
        Boolean(act.sigM2),
      ),
      addedAt: Date.now(),
    };
  });
}
