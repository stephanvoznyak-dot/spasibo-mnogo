import { useState, type FormEvent } from "react";
import { Copy, FlaskConical, Lock, Play, Layers, Shield, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AUTHOR, CHANNEL, REPO, APP_VERSION } from "@/version";
import { DownloadButtons } from "./downloads";
import { t } from "./i18n";
import { runAllSuites, runCanonSuite, runLabSuite } from "./lab-tests";
import { useApp } from "./store";
import { allTutorialAgents } from "./tutorial";

function LogBlock({ log }: { log: string[] }) {
  const passCount = log.filter((l) => l.startsWith("PASS")).length;
  const failCount = log.filter((l) => l.startsWith("FAIL")).length;
  return (
    <>
      <pre className="mt-3 max-h-64 overflow-auto rounded-lg border border-border bg-bg p-3 font-mono text-xs leading-6">
        {log.join("\n") || "—"}
      </pre>
      {log.length > 0 && (
        <p className={`mt-2 text-sm ${failCount ? "text-danger" : "text-ok"}`}>
          {passCount} PASS · {failCount} FAIL
        </p>
      )}
    </>
  );
}

export function LabScreen() {
  const lang = useApp((s) => s.settings.lang);
  const unlocked = useApp((s) => s.settings.labUnlocked);
  const tryUnlock = useApp((s) => s.tryUnlockLab);
  const addContacts = useApp((s) => s.addTutorialContacts);
  const demo = useApp((s) => s.seedDemoTriangle);
  const fast = useApp((s) => s.fastLabIdentity);
  const setScreen = useApp((s) => s.setScreen);
  const identity = useApp((s) => s.identity);
  const history = useApp((s) => s.history);
  const entries = useApp((s) => s.entries);
  const runClearing = useApp((s) => s.runClearing);
  const cycles = useApp((s) => s.cycles);

  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [logClassic, setLogClassic] = useState<string[]>([]);
  const [logCanon, setLogCanon] = useState<string[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const agents = allTutorialAgents();

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
      <p className="text-sm text-muted">
        {t(lang, "labHint")} · v{APP_VERSION}
      </p>

      {/* Status strip */}
      <section className="rounded-lg border border-border bg-surface p-3 font-mono text-xs text-muted">
        <p>
          History: <span className="text-fg">{history.length}</span> events · Entries:{" "}
          <span className="text-fg">{entries.length}</span> · Cycles:{" "}
          <span className="text-fg">{cycles().length}</span>
        </p>
        <p className="mt-1 truncate">ID: {identity?.fingerprint ?? "—"}</p>
      </section>

      {/* 01 Fast identity */}
      <section className="rounded-lg border border-border bg-surface p-4">
        <p className="text-xs uppercase tracking-wide text-muted">01 · {t(lang, "fastIdentity")}</p>
        <p className="mt-2 text-sm text-muted">{t(lang, "fastIdentityHint")}</p>
        <Button className="mt-3" variant="secondary" onClick={() => void fast()}>
          {t(lang, "fastIdentity")}
        </Button>
      </section>

      {/* 02 Contacts */}
      <section className="rounded-lg border border-border bg-surface p-4">
        <p className="text-xs uppercase tracking-wide text-muted">02 · {t(lang, "tutorialContacts")}</p>
        <ul className="mt-3 flex flex-col gap-3">
          {agents.map((a) => (
            <li key={a.id} className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm">{lang === "ru" ? a.nameRu : a.nameEn}</p>
                <p className="font-mono text-[11px] text-muted">{a.fingerprint}</p>
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

      {/* 03 Demo triangle + live clearing */}
      <section className="rounded-lg border border-border bg-surface p-4">
        <p className="text-xs uppercase tracking-wide text-muted">03 · {t(lang, "demoTriangle")}</p>
        <p className="mt-2 text-sm text-muted">{t(lang, "demoHint")}</p>
        <div className="mt-3 flex flex-col gap-2">
          <Button
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void demo()
                .then(() => {
                  setNote("Демо 18→12→8 загружено в History");
                  setScreen("clearing");
                })
                .catch((e: unknown) => setNote(e instanceof Error ? e.message : "demo"))
                .finally(() => setBusy(false));
            }}
          >
            {t(lang, "demoTriangle")}
          </Button>
          <Button
            variant="secondary"
            disabled={busy || !identity}
            onClick={() => {
              setBusy(true);
              void runClearing()
                .then((r) => setNote(`Клиринг: ${r.length} цикл(ов), residual=${r[0]?.residual ?? "—"}`))
                .catch((e: unknown) => setNote(e instanceof Error ? e.message : "clearing"))
                .finally(() => setBusy(false));
            }}
          >
            <Play className="mr-2 size-4" /> Запустить клиринг (History)
          </Button>
          <Button variant="outline" onClick={() => setScreen("clearing")}>
            {t(lang, "openClearing")}
          </Button>
        </div>
      </section>

      {/* 04 Classic F-tests */}
      <section className="rounded-lg border border-border bg-surface p-4">
        <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted">
          <Shield className="size-3.5" /> 04 · F01, F03–F08
        </p>
        <div className="mt-3 flex flex-col gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              try {
                setLogClassic(runLabSuite());
              } catch (e) {
                setLogClassic([`FAIL  лаборатория — ${e instanceof Error ? e.message : "crash"}`]);
              }
            }}
          >
            {t(lang, "labRun")} (classic)
          </Button>
        </div>
        <LogBlock log={logClassic} />
      </section>

      {/* 05 Canon 2.2 */}
      <section className="rounded-lg border border-border bg-surface p-4">
        <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted">
          <GitBranch className="size-3.5" /> 05 · Canon 2.2 (History → State)
        </p>
        <p className="mt-2 text-sm text-muted">
          deriveState, ClearingAssertion, идемпотентность, MAX_CYCLE_LEN, QR_SIZE, Recovery
        </p>
        <div className="mt-3 flex flex-col gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              try {
                setLogCanon(runCanonSuite());
              } catch (e) {
                setLogCanon([`FAIL  canon — ${e instanceof Error ? e.message : "crash"}`]);
              }
            }}
          >
            <Layers className="mr-2 size-4" /> Тесты Canon 2.2
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              try {
                const all = runAllSuites();
                setLogClassic(all.classic);
                setLogCanon(all.canon);
                const pc =
                  all.classic.filter((l) => l.startsWith("PASS")).length +
                  all.canon.filter((l) => l.startsWith("PASS")).length;
                const fc =
                  all.classic.filter((l) => l.startsWith("FAIL")).length +
                  all.canon.filter((l) => l.startsWith("FAIL")).length;
                setNote(`Все тесты: ${pc} PASS · ${fc} FAIL`);
              } catch (e) {
                setNote(e instanceof Error ? e.message : "suite crash");
              }
            }}
          >
            Запустить всё (classic + canon)
          </Button>
        </div>
        <LogBlock log={logCanon} />
      </section>

      {note && (
        <p className="rounded-lg border border-border bg-surface p-3 text-sm text-muted">{note}</p>
      )}

      {/* 06 Downloads */}
      <section className="rounded-lg border border-border bg-surface p-4">
        <p className="text-xs uppercase tracking-wide text-muted">06 · {t(lang, "downloads")}</p>
        <div className="mt-3">
          <DownloadButtons lang={lang} />
        </div>
      </section>

      {/* Meta */}
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
