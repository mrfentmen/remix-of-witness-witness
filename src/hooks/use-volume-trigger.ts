import { useEffect } from "react";

/**
 * Listens for hardware volume keys (when exposed by the browser) and on-screen
 * Space/Enter as a developer/desktop fallback, and invokes `onTrigger`.
 * Note: most mobile browsers do NOT surface real volume key events, so this is
 * best-effort and silently no-ops on platforms where keys don't fire.
 */
export function useVolumeTrigger(onTrigger: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "AudioVolumeUp" || e.key === "AudioVolumeDown") {
        e.preventDefault();
        onTrigger();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onTrigger, enabled]);
}
