import { create } from "zustand";
import { DEFAULTS, type Aspect } from "@/lib/storage";

export type Screen = "script" | "settings" | "studio" | "review";
export type RecState = "idle" | "recording" | "paused";

type StudioState = {
  hydrated: boolean;
  screen: Screen;
  settingsFrom: Screen;
  recState: RecState;
  script: string;
  speed: number;
  zoom: number;
  fontSize: number;
  aspect: Aspect;
  elapsedMs: number;
  videoUrl: string | null;
  videoBlob: Blob | null;
  cameraMessage: string | null;

  hydrate: (saved: typeof DEFAULTS) => void;
  setScript: (script: string) => void;
  setSpeed: (speed: number) => void;
  setZoom: (zoom: number) => void;
  setFontSize: (fontSize: number) => void;
  setAspect: (aspect: Aspect) => void;
  openSettings: () => void;
  closeSettings: () => void;
  goStudio: () => void;
  goScript: () => void;
  setRecState: (recState: RecState) => void;
  setElapsedMs: (elapsedMs: number) => void;
  setCameraMessage: (cameraMessage: string | null) => void;
  setVideo: (blob: Blob | null) => void;
  goReview: () => void;
  retake: () => void;
};

export const useStudio = create<StudioState>((set, get) => ({
  hydrated: false,
  screen: "script",
  settingsFrom: "script",
  recState: "idle",
  script: DEFAULTS.script,
  speed: DEFAULTS.speed,
  zoom: DEFAULTS.zoom,
  fontSize: DEFAULTS.fontSize,
  aspect: DEFAULTS.aspect,
  elapsedMs: 0,
  videoUrl: null,
  videoBlob: null,
  cameraMessage: null,

  hydrate: (saved) =>
    set({
      hydrated: true,
      script: saved.script,
      speed: saved.speed,
      zoom: saved.zoom,
      fontSize: saved.fontSize,
      aspect: saved.aspect,
    }),
  setScript: (script) => set({ script }),
  setSpeed: (speed) => {
    if (get().recState !== "idle") return;
    set({ speed });
  },
  setZoom: (zoom) => {
    if (get().recState !== "idle") return;
    set({ zoom: Math.min(2.5, Math.max(1, zoom)) });
  },
  setFontSize: (fontSize) => {
    if (get().recState !== "idle") return;
    set({ fontSize });
  },
  setAspect: (aspect) => {
    if (get().recState !== "idle") return;
    set({ aspect });
  },
  openSettings: () => {
    const { screen, recState } = get();
    if (recState !== "idle") return;
    if (screen === "settings") return;
    set({ settingsFrom: screen, screen: "settings" });
  },
  closeSettings: () => set({ screen: get().settingsFrom }),
  goStudio: () => set({ screen: "studio", cameraMessage: null }),
  goScript: () => {
    if (get().recState !== "idle") return;
    set({ screen: "script" });
  },
  setRecState: (recState) => set({ recState }),
  setElapsedMs: (elapsedMs) => set({ elapsedMs }),
  setCameraMessage: (cameraMessage) => set({ cameraMessage }),
  setVideo: (blob) => {
    const prev = get().videoUrl;
    if (prev) URL.revokeObjectURL(prev);
    set({
      videoBlob: blob,
      videoUrl: blob ? URL.createObjectURL(blob) : null,
    });
  },
  goReview: () => set({ screen: "review", recState: "idle" }),
  retake: () => {
    const prev = get().videoUrl;
    if (prev) URL.revokeObjectURL(prev);
    set({
      screen: "studio",
      recState: "idle",
      elapsedMs: 0,
      videoBlob: null,
      videoUrl: null,
    });
  },
}));