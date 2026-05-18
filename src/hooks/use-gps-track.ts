import { useCallback, useEffect, useRef, useState } from "react";
import type { GPSTrackPoint } from "@/lib/witness-db";

const SAMPLE_INTERVAL_MS = 5_000;

export interface UseGpsTrack {
  /** Begin sampling. Resets the buffer and starts a 5s polling interval. */
  start: () => void;
  /** Stop sampling and return the captured points. */
  stop: () => GPSTrackPoint[];
  /** Read the current buffer without stopping. */
  current: () => GPSTrackPoint[];
  /** Whether sampling is active. */
  active: boolean;
}

/**
 * Polls navigator.geolocation while a recording is active and stores one
 * GPSTrackPoint every 5 seconds (timestamp is ms since `start()` was called).
 */
export function useGpsTrack(enabled: boolean): UseGpsTrack {
  const pointsRef = useRef<GPSTrackPoint[]>([]);
  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);
  const lastPosRef = useRef<GeolocationPosition | null>(null);
  const [active, setActive] = useState(false);

  const cleanup = useCallback(() => {
    if (watchIdRef.current != null && navigator.geolocation) {
      try {
        navigator.geolocation.clearWatch(watchIdRef.current);
      } catch {
        /* noop */
      }
      watchIdRef.current = null;
    }
    if (intervalRef.current != null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    if (!enabled || typeof navigator === "undefined" || !navigator.geolocation) {
      return;
    }
    cleanup();
    pointsRef.current = [];
    startedAtRef.current = Date.now();
    lastPosRef.current = null;
    setActive(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        lastPosRef.current = pos;
      },
      () => undefined,
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 15_000 },
    );

    intervalRef.current = window.setInterval(() => {
      const pos = lastPosRef.current;
      if (!pos) return;
      pointsRef.current.push({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        timestamp: Date.now() - startedAtRef.current,
        accuracy: pos.coords.accuracy,
      });
    }, SAMPLE_INTERVAL_MS);
  }, [enabled, cleanup]);

  const stop = useCallback((): GPSTrackPoint[] => {
    cleanup();
    setActive(false);
    return pointsRef.current.slice();
  }, [cleanup]);

  const current = useCallback(() => pointsRef.current.slice(), []);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  return { start, stop, current, active };
}
