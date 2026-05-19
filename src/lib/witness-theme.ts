// Light/dark theme. Default: dark. Applies a class to <html> and persists to
// localStorage. Reactive via useSyncExternalStore.
import { useSyncExternalStore } from "react";
import { getString, setString, STORAGE_KEYS } from "./witness-storage";

export type Theme = "light" | "dark";

function read(): Theme {
  const raw = getString(STORAGE_KEYS.theme);
  return raw === "light" ? "light" : "dark";
}

let cache: Theme = read();
const listeners = new Set<() => void>();

function emit() {
  cache = read();
  apply(cache);
  listeners.forEach((l) => l());
}

function apply(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("light", theme === "light");
  root.classList.toggle("dark", theme === "dark");
}

export function applyStoredTheme() {
  apply(read());
}

export function setTheme(theme: Theme) {
  setString(STORAGE_KEYS.theme, theme);
  emit();
}

export function getTheme(): Theme {
  return cache;
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEYS.theme) emit();
  });
}

export function useTheme(): Theme {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => cache,
    () => cache,
  );
}
