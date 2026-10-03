import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  BookOpen,
  Camera,
  Check,
  ChevronLeft,
  Copy,
  FlaskConical,
  GitBranch,
  Home,
  Radio,
  ScanLine,
  Settings,
  Shield,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { bytesToHex, hexToBytes } from "@/crypto/bytes";
import { isValidMnemonic, normalizeMnemonic, type WordCount } from "@/crypto/bip39";
import { findCycles } from "@/protocol/clearing";
import { encodeQrMessage } from "@/protocol/qr-messages";
import { fingerprintOf } from "@/crypto/keys";
import type { Act, ActStatus, ClearingCycle } from "@/protocol/types";
import { APP_PRODUCT, APP_VERSION, AUTHOR, CHANNEL, PROTOCOL_NAME, PROTOCOL_VERSION, REPO } from "@/version";
import { DownloadButtons } from "./downloads";
import { GuideScreen } from "./guide-screens";
import { LabScreen } from "./lab-screen";
import {
  captureQrPhoto,
  detectQrFromBlob,
  detectQrFromVideo,
  openCameraStream,
  qrSvgDataUrl,
} from "./qr-tools";
import { t, type MsgKey } from "./i18n";
import { counterparties, describeAct, useApp, type Identity, type Screen } from "./store";

function useT() {
  const lang = useApp((s) => s.settings.lang);
  return (key: MsgKey) => t(lang, key);
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs font-medium tracking-wide text-muted uppercase">{label}</span>
      {children}
    </label>
  );
}

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-lg border border-border bg-surface p-4 ${className}`}>{children}</section>;
}

function Mono({ children }: { children: React.ReactNode }) {
  return <span className="font-mono text-xs tracking-wide break-all">{children}</span>;
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

function usePartyName() {
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

const TABS: Array<{ id: Screen; icon: typeof Home; key: MsgKey }> = [
  { id: "home", icon: Home, key: "home" },
  { id: "ledger", icon: BookOpen, key: "ledger" },
  { id: "scan", icon: ScanLine, key: "scan" },
  { id: "clearing", icon: GitBranch, key: "clearing" },
  { id: "settings", icon: Settings, key: "more" },
];

export function Shell() {
  const screen = useApp((s) => s.screen);
  const setScreen = useApp((s) => s.setScreen);
  const identity = useApp((s) => s.identity)!;
  const error = useApp((s) => s.error);
  const swarmPeers = useApp((s) => s.swarmPeers);
  const tr = useT();
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col bg-bg text-fg">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <p className="font-serif text-xl leading-none">{APP_PRODUCT}</p>
          <p className="mt-1 font-mono text-[11px] text-muted">{identity.fingerprint}</p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted">
          <Radio className="size-3.5" />
          {swarmPeers} {tr("peers")}
        </div>
      </header>
      {error && <p className="bg-danger/15 px-4 py-2 text-sm text-danger">{error}</p>}
      <main className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        {screen === "home" && <HomeScreen />}
        {screen === "create" && <CreateScreen />}
        {screen === "scan" && <ScanScreen />}
        {screen === "ledger" && <LedgerScreen />}
        {screen === "detail" && <DetailScreen />}
        {screen === "clearing" && <ClearingScreen />}
        {screen === "contacts" && <ContactsScreen />}
        {screen === "settings" && <SettingsScreen />}
        {screen === "lab" && <LabScreen />}
        {screen === "guide" && <GuideScreen kind="user" />}
        {screen === "tech" && <GuideScreen kind="tech" />}
        {screen === "qr" && <QrScreen />}
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-lg border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)]">
        <ul className="grid grid-cols-5">
          {TABS.map((tab) => {
            const active =
              screen === tab.id ||
              (tab.id === "settings" && ["contacts", "lab", "settings", "guide", "tech"].includes(screen));
            const Icon = tab.icon;
            return (
              <li key={tab.id}>
                <button
                  className={`flex h-14 w-full flex-col items-center justify-center gap-1 text-[11px] ${active ? "text-fg" : "text-muted"}`}
                  onClick={() => setScreen(tab.id)}
                >
                  <Icon className="size-4" />
                  {tr(tab.key)}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

function HomeScreen() {
  const tr = useT();
  const identity = useApp((s) => s.identity)!;
  const entries = useApp((s) => s.entries);
  const setScreen = useApp((s) => s.setScreen);
  const swarmEvent = useApp((s) => s.swarmEvent);
  const rows = counterparties(entries, identity.publicKeyHex);
  const nameOf = usePartyName();
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      <Panel>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">{tr("fingerprint")}</p>
            <p className="mt-1 font-mono text-lg">{identity.fingerprint}</p>
          </div>
          <Button
            size="icon"
            variant="secondary"
            onClick={() => {
              void copyText(identity.publicKeyHex).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1200);
              });
            }}
            aria-label={tr("copy")}
          >
            {copied ? <Check /> : <Copy />}
          </Button>
        </div>
        <p className="mt-3 text-[11px] text-subtle">
          {tr("fullKey")}: <Mono>{identity.publicKeyHex}</Mono>
        </p>
      </Panel>
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={() => setScreen("create")}>{tr("createAct")}</Button>
        <Button variant="secondary" onClick={() => setScreen("scan")}>
          <Camera className="size-4" /> {tr("scan")}
        </Button>
      </div>
      {rows.length === 0 ? (
        <Panel>
          <p className="text-sm text-muted">{tr("emptyHome")}</p>
        </Panel>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((row) => (
            <li key={row.publicKeyHex}>
              <Panel>
                <p className="text-sm">{nameOf(row.publicKeyHex)}</p>
                <p className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
                  <span>
                    {tr("youOwe")}
                    <span className="mt-1 block font-mono text-base tabular-nums">{row.youOwe}</span>
                  </span>
                  <span>
                    {tr("theyOwe")}
                    <span className="mt-1 block font-mono text-base tabular-nums">{row.theyOwe}</span>
                  </span>
                  <span>
                    {tr("net")}
                    <span className="mt-1 block font-mono text-base tabular-nums">{row.net}</span>
                  </span>
                </p>
              </Panel>
            </li>
          ))}
        </ul>
      )}
      <p className="text-[11px] text-subtle">
        {tr("swarm")}: {swarmEvent} · v{APP_VERSION}
      </p>
    </div>
  );
}

function CreateScreen() {
  const tr = useT();
  const contacts = useApp((s) => s.contacts);
  const identity = useApp((s) => s.identity)!;
  const createAct = useApp((s) => s.createAct);
  const setQr = useApp((s) => s.setQr);
  const setError = useApp((s) => s.setError);
  const others = contacts.filter((c) => c.publicKeyHex !== identity.publicKeyHex);
  const firstOther = others[0]?.publicKeyHex ?? "";
  const [to, setTo] = useState(firstOther);
  const [amount, setAmount] = useState("1");
  const [note, setNote] = useState("");
  useEffect(() => {
    if (!to && firstOther) setTo(firstOther);
  }, [to, firstOther]);
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const n = Number(amount);
        void createAct(to, n, note)
          .then((act) => {
            setQr({
              title: tr("showProposalQr"),
              text: encodeQrMessage("act-proposal", act),
              hint: "Контрагент сканирует этот QR и ставит M2",
            });
          })
          .catch((err: unknown) => setError(err instanceof Error ? err.message : "Ошибка"));
      }}
    >
      <button type="button" className="flex items-center gap-1 text-sm text-muted" onClick={() => useApp.getState().setScreen("home")}>
        <ChevronLeft className="size-4" /> {tr("back")}
      </button>
      <Field label={tr("counterpart")}>
        <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder={tr("pubkeyPlaceholder")} />
      </Field>
      {others.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {others.map((c) => (
            <button
              type="button"
              key={c.publicKeyHex}
              className="min-h-11 rounded-full border border-border px-3 text-xs"
              onClick={() => setTo(c.publicKeyHex)}
            >
              {c.displayName ?? c.fingerprint}
            </button>
          ))}
        </div>
      )}
      <Field label={tr("amount")}>
        <Input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))} />
      </Field>
      <Field label={tr("note")}>
        <Input maxLength={280} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <Button type="submit">{tr("signM1")}</Button>
    </form>
  );
}

function QrScreen() {
  const tr = useT();
  const qr = useApp((s) => s.qr);
  const setScreen = useApp((s) => s.setScreen);
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!qr) return;
    void qrSvgDataUrl(qr.text).then(setSrc);
  }, [qr]);
  if (!qr) return null;
  return (
    <div className="flex flex-col gap-4">
      <button className="flex items-center gap-1 text-sm text-muted" onClick={() => setScreen("home")}>
        <ChevronLeft className="size-4" /> {tr("back")}
      </button>
      <h2 className="font-serif text-2xl">{qr.title}</h2>
      {src && <img src={src} alt="QR" className="mx-auto w-full max-w-xs rounded-lg bg-paper p-3" />}
      <p className="text-sm text-muted">{qr.hint}</p>
      <Button variant="secondary" onClick={() => void copyText(qr.text)}>
        {tr("copyPayload")}
      </Button>
    </div>
  );
}

function ScanScreen() {
  const tr = useT();
  const ingest = useApp((s) => s.ingestQr);
  const confirmM2 = useApp((s) => s.confirmM2);
  const identity = useApp((s) => s.identity)!;
  const setQr = useApp((s) => s.setQr);
  const nameOf = usePartyName();
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingRef = useRef<Act | null>(null);
  const lastRaw = useRef("");
  const lastAt = useRef(0);
  const [manual, setManual] = useState("");
  const [pending, setPending] = useState<Act | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [fail, setFail] = useState(false);
  const [active, setActive] = useState(false);
  const [camKey, setCamKey] = useState(0);
  pendingRef.current = pending;

  async function handleRaw(value: string) {
    const now = Date.now();
    if (value === lastRaw.current && now - lastAt.current < 2500) return;
    lastRaw.current = value;
    lastAt.current = now;
    try {
      const res = await ingest(value);
      if (res.kind === "proposal") setPending(res.act);
      else {
        setFail(false);
        setMsg(tr("finalRecorded"));
      }
    } catch (err) {
      setFail(true);
      setMsg(err instanceof Error ? err.message : "QR отклонён");
    }
  }

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer = 0;
    let stopped = false;
    async function start() {
      try {
        stream = await openCameraStream();
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        video.setAttribute("playsinline", "true");
        video.muted = true;
        await video.play();
        setActive(true);
        setFail(false);
        const tick = async () => {
          if (stopped) return;
          if (pendingRef.current) {
            timer = window.setTimeout(() => void tick(), 400);
            return;
          }
          const value = await detectQrFromVideo(video);
          if (value) await handleRaw(value);
          timer = window.setTimeout(() => void tick(), 280);
        };
        timer = window.setTimeout(() => void tick(), 400);
      } catch (err) {
        setActive(false);
        setFail(true);
        setMsg(err instanceof Error ? err.message : "Нет доступа к камере");
      }
    }
    void start();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [ingest, camKey]);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">{tr("scanHint")}</p>
      <video
        ref={videoRef}
        className="aspect-[3/4] w-full rounded-lg bg-surface object-cover"
        playsInline
        muted
        autoPlay
      />
      {!active && <p className="text-xs text-muted">{tr("cameraStarting")}</p>}
      <div className="flex flex-col gap-2">
        {fail && (
          <Button
            variant="outline"
            onClick={() => {
              setFail(false);
              setMsg(null);
              setCamKey((k) => k + 1);
            }}
          >
            {tr("cameraRetry")}
          </Button>
        )}
        <Button
          variant="secondary"
          onClick={() => {
            void (async () => {
              try {
                const native = await captureQrPhoto();
                if (native) {
                  await handleRaw(native);
                  return;
                }
                fileRef.current?.click();
              } catch (err) {
                setFail(true);
                setMsg(err instanceof Error ? err.message : tr("scanPhoto"));
                fileRef.current?.click();
              }
            })();
          }}
        >
          {tr("scanPhoto")}
        </Button>
        <p className="text-xs text-muted">{tr("scanPhotoHint")}</p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            void detectQrFromBlob(file)
              .then((value) => {
                if (!value) throw new Error("QR на снимке не найден");
                return handleRaw(value);
              })
              .catch((err: unknown) => {
                setFail(true);
                setMsg(err instanceof Error ? err.message : "QR отклонён");
              });
          }}
        />
      </div>
      {msg && <p className={`text-sm ${fail ? "text-danger" : "text-ok"}`}>{msg}</p>}
      {pending && (
        <Panel>
          <p className="text-sm">
            {nameOf(bytesToHex(pending.from))} → {nameOf(bytesToHex(pending.to))}
          </p>
          <p className="mt-1 font-mono text-2xl tabular-nums">{pending.amount}</p>
          {pending.note && <p className="text-sm text-muted">{pending.note}</p>}
          {bytesToHex(pending.to) !== identity.publicKeyHex && (
            <p className="mt-2 text-sm text-danger">{tr("notForYou")}</p>
          )}
          <div className="mt-3 flex gap-2">
            <Button
              disabled={bytesToHex(pending.to) !== identity.publicKeyHex}
              onClick={() => {
                void confirmM2(pending)
                  .then((signed) => {
                    setPending(null);
                    setQr({
                      title: tr("showFinalQr"),
                      text: encodeQrMessage("act-final", signed),
                      hint: "Инициатор сканирует этот QR, чтобы записать M2 у себя",
                    });
                  })
                  .catch((err: unknown) => {
                    setFail(true);
                    setMsg(err instanceof Error ? err.message : "M2 отклонён");
                  });
              }}
            >
              {tr("accept")}
            </Button>
            <Button variant="outline" onClick={() => setPending(null)}>
              {tr("reject")}
            </Button>
          </div>
        </Panel>
      )}
      <Field label={tr("manual")}>
        <textarea
          className="min-h-24 rounded-md border border-border bg-surface p-3 font-mono text-xs"
          value={manual}
          onChange={(e) => setManual(e.target.value)}
        />
      </Field>
      <Button variant="secondary" onClick={() => void handleRaw(manual)}>
        {tr("parsePayload")}
      </Button>
    </div>
  );
}

const STATUS_KEY: Record<ActStatus, MsgKey> = {
  pending_m2: "pending",
  finalized: "finalized",
  partially_cleared: "partial",
  cleared: "cleared",
  archived: "archived",
};

function LedgerScreen() {
  const tr = useT();
  const entries = useApp((s) => s.entries);
  const selectHash = useApp((s) => s.selectHash);
  const nameOf = usePartyName();
  const [filter, setFilter] = useState<"all" | ActStatus>("all");
  const list = entries.filter((e) => filter === "all" || e.status === filter);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2 overflow-x-auto">
        {(["all", "pending_m2", "finalized", "partially_cleared", "cleared"] as const).map((f) => (
          <button
            key={f}
            className={`h-9 shrink-0 rounded-full border px-3 text-xs ${filter === f ? "border-fg" : "border-border text-muted"}`}
            onClick={() => setFilter(f)}
          >
            {f === "all" ? tr("all") : tr(STATUS_KEY[f])}
          </button>
        ))}
      </div>
      {list.length === 0 && <p className="text-sm text-muted">{tr("noActs")}</p>}
      <ul className="flex flex-col gap-2">
        {list.map((e) => {
          const d = describeAct(e.act);
          return (
            <li key={d.hashHex}>
              <button className="w-full text-left" onClick={() => selectHash(d.hashHex)}>
                <Panel>
                  <p className="text-sm">
                    {nameOf(d.fromHex)} → {nameOf(d.toHex)}
                  </p>
                  <p className="mt-1 font-mono text-xl tabular-nums">{e.remainingAmount || e.act.amount}</p>
                  <p className="mt-1 text-xs text-muted">
                    {tr(STATUS_KEY[e.status])} · {tr("remaining")} {e.remainingAmount}
                  </p>
                </Panel>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function DetailScreen() {
  const tr = useT();
  const identity = useApp((s) => s.identity)!;
  const entries = useApp((s) => s.entries);
  const selectedHash = useApp((s) => s.selectedHash);
  const setQr = useApp((s) => s.setQr);
  const selectHash = useApp((s) => s.selectHash);
  const nameOf = usePartyName();
  const entry = entries.find((e) => bytesToHex(e.act.hash) === selectedHash);
  if (!entry) {
    return (
      <Button variant="ghost" onClick={() => selectHash(null)}>
        {tr("back")}
      </Button>
    );
  }
  const d = describeAct(entry.act);
  return (
    <div className="flex flex-col gap-4">
      <button className="flex items-center gap-1 text-sm text-muted" onClick={() => selectHash(null)}>
        <ChevronLeft className="size-4" /> {tr("back")}
      </button>
      <h2 className="font-serif text-2xl">{tr(STATUS_KEY[entry.status])}</h2>
      <Panel>
        <p className="text-xs uppercase text-muted">{tr("from")}</p>
        <p className="mt-1 text-sm">{nameOf(d.fromHex)}</p>
        <Mono>{d.fromHex}</Mono>
        <p className="mt-3 text-xs uppercase text-muted">{tr("to")}</p>
        <p className="mt-1 text-sm">{nameOf(d.toHex)}</p>
        <Mono>{d.toHex}</Mono>
        <p className="mt-3 font-mono text-3xl tabular-nums">{entry.act.amount}</p>
        {entry.act.note && <p className="mt-2 text-sm text-muted">{entry.act.note}</p>}
        <p className="mt-3 text-xs uppercase text-muted">{tr("remaining")}</p>
        <p className="font-mono text-lg tabular-nums">{entry.remainingAmount}</p>
        <p className="mt-3 text-xs uppercase text-muted">{tr("hash")}</p>
        <Mono>{d.hashHex}</Mono>
        <p className="mt-3 text-xs uppercase text-muted">{tr("signatures")}</p>
        <p className="text-sm">M1 {d.hasM2 ? "+ M2" : ""}</p>
      </Panel>
      {!entry.act.sigM2 && bytesToHex(entry.act.from) === identity.publicKeyHex && (
        <Button
          onClick={() =>
            setQr({
              title: tr("showProposalQr"),
              text: encodeQrMessage("act-proposal", entry.act),
              hint: "Контрагент сканирует этот QR и ставит M2",
            })
          }
        >
          {tr("showProposalQr")}
        </Button>
      )}
      {entry.act.sigM2 && (
        <Button
          variant="secondary"
          onClick={() =>
            setQr({
              title: tr("showFinalQr"),
              text: encodeQrMessage("act-final", entry.act),
              hint: "Инициатор сканирует этот QR, чтобы записать M2 у себя",
            })
          }
        >
          {tr("showFinalQr")}
        </Button>
      )}
    </div>
  );
}

function ClearingScreen() {
  const tr = useT();
  const entries = useApp((s) => s.entries);
  const run = useApp((s) => s.runClearing);
  const last = useApp((s) => s.lastClearing);
  const setError = useApp((s) => s.setError);
  const nameOf = usePartyName();
  const cycles = useMemo(() => findCycles(entries), [entries]);
  const [picked, setPicked] = useState<ClearingCycle | null>(null);
  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-serif text-2xl">{tr("clearing")}</h2>
      {cycles.length === 0 && <p className="text-sm text-muted">{tr("noCycles")}</p>}
      <ul className="flex flex-col gap-2">
        {cycles.map((c) => (
          <li key={c.nodes.join(">")}>
            <button className="w-full text-left" onClick={() => setPicked(c)}>
              <Panel className={picked?.nodes.join(">") === c.nodes.join(">") ? "border-fg" : ""}>
                <p className="text-xs uppercase text-muted">
                  {tr("residual")} {c.residual} · {c.nodes.length} {tr("peers")}
                </p>
                <p className="mt-2 font-mono text-xs">{c.nodes.map((n) => nameOf(n)).join(" → ")}</p>
                <p className="mt-1 font-mono text-[10px] text-subtle">{c.nodes.map((n) => n.slice(0, 8)).join(" → ")}</p>
              </Panel>
            </button>
          </li>
        ))}
      </ul>
      {picked && (
        <Button
          onClick={() =>
            void run(picked)
              .then(() => setPicked(null))
              .catch((err: unknown) => setError(err instanceof Error ? err.message : "Клиринг отклонён"))
          }
        >
          {tr("confirmClear")} · {picked.residual}
        </Button>
      )}
      {last && last.length > 0 && (
        <Panel>
          <p className="text-xs uppercase text-muted">{tr("affected")}</p>
          {last.flatMap((r) =>
            r.applied.map((a) => (
              <p key={a.hashHex} className="mt-1 font-mono text-xs">
                {a.hashHex.slice(0, 12)} {a.before}→{a.after}
              </p>
            )),
          )}
        </Panel>
      )}
    </div>
  );
}

function ContactsScreen() {
  const tr = useT();
  const contacts = useApp((s) => s.contacts);
  const add = useApp((s) => s.addContact);
  const [pk, setPk] = useState("");
  const [name, setName] = useState("");
  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-serif text-2xl">{tr("contacts")}</h2>
      <Field label={tr("pubkeyPlaceholder")}>
        <Input value={pk} onChange={(e) => setPk(e.target.value)} />
      </Field>
      <Field label={tr("displayName")}>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Button
        onClick={() => {
          void add(pk, name || undefined).then(() => {
            setPk("");
            setName("");
          });
        }}
      >
        {tr("addContact")}
      </Button>
      <ul className="flex flex-col gap-2">
        {contacts.map((c) => (
          <li key={c.publicKeyHex}>
            <Panel>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm">{c.displayName ?? c.fingerprint}</p>
                  <Mono>{c.publicKeyHex}</Mono>
                </div>
                <button
                  type="button"
                  className="inline-flex size-10 shrink-0 items-center justify-center rounded-md border border-border"
                  aria-label={tr("copy")}
                  onClick={() => void copyText(c.publicKeyHex)}
                >
                  <Copy className="size-4" />
                </button>
              </div>
            </Panel>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SettingsScreen() {
  const tr = useT();
  const settings = useApp((s) => s.settings);
  const setTheme = useApp((s) => s.setTheme);
  const setLang = useApp((s) => s.setLang);
  const setAuto = useApp((s) => s.setAutoClear);
  const setScreen = useApp((s) => s.setScreen);
  const exportJson = useApp((s) => s.exportJson);
  const importJson = useApp((s) => s.importJson);
  const wipe = useApp((s) => s.wipe);
  const identity = useApp((s) => s.identity)!;
  const [showSeed, setShowSeed] = useState(false);
  const [ack, setAck] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-serif text-2xl">{tr("settings")}</h2>
      <Panel>
        <p className="text-xs uppercase text-muted">{tr("theme")}</p>
        <div className="mt-2 flex gap-2">
          {(["dark", "light", "system"] as const).map((th) => (
            <Button key={th} size="sm" variant={settings.theme === th ? "default" : "secondary" } onClick={() => void setTheme(th)}>
              {tr(th)}
            </Button>
          ))}
        </div>
      </Panel>
      <Panel>
        <p className="text-xs uppercase text-muted">{tr("language")}</p>
        <div className="mt-2 flex gap-2">
          <Button size="sm" variant={settings.lang === "ru" ? "default" : "secondary"} onClick={() => void setLang("ru")}>
            RU
          </Button>
          <Button size="sm" variant={settings.lang === "en" ? "default" : "secondary"} onClick={() => void setLang("en")}>
            EN
          </Button>
        </div>
      </Panel>
      <label className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3 text-sm">
        {tr("autoClear")}
        <input type="checkbox" checked={settings.autoClear} onChange={(e) => void setAuto(e.target.checked)} />
      </label>
      <Button variant="secondary" onClick={() => setScreen("contacts")}>
        <Users className="size-4" /> {tr("contacts")}
      </Button>
      <Button variant="secondary" onClick={() => setScreen("guide")}>
        {tr("userGuide")}
      </Button>
      <Button variant="secondary" onClick={() => setScreen("tech")}>
        {tr("techGuide")}
      </Button>
      <Button variant="secondary" onClick={() => setScreen("lab")}>
        <FlaskConical className="size-4" /> {tr("lab")}
      </Button>
      <DownloadButtons lang={settings.lang} />
      <Button
        variant="outline"
        onClick={() => {
          void exportJson().then((json) => {
            const blob = new Blob([json], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "ledger.json";
            a.click();
          });
        }}
      >
        {tr("exportLedger")}
      </Button>
      <label className="inline-flex h-11 items-center justify-center rounded-md border border-border text-sm">
        {tr("importLedger")}
        <input
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            void file.text().then((text) => importJson(text));
          }}
        />
      </label>
      <Panel>
        <p className="flex items-center gap-2 text-sm">
          <Shield className="size-4" /> {tr("exportSeed")}
        </p>
        <p className="mt-2 text-sm text-danger">{tr("dangerSeed")}</p>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />
          {tr("understand")}
        </label>
        <Button className="mt-3" variant="danger" disabled={!ack} onClick={() => setShowSeed(true)}>
          {tr("show")}
        </Button>
        {showSeed && (
          <ol className="mt-3 grid grid-cols-2 gap-1 font-mono text-sm">
            {identity.mnemonic.split(" ").map((w, i) => (
              <li key={i}>
                {i + 1}. {w}
              </li>
            ))}
          </ol>
        )}
      </Panel>
      <Button
        variant="outline"
        onClick={() => {
          if (confirm(tr("wipeConfirm"))) void wipe();
        }}
      >
        {tr("wipe")}
      </Button>
      <Panel>
        <p className="text-xs uppercase text-muted">{tr("version")}</p>
        <p className="mt-1 font-mono text-sm">
          {APP_VERSION} · {PROTOCOL_NAME}/{PROTOCOL_VERSION}
        </p>
        <p className="mt-3 text-xs uppercase text-muted">{tr("author")}</p>
        <p className="mt-1 text-sm">
          {AUTHOR.name} · {AUTHOR.phone}
        </p>
        <a className="mt-1 block text-sm underline" href={AUTHOR.telegram} target="_blank" rel="noreferrer">
          {AUTHOR.handle}
        </a>
        <p className="mt-3 text-xs uppercase text-muted">{tr("channel")}</p>
        <a className="mt-1 block text-sm underline" href={CHANNEL.url} target="_blank" rel="noreferrer">
          t.me · {tr("product")}
        </a>
        <p className="mt-3 text-xs uppercase text-muted">{tr("sourceRepo")}</p>
        <a className="mt-1 block text-sm underline" href={REPO.url} target="_blank" rel="noreferrer">
          github.com/stephanvoznyak-dot/spasibo-mnogo
        </a>
        <p className="mt-3 text-xs text-muted">{tr("disclaimer")}</p>
      </Panel>
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
