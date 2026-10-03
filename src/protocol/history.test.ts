import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createMnemonic } from "../crypto/bip39.ts";
import { deriveKeypair } from "../crypto/keys.ts";
import { bytesToHex } from "../crypto/bytes.ts";
import { createSignedM1, signM2 } from "./act.ts";
import { appendAct, appendClearing, findCycles, historyFromActs, MAX_CYCLE_LEN, stateOf } from "./history.ts";
import type { Act, History } from "./types";

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

describe("history API", () => {
  it("appendAct is idempotent on duplicate hash", () => {
    const a = agent();
    const b = agent();
    const act = finalAct(a, b, 7);
    let history: History = [];
    const r1 = appendAct(history, act);
    assert.equal(r1.added, true);
    assert.equal(r1.history.length, 1);
    history = r1.history;

    const r2 = appendAct(history, act);
    assert.equal(r2.added, false);
    assert.equal(r2.history.length, 1);
    assert.equal(r2.history, history); // same reference when no-op
  });

  it("appendAct rejects when allowDuplicate=false", () => {
    const a = agent();
    const b = agent();
    const act = finalAct(a, b, 3);
    const { history } = appendAct([], act);
    assert.throws(() => appendAct(history, act, { allowDuplicate: false }), /DUPLICATE/);
  });

  it("18-12-8 via history API preserves nets", () => {
    const a = agent();
    const b = agent();
    const c = agent();
    let history: History = [];
    history = appendAct(history, finalAct(a, b, 18)).history;
    history = appendAct(history, finalAct(b, c, 12)).history;
    history = appendAct(history, finalAct(c, a, 8)).history;

    const cycles = findCycles(history);
    assert.ok(cycles.length >= 1);
    assert.equal(cycles[0]!.residual, 8);
    assert.ok(cycles[0]!.nodes.length <= MAX_CYCLE_LEN);

    const before = stateOf(history);
    const { history: next, state: after } = appendClearing(history, cycles[0]!);

    assert.equal(next.length, 4);
    assert.equal(after.remaining.get(bytesToHex((history[0] as { wire: Act }).wire.hash)), 10);
    assert.equal(after.remaining.get(bytesToHex((history[1] as { wire: Act }).wire.hash)), 4);
    assert.equal(after.remaining.get(bytesToHex((history[2] as { wire: Act }).wire.hash)), 0);

    // Net invariant via snapshot equality is checked inside deriveState;
    // here we only assert recovery works.
    const recovered = stateOf(next);
    assert.equal(recovered.remaining.size, after.remaining.size);
    for (const [h, r] of after.remaining) {
      assert.equal(recovered.remaining.get(h), r);
    }
    void before;
  });

  it("historyFromActs skips duplicates", () => {
    const a = agent();
    const b = agent();
    const act = finalAct(a, b, 1);
    const h = historyFromActs([act, act, act]);
    assert.equal(h.length, 1);
  });

  it("cycle sort is deterministic across runs", () => {
    const a = agent();
    const b = agent();
    const c = agent();
    const history: History = [
      { kind: "act", wire: finalAct(a, b, 18) },
      { kind: "act", wire: finalAct(b, c, 12) },
      { kind: "act", wire: finalAct(c, a, 8) },
    ];
    const c1 = findCycles(history);
    const c2 = findCycles(history);
    assert.equal(c1.length, c2.length);
    for (let i = 0; i < c1.length; i++) {
      assert.deepEqual(c1[i]!.nodes, c2[i]!.nodes);
      assert.equal(c1[i]!.residual, c2[i]!.residual);
    }
  });
});
