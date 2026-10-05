import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { findCycles } from "@/protocol/clearing";
import type { ClearingCycle } from "@/protocol/types";
import { useApp } from "./store";
import { Panel, usePartyName, useT } from "./screens-helpers";

export function ClearingScreen() {
  const tr = useT();
  const entries = useApp((s) => s.entries);
  const run = useApp((s) => s.runClearing);
  const last = useApp((s) => s.lastClearing);
  const setError = useApp((s) => s.setError);
  const nameOf = usePartyName();
  const cycles = useMemo(() => findCycles(entries), [entries]);
  const [picked, setPicked] = useState<ClearingCycle | null>(null);
  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-serif text-2xl">{tr("clearing")}</h2>
      <Panel>
        <p className="text-xs text-muted">{tr("clearingLocalHint")}</p>
      </Panel>
      {cycles.length === 0 && <p className="text-sm text-muted">{tr("noCycles")}</p>}
      <ul className="flex flex-col gap-2">
        {cycles.map((c) => (
          <li key={c.nodes.join(">")}>
            <button className="w-full text-left" onClick={() => setPicked(c)}>
              <Panel className={picked?.nodes.join(">") === c.nodes.join(">") ? "border-fg" : ""}>
                <p className="text-xs uppercase text-muted">
                  {tr("residual")} {c.residual} · {c.nodes.length} {tr("peers")}
                </p>
                <p className="mt-2 font-mono text-xs">{c.nodes.map((n) => nameOf(n)).join(" → ")}</p>
                <p className="mt-1 font-mono text-[10px] text-subtle">
                  {c.nodes.map((n) => n.slice(0, 8)).join(" → ")}
                </p>
              </Panel>
            </button>
          </li>
        ))}
      </ul>
      {picked && (
        <Button
          onClick={() =>
            void run(picked)
              .then(() => setPicked(null))
              .catch((err: unknown) => setError(err instanceof Error ? err.message : "Клиринг отклонён"))
          }
        >
          {tr("confirmClear")} · {picked.residual}
        </Button>
      )}
      {last && last.length > 0 && (
        <Panel>
          <p className="text-xs uppercase text-muted">{tr("affected")}</p>
          <p className="mt-1 text-xs text-muted">{tr("clearingLocalHint")}</p>
          {last.map((r, i) => (
            <p key={i} className="mt-1 font-mono text-xs">
              residual {r.residual}
              {r.signed ? " · signed" : " · unsigned"}
              {r.authorHex ? ` · ${r.authorHex.slice(0, 8)}…` : ""}
            </p>
          ))}
          {last.flatMap((r) =>
            r.applied.map((a) => (
              <p key={a.hashHex} className="mt-1 font-mono text-xs">
                {a.hashHex.slice(0, 12)} {a.before}→{a.after}
              </p>
            )),
          )}
        </Panel>
      )}
    </div>
  );
}
