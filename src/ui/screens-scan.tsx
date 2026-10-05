import { useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { bytesEqual, bytesToHex } from "@/crypto/bytes";
import { encodeQrMessage } from "@/protocol/qr-messages";
import type { Act } from "@/protocol/types";
import {
  captureQrPhoto,
  detectQrFromBlob,
  detectQrFromVideo,
  openCameraStream,
} from "./qr-tools";
import { useApp } from "./store";
import { Panel, usePartyName, useT } from "./screens-helpers";

export function ScanScreen() {
  const tr = useT();
  const ingest = useApp((s) => s.ingestQr);
  const confirmM2 = useApp((s) => s.confirmM2);
  const identity = useApp((s) => s.identity)!;
  const setQr = useApp((s) => s.setQr);
  const setError = useApp((s) => s.setError);
  const nameOf = usePartyName();
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [manual, setManual] = useState("");
  const [pending, setPending] = useState<Act | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [camKey, setCamKey] = useState(0);
  const lastRaw = useRef("");
  const lastAt = useRef(0);

  async function handleRaw(value: string) {
    const now = Date.now();
    if (value === lastRaw.current && now - lastAt.current < 2500) return;
    lastRaw.current = value;
    lastAt.current = now;
    try {
      const res = await ingest(value);
      if (res.kind === "proposal") setPending(res.act);
      else {
        setMsg(tr("finalRecorded"));
        setPending(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка QR");
    }
  }

  useEffect(() => {
    let stream: MediaStream | null = null;
    let alive = true;
    let timer: number | null = null;
    void (async () => {
      try {
        stream = await openCameraStream();
        if (!alive || !videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        const tick = async () => {
          if (!alive || !videoRef.current) return;
          try {
            const code = await detectQrFromVideo(videoRef.current);
            if (code) await handleRaw(code);
          } catch {
            /* ignore */
          }
          timer = window.setTimeout(() => void tick(), 400);
        };
        void tick();
      } catch {
        setMsg(tr("cameraStarting"));
      }
    })();
    return () => {
      alive = false;
      if (timer != null) window.clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [camKey]);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-serif text-2xl">{tr("scan")}</h2>
      <p className="text-sm text-muted">{tr("scanHint")}</p>
      <video ref={videoRef} className="w-full rounded-lg border border-border bg-black" playsInline muted />
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => setCamKey((k) => k + 1)}>
          <Camera className="size-4" /> {tr("cameraRetry")}
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            void captureQrPhoto()
              .then(async (blob) => {
                if (!blob) return;
                const code = await detectQrFromBlob(blob);
                if (code) await handleRaw(code);
              })
              .catch((err: unknown) => setError(err instanceof Error ? err.message : "Ошибка"));
          }}
        >
          {tr("scanPhoto")}
        </Button>
        <Button variant="secondary" onClick={() => fileRef.current?.click()}>
          {tr("scanPhoto")}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            void detectQrFromBlob(f)
              .then(async (code) => {
                if (code) await handleRaw(code);
              })
              .catch((err: unknown) => setError(err instanceof Error ? err.message : "Ошибка"));
          }}
        />
      </div>
      <Panel>
        <p className="text-xs uppercase text-muted">{tr("manual")}</p>
        <textarea
          className="mt-2 min-h-24 w-full rounded-md border border-border bg-bg p-2 font-mono text-xs"
          value={manual}
          onChange={(e) => setManual(e.target.value)}
        />
        <Button className="mt-2" size="sm" onClick={() => void handleRaw(manual)}>
          {tr("parsePayload")}
        </Button>
      </Panel>
      {msg && <p className="text-sm text-muted">{msg}</p>}
      {pending && (
        <Panel>
          <p className="text-sm">
            {nameOf(bytesToHex(pending.from))} → {nameOf(bytesToHex(pending.to))} · {pending.amount}
          </p>
          {!bytesEqual(pending.to, identity.publicKey) && (
            <p className="mt-2 text-sm text-danger">{tr("notForYou")}</p>
          )}
          <div className="mt-3 flex gap-2">
            <Button
              disabled={!bytesEqual(pending.to, identity.publicKey)}
              onClick={() => {
                void confirmM2(pending)
                  .then((signed) => {
                    setPending(null);
                    setQr({
                      title: tr("showFinalQr"),
                      text: encodeQrMessage("act-final", signed),
                      hint: "Инициатор сканирует этот QR",
                    });
                  })
                  .catch((err: unknown) => setError(err instanceof Error ? err.message : "Ошибка M2"));
              }}
            >
              {tr("accept")}
            </Button>
            <Button variant="secondary" onClick={() => setPending(null)}>
              {tr("reject")}
            </Button>
          </div>
        </Panel>
      )}
    </div>
  );
}
