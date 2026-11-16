import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createMnemonic } from "../crypto/bip39.ts";
import { bytesEqual, bytesToHex, randomBytes } from "../crypto/bytes.ts";
import { deriveKeypair } from "../crypto/keys.ts";
import { sign } from "../crypto/signature.ts";
import { exportHistoryJson, importHistoryJson } from "../storage/history-db.ts";
import { createSignedM1, signM2, verifyAct } from "./act.ts";
// import { deriveState } from "./derive.ts";
import { appendAct, appendClearing, appendM2, findCycles, historyFromActs, stateOf } from "./history.ts";
import { decodeQrMessage, encodeQrMessage } from "./qr-messages.ts";
import { hashActBody } from "./serialization.ts";
import { ProtocolError, type Act, type History } from "./types.ts";

function agent() {
  const mnemonic = createMnemonic(12);
  const keys = deriveKeypair(mnemonic);
  return { mnemonic, ...keys };
}
