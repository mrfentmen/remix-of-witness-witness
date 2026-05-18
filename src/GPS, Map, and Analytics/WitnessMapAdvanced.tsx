// WitnessMapAdvanced.tsx
// Self-contained TypeScript React module for advanced map features.
// Implements heatmap toggle, historical timeline, safety scorer, map search, report pin,
// proximity filter, category filter, trending news feed, witness proximity list.
// Vanilla Canvas implementation for mapping to avoid external dependencies.

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";

// ------------------------------
// SECTION: Types & Interfaces
// ------------------------------
export interface MapPin {
  id: string;
  lat: number;
  lng: number;
  title: string;
  category: string;
  createdAt: string; // ISO
  isPublic: boolean;
  isLive: boolean;
  viewCount: number;
  severity: "low" | "medium" | "high" | "critical";
  trending?: boolean;
}

export interface IncidentCategory {
  id: string;
  name: string;
  selected: boolean;
}

export interface SafetyScore {
  score: number; // 0-100
  level: "low" | "medium" | "high" | "critical";
}

// Mock data
const mockPins: MapPin[] = [
  {
    id: "pin1",
    lat: 40.7128,
    lng: -74.006,
    title: "Traffic Stop - Broadway",
    category: "Traffic Stop",
    createdAt: new Date().toISOString(),
    isPublic: true,
    isLive: false,
    viewCount: 15,
    severity: "medium",
  },
  {
    id: "pin2",
    lat: 40.7145,
    lng: -74.008,
    title: "Protest at City Hall",
    category: "Protest",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    isPublic: true,
    isLive: true,
    viewCount: 230,
    severity: "high",
    trending: true,
  },
  {
    id: "pin3",
    lat: 40.71,
    lng: -74.002,
    title: "Workplace Dispute",
    category: "Workplace",
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    isPublic: true,
    isLive: false,
    viewCount: 8,
    severity: "low",
  },
];

const initialCategories: IncidentCategory[] = [
  { id: "cat1", name: "Traffic Stop", selected: true },
  { id: "cat2", name: "Protest", selected: true },
  { id: "cat3", name: "Workplace", selected: true },
  { id: "cat4", name: "Domestic", selected: false },
];

// Mock Supabase
const supabaseMock = {
  from: (table: string) => ({
    insert: async (data: unknown) => {
      console.log(`[Witness DB] Entry added to ${table}`, data);
      return { error: null };
    },
  }),
};

// ------------------------------
// SECTION: Icons (Vanilla SVG)
// ------------------------------
const Icon = ({ name, className = "w-5 h-5" }: { name: string; className?: string }) => {
  const icons: Record<string, JSX.Element> = {
    search: <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />,
    sliders: <path d="M4 6h16M4 12h16M4 18h16" />,
    flag: (
      <path d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
    ),
    clock: <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />,
    trending: <path d="M13 7h8m0 0v6m0-6L10 17l-5-5" />,
    users: (
      <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197" />
    ),
  };
  return (
    <svg
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      className={className}
    >
      {icons[name]}
    </svg>
  );
};

// ------------------------------
// SECTION: Map Engine (Vanilla Canvas Implementation)
// ------------------------------
const WitnessMapInternal: React.FC<{
  pins: MapPin[];
  viewMode: "pins" | "heat";
  center: { lat: number; lng: number };
}> = ({ pins, viewMode, center }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Fixed dimensions for internal container
    const w = canvas.width;
    const h = canvas.height;

    // Draw Dark Background
    ctx.fillStyle = "#080808";
    ctx.fillRect(0, 0, w, h);

    // Draw Grid
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 1;
    for (let i = 0; i < w; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, h);
      ctx.stroke();
    }
    for (let i = 0; i < h; i += 40) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(w, i);
      ctx.stroke();
    }

    // Map Projection Math (Rough simulation)
    const project = (lat: number, lng: number) => {
      const x = w / 2 + (lng - center.lng) * 2000;
      const y = h / 2 - (lat - center.lat) * 2000;
      return { x, y };
    };

    if (viewMode === "pins") {
      pins.forEach((pin) => {
        const { x, y } = project(pin.lat, pin.lng);
        // Pulse for Live
        if (pin.isLive) {
          ctx.beginPath();
          ctx.arc(x, y, 12 + Math.sin(Date.now() / 200) * 4, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(232, 0, 28, 0.2)";
          ctx.fill();
        }
        // Main Pin
        ctx.beginPath();
        ctx.arc(x, y, pin.trending ? 8 : 5, 0, Math.PI * 2);
        ctx.fillStyle = pin.isLive ? "#E8001C" : "#FFFFFF";
        ctx.fill();
        ctx.strokeStyle = "#E8001C";
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    } else {
      // Heatmap rendering
      pins.forEach((pin) => {
        const { x, y } = project(pin.lat, pin.lng);
        const grad = ctx.createRadialGradient(x, y, 0, x, y, 40);
        grad.addColorStop(0, "rgba(232, 0, 28, 0.6)");
        grad.addColorStop(1, "rgba(232, 0, 28, 0)");
        ctx.fillStyle = grad;
        ctx.fillRect(x - 40, y - 40, 80, 80);
      });
    }

    // Draw user position
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 6, 0, Math.PI * 2);
    ctx.fillStyle = "#3b82f6";
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.stroke();
  }, [pins, viewMode, center]);

  return <canvas ref={canvasRef} width={800} height={600} className="w-full h-full block" />;
};

// ------------------------------
// SECTION: Heatmap Toggle Engine (useMapVisualization)
// ------------------------------
export function useMapVisualization() {
  const [viewMode, setViewMode] = useState<"pins" | "heat">("pins");
  const toggleView = () => setViewMode((prev) => (prev === "pins" ? "heat" : "pins"));
  return { viewMode, toggleView };
}

// ------------------------------
// SECTION: Historical Incident Timeline (useHistoricalView)
// ------------------------------
export function useHistoricalView() {
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const filterByDate = useCallback(
    (pins: MapPin[]): MapPin[] => {
      return pins.filter((pin) => {
        const ts = new Date(pin.createdAt).getTime();
        if (startDate && ts < new Date(startDate).getTime()) return false;
        if (endDate && ts > new Date(endDate).getTime()) return false;
        return true;
      });
    },
    [startDate, endDate],
  );

  const DateRangePicker = () => (
    <div className="flex flex-wrap gap-2 items-center bg-zinc-900 p-2 rounded-xl border border-zinc-800">
      <input
        type="date"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
        className="bg-black border border-zinc-700 rounded-lg px-2 py-1 text-[10px] text-white uppercase font-bold"
      />
      <span className="text-zinc-600 font-black text-xs">TO</span>
      <input
        type="date"
        value={endDate}
        onChange={(e) => setEndDate(e.target.value)}
        className="bg-black border border-zinc-700 rounded-lg px-2 py-1 text-[10px] text-white uppercase font-bold"
      />
    </div>
  );

  return { filterByDate, DateRangePicker };
}

// ------------------------------
// SECTION: Neighborhood Safety Score (SafetyScorer)
// ------------------------------
export function SafetyScorer({
  pins,
  userLat,
  userLng,
}: {
  pins: MapPin[];
  userLat: number;
  userLng: number;
}) {
  const safety = useMemo(() => {
    const nearby = pins.filter((pin) => {
      const dist = Math.hypot(pin.lat - userLat, pin.lng - userLng) * 111;
      return dist <= 2;
    });
    const weighted = nearby.reduce(
      (acc, p) => acc + (p.severity === "critical" ? 30 : p.severity === "high" ? 15 : 5),
      0,
    );
    const score = Math.max(0, 100 - weighted);
    return {
      score,
      level: score < 30 ? "CRITICAL" : score < 60 ? "HIGH" : score < 85 ? "MEDIUM" : "LOW RISK",
    };
  }, [pins, userLat, userLng]);

  return (
    <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 border-l-4 border-l-red-600 shadow-2xl">
      <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">
        Local Threat Index
      </div>
      <div
        className={`text-4xl font-black italic tracking-tighter ${safety.score < 50 ? "text-red-600" : "text-green-500"}`}
      >
        {safety.score}
      </div>
      <div className="text-[10px] font-bold text-white mt-1 opacity-70 uppercase tracking-widest">
        {safety.level}
      </div>
    </div>
  );
}

// ------------------------------
// SECTION: Map Search & Geocoding (MapSearchBar)
// ------------------------------
export function MapSearchBar({ onSearch }: { onSearch: (lat: number, lng: number) => void }) {
  const [query, setQuery] = useState("");
  return (
    <div className="flex gap-2 bg-zinc-900/80 backdrop-blur-md p-2 rounded-2xl border border-zinc-800 shadow-2xl w-full">
      <div className="flex items-center pl-2">
        <Icon name="search" className="w-4 h-4 text-zinc-500" />
      </div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Query Sector..."
        className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-zinc-700 font-bold"
      />
      <button
        onClick={() => onSearch(40.7128, -74.006)}
        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
      >
        Scan
      </button>
    </div>
  );
}

// ------------------------------
// SECTION: Pin Integrity Reporting (ReportPinModal)
// ------------------------------
export function ReportPinModal({
  pin,
  onClose,
  onReported,
}: {
  pin: MapPin | null;
  onClose: () => void;
  onReported: () => void;
}) {
  const [reason, setReason] = useState<string>("false");
  if (!pin) return null;
  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[1000] p-6">
      <div className="bg-zinc-900 border border-red-900 p-8 rounded-3xl max-w-sm w-full shadow-2xl">
        <h3 className="text-red-600 font-black text-xl mb-2 uppercase italic tracking-tighter">
          Report Anomaly
        </h3>
        <p className="text-zinc-500 text-xs mb-6 uppercase font-bold tracking-widest">
          {pin.title}
        </p>
        <div className="space-y-3 mb-8">
          {["False Intel", "Misleading", "Duplicate"].map((r) => (
            <button
              key={r}
              onClick={() => setReason(r)}
              className={`w-full py-3 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${reason === r ? "bg-red-600 border-red-600 text-white" : "bg-black border-zinc-800 text-zinc-600"}`}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="flex gap-4">
          <button
            onClick={async () => {
              await supabaseMock.from("reports").insert({ pin: pin.id, reason });
              onReported();
              onClose();
            }}
            className="flex-1 bg-red-600 text-white py-3 rounded-xl font-black text-xs uppercase"
          >
            Submit
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-zinc-800 text-zinc-400 py-3 rounded-xl font-black text-xs uppercase"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ------------------------------
// SECTION: Proximity Filter (RadiusController)
// ------------------------------
export function RadiusController({
  value,
  onChange,
}: {
  value: number;
  onChange: (km: number) => void;
}) {
  return (
    <div className="flex bg-black rounded-xl p-1 border border-zinc-800">
      {[1, 2, 5, 10].map((km) => (
        <button
          key={km}
          onClick={() => onChange(km)}
          className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${value === km ? "bg-red-600 text-white" : "text-zinc-600 hover:text-zinc-300"}`}
        >
          {km}KM
        </button>
      ))}
    </div>
  );
}

// ------------------------------
// SECTION: Category Intel Filter (IncidentFilter)
// ------------------------------
export function IncidentFilter({
  categories,
  onToggle,
}: {
  categories: IncidentCategory[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onToggle(cat.id)}
          className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase border transition-all ${cat.selected ? "bg-red-600 border-red-600 text-white shadow-lg shadow-red-900/20" : "bg-zinc-900 border-zinc-800 text-zinc-500"}`}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}

// ------------------------------
// SECTION: Trending & Breaking News Integration (NewsFeedOverlay)
// ------------------------------
export function NewsFeedOverlay({
  pins,
  onSelectPin,
}: {
  pins: MapPin[];
  onSelectPin: (pin: MapPin) => void;
}) {
  const trending = useMemo(() => pins.filter((p) => p.trending), [pins]);
  return (
    <div className="absolute top-20 right-6 w-64 space-y-3 z-50 hidden md:block">
      <div className="flex items-center gap-2 mb-2 px-1">
        <Icon name="trending" className="text-red-600 w-4 h-4" />
        <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">
          Active Alerts
        </span>
      </div>
      {trending.map((p) => (
        <div
          key={p.id}
          onClick={() => onSelectPin(p)}
          className="bg-zinc-950/80 backdrop-blur-md border border-zinc-900 p-4 rounded-2xl hover:border-red-600 transition-all cursor-pointer shadow-2xl group"
        >
          <div className="text-[10px] font-black text-zinc-500 uppercase mb-1">{p.category}</div>
          <div className="text-sm font-bold text-white group-hover:text-red-500 transition-colors leading-tight">
            {p.title}
          </div>
          <div className="flex items-center gap-3 mt-3 text-[9px] font-mono text-zinc-600">
            <span>{p.viewCount} OBSERVERS</span>
            {p.isLive && <span className="text-red-600 font-black animate-pulse">● LIVE</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ------------------------------
// SECTION: Know Your Neighbors (WitnessProximityList)
// ------------------------------
export function WitnessProximityList({ count }: { count: number; onCallBackup: () => void }) {
  return (
    <div className="absolute bottom-10 left-6 bg-zinc-950/90 border border-zinc-800 p-4 rounded-2xl shadow-2xl flex items-center gap-4 z-50">
      <div className="w-10 h-10 rounded-xl bg-red-600/10 flex items-center justify-center border border-red-900/30 text-red-600">
        <Icon name="users" />
      </div>
      <div>
        <div className="text-[10px] font-black text-zinc-500 uppercase">Available Observers</div>
        <div className="text-lg font-black text-white leading-none">{count} Nearby</div>
      </div>
    </div>
  );
}

// ------------------------------
// SECTION: MainApp Demo
// ------------------------------
export function MainApp() {
  const [activeTab, setActiveTab] = useState<"map" | "feed">("map");
  const [categories, setCategories] = useState(initialCategories);
  const [radius, setRadius] = useState(2);
  const [userPos] = useState({ lat: 40.7128, lng: -74.006 });
  const { viewMode, toggleView } = useMapVisualization();
  const { filterByDate, DateRangePicker } = useHistoricalView();
  const [selectedPin, setSelectedPin] = useState<MapPin | null>(null);

  const filteredPins = useMemo(() => {
    let p = filterByDate(mockPins);
    p = p.filter((pin) => {
      const dist = Math.hypot(pin.lat - userPos.lat, pin.lng - userPos.lng) * 111;
      return dist <= radius;
    });
    return p.filter((pin) => categories.find((c) => c.name === pin.category)?.selected);
  }, [categories, radius, filterByDate, userPos]);

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-red-600/30">
      <div className="flex flex-col h-screen relative">
        {/* Top Controls Overlay */}
        <div className="absolute top-6 left-6 right-6 z-50 flex flex-col md:flex-row gap-4 items-center">
          <MapSearchBar onSearch={() => {}} />
          <div className="flex gap-2">
            <button
              onClick={toggleView}
              className="bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-red-600 transition-all shadow-2xl"
            >
              {viewMode === "pins" ? "Heatmap" : "Vector View"}
            </button>
            <DateRangePicker />
          </div>
        </div>

        {/* Map View */}
        <div className="flex-1 bg-zinc-950 overflow-hidden relative border-b border-zinc-900 shadow-inner">
          <WitnessMapInternal pins={filteredPins} viewMode={viewMode} center={userPos} />
          <NewsFeedOverlay pins={mockPins} onSelectPin={setSelectedPin} />
          <WitnessProximityList count={4} onCallBackup={() => alert("SOS DISPATCHED")} />

          <div className="absolute top-36 left-6 z-50 space-y-4">
            <SafetyScorer pins={mockPins} userLat={userPos.lat} userLng={userPos.lng} />
            <RadiusController value={radius} onChange={setRadius} />
          </div>
        </div>

        {/* Bottom Control Dock */}
        <div className="p-8 bg-black/80 backdrop-blur-xl border-t border-zinc-900">
          <IncidentFilter
            categories={categories}
            onToggle={(id) =>
              setCategories((prev) =>
                prev.map((c) => (c.id === id ? { ...c, selected: !c.selected } : c)),
              )
            }
          />
        </div>
      </div>

      <ReportPinModal
        pin={selectedPin}
        onClose={() => setSelectedPin(null)}
        onReported={() => {}}
      />

      {/* Tab Navigation Simulator */}
      <div className="fixed bottom-0 left-0 right-0 p-1 flex justify-center pointer-events-none opacity-20">
        <div className="bg-zinc-900 px-4 py-1 rounded-t-lg text-[8px] font-black uppercase tracking-widest text-zinc-500">
          Witness Mapping Module v2.0
        </div>
      </div>
    </div>
  );
}

export default MainApp;
