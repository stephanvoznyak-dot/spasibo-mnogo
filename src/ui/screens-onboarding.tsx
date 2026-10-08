import { useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isValidMnemonic, normalizeMnemonic, type WordCount } from "@/crypto/bip39";
import { APP_PRODUCT } from "@/version";
import { useApp, type Identity } from "./store";
import { Field, useT } from "./screens-helpers";
import { DownloadPanel } from "./downloads";

export function BootScreen() {
  const tr = useT();
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-bg text-fg">
      <p className="font-serif text-3xl tracking-tight">{APP_PRODUCT}</p>
      <p className="text-sm text-muted">{tr("boot")}</p>
    </div>
  );
}

export function Onboarding() {
  const tr = useT();
  const createNew = useApp((s) => s.createNew);
  const persist = useApp((s) => s.persistNewIdentity);
  const restore = useApp((s) => s.restore);
  const setLang = useApp((s) => s.setLang);
  const lang = useApp((s) => s.settings.lang);
  const [mode, setMode] = useState<"pick" | "create" | "confirm" | "restore">("pick");
  const [wordCount, setWordCount] = useState<WordCount>(12);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [ack, setAck] = useState(false);
  const [checks, setChecks] = useState<Record<number, string>>({});
  const [restoreText, setRestoreText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [labCode, setLabCode] = useState("");
  const [labOpen, setLabOpen] = useState(false);

  const challenge = useMemo(() => {
    if (!identity) return [];
    const words = identity.mnemonic.split(" ");
    const idx = [2, 7, words.length - 1];
    return [...new Set(idx)].map((i) => ({ i, word: words[i]! }));
  }, [identity]);

  async function onCreate() {
    const id = await createNew(wordCount);
    setIdentity(id);
    setMode("create");
  }

  async function onConfirm() {
    if (!identity) return;
    for (const c of challenge) {
      if (normalizeMnemonic(checks[c.i] ?? "") !== c.word) {
        setErr("Слова не совпали. Проверьте запись.");
        return;
      }
    }
    await persist(identity);
  }

  async function onRestore(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await restore(restoreText);
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Ошибка восстановления");
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col gap-6 bg-bg px-5 py-8 text-fg">
      <header className="flex items-end justify-between">
        <div>
          <p className="font-serif text-4xl leading-none tracking-tight">{APP_PRODUCT}</p>
          <p className="mt-2 text-sm text-muted">{tr("tagline")}</p>
          <p className="mt-1 text-[11px] uppercase tracking-wide text-subtle">{tr("app")}</p>
        </div>
        <button className="text-xs text-muted" onClick={() => void setLang(lang === "ru" ? "en" : "ru")}>
          {lang === "ru" ? "EN" : "RU"}
        </button>
      </header>
      <p className="text-sm text-muted">{tr("disclaimer")}</p>
      {err && <p className="text-sm text-danger">{err}</p>}
      {mode === "pick" && (
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            {([12, 24] as const).map((n) => (
              <Button key={n} variant={wordCount === n ? "default" : "secondary"} onClick={() => setWordCount(n)}>
                {n === 12 ? tr("words12") : tr("words24")}
              </Button>
            ))}
          </div>
          <Button size="lg" onClick={() => void onCreate()}>
            {tr("createIdentity")}
          </Button>
          <Button variant="outline" size="lg" onClick={() => setMode("restore")}>
            {tr("restoreIdentity")}
          </Button>
          <DownloadPanel compact />
          <button type="button" className="text-xs text-muted underline" onClick={() => setLabOpen((v) => !v)}>
            {tr("lab")}
          </button>
          {labOpen && (
            <form
              className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3"
              onSubmit={(e) => {
                e.preventDefault();
                void (async () => {
                  const ok = await useApp.getState().tryUnlockLab(labCode);
                  if (!ok) {
                    setErr(tr("labWrong"));
                    return;
                  }
                  await useApp.getState().fastLabIdentity();
                })();
              }}
            >
              <p className="text-xs text-muted">{tr("labGateHint")}</p>
              <Input
                type="password"
                inputMode="tel"
                value={labCode}
                onChange={(e) => setLabCode(e.target.value)}
                placeholder={tr("labGate")}
              />
              <Button type="submit" size="sm">
                {tr("labUnlock")}
              </Button>
            </form>
          )}
        </div>
      )}
      {mode === "create" && identity && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted">{tr("writeSeed")}</p>
          <ol className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-surface p-3">
            {identity.mnemonic.split(" ").map((w, i) => (
              <li key={i} className="flex gap-2 font-mono text-sm">
                <span className="w-5 text-subtle">{i + 1}</span>
                {w}
              </li>
            ))}
          </ol>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />
            {tr("iWrote")}
          </label>
          <Button disabled={!ack} onClick={() => setMode("confirm")}>
            {tr("continue")}
          </Button>
          <Button variant="ghost" onClick={() => setMode("pick")}>
            {tr("back")}
          </Button>
        </div>
      )}
      {mode === "confirm" && identity && (
        <div className="flex flex-col gap-4">
          <p className="text-sm">{tr("verifyWords")}</p>
          {challenge.map((c) => (
            <Field key={c.i} label={`${tr("word")} ${c.i + 1}`}>
              <Input value={checks[c.i] ?? ""} onChange={(e) => setChecks({ ...checks, [c.i]: e.target.value })} />
            </Field>
          ))}
          {err && <p className="text-sm text-danger">{err}</p>}
          <Button onClick={() => void onConfirm()}>{tr("confirmSeed")}</Button>
        </div>
      )}
      {mode === "restore" && (
        <form className="flex flex-col gap-4" onSubmit={(e) => void onRestore(e)}>
          <p className="text-sm text-muted">{tr("restoreHint")}</p>
          <textarea
            className="min-h-32 rounded-md border border-border bg-surface p-3 font-mono text-sm"
            value={restoreText}
            onChange={(e) => setRestoreText(e.target.value)}
          />
          {restoreText && !isValidMnemonic(restoreText) && (
            <p className="text-sm text-danger">Контрольная сумма не совпала</p>
          )}
          {err && <p className="text-sm text-danger">{err}</p>}
          <Button type="submit">{tr("restoreAction")}</Button>
          <Button type="button" variant="ghost" onClick={() => setMode("pick")}>
            {tr("back")}
          </Button>
        </form>
      )}
    </div>
  );
}
