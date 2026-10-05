import { bytesToHex } from "@/crypto/bytes";
import { useApp } from "./store";
import { Panel, usePartyName, useT } from "./screens-helpers";

export function LedgerScreen() {
  const tr = useT();
  const entries = useApp((s) => s.entries);
  const selectHash = useApp((s) => s.selectHash);
  const nameOf = usePartyName();
  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-serif text-2xl">{tr("ledger")}</h2>
      {entries.length === 0 && <p className="text-sm text-muted">{tr("noActs")}</p>}
      <ul className="flex flex-col gap-2">
        {entries.map((e) => {
          const h = bytesToHex(e.act.hash);
          const statusKey =
            e.status === "pending_m2"
              ? "pending"
              : e.status === "partially_cleared"
                ? "partial"
                : e.status;
          return (
            <li key={h}>
              <button className="w-full text-left" onClick={() => selectHash(h)}>
                <Panel>
                  <p className="text-xs uppercase text-muted">{tr(statusKey as "pending")}</p>
                  <p className="mt-1 text-sm">
                    {nameOf(bytesToHex(e.act.from))} → {nameOf(bytesToHex(e.act.to))}
                  </p>
                  <p className="mt-1 font-mono text-base tabular-nums">
                    {e.status === "pending_m2" ? e.act.amount : e.remainingAmount}
                    {e.status !== "pending_m2" && e.remainingAmount !== e.act.amount
                      ? ` / ${e.act.amount}`
                      : ""}
                  </p>
                </Panel>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
