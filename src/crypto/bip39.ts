import {
  generateMnemonic,
  mnemonicToSeedSync,
  validateMnemonic,
} from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";

export type WordCount = 12 | 24;

export function normalizeMnemonic(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function createMnemonic(wordCount: WordCount = 12): string {
  const strength = wordCount === 24 ? 256 : 128;
  return generateMnemonic(wordlist, strength);
}

export function isValidMnemonic(phrase: string): boolean {
  const normalized = normalizeMnemonic(phrase);
  const words = normalized.split(" ").filter(Boolean);
  if (words.length !== 12 && words.length !== 24) return false;
  return validateMnemonic(normalized, wordlist);
}

export function mnemonicToSeed(phrase: string): Uint8Array {
  const normalized = normalizeMnemonic(phrase);
  if (!isValidMnemonic(normalized)) {
    throw new Error("Контрольная сумма сид-фразы не совпала");
  }
  return mnemonicToSeedSync(normalized);
}

export { wordlist };
