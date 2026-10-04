/**
 * Canon 2.2 — State derivation from immutable History.
 * Recovery ≡ deriveState(History).
 *
 * Events: act (M1) → m2 (acceptance) → clearing | write_down.
 */
import { bytesEqual, bytesToHex, randomBytes } from "@/crypto/bytes";
import {
  edgeKey,
  emptyState,
  ProtocolError,
  statusFromRemaining,
  type Act,
  type AgentId,
  type ClearingAssertion,
  type ClearingCycle,
  type EdgeKey,
  type HashHex,
  type History,
  type M2Assertion,
  type State,
  type WriteDownAssertion,
} from "./types";

export const MAX_CYCLE_LEN = 7;

function snapshotNet(net: Map<AgentId, number>): string {
  return [...net.entries()]
    .filter(([, v]) => v !== 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join(";");
}

function addNet(net: Map<AgentId, number>, agent: AgentId, delta: number): void {
  const next = (net.get(agent) ?? 0) + delta;
  if (next === 0) net.delete(agent);
  else net.set(agent, next);
}

function addEdge(edgeRemaining: Map<EdgeKey, number>, key: EdgeKey, delta: number): void {
  const next = (edgeRemaining.get(key) ?? 0) + delta;
  if (next === 0) edgeRemaining.delete(key);
  else edgeRemaining.set(key, next);
}

/** Ingest M1 act. If wire already carries sigM2 (legacy import), treat as finalized. */
function ingestAct(state: State, act: Act): void {
  const hashHex = bytesToHex(act.hash);
  // Prefer first act; later act with same hash ignored (idempotent)
  if (state.acts.has(hashHex)) return;

  state.acts.set(hashHex, act);

  if (!act.sigM2) {
    state.status.set(hashHex, "pending_m2");
    state.remaining.set(hashHex, 0);
    return;
  }

  // Legacy wire already had M2 embedded
  finalizeAct(state, act);
}

function finalizeAct(state: State, act: Act): void {
  const hashHex = bytesToHex(act.hash);
  const remaining = act.amount;
  state.acts.set(hashHex, act);
  state.remaining.set(hashHex, remaining);
  state.status.set(hashHex, statusFromRemaining(act.amount, remaining, true));
  state.openActs.set(hashHex, act);

  const from = bytesToHex(act.from);
  const to = bytesToHex(act.to);
  const key = edgeKey(from, to);
  addEdge(state.edgeRemaining, key, remaining);
  addNet(state.net, from, -remaining);
  addNet(state.net, to, +remaining);
}

/** Apply M2: attach signature and open the obligation. */
function applyM2(state: State, assertion: M2Assertion): void {
  if (!(assertion.actHash instanceof Uint8Array) || assertion.actHash.length !== 32) {
    throw new ProtocolError("m2: некорректный actHash", "M2");
  }
  if (!(assertion.sigM2 instanceof Uint8Array) || assertion.sigM2.length !== 64) {
    throw new ProtocolError("m2: некорректная подпись", "M2");
  }

  const hashHex = bytesToHex(assertion.actHash);
  const existing = state.acts.get(hashHex);
  if (!existing) {
    throw new ProtocolError(`m2: акт ${hashHex.slice(0, 12)}… не найден в истории`, "M2");
  }
  if (existing.sigM2) {
    // Idempotent: already finalized
    if (!bytesEqual(existing.sigM2, assertion.sigM2)) {
      throw new ProtocolError("m2: конфликт подписей для одного акта", "M2");
    }
    return;
  }

  const finalized: Act = { ...existing, sigM2: assertion.sigM2 };
  finalizeAct(state, finalized);
}

function applyAssertion(state: State, assertion: ClearingAssertion): void {
  if (assertion.version !== 1) {
    throw new ProtocolError(`Неподдерживаемая версия ClearingAssertion: ${assertion.version}`, "VERSION");
  }
  if (assertion.cycle.length < 2) {
    throw new ProtocolError("Фиктивный клиринг: цикл слишком короткий", "F04");
  }
  if (!(assertion.residual > 0) || !Number.isInteger(assertion.residual)) {
    throw new ProtocolError("Фиктивный клиринг: residual должен быть целым > 0", "F04");
  }
  if (!(assertion.nonce instanceof Uint8Array) || assertion.nonce.length !== 16) {
    throw new ProtocolError("ClearingAssertion.nonce должен быть ровно 16 байт", "DECODE");
  }

  const before = snapshotNet(state.net);
  const n = assertion.cycle.length;
  const r = assertion.residual;

  for (let i = 0; i < n; i++) {
    const from = assertion.cycle[i]!;
    const to = assertion.cycle[(i + 1) % n]!;
    const key = edgeKey(from, to);
    const edgeWeight = state.edgeRemaining.get(key) ?? 0;
    if (edgeWeight < r) {
      throw new ProtocolError(
        `Фиктивный клиринг: на ребре ${from.slice(0, 8)}→${to.slice(0, 8)} остаток ${edgeWeight} < residual ${r}`,
        "F04",
      );
    }

    let need = r;
    const matching: Array<{ hashHex: HashHex; act: Act; rem: number }> = [];
    for (const [hashHex, act] of state.openActs) {
      if (bytesToHex(act.from) === from && bytesToHex(act.to) === to) {
        const rem = state.remaining.get(hashHex) ?? 0;
        if (rem > 0) matching.push({ hashHex, act, rem });
      }
    }
    matching.sort((a, b) => a.act.timestamp - b.act.timestamp || a.hashHex.localeCompare(b.hashHex));

    if (matching.length === 0) {
      throw new ProtocolError("Фиктивный клиринг: нет актов на ребре цикла", "F04");
    }

    for (const m of matching) {
      if (need <= 0) break;
      const take = Math.min(m.rem, need);
      const newRem = m.rem - take;
      state.remaining.set(m.hashHex, newRem);
      state.status.set(m.hashHex, statusFromRemaining(m.act.amount, newRem, true));
      if (newRem === 0) state.openActs.delete(m.hashHex);
      need -= take;
    }

    if (need > 0) {
      throw new ProtocolError("Не удалось распределить residual по актам", "F05");
    }

    addEdge(state.edgeRemaining, key, -r);
    addNet(state.net, from, +r);
    addNet(state.net, to, -r);
  }

  const after = snapshotNet(state.net);
  if (before !== after) {
    throw new ProtocolError("Инвариант нетто-позиций нарушен", "INVARIANT");
  }
}

/** Reduce remaining on a single act (legacy migration). Preserves net. */
function applyWriteDown(state: State, assertion: WriteDownAssertion): void {
  if (!(assertion.delta > 0) || !Number.isInteger(assertion.delta)) {
    throw new ProtocolError("write_down: delta должен быть целым > 0", "WRITE_DOWN");
  }
  const hashHex = bytesToHex(assertion.actHash);
  const act = state.acts.get(hashHex);
  if (!act?.sigM2) {
    throw new ProtocolError("write_down: акт не финализирован", "WRITE_DOWN");
  }
  const rem = state.remaining.get(hashHex) ?? 0;
  if (assertion.delta > rem) {
    throw new ProtocolError("write_down: delta > remaining", "WRITE_DOWN");
  }
  const newRem = rem - assertion.delta;
  state.remaining.set(hashHex, newRem);
  state.status.set(hashHex, statusFromRemaining(act.amount, newRem, true));
  if (newRem === 0) state.openActs.delete(hashHex);

  const from = bytesToHex(act.from);
  const to = bytesToHex(act.to);
  addEdge(state.edgeRemaining, edgeKey(from, to), -assertion.delta);
  addNet(state.net, from, +assertion.delta);
  addNet(state.net, to, -assertion.delta);
}

export function deriveState(history: History): State {
  const state = emptyState();

  for (const event of history) {
    if (event.kind === "act") {
      ingestAct(state, event.wire);
    } else if (event.kind === "m2") {
      applyM2(state, event.assertion);
    } else if (event.kind === "clearing") {
      applyAssertion(state, event.assertion);
    } else if (event.kind === "write_down") {
      applyWriteDown(state, event.assertion);
    } else {
      const _exhaustive: never = event;
      void _exhaustive;
      throw new ProtocolError("Неизвестный тип события истории", "HISTORY");
    }
  }

  return state;
}

export function makeClearingAssertion(
  cycle: ClearingCycle,
  opts?: { appliedAt?: number; nonce?: Uint8Array; prevHash?: Uint8Array | null },
): ClearingAssertion {
  if (cycle.nodes.length < 2) {
    throw new ProtocolError("Фиктивный клиринг: цикл слишком короткий", "F04");
  }
  if (!(cycle.residual > 0)) {
    throw new ProtocolError("Фиктивный клиринг: residual ≤ 0", "F04");
  }
  return {
    version: 1,
    cycle: [...cycle.nodes],
    residual: cycle.residual,
    appliedAt: opts?.appliedAt ?? Date.now(),
    nonce: opts?.nonce ?? randomBytes(16),
    prevHash: opts?.prevHash ?? null,
  };
}

export function makeM2Assertion(actHash: Uint8Array, sigM2: Uint8Array, appliedAt?: number): M2Assertion {
  return {
    actHash,
    sigM2,
    appliedAt: appliedAt ?? Date.now(),
  };
}

export function findCyclesFromState(state: State, maxLen = MAX_CYCLE_LEN): ClearingCycle[] {
  const adj = new Map<AgentId, Map<AgentId, number>>();
  for (const [key, weight] of state.edgeRemaining) {
    if (weight <= 0) continue;
    const sep = key.indexOf(">");
    if (sep < 0) continue;
    const from = key.slice(0, sep);
    const to = key.slice(sep + 1);
    let row = adj.get(from);
    if (!row) {
      row = new Map();
      adj.set(from, row);
    }
    row.set(to, (row.get(to) ?? 0) + weight);
  }

  const nodes = [...new Set([...adj.keys(), ...[...adj.values()].flatMap((m) => [...m.keys()])])].sort(
    (a, b) => a.localeCompare(b),
  );
  const found = new Map<string, ClearingCycle>();

  function rotateToMin(path: string[]): string[] {
    if (path.length === 0) return path;
    let minIdx = 0;
    for (let i = 1; i < path.length; i++) {
      if (path[i]! < path[minIdx]!) minIdx = i;
    }
    return [...path.slice(minIdx), ...path.slice(0, minIdx)];
  }

  function dfs(start: string, current: string, path: string[], visited: Set<string>) {
    if (path.length > maxLen) return;
    const row = adj.get(current);
    if (!row) return;
    const neighbours = [...row.entries()].sort(([a], [b]) => a.localeCompare(b));
    for (const [next, weight] of neighbours) {
      if (weight <= 0) continue;
      if (next === start && path.length >= 2) {
        const rotated = rotateToMin([...path]);
        const key = rotated.join(">");
        if (found.has(key)) continue;
        const edges = rotated.map((from, i) => {
          const to = rotated[(i + 1) % rotated.length]!;
          return { from, to, weight: adj.get(from)?.get(to) ?? 0 };
        });
        const residual = Math.min(...edges.map((e) => e.weight));
        if (residual > 0) {
          found.set(key, { nodes: rotated, residual, edges });
        }
        continue;
      }
      if (visited.has(next) || next === current) continue;
      visited.add(next);
      path.push(next);
      dfs(start, next, path, visited);
      path.pop();
      visited.delete(next);
    }
  }

  for (const node of nodes) {
    dfs(node, node, [node], new Set([node]));
  }

  return [...found.values()].sort((a, b) => {
    if (b.residual !== a.residual) return b.residual - a.residual;
    if (a.nodes.length !== b.nodes.length) return a.nodes.length - b.nodes.length;
    return a.nodes.join(">").localeCompare(b.nodes.join(">"));
  });
}

export function appendClearing(
  history: History,
  cycle: ClearingCycle,
  opts?: { appliedAt?: number; nonce?: Uint8Array },
): { history: History; state: State; assertion: ClearingAssertion } {
  const assertion = makeClearingAssertion(cycle, opts);
  const nextHistory: History = [...history, { kind: "clearing", assertion }];
  const state = deriveState(nextHistory);
  return { history: nextHistory, state, assertion };
}

export function snapshotStateNets(state: State): string {
  return snapshotNet(state.net);
}
