import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createMnemonic } from "../crypto/bip39.ts";
import { deriveKeypair } from "../crypto/keys.ts";
import { createSignedM1, signM2, verifyAct } from "./act.ts";
import { applyCycle, findCycles } from "./clearing.ts";
import { snapshotNets } from "./graph.ts";
import { decodeAct, encodeAct, hashActBody } from "./serialization.ts";
import { decodeQrMessage, encodeQrMessage } from "./qr-messages.ts";
import { bytesEqual } from "../crypto/bytes.ts";
import type { LedgerEntry } from "./types";

function agent() {
  const mnemonic = createMnemonic(12);
  const keys = deriveKeypair(mnemonic);
  return { mnemonic, ...keys };
}

describe("act signatures", () => {
  it("signs M1 and M2 and round-trips CBOR", () => {
    const a = agent();
    const b = agent();
    const act = createSignedM1({
      fromSecret: a.secretKey,
      fromPublic: a.publicKey,
      to: b.publicKey,
      amount: 42,
      note: "тест",
    });
    verifyAct(act);
    const final = signM2(act, b.secretKey, b.publicKey);
    verifyAct(final);
    const again = decodeAct(encodeAct(final));
    assert.equal(again.amount, 42);
    assert.equal(again.note, "тест");
    assert.ok(bytesEqual(hashActBody(again), again.hash));
  });

  it("rejects fractional and non-positive amounts (F03)", () => {
    const a = agent();
    const b = agent();
    assert.throws(() =>
      createSignedM1({
        fromSecret: a.secretKey,
        fromPublic: a.publicKey,
        to: b.publicKey,
        amount: 1.5,
      }),
    );
    assert.throws(() =>
      createSignedM1({
        fromSecret: a.secretKey,
        fromPublic: a.publicKey,
        to: b.publicKey,
        amount: 0,
      }),
    );
    assert.throws(() =>
      createSignedM1({
        fromSecret: a.secretKey,
        fromPublic: a.publicKey,
        to: b.publicKey,
        amount: -3,
      }),
    );
  });

  it("freezes fields after M1 (F07) and recomputes hash (F06)", () => {
    const a = agent();
    const b = agent();
    const act = createSignedM1({
      fromSecret: a.secretKey,
      fromPublic: a.publicKey,
      to: b.publicKey,
      amount: 7,
      note: "x",
    });
    const tampered = { ...act, amount: 9 };
    assert.throws(() => verifyAct(tampered as typeof act));
    const hashSwap = { ...act, hash: new Uint8Array(32) };
    const checked = verifyAct(hashSwap as typeof act);
    assert.ok(bytesEqual(checked.hash, hashActBody(act)));
  });

  it("QR proposal / final envelope", () => {
    const a = agent();
    const b = agent();
    const act = createSignedM1({
      fromSecret: a.secretKey,
      fromPublic: a.publicKey,
      to: b.publicKey,
      amount: 3,
    });
    const qr = encodeQrMessage("act-proposal", act);
    const decoded = decodeQrMessage(qr);
    assert.equal(decoded.type, "act-proposal");
    assert.equal(decoded.act.amount, 3);
  });
});

describe("clearing", () => {
  it("clears a 3-cycle and preserves node nets", () => {
    const a = agent();
    const b = agent();
    const c = agent();
    const ab = signM2(
      createSignedM1({ fromSecret: a.secretKey, fromPublic: a.publicKey, to: b.publicKey, amount: 10 }),
      b.secretKey,
      b.publicKey,
    );
    const bc = signM2(
      createSignedM1({ fromSecret: b.secretKey, fromPublic: b.publicKey, to: c.publicKey, amount: 8 }),
      c.secretKey,
      c.publicKey,
    );
    const ca = signM2(
      createSignedM1({ fromSecret: c.secretKey, fromPublic: c.publicKey, to: a.publicKey, amount: 3 }),
      a.secretKey,
      a.publicKey,
    );
    const entries: LedgerEntry[] = [ab, bc, ca].map((act) => ({
      act,
      status: "finalized" as const,
      remainingAmount: act.amount,
      addedAt: Date.now(),
    }));
    const before = snapshotNets(entries);
    const cycles = findCycles(entries);
    assert.ok(cycles.length >= 1);
    const result = applyCycle(entries, cycles[0]!);
    assert.equal(result.residual, 3);
    const after = snapshotNets(entries);
    assert.equal(before, after);
  });

  it("clears an equal triangle to zero without breaking net snapshot", () => {
    const a = agent();
    const b = agent();
    const c = agent();
    const entries: LedgerEntry[] = [10, 10, 10].map((amount, i) => {
      const from = [a, b, c][i]!;
      const to = [b, c, a][i]!;
      const act = signM2(
        createSignedM1({ fromSecret: from.secretKey, fromPublic: from.publicKey, to: to.publicKey, amount }),
        to.secretKey,
        to.publicKey,
      );
      return { act, status: "finalized" as const, remainingAmount: amount, addedAt: 1 };
    });
    const before = snapshotNets(entries);
    const cycles = findCycles(entries);
    applyCycle(entries, cycles[0]!);
    assert.equal(cycles[0]!.residual, 10);
    assert.ok(entries.every((e) => e.remainingAmount === 0));
    assert.equal(snapshotNets(entries), before);
    assert.equal(before, "");
  });

  it("refuses fictitious clearing (F04)", () => {
    assert.equal(findCycles([]).length, 0);
    const a = agent();
    const b = agent();
    const act = signM2(
      createSignedM1({ fromSecret: a.secretKey, fromPublic: a.publicKey, to: b.publicKey, amount: 5 }),
      b.secretKey,
      b.publicKey,
    );
    const entries: LedgerEntry[] = [
      { act, status: "finalized", remainingAmount: 5, addedAt: 1 },
    ];
    assert.equal(findCycles(entries).length, 0);
  });
});
