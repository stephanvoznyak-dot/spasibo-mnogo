import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createMnemonic } from "../crypto/bip39.ts";
import { bytesEqual, bytesToHex, randomBytes } from "../crypto/bytes.ts";
import { deriveKeypair } from "../crypto/keys.ts";
import { sign } from "../crypto/signature.ts";
import { exportHistoryJson, importHistoryJson } from "../storage/history-db.ts";
import { createSignedM1, signM2, verifyAct } from "./act.ts";
import { appendAct, appendClearing, appendM2, acceptEvent, findCycles, historyFromActs, stateOf } from "./history.ts";
import { decodeQrMessage, encodeQrMessage } from "./qr-messages.ts";
import { hashActBody } from "./serialization.ts";
import { ProtocolError, type Act, type History } from "./types.ts";

function agent() {
  const mnemonic = createMnemonic(12);
  const keys = deriveKeypair(mnemonic);
  return { mnemonic, ...keys };
}

function finalAct(
  from: { secretKey: Uint8Array; publicKey: Uint8Array },
  to: { secretKey: Uint8Array; publicKey: Uint8Array },
  amount: number,
  nonce?: Uint8Array,
): Act {
  return signM2(
    createSignedM1({
      fromSecret: from.secretKey,
      fromPublic: from.publicKey,
      to: to.publicKey,
      amount,
      nonce,
    }),
    to.secretKey,
    to.publicKey,
  );
}

function nets(history: History): string {
  const net = stateOf(history).net;
  return [...net.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join(";");
}

describe("P0 protocol audit", () => {
  it("rejects a tampered signed field and does not rewrite the caller's hash", () => {
    const a = agent();
    const b = agent();
    const act = createSignedM1({
      fromSecret: a.secretKey,
      fromPublic: a.publicKey,
      to: b.publicKey,
      amount: 5,
      note: "долг",
    });
    const originalHash = act.hash;
    const tampered = { ...act, amount: 6 };
    assert.throws(() => verifyAct(tampered), (err: unknown) => err instanceof ProtocolError && err.code === "SIG_M1");
    const swapped = { ...act, hash: new Uint8Array(32) };
    const checked = verifyAct(swapped);
    assert.ok(bytesEqual(checked.hash, hashActBody(act)));
    assert.equal(swapped.hash[0], 0);
    assert.ok(bytesEqual(act.hash, originalHash));
  });

  it("rejects M2 from the wrong key and a second conflicting signature", () => {
    const a = agent();
    const b = agent();
    const c = agent();
    const act = createSignedM1({
      fromSecret: a.secretKey,
      fromPublic: a.publicKey,
      to: b.publicKey,
      amount: 9,
    });
    const { history } = appendAct([], act);
    const forged = sign(hashActBody(act), c.secretKey);
    assert.throws(() => appendM2(history, act.hash, forged), (err: unknown) => err instanceof ProtocolError && err.code === "SIG_M2");
    const good = signM2(act, b.secretKey, b.publicKey);
    const once = appendM2(history, good.hash, good.sigM2!);
    assert.equal(once.added, true);
    assert.equal(once.state.remaining.get(bytesToHex(good.hash)), 9);
    const again = appendM2(once.history, good.hash, good.sigM2!);
    assert.equal(again.added, false);
    assert.equal(again.state.remaining.get(bytesToHex(good.hash)), 9);
    const other = sign(hashActBody(act), b.secretKey);
    void other;
    const flipped = new Uint8Array(good.sigM2!);
    flipped[0] = flipped[0]! ^ 0xff;
    assert.throws(
      () => appendM2(once.history, good.hash, flipped),
      (err: unknown) => err instanceof ProtocolError && (err.code === "SIG_M2" || err.code === "M2"),
    );
  });

  it("does not apply the same clearing event twice", () => {
    const a = agent();
    const b = agent();
    const c = agent();
    let history: History = [];
    history = appendAct(history, finalAct(a, b, 18)).history;
    history = appendAct(history, finalAct(b, c, 12)).history;
    history = appendAct(history, finalAct(c, a, 8)).history;
    const cycle = findCycles(history)[0]!;
    const applied = appendClearing(history, cycle, { nonce: randomBytes(16), appliedAt: 1_700_000_000_000 });
    const clearing = applied.history[applied.history.length - 1]!;
    assert.equal(clearing.kind, "clearing");
    const replayed = stateOf([...applied.history, clearing]);
    for (const [hash, remaining] of applied.state.remaining) {
      assert.equal(replayed.remaining.get(hash), remaining);
    }
    assert.equal(replayed.clearings.length, 1);
  });

  it("restores the same state from history and from an export round-trip", () => {
    const a = agent();
    const b = agent();
    const act = finalAct(a, b, 15);
    const { history } = appendAct([], act);
    const again = stateOf(history);
    const json = exportHistoryJson(history);
    const imported = importHistoryJson(json);
    const restored = stateOf(imported);
    assert.equal(restored.remaining.get(bytesToHex(act.hash)), again.remaining.get(bytesToHex(act.hash)));
    const parsed = JSON.parse(json) as { events: unknown[] };
    parsed.events.push(parsed.events[parsed.events.length - 1]);
    const deduped = importHistoryJson(JSON.stringify(parsed));
    assert.equal(deduped.filter((e) => e.kind === "m2").length, 1);
    assert.equal(stateOf(deduped).remaining.get(bytesToHex(act.hash)), 15);
  });

  it("rejects a reused sender nonce and keeps an unconfirmed act out of the net", () => {
    const a = agent();
    const b = agent();
    const nonce = randomBytes(16);
    const first = createSignedM1({
      fromSecret: a.secretKey,
      fromPublic: a.publicKey,
      to: b.publicKey,
      amount: 4,
      nonce,
    });
    const second = createSignedM1({
      fromSecret: a.secretKey,
      fromPublic: a.publicKey,
      to: b.publicKey,
      amount: 5,
      nonce,
      timestamp: first.timestamp + 1,
    });
    const { history } = appendAct([], first);
    assert.equal(stateOf(history).net.size, 0);
    assert.equal(stateOf(history).status.get(bytesToHex(first.hash)), "pending_m2");
    assert.throws(() => appendAct(history, second), (err: unknown) => err instanceof ProtocolError && err.code === "NONCE");
  });

  it("exchanges M1 and M2 between two devices over QR without a server", () => {
    const a = agent();
    const b = agent();
    const m1 = createSignedM1({
      fromSecret: a.secretKey,
      fromPublic: a.publicKey,
      to: b.publicKey,
      amount: 21,
      note: "смета",
    });
    const proposal = decodeQrMessage(encodeQrMessage("act-proposal", m1));
    assert.equal(proposal.type, "act-proposal");
    const signed = signM2(proposal.act, b.secretKey, b.publicKey);
    const finalQr = decodeQrMessage(encodeQrMessage("act-final", signed));
    assert.equal(finalQr.type, "act-final");

    let deviceA = appendAct([], m1).history;
    let deviceB = appendAct([], proposal.act).history;
    deviceB = appendM2(deviceB, signed.hash, signed.sigM2!).history;
    deviceA = appendM2(deviceA, finalQr.act.hash, finalQr.act.sigM2!).history;
    assert.equal(nets(deviceA), nets(deviceB));
    assert.equal(stateOf(deviceA).remaining.get(bytesToHex(signed.hash)), 21);

    const repeat = appendAct(deviceA, finalQr.act);
    assert.equal(repeat.added, false);
    assert.equal(repeat.state.remaining.get(bytesToHex(signed.hash)), 21);
  });

  it("rejects a damaged, foreign, badly signed, or oversized QR", () => {
    const a = agent();
    const b = agent();
    const act = createSignedM1({
      fromSecret: a.secretKey,
      fromPublic: a.publicKey,
      to: b.publicKey,
      amount: 2,
    });
    const raw = encodeQrMessage("act-proposal", act);
    assert.throws(() => decodeQrMessage(raw.slice(0, 12)), (err: unknown) => err instanceof ProtocolError);
    const foreign = JSON.parse(raw) as { proto: string };
    foreign.proto = "eos";
    assert.throws(() => decodeQrMessage(JSON.stringify(foreign)), (err: unknown) => err instanceof ProtocolError && err.code === "QR");
    const broken = { ...act, sigM1: new Uint8Array(64) };
    assert.throws(() => decodeQrMessage(encodeQrMessage("act-proposal", broken)));
    assert.throws(() => decodeQrMessage("x".repeat(9000)), (err: unknown) => err instanceof ProtocolError && err.code === "QR_SIZE");
  });

  it("does not change nets when two independent acts are reordered", () => {
    const a = agent();
    const b = agent();
    const c = agent();
    const ab = finalAct(a, b, 6);
    const ac = finalAct(a, c, 4);
    const forward = historyFromActs([ab, ac]);
    const backward = historyFromActs([ac, ab]);
    assert.equal(nets(forward), nets(backward));
  });

  it("refuses a reused nonce before the journal changes", () => {
    const a = agent();
    const b = agent();
    const nonce = randomBytes(16);
    const first = createSignedM1({
      fromSecret: a.secretKey,
      fromPublic: a.publicKey,
      to: b.publicKey,
      amount: 3,
      nonce,
    });
    const second = createSignedM1({
      fromSecret: a.secretKey,
      fromPublic: a.publicKey,
      to: b.publicKey,
      amount: 4,
      nonce,
      timestamp: first.timestamp + 5,
    });
    const { history } = appendAct([], first);
    const before = history.length;
    assert.throws(() => acceptEvent(history, { kind: "act", wire: second }), (err: unknown) => err instanceof ProtocolError && err.code === "NONCE");
    assert.equal(history.length, before);
    const replay = acceptEvent(history, { kind: "act", wire: first });
    assert.equal(replay.added, false);
    assert.equal(replay.history, history);
  });

  it("rejects a tampered export and does not return a history", () => {
    const a = agent();
    const b = agent();
    const act = finalAct(a, b, 7);
    const json = exportHistoryJson(appendAct([], act).history);
    assert.equal(json.includes("mnemonic"), false);
    assert.equal(json.includes("secretKey"), false);
    const parsed = JSON.parse(json) as { events: Array<{ kind: string; wireHex?: string }> };
    const row = parsed.events.find((e) => e.kind === "act");
    row!.wireHex = "00".repeat(8);
    assert.throws(() => importHistoryJson(JSON.stringify(parsed)));
  });
});
