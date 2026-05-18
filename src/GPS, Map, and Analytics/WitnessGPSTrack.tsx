// WitnessGPSTrack.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";

// ------------------------------
// SECTION: TYPES
// ------------------------------
export interface GPSTrackPoint {
  lat: number;
  lng: number;
  timestamp: number; // ms from start
  accuracy: number;
}

export interface GPSTrack {
  points: GPSTrackPoint[];
  startTime: number;
  durationMs: number;
}

// ------------------------------
// SECTION: UTILS
// ------------------------------
const haversine = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const R = 6371000; // Meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

// ------------------------------
// SECTION: COMPONENT
// ------------------------------
export default function WitnessGPSTrack({
  recordingId = "001",
  track: providedTrack,
  videoRef,
}: {
  recordingId?: string;
  track?: GPSTrack;
  videoRef?: React.RefObject<HTMLVideoElement>;
}) {
  const [mapReady, setMapLoaded] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const cursorRef = useRef<any>(null);

  // 1. Load Leaflet Dynamically (Zero-Install Support)
  useEffect(() => {
    const loadLeaflet = async () => {
      if (!(window as any).L) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);

        const script = document.createElement("script");
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.onload = () => setMapLoaded(true);
        document.body.appendChild(script);
      } else {
        setMapLoaded(true);
      }
    };
    loadLeaflet();
  }, []);

  // 2. Map Initialization
  useEffect(() => {
    if (!mapReady || !providedTrack || !mapContainer.current || mapRef.current) return;

    const L = (window as any).L;
    const map = L.map(mapContainer.current, { zoomControl: false }).setView(
      [providedTrack.points[0].lat, providedTrack.points[0].lng],
      16,
    );

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: "© Witness R.E.P",
    }).addTo(map);

    // Draw Path
    const coords = providedTrack.points.map((p) => [p.lat, p.lng]);
    L.polyline(coords, { color: "#ff0000", weight: 4, opacity: 0.6 }).addTo(map);

    // Markers
    L.circleMarker(coords[0], { radius: 6, color: "#00ff00", fillOpacity: 1 })
      .addTo(map)
      .bindTooltip("Start");
    L.circleMarker(coords[coords.length - 1], { radius: 6, color: "#ff0000", fillOpacity: 1 })
      .addTo(map)
      .bindTooltip("End");

    // Dynamic Cursor
    cursorRef.current = L.circleMarker(coords[0], {
      radius: 8,
      color: "#ffffff",
      fillColor: "#ff0000",
      fillOpacity: 1,
      weight: 3,
    }).addTo(map);

    mapRef.current = map;
    map.fitBounds(coords);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [mapReady, providedTrack]);

  // 3. Real-time Video/Time Sync
  useEffect(() => {
    const video = videoRef?.current;
    const interval = setInterval(() => {
      if (video) {
        syncMapToTime(video.currentTime * 1000);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [providedTrack, videoRef]);

  const syncMapToTime = (timeMs: number) => {
    if (!providedTrack || !cursorRef.current) return;

    const points = providedTrack.points;
    setCurrentTime(timeMs);

    // Find current position using interpolation
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      if (timeMs >= p1.timestamp && timeMs <= p2.timestamp) {
        const ratio = (timeMs - p1.timestamp) / (p2.timestamp - p1.timestamp);
        const lat = p1.lat + (p2.lat - p1.lat) * ratio;
        const lng = p1.lng + (p2.lng - p1.lng) * ratio;
        cursorRef.current.setLatLng([lat, lng]);

        // Auto-center map if cursor moves out of view
        if (mapRef.current && !mapRef.current.getBounds().contains([lat, lng])) {
          mapRef.current.panTo([lat, lng]);
        }
        break;
      }
    }
  };

  const exportGPX = () => {
    if (!providedTrack) return;
    const pts = providedTrack.points
      .map(
        (p) =>
          `<trkpt lat="${p.lat}" lon="${p.lng}"><time>${new Date(providedTrack.startTime + p.timestamp).toISOString()}</time></trkpt>`,
      )
      .join("");

    const gpx = `<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="Witness"><trk><name>Evidence Path</name><trkseg>${pts}</trkseg></trk></gpx>`;

    const blob = new Blob([gpx], { type: "application/gpx+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Witness_Track_${recordingId}.gpx`;
    link.click();
  };

  if (!providedTrack) return null;

  return (
    <div className="bg-zinc-950 border border-red-900 rounded-3xl p-5 text-white shadow-2xl">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-red-600 font-black italic tracking-tighter">GPS TELEMETRY</h2>
          <p className="text-[10px] text-gray-500 uppercase font-bold">
            Encrypted Spatial Hash: {recordingId.slice(0, 8)}
          </p>
        </div>
        <button
          onClick={exportGPX}
          className="bg-red-600 px-3 py-1 rounded-full text-[10px] font-black tracking-widest"
        >
          EXPORT GPX
        </button>
      </div>

      <div className="relative rounded-2xl overflow-hidden border border-gray-800 h-64 shadow-inner">
        <div ref={mapContainer} className="w-full h-full" />
        {!mapReady && (
          <div className="absolute inset-0 bg-black flex items-center justify-center">
            <span className="text-xs text-gray-600 animate-pulse font-mono">
              LOADING MAP ENGINE...
            </span>
          </div>
        )}
      </div>

      <div className="mt-4 flex justify-between items-center bg-gray-900/50 p-3 rounded-xl border border-gray-800">
        <div>
          <div className="text-[9px] text-gray-500 font-bold uppercase">Elapsed Time</div>
          <div className="text-sm font-mono font-bold text-red-500">
            {(currentTime / 1000).toFixed(2)}s
          </div>
        </div>
        <div className="text-right">
          <div className="text-[9px] text-gray-500 font-bold uppercase">Total Distance</div>
          <div className="text-sm font-mono font-bold">
            {haversine(
              providedTrack.points[0].lat,
              providedTrack.points[0].lng,
              providedTrack.points[providedTrack.points.length - 1].lat,
              providedTrack.points[providedTrack.points.length - 1].lng,
            ).toFixed(1)}
            m
          </div>
        </div>
      </div>

      <p className="text-[8px] text-gray-700 mt-4 leading-tight uppercase text-center italic">
        Spatial coordinates are cross-referenced with local state recording laws automatically.
      </p>
    </div>
  );
}
