import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { encodeQrMessage } from "@/protocol/qr-messages";
import { useApp } from "./store";
import { Field, useT } from "./screens-helpers";

export function CreateScreen() {
  const tr = useT();
  const contacts = useApp((s) => s.contacts);
  const identity = useApp((s) => s.identity)!;
  const createAct = useApp((s) => s.createAct);
  const setQr = useApp((s) => s.setQr);
  const setError = useApp((s) => s.setError);
  const others = contacts.filter((c) => c.publicKeyHex !== identity.publicKeyHex);
  const firstOther = others[0]?.publicKeyHex ?? "";
  const [to, setTo] = useState(firstOther);
  const [amount, setAmount] = useState("1");
  const [note, setNote] = useState("");
  useEffect(() => {
    if (!to && firstOther) setTo(firstOther);
  }, [to, firstOther]);
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const n = Number(amount);
        void createAct(to, n, note)
          .then((act) => {
            setQr({
              title: tr("showProposalQr"),
              text: encodeQrMessage("act-proposal", act),
              hint: "Контрагент сканирует этот QR и ставит M2",
            });
          })
          .catch((err: unknown) => setError(err instanceof Error ? err.message : "Ошибка"));
      }}
    >
      <button
        type="button"
        className="flex items-center gap-1 text-sm text-muted"
        onClick={() => useApp.getState().setScreen("home")}
      >
        <ChevronLeft className="size-4" /> {tr("back")}
      </button>
      <Field label={tr("counterpart")}>
        <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder={tr("pubkeyPlaceholder")} />
      </Field>
      {others.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {others.map((c) => (
            <button
              type="button"
              key={c.publicKeyHex}
              className="min-h-11 rounded-full border border-border px-3 text-xs"
              onClick={() => setTo(c.publicKeyHex)}
            >
              {c.displayName ?? c.fingerprint}
            </button>
          ))}
        </div>
      )}
      <Field label={tr("amount")}>
        <Input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))} />
      </Field>
      <Field label={tr("note")}>
        <Input maxLength={280} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <Button type="submit">{tr("signM1")}</Button>
    </form>
  );
}
