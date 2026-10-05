import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { qrSvgDataUrl } from "./qr-tools";
import { useApp } from "./store";
import { useT } from "./screens-helpers";

export function QrScreen() {
  const tr = useT();
  const qr = useApp((s) => s.qr);
  const setScreen = useApp((s) => s.setScreen);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!qr) return;
    void qrSvgDataUrl(qr.text).then(setDataUrl).catch(() => setDataUrl(null));
  }, [qr]);
  if (!qr) return null;
  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-serif text-2xl">{qr.title}</h2>
      <p className="text-sm text-muted">{qr.hint}</p>
      {dataUrl && (
        <img src={dataUrl} alt="QR" className="mx-auto w-64 rounded-lg border border-border bg-white p-2" />
      )}
      <Button variant="secondary" onClick={() => setScreen("home")}>
        {tr("ok")}
      </Button>
    </div>
  );
}
