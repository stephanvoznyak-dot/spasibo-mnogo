import { hexToBytes } from "@/crypto/bytes";
import { fingerprintOf } from "@/crypto/keys";
import { t, type MsgKey } from "./i18n";
import { useApp } from "./store";

export function useT() {
  const lang = useApp((s) => s.settings.lang);
  return (key: MsgKey) => t(lang, key);
}

export async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

export function usePartyName() {
  const contacts = useApp((s) => s.contacts);
  const self = useApp((s) => s.identity?.publicKeyHex);
  const lang = useApp((s) => s.settings.lang);
  return (hex: string) => {
    if (self && hex === self) return lang === "ru" ? "Вы" : "You";
    const named = contacts.find((c) => c.publicKeyHex === hex)?.displayName;
    if (named) return named;
    try {
      return fingerprintOf(hexToBytes(hex));
    } catch {
      return hex.slice(0, 8);
    }
  };
}
