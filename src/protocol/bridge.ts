/**
 * Bridge: derived State ↔ legacy LedgerEntry[] for UI during migration.
 */
import { bytesToHex } from "@/crypto/bytes";
import type { Act, LedgerEntry, State } from "./types";

/** Build LedgerEntry list from derived State (UI-compatible). */
export function stateToEntries(state: State): LedgerEntry[] {
  const out: LedgerEntry[] = [];
  for (const [hashHex, act] of state.acts) {
    out.push({
      act,
      status: state.status.get(hashHex) ?? (act.sigM2 ? "finalized" : "pending_m2"),
      remainingAmount: state.remaining.get(hashHex) ?? 0,
      addedAt: act.timestamp,
    });
  }
  out.sort((a, b) => a.act.timestamp - b.act.timestamp || a.addedAt - b.addedAt);
  return out;
}

/** Map act hash → entry for quick lookup. */
export function entriesByHash(entries: LedgerEntry[]): Map<string, LedgerEntry> {
  const m = new Map<string, LedgerEntry>();
  for (const e of entries) m.set(bytesToHex(e.act.hash), e);
  return m;
}

export function entryFromAct(act: Act): LedgerEntry {
  return {
    act,
    status: act.sigM2 ? "finalized" : "pending_m2",
    remainingAmount: act.sigM2 ? act.amount : 0,
    addedAt: Date.now(),
  };
}
