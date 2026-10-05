import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const setPin = useApp((s) => s.setPin);
  const unlockWithPin = useApp((s) => s.unlockWithPin);
  const lockSession = useApp((s) => s.lockSession);
  const pinConfigured = useApp((s) => s.pinConfigured);
  const setError = useApp((s) => s.setError);

  const [pin, setPinVal] = useState("");
  const [pin2, setPin2] = useState("");
  const [hasPin, setHasPin] = useState(false);

  useEffect(() => {
    void pinConfigured().then(setHasPin).catch(() => setHasPin(false));
  }, [pinConfigured, identity?.locked]);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-serif text-2xl">{tr("settings")}</h2>

      <Panel>
        <p className="text-xs uppercase text-muted">{tr("pinSection")}</p>
        <p className="mt-1 text-xs text-muted">{tr("pinHint")}</p>
        {identity?.locked ? (
          <div className="mt-3 flex flex-col gap-2">
            <Input
              type="password"
              inputMode="numeric"
              placeholder={tr("pinUnlock")}
              value={pin}
              onChange={(e) => setPinVal(e.target.value)}
            />
            <Button
              onClick={() => {
                void unlockWithPin(pin)
                  .then(() => {
                    setPinVal("");
                    setHasPin(true);
                  })
                  .catch((err: unknown) => setError(err instanceof Error ? err.message : "PIN"));
              }}
            >
              {tr("pinUnlock")}
            </Button>
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            <Input
              type="password"
              inputMode="numeric"
              placeholder={tr("pinSet")}
              value={pin}
              onChange={(e) => setPinVal(e.target.value)}
            />
            <Input
              type="password"
              inputMode="numeric"
              placeholder={tr("pinConfirm")}
              value={pin2}
              onChange={(e) => setPin2(e.target.value)}
            />
            <Button
              onClick={() => {
                if (pin !== pin2) {
                  setError("PIN не совпал");
                  return;
                }
                void setPin(pin)
                  .then(() => {
                    setPinVal("");
                    setPin2("");
                    setHasPin(true);
                  })
                  .catch((err: unknown) => setError(err instanceof Error ? err.message : "PIN"));
              }}
            >
              {tr("pinSet")}
            </Button>
            {hasPin && (
              <Button
                variant="secondary"
                onClick={() => {
                  void lockSession().catch((err: unknown) =>
                    setError(err instanceof Error ? err.message : "PIN"),
                  );
                }}
              >
                {tr("pinLock")}
              </Button>
            )}
          </div>
        )}
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
            if (identity?.locked) {
              setError("Сначала разблокируйте PIN");
              return;
            }
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
          {tr("wipe")}
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
