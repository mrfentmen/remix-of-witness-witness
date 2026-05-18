// usePinLockout — escalating lockout timers for failed PIN attempts.
// After 5 consecutive failures: 30s, then 60s, 2min, 5min, 15min.
import { useState, useEffect, useCallback } from "react";

const MAX_ATTEMPTS = 5;
const LOCKOUT_TIERS_MS = [30_000, 60_000, 120_000, 300_000, 900_000];

interface LockoutState {
  attempts: number;
  lockedUntil: number | null; // timestamp
  tier: number; // which escalation tier we're on (0-based)
}

function loadState(): LockoutState {
  if (typeof window === "undefined") return { attempts: 0, lockedUntil: null, tier: 0 };
  try {
    const raw = localStorage.getItem("@Witness_pinLockout");
    if (raw) {
      const parsed = JSON.parse(raw) as LockoutState;
      if (parsed.lockedUntil && parsed.lockedUntil < Date.now()) {
        // Lock expired; keep the tier so the next failure escalates
        return { attempts: 0, lockedUntil: null, tier: parsed.tier };
      }
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return { attempts: 0, lockedUntil: null, tier: 0 };
}

function saveState(s: LockoutState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("@Witness_pinLockout", JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export function usePinLockout() {
  const [state, setState] = useState<LockoutState>(loadState);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const isLocked = state.lockedUntil !== null && state.lockedUntil > Date.now();

  // Countdown timer while locked
  useEffect(() => {
    if (!isLocked) return;
    const tick = () => {
      const rem = Math.max(0, Math.ceil((state.lockedUntil! - Date.now()) / 1000));
      setRemainingSeconds(rem);
      if (rem <= 0) {
        setState((prev) => {
          const next = { attempts: 0, lockedUntil: null, tier: prev.tier };
          saveState(next);
          return next;
        });
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isLocked, state.lockedUntil]);

  const recordFailedAttempt = useCallback(() => {
    setState((prev) => {
      if (prev.lockedUntil && prev.lockedUntil > Date.now()) return prev; // still locked
      const newAttempts = prev.attempts + 1;
      if (newAttempts >= MAX_ATTEMPTS) {
        const tier = Math.min(prev.tier, LOCKOUT_TIERS_MS.length - 1);
        const duration = LOCKOUT_TIERS_MS[tier];
        const next: LockoutState = {
          attempts: 0,
          lockedUntil: Date.now() + duration,
          tier: tier + 1,
        };
        saveState(next);
        return next;
      }
      const next = { ...prev, attempts: newAttempts };
      saveState(next);
      return next;
    });
  }, []);

  const resetAttempts = useCallback(() => {
    const next: LockoutState = { attempts: 0, lockedUntil: null, tier: 0 };
    setState(next);
    saveState(next);
    setRemainingSeconds(0);
  }, []);

  return {
    isLocked,
    remainingSeconds,
    recordFailedAttempt,
    resetAttempts,
    attemptsLeft: MAX_ATTEMPTS - state.attempts,
  };
}
