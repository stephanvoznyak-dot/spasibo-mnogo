import { createServer } from "vite";
import assert from "node:assert/strict";

const server = await createServer({
  server: { middlewareMode: true },
  configFile: "./vite.config.ts",
});

const { createMnemonic } = await server.ssrLoadModule("/src/crypto/bip39.ts");
const { deriveKeypair } = await server.ssrLoadModule("/src/crypto/keys.ts");
const { createSignedM1, signM2, verifyAct } = await server.ssrLoadModule("/src/protocol/act.ts");
const { applyCycle, findCycles } = await server.ssrLoadModule("/src/protocol/clearing.ts");
const { snapshotNets, clampRemaining } = await server.ssrLoadModule("/src/protocol/graph.ts");
const { decodeAct, encodeAct, hashActBody } = await server.ssrLoadModule("/src/protocol/serialization.ts");
const { encodeQrMessage, decodeQrMessage } = await server.ssrLoadModule("/src/protocol/qr-messages.ts");
const { bytesEqual, bytesToHex } = await server.ssrLoadModule("/src/crypto/bytes.ts");

function agent() {
  return deriveKeypair(createMnemonic(12));
}

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
assert.ok(bytesEqual(hashActBody(again), again.hash));

let threw = false;
try {
  createSignedM1({ fromSecret: a.secretKey, fromPublic: a.publicKey, to: b.publicKey, amount: 1.5 });
} catch {
  threw = true;
}
assert.equal(threw, true);

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
const entries = [ab, bc, ca].map((item) => ({
  act: item,
  status: "finalized",
  remainingAmount: item.amount,
  addedAt: Date.now(),
}));
const before = snapshotNets(entries);
const cycles = findCycles(entries);
assert.ok(cycles.length >= 1);
const result = applyCycle(entries, cycles[0]);
assert.equal(result.residual, 3);
const after = snapshotNets(entries);
assert.equal(before, after);
assert.equal(findCycles([]).length, 0);

const qr = encodeQrMessage("act-proposal", act);
assert.equal(decodeQrMessage(qr).act.amount, 42);

const hashSwap = verifyAct({ ...act, hash: new Uint8Array(32) });
assert.equal(bytesToHex(hashSwap.hash), bytesToHex(act.hash));

assert.equal(clampRemaining(18, 99, true), 18);
assert.equal(clampRemaining(18, -3, true), 0);
assert.equal(clampRemaining(18, 7, false), 0);
assert.equal(clampRemaining(18, 7, true), 7);

console.log("protocol tests: PASS");
await server.close();
