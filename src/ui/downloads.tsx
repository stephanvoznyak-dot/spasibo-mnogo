import { useState } from "react";
import { Download, FileArchive, FileCode2, Smartphone, X } from "lucide-react";
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

function openOutside(url: string) {
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  return Boolean(opened);
}

export function DownloadButtons({ lang, compact = false }: { lang?: Lang; compact?: boolean }) {
  const storeLang = useApp((s) => s.settings.lang);
  const resolved = lang ?? storeLang;
  const [note, setNote] = useState<string | null>(null);

  function save(event: { preventDefault: () => void }, file: FileSpec) {
    event.preventDefault();
    const local = new URL(file.local, window.location.href).href;
    if (openOutside(local) || openOutside(file.remote)) {
      setNote(t(resolved, "downloadStarted"));
      return;
    }
    void navigator.clipboard.writeText(file.remote).then(
      () => setNote(t(resolved, "downloadCopied")),
      () => setNote(t(resolved, "downloadCopyFail")),
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] leading-snug text-muted">{note ?? t(resolved, "downloadHint")}</p>
      {FILES.map((file) => {
        const Icon = file.icon;
        return (
          <a
            key={file.name}
            href={file.local}
            download={file.name}
            target="_blank"
            rel="noopener noreferrer"
            className={
              file.primary
                ? "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md bg-accent px-4 text-center text-sm font-medium text-accent-fg"
                : "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-border px-4 text-center text-sm"
            }
            onClick={(event) => save(event, file)}
          >
            <Icon className="size-4 shrink-0" /> {t(resolved, file.key)}
          </a>
        );
      })}
      <p className="text-[11px] leading-snug text-muted">{t(resolved, "downloadDebug")}</p>
      {!compact && (
        <a
          href={RELEASES_PAGE}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-md px-4 text-xs text-muted underline"
        >
          {t(resolved, "releases")} · GitHub
        </a>
      )}
      {!compact && (
        <a
          href={REPO_PAGE}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-9 cursor-pointer items-center justify-center rounded-md px-4 text-xs text-muted underline"
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

export function DownloadSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const lang = useApp((s) => s.settings.lang);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/55" onClick={onClose}>
      <div
        className="max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-border bg-surface px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-lg"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-label={t(lang, "download")}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-sm font-medium">{t(lang, "download")}</p>
          <button
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-md border border-border"
            onClick={onClose}
            aria-label={t(lang, "back")}
          >
            <X className="size-4" />
          </button>
        </div>
        <DownloadButtons lang={lang} compact />
      </div>
    </div>
  );
}
