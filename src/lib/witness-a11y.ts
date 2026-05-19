// Accessibility config store. Applies CSS custom property + classes on <html>.
// Persisted to localStorage. Reactive via useSyncExternalStore.
import { useSyncExternalStore } from "react";

export type TextScale = "small" | "normal" | "large" | "extra-large" | "maximum";

export interface A11yConfig {
  textScale: TextScale;
  highContrast: boolean;
  leftHanded: boolean;
  voiceCommandsEnabled: boolean;
  reducedMotion: boolean;
  speechRate: number;
}

const STORAGE_KEY = "witness:a11y";

const TEXT_SCALE_VALUES: Record<TextScale, number> = {
  small: 0.875,
  normal: 1,
  large: 1.15,
  "extra-large": 1.3,
  maximum: 1.5,
};

const DEFAULTS: A11yConfig = {
  textScale: "normal",
  highContrast: false,
  leftHanded: false,
  voiceCommandsEnabled: false,
  reducedMotion: false,
  speechRate: 1,
};

function read(): A11yConfig {
  if (typeof localStorage === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<A11yConfig>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return DEFAULTS;
  }
}

let current: A11yConfig = read();
const listeners = new Set<() => void>();

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    /* noop */
  }
}

export function applyA11y(cfg: A11yConfig = current) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--a11y-text-scale", String(TEXT_SCALE_VALUES[cfg.textScale]));
  root.classList.toggle("high-contrast", cfg.highContrast);
  root.classList.toggle("left-handed", cfg.leftHanded);
  root.classList.toggle("reduced-motion", cfg.reducedMotion);
}

export function getA11y(): A11yConfig {
  return current;
}

export function setA11y(patch: Partial<A11yConfig>) {
  current = { ...current, ...patch };
  persist();
  applyA11y(current);
  listeners.forEach((l) => l());
}

export function useA11y(): A11yConfig {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
    () => current,
  );
}

/** Sync `prefers-reduced-motion` once at mount. */
export function syncReducedMotionFromMedia() {
  if (typeof window === "undefined" || !window.matchMedia) return;
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  const apply = () => {
    if (current.reducedMotion !== mq.matches) {
      setA11y({ reducedMotion: mq.matches });
    }
  };
  apply();
  mq.addEventListener("change", apply);
}

/** Speak text via SpeechSynthesis. No-op when unsupported. */
export function speak(text: string, lang: string = "en-US") {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = current.speechRate;
    window.speechSynthesis.speak(u);
  } catch {
    /* noop */
  }
}
