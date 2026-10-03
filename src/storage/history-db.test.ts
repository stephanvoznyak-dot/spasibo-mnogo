import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { historyFromActs } from "../protocol/history.ts";
import { createMnemonic } from "../crypto/bip39.ts";
import { deriveKeypair } from "../crypto/keys.ts";
import { createSignedM1, signM2 } from "../protocol/act.ts";
import { deriveState } from "../protocol/derive.ts";
import type { Act } from "../protocol/types.ts";

// Unit-level tests that do not require IndexedDB (pure helpers).

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

describe("history migration helpers", () => {
  it("historyFromActs + deriveState recovers remaining", () => {
    const a = agent();
    const b = agent();
    const act = finalAct(a, b, 11);
    const history = historyFromActs([act, act]); // duplicate skipped
    assert.equal(history.length, 1);
    const state = deriveState(history);
    assert.equal(state.remaining.size, 1);
    assert.equal([...state.remaining.values()][0], 11);
  });
});
