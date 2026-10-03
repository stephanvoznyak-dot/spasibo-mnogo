import { bytesToHex } from "@/crypto/bytes";
import { aggregateAdj, remainingOf, snapshotNets } from "./graph";
import { ProtocolError, type ClearingCycle, type ClearingResult, type LedgerEntry } from "./types";

/** Aligned with derive.MAX_CYCLE_LEN — mobile-safe bound (remark: avoid main-thread stalls). */
const MAX_CYCLE_LEN = 7;

function rotateToMin(nodes: string[]): string[] {
  if (nodes.length === 0) return nodes;
  let minIdx = 0;
  for (let i = 1; i < nodes.length; i++) {
    if (nodes[i]! < nodes[minIdx]!) minIdx = i;
  }
  return [...nodes.slice(minIdx), ...nodes.slice(0, minIdx)];
}

export function findCycles(entries: LedgerEntry[], maxLen = MAX_CYCLE_LEN): ClearingCycle[] {
  const adj = aggregateAdj(entries);
  const nodes = [...new Set([...adj.keys(), ...[...adj.values()].flatMap((m) => [...m.keys()])])].sort(
    (a, b) => a.localeCompare(b),
  );
  const found = new Map<string, ClearingCycle>();

  function dfs(start: string, current: string, path: string[], visited: Set<string>) {
    if (path.length > maxLen) return;
    const row = adj.get(current);
    if (!row) return;
    // Deterministic neighbour order (identical result on all devices)
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

/**
 * @deprecated Prefer History + ClearingAssertion via derive/history.
 * Mutates LedgerEntry.remainingAmount — transitional until storage migrates.
 */
export function applyCycle(entries: LedgerEntry[], cycle: ClearingCycle): ClearingResult {
  if (cycle.nodes.length < 2) {
    throw new ProtocolError("Фиктивный клиринг: цикл слишком короткий", "F04");
  }
  const residual = Math.min(...cycle.edges.map((e) => e.weight));
  if (!(residual > 0) || residual !== cycle.residual) {
    throw new ProtocolError("Фиктивный клиринг: нет положительного остатка", "F04");
  }

  const before = snapshotNets(entries);
  const applied: ClearingResult["applied"] = [];

  for (let i = 0; i < cycle.nodes.length; i++) {
    const from = cycle.nodes[i]!;
    const to = cycle.nodes[(i + 1) % cycle.nodes.length]!;
    let need = residual;
    const matching = entries
      .filter(
        (e) =>
          e.act.sigM2 &&
          remainingOf(e) > 0 &&
          bytesToHex(e.act.from) === from &&
          bytesToHex(e.act.to) === to,
      )
      .sort((a, b) => a.act.timestamp - b.act.timestamp || bytesToHex(a.act.hash).localeCompare(bytesToHex(b.act.hash)));
    if (matching.length === 0) {
      throw new ProtocolError("Фиктивный клиринг: нет актов на ребре цикла", "F04");
    }
    for (const entry of matching) {
      if (need <= 0) break;
      const take = Math.min(remainingOf(entry), need);
      const beforeAmt = entry.remainingAmount;
      entry.remainingAmount -= take;
      need -= take;
      if (entry.remainingAmount === 0) entry.status = "cleared";
      else entry.status = "partially_cleared";
      applied.push({
        hashHex: bytesToHex(entry.act.hash),
        from,
        to,
        before: beforeAmt,
        after: entry.remainingAmount,
        delta: take,
      });
    }
    if (need > 0) {
      throw new ProtocolError("Не удалось распределить residual по актам", "F05");
    }
  }

  const after = snapshotNets(entries);
  if (before !== after) {
    throw new ProtocolError("Инвариант нетто-позиций нарушен", "INVARIANT");
  }

  return { cycle, residual, applied };
}

export function clearAllCycles(entries: LedgerEntry[]): ClearingResult[] {
  const results: ClearingResult[] = [];
  for (;;) {
    const cycles = findCycles(entries);
    const next = cycles[0];
    if (!next || next.residual <= 0) break;
    results.push(applyCycle(entries, next));
    if (results.length > 1000) break;
  }
  return results;
}
