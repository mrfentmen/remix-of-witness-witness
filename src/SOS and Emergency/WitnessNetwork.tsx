// WitnessNetwork.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";

// ------------------------------
// SECTION: TYPES & UTILS
// ------------------------------
interface Coords {
  lat: number;
  lng: number;
}

interface WitnessEvent {
  id: string;
  requesterId: string;
  location: Coords;
  timestamp: number;
  witnessCount: number;
  status: "active" | "resolved";
}

const getDistanceMiles = (p1: Coords, p2: Coords) => {
  const R = 3958.8; // Miles
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

// ------------------------------
// SECTION: MAIN COMPONENT
// ------------------------------
export default function WitnessNetwork() {
  const [myLocation, setMyLocation] = useState<Coords | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [activeIncident, setActiveIncident] = useState<WitnessEvent | null>(null);
  const [nearbyCount, setNearbyCount] = useState(0);
  const [watchingCount, setWatchingCount] = useState(0);

  const userId = useRef(crypto.randomUUID());
  const notifiedIds = useRef(new Set<string>());

  // 1. Initialize Location
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => console.error("GPS Access Denied"),
      { enableHighAccuracy: true },
    );
  }, []);

  // 2. Network Heartbeat (Simulated via LocalStorage)
  useEffect(() => {
    const heartbeat = setInterval(() => {
      if (!myLocation) return;

      const raw = localStorage.getItem("witness_global_events");
      const events: WitnessEvent[] = raw ? JSON.parse(raw) : [];

      // A. Check for nearby emergencies (within 2 miles)
      const emergency = events.find(
        (e) =>
          e.status === "active" &&
          e.requesterId !== userId.current &&
          getDistanceMiles(myLocation, e.location) < 2.0,
      );

      if (emergency && isAvailable && !notifiedIds.current.has(emergency.id)) {
        triggerAlert(emergency);
      }

      // B. If I am the requester, check how many people are watching me
      const myEvent = events.find((e) => e.requesterId === userId.current && e.status === "active");
      if (myEvent) setWatchingCount(myEvent.witnessCount);

      // C. Simulate nearby available witness count
      setNearbyCount(Math.floor(Math.random() * 5) + 3); // Mocking active network
    }, 3000);

    return () => clearInterval(heartbeat);
  }, [myLocation, isAvailable]);

  const triggerAlert = (event: WitnessEvent) => {
    notifiedIds.current.add(event.id);
    setActiveIncident(event);

    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    if (Notification.permission === "granted") {
      new Notification("⚠️ NEARBY EMERGENCY", {
        body: "A Witness R.E.P user nearby needs an observer. Tap to watch.",
      });
    }
  };

  const startGlobalSOS = () => {
    if (!myLocation) return;
    const newEvent: WitnessEvent = {
      id: crypto.randomUUID(),
      requesterId: userId.current,
      location: myLocation,
      timestamp: Date.now(),
      witnessCount: 0,
      status: "active",
    };

    const raw = localStorage.getItem("witness_global_events");
    const events = raw ? JSON.parse(raw) : [];
    events.push(newEvent);
    localStorage.setItem("witness_global_events", JSON.stringify(events));

    alert("SOS Broadast to Network. Witnesses notified.");
  };

  const joinAsWitness = () => {
    if (!activeIncident) return;

    const raw = localStorage.getItem("witness_global_events");
    const events: WitnessEvent[] = raw ? JSON.parse(raw) : [];
    const target = events.find((e) => e.id === activeIncident.id);

    if (target) {
      target.witnessCount += 1;
      localStorage.setItem("witness_global_events", JSON.stringify(events));
      alert("You are now a verified witness. Requester has been notified.");
      setActiveIncident(null);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 font-sans">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-black italic text-red-600">WITNESS NETWORK</h1>
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${isAvailable ? "bg-green-500 animate-pulse" : "bg-gray-700"}`}
          />
          <span className="text-[10px] uppercase font-bold text-gray-400">
            {isAvailable ? "Available" : "Offline"}
          </span>
        </div>
      </header>

      {/* Network Stats Card */}
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 mb-6 text-center">
        <div className="text-gray-500 text-xs uppercase font-bold mb-4 tracking-widest">
          Nearby Coverage
        </div>
        <div className="flex justify-around items-center">
          <div>
            <div className="text-3xl font-black text-red-500">{nearbyCount}</div>
            <div className="text-[10px] text-gray-400">Witnesses</div>
          </div>
          <div className="w-px h-10 bg-gray-800" />
          <div>
            <div className="text-3xl font-black text-red-500">{watchingCount}</div>
            <div className="text-[10px] text-gray-400">Watching You</div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <button
          onClick={() => setIsAvailable(!isAvailable)}
          className={`w-full py-4 rounded-xl font-bold border transition-all ${isAvailable ? "bg-green-900/20 border-green-700 text-green-500" : "bg-gray-900 border-gray-700 text-gray-400"}`}
        >
          {isAvailable ? "STOP OBSERVING" : "BECOME A WITNESS"}
        </button>

        <button
          onClick={startGlobalSOS}
          className="w-full bg-red-600 py-6 rounded-xl font-black text-lg shadow-xl shadow-red-900/20"
        >
          REQUEST WITNESSES
        </button>
      </div>

      {/* Emergency Modal */}
      {activeIncident && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-6 z-50">
          <div className="bg-gray-900 border-2 border-red-600 rounded-3xl p-8 text-center max-w-xs w-full">
            <div className="text-5xl mb-4 animate-bounce">⚠️</div>
            <h2 className="text-xl font-black mb-2">NEARBY SOS</h2>
            <p className="text-xs text-gray-400 mb-6">
              A user within 2.0 miles is requesting a digital witness. View their live metadata now.
            </p>
            <div className="flex flex-col gap-3">
              <button onClick={joinAsWitness} className="bg-red-600 py-3 rounded-xl font-bold">
                START WATCHING
              </button>
              <button onClick={() => setActiveIncident(null)} className="text-gray-500 text-sm">
                Ignore
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="mt-10 text-[10px] text-gray-600 text-center uppercase tracking-tighter leading-tight">
        By joining the network, you agree to observe and record incidents <br />
        fairly and provide evidence if legally requested.
      </p>
    </div>
  );
}
