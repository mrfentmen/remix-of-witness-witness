// WitnessHardwareIntegration.tsx
import React, { useState, useEffect, useRef } from "react";

// ------------------------------
// SECTION: Haptics Utility
// ------------------------------
const useHaptics = () => {
  const trigger = (pattern: number | number[]) => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  };
  return {
    short: () => trigger(50),
    success: () => trigger([50, 30, 50]),
    error: () => trigger([100, 50, 100]),
    warning: () => trigger(200),
  };
};

// ------------------------------
// SECTION: Hardware Listeners (Volume Buttons)
// ------------------------------
export function HardwareTriggersUI() {
  const [enabled, setEnabled] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const haptics = useHaptics();
  const lastPress = useRef(0);

  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      if (!enabled) return;
      // Note: Volume keys only work in browsers if the app is installed as a PWA
      if (e.key === "VolumeUp" || e.key === "VolumeDown") {
        const now = Date.now();
        if (now - lastPress.current < 500) {
          setIsRecording((prev) => !prev);
          haptics.success();
        }
        lastPress.current = now;
      }
    };
    window.addEventListener("keydown", handleKeys);
    return () => window.removeEventListener("keydown", handleKeys);
  }, [enabled, haptics]);

  return (
    <div className="bg-gray-900 p-4 rounded-xl border-l-4 border-red-600 space-y-3 text-white">
      <h3 className="font-bold text-red-500">Physical Triggers</h3>
      <div className="flex justify-between items-center text-sm">
        <span>Volume Quick-Start</span>
        <button
          onClick={() => setEnabled(!enabled)}
          className={`px-3 py-1 rounded-full ${enabled ? "bg-red-600" : "bg-gray-800"}`}
        >
          {enabled ? "ENABLED" : "DISABLED"}
        </button>
      </div>
      <div
        className={`text-center p-2 rounded text-xs font-bold ${isRecording ? "bg-red-900 animate-pulse" : "bg-black"}`}
      >
        {isRecording ? "🔴 QUICK-RECORD ACTIVE" : "Double-click Volume to start"}
      </div>
    </div>
  );
}

// ------------------------------
// SECTION: Vehicle Mode (Dashcam)
// ------------------------------
export function DashcamUI() {
  const [isActive, setIsActive] = useState(false);
  const [loopTime, setLoopTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startDashcam = async () => {
    setIsActive(true);
    // Try to lock orientation (only works in Fullscreen/PWA on mobile)
    try {
      if (screen.orientation && (screen.orientation as any).lock) {
        await (screen.orientation as any).lock("landscape");
      }
    } catch (e) {
      console.log("Orientation lock not supported on this device");
    }

    timerRef.current = setInterval(() => {
      setLoopTime((prev) => (prev + 1) % 1800); // 30 min loop
    }, 1000);
  };

  const stopDashcam = () => {
    setIsActive(false);
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      screen.orientation.unlock();
    } catch {
      /* orientation unlock not supported */
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}m ${s % 60}s`;

  return (
    <div className="bg-gray-900 p-4 rounded-xl border-l-4 border-red-600 text-white space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-red-500">Vehicle Mode</h3>
        <button
          onClick={isActive ? stopDashcam : startDashcam}
          className={`px-4 py-1 rounded-full text-sm font-bold ${isActive ? "bg-red-600" : "bg-gray-800"}`}
        >
          {isActive ? "STOP" : "START DASHCAM"}
        </button>
      </div>
      {isActive && (
        <div className="bg-black p-3 rounded border border-gray-800">
          <div className="text-[10px] text-gray-500 uppercase">Loop Buffer (30m Max)</div>
          <div className="text-xl font-mono text-red-500">{formatTime(loopTime)}</div>
          <p className="text-[10px] text-yellow-600 mt-1 italic">
            Accelerometer active: Auto-detecting traffic stops...
          </p>
        </div>
      )}
    </div>
  );
}

// ------------------------------
// SECTION: Ambient Sensors (Siren/Shouting Detection)
// ------------------------------
export function AmbientMonitorUI() {
  const [isListening, setIsListening] = useState(false);
  const [detection, setDetection] = useState("Silent");
  const audioCtx = useRef<AudioContext | null>(null);

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioCtx.current = new AudioContext();
      const source = audioCtx.current.createMediaStreamSource(stream);
      const analyser = audioCtx.current.createAnalyser();
      source.connect(analyser);

      setIsListening(true);

      // Simulated detection logic
      const interval = setInterval(() => {
        const rand = Math.random();
        if (rand > 0.95) setDetection("🚨 SIREN DETECTED");
        else if (rand > 0.85) setDetection("🗣️ SHOUTING DETECTED");
        else setDetection("Listening...");
      }, 2000);

      (audioCtx.current as any)._interval = interval;
    } catch (err) {
      alert("Microphone access is required for environmental monitoring.");
    }
  };

  const stopListening = () => {
    setIsListening(false);
    setDetection("Silent");
    if (audioCtx.current) {
      clearInterval((audioCtx.current as any)._interval);
      audioCtx.current.close();
    }
  };

  return (
    <div className="bg-gray-900 p-4 rounded-xl border-l-4 border-red-600 text-white space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-red-500">Audio Analytics</h3>
        <button
          onClick={isListening ? stopListening : startListening}
          className={`px-4 py-1 rounded-full text-sm font-bold ${isListening ? "bg-red-600" : "bg-gray-800"}`}
        >
          {isListening ? "STOP" : "START SENSORS"}
        </button>
      </div>
      <div className="text-center py-2 bg-black rounded border border-gray-800">
        <span
          className={`text-sm font-bold ${detection.includes("DET") ? "text-red-500 animate-bounce" : "text-gray-500"}`}
        >
          {detection}
        </span>
      </div>
    </div>
  );
}

// ------------------------------
// SECTION: Main Application
// ------------------
