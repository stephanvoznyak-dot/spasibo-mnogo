/**
 * Optional PIN layer on top of encryptWithPassword.
 * When locked, wipe mnemonic from in-memory Identity (see store.lockWithPin).
 */
import { utf8Decode, utf8Encode } from "./bytes";
import { decryptWithPassword, encryptWithPassword, type EncryptedBlob } from "./secret";

export const PIN_META_KEY = "pinBlob";

export async function sealMnemonicWithPin(pin: string, mnemonic: string): Promise<EncryptedBlob> {
  if (pin.length < 4) throw new Error("PIN: минимум 4 символа");
  return encryptWithPassword(pin, utf8Encode(mnemonic));
}

export async function openMnemonicWithPin(pin: string, blob: EncryptedBlob): Promise<string> {
  const pt = await decryptWithPassword(pin, blob);
  return utf8Decode(pt);
}
