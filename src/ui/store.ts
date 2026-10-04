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
import { entryFromAct, startSwarm, type SwarmHandle } from "@/swarm/sync";
import { type Lang } from "./i18n";
import { allTutorialAgents, checkLabPassword, tutorialKeypair } from "./tutorial";

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
  secretKey: Uint8Array;
  publicKeyHex: string;
  fingerprint: string;
  mnemonic: string;
  wordCount: WordCount;
}

export interface QrPayload {
  title: string;
  text: string;
  hint: string;
}

interface AppState {
  ready: boolean;
  error: string | null;
  identity: Identity | null;
  entries: LedgerEntry[];
  history: History;
  contacts: Contact[];
  settings: AppSettings;
  screen: Screen;
  selectedHash: string | null;
  qr: QrPayload | null;
  swarmPeers: number;
  swarmEvent: string;
  lastClearing: ClearingResult[] | null;
  boot: () => Promise<void>;
  setScreen: (s: Screen) => void;
  setLang: (lang: Lang) => Promise<void>;
  setTheme: (theme: AppSettings["theme"]) => Promise<void>;
  createNew: (wordCount: WordCount) => Promise<Identity>;
  restore: (mnemonic: string) => Promise<void>;
  persistNewIdentity: (identity: Identity) => Promise<void>;
  createAct: (toHex: string, amount: number, note: string) => Promise<Act>;
  ingestQr: (raw: string) => Promise<{ kind: "proposal" | "final"; act: Act; error?: string }>;
  confirmM2: (act: Act) => Promise<Act>;
  addContact: (publicKeyHexValue: string, displayName?: string) => Promise<void>;
  cycles: () => ClearingCycle[];
  runClearing: (cycle?: ClearingCycle) => Promise<ClearingResult[]>;
  exportJson: () => Promise<string>;
  importJson: (json: string) => Promise<void>;
  wipe: () => Promise<void>;
  setError: (message: string | null) => void;
  setQr: (qr: QrPayload | null) => void;
  selectHash: (hash: string | null) => void;
  unlockLab: () => Promise<void>;
  tryUnlockLab: (password: string) => Promise<boolean>;
  addTutorialContacts: () => Promise<void>;
  seedDemoTriangle: () => Promise<void>;
  fastLabIdentity: () => Promise<void>;
  setAutoClear: (on: boolean) => Promise<void>;
}

let swarm: SwarmHandle | null = null;
let swarmTimer: number | null = null;

function identityFromMnemonic(mnemonic: string, wordCount: WordCount): Identity {
  const keys = deriveKeypair(mnemonic);
  return {
    publicKey: keys.publicKey,
    secretKey: keys.secretKey,
    publicKeyHex: publicKeyHex(keys.publicKey),
    fingerprint: fingerprintOf(keys.publicKey),
    mnemonic,
    wordCount,
  };
}

function upsertContactList(contacts: Contact[], act: Act): Contact[] {
  const now = Date.now();
  const next = [...contacts];
  for (const pk of [act.from, act.to]) {
    const hex = bytesToHex(pk);
    if (next.some((c) => c.publicKeyHex === hex)) continue;
    next.push({ publicKeyHex: hex, fingerprint: fingerprintOf(pk), addedAt: now });
  }
  return next;
}

async function persistM1(entry: LedgerEntry): Promise<void> {
  await putAct(entry);
  await appendHistoryEvent({ kind: "act", wire: { ...entry.act, sigM2: null } });
}

export const useApp = create<AppState>((set, get) => ({
  ready: false,
  error: null,
  identity: null,
  entries: [],
  history: [],
  contacts: [],
  settings: { theme: "dark", lang: "ru", autoClear: false, labUnlocked: false },
  screen: "home",
  selectedHash: null,
  qr: null,
  swarmPeers: 1,
  swarmEvent: "—",
  lastClearing: null,

  setError: (message) => set({ error: message }),
  setScreen: (screen) => set({ screen, error: null }),
  setQr: (qr) => set({ qr, screen: qr ? "qr" : "home" }),
  selectHash: (selectedHash) => set({ selectedHash, screen: selectedHash ? "detail" : "ledger" }),

  boot: async () => {
    try {
      const settings = await loadSettings();
      applyTheme(settings.theme);
      const loaded = await loadIdentity();
      const contacts = await loadContacts();

      await migrateLegacyActsToHistory();
      const { history, state } = await loadState();
      const entries = history.length > 0 ? stateToEntries(state) : await loadActs();

      if (!loaded) {
        set({ ready: true, settings, entries, history, contacts, identity: null });
        return;
      }
      const wordCount = (loaded.mnemonic.split(" ").length === 24 ? 24 : 12) as WordCount;
      const identity = identityFromMnemonic(loaded.mnemonic, wordCount);
      set({ ready: true, settings, entries, history, contacts, identity });
      attachSwarm(identity, get, set);
    } catch (err) {
      set({
        ready: true,
        error: err instanceof Error ? `Журнал: ${err.message}` : "Не удалось открыть журнал",
      });
    }
  },

  createNew: async (wordCount) => identityFromMnemonic(createMnemonic(wordCount), wordCount),

  persistNewIdentity: async (identity) => {
    const wrap = await generateWrappingKey();
    await saveIdentity(
      {
        publicKeyHex: identity.publicKeyHex,
        fingerprint: identity.fingerprint,
        createdAt: Date.now(),
        wordCount: identity.wordCount,
        mnemonicBlob: { v: 1, alg: "AES-GCM", kdf: "wrap-key", ivHex: "", ctHex: "" },
      },
      wrap,
      identity.mnemonic,
    );
    set({ identity, screen: "home" });
    attachSwarm(identity, get, set);
  },

  restore: async (mnemonicRaw) => {
    const mnemonic = normalizeMnemonic(mnemonicRaw);
    if (!isValidMnemonic(mnemonic)) throw new Error("Контрольная сумма сид-фразы не совпала");
    const wordCount = (mnemonic.split(" ").length === 24 ? 24 : 12) as WordCount;
    await get().persistNewIdentity(identityFromMnemonic(mnemonic, wordCount));
  },

  createAct: async (toHex, amount, note) => {
    const identity = get().identity;
    if (!identity) throw new Error("Нет личности");
    if (!toHex.trim()) throw new Error("Укажите контрагента");
    const to = parsePublicKey(toHex);
    const act = createSignedM1({
      fromSecret: identity.secretKey,
      fromPublic: identity.publicKey,
      to,
      amount,
      note,
    });
    const entry: LedgerEntry = { act, status: "pending_m2", remainingAmount: 0, addedAt: Date.now() };
    await persistM1(entry);
    const contacts = upsertContactList(get().contacts, act);
    await saveContacts(contacts);
    const history = [...get().history, { kind: "act" as const, wire: act }];
    set({ entries: [...get().entries, entry], contacts, history });
    return act;
  },

  ingestQr: async (raw) => {
    const identity = get().identity;
    if (!identity) throw new Error("Нет личности");
    const { type, act } = decodeManualFallback(raw);
    verifyAct(act);
    if (type === "act-proposal") return { kind: "proposal", act };
    if (type === "act-final" && act.sigM2) {
      const hashHex = bytesToHex(act.hash);
      let history = get().history;
      if (!history.some((e) => e.kind === "act" && bytesToHex(e.wire.hash) === hashHex)) {
        await appendHistoryEvent({ kind: "act", wire: { ...act, sigM2: null } });
        history = [...history, { kind: "act", wire: { ...act, sigM2: null } }];
      }
      const m2 = appendM2(history, act.hash, act.sigM2);
      if (m2.added) await appendHistoryEvent({ kind: "m2", assertion: m2.assertion });
      await putAct(entryFromAct(act));
      const contacts = upsertContactList(get().contacts, act);
      await saveContacts(contacts);
      set({ entries: stateToEntries(m2.state), contacts, history: m2.history });
      swarm?.announce(act);
      return { kind: "final", act };
    }
    throw new Error("Неподдерживаемый QR");
  },

  confirmM2: async (act) => {
    const identity = get().identity;
    if (!identity) throw new Error("Нет личности");
    const signed = signM2(act, identity.secretKey, identity.publicKey);
    let history = get().history;
    const hashHex = bytesToHex(signed.hash);
    if (!history.some((e) => e.kind === "act" && bytesToHex(e.wire.hash) === hashHex)) {
      await appendHistoryEvent({ kind: "act", wire: { ...signed, sigM2: null } });
      history = [...history, { kind: "act", wire: { ...signed, sigM2: null } }];
    }
    const m2 = appendM2(history, signed.hash, signed.sigM2!);
    if (m2.added) await appendHistoryEvent({ kind: "m2", assertion: m2.assertion });
    await putAct(entryFromAct(signed));
    const contacts = upsertContactList(get().contacts, signed);
    await saveContacts(contacts);
    set({ entries: stateToEntries(m2.state), contacts, history: m2.history });
    swarm?.announce(signed);
    if (get().settings.autoClear) await get().runClearing();
    return signed;
  },

  addContact: async (publicKeyHexValue, displayName) => {
    const pk = parsePublicKey(publicKeyHexValue);
    const hex = bytesToHex(pk);
    const next = [
      ...get().contacts.filter((c) => c.publicKeyHex !== hex),
      { publicKeyHex: hex, fingerprint: fingerprintOf(pk), displayName, addedAt: Date.now() },
    ];
    await saveContacts(next);
    set({ contacts: next });
  },

  cycles: () => {
    const history = get().history;
    if (history.length > 0) {
      try {
        return findCyclesHistory(history);
      } catch {
        /* fall through */
      }
    }
    return findCycles(get().entries);
  },

  runClearing: async (cycle) => {
    const history = get().history;
    const identity = get().identity;
    const authorOpts = identity
      ? { authorPublic: identity.publicKey, authorSecret: identity.secretKey }
      : undefined;

    if (history.length > 0) {
      const results: ClearingResult[] = [];
      let h = history;

      if (cycle) {
        const r = appendClearing(h, cycle, authorOpts);
        h = r.history;
        results.push({
          cycle,
          residual: cycle.residual,
          authorHex: identity?.publicKeyHex,
          signed: Boolean(identity),
          applied: [],
        });
      } else {
        for (let i = 0; i < 100; i++) {
          const found = findCyclesHistory(h);
          const next = found[0];
          if (!next) break;
          const r = appendClearing(h, next, authorOpts);
          h = r.history;
          results.push({
            cycle: next,
            residual: next.residual,
            authorHex: identity?.publicKeyHex,
            signed: Boolean(identity),
            applied: [],
          });
        }
      }

      if (!results.length) throw new Error("Фиктивный клиринг: цикл не найден");

      await saveHistory(h);
      const { deriveState } = await import("@/protocol/derive");
      const entries = stateToEntries(deriveState(h));
      await putActs(entries);
      set({ history: h, entries, lastClearing: results, screen: "clearing" });
      return results;
    }

    const entries = get().entries.map((e) => ({ ...e, act: e.act }));
    const results: ClearingResult[] = [];
    if (cycle) results.push(applyCycle(entries, cycle));
    else {
      for (;;) {
        const found = findCycles(entries);
        const next = found[0];
        if (!next) break;
        results.push(applyCycle(entries, next));
        if (results.length > 100) break;
      }
    }
    if (!results.length) throw new Error("Фиктивный клиринг: цикл не найден");
    await putActs(entries);
    set({ entries, lastClearing: results, screen: "clearing" });
    return results;
  },

  exportJson: async () => {
    const history = get().history;
    if (history.length > 0) return exportHistoryJson(history);
    return exportLedgerJson(get().entries);
  },

  importJson: async (json) => {
    try {
      const history = importHistoryJson(json);
      await saveHistory(history);
      const { deriveState } = await import("@/protocol/derive");
      const entries = stateToEntries(deriveState(history));
      await putActs(entries);
      set({ history, entries });
      return;
    } catch {
      /* legacy */
    }
    const imported = importLedgerJson(json);
    const history = historyFromActs(imported.map((e) => e.act));
    await saveHistory(history);
    await putActs(imported);
    set({ entries: imported, history });
  },

  wipe: async () => {
    swarm?.close();
    swarm = null;
    if (swarmTimer != null) {
      window.clearInterval(swarmTimer);
      swarmTimer = null;
    }
    await wipeUserData();
    try {
      await saveHistory([]);
    } catch {
      /* ignore */
    }
    set({
      identity: null,
      entries: [],
      history: [],
      contacts: [],
      screen: "home",
      lastClearing: null,
      qr: null,
    });
  },

  setLang: async (lang) => {
    const settings = { ...get().settings, lang };
    await saveSettings(settings);
    set({ settings });
  },

  setTheme: async (theme) => {
    const settings = { ...get().settings, theme };
    applyTheme(theme);
    await saveSettings(settings);
    set({ settings });
  },

  setAutoClear: async (on) => {
    const settings = { ...get().settings, autoClear: on };
    await saveSettings(settings);
    set({ settings });
  },

  unlockLab: async () => {
    const settings = { ...get().settings, labUnlocked: true };
    await saveSettings(settings);
    set({ settings, screen: "lab" });
  },

  tryUnlockLab: async (password) => {
    if (!checkLabPassword(password)) return false;
    await get().unlockLab();
    return true;
  },

  addTutorialContacts: async () => {
    const identity = get().identity;
    const lang = get().settings.lang;
    const now = Date.now();
    const next = [...get().contacts];
    for (const agent of allTutorialAgents()) {
      if (identity && agent.publicKeyHex === identity.publicKeyHex) continue;
      const i = next.findIndex((c) => c.publicKeyHex === agent.publicKeyHex);
      const contact: Contact = {
        publicKeyHex: agent.publicKeyHex,
        fingerprint: agent.fingerprint,
        displayName: lang === "ru" ? agent.nameRu : agent.nameEn,
        addedAt: now,
      };
      if (i >= 0) next[i] = { ...next[i]!, ...contact };
      else next.push(contact);
    }
    await saveContacts(next);
    set({ contacts: next });
  },

  seedDemoTriangle: async () => {
    const identity = get().identity;
    if (!identity) throw new Error("Нет личности");
    const boris = tutorialKeypair("boris");
    const viktor = tutorialKeypair("viktor");
    const t0 = 1_704_067_200_000;
    const nonce = (n: number) => {
      const u = new Uint8Array(16);
      u[15] = n;
      return u;
    };
    const acts: Act[] = [
      signM2(
        createSignedM1({
          fromSecret: identity.secretKey,
          fromPublic: identity.publicKey,
          to: boris.publicKey,
          amount: 18,
          note: "учебный: ужин",
          timestamp: t0,
          nonce: nonce(1),
        }),
        boris.secretKey,
        boris.publicKey,
      ),
      signM2(
        createSignedM1({
          fromSecret: boris.secretKey,
          fromPublic: boris.publicKey,
          to: viktor.publicKey,
          amount: 12,
          note: "учебный: материалы",
          timestamp: t0 + 1,
          nonce: nonce(2),
        }),
        viktor.secretKey,
        viktor.publicKey,
      ),
      signM2(
        createSignedM1({
          fromSecret: viktor.secretKey,
          fromPublic: viktor.publicKey,
          to: identity.publicKey,
          amount: 8,
          note: "учебный: помощь",
          timestamp: t0 + 2,
          nonce: nonce(3),
        }),
        identity.secretKey,
        identity.publicKey,
      ),
    ];
    const history = historyFromActs(acts);
    await saveHistory(history);
    const { deriveState } = await import("@/protocol/derive");
    const entries = stateToEntries(deriveState(history));
    await putActs(entries);
    set({ entries, history });
    await get().addTutorialContacts();
  },

  fastLabIdentity: async () => {
    if (get().identity) {
      await get().unlockLab();
      return;
    }
    const identity = identityFromMnemonic(createMnemonic(12), 12);
    await get().persistNewIdentity(identity);
    await get().unlockLab();
  },
}));

function applyTheme(theme: AppSettings["theme"]) {
  if (typeof document === "undefined") return;
  const dark =
    theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

function attachSwarm(
  identity: Identity,
  get: () => AppState,
  set: (partial: Partial<AppState>) => void,
) {
  swarm?.close();
  if (swarmTimer != null) {
    window.clearInterval(swarmTimer);
    swarmTimer = null;
  }
  swarm = startSwarm({
    selfHex: identity.publicKeyHex,
    getHashes: () => get().entries.filter((e) => e.act.sigM2).map((e) => bytesToHex(e.act.hash)),
    getAct: (hash) => get().entries.find((e) => bytesToHex(e.act.hash) === hash)?.act,
    onAct: (act) => {
      if (!act.sigM2) return;
      void (async () => {
        try {
          let history = get().history;
          const hashHex = bytesToHex(act.hash);
          if (!history.some((e) => e.kind === "act" && bytesToHex(e.wire.hash) === hashHex)) {
            await appendHistoryEvent({ kind: "act", wire: { ...act, sigM2: null } });
            history = [...history, { kind: "act", wire: { ...act, sigM2: null } }];
          }
          const m2 = appendM2(history, act.hash, act.sigM2);
          if (m2.added) await appendHistoryEvent({ kind: "m2", assertion: m2.assertion });
          await putAct(entryFromAct(act));
          const contacts = upsertContactList(get().contacts, act);
          await saveContacts(contacts);
          set({ entries: stateToEntries(m2.state), contacts, history: m2.history });
        } catch (err: unknown) {
          set({ error: err instanceof Error ? err.message : "Ошибка записи журнала" });
        }
      })();
    },
  });
  swarmTimer = window.setInterval(() => {
    if (!swarm) return;
    const st = swarm.status();
    set({ swarmPeers: st.peers, swarmEvent: st.lastEvent });
  }, 2000);
}

export { describeAct, counterparties };
