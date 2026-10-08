import { useState } from "react";
import { Camera, Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_VERSION } from "@/version";
import { counterparties, useApp } from "./store";
import { Mono, Panel, copyText, usePartyName, useT } from "./screens-helpers";
import { DownloadPanel } from "./downloads";

export function HomeScreen() {
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
      <DownloadPanel compact />
    </div>
  );
}
