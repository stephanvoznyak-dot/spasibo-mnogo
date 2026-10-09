import { Download, FileArchive, FileCode2, Smartphone } from "lucide-react";
import { t, type Lang } from "./i18n";
import { useApp } from "./store";
import { Panel } from "./screens-helpers";

const RELEASE = "https://github.com/stephanvoznyak-dot/spasibo-mnogo/releases/latest/download";
const REPO_ZIP = "https://github.com/stephanvoznyak-dot/spasibo-mnogo/archive/refs/heads/main.zip";
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

function saveBlob(buf: ArrayBuffer, filename: string) {
  const blob = new Blob([buf], { type: "application/octet-stream" });
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1500);
}

function openRemote(url: string) {
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

async function forceDownload(localUrl: string, remoteUrl: string, filename: string) {
  const remote = remoteUrl.endsWith("/normal-project-src.zip") ? REPO_ZIP : remoteUrl;
  try {
    const res = await fetch(localUrl);
    if (!res.ok) throw new Error("unavailable");
    const buf = await res.arrayBuffer();
    if (buf.byteLength < 64) throw new Error("empty");
    saveBlob(buf, filename);
  } catch {
    openRemote(remote);
  }
}

export function DownloadButtons({ lang, compact = false }: { lang?: Lang; compact?: boolean }) {
  const storeLang = useApp((s) => s.settings.lang);
  const resolved = lang ?? storeLang;
  const list = FILES;

  return (
    <div className="flex flex-col gap-2">
      {list.map((f) => {
        const Icon = f.icon;
        return (
          <button
            key={f.name}
            type="button"
            className={
              f.primary
                ? "inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-accent px-4 text-sm font-medium text-accent-fg"
                : "inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border px-4 text-sm"
            }
            onClick={() => {
              void forceDownload(f.local, f.remote, f.name);
            }}
          >
            <Icon className="size-4" /> {t(resolved, f.key)}
          </button>
        );
      })}
      {!compact && (
        <a
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-xs text-muted underline"
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
