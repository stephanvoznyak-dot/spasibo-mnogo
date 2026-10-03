import { bytesToHex } from "@/crypto/bytes";
import { encodeAct } from "@/protocol/serialization";
import { decodeAct } from "@/protocol/serialization";
import { verifyAct } from "@/protocol/act";
import type { Act, LedgerEntry } from "@/protocol/types";
import { PROTOCOL_NAME, PROTOCOL_VERSION } from "@/version";

export type SwarmMsg =
  | { proto: typeof PROTOCOL_NAME; ver: number; kind: "bitfield"; hashes: string[]; from: string }
  | { proto: typeof PROTOCOL_NAME; ver: number; kind: "have"; hash: string; from: string }
  | { proto: typeof PROTOCOL_NAME; ver: number; kind: "want"; hashes: string[]; from: string }
  | { proto: typeof PROTOCOL_NAME; ver: number; kind: "piece"; wireB64: string; from: string };

const CHANNEL = "normal-project-swarm";

export interface SwarmHandle {
  status: () => { peers: number; lastEvent: string };
  announce: (act: Act) => void;
  broadcastBitfield: () => void;
  close: () => void;
}

function encodePiece(act: Act): string {
  let bin = "";
  const bytes = encodeAct(act);
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  return btoa(bin);
}

function decodePiece(b64: string): Act {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const act = decodeAct(bytes);
  verifyAct(act);
  return act;
}

export function startSwarm(opts: {
  selfHex: string;
  getHashes: () => string[];
  getAct: (hashHex: string) => Act | undefined;
  onAct: (act: Act) => void;
}): SwarmHandle {
  let peers = 1;
  let lastEvent = "ожидание";
  const knownPeers = new Set<string>();

  const post = (msg: SwarmMsg) => {
    try {
      channel.postMessage(msg);
    } catch {
      /* ignore */
    }
    try {
      localStorage.setItem("np-swarm-ping", JSON.stringify({ t: Date.now(), kind: msg.kind }));
    } catch {
      /* quota */
    }
  };

  const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(CHANNEL) : null!;
  if (!channel) {
    return {
      status: () => ({ peers: 1, lastEvent: "нет BroadcastChannel" }),
      announce: () => {},
      broadcastBitfield: () => {},
      close: () => {},
    };
  }

  const onMessage = (ev: MessageEvent<SwarmMsg>) => {
    const msg = ev.data;
    if (!msg || msg.proto !== PROTOCOL_NAME || msg.ver !== PROTOCOL_VERSION) return;
    if (msg.from === opts.selfHex) return;
    knownPeers.add(msg.from);
    peers = 1 + knownPeers.size;
    if (msg.kind === "bitfield") {
      lastEvent = `bitfield ${msg.hashes.length}`;
      const have = new Set(opts.getHashes());
      const missing = msg.hashes.filter((h) => !have.has(h));
      if (missing.length) {
        post({ proto: PROTOCOL_NAME, ver: PROTOCOL_VERSION, kind: "want", hashes: missing.slice(0, 32), from: opts.selfHex });
      }
    } else if (msg.kind === "have") {
      lastEvent = `have ${msg.hash.slice(0, 8)}`;
      if (!opts.getHashes().includes(msg.hash)) {
        post({ proto: PROTOCOL_NAME, ver: PROTOCOL_VERSION, kind: "want", hashes: [msg.hash], from: opts.selfHex });
      }
    } else if (msg.kind === "want") {
      lastEvent = `want ${msg.hashes.length}`;
      for (const h of msg.hashes) {
        const act = opts.getAct(h);
        if (act?.sigM2) {
          post({ proto: PROTOCOL_NAME, ver: PROTOCOL_VERSION, kind: "piece", wireB64: encodePiece(act), from: opts.selfHex });
        }
      }
    } else if (msg.kind === "piece") {
      try {
        const act = decodePiece(msg.wireB64);
        lastEvent = `piece ${bytesToHex(act.hash).slice(0, 8)}`;
        opts.onAct(act);
      } catch (err) {
        lastEvent = "piece отклонён";
        console.warn(err);
      }
    }
  };

  channel.addEventListener("message", onMessage);

  const broadcastBitfield = () => {
    post({
      proto: PROTOCOL_NAME,
      ver: PROTOCOL_VERSION,
      kind: "bitfield",
      hashes: opts.getHashes(),
      from: opts.selfHex,
    });
  };

  broadcastBitfield();
  const timer = window.setInterval(broadcastBitfield, 8000);

  return {
    status: () => ({ peers, lastEvent }),
    announce: (act) => {
      if (!act.sigM2) return;
      post({ proto: PROTOCOL_NAME, ver: PROTOCOL_VERSION, kind: "have", hash: bytesToHex(act.hash), from: opts.selfHex });
    },
    broadcastBitfield,
    close: () => {
      window.clearInterval(timer);
      channel.removeEventListener("message", onMessage);
      channel.close();
    },
  };
}

export function entryFromAct(act: Act): LedgerEntry {
  return {
    act,
    status: act.sigM2 ? "finalized" : "pending_m2",
    remainingAmount: act.sigM2 ? act.amount : 0,
    addedAt: Date.now(),
  };
}

/** Upgrade pending_m2 → finalized without resetting an already-cleared remainder. */
export function mergeFinalEntry(entries: LedgerEntry[], act: Act): { entries: LedgerEntry[]; changed: boolean } {
  if (!act.sigM2) return { entries, changed: false };
  const h = bytesToHex(act.hash);
  const i = entries.findIndex((e) => bytesToHex(e.act.hash) === h);
  if (i < 0) return { entries: [...entries, entryFromAct(act)], changed: true };
  const cur = entries[i]!;
  if (cur.act.sigM2) return { entries, changed: false };
  const next = [...entries];
  next[i] = { ...entryFromAct(act), addedAt: cur.addedAt };
  return { entries: next, changed: true };
}
