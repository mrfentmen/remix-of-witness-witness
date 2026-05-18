import { useCallback, useEffect, useRef, useState } from "react";

interface CapabilitiesWithZoom extends MediaTrackCapabilities {
  zoom?: { min: number; max: number; step: number };
}
interface ConstraintsWithZoom extends MediaTrackConstraintSet {
  zoom?: number;
}

export interface UseZoomResult {
  level: number;
  type: "optical" | "digital";
  min: number;
  max: number;
  setLevel: (n: number) => void;
  bindPinch: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
  };
}

/**
 * Zoom for a video track. Uses hardware `applyConstraints({ zoom })` when
 * supported (optical), else CSS transform on the supplied element (digital).
 */
export function useZoom(
  stream: MediaStream | null,
  cssTarget: React.RefObject<HTMLElement | null>,
): UseZoomResult {
  const [level, setLevelState] = useState(1);
  const [type, setType] = useState<"optical" | "digital">("digital");
  const [min, setMin] = useState(1);
  const [max, setMax] = useState(5);
  const startDistRef = useRef<number | null>(null);
  const startLevelRef = useRef<number>(1);

  useEffect(() => {
    const track = stream?.getVideoTracks()[0];
    if (!track) return;
    const caps = (track.getCapabilities?.() ?? {}) as CapabilitiesWithZoom;
    if (caps.zoom) {
      setType("optical");
      setMin(caps.zoom.min);
      setMax(caps.zoom.max);
      setLevelState(caps.zoom.min);
    } else {
      setType("digital");
      setMin(1);
      setMax(5);
      setLevelState(1);
    }
  }, [stream]);

  const setLevel = useCallback(
    (n: number) => {
      const clamped = Math.max(min, Math.min(max, n));
      setLevelState(clamped);
      const track = stream?.getVideoTracks()[0];
      if (track && type === "optical") {
        const c: ConstraintsWithZoom = { zoom: clamped };
        track.applyConstraints({ advanced: [c] } as MediaTrackConstraints).catch(() => {});
      } else if (cssTarget.current) {
        cssTarget.current.style.transform = `scale(${clamped})`;
        cssTarget.current.style.transformOrigin = "center center";
      }
    },
    [min, max, stream, type, cssTarget],
  );

  const dist = (e: React.TouchEvent) => {
    const a = e.touches[0];
    const b = e.touches[1];
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  };

  const bindPinch = {
    onTouchStart: (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        startDistRef.current = dist(e);
        startLevelRef.current = level;
      }
    },
    onTouchMove: (e: React.TouchEvent) => {
      if (e.touches.length === 2 && startDistRef.current) {
        const ratio = dist(e) / startDistRef.current;
        setLevel(startLevelRef.current * ratio);
      }
    },
    onTouchEnd: () => {
      startDistRef.current = null;
    },
  };

  return { level, type, min, max, setLevel, bindPinch };
}
