import { deriveKeypair, fingerprintOf, publicKeyHex } from "@/crypto/keys";
import { isValidMnemonic } from "@/crypto/bip39";

/** Учебные агенты — фиксированные BIP-39 векторы, не для реальных обязательств. */
export const TUTORIAL_AGENTS = [
  {
    id: "anna",
    nameRu: "Анна",
    nameEn: "Anna",
    mnemonic: "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
    note: "учебный: ужин",
  },
  {
    id: "boris",
    nameRu: "Борис",
    nameEn: "Boris",
    mnemonic: "legal winner thank year wave sausage worth useful legal winner thank yellow",
    note: "учебный: материалы",
  },
  {
    id: "viktor",
    nameRu: "Виктор",
    nameEn: "Victor",
    mnemonic: "letter advice cage absurd amount doctor acoustic avoid letter advice cage above",
    note: "учебный: помощь",
  },
] as const;

export function tutorialKeypair(id: (typeof TUTORIAL_AGENTS)[number]["id"]) {
  const agent = TUTORIAL_AGENTS.find((a) => a.id === id);
  if (!agent) throw new Error("Нет учебного агента");
  if (!isValidMnemonic(agent.mnemonic)) throw new Error("Учебная мнемоника повреждена");
  const keys = deriveKeypair(agent.mnemonic);
  return {
    ...agent,
    ...keys,
    publicKeyHex: publicKeyHex(keys.publicKey),
    fingerprint: fingerprintOf(keys.publicKey),
  };
}

let cached: ReturnType<typeof tutorialKeypair>[] | null = null;

export function allTutorialAgents() {
  if (!cached) cached = TUTORIAL_AGENTS.map((a) => tutorialKeypair(a.id));
  return cached;
}

/** Пароль лаборатории — телефон автора. Не светим в UI. */
export function checkLabPassword(input: string): boolean {
  const digits = input.replace(/\D/g, "");
  return digits === "79036060006" || digits === "89036060006" || digits === "9036060006";
}
