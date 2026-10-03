/**
 * Canon 2.2 — State derivation from immutable History.
 * Recovery ≡ deriveState(History).
 */
import { bytesToHex, randomBytes } from "@/crypto/bytes";
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
  type HistoryEvent,
  type State,
} from "./types";

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

/**
 * Apply a finalized act into a working State (mutates the state object).
 */
function ingestAct(state: State, act: Act): void {
  const hashHex = bytesToHex(act.hash);
  state.acts.set(hashHex, act);

  if (!act.sigM2) {
    state.status.set(hashHex, "pending_m2");
    state.remaining.set(hashHex, 0);
    return;
  }

  const remaining = act.amount;
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

/**
 * Apply one ClearingAssertion onto a working State.
 * Distributes residual along cycle edges in act-timestamp order (FIFO).
 * Throws if residual cannot be fully allocated or net invariant breaks.
 */
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

  for (let i = 0; i < n; i++) {
    const from = assertion.cycle[i]!;
    const to = assertion.cycle[(i + 1) % n]!;
    const key = edgeKey(from, to);
    const edgeWeight = state.edgeRemaining.get(key) ?? 0;
    if (edgeWeight < assertion.residual) {
      throw new ProtocolError(
        `Фиктивный клиринг: на ребре ${from.slice(0, 8)}→${to.slice(0, 8)} остаток ${edgeWeight} < residual ${assertion.residual}`,
        "F04",
      );
    }

    let need = assertion.residual;

    // Collect open acts on this edge, sorted by timestamp (FIFO).
    const matching: Array<{ hashHex: HashHex; act: Act; rem: number }> = [];
    for (const [hashHex, act] of state.openActs) {
      if (bytesToHex(act.from) === from && bytesToHex(act.to) === to) {
        const rem = state.remaining.get(hashHex) ?? 0;
        if (rem > 0) matching.push({ hashHex, act, rem });
      }
    }
    matching.sort((a, b) => a.act.timestamp - b.act.timestamp);

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

    addEdge(state.edgeRemaining, key, -assertion.residual);
    // Net positions are unchanged by design: each node loses residual on out-edge
    // and gains residual on in-edge. We still recompute via the loop below is not
    // needed — invariant check after the full cycle is sufficient. Explicit:
    // from loses residual on outgoing, gains residual on incoming → ΔN = 0.
  }

  const after = snapshotNet(state.net);
  if (before !== after) {
    throw new ProtocolError("Инвариант нетто-позиций нарушен", "INVARIANT");
  }
}

/**
 * Derive complete State from an ordered History.
 * Pure function: does not mutate the input History.
 */
export function deriveState(history: History): State {
  const state = emptyState();

  for (const event of history) {
    if (event.kind === "act") {
      ingestAct(state, event.wire);
    } else if (event.kind === "clearing") {
      applyAssertion(state, event.assertion);
    } else {
      const _exhaustive: never = event;
      void _exhaustive;
      throw new ProtocolError("Неизвестный тип события истории", "HISTORY");
    }
  }

  return state;
}

/**
 * Build a ClearingAssertion from a discovered cycle and current State.
 * Does not apply it — caller must append to History and re-derive.
 */
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

/**
 * Find cycles from a derived State (same algorithm as graph/clearing, but on State).
 */
export function findCyclesFromState(state: State, maxLen = 12): ClearingCycle[] {
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

  const nodes = [...new Set([...adj.keys(), ...[...adj.values()].flatMap((m) => [...m.keys()])])];
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
    for (const [next, weight] of row) {
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

  return [...found.values()].sort(
    (a, b) => b.residual - a.residual || a.nodes.length - b.nodes.length,
  );
}

/**
 * Convenience: append a clearing for the best cycle and return new History + State.
 * Pure — does not mutate inputs.
 */
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

/** Snapshot of net positions for invariant checks in tests. */
export function snapshotStateNets(state: State): string {
  return snapshotNet(state.net);
}
