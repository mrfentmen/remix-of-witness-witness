// WitnessZoomControl.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";

// ------------------------------
// SECTION: TYPES
// ------------------------------
interface ZoomMetadata {
  level: number;
  type: "optical" | "digital";
}

// ------------------------------
// SECTION: COMPONENT
// ------------------------------
export default function WitnessZoomControl({
  onZoomChange,
}: {
  onZoomChange?: (m: ZoomMetadata) => void;
}) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [zoomType, setZoomType] = useState<"optical" | "digital">("digital");
  const [showUI, setShowUI] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const uiTimeout = useRef<NodeJS.Timeout | null>(null);

  // Gesture Refs (To bypass React render cycles for 60fps performance)
  const currentZoomRef = useRef(1);
  const isDragging = useRef(false);
  const initialPinchDist = useRef(0);
  const initialPinchZoom = useRef(1);

  // 1. Camera & Capability Init
  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1920 } },
        });
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;

        const track = stream.getVideoTracks()[0];
        const caps = track.getCapabilities?.();

        if (caps.zoom) {
          setZoomType("optical");
        }
      } catch (err) {
        console.error("Camera access denied");
      }
    }
    startCamera();
    return () => streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  // 2. Core Zoom Logic (The "Smooth" Function)
  const applyZoom = useCallback(
    async (val: number) => {
      const clamped = Math.min(5, Math.max(1, val));
      currentZoomRef.current = clamped;
      setZoomLevel(clamped); // Update state for UI only

      const track = streamRef.current?.getVideoTracks()[0];

      // A. Attempt Hardware Zoom
      if (zoomType === "optical" && track) {
        try {
          await track.applyConstraints({ advanced: [{ zoom: clamped }] } as MediaTrackConstraints);
        } catch (e) {
          // If hardware fails, switch to digital fallback
          setZoomType("digital");
        }
      }

      // B. Digital Zoom Fallback (Always applied to ensure visual consistency)
      if (videoRef.current) {
        videoRef.current.style.transform = `scale(${clamped})`;
      }

      onZoomChange?.({ level: clamped, type: zoomType });
      triggerUI();
    },
    [zoomType, onZoomChange],
  );

  // 3. UI Auto-Hide Logic
  const triggerUI = () => {
    setShowUI(true);
    if (uiTimeout.current) clearTimeout(uiTimeout.current);
    uiTimeout.current = setTimeout(() => setShowUI(false), 2500);
  };

  // 4. Gesture Listeners (Pinch & Drag)
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const handleTouch = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dist = Math.hypot(
          e.touches[0].pageX - e.touches[1].clientX,
          e.touches[0].pageY - e.touches[1].clientY,
        );

        if (initialPinchDist.current === 0) {
          initialPinchDist.current = dist;
          initialPinchZoom.current = currentZoomRef.current;
        } else {
          const factor = dist / initialPinchDist.current;
          applyZoom(initialPinchZoom.current * factor);
        }
      }
    };

    const handleEnd = () => {
      initialPinchDist.current = 0;
    };

    window.addEventListener("touchmove", handleTouch, { passive: false });
    window.addEventListener("touchend", handleEnd);
    return () => {
      window.removeEventListener("touchmove", handleTouch);
      window.removeEventListener("touchend", handleEnd);
    };
  }, [applyZoom]);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden select-none touch-none">
      {/* High-Performance Viewfinder */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover transition-transform duration-75 ease-out"
        style={{ transformOrigin: "center center" }}
      />

      {/* Floating Zoom Indicator */}
      {showUI && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="bg-black/60 backdrop-blur-md px-6 py-2 rounded-full border border-white/20 flex flex-col items-center">
            <span className="text-3xl font-black text-white">{zoomLevel.toFixed(1)}x</span>
            <span
              className={`text-[8px] font-bold uppercase tracking-widest ${zoomLevel > 3 ? "text-red-500" : "text-gray-400"}`}
            >
              {zoomType === "optical" ? "Optical Lens" : "Digital Crop"}
            </span>
          </div>
        </div>
      )}

      {/* Manual Control Bar */}
      <div className="absolute bottom-10 inset-x-0 flex flex-col items-center gap-6 px-10">
        {/* Step Buttons */}
        <div className="flex gap-3 bg-black/40 p-1 rounded-full border border-white/10 backdrop-blur-sm">
          {[1, 2, 5].map((v) => (
            <button
              key={v}
              onClick={() => applyZoom(v)}
              className={`w-12 h-12 rounded-full font-bold text-xs transition-all ${zoomLevel === v ? "bg-red-600 text-white" : "bg-transparent text-gray-400"}`}
            >
              {v}x
            </button>
          ))}
        </div>

        {/* Dynamic Zoom Slider */}
        <div className="w-full max-w-xs relative h-12 flex items-center">
          <div className="absolute inset-x-0 h-0.5 bg-gray-800 rounded-full" />
          <input
            type="range"
            min="1"
            max="5"
            step="0.1"
            className="absolute inset-x-0 w-full bg-transparent accent-red-600 cursor-pointer"
            value={zoomLevel}
            onChange={(e) => applyZoom(parseFloat(e.target.value))}
          />
        </div>
      </div>

      {/* Corner Status */}
      <div className="absolute top-6 right-6">
        <div className="bg-red-950/20 border border-red-900 px-3 py-1 rounded-lg">
          <span className="text-[10px] font-black text-red-500 italic">HD SENSOR READY</span>
        </div>
      </div>
    </div>
  );
}
