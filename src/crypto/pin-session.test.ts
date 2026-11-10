import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sealMnemonicWithPin, openMnemonicWithPin } from "./pin-session.ts";

describe("PIN session", () => {
  const mnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
  const pin = "1234";

  it("seals and opens mnemonic with PIN", async () => {
    const blob = await sealMnemonicWithPin(pin, mnemonic);
    assert.equal(blob.v, 1);
    assert.equal(blob.alg, "AES-GCM");
    const recovered = await openMnemonicWithPin(pin, blob);
    assert.equal(recovered, mnemonic);
  });

  it("rejects short PIN", async () => {
    await assert.rejects(() => sealMnemonicWithPin("123", mnemonic), /\u043c\u0438\u043d\u0438\u043c\u0443\u043c 4/);
  });

  it("fails to open with wrong PIN", async () => {
    const blob = await sealMnemonicWithPin(pin, mnemonic);
    await assert.rejects(() => openMnemonicWithPin("wrong", blob));
  });
});
