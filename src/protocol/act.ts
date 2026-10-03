import { bytesEqual, bytesToHex, randomBytes } from "@/crypto/bytes";
import { fingerprintOf } from "@/crypto/keys";
import { sign, verify } from "@/crypto/signature";
import { ACT_VERSION } from "@/version";
import { assertAmount, hashActBody, sanitizeNote } from "./serialization";
import { ProtocolError, type Act } from "./types";

export interface DraftInput {
  fromSecret: Uint8Array;
  fromPublic: Uint8Array;
  to: Uint8Array;
  amount: number;
  note?: string;
  timestamp?: number;
  nonce?: Uint8Array;
}

export function createSignedM1(input: DraftInput): Act {
  const amount = assertAmount(input.amount);
  if (input.fromPublic.length !== 32 || input.to.length !== 32) {
    throw new ProtocolError("Ключи акта должны быть 32 байта", "KEYS");
  }
  if (bytesEqual(input.fromPublic, input.to)) {
    throw new ProtocolError("Нельзя выписать акт самому себе", "SELF");
  }
  const body = {
    version: ACT_VERSION,
    from: input.fromPublic,
    to: input.to,
    amount,
    note: sanitizeNote(input.note ?? ""),
    timestamp: input.timestamp ?? Date.now(),
    nonce: input.nonce ?? randomBytes(16),
  };
  const hash = hashActBody(body);
  const sigM1 = sign(hash, input.fromSecret);
  return { ...body, hash, sigM1, sigM2: null };
}

export function verifyAct(act: Act, opts?: { expectTo?: Uint8Array }): { ok: true; hash: Uint8Array } {
  assertAmount(act.amount);
  if (act.note.length > 280) throw new ProtocolError("Пометка длиннее 280 символов", "NOTE");
  const hash = hashActBody(act);
  if (!bytesEqual(hash, act.hash)) {
    act.hash = hash;
  }
  if (!verify(act.sigM1, hash, act.from)) {
    throw new ProtocolError("Подпись инициатора (M1) недействительна", "SIG_M1");
  }
  if (act.sigM2) {
    if (!verify(act.sigM2, hash, act.to)) {
      throw new ProtocolError("Подпись контрагента (M2) недействительна", "SIG_M2");
    }
  }
  if (opts?.expectTo && !bytesEqual(act.to, opts.expectTo)) {
    throw new ProtocolError("Акт адресован другому агенту", "WRONG_TO");
  }
  return { ok: true, hash };
}

export function signM2(act: Act, toSecret: Uint8Array, toPublic: Uint8Array): Act {
  if (act.sigM2) throw new ProtocolError("Подпись M2 уже установлена", "F07");
  if (!bytesEqual(act.to, toPublic)) {
    throw new ProtocolError("Подписывать M2 может только указанный контрагент", "WRONG_TO");
  }
  const { hash } = verifyAct(act, { expectTo: toPublic });
  const sigM2 = sign(hash, toSecret);
  return { ...act, hash, sigM2 };
}

export function isFrozenAfterM1(before: Act, after: Act): boolean {
  return (
    before.version === after.version &&
    bytesEqual(before.from, after.from) &&
    bytesEqual(before.to, after.to) &&
    before.amount === after.amount &&
    before.note === after.note &&
    before.timestamp === after.timestamp &&
    bytesEqual(before.nonce, after.nonce)
  );
}

export function describeAct(act: Act): {
  hashHex: string;
  fromHex: string;
  toHex: string;
  fromFp: string;
  toFp: string;
  amount: number;
  note: string;
  timestamp: number;
  hasM2: boolean;
} {
  return {
    hashHex: bytesToHex(act.hash),
    fromHex: bytesToHex(act.from),
    toHex: bytesToHex(act.to),
    fromFp: fingerprintOf(act.from),
    toFp: fingerprintOf(act.to),
    amount: act.amount,
    note: act.note,
    timestamp: act.timestamp,
    hasM2: Boolean(act.sigM2),
  };
}
