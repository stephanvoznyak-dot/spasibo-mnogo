/**
 * Canon 2.2 — History as the sole source of truth.
 */
import { bytesToHex } from "@/crypto/bytes";
import { verifyAct } from "./act";
import {
  appendClearing as deriveAppendClearing,
  deriveState,
  findCyclesFromState,
  makeClearingAssertion,
  makeM2Assertion,
} from "./derive";
import {
  ProtocolError,
  type Act,
  type ClearingAssertion,
  type ClearingCycle,
  type HashHex,
  type History,
  type HistoryEvent,
  type M2Assertion,
  type State,
} from "./types";

export const MAX_CYCLE_LEN = 7;

export function historyActHashes(history: History): Set<HashHex> {
  const set = new Set<HashHex>();
  for (const ev of history) {
    if (ev.kind === "act") set.add(bytesToHex(ev.wire.hash));
  }
  return set;
}

/** Append M1 act (idempotent by hash). */
export function appendAct(
  history: History,
  act: Act,
  opts?: { allowDuplicate?: boolean },
): { history: History; state: State; added: boolean } {
  verifyAct(act);
  const hashHex = bytesToHex(act.hash);
  if (historyActHashes(history).has(hashHex)) {
    if (opts?.allowDuplicate === false) {
      throw new ProtocolError(`Акт ${hashHex.slice(0, 12)} уже есть в журнале`, "DUPLICATE");
    }
    return { history, state: deriveState(history), added: false };
  }
  // Strip sigM2 from act event — M2 is a separate event
  const wire: Act = act.sigM2 ? { ...act, sigM2: null } : act;
  const next: History = [...history, { kind: "act", wire }];
  // If original had M2, also append m2 event
  if (act.sigM2) {
    next.push({
      kind: "m2",
      assertion: makeM2Assertion(act.hash, act.sigM2),
    });
  }
  return { history: next, state: deriveState(next), added: true };
}

/** Append M2 acceptance (idempotent by actHash). */
export function appendM2(
  history: History,
  actHash: Uint8Array,
  sigM2: Uint8Array,
): { history: History; state: State; added: boolean; assertion: M2Assertion } {
  const hashHex = bytesToHex(actHash);
  const hasAct = history.some((e) => e.kind === "act" && bytesToHex(e.wire.hash) === hashHex);
  if (!hasAct) {
    throw new ProtocolError(`m2: акт ${hashHex.slice(0, 12)}… отсутствует`, "M2");
  }
  const hasM2 = history.some(
    (e) => e.kind === "m2" && bytesToHex(e.assertion.actHash) === hashHex,
  );
  if (hasM2) {
    const assertion = makeM2Assertion(actHash, sigM2);
    return { history, state: deriveState(history), added: false, assertion };
  }
  const assertion = makeM2Assertion(actHash, sigM2);
  const next: History = [...history, { kind: "m2", assertion }];
  return { history: next, state: deriveState(next), added: true, assertion };
}

export function appendClearing(
  history: History,
  cycle: ClearingCycle,
  opts?: { appliedAt?: number; nonce?: Uint8Array },
): { history: History; state: State; assertion: ClearingAssertion } {
  return deriveAppendClearing(history, cycle, opts);
}

export function findCycles(history: History, maxLen = MAX_CYCLE_LEN): ClearingCycle[] {
  return findCyclesFromState(deriveState(history), maxLen);
}

export function stateOf(history: History): State {
  return deriveState(history);
}

export function historyFromActs(acts: Act[]): History {
  const events: HistoryEvent[] = [];
  const seen = new Set<HashHex>();
  for (const act of acts) {
    verifyAct(act);
    const h = bytesToHex(act.hash);
    if (seen.has(h)) continue;
    seen.add(h);
    const wire: Act = act.sigM2 ? { ...act, sigM2: null } : act;
    events.push({ kind: "act", wire });
    if (act.sigM2) {
      events.push({ kind: "m2", assertion: makeM2Assertion(act.hash, act.sigM2) });
    }
  }
  return events;
}

export { makeClearingAssertion, makeM2Assertion, deriveState, findCyclesFromState };
