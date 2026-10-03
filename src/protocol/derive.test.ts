import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createMnemonic } from "../crypto/bip39.ts";
import { deriveKeypair } from "../crypto/keys.ts";
import { bytesToHex } from "../crypto/bytes.ts";
import { createSignedM1, signM2 } from "./act.ts";
import {
  appendClearing,
  deriveState,
  findCyclesFromState,
  makeClearingAssertion,
  snapshotStateNets,
} from "./derive.ts";
import type { Act, History, HistoryEvent } from "./types";
import { edgeKey } from "./types";

function agent() {
  const mnemonic = createMnemonic(12);
  const keys = deriveKeypair(mnemonic);
  return { mnemonic, ...keys };
}

function finalAct(
  from: { secretKey: Uint8Array; publicKey: Uint8Array },
  to: { secretKey: Uint8Array; publicKey: Uint8Array },
  amount: number,
): Act {
  return signM2(
    createSignedM1({
      fromSecret: from.secretKey,
      fromPublic: from.publicKey,
      to: to.publicKey,
      amount,
    }),
    to.secretKey,
    to.publicKey,
  );
}

function actEvent(act: Act): HistoryEvent {
  return { kind: "act", wire: act };
}

describe("deriveState", () => {
  it("empty history → empty state", () => {
    const state = deriveState([]);
    assert.equal(state.acts.size, 0);
    assert.equal(state.remaining.size, 0);
    assert.equal(state.net.size, 0);
    assert.equal(snapshotStateNets(state), "");
  });

  it("single finalized act sets remaining = amount and net", () => {
    const a = agent();
    const b = agent();
    const act = finalAct(a, b, 42);
    const state = deriveState([actEvent(act)]);
    const h = bytesToHex(act.hash);
    assert.equal(state.remaining.get(h), 42);
    assert.equal(state.status.get(h), "finalized");
    assert.equal(state.openActs.size, 1);
    const from = bytesToHex(a.publicKey);
    const to = bytesToHex(b.publicKey);
    assert.equal(state.edgeRemaining.get(edgeKey(from, to)), 42);
    assert.equal(state.net.get(from), -42);
    assert.equal(state.net.get(to), 42);
  });

  it("pending_m2 act has remaining 0", () => {
    const a = agent();
    const b = agent();
    const act = createSignedM1({
      fromSecret: a.secretKey,
      fromPublic: a.publicKey,
      to: b.publicKey,
      amount: 5,
    });
    const state = deriveState([actEvent(act)]);
    const h = bytesToHex(act.hash);
    assert.equal(state.remaining.get(h), 0);
    assert.equal(state.status.get(h), "pending_m2");
    assert.equal(state.openActs.size, 0);
    assert.equal(state.net.size, 0);
  });

  it("18-12-8 triangle: residual 8 → remaining 10/4/0, nets preserved", () => {
    const a = agent();
    const b = agent();
    const c = agent();
    const ab = finalAct(a, b, 18);
    const bc = finalAct(b, c, 12);
    const ca = finalAct(c, a, 8);

    const history: History = [actEvent(ab), actEvent(bc), actEvent(ca)];
    const before = deriveState(history);
    const netsBefore = snapshotStateNets(before);

    const cycles = findCyclesFromState(before);
    assert.ok(cycles.length >= 1);
    assert.equal(cycles[0]!.residual, 8);

    const { history: afterHistory, state: after } = appendClearing(history, cycles[0]!);

    // History grew by one clearing event; original acts untouched.
    assert.equal(afterHistory.length, 4);
    assert.equal(afterHistory[0]!.kind, "act");
    assert.equal(afterHistory[3]!.kind, "clearing");
    assert.equal((afterHistory[3] as { kind: "clearing"; assertion: { residual: number } }).assertion.residual, 8);

    // Remaining after clearing.
    assert.equal(after.remaining.get(bytesToHex(ab.hash)), 10);
    assert.equal(after.remaining.get(bytesToHex(bc.hash)), 4);
    assert.equal(after.remaining.get(bytesToHex(ca.hash)), 0);

    assert.equal(after.status.get(bytesToHex(ab.hash)), "partially_cleared");
    assert.equal(after.status.get(bytesToHex(bc.hash)), "partially_cleared");
    assert.equal(after.status.get(bytesToHex(ca.hash)), "cleared");

    // Net invariant.
    assert.equal(snapshotStateNets(after), netsBefore);

    // Edge aggregates.
    const aHex = bytesToHex(a.publicKey);
    const bHex = bytesToHex(b.publicKey);
    const cHex = bytesToHex(c.publicKey);
    assert.equal(after.edgeRemaining.get(edgeKey(aHex, bHex)), 10);
    assert.equal(after.edgeRemaining.get(edgeKey(bHex, cHex)), 4);
    assert.equal(after.edgeRemaining.get(edgeKey(cHex, aHex)) ?? 0, 0);
  });

  it("equal 10-10-10 triangle clears to zero, nets stay empty", () => {
    const a = agent();
    const b = agent();
    const c = agent();
    const history: History = [
      actEvent(finalAct(a, b, 10)),
      actEvent(finalAct(b, c, 10)),
      actEvent(finalAct(c, a, 10)),
    ];
    const before = deriveState(history);
    assert.equal(snapshotStateNets(before), ""); // balanced triangle → zero nets

    const cycles = findCyclesFromState(before);
    assert.equal(cycles[0]!.residual, 10);
    const { state: after } = appendClearing(history, cycles[0]!);

    assert.ok([...after.remaining.values()].every((r) => r === 0));
    assert.ok([...after.status.values()].every((s) => s === "cleared"));
    assert.equal(after.openActs.size, 0);
    assert.equal(snapshotStateNets(after), "");
  });

  it("deriveState is deterministic", () => {
    const a = agent();
    const b = agent();
    const c = agent();
    const history: History = [
      actEvent(finalAct(a, b, 18)),
      actEvent(finalAct(b, c, 12)),
      actEvent(finalAct(c, a, 8)),
    ];
    const cycles = findCyclesFromState(deriveState(history));
    const assertion = makeClearingAssertion(cycles[0]!, {
      appliedAt: 1_700_000_000_000,
      nonce: new Uint8Array(16).fill(7),
    });
    const full: History = [...history, { kind: "clearing", assertion }];

    const s1 = deriveState(full);
    const s2 = deriveState(full);

    assert.equal(snapshotStateNets(s1), snapshotStateNets(s2));
    assert.equal(s1.remaining.size, s2.remaining.size);
    for (const [h, r] of s1.remaining) {
      assert.equal(s2.remaining.get(h), r);
    }
    for (const [h, st] of s1.status) {
      assert.equal(s2.status.get(h), st);
    }
  });

  it("history is never mutated by deriveState", () => {
    const a = agent();
    const b = agent();
    const act = finalAct(a, b, 5);
    const history: History = [actEvent(act)];
    const frozen = JSON.stringify([
      {
        kind: history[0]!.kind,
        amount: (history[0] as { wire: Act }).wire.amount,
      },
    ]);
    deriveState(history);
    assert.equal(
      JSON.stringify([
        {
          kind: history[0]!.kind,
          amount: (history[0] as { wire: Act }).wire.amount,
        },
      ]),
      frozen,
    );
  });

  it("refuses fictitious clearing (F04)", () => {
    const a = agent();
    const b = agent();
    const history: History = [actEvent(finalAct(a, b, 5))];
    const state = deriveState(history);
    assert.equal(findCyclesFromState(state).length, 0);

    assert.throws(
      () =>
        makeClearingAssertion({
          nodes: [bytesToHex(a.publicKey), bytesToHex(b.publicKey)],
          residual: 0,
          edges: [],
        }),
      /F04|residual/,
    );
  });

  it("second derive from same History recovers identical State (Recovery)", () => {
    const a = agent();
    const b = agent();
    const c = agent();
    let history: History = [
      actEvent(finalAct(a, b, 18)),
      actEvent(finalAct(b, c, 12)),
      actEvent(finalAct(c, a, 8)),
    ];
    const cycles = findCyclesFromState(deriveState(history));
    const result = appendClearing(history, cycles[0]!);
    history = result.history;

    const recovered = deriveState(history);
    assert.equal(snapshotStateNets(recovered), snapshotStateNets(result.state));
    assert.equal(recovered.remaining.get(bytesToHex((history[0] as { wire: Act }).wire.hash)), 10);
    assert.equal(recovered.remaining.get(bytesToHex((history[1] as { wire: Act }).wire.hash)), 4);
    assert.equal(recovered.remaining.get(bytesToHex((history[2] as { wire: Act }).wire.hash)), 0);
  });
});
