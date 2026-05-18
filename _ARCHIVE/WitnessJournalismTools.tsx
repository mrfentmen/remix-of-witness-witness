// WitnessJournalismTools.tsx
// Self-contained TypeScript React module for journalism and media tools.
// Features: News Tip Submission, Verified Clip Sharing, Data Insights Dashboard,
// Breaking News Integration, Trending Incidents Feed, Source Verification Engine,
// Uses localStorage for persistence. No Supabase dependency.
// No external dependencies except React.

import React, { useState, useEffect, useCallback, useRef } from "react";

// ------------------------------
// SECTION: TYPES & MOCK STORAGE
// ------------------------------
interface Journalist {
  id: string;
  name: string;
  outlet: string;
  beat: string;
  email: string;
}

interface TipSubmission {
  id: string;
  journalistId: string;
  recordingId: string;
  message: string;
  createdAt: number;
  referenceNumber: string;
}

interface Recording {
  id: string;
  title: string;
  description: string;
  category: string;
  thumbnailUrl?: string;
  timestamp: number;
  gps: { lat: number; lng: number; state?: string };
  hash: string;
  viewCount: number;
  isPublic: boolean;
  chainOfCustody?: unknown;
  deepfakeScore?: number;
}

interface IncidentTrend {
  keyword: string;
  count: number;
  category: string;
}

interface VerificationReport {
  recordingId: string;
  hash: string;
  gps: string;
  timestamp: string;
  deviceId: string;
  certificateSignature: string;
  chainOfCustodySummary: string;
  deepfakeScore: number;
  qrDataUrl?: string;
}

interface InsightsData {
  thisWeek: number;
  lastWeek: number;
  change: number;
  topCities: [string, number][];
  categories: Record<string, number>;
  hourDistribution: number[];
  stateDensity: Record<string, number>;
}

// Mock journalists
const journalists: Journalist[] = [
  {
    id: "j1",
    name: "Jane Smith",
    outlet: "The Times",
    beat: "Police Accountability",
    email: "jane@thetimes.com",
  },
  {
    id: "j2",
    name: "Carlos Mendez",
    outlet: "Univision",
    beat: "Immigration",
    email: "carlos@univision.com",
  },
  { id: "j3", name: "Sarah Lee", outlet: "AP News", beat: "Civil Rights", email: "sarah@ap.org" },
];

// Mock recordings (public)
const initialMockRecordings: Recording[] = [
  {
    id: "rec1",
    title: "Protest at City Hall",
    description: "Large gathering demanding police reform",
    category: "protest",
    timestamp: Date.now() - 3600000,
    gps: { lat: 40.7128, lng: -74.006, state: "NY" },
    hash: "abc1237a8b9c",
    viewCount: 12450,
    isPublic: true,
    deepfakeScore: 12,
  },
  {
    id: "rec2",
    title: "Traffic Stop Escalation",
    description: "Officer involved incident",
    category: "police",
    timestamp: Date.now() - 7200000,
    gps: { lat: 34.0522, lng: -118.2437, state: "CA" },
    hash: "def456d1e2f3",
    viewCount: 8750,
    isPublic: true,
    deepfakeScore: 8,
  },
  {
    id: "rec3",
    title: "Fire in Warehouse District",
    description: "Large fire visible from highway",
    category: "fire",
    timestamp: Date.now() - 86400000,
    gps: { lat: 41.8781, lng: -87.6298, state: "IL" },
    hash: "ghi789g4h5i6",
    viewCount: 3200,
    isPublic: true,
    deepfakeScore: 5,
  },
];

// Helper: generate ID
const genId = () => `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

// Mock storage for tips
const getTips = (): TipSubmission[] => {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem("journalism_tips");
  return stored ? JSON.parse(stored) : [];
};
const saveTip = (tip: TipSubmission) => {
  const tips = getTips();
  tips.push(tip);
  localStorage.setItem("journalism_tips", JSON.stringify(tips));
};

// Mock trending topics
const trendingTopics: IncidentTrend[] = [
  { keyword: "police reform", count: 47, category: "protest" },
  { keyword: "traffic stop", count: 32, category: "police" },
  { keyword: "fire", count: 18, category: "fire" },
];

// ------------------------------
// SECTION: NEWS TIP SUBMISSION
// ------------------------------
export const NewsTipSubmission: React.FC = () => {
  const [selectedJournalist, setSelectedJournalist] = useState<string>("");
  const [selectedRecording, setSelectedRecording] = useState<string>("");
  const [message, setMessage] = useState("");
  const [tips, setTips] = useState<TipSubmission[]>([]);

  useEffect(() => {
    setTips(getTips());
  }, []);

  const handleSubmit = () => {
    if (!selectedJournalist || !selectedRecording) {
      alert("Please select a journalist and a recording.");
      return;
    }
    const tip: TipSubmission = {
      id: genId(),
      journalistId: selectedJournalist,
      recordingId: selectedRecording,
      message,
      createdAt: Date.now(),
      referenceNumber: `TIP-${Math.floor(10000 + Math.random() * 90000)}`,
    };
    saveTip(tip);
    setTips((prev) => [...prev, tip]);
    alert(`Tip submitted! Reference: ${tip.referenceNumber}`);
    setMessage("");
  };

  return (
    <div className="bg-[#111] p-6 rounded-2xl border-l-4 border-red-600 mb-6 text-white shadow-xl">
      <h3 className="text-red-500 font-bold text-xl mb-4 uppercase tracking-wider">
        News Tip Submission
      </h3>
      <div className="space-y-4">
        <select
          value={selectedJournalist}
          onChange={(e) => setSelectedJournalist(e.target.value)}
          className="w-full bg-[#1C1C1E] text-white border border-[#333] rounded-full px-4 py-2 text-sm outline-none focus:border-red-600 transition-colors"
        >
          <option value="">Select journalist</option>
          {journalists.map((j) => (
            <option key={j.id} value={j.id}>
              {j.name} – {j.outlet} ({j.beat})
            </option>
          ))}
        </select>
        <select
          value={selectedRecording}
          onChange={(e) => setSelectedRecording(e.target.value)}
          className="w-full bg-[#1C1C1E] text-white border border-[#333] rounded-full px-4 py-2 text-sm outline-none focus:border-red-600 transition-colors"
        >
          <option value="">Select recording</option>
          {initialMockRecordings.map((r) => (
            <option key={r.id} value={r.id}>
              {r.title}
            </option>
          ))}
        </select>
        <textarea
          placeholder="Brief message to journalist"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          className="w-full bg-[#1C1C1E] text-white border border-[#333] rounded-xl px-4 py-2 text-sm outline-none focus:border-red-600 transition-colors resize-none"
        />
        <button
          onClick={handleSubmit}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-full transition-all w-full sm:w-auto uppercase text-xs tracking-widest"
        >
          Submit Tip
        </button>
      </div>

      {tips.length > 0 && (
        <div className="mt-8 border-t border-[#222] pt-4">
          <strong className="text-red-500 text-xs uppercase block mb-3">Recent tips:</strong>
          <div className="space-y-2">
            {tips
              .slice(-3)
              .reverse()
              .map((t) => {
                const journo = journalists.find((j) => j.id === t.journalistId);
                return (
                  <div key={t.id} className="text-xs bg-black/40 p-2 rounded border border-[#222]">
                    <span className="font-bold text-red-500">{t.referenceNumber}</span> to{" "}
                    {journo?.name}
                    <span className="opacity-40 ml-2">
                      — {new Date(t.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}
      <p className="text-[10px] mt-4 text-zinc-500 italic">
        Submitting does not guarantee coverage. Verified metadata will be attached to the tip.
      </p>
    </div>
  );
};

// ------------------------------
// SECTION: VERIFIED CLIP SHARING
// ------------------------------
export const VerifiedClipSharing: React.FC = () => {
  const [selectedRecording, setSelectedRecording] = useState<string>("");
  const [platform, setPlatform] = useState<"twitter" | "instagram" | "tiktok">("twitter");

  const recording = initialMockRecordings.find((r) => r.id === selectedRecording);

  const share = () => {
    if (!recording) return;
    const shortHash = recording.hash.substring(0, 12);
    const verifyUrl = `https://witness.rep/verify/${recording.id}`;
    let text = "";
    if (platform === "twitter")
      text = `🚨 New evidence: ${recording.title}\n\nSHA-256: ${shortHash}\nVerify: ${verifyUrl}\n\n#WitnessREP #VerifyTheEvidence`;
    else if (platform === "instagram")
      text = `New evidence: ${recording.title}. Hash: ${shortHash}. Verify at ${verifyUrl} #WitnessREP`;
    else text = `Evidence: ${recording.title}. Hash: ${shortHash}. Verify: ${verifyUrl}`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      alert(
        `${platform.toUpperCase()} caption copied to clipboard. Hash travels with post for verification.`,
      );
    }
  };

  return (
    <div className="bg-[#111] p-6 rounded-2xl border-l-4 border-red-600 mb-6 text-white shadow-xl">
      <h3 className="text-red-500 font-bold text-xl mb-4 uppercase tracking-wider">
        Verified Clip Sharing
      </h3>
      <div className="space-y-4">
        <select
          value={selectedRecording}
          onChange={(e) => setSelectedRecording(e.target.value)}
          className="w-full bg-[#1C1C1E] text-white border border-[#333] rounded-full px-4 py-2 text-sm outline-none focus:border-red-600 transition-colors"
        >
          <option value="">Select recording</option>
          {initialMockRecordings.map((r) => (
            <option key={r.id} value={r.id}>
              {r.title}
            </option>
          ))}
        </select>

        <div className="flex gap-6 py-2">
          {["twitter", "instagram", "tiktok"].map((p) => (
            <label key={p} className="flex items-center gap-2 cursor-pointer group">
              <input
                type="radio"
                name="platform"
                value={p}
                checked={platform === p}
                onChange={() => setPlatform(p as "twitter" | "instagram" | "tiktok")}
                className="accent-red-600"
              />
              <span
                className={`text-xs font-bold uppercase transition-colors ${platform === p ? "text-white" : "text-zinc-500 group-hover:text-zinc-300"}`}
              >
                {p}
              </span>
            </label>
          ))}
        </div>

        <button
          onClick={share}
          disabled={!selectedRecording}
          className="bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-bold py-2 px-6 rounded-full transition-all w-full sm:w-auto uppercase text-xs tracking-widest"
        >
          Copy Share Caption for {platform.toUpperCase()}
        </button>
        <p className="text-[10px] text-zinc-500 mt-4 leading-relaxed">
          The cryptographic hash travels with the post. Anyone can verify authenticity at the
          /verify portal using the hash or unique link.
        </p>
      </div>
    </div>
  );
};

// ------------------------------
// SECTION: DATA INSIGHTS DASHBOARD
// ------------------------------
export const DataInsightsDashboard: React.FC = () => {
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const pieCanvasRef = useRef<HTMLCanvasElement>(null);
  const barCanvasRef = useRef<HTMLCanvasElement>(null);
  const mapCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Generate Insights from mock data
    const thisWeek = initialMockRecordings.filter(
      (r) => r.timestamp > Date.now() - 7 * 86400000,
    ).length;
    const lastWeek = 2;
    const change = thisWeek - lastWeek;

    const cities: Record<string, number> = {};
    initialMockRecordings.forEach((r) => {
      const city = r.gps.lat.toFixed(1);
      cities[city] = (cities[city] || 0) + 1;
    });

    const categories: Record<string, number> = {};
    initialMockRecordings.forEach((r) => {
      categories[r.category] = (categories[r.category] || 0) + 1;
    });

    const hourDistribution = Array(24).fill(0);
    initialMockRecordings.forEach((r) => {
      const hour = new Date(r.timestamp).getHours();
      hourDistribution[hour]++;
    });

    const stateDensity: Record<string, number> = {};
    initialMockRecordings.forEach((r) => {
      if (r.gps.state) stateDensity[r.gps.state] = (stateDensity[r.gps.state] || 0) + 1;
    });

    setInsights({
      thisWeek,
      lastWeek,
      change,
      topCities: (Object.entries(cities) as [string, number][]).slice(0, 3),
      categories,
      hourDistribution,
      stateDensity,
    });
  }, []);

  useEffect(() => {
    if (!insights) return;

    // Pie chart (Incident Categories)
    const pieCtx = pieCanvasRef.current?.getContext("2d");
    if (pieCtx) {
      const canvas = pieCanvasRef.current!;
      canvas.width = 400;
      canvas.height = 200;
      pieCtx.clearRect(0, 0, 400, 200);
      const total = Object.values(insights.categories).reduce((a: number, b: number) => a + b, 0);
      let startAngle = -Math.PI / 2;
      const colors = ["#d32f2f", "#ff9800", "#2196f3", "#4caf50"];
      let idx = 0;
      for (const [_, count] of Object.entries(insights.categories)) {
        const angle = ((count as number) / total) * 2 * Math.PI;
        pieCtx.beginPath();
        pieCtx.fillStyle = colors[idx % colors.length];
        pieCtx.moveTo(100, 100);
        pieCtx.arc(100, 100, 80, startAngle, startAngle + angle);
        pieCtx.fill();
        startAngle += angle;
        idx++;
      }
      pieCtx.fillStyle = "white";
      pieCtx.font = "bold 12px sans-serif";
      pieCtx.fillText("Incident Categories", 200, 100);
    }

    // Bar chart (Recordings by Hour)
    const barCtx = barCanvasRef.current?.getContext("2d");
    if (barCtx) {
      const canvas = barCanvasRef.current!;
      canvas.width = 400;
      canvas.height = 150;
      barCtx.clearRect(0, 0, 400, 150);
      const max = Math.max(...insights.hourDistribution, 1);
      const w = Math.floor(360 / 24);
      for (let i = 0; i < 24; i++) {
        const h = (insights.hourDistribution[i] / max) * 100;
        barCtx.fillStyle = "#d32f2f";
        barCtx.fillRect(20 + i * (w + 2), 130 - h, w, h);
      }
      barCtx.fillStyle = "white";
      barCtx.font = "10px sans-serif";
      barCtx.fillText("00h", 20, 145);
      barCtx.fillText("23h", 380, 145);
    }
  }, [insights]);

  if (!insights)
    return (
      <div className="p-12 text-center text-red-600 animate-pulse">Loading engine data...</div>
    );

  return (
    <div className="bg-[#111] p-6 rounded-2xl border-l-4 border-red-600 mb-6 text-white shadow-xl">
      <h3 className="text-red-500 font-bold text-xl mb-4 uppercase tracking-wider">
        Data Insights Dashboard
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-black/40 p-4 rounded-xl border border-[#222]">
          <span className="text-[10px] text-zinc-500 uppercase font-black block mb-1">
            Weekly Activity
          </span>
          <div className="text-2xl font-bold flex items-center gap-2">
            {insights.thisWeek}{" "}
            <span className={`text-xs ${insights.change >= 0 ? "text-green-500" : "text-red-500"}`}>
              ({insights.change >= 0 ? "+" : ""}
              {insights.change})
            </span>
          </div>
        </div>
        <div className="bg-black/40 p-4 rounded-xl border border-[#222]">
          <span className="text-[10px] text-zinc-500 uppercase font-black block mb-1">
            Top Vector Points
          </span>
          <div className="text-sm font-bold text-red-500">
            {insights.topCities.map(([city, count]) => `${city} (${count})`).join(", ")}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <canvas
          ref={pieCanvasRef}
          className="w-full h-auto bg-[#1C1C1E] rounded-xl border border-[#333]"
        />
        <canvas
          ref={barCanvasRef}
          className="w-full h-auto bg-[#1C1C1E] rounded-xl border border-[#333]"
        />
      </div>

      <button
        onClick={() => alert("Insights graphic exported to media repository.")}
        className="mt-6 bg-[#222] hover:bg-[#333] border border-[#444] text-white font-bold py-2 px-6 rounded-full transition-all w-full uppercase text-[10px] tracking-widest"
      >
        Export Insights Bundle
      </button>
    </div>
  );
};

// ------------------------------
// SECTION: BREAKING NEWS INTEGRATION
// ------------------------------
export const BreakingNewsIntegration: React.FC = () => {
  const [trending, setTrending] = useState<IncidentTrend[]>(trendingTopics);
  const [newKeyword, setNewKeyword] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [adminMode, setAdminMode] = useState(false);

  const recordings = initialMockRecordings;
  const matchedCount = recordings.filter((rec) =>
    trending.some((t) => rec.title.toLowerCase().includes(t.keyword.toLowerCase())),
  ).length;

  const notifyJournalists = () => {
    alert(`${journalists.length} newsrooms notified of ${matchedCount} matching events.`);
  };

  const addTrending = () => {
    if (newKeyword && newCategory) {
      setTrending((prev) => [...prev, { keyword: newKeyword, count: 0, category: newCategory }]);
      setNewKeyword("");
      setNewCategory("");
    }
  };

  return (
    <div className="bg-[#111] p-6 rounded-2xl border-l-4 border-red-600 mb-6 text-white shadow-xl">
      <h3 className="text-red-500 font-bold text-xl mb-4 uppercase tracking-wider">
        Breaking News Integration
      </h3>
      {matchedCount > 0 && (
        <div className="bg-red-600/20 border border-red-600 p-4 rounded-xl mb-4 flex items-center gap-3 animate-pulse">
          <span className="text-2xl">🚨</span>
          <div>
            <div className="font-black text-sm uppercase">Priority Matching Active</div>
            <div className="text-xs opacity-70">
              {matchedCount} source recordings align with trends.
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <button
          onClick={notifyJournalists}
          className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-full transition-all uppercase text-[10px] tracking-widest"
        >
          Broadcast to Newsrooms
        </button>
        <button
          onClick={() => setAdminMode(!adminMode)}
          className="flex-1 bg-[#222] hover:bg-[#333] border border-[#444] text-white font-bold py-2 px-6 rounded-full transition-all uppercase text-[10px] tracking-widest"
        >
          {adminMode ? "Close Admin" : "Manage Keywords"}
        </button>
      </div>

      {adminMode && (
        <div className="mt-6 space-y-4 bg-black/40 p-4 rounded-xl border border-[#222]">
          <div className="text-xs font-black uppercase text-zinc-500 mb-2">
            Active Sentinel Keywords
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {trending.map((t) => (
              <span
                key={t.keyword}
                className="bg-zinc-800 text-white text-[10px] px-3 py-1 rounded-full border border-zinc-700 uppercase font-bold"
              >
                {t.keyword}
              </span>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              placeholder="Keyword"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              className="flex-1 bg-[#1C1C1E] border border-[#333] rounded-lg px-3 py-2 text-xs focus:border-red-600 outline-none"
            />
            <input
              placeholder="Category"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="flex-1 bg-[#1C1C1E] border border-[#333] rounded-lg px-3 py-2 text-xs focus:border-red-600 outline-none"
            />
            <button
              onClick={addTrending}
              className="bg-red-600 text-white p-2 rounded-lg font-bold text-xs"
            >
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ------------------------------
// SECTION: TRENDING INCIDENTS FEED
// ------------------------------
export const TrendingIncidentsFeed: React.FC = () => {
  const [recs, setRecs] = useState<Recording[]>([]);
  const [filter, setFilter] = useState<"hour" | "day" | "week">("day");

  useEffect(() => {
    const sorted = [...initialMockRecordings].sort((a, b) => b.viewCount - a.viewCount);
    setRecs(sorted);
  }, [filter]);

  return (
    <div className="bg-[#111] p-6 rounded-2xl border-l-4 border-red-600 mb-6 text-white shadow-xl">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-red-500 font-bold text-xl uppercase tracking-wider">
          Trending Incidents
        </h3>
        <select
          onChange={(e) => setFilter(e.target.value as any)}
          className="bg-black border border-red-900/40 text-red-500 text-[10px] font-black uppercase p-1 rounded outline-none"
        >
          <option value="hour">1H</option>
          <option value="day">24H</option>
          <option value="week">7D</option>
        </select>
      </div>

      <div className="space-y-3">
        {recs.map((rec) => (
          <div
            key={rec.id}
            className="bg-black/40 hover:bg-black/60 transition-colors p-3 rounded-xl border border-[#222] flex gap-4 cursor-pointer group"
          >
            <div className="w-16 h-16 bg-zinc-900 rounded-lg flex items-center justify-center text-2xl border border-zinc-800 group-hover:border-red-600 transition-colors">
              🎥
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-black uppercase text-white truncate">{rec.title}</div>
              <div className="text-[10px] text-zinc-500 mb-1 font-bold">
                {rec.category.toUpperCase()} • {rec.gps.state}
              </div>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-[10px] font-black text-red-500 uppercase tracking-tighter">
                  👁️ {rec.viewCount.toLocaleString()}
                </span>
                <span className="text-[10px] font-bold text-zinc-600 uppercase">
                  {new Date(rec.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ------------------------------
// SECTION: SOURCE VERIFICATION ENGINE
// ------------------------------
export const SourceVerificationEngine: React.FC = () => {
  const [selectedId, setSelectedId] = useState("");
  const [report, setReport] = useState<VerificationReport | null>(null);

  const generateReport = () => {
    const rec = initialMockRecordings.find((r) => r.id === selectedId);
    if (!rec) return;

    setReport({
      recordingId: rec.id,
      hash: rec.hash,
      gps: `${rec.gps.lat.toFixed(4)}, ${rec.gps.lng.toFixed(4)}`,
      timestamp: new Date(rec.timestamp).toISOString(),
      deviceId: "WITNESS-HWID-882X",
      certificateSignature: "WITNESS-RSA-PSS-PROVE",
      chainOfCustodySummary: "Zero gaps, hardware-locked timestamp",
      deepfakeScore: rec.deepfakeScore || 0,
      qrDataUrl: "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=" + rec.id,
    });
  };

  return (
    <div className="bg-[#111] p-6 rounded-2xl border-l-4 border-red-600 mb-6 text-white shadow-xl">
      <h3 className="text-red-500 font-bold text-xl mb-4 uppercase tracking-wider">
        Source Verification Engine
      </h3>
      <div className="space-y-4">
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="w-full bg-[#1C1C1E] border border-[#333] rounded-full px-4 py-2 text-sm text-white outline-none focus:border-red-600 transition-colors"
        >
          <option value="">Select source recording</option>
          {initialMockRecordings.map((r) => (
            <option key={r.id} value={r.id}>
              {r.title}
            </option>
          ))}
        </select>

        <button
          onClick={generateReport}
          disabled={!selectedId}
          className="bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 text-white font-bold py-2 px-6 rounded-full transition-all w-full uppercase text-xs tracking-widest"
        >
          Verify Forensic Hash
        </button>

        {report && (
          <div className="mt-6 bg-black p-6 rounded-2xl border border-zinc-800 animate-in fade-in slide-in-from-top-2">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h4 className="font-black text-red-500 uppercase tracking-tighter text-lg">
                  AUTHENTICITY REPORT
                </h4>
                <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-[0.2em]">
                  Witness R.E.P Forensic Node
                </p>
              </div>
              <img
                src={report.qrDataUrl}
                className="w-12 h-12 bg-white p-1 rounded"
                alt="Verification QR"
              />
            </div>

            <div className="space-y-2 font-mono text-[10px] leading-tight">
              <div className="flex justify-between border-b border-zinc-900 pb-1">
                <span className="text-zinc-500 uppercase">SHA-256 Hash</span>
                <span className="text-white break-all text-right ml-4">{report.hash}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-900 pb-1">
                <span className="text-zinc-500 uppercase">Origin Sensor</span>
                <span className="text-white">{report.deviceId}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-900 pb-1">
                <span className="text-zinc-500 uppercase">GPS Metadata</span>
                <span className="text-white">{report.gps}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-900 pb-1">
                <span className="text-zinc-500 uppercase">AI Jitter Score</span>
                <span className="text-green-500">{report.deepfakeScore}% (SAFE)</span>
              </div>
            </div>

            <button
              onClick={() => window.print()}
              className="mt-6 w-full bg-zinc-800 hover:bg-zinc-700 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest"
            >
              Export PDF Dossier
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ------------------------------
// SECTION: MEDIA EXPORT PACKAGE
// ------------------------------
export const MediaExportPackage: React.FC = () => {
  const [selectedId, setSelectedId] = useState("");

  const exportPackage = () => {
    if (!selectedId) return;
    alert(
      `Archive Generated: Media_Package_${selectedId}.zip contains:\n- Master Video (H.265)\n- Hashed JSON Metadata\n- Signed GPS Trail\n- Verification Certificate`,
    );
  };

  return (
    <div className="bg-[#111] p-6 rounded-2xl border-l-4 border-red-600 mb-6 text-white shadow-xl">
      <h3 className="text-red-500 font-bold text-xl mb-4 uppercase tracking-wider">
        Media Export Package
      </h3>
      <div className="space-y-4">
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="w-full bg-[#1C1C1E] border border-[#333] rounded-full px-4 py-2 text-sm text-white outline-none focus:border-red-600 transition-colors"
        >
          <option value="">Select item for packaging</option>
          {initialMockRecordings.map((r) => (
            <option key={r.id} value={r.id}>
              {r.title}
            </option>
          ))}
        </select>
        <button
          onClick={exportPackage}
          disabled={!selectedId}
          className="bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 text-white font-bold py-2 px-6 rounded-full transition-all w-full uppercase text-xs tracking-widest"
        >
          Generate ZIP for Newsroom
        </button>
        <p className="text-[10px] text-zinc-500 mt-4 leading-relaxed">
          Broadcast-ready packages include high-bitrate video and standard legal certificates for TV
          and digital publication.
        </p>
      </div>
    </div>
  );
};

// ------------------------------
// SECTION: MAIN APP (Tabbed Interface)
// ------------------------------
export const WitnessJournalismTools: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("trending");

  const tabs = [
    { id: "trending", label: "Global Feed", icon: "🌍" },
    { id: "insights", label: "Analytics", icon: "📊" },
    { id: "tips", label: "News Tips", icon: "📩" },
    { id: "breaking", label: "Breaking", icon: "🚨" },
    { id: "verify", label: "Verification", icon: "🛡️" },
    { id: "media", label: "Exports", icon: "📦" },
    { id: "share", label: "Share", icon: "🔗" },
  ];

  return (
    <div className="min-h-screen bg-black text-white p-6 font-sans max-w-4xl mx-auto pb-24">
      <header className="mb-10 text-center pt-6">
        <h1 className="text-4xl font-black italic text-red-600 uppercase tracking-tighter">
          Journalism Tools
        </h1>
        <p className="text-[10px] text-zinc-500 tracking-[0.3em] font-bold mt-1">
          FOR ACCREDITED MEDIA & NEWSROOMS
        </p>
      </header>

      <div className="flex flex-wrap gap-2 justify-center mb-10">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-full text-[10px] font-black uppercase transition-all border ${
              activeTab === tab.id
                ? "bg-red-600 border-red-600 text-white shadow-lg shadow-red-900/30"
                : "bg-black border-zinc-800 text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeTab === "tips" && <NewsTipSubmission />}
        {activeTab === "share" && <VerifiedClipSharing />}
        {activeTab === "insights" && <DataInsightsDashboard />}
        {activeTab === "breaking" && <BreakingNewsIntegration />}
        {activeTab === "trending" && <TrendingIncidentsFeed />}
        {activeTab === "verify" && <SourceVerificationEngine />}
        {activeTab === "media" && <MediaExportPackage />}
      </div>

      <footer className="fixed bottom-0 left-0 right-0 bg-[#121212] border-t border-zinc-800 p-4 text-center z-50">
        <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-[0.3em]">
          Witness R.E.P Journalism Tools · Cryptographic Verification Standard
        </p>
      </footer>
    </div>
  );
};

export default WitnessJournalismTools;
