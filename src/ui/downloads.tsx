import { Download } from "lucide-react";
import { t, type Lang } from "./i18n";

async function forceDownload(url: string, filename: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Файл недоступен");
  const buf = await res.arrayBuffer();
  const blob = new Blob([buf], { type: "application/octet-stream" });
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}

const FILES = [
  { href: "/downloads/normal-project.apk", name: "normal-project.apk", key: "downloadApk" as const, primary: true },
  { href: "/downloads/normal-project.html", name: "normal-project.html", key: "downloadHtml" as const, primary: false },
  { href: "/downloads/normal-project-src.zip", name: "normal-project-src.zip", key: "downloadZip" as const, primary: false },
];

export function DownloadButtons({ lang }: { lang: Lang }) {
  return (
    <div className="flex flex-col gap-2">
      {FILES.map((f) => (
        <button
          key={f.name}
          type="button"
          className={
            f.primary
              ? "inline-flex h-11 items-center justify-center gap-2 rounded-md bg-accent px-4 text-sm font-medium text-accent-fg"
              : "inline-flex h-11 items-center justify-center gap-2 rounded-md border border-border px-4 text-sm"
          }
          onClick={() =>
            void forceDownload(f.href, f.name).catch((err: unknown) => {
              window.alert(err instanceof Error ? err.message : t(lang, "storageError"));
            })
          }
        >
          <Download className="size-4" /> {t(lang, f.key)}
        </button>
      ))}
    </div>
  );
}
