import { useEffect } from "react";
import { BookOpen, GitBranch, Home, Radio, ScanLine, Settings } from "lucide-react";
import { APP_PRODUCT } from "@/version";
import { GuideScreen } from "./guide-screens";
import { LabScreen } from "./lab-screen";
import { type MsgKey } from "./i18n";
import { useApp, type Screen } from "./store";
import { useT } from "./screens-helpers";
import { BootScreen, Onboarding } from "./screens-onboarding";
import { HomeScreen } from "./screens-home";
import { CreateScreen } from "./screens-create";
import { QrScreen } from "./screens-qr";
import { ScanScreen } from "./screens-scan";
import { LedgerScreen } from "./screens-ledger";
import { DetailScreen } from "./screens-detail";
import { ClearingScreen } from "./screens-clearing";
import { ContactsScreen } from "./screens-contacts";
import { SettingsScreen } from "./screens-settings";

export { BootScreen, Onboarding };

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
