import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createMnemonic } from "../crypto/bip39.ts";
import { deriveKeypair } from "../crypto/keys.ts";
import { createSignedM1, signM2 } from "./act.ts";
import {
  encodeQrMessage,
  decodeQrMessage,
  encodeManualFallback,
  decodeManualFallback,
  QR_MAX_RAW_CHARS,
} from "./qr-messages.ts";
import { ProtocolError } from "./types.ts";

function agent() {
  const mnemonic = createMnemonic(12);
  const keys = deriveKeypair(mnemonic);
  return { mnemonic, ...keys };
}

function makeAct(from: ReturnType<typeof agent>, to: ReturnType<typeof agent>, withM2 = false) {
  const act = createSignedM1({
    fromPublic: from.publicKey,
    fromSecret: from.secretKey,
    to: to.publicKey,
    amount: 100,
    note: "test",
  });
  if (withM2) {
    return signM2(act, to.secretKey, to.publicKey);
  }
  return act;
}

describe("qr-messages", () => {
  it("encodes and decodes act-proposal", () => {
    const a = agent();
    const b = agent();
    const act = makeAct(a, b, false);
    const raw = encodeQrMessage("act-proposal", act);
    assert.ok(raw.length < QR_MAX_RAW_CHARS);
    const decoded = decodeQrMessage(raw);
    assert.equal(decoded.type, "act-proposal");
    assert.equal(decoded.act.amount, 100);
    assert.equal(decoded.act.sigM2, null);
  });

  it("encodes and decodes act-final", () => {
    const a = agent();
    const b = agent();
    const act = makeAct(a, b, true);
    const raw = encodeQrMessage("act-final", act);
    const decoded = decodeQrMessage(raw);
    assert.equal(decoded.type, "act-final");
    assert.ok(decoded.act.sigM2);
  });

  it("rejects proposal with M2", () => {
    const a = agent();
    const b = agent();
    const act = makeAct(a, b, true);
    const raw = encodeQrMessage("act-proposal", act);
    assert.throws(() => decodeQrMessage(raw), ProtocolError);
  });

  it("rejects final without M2", () => {
    const a = agent();
    const b = agent();
    const act = makeAct(a, b, false);
    const raw = encodeQrMessage("act-final", act);
    assert.throws(() => decodeQrMessage(raw), ProtocolError);
  });

  it("rejects empty or oversized", () => {
    assert.throws(() => decodeQrMessage(""), ProtocolError);
    assert.throws(() => decodeQrMessage("x".repeat(QR_MAX_RAW_CHARS + 1)), ProtocolError);
  });

  it("rejects invalid JSON and shapes", () => {
    assert.throws(() => decodeQrMessage("not json"), ProtocolError);
    assert.throws(() => decodeQrMessage('{"proto":"wrong"}'), ProtocolError);
    assert.throws(() => decodeQrMessage('{"proto":"normal-project","ver":999}'), ProtocolError);
    assert.throws(() => decodeQrMessage('{"proto":"normal-project","ver":1,"type":"bad"}'), ProtocolError);
  });

  it("manual fallback roundtrip", () => {
    const a = agent();
    const b = agent();
    const act = makeAct(a, b, false);
    const encoded = encodeManualFallback(act, "act-proposal");
    const decoded = decodeManualFallback(encoded);
    assert.equal(decoded.type, "act-proposal");
    assert.equal(decoded.act.amount, 100);
  });

  it("manual fallback accepts raw JSON", () => {
    const a = agent();
    const b = agent();
    const act = makeAct(a, b, false);
    const raw = encodeQrMessage("act-proposal", act);
    const decoded = decodeManualFallback(raw);
    assert.equal(decoded.act.amount, 100);
  });
});
