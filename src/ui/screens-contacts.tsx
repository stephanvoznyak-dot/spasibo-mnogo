import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApp } from "./store";
import { Field, Panel, copyText, useT } from "./screens-helpers";

export function ContactsScreen() {
  const tr = useT();
  const contacts = useApp((s) => s.contacts);
  const add = useApp((s) => s.addContact);
  const [pk, setPk] = useState("");
  const [name, setName] = useState("");
  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-serif text-2xl">{tr("contacts")}</h2>
      <Field label={tr("pubkeyPlaceholder")}>
        <Input value={pk} onChange={(e) => setPk(e.target.value)} />
      </Field>
      <Field label={tr("displayName")}>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Button
        onClick={() => {
          void add(pk, name || undefined).then(() => {
            setPk("");
            setName("");
          });
        }}
      >
        {tr("addContact")}
      </Button>
      <ul className="flex flex-col gap-2">
        {contacts.map((c) => (
          <li key={c.publicKeyHex}>
            <Panel>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm">{c.displayName ?? c.fingerprint}</p>
                  <p className="mt-1 font-mono text-[11px] text-muted">{c.fingerprint}</p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => void copyText(c.publicKeyHex)}>
                  {tr("copyKey")}
                </Button>
              </div>
            </Panel>
          </li>
        ))}
      </ul>
    </div>
  );
}
