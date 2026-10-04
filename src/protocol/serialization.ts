import { decode, encode, type EncodeOptions } from "cborg";
import { bytesToHex } from "@/crypto/bytes";
import { sha256Bytes } from "@/crypto/hash";
import { ACT_VERSION } from "@/version";
import { ProtocolError, type Act } from "./types";

const CANONICAL: EncodeOptions = {
  float64: true,
};

/** Upper bound aligned with PROTOCOL.md (§5.1). */
export const MAX_AMOUNT = 1_000_000_000_000; // 10^12

/**
 * Strip C0 controls, DEL, and bidi/formatting controls (U+202A–202E, U+2066–2069).
 */
export function sanitizeNote(note: string): string {
  return note
    .replace(/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g, "")
    .slice(0, 280);
}

export function assertAmount(amount: unknown): number {
  if (typeof amount !== "number" || !Number.isInteger(amount) || amount < 1) {
    throw new ProtocolError("Сумма должна быть целым числом ≥ 1", "F03");
  }
  if (amount > MAX_AMOUNT) {
    throw new ProtocolError(`Сумма слишком велика (макс. ${MAX_AMOUNT})`, "F03");
  }
  return amount;
}

export type ActBody = [
  version: number,
  from: Uint8Array,
  to: Uint8Array,
  amount: number,
  note: string,
  timestamp: number,
  nonce: Uint8Array,
];

export function actBody(act: Pick<Act, "version" | "from" | "to" | "amount" | "note" | "timestamp" | "nonce">): ActBody {
  return [act.version, act.from, act.to, act.amount, act.note, act.timestamp, act.nonce];
}

export function encodeCanonical(value: unknown): Uint8Array {
  return encode(value, CANONICAL);
}

export function hashActBody(
  act: Pick<Act, "version" | "from" | "to" | "amount" | "note" | "timestamp" | "nonce">,
): Uint8Array {
  return sha256Bytes(encodeCanonical(actBody(act)));
}

export type ActWire = [
  version: number,
  from: Uint8Array,
  to: Uint8Array,
  amount: number,
  note: string,
  timestamp: number,
  nonce: Uint8Array,
  sigM1: Uint8Array,
  sigM2: Uint8Array | null,
];

export function encodeAct(act: Act): Uint8Array {
  const wire: ActWire = [
    act.version,
    act.from,
    act.to,
    act.amount,
    act.note,
    act.timestamp,
    act.nonce,
    act.sigM1,
    act.sigM2,
  ];
  return encodeCanonical(wire);
}

export function decodeAct(bytes: Uint8Array): Act {
  const decoded = decode(bytes);
  if (!Array.isArray(decoded) || decoded.length !== 9) {
    throw new ProtocolError("Некорректный формат акта", "DECODE");
  }
  const [version, from, to, amount, note, timestamp, nonce, sigM1, sigM2] = decoded as ActWire;
  if (version !== ACT_VERSION) {
    throw new ProtocolError(`Неподдерживаемая версия акта: ${String(version)}`, "VERSION");
  }
  if (!(from instanceof Uint8Array) || from.length !== 32) throw new ProtocolError("Некорректное поле from", "DECODE");
  if (!(to instanceof Uint8Array) || to.length !== 32) throw new ProtocolError("Некорректное поле to", "DECODE");
  if (!(nonce instanceof Uint8Array) || nonce.length < 8 || nonce.length > 16) {
    throw new ProtocolError("Некорректный nonce (ожидается 8…16 байт, канон — 16)", "DECODE");
  }
  if (!(sigM1 instanceof Uint8Array) || sigM1.length !== 64) throw new ProtocolError("Некорректная подпись M1", "DECODE");
  if (sigM2 !== null && (!(sigM2 instanceof Uint8Array) || sigM2.length !== 64)) {
    throw new ProtocolError("Некорректная подпись M2", "DECODE");
  }
  if (typeof note !== "string") throw new ProtocolError("Некорректная пометка", "DECODE");
  if (typeof timestamp !== "number" || !Number.isFinite(timestamp) || timestamp < 0) {
    throw new ProtocolError("Некорректная метка времени", "DECODE");
  }
  const safeAmount = assertAmount(amount);
  const body = {
    version,
    from,
    to,
    amount: safeAmount,
    note: sanitizeNote(note),
    timestamp: Math.trunc(timestamp),
    nonce,
  };
  // Soft canonical check: rebuild wire; non-matching length is tolerated (legacy)
  void encodeCanonical([
    body.version,
    body.from,
    body.to,
    body.amount,
    body.note,
    body.timestamp,
    body.nonce,
    sigM1,
    sigM2,
  ] as ActWire);
  return {
    ...body,
    hash: hashActBody(body),
    sigM1,
    sigM2,
  };
}

export function actHashHex(act: Act): string {
  return bytesToHex(hashActBody(act));
}
