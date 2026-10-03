/**
 * Canon 2.2 storage: History is the sole source of truth.
 * State is never persisted — always derived via deriveState(history).
 *
 * Soft migration from legacy `acts` object store (LedgerEntry with remainingAmount).
 */
import { bytesToHex, hexToBytes } from "@/crypto/bytes";
import { verifyAct } from "@/protocol/act";
import { deriveState, historyFromActs } from "@/protocol/history";
import { decodeAct, encodeAct } from "@/protocol/serialization";
import type {
  Act,
  ClearingAssertion,
  HashHex,
  History,
  HistoryEvent,
  State,
} from "@/protocol/types";
import { ProtocolError } from "@/protocol/types";
import { loadActs } from "./db";

const DB_NAME = "normal-project";
const DB_VERSION = 2; // bump: add `history` store

interface StoredHistoryEvent {
  seq: number;
  kind: "act" | "clearing";
  /** CBOR-encoded Act for kind=act */
  wire?: Uint8Array;
  /** JSON-serialisable clearing assertion (bytes as hex) */
  assertion?: {
    version: 1;
    cycle: string[];
    residual: number;
    appliedAt: number;
    nonceHex: string;
    prevHashHex?: string | null;
  };
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (ev) => {
      const db = req.result;
      // Keep legacy stores from v1
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
      // v2: ordered history log
      if (!db.objectStoreNames.contains("history")) {
        db.createObjectStore("history", { keyPath: "seq" });
      }
      if (!db.objectStoreNames.contains("meta")) {
        db.createObjectStore("meta");
      }
      void ev;
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB: не удалось открыть базу"));
  });
}

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Ошибка IndexedDB"));
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Транзакция сорвалась"));
    tx.onabort = () => reject(tx.error ?? new Error("Транзакция прервана"));
  });
}

function assertionToStored(a: ClearingAssertion): StoredHistoryEvent["assertion"] {
  return {
    version: 1,
    cycle: [...a.cycle],
    residual: a.residual,
    appliedAt: a.appliedAt,
    nonceHex: bytesToHex(a.nonce),
    prevHashHex: a.prevHash ? bytesToHex(a.prevHash) : null,
  };
}

function assertionFromStored(s: NonNullable<StoredHistoryEvent["assertion"]>): ClearingAssertion {
  return {
    version: 1,
    cycle: s.cycle,
    residual: s.residual,
    appliedAt: s.appliedAt,
    nonce: hexToBytes(s.nonceHex),
    prevHash: s.prevHashHex ? hexToBytes(s.prevHashHex) : null,
  };
}

function eventToStored(ev: HistoryEvent, seq: number): StoredHistoryEvent {
  if (ev.kind === "act") {
    return { seq, kind: "act", wire: encodeAct(ev.wire) };
  }
  return { seq, kind: "clearing", assertion: assertionToStored(ev.assertion) };
}

function eventFromStored(row: StoredHistoryEvent): HistoryEvent {
  if (row.kind === "act") {
    if (!row.wire) throw new ProtocolError("history: act без wire", "HISTORY");
    const act = decodeAct(row.wire);
    verifyAct(act);
    return { kind: "act", wire: act };
  }
  if (!row.assertion) throw new ProtocolError("history: clearing без assertion", "HISTORY");
  return { kind: "clearing", assertion: assertionFromStored(row.assertion) };
}

/** Load full ordered History from the `history` store. */
export async function loadHistory(): Promise<History> {
  const db = await openDb();
  try {
    const tx = db.transaction("history", "readonly");
    const rows = await reqToPromise(
      tx.objectStore("history").getAll() as IDBRequest<StoredHistoryEvent[]>,
    );
    await txDone(tx);
    const sorted = (rows ?? []).slice().sort((a, b) => a.seq - b.seq);
    const history: History = [];
    for (const row of sorted) {
      try {
        history.push(eventFromStored(row));
      } catch (err) {
        console.warn("history event rejected", row.seq, err);
      }
    }
    return history;
  } finally {
    db.close();
  }
}

/** Replace entire History (used after migration or bulk import). */
export async function saveHistory(history: History): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(["history", "meta"], "readwrite");
    const store = tx.objectStore("history");
    store.clear();
    history.forEach((ev, i) => {
      store.put(eventToStored(ev, i));
    });
    tx.objectStore("meta").put({ migratedAt: Date.now(), length: history.length }, "history");
    await txDone(tx);
  } finally {
    db.close();
  }
}

/** Append one event; returns new length. Idempotent for acts (by hash). */
export async function appendHistoryEvent(ev: HistoryEvent): Promise<{ seq: number; added: boolean }> {
  const current = await loadHistory();

  if (ev.kind === "act") {
    verifyAct(ev.wire);
    const hashHex = bytesToHex(ev.wire.hash);
    const exists = current.some(
      (e) => e.kind === "act" && bytesToHex(e.wire.hash) === hashHex,
    );
    if (exists) return { seq: current.length - 1, added: false };
  }

  const seq = current.length;
  const db = await openDb();
  try {
    const tx = db.transaction(["history", "meta"], "readwrite");
    tx.objectStore("history").put(eventToStored(ev, seq));
    tx.objectStore("meta").put({ length: seq + 1, updatedAt: Date.now() }, "history");
    await txDone(tx);
  } finally {
    db.close();
  }
  return { seq, added: true };
}

/**
 * Migrate legacy `acts` store → `history` if history is empty.
 * Synthesises no ClearingAssertions (remaining differences are dropped into
 * derived state only after user re-clears, or can be added later).
 * Idempotent.
 */
export async function migrateLegacyActsToHistory(): Promise<{
  migrated: boolean;
  actCount: number;
}> {
  const existing = await loadHistory();
  if (existing.length > 0) {
    return { migrated: false, actCount: existing.filter((e) => e.kind === "act").length };
  }

  let legacy: Awaited<ReturnType<typeof loadActs>> = [];
  try {
    legacy = await loadActs();
  } catch {
    return { migrated: false, actCount: 0 };
  }

  if (legacy.length === 0) {
    return { migrated: false, actCount: 0 };
  }

  const acts: Act[] = legacy.map((e) => e.act);
  const history = historyFromActs(acts);
  await saveHistory(history);
  return { migrated: true, actCount: history.length };
}

/** Load History and derive State in one call (primary read path for UI). */
export async function loadState(): Promise<{ history: History; state: State }> {
  await migrateLegacyActsToHistory();
  const history = await loadHistory();
  const state = deriveState(history);
  return { history, state };
}

/** Convenience: remaining of an act from State. */
export function remainingOf(state: State, hashHex: HashHex): number {
  return state.remaining.get(hashHex) ?? 0;
}
