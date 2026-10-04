/**
 * Regression: initiator must not lose finalization after reload (audit §1.1).
 * M2 is a separate History event; deriveState recovers finalized status.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createMnemonic } from "../crypto/bip39.ts";
import { deriveKeypair } from "../crypto/keys.ts";
import { bytesToHex } from "../crypto/bytes.ts";
import { createSignedM1, signM2 } from "./act.ts";
import { deriveState } from "./derive.ts";
import { appendAct, appendM2, historyFromActs } from "./history.ts";
import type { History } from "./types.ts";

function agent() {
  return deriveKeypair(createMnemonic(12));
}

describe("M2 as separate event (audit 1.1)", () => {
  it("initiator: M1 then remote M2 → reload still finalized", () => {
    const a = agent();
    const b = agent();

    // Initiator creates M1
    const m1 = createSignedM1({
      fromSecret: a.secretKey,
      fromPublic: a.publicKey,
      to: b.publicKey,
      amount: 42,
    });
    let history: History = [];
    const r1 = appendAct(history, m1);
    history = r1.history;
    assert.equal(r1.state.status.get(bytesToHex(m1.hash)), "pending_m2");
    assert.equal(r1.state.remaining.get(bytesToHex(m1.hash)), 0);

    // Counterparty signs M2; initiator receives act-final
    const final = signM2(m1, b.secretKey, b.publicKey);
    const r2 = appendM2(history, final.hash, final.sigM2!);
    history = r2.history;
    assert.equal(r2.added, true);
    assert.equal(r2.state.status.get(bytesToHex(m1.hash)), "finalized");
    assert.equal(r2.state.remaining.get(bytesToHex(m1.hash)), 42);

    // Simulate reload: re-derive from immutable History (no mutation of act event)
    const recovered = deriveState(history);
    assert.equal(recovered.status.get(bytesToHex(m1.hash)), "finalized");
    assert.equal(recovered.remaining.get(bytesToHex(m1.hash)), 42);
    assert.ok(recovered.acts.get(bytesToHex(m1.hash))?.sigM2);

    // Act event still has no sigM2 on wire; M2 is separate
    const actEv = history.find((e) => e.kind === "act")!;
    assert.equal(actEv.kind, "act");
    if (actEv.kind === "act") assert.equal(actEv.wire.sigM2, null);
    assert.equal(history.filter((e) => e.kind === "m2").length, 1);
  });

  it("appendM2 is idempotent", () => {
    const a = agent();
    const b = agent();
    const m1 = createSignedM1({
      fromSecret: a.secretKey,
      fromPublic: a.publicKey,
      to: b.publicKey,
      amount: 3,
    });
    const final = signM2(m1, b.secretKey, b.publicKey);
    let history = appendAct([], m1).history;
    const once = appendM2(history, final.hash, final.sigM2!);
    const twice = appendM2(once.history, final.hash, final.sigM2!);
    assert.equal(once.added, true);
    assert.equal(twice.added, false);
    assert.equal(twice.history.length, once.history.length);
  });

  it("historyFromActs expands M2 into separate events", () => {
    const a = agent();
    const b = agent();
    const final = signM2(
      createSignedM1({
        fromSecret: a.secretKey,
        fromPublic: a.publicKey,
        to: b.publicKey,
        amount: 7,
      }),
      b.secretKey,
      b.publicKey,
    );
    const h = historyFromActs([final]);
    assert.equal(h.length, 2);
    assert.equal(h[0]!.kind, "act");
    assert.equal(h[1]!.kind, "m2");
    const st = deriveState(h);
    assert.equal(st.status.get(bytesToHex(final.hash)), "finalized");
  });
});
