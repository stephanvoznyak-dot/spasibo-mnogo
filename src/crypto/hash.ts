import { sha256 } from "@noble/hashes/sha2.js";

export function sha256Bytes(data: Uint8Array): Uint8Array {
  return sha256(data);
}
