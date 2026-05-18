// WitnessPanicWipe.tsx
import React, { useEffect, useRef, useCallback } from "react";

export interface WipeOptions {
  onEnsureCloudBackup?: () => Promise<void>;
  onWipeComplete?: () => void;
}

const DB_NAMES = ["WitnessDB", "WitnessAudioDB", "WitnessChainDB", "witness_vault"];

const WitnessPanicWipe: React.FC<WipeOptions> = ({ onEnsureCloudBackup, onWipeComplete }) => {
  const timerRef = useRef<number | null>(null);
  const heartbeatRef = useRef<number | null>(null);
  const isWiping = useRef(false);

  // 1. THE NUCLEAR WIPE FUNCTION
  const executeNuclearWipe = useCallback(async () => {
    if (isWiping.current) return;
    isWiping.current = true;

    // A. Attempt final silent cloud sync (max 2 seconds)
    if (onEnsureCloudBackup) {
      await Promise.race([
        onEnsureCloudBackup(),
        new Promise((resolve) => setTimeout(resolve, 2000)),
      ]);
    }

    // B. Wipe IndexedDB
    const dbTasks = DB_NAMES.map((name) => {
      return new Promise<void>((res) => {
        const req = indexedDB.deleteDatabase(name);
        req.onsuccess = () => res();
        req.onerror = () => res();
        req.onblocked = () => res();
      });
    });

    // C. Wipe Everything Else
    const otherTasks = [
      Promise.resolve(localStorage.clear()),
      Promise.resolve(sessionStorage.clear()),
      caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))),
      Promise.resolve(() => {
        document.cookie.split(";").forEach((c) => {
          document.cookie = c
            .replace(/^ +/, "")
            .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
      }),
    ];

    await Promise.allSettled([...dbTasks, ...otherTasks]);

    // D. Final Haptic + Hard Reset
    if (navigator.vibrate) navigator.vibrate([500, 100, 500]);

    if (onWipeComplete) {
      onWipeComplete();
    } else {
      // Force app to fresh state
      window.location.href = "/?reset=true";
    }
  }, [onEnsureCloudBackup, onWipeComplete]);

  // 2. GESTURE DETECTION (3-Finger Hold)
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 3) {
        // Start 5-second countdown
        timerRef.current = window.setTimeout(() => {
          executeNuclearWipe();
        }, 5000);

        // Start "Heartbeat" Haptics (Confirms to user the wipe is coming)
        let beats = 0;
        heartbeatRef.current = window.setInterval(() => {
          beats++;
          if (navigator.vibrate) {
            // Vibrate faster as we get closer to 5s
            navigator.vibrate(50);
          }
        }, 1000);
      }
    };

    const handleTouchEnd = () => {
      // If user lifts a finger, cancel the countdown immediately
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
    };

    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchend", handleTouchEnd);
    window.addEventListener("touchcancel", handleTouchEnd);

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [executeNuclearWipe]);

  return null; // This component is completely invisible
};

export default WitnessPanicWipe;
