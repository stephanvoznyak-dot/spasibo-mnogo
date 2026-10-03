/**
 * Canon 2.2 — History as the sole source of truth.
 * appendAct / appendClearing never mutate prior events.
 * Idempotency: duplicate act hash is rejected (or no-op).
 */
import { bytesToHex } from "@/crypto/bytes";
import { verifyAct } from "./act";
import {
  appendClearing as deriveAppendClearing,
  deriveState,
  findCyclesFromState,
  makeClearingAssertion,
} from "./derive";
import {
  ProtocolError,
  type Act,
  type ClearingAssertion,
  type ClearingCycle,
  type HashHex,
  type History,
  type HistoryEvent,
  type State,
} from "./types";

export const MAX_CYCLE_LEN = 7;

/** Collect all act hashes already present in History. */
export function historyActHashes(history: History): Set<HashHex> {
  const set = new Set<HashHex>();
  for (const ev of history) {
    if (ev.kind === "act") set.add(bytesToHex(ev.wire.hash));
  }
  return set;
}

/**
 * Append a verified act to History.
 * Idempotent: if the same hash already exists, returns the original history unchanged
 * (no duplicate, no error) — safe for P2P / QR re-delivery.
 * Throws if the act fails cryptographic verification.
 */
export function appendAct(
  history: History,
  act: Act,
  opts?: { allowDuplicate?: boolean },
): { history: History; state: State; added: boolean } {
  verifyAct(act);
  const hashHex = bytesToHex(act.hash);
  const existing = historyActHashes(history);
  if (existing.has(hashHex)) {
    if (opts?.allowDuplicate === false) {
      throw new ProtocolError(`Акт ${hashHex.slice(0, 12)} уже есть в журнале`, "DUPLICATE");
    }
    return { history, state: deriveState(history), added: false };
  }
  const next: History = [...history, { kind: "act", wire: act }];
  return { history: next, state: deriveState(next), added: true };
}

/**
 * Append a clearing assertion for the given cycle.
 * Pure: does not mutate inputs.
 */
export function appendClearing(
  history: History,
  cycle: ClearingCycle,
  opts?: { appliedAt?: number; nonce?: Uint8Array },
): { history: History; state: State; assertion: ClearingAssertion } {
  return deriveAppendClearing(history, cycle, opts);
}

/**
 * Find cycles from History (derive State first).
 * Depth limited to MAX_CYCLE_LEN (remark: avoid main-thread stalls).
 * Sort is fully deterministic: residual desc → length asc → cycle key lex.
 */
export function findCycles(history: History, maxLen = MAX_CYCLE_LEN): ClearingCycle[] {
  const state = deriveState(history);
  return findCyclesFromState(state, maxLen);
}

/** Current derived State for a History. */
export function stateOf(history: History): State {
  return deriveState(history);
}

/**
 * Build History from a flat list of acts (migration helper).
 * Does not synthesise clearing assertions — caller may add them later.
 */
export function historyFromActs(acts: Act[]): History {
  const events: HistoryEvent[] = [];
  const seen = new Set<HashHex>();
  for (const act of acts) {
    verifyAct(act);
    const h = bytesToHex(act.hash);
    if (seen.has(h)) continue;
    seen.add(h);
    events.push({ kind: "act", wire: act });
  }
  return events;
}

export { makeClearingAssertion, deriveState, findCyclesFromState };
