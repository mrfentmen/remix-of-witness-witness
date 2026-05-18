// Tiny wrapper around the Vibration API. No-op where unsupported (iOS Safari).
export function haptic(pattern: number | number[]): void {
  if (typeof navigator === "undefined") return;
  const nav = navigator as unknown as { vibrate?: (p: number | number[]) => boolean };
  if (typeof nav.vibrate === "function") {
    try {
      nav.vibrate(pattern);
    } catch {
      /* noop */
    }
  }
}

export const hapticRecordStart = () => haptic([15, 40, 25]);
export const hapticRecordStop = () => haptic(60);
export const hapticTap = () => haptic(10);
export const hapticSosSent = () => haptic([200, 100, 200]);
export const hapticVaultUnlock = () => haptic([50, 30, 50]);
export const hapticVaultLock = () => haptic(80);
export const hapticPoliceConnect = () => haptic([100, 50, 100, 50, 100]);
