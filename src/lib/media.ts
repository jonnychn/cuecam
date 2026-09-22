import { ASPECT_SIZE, type Aspect } from "@/lib/storage";

export type CameraStatus = "idle" | "requesting" | "live" | "denied" | "unavailable";

export const MAX_TAKE_MS = 15 * 60 * 1000;

type ZoomCaps = { min: number; max: number };

export function isSecureCameraContext() {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  return Boolean(navigator.mediaDevices?.getUserMedia);
}

export function cameraErrorMessage(err: unknown): string {
  const name = err instanceof DOMException || err instanceof Error ? err.name : "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "Camera access is blocked. On iPhone: Settings → Safari (or this app) → Camera and Microphone → Allow.";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "No front camera was found on this device.";
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return "The camera is busy. Close other apps using it and try again.";
  }
  if (name === "OverconstrainedError" || name === "ConstraintNotSatisfiedError") {
    return "The front camera didn’t accept those settings. Trying a simpler profile.";
  }
  if (name === "SecurityError") {
    return "Camera needs a secure page. Open CueCam over HTTPS on your iPhone.";
  }
  if (!isSecureCameraContext()) {
    return "This browser can’t reach the camera. Open CueCam on your iPhone to record.";
  }
  return err instanceof Error && err.message
    ? err.message
    : "Couldn’t start the front camera.";
}

export async function startFrontCamera(): Promise<MediaStream> {
  if (!isSecureCameraContext()) {
    throw new Error("This browser can’t reach the camera.");
  }

  const audio = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  };

  // iPhone selfie is 4:3 (3:4 in portrait). Asking for 9:16 / 1080×1920 makes
  // Safari crop-and-scale the sensor into a tight face shot.
  const attempts: MediaStreamConstraints[] = [
    {
      audio,
      video: {
        facingMode: { ideal: "user" },
        aspectRatio: { ideal: 3 / 4 },
        width: { ideal: 1440 },
        height: { ideal: 1920 },
        frameRate: { ideal: 30 },
      },
    },
    {
      audio,
      video: {
        facingMode: { ideal: "user" },
        aspectRatio: { ideal: 4 / 3 },
        width: { ideal: 1920 },
        height: { ideal: 1440 },
        frameRate: { ideal: 30 },
      },
    },
    {
      audio,
      video: { facingMode: { ideal: "user" } },
    },
    { audio, video: { facingMode: "user" } },
    { audio: true, video: true },
  ];

  let last: unknown;
  for (const constraints of attempts) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      const track = stream.getVideoTracks()[0];
      if (track) await preferNativeSelfieFov(track);
      return stream;
    } catch (err) {
      last = err;
    }
  }
  throw last instanceof Error ? last : new Error("Couldn’t start the front camera.");
}

export function stopStream(stream: MediaStream | null) {
  if (!stream) return;
  for (const track of stream.getTracks()) {
    try {
      track.stop();
    } catch {
      /* ignore */
    }
  }
}

export function getZoomCaps(track: MediaStreamTrack): ZoomCaps | null {
  const caps = track.getCapabilities?.() as MediaTrackCapabilities & {
    zoom?: { min: number; max: number } | number;
  };
  const zoom = caps?.zoom;
  if (zoom == null) return null;
  if (typeof zoom === "number") return zoom > 1 ? { min: 1, max: zoom } : null;
  if (typeof zoom === "object" && Number.isFinite(zoom.max) && zoom.max > zoom.min) {
    return { min: zoom.min, max: zoom.max };
  }
  return null;
}

export async function preferNativeSelfieFov(track: MediaStreamTrack): Promise<void> {
  const caps = track.getCapabilities?.() as MediaTrackCapabilities & {
    aspectRatio?: { min: number; max: number };
    resizeMode?: string[];
    zoom?: { min: number; max: number } | number;
  };
  if (!caps) return;

  const next: Record<string, unknown> = {};

  if (Array.isArray(caps.resizeMode) && caps.resizeMode.includes("none")) {
    next.resizeMode = "none";
  }

  const ratio = caps.aspectRatio;
  if (ratio && Number.isFinite(ratio.min) && Number.isFinite(ratio.max)) {
    const portrait43 = 3 / 4;
    const landscape43 = 4 / 3;
    if (portrait43 >= ratio.min && portrait43 <= ratio.max) next.aspectRatio = portrait43;
    else if (landscape43 >= ratio.min && landscape43 <= ratio.max) next.aspectRatio = landscape43;
  }

  const zoomCaps = getZoomCaps(track);
  if (zoomCaps) next.zoom = zoomCaps.min;

  if (Object.keys(next).length === 0) return;

  try {
    await track.applyConstraints({ advanced: [next] } as unknown as MediaTrackConstraints);
  } catch {
    try {
      await track.applyConstraints(next as unknown as MediaTrackConstraints);
    } catch {
      /* keep whatever the browser already chose */
    }
  }
}

export async function applyHardwareZoom(track: MediaStreamTrack, zoom: number): Promise<boolean> {
  const caps = getZoomCaps(track);
  if (!caps) return false;
  const t = Math.min(1, Math.max(0, (zoom - 1) / 1.5));
  const value = caps.min + t * (caps.max - caps.min);
  try {
    await track.applyConstraints({ advanced: [{ zoom: value }] } as unknown as MediaTrackConstraints);
    return zoom > 1.02;
  } catch {
    try {
      await track.applyConstraints({ zoom: value } as unknown as MediaTrackConstraints);
      return zoom > 1.02;
    } catch {
      return false;
    }
  }
}

export function pickRecorderMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    "video/mp4",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

export function extForMime(mime: string) {
  return mime.includes("mp4") ? "mp4" : "webm";
}

export function formatTimecode(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatStamp(date = new Date()) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}-${p(date.getHours())}${p(date.getMinutes())}`;
}

export function wordStats(script: string) {
  const words = script.trim() ? script.trim().split(/\s+/).length : 0;
  const minutes = words / 140;
  let read = "a few seconds";
  if (words === 0) read = "no words yet";
  else if (minutes < 0.75) read = "under a minute";
  else if (minutes < 1.5) read = "about 1 min";
  else read = `about ${Math.round(minutes)} min`;
  return { words, read };
}

export function speedLabel(speed: number) {
  if (speed < 32) return "Slow";
  if (speed < 58) return "Conversational";
  if (speed < 90) return "Brisk";
  return "Fast";
}

type DrawStop = { stream: MediaStream; stop: () => void };

export function captureFramedStream(
  video: HTMLVideoElement,
  cameraStream: MediaStream,
  aspect: Aspect,
): DrawStop | null {
  if (typeof document === "undefined") return null;
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return null;

  const out = ASPECT_SIZE[aspect];
  const canvas = document.createElement("canvas");
  canvas.width = out.w;
  canvas.height = out.h;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  let raf = 0;
  let running = true;

  const draw = () => {
    if (!running) return;
    const srcAspect = vw / vh;
    const dstAspect = out.w / out.h;
    let sx = 0;
    let sy = 0;
    let sw = vw;
    let sh = vh;
    if (srcAspect > dstAspect) {
      sw = vh * dstAspect;
      sx = (vw - sw) / 2;
    } else {
      sh = vw / dstAspect;
      sy = (vh - sh) / 2;
    }
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, out.w, out.h);
    raf = requestAnimationFrame(draw);
  };
  draw();

  let stream: MediaStream;
  try {
    stream = canvas.captureStream(30);
  } catch {
    running = false;
    cancelAnimationFrame(raf);
    return null;
  }

  const audio = cameraStream.getAudioTracks()[0];
  if (audio) stream.addTrack(audio);

  return {
    stream,
    stop: () => {
      running = false;
      cancelAnimationFrame(raf);
      for (const track of stream.getVideoTracks()) track.stop();
    },
  };
}

export async function shareOrDownload(blob: Blob, filename: string): Promise<"shared" | "downloaded" | "aborted"> {
  const file = new File([blob], filename, { type: blob.type || "video/mp4" });
  const nav = navigator as Navigator & {
    canShare?: (data?: ShareData) => boolean;
    share?: (data: ShareData) => Promise<void>;
  };

  try {
    if (nav.share && nav.canShare?.({ files: [file] })) {
      await nav.share({ files: [file], title: filename, text: "CueCam take" });
      return "shared";
    }
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") return "aborted";
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
  return "downloaded";
}

export async function requestWakeLock(): Promise<{ release: () => Promise<void> } | null> {
  try {
    const lock = await navigator.wakeLock?.request("screen");
    return lock ?? null;
  } catch {
    return null;
  }
}
