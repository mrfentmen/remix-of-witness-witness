import { clearAllRecordings } from "./witness-db";
import { STORAGE_KEYS } from "./witness-storage";
import { clearLocalMasterKey } from "./cloud-key";
import { signOut } from "./cloud-auth";

/**
 * Wipe every trace of the user from this device:
 * - all recordings (IndexedDB)
 * - PIN, contacts, settings, upload status, device id
 * Onboarding flag is preserved so we don't drop the user back into the welcome flow.
 */
export async function wipeAllData(): Promise<void> {
  await clearAllRecordings();
  try {
    await signOut();
  } catch {
    /* noop */
  }
  clearLocalMasterKey();
  if (typeof window === "undefined") return;
  const keep = new Set<string>([STORAGE_KEYS.onboarded]);
  for (const key of Object.values(STORAGE_KEYS)) {
    if (keep.has(key)) continue;
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* noop */
    }
  }
  // Also clear master key + supabase session leftovers
  try {
    window.localStorage.removeItem("@Witness_master");
  } catch {
    /* noop */
  }
}
