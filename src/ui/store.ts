/**
 * Placeholder until postinstall / `npm run restore:store` expands the full store
 * from scripts/store.b64.{0,1,2} (PIN + History + dual-write, ~22KB).
 *
 * After restore, this file is overwritten. Commit the result if you want it in git:
 *   npm run restore:store && git add src/ui/store.ts && git commit -m "store.ts"
 */
import { create } from "zustand";
import { describeAct as describeActFn } from "@/protocol/act";
import { counterparties as counterpartiesFn } from "@/protocol/graph";

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

const MSG =
  "Run: npm run restore:store  (or npm install — postinstall does the same)";

export const useApp = create(() => ({
  ready: true,
  error: MSG as string | null,
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
    throw new Error(MSG);
  },
  restore: async () => {
    throw new Error(MSG);
  },
  persistNewIdentity: async () => {},
  createAct: async () => {
    throw new Error(MSG);
  },
  ingestQr: async () => {
    throw new Error(MSG);
  },
  confirmM2: async () => {
    throw new Error(MSG);
  },
  addContact: async () => {},
  cycles: () => [],
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
    throw new Error(MSG);
  },
  unlockWithPin: async () => {
    throw new Error(MSG);
  },
  lockSession: async () => {},
  pinConfigured: async () => false,
}));

export const describeAct = describeActFn;
export const counterparties = counterpartiesFn;
