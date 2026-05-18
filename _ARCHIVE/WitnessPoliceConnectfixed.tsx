// WitnessPoliceConnect.tsx
// Self-contained TypeScript React component for optional Police Connect feature.
// Allows user to notify nearest NYPD precinct when livestreaming.
// Includes precinct finder, connection request (mock SMS),
// viewer badges, two-way audio placeholder, opt-out.
// Exports all components. Black/red theme. No external dependencies.

import React, { useState, useEffect, useCallback } from "react";
import type { JSX } from "react";

// ------------------------------
// SECTION: Types & Interfaces
// ------------------------------
export interface Precinct {
  id: number;
  name: string;
  address: string;
  phone: string;
  lat: number;
  lng: number;
}

export interface PoliceConnectState {
  enabled: boolean;
  confirmed: boolean;
  precinctNotified: boolean;
  precinctViewing: boolean;
  nearestPrecinct: Precinct | null;
  distanceMiles: number | null;
}

// ------------------------------
// SECTION: Hardcoded NYPD Precincts
// ------------------------------
const NYPD_PRECINCTS: Precinct[] = [
  {
    id: 1,
    name: "1st Precinct",
    address: "16 Ericsson Place, New York, NY 10013",
    phone: "+1 (212) 334-0611",
    lat: 40.7207,
    lng: -74.0097,
  },
  {
    id: 5,
    name: "5th Precinct",
    address: "19 Elizabeth Street, New York, NY 10013",
    phone: "+1 (212) 334-0711",
    lat: 40.7163,
    lng: -73.9973,
  },
  {
    id: 6,
    name: "6th Precinct",
    address: "233 West 10th Street, New York, NY 10014",
    phone: "+1 (212) 741-4811",
    lat: 40.7366,
    lng: -74.0048,
  },
  {
    id: 7,
    name: "7th Precinct",
    address: "134 Delancey Street, New York, NY 10002",
    phone: "+1 (212) 477-7311",
    lat: 40.7188,
    lng: -73.9832,
  },
  {
    id: 9,
    name: "9th Precinct",
    address: "321 East 5th Street, New York, NY 10003",
    phone: "+1 (212) 477-7911",
    lat: 40.7266,
    lng: -73.9859,
  },
  {
    id: 10,
    name: "10th Precinct",
    address: "230 West 20th Street, New York, NY 10011",
    phone: "+1 (212) 741-4611",
    lat: 40.7439,
    lng: -74.0011,
  },
  {
    id: 14,
    name: "14th Precinct",
    address: "14 West 35th Street, New York, NY 10018",
    phone: "+1 (212) 239-9811",
    lat: 40.7499,
    lng: -73.9856,
  },
  {
    id: 17,
    name: "17th Precinct",
    address: "167 East 51st Street, New York, NY 10022",
    phone: "+1 (212) 826-3211",
    lat: 40.7562,
    lng: -73.9695,
  },
  {
    id: 20,
    name: "20th Precinct",
    address: "120 West 82nd Street, New York, NY 10024",
    phone: "+1 (212) 580-6411",
    lat: 40.7861,
    lng: -73.9755,
  },
  {
    id: 22,
    name: "22nd Precinct",
    address: "610 Columbus Avenue, New York, NY 10024",
    phone: "+1 (212) 678-1311",
    lat: 40.7857,
    lng: -73.9661,
  },
  {
    id: 23,
    name: "23rd Precinct",
    address: "162 East 102nd Street, New York, NY 10029",
    phone: "+1 (212) 860-5811",
    lat: 40.7894,
    lng: -73.9468,
  },
  {
    id: 25,
    name: "25th Precinct",
    address: "120 East 119th Street, New York, NY 10035",
    phone: "+1 (212) 860-6511",
    lat: 40.8013,
    lng: -73.9409,
  },
  {
    id: 28,
    name: "28th Precinct",
    address: "2271 Frederick Douglass Blvd, New York, NY 10027",
    phone: "+1 (212) 678-1311",
    lat: 40.8046,
    lng: -73.9548,
  },
  {
    id: 30,
    name: "30th Precinct",
    address: "451 West 151st Street, New York, NY 10031",
    phone: "+1 (212) 690-8811",
    lat: 40.8315,
    lng: -73.9477,
  },
  {
    id: 32,
    name: "32nd Precinct",
    address: "250 West 135th Street, New York, NY 10030",
    phone: "+1 (212) 690-6311",
    lat: 40.8178,
    lng: -73.9443,
  },
  {
    id: 33,
    name: "33rd Precinct",
    address: "2207 Amsterdam Avenue, New York, NY 10032",
    phone: "+1 (212) 927-3200",
    lat: 40.8352,
    lng: -73.9441,
  },
  {
    id: 34,
    name: "34th Precinct",
    address: "4295 Broadway, New York, NY 10033",
    phone: "+1 (212) 927-9711",
    lat: 40.8492,
    lng: -73.9375,
  },
  {
    id: 40,
    name: "40th Precinct",
    address: "257 Alexander Avenue, Bronx, NY 10454",
    phone: "+1 (718) 402-2270",
    lat: 40.8123,
    lng: -73.9209,
  },
  {
    id: 41,
    name: "41st Precinct",
    address: "1086 Simpson Street, Bronx, NY 10459",
    phone: "+1 (718) 542-4771",
    lat: 40.8265,
    lng: -73.8913,
  },
];

// ------------------------------
// SECTION: Utility Functions
// ------------------------------
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

const getCurrentPosition = (): Promise<GeolocationPosition> => {
  return new Promise((resolve, reject) => {
    if (!isBrowser() || !navigator.geolocation) {
      reject(new Error("Geolocation unavailable"));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000,
    });
  });
};

const sendSMS = async (phoneNumber: string, message: string): Promise<{ success: boolean }> => {
  try {
    console.log("[Witness R.E.P SMS]");
    console.log(`To: ${phoneNumber}`);
    console.log(`Message: ${message}`);

    await new Promise((resolve) => setTimeout(resolve, 500));

    return { success: true };
  } catch (error) {
    console.error("SMS simulation failed:", error);

    return { success: false };
  }
};

function getStoredBoolean(key: string): boolean {
  if (!isBrowser()) return false;

  try {
    return localStorage.getItem(key) === "true";
  } catch {
    return false;
  }
}

function setStoredBoolean(key: string, value: boolean): void {
  if (!isBrowser()) return;

  try {
    localStorage.setItem(key, value ? "true" : "false");
  } catch (error) {
    console.error(`Failed to store ${key}`, error);
  }
}

async function findNearestPrecinct(): Promise<{
  precinct: Precinct | null;
  distance: number | null;
}> {
  const pos = await getCurrentPosition();

  const userLat = pos.coords.latitude;
  const userLng = pos.coords.longitude;

  let closest: Precinct | null = null;
  let minDist = Number.POSITIVE_INFINITY;

  for (const precinct of NYPD_PRECINCTS) {
    const dist = haversineDistance(userLat, userLng, precinct.lat, precinct.lng);

    if (dist < minDist) {
      minDist = dist;
      closest = precinct;
    }
  }

  return {
    precinct: closest,
    distance: Number.isFinite(minDist) ? minDist : null,
  };
}

// ------------------------------
// SECTION: Police Connect Toggle Component
// ------------------------------
export function PoliceConnectToggle(): JSX.Element {
  const [enabled, setEnabled] = useState<boolean>(() => getStoredBoolean("policeConnectEnabled"));

  const [confirmed, setConfirmed] = useState<boolean>(() =>
    getStoredBoolean("policeConnectConfirmed"),
  );

  const [showWarning, setShowWarning] = useState<boolean>(false);

  const [nearestPrecinct, setNearestPrecinct] = useState<Precinct | null>(null);

  const [distanceMiles, setDistanceMiles] = useState<number | null>(null);

  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    if (!enabled || confirmed) {
      return () => {
        active = false;
      };
    }

    setShowWarning(true);

    const loadPrecinct = async (): Promise<void> => {
      try {
        const result = await findNearestPrecinct();

        if (!active) return;

        setNearestPrecinct(result.precinct);
        setDistanceMiles(result.distance);
        setLocationError(null);
      } catch (error) {
        console.error(error);

        if (!active) return;

        setLocationError("Unable to access GPS location. Please enable location services.");
      }
    };

    void loadPrecinct();

    return () => {
      active = false;
    };
  }, [enabled, confirmed]);

  const handleToggle = (): void => {
    if (enabled) {
      setEnabled(false);
      setConfirmed(false);
      setShowWarning(false);

      setStoredBoolean("policeConnectEnabled", false);
      setStoredBoolean("policeConnectConfirmed", false);

      return;
    }

    setEnabled(true);
  };

  const handleConfirm = (): void => {
    setConfirmed(true);
    setShowWarning(false);

    setStoredBoolean("policeConnectEnabled", true);
    setStoredBoolean("policeConnectConfirmed", true);
  };

  const handleCancel = (): void => {
    setEnabled(false);
    setShowWarning(false);

    setStoredBoolean("policeConnectEnabled", false);
    setStoredBoolean("policeConnectConfirmed", false);
  };

  return (
    <div className="bg-black border border-red-600 rounded-xl p-4 mb-4 text-white">
      <div className="flex items-center justify-between">
        <span className="font-bold text-red-500">Connect Police Precinct</span>

        <button
          type="button"
          onClick={handleToggle}
          className={`px-4 py-1 rounded-full text-sm font-bold transition-all ${
            enabled && confirmed
              ? "bg-red-600 text-white"
              : "bg-neutral-900 border border-red-600 text-white"
          }`}
        >
          {enabled && confirmed ? "ON" : "OFF"}
        </button>
      </div>

      {enabled && !confirmed && showWarning && (
        <div className="mt-4 border border-red-600 rounded-lg bg-neutral-950 p-4">
          <p className="text-sm text-white mb-3">
            WARNING: Enabling Police Connect will notify the nearest police precinct when
            livestreaming begins.
          </p>

          {locationError ? (
            <p className="text-red-500 text-sm">{locationError}</p>
          ) : nearestPrecinct ? (
            <div className="space-y-1 text-sm">
              <p>
                Nearest precinct:{" "}
                <span className="font-bold text-red-500">{nearestPrecinct.name}</span>
              </p>

              <p>
                Distance: {distanceMiles !== null ? `${distanceMiles.toFixed(2)} miles` : "Unknown"}
              </p>

              <p className="text-xs text-neutral-400">{nearestPrecinct.phone}</p>
            </div>
          ) : (
            <p className="text-sm text-red-400">Locating nearest precinct...</p>
          )}

          <div className="flex gap-2 mt-4">
            <button
              type="button"
              onClick={handleConfirm}
              className="bg-red-600 hover:bg-red-700 transition-colors px-4 py-2 rounded-full text-sm font-bold"
            >
              I Understand
            </button>

            <button
              type="button"
              onClick={handleCancel}
              className="bg-neutral-900 border border-red-600 px-4 py-2 rounded-full text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {enabled && confirmed && (
        <div className="mt-3 text-sm text-red-400">Police Connect is active.</div>
      )}
    </div>
  );
}

// ------------------------------
// SECTION: Connection Request Hook
// ------------------------------
export function usePoliceConnect(streamUrl: string) {
  const [precinctNotified, setPrecinctNotified] = useState<boolean>(false);

  const [precinctViewing, setPrecinctViewing] = useState<boolean>(false);

  const [nearestPrecinct, setNearestPrecinct] = useState<Precinct | null>(null);

  const sendConnectionRequest = useCallback(async (): Promise<boolean> => {
    const enabled = getStoredBoolean("policeConnectEnabled");
    const confirmed = getStoredBoolean("policeConnectConfirmed");

    if (!enabled || !confirmed) {
      return false;
    }

    try {
      const pos = await getCurrentPosition();

      const userLat = pos.coords.latitude;
      const userLng = pos.coords.longitude;

      const result = await findNearestPrecinct();

      if (!result.precinct) {
        return false;
      }

      setNearestPrecinct(result.precinct);

      const message =
        `Witness R.E.P Live Alert.\n\n` +
        `A livestream has started near your precinct.\n` +
        `Coordinates: ${userLat}, ${userLng}\n` +
        `Stream: ${streamUrl}`;

      const response = await sendSMS(result.precinct.phone, message);

      if (response.success) {
        setPrecinctNotified(true);
      }

      return response.success;
    } catch (error) {
      console.error("Failed to notify precinct:", error);

      return false;
    }
  }, [streamUrl]);

  const simulatePrecinctViewing = useCallback((): void => {
    setPrecinctViewing(true);
  }, []);

  const optOut = useCallback(async (): Promise<void> => {
    try {
      if (nearestPrecinct) {
        await sendSMS(nearestPrecinct.phone, "Witness R.E.P session ended.");
      }
    } catch (error) {
      console.error("Opt-out failed:", error);
    } finally {
      setPrecinctNotified(false);
      setPrecinctViewing(false);
    }
  }, [nearestPrecinct]);

  return {
    precinctNotified,
    precinctViewing,
    nearestPrecinct,
    sendConnectionRequest,
    simulatePrecinctViewing,
    optOut,
  };
}

// ------------------------------
// SECTION: Viewer Badge Component
// ------------------------------
export function PoliceConnectBadges({
  notified,
  viewing,
}: {
  notified: boolean;
  viewing: boolean;
}): JSX.Element {
  return (
    <div className="flex flex-wrap gap-2">
      {notified && (
        <div className="bg-black border border-red-600 text-red-500 text-xs px-3 py-1 rounded-full flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          Precinct Notified
        </div>
      )}

      {viewing && (
        <div className="bg-black border border-white text-white text-xs px-3 py-1 rounded-full flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-white" />
          Precinct Viewing
        </div>
      )}
    </div>
  );
}

// ------------------------------
// SECTION: Two-Way Communication Placeholder
// ------------------------------
export function TwoWayAudioPlaceholder(): JSX.Element {
  return (
    <div className="bg-black border border-red-600 rounded-xl p-4 mt-4 text-center">
      <h4 className="font-bold text-red-500 mb-2">Two-Way Audio (Coming Soon)</h4>

      <button
        type="button"
        disabled
        className="bg-neutral-900 border border-red-600 text-neutral-500 px-4 py-2 rounded-full text-sm cursor-not-allowed"
      >
        Connect Audio
      </button>

      <p className="text-xs text-neutral-400 mt-3">
        Secure precinct communication support will be added in a future update.
      </p>
    </div>
  );
}

// ------------------------------
// SECTION: Opt Out Button
// ------------------------------
export function PoliceConnectOptOut({ onOptOut }: { onOptOut: () => void }): JSX.Element {
  const [showConfirm, setShowConfirm] = useState<boolean>(false);

  const handleOptOut = (): void => {
    onOptOut();
    setShowConfirm(false);
  };

  return (
    <div className="mt-3">
      {!showConfirm ? (
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          className="w-full bg-neutral-900 border border-red-600 text-red-500 px-4 py-2 rounded-full text-sm"
        >
          Disconnect Police Connect
        </button>
      ) : (
        <div className="bg-black border border-red-600 rounded-lg p-3">
          <p className="text-sm text-white mb-3">
            Stop police notifications and disconnect session?
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleOptOut}
              className="bg-red-600 px-4 py-2 rounded-full text-sm font-bold"
            >
              Yes, Stop
            </button>

            <button
              type="button"
              onClick={() => setShowConfirm(false)}
              className="bg-neutral-900 border border-red-600 px-4 py-2 rounded-full text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ------------------------------
// SECTION: Integrated Livestream Police Connect Panel
// ------------------------------
interface PoliceConnectLivestreamPanelProps {
  streamUrl: string;
  onStreamStart?: () => void;
}

export function PoliceConnectLivestreamPanel({
  streamUrl,
  onStreamStart,
}: PoliceConnectLivestreamPanelProps): JSX.Element {
  const [isLive, setIsLive] = useState<boolean>(false);

  const {
    precinctNotified,
    precinctViewing,
    sendConnectionRequest,
    simulatePrecinctViewing,
    optOut,
  } = usePoliceConnect(streamUrl);

  const startLive = async (): Promise<void> => {
    setIsLive(true);

    await sendConnectionRequest();

    if (onStreamStart) {
      onStreamStart();
    }
  };

  const stopLive = async (): Promise<void> => {
    setIsLive(false);

    await optOut();
  };

  return (
    <div className="bg-black border border-red-600 rounded-xl p-4 text-white">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-red-500">Police Connect</h3>

        <PoliceConnectBadges notified={precinctNotified} viewing={precinctViewing} />
      </div>

      {!isLive ? (
        <button
          type="button"
          onClick={() => {
            void startLive();
          }}
          className="w-full bg-red-600 hover:bg-red-700 transition-colors py-3 rounded-full text-sm font-bold"
        >
          Go Live with Police Notify
        </button>
      ) : (
        <div>
          <div className="text-red-500 font-bold mb-3">LIVE STREAM ACTIVE</div>

          <PoliceConnectOptOut
            onOptOut={() => {
              void stopLive();
            }}
          />

          <button
            type="button"
            onClick={simulatePrecinctViewing}
            className="mt-3 w-full bg-neutral-900 border border-red-600 px-4 py-2 rounded-full text-sm"
          >
            Demo: Simulate Precinct Watching
          </button>
        </div>
      )}

      <TwoWayAudioPlaceholder />
    </div>
  );
}

// ------------------------------
// SECTION: MainApp Demo
// ------------------------------
export function MainApp(): JSX.Element {
  const [demoStreamUrl] = useState<string>("https://witness.rep/live/demo123");

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-red-500 text-center mb-6">Police Connect (NYPD)</h1>

        <PoliceConnectToggle />

        <PoliceConnectLivestreamPanel streamUrl={demoStreamUrl} />
      </div>
    </div>
  );
}

export default MainApp;
