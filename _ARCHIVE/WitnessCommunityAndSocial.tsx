// WitnessCommunityAndSocial.tsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";

// ------------------------------
// SECTION: TYPES
// ------------------------------
interface Coords {
  lat: number;
  lng: number;
}
interface WitnessEvent {
  id: string;
  location: Coords;
  type: "emergency" | "checkin";
  timestamp: number;
}

// ------------------------------
// SECTION: WITNESS NETWORK (Simulated)
// ------------------------------
export const WitnessNetworkUI = () => {
  const [isAvailable, setIsAvailable] = useState(false);
  const [nearbyCount, setNearbyCount] = useState(0);
  const [activeAlert, setActiveAlert] = useState<WitnessEvent | null>(null);

  // 1. Simulation Heartbeat
  useEffect(() => {
    const interval = setInterval(() => {
      // Mock nearby witnesses (3-7 people)
      setNearbyCount(Math.floor(Math.random() * 5) + 3);

      // Randomly simulate a nearby emergency every 30 seconds
      if (isAvailable && !activeAlert && Math.random() > 0.8) {
        setActiveAlert({
          id: Math.random().toString(),
          location: { lat: 40.7128, lng: -74.006 },
          type: "emergency",
          timestamp: Date.now(),
        });
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [isAvailable, activeAlert]);

  return (
    <div className="bg-zinc-950 p-6 rounded-3xl border border-zinc-900 text-white">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-red-600 font-black italic uppercase">Witness Network</h3>
        <button
          onClick={() => setIsAvailable(!isAvailable)}
          className={`px-4 py-1 rounded-full text-[10px] font-bold transition-all ${isAvailable ? "bg-green-600" : "bg-gray-800"}`}
        >
          {isAvailable ? "ONLINE" : "OFFLINE"}
        </button>
      </div>

      <div className="bg-black p-4 rounded-xl border border-zinc-800 text-center mb-4">
        <div className="text-3xl font-black text-red-500">{nearbyCount}</div>
        <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">
          Nearby Witnesses
        </div>
      </div>

      {activeAlert && (
        <div className="bg-red-950/20 border border-red-600 p-4 rounded-2xl animate-pulse">
          <p className="text-xs font-bold text-red-500 mb-2">⚠️ NEARBY REQUEST</p>
          <p className="text-[10px] text-gray-400 mb-4">
            A user within 0.5 miles is requesting a digital witness.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                alert("Linked to stream...");
                setActiveAlert(null);
              }}
              className="flex-1 bg-red-600 py-2 rounded-lg text-[10px] font-bold"
            >
              START WATCHING
            </button>
            <button
              onClick={() => setActiveAlert(null)}
              className="px-4 py-2 text-[10px] text-gray-500 font-bold"
            >
              IGNORE
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ------------------------------
// SECTION: SAFE CORRIDOR (Resilient Timer)
// ------------------------------
export const SafeCorridorUI = () => {
  const [isActive, setIsActive] = useState(false);
  const [targetTime, setTargetTime] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [destination, setDestination] = useState("");

  const startCorridor = () => {
    if (!destination) return alert("Enter destination");
    const end = Date.now() + 20 * 60 * 1000; // 20 mins
    setTargetTime(end);
    setIsActive(true);
  };

  useEffect(() => {
    if (!isActive || !targetTime) return;

    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.floor((targetTime - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining === 0) {
        setIsActive(false);
        alert("CRITICAL: Safe Corridor expired. SOS Escalation triggered.");
        // Call SOS logic here
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isActive, targetTime]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="bg-zinc-950 p-6 rounded-3xl border border-red-900/20 text-white">
      <h3 className="text-red-600 font-black italic uppercase mb-4 text-sm">Safe Corridor</h3>

      {!isActive ? (
        <div className="space-y-4">
          <input
            placeholder="Where are you going? (e.g. Home)"
            className="w-full bg-black border border-zinc-800 p-3 rounded-xl text-sm"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
          />
          <button
            onClick={startCorridor}
            className="w-full bg-red-600 py-3 rounded-xl font-bold text-xs uppercase"
          >
            Start 20m Watch
          </button>
        </div>
      ) : (
        <div className="text-center space-y-4">
          <div className="text-5xl font-mono font-black text-red-500">{formatTime(timeLeft)}</div>
          <p className="text-xs text-gray-500">Auto-SOS if you don't check in by deadline.</p>
          <button
            onClick={() => {
              setIsActive(false);
              alert("Safe Arrival Logged");
            }}
            className="w-full bg-green-700 py-3 rounded-xl font-bold text-xs"
          >
            I'M SAFE (CHECK IN)
          </button>
        </div>
      )}
    </div>
  );
};

// ------------------------------
// SECTION: MAIN APP WRAPPER
// ------------------------------
export default function WitnessCommunityApp() {
  const [activeTab, setActiveTab] = useState<"network" | "corridor" | "alerts">("network");

  return (
    <div className="min-h-screen bg-black text-zinc-100 p-4 pb-24 font-sans max-w-md mx-auto">
      <header className="text-center mb-8 mt-6">
        <h1 className="text-3xl font-black italic text-red-600 tracking-tighter">WITNESS SOCIAL</h1>
        <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
          Community Safety Engine
        </p>
      </header>

      <div className="space-y-6">
        {activeTab === "network" && (
          <>
            <WitnessNetworkUI />
            <div className="bg-zinc-900/50 p-5 rounded-3xl border border-zinc-800">
              <h4 className="text-xs font-bold text-red-500 uppercase mb-2">
                Neighborhood Following
              </h4>
              <div className="flex gap-2">
                <input
                  placeholder="Zip Code"
                  className="flex-1 bg-black border border-zinc-800 rounded-lg p-2 text-xs"
                />
                <button className="bg-zinc-800 px-4 rounded-lg text-[10px] font-bold">
                  FOLLOW
                </button>
              </div>
            </div>
          </>
        )}

        {activeTab === "corridor" && <SafeCorridorUI />}

        {activeTab === "alerts" && (
          <div className="space-y-3">
            <div className="bg-red-950/10 border-l-4 border-red-600 p-4 rounded-xl">
              <div className="flex justify-between font-bold text-xs mb-1">
                <span>City Safety HQ</span>
                <span className="text-red-500">EMERGENCY</span>
              </div>
              <p className="text-xs text-gray-400">
                Protest activity at 4th and Main. Observers requested.
              </p>
            </div>
            <div className="bg-orange-950/10 border-l-4 border-orange-500 p-4 rounded-xl">
              <div className="flex justify-between font-bold text-xs mb-1">
                <span>Weather Dispatch</span>
                <span className="text-orange-500">WARNING</span>
              </div>
              <p className="text-xs text-gray-400">
                Severe storm front moving through Brooklyn. Stay alert.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-zinc-900/90 backdrop-blur-xl border border-zinc-800 px-6 py-3 rounded-full flex gap-10 shadow-2xl z-50">
        <button
          onClick={() => setActiveTab("network")}
          className={`text-xl ${activeTab === "network" ? "grayscale-0 scale-110" : "grayscale opacity-30"}`}
        >
          👥
        </button>
        <button
          onClick={() => setActiveTab("corridor")}
          className={`text-xl ${activeTab === "corridor" ? "grayscale-0 scale-110" : "grayscale opacity-30"}`}
        >
          🚶
        </button>
        <button
          onClick={() => setActiveTab("alerts")}
          className={`text-xl ${activeTab === "alerts" ? "grayscale-0 scale-110" : "grayscale opacity-30"}`}
        >
          🔔
        </button>
      </nav>

      <p className="mt-12 text-[8px] text-zinc-700 text-center uppercase tracking-widest font-black italic">
        Peer-to-Peer Safety Mesh Enabled
      </p>
    </div>
  );
}
