/**
 * Temporary minimal shell while full screens.tsx is restored.
 * Full UI: https://github.com/stephanvoznyak-dot/spasibo-mnogo/blob/0065399b1f8b9727fc8a4b111ec1f2807b257134/src/ui/screens.tsx
 * Or: node scripts/restore-screens.mjs (after pushing the real restore script).
 */
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isValidMnemonic, normalizeMnemonic, type WordCount } from "@/crypto/bip39";
import { APP_PRODUCT, APP_VERSION, AUTHOR, REPO } from "@/version";
import { LabScreen } from "./lab-screen";
import { t, type MsgKey } from "./i18n";
import { useApp, type Identity, type Screen } from "./store";

function useT() {
  const lang = useApp((s) => s.settings.lang);
  return (key: MsgKey) => t(lang, key);
}

function Panel({ children }: { children: ReactNode }) {
  return <section className="rounded-lg border border-border bg-surface p-4">{children}</section>;
}

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
  const [mode, setMode] = useState<"pick" | "create" | "restore">("pick");
  const [wordCount, setWordCount] = useState<WordCount>(12);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [ack, setAck] = useState(false);
  const [restoreText, setRestoreText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [labCode, setLabCode] = useState("");

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col gap-6 bg-bg px-5 py-8 text-fg">
      <header className="flex items-end justify-between">
        <div>
          <p className="font-serif text-4xl leading-none tracking-tight">{APP_PRODUCT}</p>
          <p className="mt-2 text-sm text-muted">{tr("tagline")}</p>
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
          <Button
            size="lg"
            onClick={() => {
              void createNew(wordCount).then((id) => {
                setIdentity(id);
                setMode("create");
              });
            }}
          >
            {tr("createIdentity")}
          </Button>
          <Button variant="outline" size="lg" onClick={() => setMode("restore")}>
            {tr("restoreIdentity")}
          </Button>
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
            <Input type="password" inputMode="tel" value={labCode} onChange={(e) => setLabCode(e.target.value)} />
            <Button type="submit" size="sm">
              {tr("labUnlock")}
            </Button>
          </form>
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
          <Button disabled={!ack} onClick={() => void persist(identity)}>
            {tr("continue")}
          </Button>
          <Button variant="ghost" onClick={() => setMode("pick")}>
            {tr("back")}
          </Button>
        </div>
      )}
      {mode === "restore" && (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            setErr(null);
            void restore(restoreText).catch((error) =>
              setErr(error instanceof Error ? error.message : "Ошибка"),
            );
          }}
        >
          <textarea
            className="min-h-32 rounded-md border border-border bg-surface p-3 font-mono text-sm"
            value={restoreText}
            onChange={(e) => setRestoreText(e.target.value)}
          />
          {restoreText && !isValidMnemonic(normalizeMnemonic(restoreText)) && (
            <p className="text-sm text-danger">Контрольная сумма не совпала</p>
          )}
          <Button type="submit">{tr("restoreIdentity")}</Button>
          <Button type="button" variant="ghost" onClick={() => setMode("pick")}>
            {tr("back")}
          </Button>
        </form>
      )}
    </div>
  );
}

export function Shell() {
  const screen = useApp((s) => s.screen);
  const setScreen = useApp((s) => s.setScreen);
  const identity = useApp((s) => s.identity)!;
  const error = useApp((s) => s.error);
  const tr = useT();
  const entries = useApp((s) => s.entries);

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col bg-bg text-fg">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <p className="font-serif text-xl leading-none">{APP_PRODUCT}</p>
          <p className="mt-1 font-mono text-[11px] text-muted">{identity.fingerprint}</p>
        </div>
        <p className="text-[11px] text-muted">v{APP_VERSION}</p>
      </header>
      {error && <p className="bg-danger/15 px-4 py-2 text-sm text-danger">{error}</p>}
      <main className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        {screen === "lab" ? (
          <LabScreen />
        ) : (
          <div className="flex flex-col gap-4">
            <Panel>
              <p className="text-sm">{tr("home")}</p>
              <p className="mt-2 font-mono text-xs">{identity.publicKeyHex}</p>
              <p className="mt-2 text-xs text-muted">
                Актов в журнале: {entries.length}. Полный UI восстанавливается; лаборатория и протокол
                работают.
              </p>
              <p className="mt-2 text-xs text-muted">{tr("clearingLocalHint")}</p>
            </Panel>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => setScreen("lab")}>{tr("lab")}</Button>
              <Button variant="secondary" onClick={() => setScreen("home")}>
                {tr("home")}
              </Button>
            </div>
            <Panel>
              <p className="text-xs text-muted">
                Автор: {AUTHOR.name}. Исходники: {REPO.url}
              </p>
            </Panel>
          </div>
        )}
      </main>
    </div>
  );
}

export function AppRoot() {
  const ready = useApp((s) => s.ready);
  const identity = useApp((s) => s.identity);
  const boot = useApp((s) => s.boot);
  useEffect(() => {
    void boot();
  }, [boot]);
  if (!ready) return <BootScreen />;
  if (!identity) return <Onboarding />;
  return <Shell />;
}
