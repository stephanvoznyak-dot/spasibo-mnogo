import { Button } from "@/components/ui/button";
import { bytesToHex } from "@/crypto/bytes";
import { encodeQrMessage } from "@/protocol/qr-messages";
import { describeAct, useApp } from "./store";
import { Mono, Panel, usePartyName, useT } from "./screens-helpers";

export function DetailScreen() {
  const tr = useT();
  const hash = useApp((s) => s.selectedHash);
  const entries = useApp((s) => s.entries);
  const setQr = useApp((s) => s.setQr);
  const selectHash = useApp((s) => s.selectHash);
  const nameOf = usePartyName();
  const entry = entries.find((e) => bytesToHex(e.act.hash) === hash);
  if (!entry || !hash) {
    return (
      <div className="flex flex-col gap-4">
        <Button variant="ghost" onClick={() => selectHash(null)}>
          {tr("back")}
        </Button>
        <p className="text-sm text-muted">{tr("noActs")}</p>
      </div>
    );
  }
  const d = describeAct(entry.act);
  return (
    <div className="flex flex-col gap-4">
      <Button variant="ghost" className="self-start" onClick={() => selectHash(null)}>
        {tr("back")}
      </Button>
      <Panel>
        <p className="text-xs uppercase text-muted">{tr("hash")}</p>
        <Mono>{d.hashHex}</Mono>
        <p className="mt-3 text-xs uppercase text-muted">{tr("from")}</p>
        <p className="text-sm">{nameOf(d.fromHex)}</p>
        <p className="mt-2 text-xs uppercase text-muted">{tr("to")}</p>
        <p className="text-sm">{nameOf(d.toHex)}</p>
        <p className="mt-2 text-xs uppercase text-muted">{tr("amount")}</p>
        <p className="font-mono text-lg">{d.amount}</p>
        <p className="mt-2 text-xs uppercase text-muted">{tr("remaining")}</p>
        <p className="font-mono text-lg">{entry.remainingAmount}</p>
        {d.note && (
          <>
            <p className="mt-2 text-xs uppercase text-muted">{tr("note")}</p>
            <p className="text-sm">{d.note}</p>
          </>
        )}
        <p className="mt-2 text-xs uppercase text-muted">{tr("signatures")}</p>
        <p className="text-sm">{d.hasM2 ? "M1 + M2" : "M1"}</p>
      </Panel>
      {!d.hasM2 && (
        <Button
          onClick={() =>
            setQr({
              title: tr("showProposalQr"),
              text: encodeQrMessage("act-proposal", entry.act),
              hint: "Контрагент сканирует этот QR и ставит M2",
            })
          }
        >
          {tr("showProposalQr")}
        </Button>
      )}
      {d.hasM2 && (
        <Button
          onClick={() =>
            setQr({
              title: tr("showFinalQr"),
              text: encodeQrMessage("act-final", entry.act),
              hint: "Инициатор сканирует этот QR, чтобы записать M2 у себя",
            })
          }
        >
          {tr("showFinalQr")}
        </Button>
      )}
    </div>
  );
}
