import { useState, type FormEvent } from "react";
import { Copy, FlaskConical, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AUTHOR, CHANNEL, REPO } from "@/version";
import { DownloadButtons } from "./downloads";
import { t } from "./i18n";
import { runLabSuite } from "./lab-tests";
import { useApp } from "./store";
import { allTutorialAgents } from "./tutorial";

export function LabScreen() {
  const lang = useApp((s) => s.settings.lang);
  const unlocked = useApp((s) => s.settings.labUnlocked);
  const tryUnlock = useApp((s) => s.tryUnlockLab);
  const addContacts = useApp((s) => s.addTutorialContacts);
  const demo = useApp((s) => s.seedDemoTriangle);
  const fast = useApp((s) => s.fastLabIdentity);
  const setScreen = useApp((s) => s.setScreen);
  const identity = useApp((s) => s.identity);
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const agents = allTutorialAgents();
  const passCount = log.filter((l) => l.startsWith("PASS")).length;
  const failCount = log.filter((l) => l.startsWith("FAIL")).length;

  async function onUnlock(e: FormEvent) {
    e.preventDefault();
    const ok = await tryUnlock(code);
    if (!ok) setErr(t(lang, "labWrong"));
  }

  if (!unlocked) {
    return (
      <form className="flex flex-col gap-4" onSubmit={(e) => void onUnlock(e)}>
        <h2 className="flex items-center gap-2 font-serif text-2xl">
          <Lock className="size-5" /> {t(lang, "lab")}
        </h2>
        <p className="text-sm text-muted">{t(lang, "labGateHint")}</p>
        <label className="flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">{t(lang, "labGate")}</span>
          <Input
            type="password"
            inputMode="tel"
            autoComplete="off"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setErr(null);
            }}
          />
        </label>
        {err && <p className="text-sm text-danger">{err}</p>}
        <Button type="submit">{t(lang, "labUnlock")}</Button>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="flex items-center gap-2 font-serif text-2xl">
        <FlaskConical className="size-5" /> {t(lang, "lab")}
      </h2>
      <p className="text-sm text-muted">{t(lang, "labHint")}</p>

      <section className="rounded-lg border border-border bg-surface p-4">
        <p className="text-xs uppercase tracking-wide text-muted">01 · {t(lang, "fastIdentity")}</p>
        <p className="mt-2 text-sm text-muted">{t(lang, "fastIdentityHint")}</p>
        <p className="mt-2 font-mono text-xs text-subtle">{identity?.fingerprint ?? "—"}</p>
        <Button className="mt-3" variant="secondary" onClick={() => void fast()}>
          {t(lang, "fastIdentity")}
        </Button>
      </section>

      <section className="rounded-lg border border-border bg-surface p-4">
        <p className="text-xs uppercase tracking-wide text-muted">02 · {t(lang, "tutorialContacts")}</p>
        <ul className="mt-3 flex flex-col gap-3">
          {agents.map((a) => (
            <li key={a.id} className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm">{lang === "ru" ? a.nameRu : a.nameEn}</p>
                <p className="font-mono text-[11px] text-muted">{a.fingerprint}</p>
                <p className="mt-1 font-mono text-[10px] break-all text-subtle">{a.publicKeyHex}</p>
              </div>
              <button
                type="button"
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-md border border-border"
                aria-label={t(lang, "copy")}
                onClick={() => void navigator.clipboard.writeText(a.publicKeyHex)}
              >
                <Copy className="size-4" />
              </button>
            </li>
          ))}
        </ul>
        <Button
          className="mt-3"
          variant="secondary"
          onClick={() =>
            void addContacts().then(() => {
              setNote(t(lang, "tutorialContacts"));
              setScreen("contacts");
            })
          }
        >
          {t(lang, "tutorialContacts")}
        </Button>
      </section>

      <section className="rounded-lg border border-border bg-surface p-4">
        <p className="text-xs uppercase tracking-wide text-muted">03 · {t(lang, "demoTriangle")}</p>
        <p className="mt-2 text-sm text-muted">{t(lang, "demoHint")}</p>
        <div className="mt-3 flex flex-col gap-2">
          <Button
            onClick={() =>
              void demo()
                .then(() => {
                  setNote("18 → 12 → 8");
                  setScreen("clearing");
                })
                .catch((e: unknown) => setNote(e instanceof Error ? e.message : "demo"))
            }
          >
            {t(lang, "demoTriangle")}
          </Button>
          <Button variant="outline" onClick={() => setScreen("clearing")}>
            {t(lang, "openClearing")}
          </Button>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface p-4">
        <p className="text-xs uppercase tracking-wide text-muted">04 · F01, F03–F08</p>
        <Button
          className="mt-3"
          variant="secondary"
          onClick={() => {
            try {
              setLog(runLabSuite());
            } catch (e) {
              setLog([`FAIL  лаборатория — ${e instanceof Error ? e.message : "crash"}`]);
            }
          }}
        >
          {t(lang, "labRun")}
        </Button>
        <pre className="mt-3 overflow-auto rounded-lg border border-border bg-bg p-3 font-mono text-xs leading-6">
          {log.join("\n") || "—"}
        </pre>
        {log.length > 0 && (
          <p className={`mt-2 text-sm ${failCount ? "text-danger" : "text-ok"}`}>
            {passCount} PASS · {failCount} FAIL
          </p>
        )}
      </section>
      {note && <p className="text-sm text-muted">{note}</p>}

      <section className="rounded-lg border border-border bg-surface p-4">
        <p className="text-xs uppercase tracking-wide text-muted">05 · {t(lang, "downloads")}</p>
        <div className="mt-3">
          <DownloadButtons lang={lang} />
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface p-4 text-sm">
        <p className="text-xs uppercase tracking-wide text-muted">{t(lang, "channel")}</p>
        <a className="mt-2 block text-fg underline" href={CHANNEL.url} target="_blank" rel="noreferrer">
          {CHANNEL.url}
        </a>
        <p className="mt-4 text-xs uppercase tracking-wide text-muted">{t(lang, "author")}</p>
        <p className="mt-1">
          {AUTHOR.name} · {AUTHOR.phone}
        </p>
        <a className="mt-1 block underline" href={AUTHOR.telegram} target="_blank" rel="noreferrer">
          {AUTHOR.handle}
        </a>
        <p className="mt-4 text-xs uppercase tracking-wide text-muted">{t(lang, "sourceRepo")}</p>
        <a className="mt-1 block underline" href={REPO.url} target="_blank" rel="noreferrer">
          github.com/stephanvoznyak-dot/spasibo-mnogo
        </a>
      </section>
    </div>
  );
}
