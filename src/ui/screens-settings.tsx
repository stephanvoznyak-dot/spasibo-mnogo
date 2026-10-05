import { Button } from "@/components/ui/button";
import { APP_PRODUCT, APP_VERSION, AUTHOR, CHANNEL, REPO } from "@/version";
import { DownloadButtons } from "./downloads";
import { useApp } from "./store";
import { Panel, useT } from "./screens-helpers";

export function SettingsScreen() {
  const tr = useT();
  const settings = useApp((s) => s.settings);
  const setLang = useApp((s) => s.setLang);
  const setTheme = useApp((s) => s.setTheme);
  const setAutoClear = useApp((s) => s.setAutoClear);
  const setScreen = useApp((s) => s.setScreen);
  const exportJson = useApp((s) => s.exportJson);
  const importJson = useApp((s) => s.importJson);
  const wipe = useApp((s) => s.wipe);
  const identity = useApp((s) => s.identity);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-serif text-2xl">{tr("settings")}</h2>

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

      <Panel>
        <p className="text-xs uppercase text-muted">{tr("theme")}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {(["system", "light", "dark"] as const).map((th) => (
            <Button
              key={th}
              size="sm"
              variant={settings.theme === th ? "default" : "secondary"}
              onClick={() => void setTheme(th)}
            >
              {th}
            </Button>
          ))}
        </div>
      </Panel>

      <Panel>
        <label className="flex items-center justify-between gap-3 text-sm">
          <span>{tr("autoClear")}</span>
          <input
            type="checkbox"
            checked={settings.autoClear}
            onChange={(e) => void setAutoClear(e.target.checked)}
          />
        </label>
      </Panel>

      <div className="flex flex-col gap-2">
        <Button variant="secondary" onClick={() => setScreen("contacts")}>
          {tr("contacts")}
        </Button>
        <Button variant="secondary" onClick={() => setScreen("lab")}>
          {tr("lab")}
        </Button>
        <Button variant="secondary" onClick={() => setScreen("guide")}>
          {tr("userGuide")}
        </Button>
        <Button variant="secondary" onClick={() => setScreen("tech")}>
          {tr("techGuide")}
        </Button>
      </div>

      <Panel>
        <p className="text-xs uppercase text-muted">{tr("downloads")}</p>
        <div className="mt-2">
          <DownloadButtons />
        </div>
      </Panel>

      <div className="flex flex-col gap-2">
        <Button
          variant="secondary"
          onClick={() => {
            void exportJson().then((json) => {
              void navigator.clipboard.writeText(json);
            });
          }}
        >
          {tr("exportLedger")}
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            const raw = window.prompt("JSON");
            if (raw) void importJson(raw);
          }}
        >
          {tr("importLedger")}
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            if (window.confirm(tr("dangerSeed"))) {
              window.alert(identity?.mnemonic ?? "");
            }
          }}
        >
          {tr("exportSeed")}
        </Button>
        <Button
          variant="destructive"
          onClick={() => {
            if (window.confirm("Wipe all data?")) void wipe();
          }}
        >
          {tr("wipe") as string}
        </Button>
      </div>

      <Panel>
        <p className="text-xs text-muted">
          {APP_PRODUCT} v{APP_VERSION}
        </p>
        <p className="mt-1 text-xs text-muted">
          {AUTHOR.name} · {AUTHOR.phone}
        </p>
        <a className="mt-1 block text-xs text-muted underline" href={CHANNEL.url} target="_blank" rel="noreferrer">
          {tr("channel")}
        </a>
        <a className="mt-1 block text-xs text-muted underline" href={REPO.url} target="_blank" rel="noreferrer">
          {tr("sourceRepo")}
        </a>
      </Panel>
    </div>
  );
}
