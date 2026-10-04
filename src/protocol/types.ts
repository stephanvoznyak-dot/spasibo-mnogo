export const ACT_STATUSES = [
  "pending_m2",
  "finalized",
  "partially_cleared",
  "cleared",
  "archived",
] as const;

export type ActStatus = (typeof ACT_STATUSES)[number];

export type Amount = number;

/** Agent ID = public key hex (64 chars). */
export type AgentId = string;

/** SHA-256 hash as hex (64 chars). */
export type HashHex = string;

/** Edge key: `${fromHex}>${toHex}` */
export type EdgeKey = string;

export function edgeKey(from: AgentId, to: AgentId): EdgeKey {
  return `${from}>${to}`;
}

// ─── Immutable Act (cryptographic fact) ─────────────────────────────────────

export interface Act {
  version: number;
  from: Uint8Array;
  to: Uint8Array;
  amount: Amount;
  note: string;
  timestamp: number;
  nonce: Uint8Array;
  hash: Uint8Array;
  sigM1: Uint8Array;
  /** Present on wire only after M2; in History, M2 is a separate event. */
  sigM2: Uint8Array | null;
  prevHash?: Uint8Array | null;
}

/**
 * @deprecated Transitional. remainingAmount/status derived via deriveState.
 */
export interface LedgerEntry {
  act: Act;
  status: ActStatus;
  remainingAmount: number;
  addedAt: number;
}

export interface Contact {
  publicKeyHex: string;
  fingerprint: string;
  displayName?: string;
  addedAt: number;
}

export interface ClearingCycle {
  nodes: string[];
  residual: number;
  edges: Array<{ from: string; to: string; weight: number }>;
}

export interface ClearingResult {
  cycle: ClearingCycle;
  residual: number;
  applied: Array<{
    hashHex: string;
    from: string;
    to: string;
    before: number;
    after: number;
    delta: number;
  }>;
}

// ─── Canon 2.2: History as sole source of truth ──────────────────────────────

/**
 * Counterparty acceptance of an act (M2).
 * Separate event — never mutates the prior act event (fixes initiator reload bug).
 */
export interface M2Assertion {
  /** Hash of the act body (same as Act.hash). */
  actHash: Uint8Array;
  /** Ed25519 signature by `to` over actHash. */
  sigM2: Uint8Array;
  /** Unix ms when recorded locally. */
  appliedAt: number;
}

/**
 * Historical fact of a multi-party clearing (local hypothesis unless signed — Stage B).
 */
export interface ClearingAssertion {
  version: 1;
  cycle: AgentId[];
  residual: number;
  appliedAt: number;
  nonce: Uint8Array;
  prevHash?: Uint8Array | null;
}

/**
 * Legacy migration only: reduce remaining on one act without a cycle
 * (preserves amount−remaining from old LedgerEntry).
 */
export interface WriteDownAssertion {
  actHash: Uint8Array;
  /** Positive integer subtracted from remaining. */
  delta: number;
  appliedAt: number;
}

export type HistoryEvent =
  | { kind: "act"; wire: Act }
  | { kind: "m2"; assertion: M2Assertion }
  | { kind: "clearing"; assertion: ClearingAssertion }
  | { kind: "write_down"; assertion: WriteDownAssertion };

export type History = HistoryEvent[];

export interface State {
  remaining: Map<HashHex, number>;
  status: Map<HashHex, ActStatus>;
  edgeRemaining: Map<EdgeKey, number>;
  net: Map<AgentId, number>;
  openActs: Map<HashHex, Act>;
  acts: Map<HashHex, Act>;
}

export function emptyState(): State {
  return {
    remaining: new Map(),
    status: new Map(),
    edgeRemaining: new Map(),
    net: new Map(),
    openActs: new Map(),
    acts: new Map(),
  };
}

export function statusFromRemaining(
  amount: number,
  remaining: number,
  hasM2: boolean,
): ActStatus {
  if (!hasM2) return "pending_m2";
  if (remaining <= 0) return "cleared";
  if (remaining < amount) return "partially_cleared";
  return "finalized";
}

export class ProtocolError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "ProtocolError";
  }
}
