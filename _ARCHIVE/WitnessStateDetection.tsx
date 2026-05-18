// WitnessStateDetection.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";

// ------------------------------
// SECTION: TYPES & DATA
// ------------------------------
interface StateInfo {
  name: string;
  abbr: string;
  consent: "One-Party" | "All-Party";
  summary: string;
  bufferZone: boolean;
}

// Simplified Bounding Boxes (Provided by user)
const STATE_BOXES: Record<string, any> = {
  AL: { minLat: 30.1, maxLat: 35.0, minLng: -88.5, maxLng: -84.9 },
  CA: { minLat: 32.5, maxLat: 42.0, minLng: -124.4, maxLng: -114.1 },
  FL: { minLat: 24.5, maxLat: 31.0, minLng: -87.6, maxLng: -80.0 },
  NY: { minLat: 40.5, maxLat: 45.0, minLng: -79.8, maxLng: -71.9 },
  TX: { minLat: 25.8, maxLat: 36.5, minLng: -106.6, maxLng: -93.5 },
  // ... (Other states from your list)
};

const STATE_DATA: Record<string, StateInfo> = {
  AL: {
    name: "Alabama",
    abbr: "AL",
    consent: "One-Party",
    summary: "You can record if you are part of the conversation.",
    bufferZone: false,
  },
  CA: {
    name: "California",
    abbr: "CA",
    consent: "All-Party",
    summary: "Everyone in a private conversation must consent to recording.",
    bufferZone: false,
  },
  FL: {
    name: "Florida",
    abbr: "FL",
    consent: "All-Party",
    summary: "Recording private conversations requires everyone's consent.",
    bufferZone: true,
  },
  NY: {
    name: "New York",
    abbr: "NY",
    consent: "One-Party",
    summary: "Only one person needs to know a recording is happening.",
    bufferZone: false,
  },
  TX: {
    name: "Texas",
    abbr: "TX",
    consent: "One-Party",
    summary: "One-party consent for recording conversations.",
    bufferZone: false,
  },
};

// ------------------------------
// SECTION: COMPONENT
// ------------------------------
export default function WitnessStateDetection() {
  const [isVisible, setIsVisible] = useState(false);
  const [currentState, setCurrentState] = useState<StateInfo | null>(null);
  const autoDismissRef = useRef<NodeJS.Timeout | null>(null);

  const getAbbrFromCoords = (lat: number, lng: number) => {
    for (const [abbr, box] of Object.entries(STATE_BOXES)) {
      if (lat >= box.minLat && lat <= box.maxLat && lng >= box.minLng && lng <= box.maxLng) {
        return abbr;
      }
    }
    return null;
  };

  const checkLocation = useCallback(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords;
      const abbr = getAbbrFromCoords(latitude, longitude);

      if (!abbr) return;

      const lastDetect = localStorage.getItem("witness_last_state");
      const lastTime = localStorage.getItem("witness_last_ts");
      const oneDay = 24 * 60 * 60 * 1000;

      // Logic: Show if state changed OR if 24 hours have passed since last reminder
      const shouldShow = lastDetect !== abbr || Date.now() - Number(lastTime || 0) > oneDay;

      if (shouldShow && STATE_DATA[abbr]) {
        setCurrentState(STATE_DATA[abbr]);
        setIsVisible(true);
        localStorage.setItem("witness_last_state", abbr);
        localStorage.setItem("witness_last_ts", Date.now().toString());

        // Auto-dismiss after 10 seconds
        if (autoDismissRef.current) clearTimeout(autoDismissRef.current);
        autoDismissRef.current = setTimeout(() => setIsVisible(false), 10000);
      }
    });
  }, []);

  useEffect(() => {
    checkLocation();
    return () => {
      if (autoDismissRef.current) clearTimeout(autoDismissRef.current);
    };
  }, [checkLocation]);

  if (!isVisible || !currentState) return null;

  return (
    <div className="fixed bottom-6 left-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-zinc-900 border-l-4 border-red-600 rounded-xl p-4 shadow-2xl shadow-black">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="text-red-500 font-black text-lg italic">
              {currentState.name.toUpperCase()} RIGHTS
            </h3>
            <span className="bg-red-900/30 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-800">
              {currentState.consent.toUpperCase()} CONSENT
            </span>
          </div>
          <button onClick={() => setIsVisible(false)} className="text-gray-500 hover:text-white">
            ✕
          </button>
        </div>

        <p className="text-sm text-gray-300 leading-tight mb-3">{currentState.summary}</p>

        {currentState.bufferZone && (
          <div className="bg-red-950/50 border border-red-900 p-2 rounded text-[11px] text-red-200 mb-3 font-bold italic">
            ⚠️ WARNING: Buffer zone laws may apply. Stay back if ordered.
          </div>
        )}

        <div className="flex justify-between items-center">
          <button className="text-[10px] text-red-500 font-bold underline uppercase tracking-widest">
            Full Legal Guide
          </button>
          <span className="text-[8px] text-gray-600 italic">Not legal advice. Laws may vary.</span>
        </div>
      </div>
    </div>
  );
}
