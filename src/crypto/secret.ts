import { bytesToHex, hexToBytes, randomBytes } from "./bytes";

const PBKDF2_ITERATIONS = 210_000;

export interface EncryptedBlob {
  v: 1;
  alg: "AES-GCM";
  kdf: "PBKDF2-SHA256" | "wrap-key";
  iter?: number;
  saltHex?: string;
  ivHex: string;
  ctHex: string;
}

function asBuffer(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  return copy;
}

export async function generateWrappingKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function encryptWithKey(key: CryptoKey, plaintext: Uint8Array): Promise<EncryptedBlob> {
  const iv = asBuffer(randomBytes(12));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, asBuffer(plaintext)),
  );
  return {
    v: 1,
    alg: "AES-GCM",
    kdf: "wrap-key",
    ivHex: bytesToHex(iv),
    ctHex: bytesToHex(ct),
  };
}

export async function decryptWithKey(key: CryptoKey, blob: EncryptedBlob): Promise<Uint8Array> {
  const iv = asBuffer(hexToBytes(blob.ivHex));
  const ct = asBuffer(hexToBytes(blob.ctHex));
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return new Uint8Array(pt);
}

export async function derivePasswordKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey(
    "raw",
    asBuffer(new TextEncoder().encode(password)),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: asBuffer(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptWithPassword(
  password: string,
  plaintext: Uint8Array,
): Promise<EncryptedBlob> {
  const salt = randomBytes(16);
  const key = await derivePasswordKey(password, salt);
  const blob = await encryptWithKey(key, plaintext);
  return {
    ...blob,
    kdf: "PBKDF2-SHA256",
    iter: PBKDF2_ITERATIONS,
    saltHex: bytesToHex(salt),
  };
}

export async function decryptWithPassword(
  password: string,
  blob: EncryptedBlob,
): Promise<Uint8Array> {
  if (!blob.saltHex) throw new Error("В контейнере нет соли");
  const key = await derivePasswordKey(password, hexToBytes(blob.saltHex));
  return decryptWithKey(key, blob);
}
