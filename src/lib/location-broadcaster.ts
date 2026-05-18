// Broadcasts the current user's GPS position to contact_locations every 30s
// while the "Share my location" toggle is on.
import { supabase } from "@/integrations/supabase/client";
import { getSettings } from "./witness-settings";
import { upsertMyLocation, deleteMyLocation } from "./contact-locations";

const INTERVAL_MS = 30_000;

let interval: number | null = null;
let watchId: number | null = null;
let lastFix: GeolocationPosition | null = null;

function clearTimers() {
  if (interval != null) {
    window.clearInterval(interval);
    interval = null;
  }
  if (watchId != null && navigator.geolocation) {
    try {
      navigator.geolocation.clearWatch(watchId);
    } catch {
      /* noop */
    }
    watchId = null;
  }
}

async function pushFix(pos: GeolocationPosition) {
  await upsertMyLocation({
    latitude: pos.coords.latitude,
    longitude: pos.coords.longitude,
    accuracy: pos.coords.accuracy,
  });
}

export async function startLocationBroadcast(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return false;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return false;

  clearTimers();

  // Watch position so we always have a fresh fix.
  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      lastFix = pos;
    },
    (err) => console.warn("[witness] location watch error", err),
    { enableHighAccuracy: true, maximumAge: 15_000, timeout: 20_000 },
  );

  // Immediate fix + 30s upserts.
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      lastFix = pos;
      void pushFix(pos);
    },
    () => undefined,
    { enableHighAccuracy: true, timeout: 10_000 },
  );

  interval = window.setInterval(() => {
    if (lastFix) void pushFix(lastFix);
  }, INTERVAL_MS);

  return true;
}

export async function stopLocationBroadcast(): Promise<void> {
  clearTimers();
  lastFix = null;
  await deleteMyLocation();
}

/** Re-arm the broadcaster on app start if the user previously enabled it. */
export async function reconcileLocationBroadcast(): Promise<void> {
  const { shareLocation } = getSettings();
  if (shareLocation) {
    await startLocationBroadcast();
  }
}
