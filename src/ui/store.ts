import { create } from "zustand";
import { counterparties as counterpartiesFn, describeAct as describeActFn } from "@/protocol/graph";

/**
 * Temporary stub after accidental PLACEHOLDER push.
 * Full implementation: project artifacts `store-with-pin.ts` (PIN + dual-write)
 * or `store-base.ts` (pre-PIN). Copy to src/ui/store.ts and commit.
 */
export type Screen =
  | "home"
  | "create"
  | "scan"
  | "ledger"
  | "detail"
  | "clearing"
  | "contacts"
  | "settings"
  | "lab"
  | "guide"
  | "tech"
  | "qr";

export interface Identity {
  publicKey: Uint8Array;
  secretKey: Uint8Array | null;
  publicKeyHex: string;
  fingerprint: string;
  mnemonic: string;
  wordCount: 12 | 24;
  locked?: boolean;
}

export interface QrPayload {
  title: string;
  text: string;
  hint: string;
}

export const DUAL_WRITE_LEGACY = true;

const STUB = "Скопируйте artifacts/store-with-pin.ts → src/ui/store.ts";

export const useApp = create(() => ({
  ready: true,
  error: STUB as string | null,
  identity: null as Identity | null,
  entries: [] as unknown[],
  history: [] as unknown[],
  contacts: [] as unknown[],
  settings: { theme: "dark" as const, lang: "ru" as const, autoClear: false, labUnlocked: false },
  screen: "home" as Screen,
  selectedHash: null as string | null,
  qr: null as QrPayload | null,
  swarmPeers: 0,
  swarmEvent: "—",
  lastClearing: null as unknown,
  boot: async () => {},
  setScreen: (_s: Screen) => {},
  setLang: async () => {},
  setTheme: async () => {},
  createNew: async () => {
    throw new Error(STUB);
  },
  restore: async () => {
    throw new Error(STUB);
  },
  persistNewIdentity: async () => {},
  createAct: async () => {
    throw new Error(STUB);
  },
  ingestQr: async () => {
    throw new Error(STUB);
  },
  confirmM2: async () => {
    throw new Error(STUB);
  },
  addContact: async () => {},
  runClearing: async () => [],
  exportJson: async () => "{}",
  importJson: async () => {},
  wipe: async () => {},
  setQr: (_q: QrPayload | null) => {},
  selectHash: (_h: string | null) => {},
  unlockLab: async () => {},
  tryUnlockLab: async () => false,
  addTutorialContacts: async () => {},
  seedDemoTriangle: async () => {},
  fastLabIdentity: async () => {},
  setAutoClear: async () => {},
  setError: (_m: string | null) => {},
  setPin: async () => {
    throw new Error(STUB);
  },
  unlockWithPin: async () => {
    throw new Error(STUB);
  },
  lockSession: async () => {},
  pinConfigured: async () => false,
}));

export const describeAct = describeActFn;
export const counterparties = counterpartiesFn;
