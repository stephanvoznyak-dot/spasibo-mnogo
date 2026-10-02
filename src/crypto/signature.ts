import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha2.js";

ed.hashes.sha512 = sha512;

export function sign(message: Uint8Array, secretKey: Uint8Array): Uint8Array {
  if (secretKey.length !== 32) throw new Error("Секретный ключ должен быть 32 байта");
  return ed.sign(message, secretKey);
}

export function verify(
  signature: Uint8Array,
  message: Uint8Array,
  publicKey: Uint8Array,
): boolean {
  if (signature.length !== 64 || publicKey.length !== 32) return false;
  try {
    return ed.verify(signature, message, publicKey);
  } catch {
    return false;
  }
}

export function getPublicKey(secretKey: Uint8Array): Uint8Array {
  return ed.getPublicKey(secretKey);
}
