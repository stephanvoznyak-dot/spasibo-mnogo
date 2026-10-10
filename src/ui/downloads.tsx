import { useEffect, useState } from "react";
import { Download, FileArchive, FileCode2, Smartphone } from "lucide-react";
import { t, type Lang } from "./i18n";
import { useApp } from "./store";
import { Panel } from "./screens-helpers";

const RELEASE = "https://github.com/stephanvoznyak-dot/spasibo-mnogo/releases/latest/download";
const RELEASES_PAGE = "https://github.com/stephanvoznyak-dot/spasibo-mnogo/releases/latest";
const REPO_PAGE = "https://github.com/stephanvoznyak-dot/spasibo-mnogo";

type FileSpec = {
  local: string;
  remote: string;
  name: string;
  key: "downloadApk" | "downloadHtml" | "downloadZip" | "downloadIos";
  icon: typeof Download;
  primary?: boolean;
};

const FILES: FileSpec[] = [
  {
    local: "/downloads/normal-project.apk",
    remote: `${RELEASE}/normal-project.apk`,
    name: "normal-project.apk",
    key: "downloadApk",
    icon: Smartphone,
    primary: true,
  },
  {
    local: "/downloads/normal-project.html",
    remote: `${RELEASE}/normal-project.html`,
    name: "normal-project.html",
    key: "downloadHtml",
    icon: FileCode2,
  },
  {
    local: "/downloads/normal-project-src.zip",
    remote: `${RELEASE}/normal-project-src.zip`,
    name: "normal-project-src.zip",
    key: "downloadZip",
    icon: FileArchive,
  },
  {
    local: "/downloads/normal-project-ios.zip",
    remote: `${RELEASE}/normal-project-ios.zip`,
    name: "normal-project-ios.zip",
    key: "downloadIos",
    icon: FileArchive,
  },
];

/** APK / file:// / Capacitor do not ship public/downloads — send those to GitHub. */
function useRemoteDownloads() {
  const [remote, setRemote] = useState(false);
  useEffect(() => {
    const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    const { protocol, hostname } = window.location;
    const packaged =
      Boolean(cap?.isNativePlatform?.()) ||
      protocol === "file:" ||
      protocol === "capacitor:" ||
      protocol === "ionic:" ||
      (protocol === "https:" && (hostname === "localhost" || hostname === "127.0.0.1"));
    setRemote(packaged);
  }, []);
  return remote;
}

export function DownloadButtons({ lang, compact = false }: { lang?: Lang; compact?: boolean }) {
  const storeLang = useApp((s) => s.settings.lang);
  const resolved = lang ?? storeLang;
  const remoteMode = useRemoteDownloads();

  return (
    <div className="flex flex-col gap-2">
      {FILES.map((f) => {
        const Icon = f.icon;
        const href = remoteMode ? f.remote : f.local;
        const external = href.startsWith("http");
        return (
          <a
            key={f.name}
            href={href}
            {...(external
              ? { target: "_blank", rel: "noopener noreferrer" }
              : { download: f.name })}
            className={
              f.primary
                ? "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md bg-accent px-4 text-sm font-medium text-accent-fg"
                : "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-border px-4 text-sm"
            }
          >
            <Icon className="size-4" /> {t(resolved, f.key)}
          </a>
        );
      })}
      <p className="text-[11px] leading-snug text-muted">{t(resolved, "downloadDebug")}</p>
      {!compact && (
        <a
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-xs text-muted underline"
          href={RELEASES_PAGE}
          target="_blank"
          rel="noreferrer"
        >
          {t(resolved, "releases")} · GitHub
        </a>
      )}
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
      <p className="mt-1 text-sm text-muted">{t(lang, "downloadHint")}</p>
      <div className="mt-3">
        <DownloadButtons lang={lang} compact={compact} />
      </div>
    </Panel>
  );
}
