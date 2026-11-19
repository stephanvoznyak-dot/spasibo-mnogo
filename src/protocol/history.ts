/**
 * History API — append-only. Clearing is a local signed hypothesis (B-a).
 */
import { bytesEqual, bytesToHex } from "@/crypto/bytes";
import { verify } from "@/crypto/signature";
import { verifyAct } from "./act";
import {
  appendClearing as deriveAppendClearing,
  deriveState,
  findCyclesFromState,
  makeClearingAssertion,
  makeM2Assertion,
} from "./derive";
import { hashActBody } from "./serialization";
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
    if (ev.kind === "act") set.add(bytesToHex(hashActBody(ev.wire)));
  }
  return set;
}

export function appendAct(
  history: History,
  act: Act,
  opts?: { allowDuplicate?: boolean },
): { history: History; state: State; added: boolean } {
  const { hash } = verifyAct(act);
  const hashHex = bytesToHex(hash);
  if (historyActHashes(history).has(hashHex)) {
    if (opts?.allowDuplicate === false) {
      throw new ProtocolError(`Акт ${hashHex.slice(0, 12)} уже есть в журнале`, "DUPLICATE");
    }
    return { history, state: deriveState(history), added: false };
  }
  const wire: Act = { ...act, hash, sigM2: null };
  const next: History = [...history, { kind: "act", wire }];
  if (act.sigM2) {
    next.push({ kind: "m2", assertion: makeM2Assertion(hash, act.sigM2) });
  }
  return { history: next, state: deriveState(next), added: true };
}

export function appendM2(
  history: History,
  actHash: Uint8Array,
  sigM2: Uint8Array,
): { history: History; state: State; added: boolean; assertion: M2Assertion } {
  const hashHex = bytesToHex(actHash);
  const actEvent = history.find((e) => e.kind === "act" && bytesToHex(hashActBody(e.wire)) === hashHex);
  if (!actEvent || actEvent.kind !== "act") {
    throw new ProtocolError(`m2: акт ${hashHex.slice(0, 12)}… отсутствует`, "M2");
  }
  const bodyHash = hashActBody(actEvent.wire);
  if (!verify(sigM2, bodyHash, actEvent.wire.to)) {
    throw new ProtocolError("Подпись контрагента (M2) недействительна", "SIG_M2");
  }
  const prev = history.find((e) => e.kind === "m2" && bytesToHex(e.assertion.actHash) === hashHex);
  if (prev && prev.kind === "m2") {
    if (!bytesEqual(prev.assertion.sigM2, sigM2)) {
      throw new ProtocolError("m2: конфликт подписей для одного акта", "M2");
    }
    return { history, state: deriveState(history), added: false, assertion: prev.assertion };
  }
  const assertion = makeM2Assertion(bodyHash, sigM2);
  const next: History = [...history, { kind: "m2", assertion }];
  return { history: next, state: deriveState(next), added: true, assertion };
}

/** Accept one event only if deriveState stays valid. Does not mutate `history`. */
export function acceptEvent(history: History, ev: HistoryEvent): { history: History; added: boolean } {
  if (ev.kind === "act") {
    const { hash } = verifyAct(ev.wire);
    const id = bytesToHex(hash);
    if (history.some((e) => e.kind === "act" && bytesToHex(hashActBody(e.wire)) === id)) {
      return { history, added: false };
    }
    const wire: Act = { ...ev.wire, hash, sigM2: null };
    const next: History = [...history, { kind: "act", wire }];
    if (ev.wire.sigM2) {
      next.push({ kind: "m2", assertion: makeM2Assertion(hash, ev.wire.sigM2) });
    }
    deriveState(next);
    return { history: next, added: true };
  } else if (ev.kind === "m2") {
    const id = bytesToHex(ev.assertion.actHash);
    const prev = history.find((e) => e.kind === "m2" && bytesToHex(e.assertion.actHash) === id);
    if (prev && prev.kind === "m2") {
      if (!bytesEqual(prev.assertion.sigM2, ev.assertion.sigM2)) {
        throw new ProtocolError("m2: конфликт подписей для одного акта", "M2");
      }
      return { history, added: false };
    }
  } else if (ev.kind === "clearing") {
    const id = bytesToHex(ev.assertion.nonce);
    const prev = history.find((e) => e.kind === "clearing" && bytesToHex(e.assertion.nonce) === id);
    if (prev && prev.kind === "clearing") {
      const same =
        prev.assertion.residual === ev.assertion.residual &&
        prev.assertion.appliedAt === ev.assertion.appliedAt &&
        prev.assertion.cycle.join(">") === ev.assertion.cycle.join(">");
      if (!same) {
        throw new ProtocolError("Повтор клиринга с тем же nonce, но другим телом", "DUPLICATE");
      }
      return { history, added: false };
    }
  } else if (ev.kind === "write_down") {
    const id = `${bytesToHex(ev.assertion.actHash)}:${ev.assertion.delta}:${ev.assertion.appliedAt}`;
    const prev = history.some(
      (e) =>
        e.kind === "write_down" &&
        `${bytesToHex(e.assertion.actHash)}:${e.assertion.delta}:${e.assertion.appliedAt}` === id,
    );
    if (prev) return { history, added: false };
  }
  const next: History = [...history, ev];
  deriveState(next);
  return { history: next, added: true };
}

export function appendClearing(
  history: History,
  cycle: ClearingCycle,
  opts?: {
    appliedAt?: number;
    nonce?: Uint8Array;
    authorPublic?: Uint8Array;
    authorSecret?: Uint8Array;
  },
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
    const { hash } = verifyAct(act);
    const h = bytesToHex(hash);
    if (seen.has(h)) continue;
    seen.add(h);
    const wire: Act = { ...act, hash, sigM2: null };
    events.push({ kind: "act", wire });
    if (act.sigM2) {
      events.push({ kind: "m2", assertion: makeM2Assertion(hash, act.sigM2) });
    }
  }
  return events;
}

export { makeClearingAssertion, makeM2Assertion, deriveState, findCyclesFromState };
