/**
 * Canon 2.2 storage: History is the sole source of truth.
 * State is never persisted — always derived via deriveState(history).
 */
import { bytesToHex, hexToBytes } from "@/crypto/bytes";
import { verify } from "@/crypto/signature";
import { verifyAct } from "@/protocol/act";
import { deriveState } from "@/protocol/history";
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
