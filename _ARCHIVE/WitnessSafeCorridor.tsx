// WitnessSafeCorridor.tsx
import React, { useState, useEffect, useRef } from "react";

// ------------------------------
// SECTION: TYPES
// ------------------------------
interface TrustedContact {
  id: string;
  name: string;
  number: string;
}

interface CorridorSettings {
  destination: string;
  startTime: number; // Timestamp
  durationSeconds: number;
  lastLocation: { lat: number; lng: number } | null;
  extendedCount: number;
}

// ------------------------------
// SECTION: COMPONENT
// ------------------------------
const WitnessSafeCorridor: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [settings, setSettings] = useState<CorridorSettings | null>(null);
  const [remainingTime, setRemainingTime] = useState(0);
  const [contacts, setContacts] = useState<TrustedContact[]>([]);

  // Setup State
  const [destInput, setDestInput] = useState("");
  const [minutesInput, setMinutesInput] = useState(20);

  const timerRef = useRef<number | null>(null);
  const gpsRef = useRef<number | null>(null);

  // 1. Persistence & Recovery
  useEffect(() => {
    const savedContacts = localStorage.getItem("trusted_contacts");
    if (savedContacts) setContacts(JSON.parse(savedContacts));

    const savedCorridor = localStorage.getItem("witness_safe_corridor");
    if (savedCorridor) {
      const parsed = JSON.parse(savedCorridor) as CorridorSettings;
      const elapsed = (Date.now() - parsed.startTime) / 1000;
      const remaining = parsed.durationSeconds - elapsed;

      if (remaining <= 0) {
        handleExpiration(parsed);
      } else {
        setSettings(parsed);
        setIsActive(true);
      }
    }
  }, []);

  // 2. The Core Timer Logic
  useEffect(() => {
    if (isActive && settings) {
      timerRef.current = window.setInterval(() => {
        const elapsed = (Date.now() - settings.startTime) / 1000;
        const remaining = Math.max(0, settings.durationSeconds - elapsed);

        setRemainingTime(Math.floor(remaining));

        if (remaining <= 0) {
          handleExpiration(settings);
        }
      }, 1000);

      // GPS Tracking every 30 seconds
      gpsRef.current = window.setInterval(updateLocation, 30000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (gpsRef.current) clearInterval(gpsRef.current);
    };
  }, [isActive, settings]);

  const updateLocation = () => {
    navigator.geolocation.getCurrentPosition((pos) => {
      if (settings) {
        const updated = {
          ...settings,
          lastLocation: { lat: pos.coords.latitude, lng: pos.coords.longitude },
        };
        setSettings(updated);
        localStorage.setItem("witness_safe_corridor", JSON.stringify(updated));
      }
    });
  };

  const handleExpiration = (expiredSettings: CorridorSettings) => {
    setIsActive(false);
    localStorage.removeItem("witness_safe_corridor");
    console.error("SOS TRIGGERED: Corridor Expired for", expiredSettings.destination);
    alert("TIME EXPIRED: Emergency contacts have been notified of your last location.");
    // In real app, call your SMS API here
  };

  // 3. User Actions
  const startCorridor = () => {
    if (!destInput) return alert("Enter a destination");

    const newSettings: CorridorSettings = {
      destination: destInput,
      startTime: Date.now(),
      durationSeconds: minutesInput * 60,
      lastLocation: null,
      extendedCount: 0,
    };

    setSettings(newSettings);
    setIsActive(true);
    localStorage.setItem("witness_safe_corridor", JSON.stringify(newSettings));
  };

  const checkIn = () => {
    setIsActive(false);
    setSettings(null);
    localStorage.removeItem("witness_safe_corridor");
    alert("Check-in successful. Corridor deactivated.");
  };

  const extendTime = () => {
    if (settings && settings.extendedCount < 3) {
      const updated = {
        ...settings,
        durationSeconds: settings.durationSeconds + 10 * 60, // Add 10 mins
        extendedCount: settings.extendedCount + 1,
      };
      setSettings(updated);
      localStorage.setItem("witness_safe_corridor", JSON.stringify(updated));
    } else {
      alert("Maximum extensions reached.");
    }
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.floor(totalSeconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 font-sans flex flex-col items-center justify-center">
      <h1 className="text-3xl font-black text-red-600 mb-8 italic">SAFE CORRIDOR</h1>

      {!isActive ? (
        <div className="w-full max-w-md bg-gray-900 p-6 rounded-2xl border border-gray-800 space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Destination</label>
            <input
              className="w-full bg-black border border-gray-700 p-3 rounded-lg mt-1"
              placeholder="e.g. Walking home from Subway"
              value={destInput}
              onChange={(e) => setDestInput(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">
              Expected Time ({minutesInput}m)
            </label>
            <input
              type="range"
              min="5"
              max="60"
              step="5"
              className="w-full accent-red-600 mt-2"
              value={minutesInput}
              onChange={(e) => setMinutesInput(parseInt(e.target.value))}
            />
          </div>
          <button
            onClick={startCorridor}
            className="w-full bg-red-600 py-4 rounded-xl font-bold hover:bg-red-700 transition-colors"
          >
            ACTIVATE CORRIDOR
          </button>
        </div>
      ) : (
        <div className="w-full max-w-md bg-gray-900 p-8 rounded-2xl border-l-8 border-red-600 text-center space-y-6">
          <div className="text-6xl font-mono text-red-500 font-black">
            {formatTime(remainingTime)}
          </div>
          <p className="text-gray-400 text-sm">
            Heading to: <br />
            <span className="text-white font-bold">{settings?.destination}</span>
          </p>

          <div className="flex gap-4">
            <button onClick={checkIn} className="flex-1 bg-green-700 py-4 rounded-xl font-bold">
              I'M SAFE
            </button>
            <button
              onClick={extendTime}
              className="flex-1 bg-gray-800 py-4 rounded-xl font-bold border border-gray-700"
            >
              +10 MIN
            </button>
          </div>
          <p className="text-[10px] text-gray-600 uppercase tracking-widest">
            Auto-SOS will trigger if timer hits 00:00
          </p>
        </div>
      )}
    </div>
  );
};

export default WitnessSafeCorridor;
