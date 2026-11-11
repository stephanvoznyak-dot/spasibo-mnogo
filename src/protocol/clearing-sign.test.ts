import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createMnemonic } from "../crypto/bip39.ts";
import { deriveKeypair } from "../crypto/keys.ts";
import { signClearingAssertion, verifyClearingAssertion, hashClearingBody } from "./clearing-sign.ts";
import { ProtocolError } from "./types.ts";

function agent() {
  const mnemonic = createMnemonic(12);
  const keys = deriveKeypair(mnemonic);
  return { mnemonic, ...keys };
}

describe("clearing-sign", () => {
  it("signs and verifies a clearing assertion", () => {
    const a = agent();
    const nonce = new Uint8Array(16).fill(1);
    const partial = {
      version: 1 as const,
      cycle: ["pk1", "pk2"],
      residual: 0,
      appliedAt: Date.now(),
      nonce,
    };
    const signed = signClearingAssertion(partial, a.publicKey, a.secretKey);
    assert.equal(signed.version, 1);
    assert.deepEqual(signed.cycle, partial.cycle);
    assert.equal(signed.residual, 0);
    assert.ok(signed.sig && signed.sig.length === 64);
    assert.ok(signed.author && signed.author.length === 32);

    const result = verifyClearingAssertion(signed);
    assert.equal(result.ok, true);
    assert.equal(result.signed, true);
    assert.ok(result.authorHex);
  });

  it("accepts unsigned (legacy) assertions", () => {
    const unsigned = {
      version: 1 as const,
      cycle: ["a", "b"],
      residual: 5,
      appliedAt: 1,
      nonce: new Uint8Array(8),
      author: undefined,
      sig: undefined,
      prevHash: null,
    };
    const result = verifyClearingAssertion(unsigned as any);
    assert.equal(result.ok, true);
    assert.equal(result.signed, false);
    assert.equal(result.authorHex, null);
  });

  it("rejects bad key lengths", () => {
    const a = agent();
    const partial = {
      version: 1 as const,
      cycle: ["x"],
      residual: 0,
      appliedAt: 1,
      nonce: new Uint8Array(8),
    };
    assert.throws(
      () => signClearingAssertion(partial, a.publicKey.slice(0, 16), a.secretKey),
      ProtocolError,
    );
  });

  it("hashClearingBody is deterministic", () => {
    const body = {
      version: 1 as const,
      cycle: ["c1"],
      residual: 10,
      appliedAt: 42,
      nonce: new Uint8Array([1, 2, 3]),
      author: new Uint8Array(32).fill(7),
    };
    const h1 = hashClearingBody(body);
    const h2 = hashClearingBody(body);
    assert.deepEqual(h1, h2);
    assert.equal(h1.length, 32);
  });
});
