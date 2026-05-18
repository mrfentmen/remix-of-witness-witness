// Dual vault — real vs decoy PIN. The user sets two separate 4-digit PINs.
// Entering the real PIN unlocks the primary vault; entering the decoy PIN
// unlocks a benign decoy vault that appears empty or contains harmless data.
import { getString, setString } from "./witness-storage";

const REAL_PIN_KEY = "@Witness_pin"; // matches existing STORAGE_KEYS.pin
const DECOY_PIN_KEY = "@Witness_decoyPin";

export function getRealPin(): string | null {
  return getString(REAL_PIN_KEY);
}

export function getDecoyPin(): string | null {
  return getString(DECOY_PIN_KEY);
}

export function setRealPin(pin: string): void {
  setString(REAL_PIN_KEY, pin);
}

export function setDecoyPin(pin: string | null): void {
  setString(DECOY_PIN_KEY, pin);
}

export function hasDecoyPin(): boolean {
  return !!getDecoyPin();
}

/** Returns which vault a PIN unlocks, or null if it matches neither. */
export function tryUnlock(pin: string): "real" | "decoy" | null {
  const real = getRealPin();
  if (real && real === pin) return "real";
  const decoy = getDecoyPin();
  if (decoy && decoy === pin) return "decoy";
  return null;
}
