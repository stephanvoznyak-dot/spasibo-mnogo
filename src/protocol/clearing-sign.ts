/**
 * Sign / verify ClearingAssertion (Stage B-a: local hypothesis).
 * Body hash does NOT include sig itself.
 */
import { bytesEqual, bytesToHex } from "@/crypto/bytes";
import { sha256Bytes } from "@/crypto/hash";
import { sign, verify } from "@/crypto/signature";
import { encodeCanonical } from "./serialization";
import { ProtocolError, type ClearingAssertion } from "./types";

/** Canonical body for signing (no sig field). */
export function clearingBody(a: {
  version: 1;
  cycle: string[];
  residual: number;
  appliedAt: number;
  nonce: Uint8Array;
  author: Uint8Array;
}): unknown {
  return [
    a.version,
    a.cycle,
    a.residual,
    a.appliedAt,
    a.nonce,
    a.author,
  ];
}

export function hashClearingBody(a: {
  version: 1;
  cycle: string[];
  residual: number;
  appliedAt: number;
  nonce: Uint8Array;
  author: Uint8Array;
}): Uint8Array {
  return sha256Bytes(encodeCanonical(clearingBody(a)));
}

export function signClearingAssertion(
  partial: {
    version: 1;
    cycle: string[];
    residual: number;
    appliedAt: number;
    nonce: Uint8Array;
  },
  authorPublic: Uint8Array,
  authorSecret: Uint8Array,
): ClearingAssertion {
  if (authorPublic.length !== 32 || authorSecret.length !== 32) {
    throw new ProtocolError("Ключи автора клиринга должны быть 32 байта", "KEYS");
  }
  const body = {
    version: 1 as const,
    cycle: [...partial.cycle],
    residual: partial.residual,
    appliedAt: partial.appliedAt,
    nonce: partial.nonce,
    author: authorPublic,
  };
  const hash = hashClearingBody(body);
  const sig = sign(hash, authorSecret);
  return { ...body, sig, prevHash: null };
}

/**
 * Verify author signature when present.
 * Legacy assertions without author/sig are accepted as unsigned (signed=false).
 */
export function verifyClearingAssertion(a: ClearingAssertion): {
  ok: true;
  signed: boolean;
  authorHex: string | null;
} {
  if (!a.author || !a.sig) {
    return { ok: true, signed: false, authorHex: null };
  }
  if (a.author.length !== 32 || a.sig.length !== 64) {
    throw new ProtocolError("Некорректные author/sig клиринга", "CLEARING_SIG");
  }
  const hash = hashClearingBody({
    version: 1,
    cycle: a.cycle,
    residual: a.residual,
    appliedAt: a.appliedAt,
    nonce: a.nonce,
    author: a.author,
  });
  if (!verify(a.sig, hash, a.author)) {
    throw new ProtocolError("Подпись автора клиринга недействительна", "CLEARING_SIG");
  }
  return { ok: true, signed: true, authorHex: bytesToHex(a.author) };
}

export function clearingAuthorHex(a: ClearingAssertion): string | null {
  return a.author ? bytesToHex(a.author) : null;
}

export function bytesEqualAuthor(a: Uint8Array | null | undefined, b: Uint8Array): boolean {
  if (!a) return false;
  return bytesEqual(a, b);
}
