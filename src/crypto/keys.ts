import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha2.js";
import { bytesToHex, hexToBytes } from "./bytes";
import { mnemonicToSeed, type WordCount } from "./bip39";
import { sha256Bytes } from "./hash";

ed.hashes.sha512 = sha512;

export interface Keypair {
  secretKey: Uint8Array;
  publicKey: Uint8Array;
}

export function deriveKeypair(mnemonic: string): Keypair {
  const seed = mnemonicToSeed(mnemonic);
  const secretKey = seed.slice(0, 32);
  return ed.keygen(secretKey);
}

export function publicKeyHex(publicKey: Uint8Array): string {
  if (publicKey.length !== 32) throw new Error("Публичный ключ должен быть 32 байта");
  return bytesToHex(publicKey);
}

export function parsePublicKey(input: string): Uint8Array {
  const cleaned = input.trim().toLowerCase().replace(/[\s:-]/g, "");
  const bytes = hexToBytes(cleaned);
  if (bytes.length !== 32) throw new Error("Публичный ключ должен быть 32 байта (64 hex)");
  return bytes;
}

export function fingerprintOf(publicKey: Uint8Array): string {
  const digest = sha256Bytes(publicKey);
  const hex = bytesToHex(digest).slice(0, 12);
  return `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}`;
}

export function shortId(publicKeyHexValue: string): string {
  return fingerprintOf(parsePublicKey(publicKeyHexValue));
}

export function assertSecretNeverLeaves(secretKey: Uint8Array): void {
  if (secretKey.length !== 32) throw new Error("Некорректный секретный ключ");
}

export type { WordCount };
