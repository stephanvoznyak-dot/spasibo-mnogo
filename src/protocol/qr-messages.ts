import { b64urlToBytes, bytesToB64url, utf8Decode, utf8Encode } from "@/crypto/bytes";
import { PROTOCOL_NAME, PROTOCOL_VERSION } from "@/version";
import { decodeAct, encodeAct } from "./serialization";
import { verifyAct } from "./act";
import { ProtocolError, type Act } from "./types";

export type QrMessageType = "act-proposal" | "act-final" | "sync-request" | "sync-response";

export interface QrEnvelope {
  proto: typeof PROTOCOL_NAME;
  ver: number;
  type: QrMessageType;
  payload: string;
}

/** Max raw QR string length before decode (remark: reject oversized payloads). */
export const QR_MAX_RAW_CHARS = 8_192;

/** Max decoded payload bytes. */
export const QR_MAX_PAYLOAD_BYTES = 4_096;

const QR_TYPES = new Set<QrMessageType>([
  "act-proposal",
  "act-final",
  "sync-request",
  "sync-response",
]);

export function encodeQrMessage(type: QrMessageType, act: Act): string {
  const envelope: QrEnvelope = {
    proto: PROTOCOL_NAME,
    ver: PROTOCOL_VERSION,
    type,
    payload: bytesToB64url(encodeAct(act)),
  };
  const raw = JSON.stringify(envelope);
  if (raw.length > QR_MAX_RAW_CHARS) {
    throw new ProtocolError("QR-сообщение слишком большое для кодирования", "QR_SIZE");
  }
  return raw;
}

function assertQrShape(obj: Record<string, unknown>): QrEnvelope {
  if (obj.proto !== PROTOCOL_NAME) throw new ProtocolError("Чужой протокол в QR", "QR");
  if (obj.ver !== PROTOCOL_VERSION) {
    throw new ProtocolError("Неподдерживаемая версия QR", "QR");
  }
  if (typeof obj.type !== "string" || !QR_TYPES.has(obj.type as QrMessageType)) {
    throw new ProtocolError("Неизвестный тип QR-сообщения", "QR");
  }
  if (typeof obj.payload !== "string") throw new ProtocolError("Пустой payload QR", "QR");
  if (obj.payload.length > QR_MAX_PAYLOAD_BYTES * 2) {
    throw new ProtocolError("QR payload превышает допустимый размер", "QR_SIZE");
  }
  return {
    proto: PROTOCOL_NAME,
    ver: PROTOCOL_VERSION,
    type: obj.type as QrMessageType,
    payload: obj.payload,
  };
}

export function decodeQrMessage(raw: string): { type: QrMessageType; act: Act } {
  if (typeof raw !== "string" || raw.length === 0) {
    throw new ProtocolError("Пустой QR", "QR");
  }
  if (raw.length > QR_MAX_RAW_CHARS) {
    throw new ProtocolError("QR превышает допустимый размер", "QR_SIZE");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ProtocolError("QR не содержит JSON-конверт", "QR");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new ProtocolError("Некорректный QR-конверт", "QR");
  }

  const obj = parsed as Record<string, unknown>;
  const envelope = assertQrShape(obj);

  let payloadBytes: Uint8Array;
  try {
    payloadBytes = b64urlToBytes(envelope.payload);
  } catch {
    throw new ProtocolError("Некорректный base64url payload", "QR");
  }
  if (payloadBytes.length > QR_MAX_PAYLOAD_BYTES) {
    throw new ProtocolError("QR payload превышает допустимый размер", "QR_SIZE");
  }

  const act = decodeAct(payloadBytes);
  verifyAct(act);

  if (envelope.type === "act-proposal" && act.sigM2) {
    throw new ProtocolError("Предложение не должно содержать M2", "QR");
  }
  if (envelope.type === "act-final" && !act.sigM2) {
    throw new ProtocolError("Финальный акт должен содержать M2", "QR");
  }

  return { type: envelope.type, act };
}

export function encodeManualFallback(act: Act, type: QrMessageType): string {
  return bytesToB64url(utf8Encode(encodeQrMessage(type, act)));
}

export function decodeManualFallback(input: string): { type: QrMessageType; act: Act } {
  const trimmed = input.trim();
  if (trimmed.length > QR_MAX_RAW_CHARS * 2) {
    throw new ProtocolError("Ввод превышает допустимый размер", "QR_SIZE");
  }
  if (trimmed.startsWith("{")) return decodeQrMessage(trimmed);
  try {
    return decodeQrMessage(utf8Decode(b64urlToBytes(trimmed)));
  } catch {
    return decodeQrMessage(trimmed);
  }
}
