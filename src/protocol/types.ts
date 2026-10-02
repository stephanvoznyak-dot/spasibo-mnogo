export const ACT_STATUSES = [
  "pending_m2",
  "finalized",
  "partially_cleared",
  "cleared",
  "archived",
] as const;

export type ActStatus = (typeof ACT_STATUSES)[number];

export type Amount = number;

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
}

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

export class ProtocolError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "ProtocolError";
  }
}
