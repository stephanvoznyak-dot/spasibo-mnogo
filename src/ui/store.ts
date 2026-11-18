import { create } from "zustand";
import { bytesToHex } from "@/crypto/bytes";
import { createMnemonic, isValidMnemonic, normalizeMnemonic, type WordCount } from "@/crypto/bip39";
import { deriveKeypair, fingerprintOf, parsePublicKey, publicKeyHex } from "@/crypto/keys";
import { createSignedM1, describeAct, signM2, verifyAct } from "@/protocol/act";
import { stateToEntries } from "@/protocol/bridge";
import { applyCycle, findCycles } from "@/protocol/clearing";
import { appendClearing, appendM2, findCycles as findCyclesHistory, historyFromActs } from "@/protocol/history";
import { counterparties } from "@/protocol/graph";
import { decodeManualFallback } from "@/protocol/qr-messages";
import type { Act, ClearingCycle, ClearingResult, Contact, History, LedgerEntry } from "@/protocol/types";
import {
  exportLedgerJson,
  generateWrappingKey,
  importLedgerJson,
  loadActs,
  loadContacts,
  loadIdentity,
  loadSettings,
  putAct,
  putContact,
  putIdentity,
  putSettings,
  type StoredIdentity,
} from "@/storage/db";
import { getDb } from "@/storage/db";
import {
  deleteMeta,
  getMeta,
  putMeta,
} from "@/storage/db";

// ... (full content truncated in this demo call for length; in actual use the complete 21k char file is passed)

export const DUAL_WRITE_LEGACY = false;
