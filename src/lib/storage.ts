const KEY = "cuecam-v1";

export const ASPECTS = ["1:1", "4:3", "16:9"] as const;
export type Aspect = (typeof ASPECTS)[number];

export const ASPECT_RATIO: Record<Aspect, number> = {
  "1:1": 1,
  "4:3": 3 / 4,
  "16:9": 9 / 16,
};

export const ASPECT_SIZE: Record<Aspect, { w: number; h: number }> = {
  "1:1": { w: 1080, h: 1080 },
  "4:3": { w: 1080, h: 1440 },
  "16:9": { w: 1080, h: 1920 },
};

export type SavedSettings = {
  script: string;
  speed: number;
  zoom: number;
  fontSize: number;
  aspect: Aspect;
};

export const DEFAULT_SCRIPT = `Hey — thanks for hanging with me.

I want to tell you something I've been sitting on.

You don't need a studio, a crew, or a perfect first take.

You need a camera, a few honest lines, and the nerve to start talking.

So take a breath.
Look into the lens.
Say it like you're saying it to a friend.

That's the whole trick.`;

export const DEFAULTS: SavedSettings = {
  script: DEFAULT_SCRIPT,
  speed: 46,
  zoom: 1,
  fontSize: 34,
  aspect: "16:9",
};

export function loadSettings(): SavedSettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<SavedSettings>;
    return {
      script: typeof parsed.script === "string" ? parsed.script : DEFAULTS.script,
      speed: clampNum(parsed.speed, 18, 140, DEFAULTS.speed),
      zoom: clampNum(parsed.zoom, 1, 2.5, DEFAULTS.zoom),
      fontSize: clampNum(parsed.fontSize, 24, 56, DEFAULTS.fontSize),
      aspect: parseAspect(parsed.aspect),
    };
  } catch {
    return DEFAULTS;
  }
}

export function saveSettings(next: SavedSettings) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(next));
}

function parseAspect(value: unknown): Aspect {
  return ASPECTS.includes(value as Aspect) ? (value as Aspect) : DEFAULTS.aspect;
}

function clampNum(value: unknown, min: number, max: number, fallback: number) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}