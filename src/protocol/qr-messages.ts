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

export function encodeQrMessage(type: QrMessageType, act: Act): string {
  const envelope: QrEnvelope = {
    proto: PROTOCOL_NAME,
    ver: PROTOCOL_VERSION,
    type,
    payload: bytesToB64url(encodeAct(act)),
  };
  return JSON.stringify(envelope);
}

export function decodeQrMessage(raw: string): { type: QrMessageType; act: Act } {
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
  if (obj.proto !== PROTOCOL_NAME) throw new ProtocolError("Чужой протокол в QR", "QR");
  if (obj.ver !== PROTOCOL_VERSION) throw new ProtocolError("Неподдерживаемая версия QR", "QR");
  if (
    obj.type !== "act-proposal" &&
    obj.type !== "act-final" &&
    obj.type !== "sync-request" &&
    obj.type !== "sync-response"
  ) {
    throw new ProtocolError("Неизвестный тип QR-сообщения", "QR");
  }
  if (typeof obj.payload !== "string") throw new ProtocolError("Пустой payload QR", "QR");
  const act = decodeAct(b64urlToBytes(obj.payload));
  verifyAct(act);
  if (obj.type === "act-proposal" && act.sigM2) {
    throw new ProtocolError("Предложение не должно содержать M2", "QR");
  }
  if (obj.type === "act-final" && !act.sigM2) {
    throw new ProtocolError("Финальный акт должен содержать M2", "QR");
  }
  return { type: obj.type, act };
}

export function encodeManualFallback(act: Act, type: QrMessageType): string {
  return bytesToB64url(utf8Encode(encodeQrMessage(type, act)));
}

export function decodeManualFallback(input: string): { type: QrMessageType; act: Act } {
  const trimmed = input.trim();
  if (trimmed.startsWith("{")) return decodeQrMessage(trimmed);
  try {
    return decodeQrMessage(utf8Decode(b64urlToBytes(trimmed)));
  } catch {
    return decodeQrMessage(trimmed);
  }
}
