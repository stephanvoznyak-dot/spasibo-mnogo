import { useEffect, useState } from "react";
import { Download, FileArchive, FileCode2, Smartphone } from "lucide-react";
import { t, type Lang } from "./i18n";
import { useApp } from "./store";
import { Panel } from "./screens-helpers";

const RELEASE = "https://github.com/stephanvoznyak-dot/spasibo-mnogo/releases/latest/download";
const RELEASES_PAGE = "https://github.com/stephanvoznyak-dot/spasibo-mnogo/releases/latest";
const REPO_PAGE = "https://github.com/stephanvoznyak-dot/spasibo-mnogo";

type FileKey = "downloadHtml" | "downloadApk" | "downloadZip" | "downloadIos";

type FileSpec = {
  local: string;
  remote: string;
  name: string;
  key: FileKey;
  icon: typeof Download;
  primary?: boolean;
};

const FILES: FileSpec[] = [
  {
    local: "/downloads/normal-project.html",
    remote: `${RELEASE}/normal-project.html`,
    name: "normal-project.html",
    key: "downloadHtml",
    icon: FileCode2,
    primary: true,
  },
  {
    local: "/downloads/normal-project.apk",
    remote: `${RELEASE}/normal-project.apk`,
    name: "normal-project.apk",
    key: "downloadApk",
    icon: Smartphone,
  },
  {
    local: "/downloads/normal-project-ios.zip",
    remote: `${RELEASE}/normal-project-ios.zip`,
    name: "normal-project-ios.zip",
    key: "downloadIos",
    icon: FileArchive,
  },
  {
    local: "/downloads/normal-project-src.zip",
    remote: `${RELEASE}/normal-project-src.zip`,
    name: "normal-project-src.zip",
    key: "downloadZip",
    icon: FileArchive,
  },
];

const MIME: Record<string, string> = {
  ".apk": "application/vnd.android.package-archive",
  ".zip": "application/zip",
  ".html": "text/html",
};

function mimeOf(name: string) {
  const dot = name.lastIndexOf(".");
  return MIME[dot >= 0 ? name.slice(dot).toLowerCase() : ""] ?? "application/octet-stream";
}

function isIos() {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

/** Preview frame, iPhone and the installed app cannot save via <a download>. */
function useHandoff() {
  const [handoff, setHandoff] = useState(true);
  useEffect(() => {
    const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    let framed = false;
    try {
      framed = window.self !== window.top;
    } catch {
      framed = true;
    }
    const { protocol, hostname } = window.location;
    const packaged =
      Boolean(cap?.isNativePlatform?.()) ||
      protocol === "file:" ||
      protocol === "capacitor:" ||
      protocol === "ionic:" ||
      (protocol === "https:" && (hostname === "localhost" || hostname === "127.0.0.1"));
    setHandoff(isIos() || framed || packaged);
  }, []);
  return handoff;
}

export function DownloadButtons({ lang, compact = false }: { lang?: Lang; compact?: boolean }) {
  const storeLang = useApp((s) => s.settings.lang);
  const resolved = lang ?? storeLang;
  const handoff = useHandoff();
  const [note, setNote] = useState<string | null>(null);
  const [ready, setReady] = useState<{ name: string; file: File } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function saveHandoff(f: FileSpec) {
    if (ready?.name === f.name) {
      try {
        await navigator.share({ files: [ready.file], title: f.name });
        setNote(t(resolved, "downloadSaved"));
        setReady(null);
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
      window.location.assign(f.remote);
      return;
    }

    // window.open on iPhone replaces the preview with a blank page. Skip it.
    if (!isIos()) {
      const popup = window.open(f.remote, "_blank", "noopener,noreferrer");
      if (popup) {
        setNote(t(resolved, "downloadStarted"));
        return;
      }
    }

    setBusy(f.name);
    setNote(t(resolved, "downloadTapAgain"));
    try {
      const res = await fetch(f.local);
      if (!res.ok) throw new Error("missing");
      const file = new File([await res.arrayBuffer()], f.name, { type: mimeOf(f.name) });
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: f.name });
          setNote(t(resolved, "downloadSaved"));
          return;
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") return;
          setReady({ name: f.name, file });
          setNote(t(resolved, "downloadTapAgain"));
          return;
        }
      }
      setNote(t(resolved, "downloadBlocked"));
      window.location.assign(f.remote);
    } catch {
      setNote(t(resolved, "downloadBlocked"));
      window.location.assign(f.remote);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {FILES.map((f) => {
        const Icon = f.icon;
        const label = ready?.name === f.name ? t(resolved, "downloadSaveNow") : t(resolved, f.key);
        return (
          <a
            key={f.name}
            href={handoff ? f.remote : f.local}
            {...(handoff
              ? { target: "_blank", rel: "noopener noreferrer" }
              : { download: f.name })}
            className={
              f.primary
                ? "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md bg-accent px-4 text-center text-sm font-medium text-accent-fg"
                : "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-border px-4 text-center text-sm"
            }
            aria-busy={busy === f.name}
            onClick={(event) => {
              if (!handoff) return;
              event.preventDefault();
              void saveHandoff(f);
            }}
          >
            <Icon className="size-4 shrink-0" /> {label}
          </a>
        );
      })}
      <p className="text-[11px] leading-snug text-muted">{note ?? t(resolved, "downloadHint")}</p>
      <p className="text-[11px] leading-snug text-muted">{t(resolved, "downloadDebug")}</p>
      <a
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-xs text-muted underline"
        href={RELEASES_PAGE}
        target="_blank"
        rel="noreferrer"
      >
        {t(resolved, "releases")} · GitHub
      </a>
      {!compact && (
        <a
          className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md px-4 text-xs text-muted underline"
          href={REPO_PAGE}
          target="_blank"
          rel="noreferrer"
        >
          {t(resolved, "sourceRepo")} · GitHub
        </a>
      )}
    </div>
  );
}

export function DownloadPanel({ compact = false }: { compact?: boolean }) {
  const lang = useApp((s) => s.settings.lang);
  return (
    <Panel>
      <p className="text-xs uppercase tracking-wide text-muted">{t(lang, "downloads")}</p>
      <div className="mt-3">
        <DownloadButtons lang={lang} compact={compact} />
      </div>
    </Panel>
  );
}
