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
  sigM2: Uint8Array | null;
  /**
   * Optional link to previous history head of the `from` agent (Canon 2.2).
   * null / undefined = legacy act or empty journal. Soft migration only.
   */
  prevHash?: Uint8Array | null;
}

// ─── Legacy mutable ledger entry (transitional, to be replaced by State) ─────

/**
 * @deprecated Transitional. remainingAmount and status will become derived
 * from History via deriveState(). Do not treat as source of truth.
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
 * Historical fact of a multi-party clearing.
 * Does not mutate prior Acts; residual is applied when deriving State.
 */
export interface ClearingAssertion {
  version: 1;
  /** Ordered cycle of agent public-key hex strings. */
  cycle: AgentId[];
  /** r(C) = min remaining on edges at the moment of assertion. */
  residual: number;
  /** Unix ms when the assertion was recorded. */
  appliedAt: number;
  /** Exactly 16 bytes. */
  nonce: Uint8Array;
  /**
   * Optional: hash of the journal head of the agent who recorded the assertion.
   * Soft migration — may be null/undefined.
   */
  prevHash?: Uint8Array | null;
}

export type HistoryEvent =
  | { kind: "act"; wire: Act }
  | { kind: "clearing"; assertion: ClearingAssertion };

export type History = HistoryEvent[];

/**
 * Fully derived view. Never stored as primary data.
 * Recovery ≡ deriveState(History).
 */
export interface State {
  /** Remaining amount per act hash. Only acts with M2 appear. */
  remaining: Map<HashHex, number>;
  /** Status derived from remaining vs amount. */
  status: Map<HashHex, ActStatus>;
  /** Aggregated remaining per directed edge (fromHex > toHex). */
  edgeRemaining: Map<EdgeKey, number>;
  /** Net position N_i = Σ in − Σ out for each agent. */
  net: Map<AgentId, number>;
  /** Acts that still have positive remaining (for UI lists). */
  openActs: Map<HashHex, Act>;
  /** All acts in history (including pending_m2 / cleared). */
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

/** Derive ActStatus from remaining vs signed amount. */
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
