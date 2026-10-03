import QRCode from "qrcode";
import jsQR from "jsqr";

export async function qrSvgDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 512,
    color: { dark: "#0a0a0b", light: "#f4f4f0" },
  });
}

export function decodeFrame(image: ImageData): string | null {
  const code = jsQR(image.data, image.width, image.height, { inversionAttempts: "attemptBoth" });
  return code?.data ?? null;
}

type BarcodeDetectorInstance = {
  detect: (source: ImageBitmap | HTMLVideoElement) => Promise<Array<{ rawValue: string }>>;
};

let detector: BarcodeDetectorInstance | null | undefined;
const scratch = typeof document === "undefined" ? null : document.createElement("canvas");

function getDetector(): BarcodeDetectorInstance | null {
  if (detector !== undefined) return detector;
  const Detector = (globalThis as unknown as {
    BarcodeDetector?: new (opts: { formats: string[] }) => BarcodeDetectorInstance;
  }).BarcodeDetector;
  detector = Detector ? new Detector({ formats: ["qr_code"] }) : null;
  return detector;
}

function drawAndDecode(source: CanvasImageSource, w: number, h: number): string | null {
  if (!scratch || !w || !h) return null;
  const max = 1024;
  const scale = Math.min(1, max / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * scale));
  const ch = Math.max(1, Math.round(h * scale));
  scratch.width = cw;
  scratch.height = ch;
  const ctx = scratch.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(source, 0, 0, cw, ch);
  return decodeFrame(ctx.getImageData(0, 0, cw, ch));
}

export async function detectQrFromVideo(video: HTMLVideoElement): Promise<string | null> {
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h) return null;

  const native = getDetector();
  if (native) {
    try {
      const codes = await native.detect(video);
      const value = codes[0]?.rawValue;
      if (value) return value;
    } catch {
      /* jsQR fallback */
    }
  }
  return drawAndDecode(video, w, h);
}

export async function detectQrFromBlob(blob: Blob): Promise<string | null> {
  const bitmap = await createImageBitmap(blob);
  try {
    const native = getDetector();
    if (native) {
      try {
        const codes = await native.detect(bitmap);
        const value = codes[0]?.rawValue;
        if (value) return value;
      } catch {
        /* jsQR */
      }
    }
    return drawAndDecode(bitmap, bitmap.width, bitmap.height);
  } finally {
    bitmap.close();
  }
}

export async function ensureCameraPermission(): Promise<void> {
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  if (cap?.isNativePlatform?.()) {
    try {
      const { Camera } = await import("@capacitor/camera");
      await Camera.requestPermissions({ permissions: ["camera"] });
    } catch {
      /* web fallback */
    }
  }
}

export async function captureQrPhoto(): Promise<string | null> {
  await ensureCameraPermission();
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  if (!cap?.isNativePlatform?.()) return null;
  const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");
  const photo = await Camera.getPhoto({
    quality: 85,
    allowEditing: false,
    resultType: CameraResultType.DataUrl,
    source: CameraSource.Camera,
  });
  if (!photo.dataUrl) return null;
  const res = await fetch(photo.dataUrl);
  return detectQrFromBlob(await res.blob());
}

export async function openCameraStream(): Promise<MediaStream> {
  await ensureCameraPermission();
  const constraints: MediaStreamConstraints = {
    audio: false,
    video: {
      facingMode: { ideal: "environment" },
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
  };
  try {
    return await navigator.mediaDevices.getUserMedia(constraints);
  } catch {
    return navigator.mediaDevices.getUserMedia({ audio: false, video: true });
  }
}
