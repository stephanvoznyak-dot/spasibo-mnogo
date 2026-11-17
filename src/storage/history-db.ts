/**
 * Canon 2.2 storage: History is the sole source of truth.
 * State is never persisted — always derived via deriveState(history).
 */
import { bytesToHex, hexToBytes } from "@/crypto/bytes";
import { verifyAct } from "@/protocol/act";
import { acceptEvent, deriveState, historyFromActs } from "@/protocol/history";
import { decodeAct, encodeAct, hashActBody } from "@/protocol/serialization";
import type { HashHex, History, HistoryEvent, State } from "@/protocol/types";
import { ProtocolError } from "@/protocol/types";
import { loadActs } from "./db";

const DB_NAME = "normal-project";
const DB_VERSION = 2;

interface StoredHistoryEvent {
  seq: number;
  kind: "act" | "m2" | "clearing" | "write_down";
  wire?: Uint8Array;
  assertion?: {
    version?: 1;
    cycle?: string[];
    residual?: number;
    appliedAt: number;
    nonceHex?: string;
    prevHashHex?: string | null;
    actHashHex?: string;
    sigM2Hex?: string;
    delta?: number;
    authorHex?: string | null;
    sigHex?: string | null;
  };
}

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

function eventToStored(ev: HistoryEvent, seq: number): StoredHistoryEvent {
  if (ev.kind === "act") {
    const keepM2 = Boolean(ev.wire.sigM2);
    const wireAct = keepM2 ? ev.wire : { ...ev.wire, sigM2: null };
    return { seq, kind: "act", wire: encodeAct(keepM2 ? ev.wire : wireAct) };
  }
  if (ev.kind === "m2") {
    return {
      seq,
      kind: "m2",
      assertion: {
        actHashHex: bytesToHex(ev.assertion.actHash),
        sigM2Hex: bytesToHex(ev.assertion.sigM2),
        appliedAt: ev.assertion.appliedAt,
      },
    };
  }
  if (ev.kind === "write_down") {
    return {
      seq,
      kind: "write_down",
      assertion: {
        actHashHex: bytesToHex(ev.assertion.actHash),
        delta: ev.assertion.delta,
        appliedAt: ev.assertion.appliedAt,
      },
    };
  }
  return {
    seq,
    kind: "clearing",
    assertion: {
      version: 1,
      cycle: [...ev.assertion.cycle],
      residual: ev.assertion.residual,
      appliedAt: ev.assertion.appliedAt,
      nonceHex: bytesToHex(ev.assertion.nonce),
      prevHashHex: ev.assertion.prevHash ? bytesToHex(ev.assertion.prevHash) : null,
      authorHex: ev.assertion.author ? bytesToHex(ev.assertion.author) : null,
      sigHex: ev.assertion.sig ? bytesToHex(ev.assertion.sig) : null,
    },
  };
}

function eventFromStored(row: StoredHistoryEvent): HistoryEvent {
  if (row.kind === "act") {
    if (!row.wire) throw new ProtocolError("history: act без wire", "HISTORY");
    const act = decodeAct(row.wire);
    verifyAct(act);
    return { kind: "act", wire: act };
  }
  if (row.kind === "m2") {
    const a = row.assertion;
    if (!a?.actHashHex || !a.sigM2Hex) throw new ProtocolError("history: m2 без полей", "HISTORY");
    return {
      kind: "m2",
      assertion: {
        actHash: hexToBytes(a.actHashHex),
        sigM2: hexToBytes(a.sigM2Hex),
        appliedAt: a.appliedAt,
      },
    };
  }
  if (row.kind === "write_down") {
    const a = row.assertion;
    if (!a?.actHashHex || !(a.delta! > 0)) throw new ProtocolError("history: write_down без полей", "HISTORY");
    return {
      kind: "write_down",
      assertion: {
        actHash: hexToBytes(a.actHashHex),
        delta: a.delta!,
        appliedAt: a.appliedAt,
      },
    };
  }
  if (!row.assertion?.cycle || !row.assertion.nonceHex) {
    throw new ProtocolError("history: clearing без assertion", "HISTORY");
  }
  return {
    kind: "clearing",
    assertion: {
      version: 1,
      cycle: row.assertion.cycle,
      residual: row.assertion.residual!,
      appliedAt: row.assertion.appliedAt,
      nonce: hexToBytes(row.assertion.nonceHex),
      prevHash: row.assertion.prevHashHex ? hexToBytes(row.assertion.prevHashHex) : null,
      author: row.assertion.authorHex ? hexToBytes(row.assertion.authorHex) : null,
      sig: row.assertion.sigHex ? hexToBytes(row.assertion.sigHex) : null,
    },
  };
}

export async function loadHistory(): Promise<History> {
  const db = await openDb();
  try {
    const tx = db.transaction("history", "readonly");
    const rows = await reqToPromise(tx.objectStore("history").getAll() as IDBRequest<StoredHistoryEvent[]>);
    await txDone(tx);
    const sorted = (rows ?? []).slice().sort((a, b) => a.seq - b.seq);
    const history: History = [];
    const errors: string[] = [];
    for (const row of sorted) {
      try {
        history.push(eventFromStored(row));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`seq=${row.seq}: ${msg}`);
        console.warn("history event rejected", row.seq, err);
      }
    }
    if (errors.length) {
      throw new ProtocolError(
        `Журнал повреждён (${errors.length}): ${errors[0]}. Данные на устройстве не удалены.`,
        "HISTORY_CORRUPT",
      );
    }
    return history;
  } finally {
    db.close();
  }
}

export async function saveHistory(history: History): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(["history", "meta"], "readwrite");
    const store = tx.objectStore("history");
    store.clear();
    history.forEach((ev, i) => store.put(eventToStored(ev, i)));
    tx.objectStore("meta").put({ migratedAt: Date.now(), length: history.length }, "history");
    await txDone(tx);
  } finally {
    db.close();
  }
}

export async function appendHistoryEvent(ev: HistoryEvent): Promise<{ seq: number; added: boolean }> {
  const db = await openDb();
  try {
    const tx = db.transaction(["history", "meta"], "readwrite");
    const store = tx.objectStore("history");
    const rows = await reqToPromise(store.getAll() as IDBRequest<StoredHistoryEvent[]>);
    const current = (rows ?? []).slice().sort((a, b) => a.seq - b.seq);

    const parsed: History = [];
    const errors: string[] = [];
    for (const row of current) {
      try {
        parsed.push(eventFromStored(row));
      } catch (err) {
        errors.push(err instanceof Error ? err.message : String(err));
      }
    }
    if (errors.length) {
      try {
        tx.abort();
      } catch {
        /* already finishing */
      }
      throw new ProtocolError(
        `Журнал повреждён (${errors.length}): ${errors[0]}. Запись остановлена, данные не изменены.`,
        "HISTORY_CORRUPT",
      );
    }

    let accepted: { history: History; added: boolean };
    try {
      accepted = acceptEvent(parsed, ev);
    } catch (err) {
      try {
        tx.abort();
      } catch {
        /* already finishing */
      }
      throw err;
    }
    if (!accepted.added) {
      await txDone(tx);
      return { seq: Math.max(0, current.length - 1), added: false };
    }

    const seq = current.length;
    store.put(eventToStored(accepted.history[accepted.history.length - 1]!, seq));
    tx.objectStore("meta").put({ length: seq + 1, updatedAt: Date.now() }, "history");
    await txDone(tx);
    return { seq, added: true };
  } finally {
    db.close();
  }
}

export async function migrateLegacyActsToHistory(): Promise<{ migrated: boolean; actCount: number }> {
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
  if (legacy.length === 0) return { migrated: false, actCount: 0 };

  const history: History = [];
  for (const entry of legacy) {
    const act = entry.act;
    verifyAct(act);
    history.push({ kind: "act", wire: act });
    if (act.sigM2 && entry.remainingAmount < act.amount) {
      const delta = act.amount - entry.remainingAmount;
      if (delta > 0) {
        history.push({
          kind: "write_down",
          assertion: { actHash: act.hash, delta, appliedAt: entry.addedAt },
        });
      }
    }
  }
  await saveHistory(history);
  return { migrated: true, actCount: legacy.length };
}

export async function loadState(): Promise<{ history: History; state: State }> {
  await migrateLegacyActsToHistory();
  const history = await loadHistory();
  const state = deriveState(history);
  return { history, state };
}

export function remainingOf(state: State, hashHex: HashHex): number {
  return state.remaining.get(hashHex) ?? 0;
}

export function exportHistoryJson(history: History): string {
  const events = history.map((ev) => {
    if (ev.kind === "act") return { kind: "act", wireHex: bytesToHex(encodeAct(ev.wire)) };
    if (ev.kind === "m2") {
      return {
        kind: "m2",
        actHashHex: bytesToHex(ev.assertion.actHash),
        sigM2Hex: bytesToHex(ev.assertion.sigM2),
        appliedAt: ev.assertion.appliedAt,
      };
    }
    if (ev.kind === "write_down") {
      return {
        kind: "write_down",
        actHashHex: bytesToHex(ev.assertion.actHash),
        delta: ev.assertion.delta,
        appliedAt: ev.assertion.appliedAt,
      };
    }
    return {
      kind: "clearing",
      version: 1,
      cycle: ev.assertion.cycle,
      residual: ev.assertion.residual,
      appliedAt: ev.assertion.appliedAt,
      nonceHex: bytesToHex(ev.assertion.nonce),
      prevHashHex: ev.assertion.prevHash ? bytesToHex(ev.assertion.prevHash) : null,
      authorHex: ev.assertion.author ? bytesToHex(ev.assertion.author) : null,
      sigHex: ev.assertion.sig ? bytesToHex(ev.assertion.sig) : null,
    };
  });
  return JSON.stringify(
    { proto: "normal-project", ver: 2, format: "history", exportedAt: Date.now(), events },
    null,
    2,
  );
}

export function importHistoryJson(json: string): History {
  const data = JSON.parse(json) as { format?: string; events?: Array<Record<string, unknown>> };
  if (data.format === "history" && Array.isArray(data.events)) {
    const history: History = [];
    for (const row of data.events) {
      if (row.kind === "act" && typeof row.wireHex === "string") {
        const act = decodeAct(hexToBytes(row.wireHex));
        verifyAct(act);
        history.push({ kind: "act", wire: act });
      } else if (row.kind === "m2") {
        history.push({
          kind: "m2",
          assertion: {
            actHash: hexToBytes(String(row.actHashHex)),
            sigM2: hexToBytes(String(row.sigM2Hex)),
            appliedAt: Number(row.appliedAt) || Date.now(),
          },
        });
      } else if (row.kind === "write_down") {
        history.push({
          kind: "write_down",
          assertion: {
            actHash: hexToBytes(String(row.actHashHex)),
            delta: Number(row.delta),
            appliedAt: Number(row.appliedAt) || Date.now(),
          },
        });
      } else if (row.kind === "clearing") {
        history.push({
          kind: "clearing",
          assertion: {
            version: 1,
            cycle: row.cycle as string[],
            residual: Number(row.residual),
            appliedAt: Number(row.appliedAt) || Date.now(),
            nonce: hexToBytes(String(row.nonceHex)),
            prevHash: row.prevHashHex ? hexToBytes(String(row.prevHashHex)) : null,
            author: row.authorHex ? hexToBytes(String(row.authorHex)) : null,
            sig: row.sigHex ? hexToBytes(String(row.sigHex)) : null,
          },
        });
      }
    }
    deriveState(history);
    return dedupeImportedHistory(history);
  }
  throw new ProtocolError("Неизвестный формат экспорта (ожидается history v2)", "IMPORT");
}

function dedupeImportedHistory(history: History): History {
  const out: History = [];
  const acts = new Set<string>();
  const m2s = new Set<string>();
  const clearings = new Set<string>();
  const writes = new Set<string>();
  for (const ev of history) {
    if (ev.kind === "act") {
      const id = bytesToHex(hashActBody(ev.wire));
      if (acts.has(id)) continue;
      acts.add(id);
      out.push(ev);
    } else if (ev.kind === "m2") {
      const id = bytesToHex(ev.assertion.actHash);
      if (m2s.has(id)) continue;
      m2s.add(id);
      out.push(ev);
    } else if (ev.kind === "clearing") {
      const id = bytesToHex(ev.assertion.nonce);
      if (clearings.has(id)) continue;
      clearings.add(id);
      out.push(ev);
    } else {
      const id = `${bytesToHex(ev.assertion.actHash)}:${ev.assertion.delta}:${ev.assertion.appliedAt}`;
      if (writes.has(id)) continue;
      writes.add(id);
      out.push(ev);
    }
  }
  return out;
}
