import { useEffect, useRef, useState } from "react";
import { Download, MapPin } from "lucide-react";
import type { GPSTrackPoint } from "@/lib/witness-db";

interface Props {
  recordingId: string;
  track: GPSTrackPoint[];
  /** Recording start time (epoch ms), used as time origin for GPX timestamps. */
  startedAt: number;
  /** Optional: bind cursor to a video element's currentTime. */
  videoRef?: React.RefObject<HTMLVideoElement | null>;
}

type LeafletNs = typeof import("leaflet");
type LeafletMap = import("leaflet").Map;
type LeafletCircle = import("leaflet").CircleMarker;

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function totalDistance(points: GPSTrackPoint[]): number {
  let d = 0;
  for (let i = 1; i < points.length; i++) {
    d += haversine(points[i - 1].lat, points[i - 1].lng, points[i].lat, points[i].lng);
  }
  return d;
}

export function GpsTrackViewer({ recordingId, track, startedAt, videoRef }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const cursorRef = useRef<LeafletCircle | null>(null);
  const [ready, setReady] = useState(false);
  const [currentMs, setCurrentMs] = useState(0);

  useEffect(() => {
    if (!containerRef.current || mapRef.current || track.length === 0) return;
    let cancelled = false;

    void (async () => {
      const L = (await import("leaflet")).default as LeafletNs;
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !containerRef.current) return;

      const coords: Array<[number, number]> = track.map((p) => [p.lat, p.lng]);
      const map = L.map(containerRef.current, { zoomControl: false }).setView(coords[0], 16);
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: "© OSM © CARTO",
        subdomains: "abcd",
        maxZoom: 19,
      }).addTo(map);

      L.polyline(coords, { color: "#f97316", weight: 4, opacity: 0.85 }).addTo(map);
      L.circleMarker(coords[0], {
        radius: 6,
        color: "#22c55e",
        fillColor: "#22c55e",
        fillOpacity: 1,
      })
        .addTo(map)
        .bindTooltip("Start");
      L.circleMarker(coords[coords.length - 1], {
        radius: 6,
        color: "#ef4444",
        fillColor: "#ef4444",
        fillOpacity: 1,
      })
        .addTo(map)
        .bindTooltip("End");

      cursorRef.current = L.circleMarker(coords[0], {
        radius: 8,
        color: "#ffffff",
        fillColor: "#f97316",
        fillOpacity: 1,
        weight: 3,
      }).addTo(map);

      map.fitBounds(coords);
      mapRef.current = map;
      setReady(true);
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      cursorRef.current = null;
    };
  }, [track]);

  // Sync cursor to <video> currentTime, polling every 100ms.
  useEffect(() => {
    const video = videoRef?.current;
    if (!video || !ready || track.length === 0) return;
    const interval = window.setInterval(() => {
      const ms = video.currentTime * 1000;
      setCurrentMs(ms);
      const cursor = cursorRef.current;
      if (!cursor) return;
      for (let i = 0; i < track.length - 1; i++) {
        const p1 = track[i];
        const p2 = track[i + 1];
        if (ms >= p1.timestamp && ms <= p2.timestamp) {
          const span = p2.timestamp - p1.timestamp || 1;
          const ratio = (ms - p1.timestamp) / span;
          const lat = p1.lat + (p2.lat - p1.lat) * ratio;
          const lng = p1.lng + (p2.lng - p1.lng) * ratio;
          cursor.setLatLng([lat, lng]);
          return;
        }
      }
      // Out of range: snap to last point.
      const last = track[track.length - 1];
      cursor.setLatLng([last.lat, last.lng]);
    }, 100);
    return () => window.clearInterval(interval);
  }, [ready, track, videoRef]);

  function exportGPX() {
    const segments = track
      .map(
        (p) =>
          `<trkpt lat="${p.lat}" lon="${p.lng}"><time>${new Date(
            startedAt + p.timestamp,
          ).toISOString()}</time></trkpt>`,
      )
      .join("");
    const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Witness R.E.P">
  <trk><name>Recording ${recordingId}</name><trkseg>${segments}</trkseg></trk>
</gpx>`;
    const blob = new Blob([gpx], { type: "application/gpx+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `witness-track-${recordingId.slice(0, 8)}.gpx`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  if (track.length === 0) return null;

  const distM = totalDistance(track);
  const distLabel = distM > 1000 ? `${(distM / 1000).toFixed(2)} km` : `${distM.toFixed(0)} m`;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between gap-2 border-b border-border bg-secondary/40 px-3 py-2">
        <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 text-primary" />
          GPS track · {track.length} pts · {distLabel}
        </div>
        <button
          type="button"
          onClick={exportGPX}
          className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground active:scale-95"
        >
          <Download className="h-3 w-3" />
          GPX
        </button>
      </div>
      <div ref={containerRef} className="h-56 w-full" aria-label="Recording GPS track" />
      {videoRef && (
        <p className="px-3 py-2 text-[10px] text-muted-foreground">
          Cursor follows playback · {(currentMs / 1000).toFixed(1)}s
        </p>
      )}
    </div>
  );
}
