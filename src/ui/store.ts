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
  putActs,
  saveContacts,
  saveIdentity,
  saveSettings,
  wipeUserData,
  loadMeta,
  saveMeta,
  // deleteMeta,
  type AppSettings,
} from "@/storage/db";
import {
  appendHistoryEvent,
  exportHistoryJson,
  importHistoryJson,
  loadState,
  migrateLegacyActsToHistory,
  saveHistory,
} from "@/storage/history-db";
import { PIN_META_KEY, openMnemonicWithPin, sealMnemonicWithPin } from "@/crypto/pin-session";
import type { EncryptedBlob } from "@/crypto/secret";
import { entryFromAct, startSwarm, type SwarmHandle } from "@/swarm/sync";
import { type Lang } from "./i18n";
import { allTutorialAgents, checkLabPassword, tutorialKeypair } from "./tutorial";
