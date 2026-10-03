import { bytesToHex } from "@/crypto/bytes";
import type { LedgerEntry } from "./types";

export interface DirectedEdge {
  from: string;
  to: string;
  weight: number;
  hashHex: string;
}

export function clampRemaining(amount: number, remaining: number, hasM2: boolean): number {
  if (!hasM2) return 0;
  if (!Number.isFinite(remaining)) return amount;
  return Math.max(0, Math.min(amount, Math.trunc(remaining)));
}

export function remainingOf(entry: LedgerEntry): number {
  if (entry.status === "archived" || entry.status === "pending_m2" || entry.status === "cleared") {
    return 0;
  }
  return clampRemaining(entry.act.amount, entry.remainingAmount, Boolean(entry.act.sigM2));
}

export function activeEdges(entries: LedgerEntry[]): DirectedEdge[] {
  const edges: DirectedEdge[] = [];
  for (const entry of entries) {
    if (!entry.act.sigM2) continue;
    const weight = remainingOf(entry);
    if (weight <= 0) continue;
    edges.push({
      from: bytesToHex(entry.act.from),
      to: bytesToHex(entry.act.to),
      weight,
      hashHex: bytesToHex(entry.act.hash),
    });
  }
  return edges;
}

export function pairBalance(entries: LedgerEntry[], i: string, j: string): number {
  let ij = 0;
  let ji = 0;
  for (const e of activeEdges(entries)) {
    if (e.from === i && e.to === j) ij += e.weight;
    if (e.from === j && e.to === i) ji += e.weight;
  }
  return ij - ji;
}

export function nodeNets(entries: LedgerEntry[]): Map<string, number> {
  const nets = new Map<string, number>();
  for (const e of activeEdges(entries)) {
    nets.set(e.from, (nets.get(e.from) ?? 0) - e.weight);
    nets.set(e.to, (nets.get(e.to) ?? 0) + e.weight);
  }
  return nets;
}

export function snapshotNets(entries: LedgerEntry[]): string {
  return [...nodeNets(entries).entries()]
    .filter(([, v]) => v !== 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join(";");
}

export function counterparties(entries: LedgerEntry[], selfHex: string): Array<{
  publicKeyHex: string;
  youOwe: number;
  theyOwe: number;
  net: number;
}> {
  const by = new Map<string, { youOwe: number; theyOwe: number }>();
  for (const e of activeEdges(entries)) {
    if (e.from === selfHex) {
      const cur = by.get(e.to) ?? { youOwe: 0, theyOwe: 0 };
      cur.youOwe += e.weight;
      by.set(e.to, cur);
    } else if (e.to === selfHex) {
      const cur = by.get(e.from) ?? { youOwe: 0, theyOwe: 0 };
      cur.theyOwe += e.weight;
      by.set(e.from, cur);
    }
  }
  return [...by.entries()]
    .map(([publicKeyHex, v]) => ({
      publicKeyHex,
      youOwe: v.youOwe,
      theyOwe: v.theyOwe,
      net: v.theyOwe - v.youOwe,
    }))
    .sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
}

export function aggregateAdj(entries: LedgerEntry[]): Map<string, Map<string, number>> {
  const adj = new Map<string, Map<string, number>>();
  for (const e of activeEdges(entries)) {
    let row = adj.get(e.from);
    if (!row) {
      row = new Map();
      adj.set(e.from, row);
    }
    row.set(e.to, (row.get(e.to) ?? 0) + e.weight);
  }
  return adj;
}
