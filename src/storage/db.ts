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
    const record = await reqToPromise(
      tx.objectStore("identity").get("current") as IDBRequest<StoredIdentity | undefined>,
    );
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

export async function loadActs(): Promise<LedgerEntry[]> {
  const db = await openDb();
  try {
    const tx = db.transaction("acts", "readonly");
    const rows = await reqToPromise(tx.objectStore("acts").getAll() as IDBRequest<StoredAct[]>);
    await txDone(tx);
    const out: LedgerEntry[] = [];
    for (const row of rows ?? []) {
      try {
        const act = decodeAct(hexToBytes(row.wireHex));
        verifyAct(act);
        const remainingAmount = clampRemaining(act.amount, row.remainingAmount, Boolean(act.sigM2));
        out.push({
          act,
          status: row.status as ActStatus,
          remainingAmount,
          addedAt: row.addedAt,
        });
      } catch {
        /* skip corrupt */
      }
    }
    return out.sort((a, b) => a.act.timestamp - b.act.timestamp);
  } finally {
    db.close();
  }
}

interface StoredAct {
  hashHex: string;
  wireHex: string;
  status: string;
  remainingAmount: number;
  addedAt: number;
  timestamp: number;
  fromHex: string;
  toHex: string;
}

export async function putAct(entry: LedgerEntry): Promise<void> {
  const hashHex = bytesToHex(entry.act.hash);
  const row: StoredAct = {
    hashHex,
    wireHex: bytesToHex(encodeAct(entry.act)),
    status: entry.status,
    remainingAmount: entry.remainingAmount,
    addedAt: entry.addedAt,
    timestamp: entry.act.timestamp,
    fromHex: bytesToHex(entry.act.from),
    toHex: bytesToHex(entry.act.to),
  };
  const db = await openDb();
  try {
    const tx = db.transaction("acts", "readwrite");
    tx.objectStore("acts").put(row);
    await txDone(tx);
  } finally {
    db.close();
  }
}

export async function putActs(entries: LedgerEntry[]): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction("acts", "readwrite");
    const store = tx.objectStore("acts");
    for (const entry of entries) {
      const hashHex = bytesToHex(entry.act.hash);
      store.put({
        hashHex,
        wireHex: bytesToHex(encodeAct(entry.act)),
        status: entry.status,
        remainingAmount: entry.remainingAmount,
        addedAt: entry.addedAt,
        timestamp: entry.act.timestamp,
        fromHex: bytesToHex(entry.act.from),
        toHex: bytesToHex(entry.act.to),
      } satisfies StoredAct);
    }
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

export async function exportLedgerJson(): Promise<string> {
  const acts = await loadActs();
  return JSON.stringify(
    {
      v: 1,
      acts: acts.map((e) => ({
        wireHex: bytesToHex(encodeAct(e.act)),
        status: e.status,
        remainingAmount: e.remainingAmount,
        addedAt: e.addedAt,
      })),
    },
    null,
    2,
  );
}

export async function importLedgerJson(json: string): Promise<LedgerEntry[]> {
  const parsed = JSON.parse(json) as { acts?: Array<Record<string, unknown>> };
  if (!Array.isArray(parsed.acts)) throw new Error("Некорректный экспорт");
  const out: LedgerEntry[] = [];
  for (const row of parsed.acts) {
    if (typeof row.wireHex !== "string") continue;
    const act = decodeAct(hexToBytes(row.wireHex));
    verifyAct(act);
    const remainingAmount = clampRemaining(
      act.amount,
      typeof row.remainingAmount === "number" ? row.remainingAmount : act.amount,
      Boolean(act.sigM2),
    );
    out.push({
      act,
      status: (typeof row.status === "string" ? row.status : "finalized") as ActStatus,
      remainingAmount,
      addedAt: typeof row.addedAt === "number" ? row.addedAt : Date.now(),
    });
  }
  return out;
}

export async function wipeUserData(): Promise<void> {
  const db = await openDb();
  try {
    const names = ["identity", "keys", "acts", "contacts", "history", "meta", "settings"] as const;
    const existing = names.filter((n) => db.objectStoreNames.contains(n));
    if (existing.length === 0) return;
    const tx = db.transaction([...existing], "readwrite");
    for (const n of existing) tx.objectStore(n).clear();
    await txDone(tx);
  } finally {
    db.close();
  }
}

export { generateWrappingKey };

export async function saveMeta(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction("meta", "readwrite");
    tx.objectStore("meta").put(value, key);
    await txDone(tx);
  } finally {
    db.close();
  }
}

export async function loadMeta<T = unknown>(key: string): Promise<T | null> {
  const db = await openDb();
  try {
    const tx = db.transaction("meta", "readonly");
    const row = await reqToPromise(tx.objectStore("meta").get(key) as IDBRequest<T | undefined>);
    await txDone(tx);
    return row ?? null;
  } finally {
    db.close();
  }
}

export async function deleteMeta(key: string): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction("meta", "readwrite");
    tx.objectStore("meta").delete(key);
    await txDone(tx);
  } finally {
    db.close();
  }
}
