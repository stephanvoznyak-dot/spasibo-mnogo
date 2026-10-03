import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { techGuide, userGuide } from "./guides";
import { t, type Lang } from "./i18n";
import { useApp } from "./store";

function useLang(): Lang {
  return useApp((s) => s.settings.lang);
}

export function GuideScreen({ kind }: { kind: "user" | "tech" }) {
  const lang = useLang();
  const setScreen = useApp((s) => s.setScreen);
  const sections = kind === "user" ? userGuide(lang) : techGuide(lang);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Button size="icon" variant="ghost" onClick={() => setScreen("settings")} aria-label={t(lang, "back")}>
          <ChevronLeft className="size-5" />
        </Button>
        <h2 className="font-serif text-2xl">{kind === "user" ? t(lang, "userGuide") : t(lang, "techGuide")}</h2>
      </div>
      {sections.map((s) => (
        <section key={s.title} className="rounded-lg border border-border bg-surface p-4">
          <p className="text-[11px] uppercase tracking-wide text-muted">{s.kicker}</p>
          <h3 className="mt-1 font-serif text-lg leading-snug">{s.title}</h3>
          {s.body.map((p) => (
            <p key={p} className="mt-2 text-sm leading-relaxed text-muted">
              {p}
            </p>
          ))}
        </section>
      ))}
    </div>
  );
}
