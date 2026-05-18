// State detection engine. Uses simple GPS bounding boxes to identify the
// user's current US state on app open. Only fires a notification if the
// state changed or 24 hours have passed since the last reminder.
// Buffer-zone states (FL, KS, TN) get a red warning banner.

import knowYourRights from "@/data/knowYourRights.json";

export interface StateInfo {
  state: string;
  stateCode: string;
  consentLaw: string;
  legalStatus: string;
  keyCaseOrLaw: string;
  bufferZoneRisk: string;
  plainEnglishSummary: string;
  isBufferZone: boolean;
}

/* ------------- bounding boxes (rough) ------------- */

interface BBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

const STATE_BOXES: Record<string, BBox> = {
  AL: { minLat: 30.1, maxLat: 35.0, minLng: -88.5, maxLng: -84.9 },
  AK: { minLat: 54.0, maxLat: 72.0, minLng: -178.0, maxLng: -129.0 },
  AZ: { minLat: 31.3, maxLat: 37.0, minLng: -114.8, maxLng: -109.0 },
  AR: { minLat: 33.0, maxLat: 36.5, minLng: -94.6, maxLng: -89.6 },
  CA: { minLat: 32.5, maxLat: 42.0, minLng: -124.4, maxLng: -114.1 },
  CO: { minLat: 37.0, maxLat: 41.0, minLng: -109.1, maxLng: -102.0 },
  CT: { minLat: 41.0, maxLat: 42.1, minLng: -73.7, maxLng: -71.8 },
  DE: { minLat: 38.4, maxLat: 39.9, minLng: -75.8, maxLng: -75.0 },
  FL: { minLat: 24.5, maxLat: 31.0, minLng: -87.6, maxLng: -79.9 },
  GA: { minLat: 30.3, maxLat: 35.0, minLng: -85.6, maxLng: -80.8 },
  HI: { minLat: 18.9, maxLat: 22.3, minLng: -160.3, maxLng: -154.8 },
  ID: { minLat: 42.0, maxLat: 49.0, minLng: -117.3, maxLng: -111.0 },
  IL: { minLat: 36.9, maxLat: 42.5, minLng: -91.5, maxLng: -87.5 },
  IN: { minLat: 37.8, maxLat: 41.8, minLng: -88.1, maxLng: -84.8 },
  IA: { minLat: 40.4, maxLat: 43.5, minLng: -96.6, maxLng: -90.1 },
  KS: { minLat: 37.0, maxLat: 40.0, minLng: -102.1, maxLng: -94.6 },
  KY: { minLat: 36.5, maxLat: 39.2, minLng: -89.6, maxLng: -81.9 },
  LA: { minLat: 28.9, maxLat: 33.0, minLng: -94.1, maxLng: -88.8 },
  ME: { minLat: 43.0, maxLat: 47.5, minLng: -71.1, maxLng: -66.9 },
  MD: { minLat: 37.9, maxLat: 39.8, minLng: -79.5, maxLng: -75.0 },
  MA: { minLat: 41.2, maxLat: 42.9, minLng: -73.5, maxLng: -69.9 },
  MI: { minLat: 41.7, maxLat: 48.3, minLng: -90.5, maxLng: -82.1 },
  MN: { minLat: 43.5, maxLat: 49.4, minLng: -97.2, maxLng: -89.5 },
  MS: { minLat: 30.1, maxLat: 35.0, minLng: -91.7, maxLng: -88.1 },
  MO: { minLat: 36.0, maxLat: 40.6, minLng: -95.8, maxLng: -89.1 },
  MT: { minLat: 44.3, maxLat: 49.0, minLng: -116.1, maxLng: -104.0 },
  NE: { minLat: 40.0, maxLat: 43.0, minLng: -104.1, maxLng: -95.3 },
  NV: { minLat: 35.0, maxLat: 42.0, minLng: -120.0, maxLng: -114.0 },
  NH: { minLat: 42.7, maxLat: 45.3, minLng: -72.6, maxLng: -70.6 },
  NJ: { minLat: 38.9, maxLat: 41.4, minLng: -75.6, maxLng: -73.9 },
  NM: { minLat: 31.3, maxLat: 37.0, minLng: -109.1, maxLng: -103.0 },
  NY: { minLat: 40.5, maxLat: 45.0, minLng: -79.8, maxLng: -71.8 },
  NC: { minLat: 33.8, maxLat: 36.6, minLng: -84.4, maxLng: -75.4 },
  ND: { minLat: 45.9, maxLat: 49.0, minLng: -104.1, maxLng: -96.5 },
  OH: { minLat: 38.4, maxLat: 42.0, minLng: -84.8, maxLng: -80.5 },
  OK: { minLat: 33.6, maxLat: 37.0, minLng: -103.0, maxLng: -94.4 },
  OR: { minLat: 42.0, maxLat: 46.3, minLng: -124.7, maxLng: -116.4 },
  PA: { minLat: 39.7, maxLat: 42.3, minLng: -80.5, maxLng: -74.7 },
  RI: { minLat: 41.1, maxLat: 42.0, minLng: -71.9, maxLng: -71.1 },
  SC: { minLat: 32.0, maxLat: 35.2, minLng: -83.4, maxLng: -78.5 },
  SD: { minLat: 42.5, maxLat: 45.9, minLng: -104.1, maxLng: -96.4 },
  TN: { minLat: 34.9, maxLat: 36.7, minLng: -90.3, maxLng: -81.6 },
  TX: { minLat: 25.8, maxLat: 36.5, minLng: -106.6, maxLng: -93.5 },
  UT: { minLat: 37.0, maxLat: 42.0, minLng: -114.1, maxLng: -109.0 },
  VT: { minLat: 42.7, maxLat: 45.0, minLng: -73.5, maxLng: -71.5 },
  VA: { minLat: 36.5, maxLat: 39.5, minLng: -83.7, maxLng: -75.2 },
  WA: { minLat: 45.5, maxLat: 49.0, minLng: -124.9, maxLng: -116.9 },
  WV: { minLat: 37.2, maxLat: 40.7, minLng: -82.7, maxLng: -77.7 },
  WI: { minLat: 42.5, maxLat: 47.1, minLng: -92.9, maxLng: -86.8 },
  WY: { minLat: 41.0, maxLat: 45.0, minLng: -111.1, maxLng: -104.0 },
};

// States with active buffer-zone laws (FL: 25ft, KS: 25ft, TN: 25ft)
const BUFFER_ZONE_STATES = new Set(["FL", "KS", "TN"]);

/* ------------- helpers ------------- */

const STORAGE_KEY_LAST_STATE = "witness_last_detected_state";
const STORAGE_KEY_LAST_TS = "witness_last_detection_ts";

function getAbbrFromCoords(lat: number, lng: number): string | null {
  for (const [abbr, box] of Object.entries(STATE_BOXES)) {
    if (lat >= box.minLat && lat <= box.maxLat && lng >= box.minLng && lng <= box.maxLng) {
      return abbr;
    }
  }
  return null;
}

function lookupStateInfo(stateCode: string): StateInfo | null {
  const entry = knowYourRights.find((r) => r.stateCode.toUpperCase() === stateCode.toUpperCase());
  if (!entry) return null;
  return {
    ...entry,
    isBufferZone: BUFFER_ZONE_STATES.has(stateCode.toUpperCase()),
  };
}

function getLastDetection(): { stateCode: string | null; ts: number } {
  if (typeof window === "undefined") return { stateCode: null, ts: 0 };
  return {
    stateCode: localStorage.getItem(STORAGE_KEY_LAST_STATE),
    ts: Number(localStorage.getItem(STORAGE_KEY_LAST_TS) || 0),
  };
}

function persistDetection(stateCode: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY_LAST_STATE, stateCode);
  localStorage.setItem(STORAGE_KEY_LAST_TS, String(Date.now()));
}

/* ------------- public API ------------- */

/**
 * Attempts to detect the user's current state via GPS and returns
 * StateInfo if a notification should be shown (state changed OR >24h).
 * Returns null if nothing to show or location unavailable.
 */
export async function detectState(): Promise<StateInfo | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const abbr = getAbbrFromCoords(latitude, longitude);
        if (!abbr) {
          resolve(null);
          return;
        }

        const { stateCode: lastCode, ts: lastTs } = getLastDetection();
        const oneDay = 24 * 60 * 60 * 1000;
        const shouldShow = lastCode !== abbr || Date.now() - lastTs > oneDay;

        if (shouldShow) {
          const info = lookupStateInfo(abbr);
          if (info) {
            persistDetection(abbr);
            resolve(info);
            return;
          }
        }
        resolve(null);
      },
      () => resolve(null),
      { timeout: 8000, enableHighAccuracy: false },
    );
  });
}

/**
 * Returns a rough country code from latitude alone.
 * NOTE: This is a coarse heuristic. Use server-side IP geolocation for
 * production. CA lat band (43-50) overlaps with northern US states.
 */
export async function detectCountry(): Promise<string | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude } = pos.coords;
        // Very rough lat-based country detection
        if (latitude > 43 && latitude < 50) {
          // Roughly Canada latitude band
          resolve("CA");
        } else if (latitude > 50 && latitude < 60) {
          resolve("GB");
        } else if (latitude > 25 && latitude < 49) {
          resolve("US");
        } else if (latitude > 42 && latitude < 51) {
          resolve("FR");
        } else {
          resolve(null);
        }
      },
      () => resolve(null),
      { timeout: 8000 },
    );
  });
}
