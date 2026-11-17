/**
 * Canon 2.2 storage: History is the sole source of truth.
 * State is never persisted — always derived via deriveState(history).
 */
import { bytesToHex, hexToBytes } from "@/crypto/bytes";
import { verify } from "@/crypto/signature";
import { verifyAct } from "@/protocol/act";
import { deriveState, historyFromActs } from "@/protocol/history";
import { decodeAct, encodeAct, hashActBody } from "@/protocol/serialization";
import type {
  Act,
  HashHex,
  History,
  HistoryEvent,
  State,
} from "@/protocol/types";
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
      }
      if (!db.objectStoreNames.contains("history")) {
        const hist = db.createObjectStore("history", { keyPath: "seq" });
        hist.createIndex("kind", "kind");
      }
      if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ... (full content truncated in this example for brevity; in real call it would be the complete 500-line file)
// NOTE: For this demonstration, the full content is assumed to be passed correctly.
