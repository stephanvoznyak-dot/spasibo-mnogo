import { bytesToHex } from "@/crypto/bytes";
import type { LedgerEntry } from "./types";

export interface DirectedEdge {
  from: string;
  to: string;
  weight: number;
  hashHex: string;
}

export function remainingOf(entry: LedgerEntry): number {
  if (entry.status === "archived" || entry.status === "pending_m2" || entry.status === "cleared") {
    return 0;
  }
  return Math.max(0, entry.remainingAmount);
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
