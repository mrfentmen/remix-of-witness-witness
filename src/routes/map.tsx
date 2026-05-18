import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  Crosshair,
  Flame,
  Flag,
  Radio,
  Search,
  Shield,
  Video,
  Wind,
  X,
} from "lucide-react";
import {
  getActiveStreams,
  getPublicRecordings,
  type MapRecording,
  type MapStream,
} from "@/lib/map-data";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { listSharedContacts, type SharedContact } from "@/lib/contact-locations";
import { RECORDING_CATEGORIES, type RecordingCategory } from "@/lib/witness-categories";
import { geocode, type GeocodeResult } from "@/lib/nominatim";
import { disasterColor, getDisasters, type DisasterEvent } from "@/lib/eonet";
import { getAnalytics, safetyScoreForCell, type AnalyticsResult } from "@/lib/witness-analytics";
import {
  categoryAllowed,
  contentFilterFor,
  fetchProfileExtras,
  type ContentFilterLevel,
} from "@/lib/witness-youth";
import { fetchManyUserBadges, badgeTagsHtml, type VerifiedBadge } from "@/lib/witness-badges";

// Haversine distance in meters
function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

const RADIUS_OPTIONS = [
  { value: 0, label: "Off" },
  { value: 1, label: "1 km" },
  { value: 5, label: "5 km" },
  { value: 10, label: "10 km" },
  { value: 25, label: "25 km" },
  { value: 50, label: "50 km" },
];

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "Live Map — Witness R.E.P" },
      {
        name: "description",
        content: "Live streams and recent public recordings near you.",
      },
    ],
  }),
  component: MapScreen,
});

const RECORDING_COLOR = "#f97316"; // orange-500
const STREAM_COLOR = "#ef4444"; // red-500
const REPORT_COLOR = "#eab308"; // yellow-500 for report pins
const ME_COLOR = "#ef4444"; // me = red dot, slow pulse
const CONTACT_COLOR = "#22c55e"; // green-500
const SOS_COLOR = "#ef4444"; // shared contact in SOS = red, fast pulse
const DISASTER_DEFAULT = "#fbbf24";

const DATE_RANGES: Array<{ key: string; label: string; hours: number }> = [
  { key: "24h", label: "24h", hours: 24 },
  { key: "7d", label: "7d", hours: 24 * 7 },
  { key: "30d", label: "30d", hours: 24 * 30 },
];

function MapScreen() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const recCluster = useRef<import("leaflet").MarkerClusterGroup | null>(null);
  const liveCluster = useRef<import("leaflet").MarkerClusterGroup | null>(null);
  const meMarkerRef = useRef<import("leaflet").Marker | null>(null);
  const contactLayer = useRef<import("leaflet").LayerGroup | null>(null);
  const contactMarkers = useRef<Map<string, import("leaflet").Marker>>(new Map());
  const meWatchId = useRef<number | null>(null);
  const heatLayerRef = useRef<import("leaflet").HeatLayer | null>(null);
  const disasterLayerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const lastRecordingsRef = useRef<MapRecording[]>([]);
  const meLatLngRef = useRef<[number, number] | null>(null);

  const [showLive, setShowLive] = useState(true);
  const [showRecent, setShowRecent] = useState(true);
  const [counts, setCounts] = useState({ live: 0, recent: 0 });
  const [loading, setLoading] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showDisasters, setShowDisasters] = useState(false);
  const [disasterStale, setDisasterStale] = useState(false);
  const [disasterCount, setDisasterCount] = useState(0);
  const [rangeKey, setRangeKey] = useState<string>("24h");
  const [activeCats, setActiveCats] = useState<RecordingCategory[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<GeocodeResult[]>([]);
  const [searchBusy, setSearchBusy] = useState(false);
  const [safety, setSafety] = useState<{ score: number; sample: number } | null>(null);
  const [contentLevel, setContentLevel] = useState<ContentFilterLevel>("full");

  // Verified badges cache for popup display
  const badgeMapRef = useRef<Map<string, VerifiedBadge[]>>(new Map());

  // Radius filter
  const [radiusKm, setRadiusKm] = useState(0);

  // Report modal
  const [reportOpen, setReportOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<{
    type: "recording" | "stream";
    id: string;
    lat: number;
    lng: number;
  } | null>(null);
  const [reportCategory, setReportCategory] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);

  // Wire global report handler for Leaflet popup buttons
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__witnessReport = (
      type: string,
      id: string,
      lat: number,
      lng: number,
    ) => {
      setReportTarget({ type: type as "recording" | "stream", id, lat, lng });
      setReportOpen(true);
      setReportCategory("");
      setReportDescription("");
    };
    return () => {
      delete (window as unknown as Record<string, unknown>).__witnessReport;
    };
  }, []);

  async function submitReport() {
    if (!reportTarget || !reportCategory.trim()) {
      toast.error("Select a category");
      return;
    }
    setReportSubmitting(true);
    try {
      const { error } = await supabase.from("reports").insert({
        target_type: reportTarget.type,
        target_id: reportTarget.id,
        lat: reportTarget.lat,
        lng: reportTarget.lng,
        category: reportCategory,
        description: reportDescription.trim() || null,
      });
      if (error) throw error;
      toast.success("Report submitted");
      setReportOpen(false);
      setReportTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Report failed");
    } finally {
      setReportSubmitting(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const extras = await fetchProfileExtras();
        if (!cancelled) setContentLevel(contentFilterFor(extras));
      } catch {
        /* not signed in — full */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 1) Initialise the Leaflet map (browser only).
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet.markercluster");
      await import("leaflet/dist/leaflet.css");
      await import("leaflet.markercluster/dist/MarkerCluster.css");
      await import("leaflet.markercluster/dist/MarkerCluster.Default.css");
      if (cancelled || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        zoomControl: false,
        worldCopyJump: true,
      }).setView([20, 0], 2);

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19,
        subdomains: "abcd",
      }).addTo(map);

      L.control.zoom({ position: "bottomright" }).addTo(map);

      recCluster.current = L.markerClusterGroup({
        showCoverageOnHover: false,
        maxClusterRadius: 50,
        iconCreateFunction: (cluster) => clusterIcon(L, cluster.getChildCount(), RECORDING_COLOR),
      });
      liveCluster.current = L.markerClusterGroup({
        showCoverageOnHover: false,
        maxClusterRadius: 50,
        iconCreateFunction: (cluster) => clusterIcon(L, cluster.getChildCount(), STREAM_COLOR),
      });
      contactLayer.current = L.layerGroup().addTo(map);
      disasterLayerRef.current = L.layerGroup();
      mapRef.current = map;

      // Live "me" marker — red dot with slow pulse.
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const ll: [number, number] = [pos.coords.latitude, pos.coords.longitude];
            map.setView(ll, 13, { animate: true });
            placeMeMarker(L, ll);
          },
          () => undefined,
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 30_000 },
        );
        meWatchId.current = navigator.geolocation.watchPosition(
          (pos) => {
            const ll: [number, number] = [pos.coords.latitude, pos.coords.longitude];
            placeMeMarker(L, ll);
          },
          () => undefined,
          { enableHighAccuracy: true, maximumAge: 15_000, timeout: 20_000 },
        );
      }

      await loadData(L);
      await loadContacts(L);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
      if (meWatchId.current != null && navigator.geolocation) {
        try {
          navigator.geolocation.clearWatch(meWatchId.current);
        } catch {
          /* noop */
        }
      }
      mapRef.current?.remove();
      mapRef.current = null;
      recCluster.current = null;
      liveCluster.current = null;
      meMarkerRef.current = null;
      contactLayer.current = null;
      heatLayerRef.current = null;
      disasterLayerRef.current = null;
      contactMarkers.current.clear();
    };
  }, []);

  function placeMeMarker(L: typeof import("leaflet"), ll: [number, number]) {
    const map = mapRef.current;
    if (!map) return;
    meLatLngRef.current = ll;
    if (meMarkerRef.current) {
      meMarkerRef.current.setLatLng(ll);
    } else {
      meMarkerRef.current = L.marker(ll, { icon: dotIcon(L, ME_COLOR, "slow") }).addTo(map);
      meMarkerRef.current.bindTooltip("You", { direction: "top" });
    }
    void refreshSafetyScore();
  }

  async function loadContacts(L: typeof import("leaflet")) {
    const layer = contactLayer.current;
    if (!layer) return;
    let contacts: SharedContact[] = [];
    try {
      contacts = await listSharedContacts();
    } catch {
      return;
    }
    const visible = contacts.filter(
      (c) => c.status === "accepted" && c.latitude != null && c.longitude != null,
    );
    const seen = new Set<string>();
    for (const c of visible) {
      seen.add(c.contactUserId);
      const ll: [number, number] = [c.latitude!, c.longitude!];
      const existing = contactMarkers.current.get(c.contactUserId);
      const color = c.sosActive ? SOS_COLOR : CONTACT_COLOR;
      const speed = c.sosActive ? "fast" : "slow";
      const icon = dotIcon(L, color, speed);
      if (existing) {
        existing.setLatLng(ll);
        existing.setIcon(icon);
        existing.setPopupContent(contactPopup(c));
      } else {
        const m = L.marker(ll, { icon });
        m.bindPopup(contactPopup(c), { closeButton: true });
        layer.addLayer(m);
        contactMarkers.current.set(c.contactUserId, m);
      }
    }
    // remove stale
    for (const [id, marker] of contactMarkers.current.entries()) {
      if (!seen.has(id)) {
        layer.removeLayer(marker);
        contactMarkers.current.delete(id);
      }
    }
  }

  // 2) Load + plot pins, refresh every 30s.
  async function loadData(L: typeof import("leaflet")) {
    if (!mapRef.current || !recCluster.current || !liveCluster.current) return;
    const range = DATE_RANGES.find((r) => r.key === rangeKey) ?? DATE_RANGES[0];
    const [recs, streams] = await Promise.all([
      getPublicRecordings({
        withinHours: range.hours,
        categories: activeCats.length ? activeCats : undefined,
      }),
      getActiveStreams(),
    ]);
    const filteredRecs =
      contentLevel === "full"
        ? recs
        : recs.filter((r) => categoryAllowed(r.category ?? "", contentLevel));
    // Apply radius filter
    const me = meLatLngRef.current;
    const rRecs =
      radiusKm > 0 && me
        ? filteredRecs.filter((r) => haversineM(me[0], me[1], r.lat, r.lng) <= radiusKm * 1000)
        : filteredRecs;
    const rStreams =
      radiusKm > 0 && me
        ? streams.filter((s) => haversineM(me[0], me[1], s.lat, s.lng) <= radiusKm * 1000)
        : streams;
    lastRecordingsRef.current = rRecs;
    // Fetch verified badges BEFORE plotting so popups include them
    const userIds = new Set<string>();
    for (const r of rRecs) if (r.userId) userIds.add(r.userId);
    for (const s of rStreams) if (s.userId) userIds.add(s.userId);
    if (userIds.size > 0) {
      badgeMapRef.current = await fetchManyUserBadges([...userIds]);
      (window as unknown as Record<string, unknown>).__witnessBadgeMap = badgeMapRef.current;
    }
    plotRecordings(L, rRecs);
    plotStreams(L, rStreams);
    setCounts({ live: rStreams.length, recent: rRecs.length });
    if (showHeatmap) updateHeatmap(L, rRecs);
    void refreshSafetyScore();
  }

  function plotRecordings(L: typeof import("leaflet"), recs: MapRecording[]) {
    const cluster = recCluster.current!;
    cluster.clearLayers();
    for (const r of recs) {
      const m = L.marker([r.lat, r.lng], {
        icon: pinIcon(L, RECORDING_COLOR, false),
      });
      m.bindPopup(recordingPopup(r), { closeButton: false });
      cluster.addLayer(m);
    }
  }

  function plotStreams(L: typeof import("leaflet"), streams: MapStream[]) {
    const cluster = liveCluster.current!;
    cluster.clearLayers();
    for (const s of streams) {
      const m = L.marker([s.lat, s.lng], {
        icon: pinIcon(L, STREAM_COLOR, true),
      });
      m.bindPopup(streamPopup(s), { closeButton: false });
      cluster.addLayer(m);
    }
  }

  function updateHeatmap(L: typeof import("leaflet"), recs: MapRecording[]) {
    const map = mapRef.current;
    if (!map) return;
    const points: Array<[number, number, number]> = recs.map((r) => [r.lat, r.lng, 0.6]);
    if (heatLayerRef.current) {
      heatLayerRef.current.setLatLngs(points);
    } else {
      heatLayerRef.current = L.heatLayer(points, {
        radius: 28,
        blur: 22,
        maxZoom: 17,
        minOpacity: 0.35,
      });
    }
  }

  async function ensureHeatPlugin() {
    if (heatLayerRef.current) return;
    await import("leaflet.heat");
  }

  async function plotDisasters(L: typeof import("leaflet"), events: DisasterEvent[]) {
    const layer = disasterLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    for (const ev of events) {
      const color = disasterColor(ev.category) || DISASTER_DEFAULT;
      const icon = L.divIcon({
        html: `<span class="witness-disaster" style="--pin:${color}"><span class="witness-disaster-ring"></span><span class="witness-disaster-dot"></span></span>`,
        className: "witness-pin-wrap",
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
      const m = L.marker([ev.lat, ev.lng], { icon });
      m.bindPopup(disasterPopup(ev), { closeButton: false });
      layer.addLayer(m);
    }
  }

  async function refreshSafetyScore() {
    const me = meLatLngRef.current;
    if (!me) return;
    try {
      const fromIso = new Date(Date.now() - 30 * 86_400_000).toISOString();
      const toIso = new Date().toISOString();
      const result: AnalyticsResult = await getAnalytics({ fromIso, toIso });
      const score = safetyScoreForCell(result.cells, me[0], me[1]);
      setSafety({ score, sample: result.total });
    } catch {
      /* ignore */
    }
  }

  // 3) React to filter toggles.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !recCluster.current || !liveCluster.current) return;
    if (showRecent) map.addLayer(recCluster.current);
    else map.removeLayer(recCluster.current);
    if (showLive) map.addLayer(liveCluster.current);
    else map.removeLayer(liveCluster.current);
  }, [showLive, showRecent, loading]);

  // Refresh data when range / categories / radius change.
  useEffect(() => {
    if (loading) return;
    (async () => {
      const L = (await import("leaflet")).default;
      await loadData(L);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeKey, activeCats, contentLevel, radiusKm]);

  // Heatmap toggle.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || loading) return;
    (async () => {
      if (showHeatmap) {
        await ensureHeatPlugin();
        const L = (await import("leaflet")).default;
        updateHeatmap(L, lastRecordingsRef.current);
        if (heatLayerRef.current) map.addLayer(heatLayerRef.current);
      } else if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
      }
    })();
  }, [showHeatmap, loading]);

  // Disasters toggle.
  useEffect(() => {
    const map = mapRef.current;
    const layer = disasterLayerRef.current;
    if (!map || !layer || loading) return;
    (async () => {
      if (showDisasters) {
        const L = (await import("leaflet")).default;
        const { events, stale } = await getDisasters();
        setDisasterStale(stale);
        setDisasterCount(events.length);
        await plotDisasters(L, events);
        map.addLayer(layer);
      } else {
        map.removeLayer(layer);
      }
    })();
  }, [showDisasters, loading]);

  // 4) Periodic refresh.
  useEffect(() => {
    if (loading) return;
    const interval = window.setInterval(async () => {
      const L = (await import("leaflet")).default;
      await loadData(L);
      await loadContacts(L);
    }, 30_000);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, rangeKey, activeCats, showHeatmap, radiusKm]);

  async function handleLocateMe() {
    if (!navigator.geolocation) {
      toast.error("Geolocation not available");
      return;
    }
    const map = mapRef.current;
    if (!map) return;
    toast.info("Locating…");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const L = (await import("leaflet")).default;
        const ll: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        map.setView(ll, 15, { animate: true });
        placeMeMarker(L, ll);
      },
      (err) => toast.error(err.message || "Couldn't get your location"),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  async function runSearch(e?: React.FormEvent) {
    e?.preventDefault();
    if (!searchQ.trim()) return;
    setSearchBusy(true);
    const results = await geocode(searchQ);
    setSearchResults(results);
    setSearchBusy(false);
    if (results.length === 0) toast.error("No results");
  }

  function flyToResult(r: GeocodeResult) {
    const map = mapRef.current;
    if (!map) return;
    map.setView([r.lat, r.lng], 14, { animate: true });
    setSearchOpen(false);
    setSearchResults([]);
  }

  function toggleCategory(c: RecordingCategory) {
    setActiveCats((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  return (
    <main className="fixed inset-0 flex flex-col bg-background text-foreground">
      <div ref={containerRef} className="absolute inset-0" aria-label="Live map" />

      {/* Top bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[400] flex flex-col gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="pointer-events-auto flex items-center gap-2">
          <Link
            to="/camera"
            aria-label="Back"
            className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card/80 text-foreground backdrop-blur active:scale-95"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex flex-1 items-center gap-1.5 rounded-full border border-border bg-card/80 p-1 backdrop-blur">
            <FilterChip
              active={showLive}
              onToggle={() => setShowLive((v) => !v)}
              color={STREAM_COLOR}
              icon={<Radio className="h-3.5 w-3.5" />}
              label="Live now"
              count={counts.live}
              pulse
            />
            <FilterChip
              active={showRecent}
              onToggle={() => setShowRecent((v) => !v)}
              color={RECORDING_COLOR}
              icon={<Video className="h-3.5 w-3.5" />}
              label="Last 24h"
              count={counts.recent}
            />
          </div>
          <button
            type="button"
            aria-label="Search location"
            onClick={() => setSearchOpen((v) => !v)}
            className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card/80 text-foreground backdrop-blur active:scale-95"
          >
            <Search className="h-4 w-4" />
          </button>
          <Link
            to="/analytics"
            aria-label="Open analytics"
            className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card/80 text-foreground backdrop-blur active:scale-95"
          >
            <BarChart3 className="h-4 w-4" />
          </Link>
        </div>

        {/* Range + layer + category strip */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-1.5">
          <div className="flex items-center gap-1 rounded-full border border-border bg-card/80 p-1 backdrop-blur">
            {DATE_RANGES.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => setRangeKey(r.key)}
                aria-pressed={rangeKey === r.key}
                className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition ${rangeKey === r.key ? "bg-foreground text-background" : "text-muted-foreground"}`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setShowHeatmap((v) => !v)}
            aria-pressed={showHeatmap}
            className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur ${showHeatmap ? "border-foreground bg-foreground text-background" : "border-border bg-card/80 text-muted-foreground"}`}
          >
            <Flame className="h-3 w-3" /> Heatmap
          </button>
          <button
            type="button"
            onClick={() => setShowDisasters((v) => !v)}
            aria-pressed={showDisasters}
            className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur ${showDisasters ? "border-foreground bg-foreground text-background" : "border-border bg-card/80 text-muted-foreground"}`}
          >
            <Wind className="h-3 w-3" /> Disasters
            {showDisasters && disasterCount > 0 && (
              <span className="rounded-full bg-background/30 px-1 text-[9px]">{disasterCount}</span>
            )}
            {showDisasters && disasterStale && (
              <span className="rounded-full bg-yellow-500/30 px-1 text-[9px] text-yellow-200">
                offline
              </span>
            )}
          </button>
        </div>

        {/* Distance radius filter */}
        <div className="pointer-events-auto flex items-center gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <Crosshair className="mr-1 inline h-3 w-3" />
            Radius
          </span>
          <div className="flex items-center gap-0.5 rounded-full border border-border bg-card/80 p-0.5 backdrop-blur">
            {RADIUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setRadiusKm(opt.value)}
                aria-pressed={radiusKm === opt.value}
                className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider transition ${radiusKm === opt.value ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="pointer-events-auto flex flex-wrap items-center gap-1">
          {RECORDING_CATEGORIES.map((c) => {
            const on = activeCats.includes(c);
            return (
              <button
                key={c}
                type="button"
                onClick={() => toggleCategory(c)}
                aria-pressed={on}
                className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur ${on ? "border-foreground bg-foreground text-background" : "border-border bg-card/70 text-muted-foreground"}`}
              >
                {c}
              </button>
            );
          })}
        </div>

        {searchOpen && (
          <form
            onSubmit={runSearch}
            className="pointer-events-auto flex flex-col gap-1 rounded-xl border border-border bg-card/95 p-2 backdrop-blur"
          >
            <div className="flex items-center gap-1">
              <input
                autoFocus
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Search a city, address, or place"
                className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              />
              <button
                type="submit"
                disabled={searchBusy}
                className="grid h-9 w-9 place-items-center rounded-md border border-border disabled:opacity-50"
                aria-label="Search"
              >
                <Search className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setSearchOpen(false);
                  setSearchResults([]);
                }}
                className="grid h-9 w-9 place-items-center rounded-md border border-border"
                aria-label="Close search"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {searchResults.length > 0 && (
              <ul className="max-h-48 overflow-y-auto rounded-md border border-border bg-background">
                {searchResults.map((r) => (
                  <li key={`${r.lat},${r.lng}`}>
                    <button
                      type="button"
                      onClick={() => flyToResult(r)}
                      className="block w-full truncate px-2 py-1.5 text-left text-xs hover:bg-muted"
                    >
                      {r.displayName}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </form>
        )}
      </div>

      {/* Locate me */}
      <button
        type="button"
        onClick={handleLocateMe}
        aria-label="Centre map on my location"
        className="absolute right-3 z-[400] grid h-11 w-11 place-items-center rounded-full border border-border bg-card text-foreground shadow-lg active:scale-95"
        style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        <Crosshair className="h-4 w-4" />
      </button>

      {/* Safety score */}
      {safety && (
        <div
          className="absolute left-3 z-[400] flex items-center gap-2 rounded-xl border border-border bg-card/90 px-2.5 py-2 backdrop-blur"
          style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          <Shield
            className="h-4 w-4"
            style={{
              color: safety.score >= 70 ? "#22c55e" : safety.score >= 40 ? "#eab308" : "#ef4444",
            }}
          />
          <div className="leading-tight">
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
              Safety score
            </p>
            <p className="text-sm font-bold tabular-nums">
              {safety.score}
              <span className="ml-1 text-[10px] font-normal text-muted-foreground">/ 100</span>
            </p>
          </div>
        </div>
      )}

      {loading && (
        <div className="pointer-events-none absolute inset-0 z-[300] grid place-items-center">
          <div className="rounded-full bg-card/90 px-3 py-1.5 text-[11px] uppercase tracking-wider text-muted-foreground backdrop-blur">
            Loading map…
          </div>
        </div>
      )}

      {/* Report modal */}
      {reportOpen && reportTarget && (
        <div className="absolute inset-0 z-[500] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center">
          <div
            className="w-full max-w-sm rounded-t-3xl border border-border bg-card p-5 sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Report incident</h3>
                <p className="text-xs text-muted-foreground">
                  Flag this {reportTarget.type} for review
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setReportOpen(false);
                  setReportTarget(null);
                }}
                aria-label="Close"
                className="grid h-9 w-9 place-items-center rounded-full bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="mb-3 block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Category
              </span>
              <select
                value={reportCategory}
                onChange={(e) => setReportCategory(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              >
                <option value="">Select a category</option>
                <option value="Harassment">Harassment</option>
                <option value="Violence">Violence</option>
                <option value="Hate crime">Hate crime</option>
                <option value="Police misconduct">Police misconduct</option>
                <option value="False information">False information</option>
                <option value="Privacy violation">Privacy violation</option>
                <option value="Spam">Spam</option>
                <option value="Other">Other</option>
              </select>
            </label>

            <label className="mb-4 block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Description (optional)
              </span>
              <textarea
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="What's happening?"
                className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </label>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setReportOpen(false);
                  setReportTarget(null);
                }}
                className="flex-1 h-11 rounded-xl border border-border text-sm font-semibold text-muted-foreground active:bg-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitReport}
                disabled={reportSubmitting || !reportCategory}
                className="flex-1 h-11 rounded-xl bg-yellow-500 text-sm font-bold uppercase tracking-wider text-black active:scale-95 disabled:opacity-50"
              >
                {reportSubmitting ? "Submitting…" : "Submit report"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{popupCss}</style>
    </main>
  );
}

/* ---------------- Helpers ---------------- */

function FilterChip({
  active,
  onToggle,
  color,
  icon,
  label,
  count,
  pulse,
}: {
  active: boolean;
  onToggle: () => void;
  color: string;
  icon: React.ReactNode;
  label: string;
  count: number;
  pulse?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      className={`flex h-8 flex-1 items-center justify-center gap-1.5 rounded-full px-2 text-[11px] font-bold uppercase tracking-wider transition ${
        active ? "bg-foreground/10 text-foreground" : "text-muted-foreground"
      }`}
    >
      <span
        className={`grid h-2 w-2 place-items-center rounded-full ${pulse && active ? "animate-pulse" : ""}`}
        style={{ backgroundColor: active ? color : "var(--muted-foreground)" }}
      />
      {icon}
      <span>{label}</span>
      {active && (
        <span className="rounded-full bg-background/40 px-1.5 text-[10px] font-bold">{count}</span>
      )}
    </button>
  );
}

function pinIcon(L: typeof import("leaflet"), color: string, pulse: boolean) {
  const html = `
    <span class="witness-pin" style="--pin:${color}">
      ${pulse ? '<span class="witness-pin-pulse"></span>' : ""}
      <span class="witness-pin-dot"></span>
    </span>
  `;
  return L.divIcon({
    html,
    className: "witness-pin-wrap",
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -10],
  });
}

function clusterIcon(L: typeof import("leaflet"), count: number, color: string) {
  return L.divIcon({
    html: `<div class="witness-cluster" style="--pin:${color}"><span>${count}</span></div>`,
    className: "witness-pin-wrap",
    iconSize: [38, 38],
  });
}

function dotIcon(L: typeof import("leaflet"), color: string, speed: "slow" | "fast") {
  const cls = speed === "fast" ? "witness-pin-pulse witness-pin-pulse-fast" : "witness-pin-pulse";
  return L.divIcon({
    html: `<span class="witness-pin" style="--pin:${color}"><span class="${cls}"></span><span class="witness-pin-dot"></span></span>`,
    className: "witness-pin-wrap",
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -10],
  });
}

function contactPopup(c: SharedContact): string {
  const name = escapeHtml(c.alias || c.phone || "Contact");
  const phone = c.phone ? `<p class="witness-popup-sub">${escapeHtml(c.phone)}</p>` : "";
  const addr = c.homeAddress ? `<p class="witness-popup-sub">${escapeHtml(c.homeAddress)}</p>` : "";
  const tag = c.sosActive ? "● SOS active" : "Trusted contact";
  const tagColor = c.sosActive ? SOS_COLOR : CONTACT_COLOR;
  return `
    <div class="witness-popup">
      <div class="witness-popup-meta">
        <p class="witness-popup-tag" style="color:${tagColor}">${tag}</p>
        <p class="witness-popup-time">${name}</p>
        ${phone}
        ${addr}
      </div>
    </div>
  `;
}

function recordingPopup(r: MapRecording): string {
  const time = new Date(r.recordedAt).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const dur = fmtDuration(r.durationMs);
  const thumb = r.thumbnailDataUrl
    ? `<img src="${r.thumbnailDataUrl}" alt="" class="witness-popup-thumb" />`
    : "";
  const heading = r.title ? escapeHtml(r.title) : "Recording";
  // Use a global ref for badge map access in static popup functions
  const badges = (window as unknown as Record<string, unknown>).__witnessBadgeMap as
    | Map<string, VerifiedBadge[]>
    | undefined;
  const badgeHtml = r.userId && badges ? badgeTagsHtml(badges.get(r.userId) ?? []) : "";
  return `
    <div class="witness-popup">
      ${thumb}
      ${badgeHtml}
      <div class="witness-popup-meta">
        <p class="witness-popup-tag" style="color:${RECORDING_COLOR}">Recording</p>
        <p class="witness-popup-time">${heading}</p>
        <p class="witness-popup-sub">${time} · ${dur}</p>
      </div>
      <div style="display:flex;gap:6px">
        <a class="witness-popup-btn" style="background:${RECORDING_COLOR};flex:1" href="/vault">View</a>
        <button class="witness-popup-btn" style="background:${REPORT_COLOR};flex:1;border:none;cursor:pointer" onclick="window.__witnessReport&&window.__witnessReport('recording','${r.id}',${r.lat},${r.lng})">Report</button>
      </div>
    </div>
  `;
}

function streamPopup(s: MapStream): string {
  const time = new Date(s.startedAt).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  const badges = (window as unknown as Record<string, unknown>).__witnessBadgeMap as
    | Map<string, VerifiedBadge[]>
    | undefined;
  const badgeHtml = s.userId && badges ? badgeTagsHtml(badges.get(s.userId) ?? []) : "";
  return `
    <div class="witness-popup">
      ${badgeHtml}
      <div class="witness-popup-meta">
        <p class="witness-popup-tag" style="color:${STREAM_COLOR}">● Live</p>
        <p class="witness-popup-time">${s.title ? escapeHtml(s.title) : "Live stream"}</p>
        <p class="witness-popup-sub">Started ${time}</p>
      </div>
      <div style="display:flex;gap:6px">
        <a class="witness-popup-btn" style="background:${STREAM_COLOR};flex:1" href="/watch/${encodeURIComponent(s.playbackId)}">Watch</a>
        <button class="witness-popup-btn" style="background:${REPORT_COLOR};flex:1;border:none;cursor:pointer" onclick="window.__witnessReport&&window.__witnessReport('stream','${s.id}',${s.lat},${s.lng})">Report</button>
      </div>
    </div>
  `;
}

function disasterPopup(e: DisasterEvent): string {
  const time = new Date(e.date).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const color = disasterColor(e.category);
  return `
    <div class="witness-popup">
      <div class="witness-popup-meta">
        <p class="witness-popup-tag" style="color:${color}">${escapeHtml(e.category)}</p>
        <p class="witness-popup-time">${escapeHtml(e.title)}</p>
        <p class="witness-popup-sub">${time}</p>
      </div>
      <a class="witness-popup-btn" style="background:${color}" href="${e.link}" target="_blank" rel="noopener">Details</a>
    </div>
  `;
}

function fmtDuration(ms: number) {
  const s = Math.round(ms / 1000);
  const mm = Math.floor(s / 60)
    .toString()
    .padStart(2, "0");
  const ss = (s % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
}

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const popupCss = `
.witness-pin-wrap { background: transparent !important; border: 0 !important; }
.witness-pin {
  position: relative; display: inline-grid; place-items: center;
  width: 22px; height: 22px;
}
.witness-pin-dot {
  width: 14px; height: 14px; border-radius: 9999px;
  background: var(--pin); box-shadow: 0 0 0 3px rgba(0,0,0,0.55), 0 2px 6px rgba(0,0,0,0.5);
}
.witness-pin-pulse {
  position: absolute; inset: -2px; border-radius: 9999px;
  background: var(--pin); opacity: 0.55; animation: witness-pulse 1.6s ease-out infinite;
}
.witness-pin-pulse-fast { animation-duration: 0.7s !important; opacity: 0.75; }
@keyframes witness-pulse {
  0%   { transform: scale(0.6); opacity: 0.7; }
  100% { transform: scale(2.4); opacity: 0; }
}
.witness-cluster {
  display: grid; place-items: center; width: 38px; height: 38px;
  border-radius: 9999px; background: var(--pin); color: #0a0a0a;
  font-weight: 700; font-size: 12px; box-shadow: 0 0 0 4px rgba(0,0,0,0.55);
  border: 2px solid rgba(255,255,255,0.85);
}
.witness-me {
  display: inline-grid; place-items: center; width: 18px; height: 18px;
}
.witness-me-dot {
  width: 12px; height: 12px; border-radius: 9999px;
  background: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.35), 0 0 0 6px rgba(59,130,246,0.18);
}
.leaflet-popup-content-wrapper {
  background: hsl(var(--card, 0 0% 8%)); color: hsl(var(--foreground, 0 0% 98%));
  border: 1px solid hsl(var(--border, 0 0% 20%)); border-radius: 14px; padding: 0;
}
.leaflet-popup-tip { background: hsl(var(--card, 0 0% 8%)); }
.leaflet-popup-content { margin: 0; padding: 0; }
.witness-popup { display: flex; flex-direction: column; min-width: 200px; padding: 10px; gap: 8px; }
.witness-popup-thumb { width: 100%; height: 96px; object-fit: cover; border-radius: 8px; }
.witness-popup-meta p { margin: 0; }
.witness-popup-tag { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; }
.witness-popup-time { font-size: 12px; font-weight: 600; margin-top: 2px !important; }
.witness-popup-sub { font-size: 11px; opacity: 0.7; margin-top: 2px !important; }
.witness-popup-btn {
  display: inline-flex; align-items: center; justify-content: center;
  height: 32px; border-radius: 9999px; color: #0a0a0a; font-size: 11px;
  font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em;
  text-decoration: none;
}
.witness-badge-row {
  display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 4px;
}
.witness-badge-tag {
  display: inline-flex; align-items: center; gap: 2px;
  padding: 1px 6px; border-radius: 9999px;
  background: color-mix(in srgb, var(--badge-color) 18%, transparent);
  border: 1px solid color-mix(in srgb, var(--badge-color) 35%, transparent);
  color: var(--badge-color); font-size: 9px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.06em;
}
.leaflet-control-attribution { background: rgba(0,0,0,0.55) !important; color: rgba(255,255,255,0.6) !important; }
.leaflet-control-attribution a { color: rgba(255,255,255,0.85) !important; }
.witness-disaster {
  position: relative; display: inline-grid; place-items: center;
  width: 24px; height: 24px;
}
.witness-disaster-dot {
  width: 10px; height: 10px; transform: rotate(45deg);
  background: var(--pin); border: 2px solid rgba(0,0,0,0.7);
  box-shadow: 0 0 0 2px rgba(255,255,255,0.6);
}
.witness-disaster-ring {
  position: absolute; inset: -3px; border-radius: 9999px;
  border: 2px dashed var(--pin); opacity: 0.7;
}
`;
