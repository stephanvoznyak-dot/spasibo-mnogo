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
  /** Author public key hex who asserted this clearing (local hypothesis). */
  authorHex?: string;
  /** true if author signature verified. */
  signed?: boolean;
  applied: Array<{
    hashHex: string;
    from: string;
    to: string;
    before: number;
    after: number;
    delta: number;
  }>;
}

// ─── History events ─────────────────────────────────────────────────────────

/**
 * Counterparty acceptance of an act (M2).
 */
export interface M2Assertion {
  actHash: Uint8Array;
  sigM2: Uint8Array;
  appliedAt: number;
}

/**
 * Local clearing hypothesis (Stage B-a).
 * Signed by the asserting agent only — NOT multi-party consensus.
 * Counterparties may hold different residuals until they assert the same cycle.
 */
export interface ClearingAssertion {
  version: 1;
  cycle: AgentId[];
  residual: number;
  appliedAt: number;
  nonce: Uint8Array;
  /** Author public key (32 bytes). Required for new assertions; optional for legacy. */
  author?: Uint8Array | null;
  /** Ed25519 signature over clearing body hash. */
  sig?: Uint8Array | null;
  prevHash?: Uint8Array | null;
}

/**
 * Legacy migration only: reduce remaining on one act without a cycle.
 */
export interface WriteDownAssertion {
  actHash: Uint8Array;
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
  /** Clearing assertions applied (for UI: local hypothesis badges). */
  clearings: Array<{ residual: number; authorHex: string | null; signed: boolean; appliedAt: number }>;
}

export function emptyState(): State {
  return {
    remaining: new Map(),
    status: new Map(),
    edgeRemaining: new Map(),
    net: new Map(),
    openActs: new Map(),
    acts: new Map(),
    clearings: [],
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
