// WitnessDonationAndGrants.tsx
// Self-contained TypeScript React module for donation, grants, referrals, and points.
// Includes: Voluntary Donation Page, Crypto Donation Page (canvas QR mock),
// Grant Application Tracker (localStorage), Referral Tracking Dashboard,
// Witness Points Display. Displays all in a dark tabbed interface with black background and red accents.
// No external dependencies except React.

import React, { useState, useEffect, useCallback, useRef } from "react";

// ------------------------------
// SECTION: TYPES & MOCK DATA
// ------------------------------
export type GrantStatus =
  | "researching"
  | "drafting"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected";

export interface GrantApplication {
  id: string;
  name: string;
  organization: string;
  maxAmount: number;
  deadline: number; // timestamp
  status: GrantStatus;
  notes: string;
  url: string;
}

export interface ReferralStats {
  totalReferred: number;
  activeReferred: number;
  recordingsFromReferrals: number;
  pointsEarned: number;
}

export interface PointsEntry {
  id: string;
  action: string;
  points: number;
  timestamp: number;
}

export interface AchievementBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement: string;
  earned: boolean;
}

// Helper: generate unique ID
const genId = () => `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

// ------------------------------
// SECTION: VOLUNTARY DONATION PAGE
// ------------------------------
export const VoluntaryDonationPage: React.FC = () => {
  const [amount, setAmount] = useState<number>(10);
  const [customAmount, setCustomAmount] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [monthlyDonations, setMonthlyDonations] = useState(0);
  const [showThankYou, setShowThankYou] = useState(false);
  const monthlyGoal = 40;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("witness_monthly_donations");
    if (stored) setMonthlyDonations(parseInt(stored));
    else setMonthlyDonations(28);
  }, []);

  const handleDonate = () => {
    const donateAmount = amount || parseFloat(customAmount) || 10;
    alert(`Redirecting to Stripe for $${donateAmount}${recurring ? " monthly" : ""} donation.`);
    setShowThankYou(true);
    setTimeout(() => setShowThankYou(false), 3000);

    const newTotal = monthlyDonations + donateAmount;
    setMonthlyDonations(newTotal);
    localStorage.setItem("witness_monthly_donations", newTotal.toString());
  };

  const progressPercent = Math.min(100, (monthlyDonations / monthlyGoal) * 100);

  return (
    <div className="bg-zinc-900 border-l-4 border-red-600 p-6 rounded-2xl shadow-xl mb-6 text-white">
      <h3 className="text-red-600 font-black uppercase tracking-widest text-lg mb-3 italic">
        Support Witness R.E.P
      </h3>
      <p className="text-sm text-zinc-400 mb-4 leading-relaxed">
        Witness R.E.P is ad‑free and will never charge for features. Your voluntary donations keep
        the servers running and the encryption open-source.
      </p>

      <div className="bg-black p-4 rounded-xl border border-zinc-800 mb-6">
        <div className="flex justify-between text-xs font-bold uppercase mb-2 tracking-widest text-zinc-500">
          <span>Infrastructure Goal</span>
          <span className="text-red-600">
            ${monthlyDonations.toFixed(0)} / ${monthlyGoal}
          </span>
        </div>
        <div className="w-full bg-zinc-800 rounded-full h-3 overflow-hidden border border-zinc-700">
          <div
            className="bg-red-600 h-full transition-all duration-1000"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="text-[10px] text-zinc-600 mt-2 uppercase font-black tracking-tighter">
          Raised this month
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[5, 10, 25, 50].map((amt) => (
          <button
            key={amt}
            onClick={() => {
              setAmount(amt);
              setCustomAmount("");
            }}
            className={`py-2 rounded-lg font-black transition-all border ${amount === amt && !customAmount ? "bg-red-600 border-red-600 text-white" : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-red-600"}`}
          >
            ${amt}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <input
          type="number"
          placeholder="Custom Amount ($)"
          value={customAmount}
          onChange={(e) => {
            setCustomAmount(e.target.value);
            setAmount(0);
          }}
          className="w-full bg-black border border-zinc-800 p-3 rounded-xl text-white text-sm focus:border-red-600 outline-none transition-colors"
        />

        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            className="w-5 h-5 accent-red-600 rounded bg-zinc-800 border-zinc-700"
            checked={recurring}
            onChange={(e) => setRecurring(e.target.checked)}
          />
          <span className="text-xs font-black uppercase text-zinc-500 group-hover:text-white transition-colors">
            Enable Monthly Recurring
          </span>
        </label>

        <button
          onClick={handleDonate}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-xl shadow-lg shadow-red-900/20 transition-all uppercase tracking-widest active:scale-95"
        >
          Donate via Stripe
        </button>
      </div>

      {showThankYou && (
        <div className="mt-4 p-3 bg-green-950/30 border border-green-900 text-green-500 text-center rounded-lg text-xs font-bold animate-in fade-in zoom-in">
          ✓ TRANSMISSION RECEIVED. THANK YOU.
        </div>
      )}

      <p className="text-[10px] text-zinc-600 mt-6 italic text-center uppercase tracking-tighter">
        * Witness R.E.P is not a registered 501(c)(3). Donations are not tax‑deductible.
      </p>
    </div>
  );
};

// ------------------------------
// SECTION: CRYPTO DONATION PAGE (with canvas QR mock)
// ------------------------------
const bitcoinAddress = "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq";
const ethereumAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f0b6f0";

const drawMockQR = (canvas: HTMLCanvasElement | null, address: string) => {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  canvas.width = 200;
  canvas.height = 200;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 200, 200);
  ctx.fillStyle = "#000000";
  const size = 8;
  for (let i = 0; i < 21; i++) {
    for (let j = 0; j < 21; j++) {
      const idx = (i * 21 + j) % address.length;
      if (address.charCodeAt(idx) % 2 === 0) {
        ctx.fillRect(i * size + 16, j * size + 16, size - 2, size - 2);
      }
    }
  }
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 4;
  ctx.strokeRect(16, 16, 30, 30);
  ctx.strokeRect(154, 16, 30, 30);
  ctx.strokeRect(16, 154, 30, 30);
};

export const CryptoDonationPage: React.FC = () => {
  const btcCanvasRef = useRef<HTMLCanvasElement>(null);
  const ethCanvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState<"btc" | "eth" | null>(null);

  useEffect(() => {
    drawMockQR(btcCanvasRef.current, bitcoinAddress);
    drawMockQR(ethCanvasRef.current, ethereumAddress);
  }, []);

  const copyAddress = (type: "btc" | "eth", address: string) => {
    navigator.clipboard.writeText(address);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="bg-zinc-900 border-l-4 border-red-600 p-6 rounded-2xl shadow-xl mb-6 text-white">
      <h3 className="text-red-600 font-black uppercase tracking-widest text-lg mb-3 italic">
        Blockchain Support
      </h3>
      <p className="text-sm text-zinc-400 mb-8">
        Maintain network sovereignty with peer‑to‑peer contributions.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-8">
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-black text-orange-500 uppercase mb-3 tracking-widest">
            Bitcoin (BTC)
          </span>
          <div className="bg-white p-3 rounded-2xl shadow-inner mb-4">
            <canvas ref={btcCanvasRef} className="rounded-lg" />
          </div>
          <p className="text-[9px] font-mono text-zinc-600 mb-3 truncate w-full text-center px-4">
            {bitcoinAddress}
          </p>
          <button
            onClick={() => copyAddress("btc", bitcoinAddress)}
            className="w-full bg-zinc-800 hover:bg-red-600 text-white font-black py-2 rounded-xl text-[10px] uppercase transition-all"
          >
            {copied === "btc" ? "✓ COPIED" : "COPY BTC ADDRESS"}
          </button>
        </div>

        <div className="flex flex-col items-center">
          <span className="text-[10px] font-black text-blue-400 uppercase mb-3 tracking-widest">
            Ethereum (ETH)
          </span>
          <div className="bg-white p-3 rounded-2xl shadow-inner mb-4">
            <canvas ref={ethCanvasRef} className="rounded-lg" />
          </div>
          <p className="text-[9px] font-mono text-zinc-600 mb-3 truncate w-full text-center px-4">
            {ethereumAddress}
          </p>
          <button
            onClick={() => copyAddress("eth", ethereumAddress)}
            className="w-full bg-zinc-800 hover:bg-red-600 text-white font-black py-2 rounded-xl text-[10px] uppercase transition-all"
          >
            {copied === "eth" ? "✓ COPIED" : "COPY ETH ADDRESS"}
          </button>
        </div>
      </div>

      <div className="bg-black p-4 rounded-xl border border-zinc-800">
        <p className="text-[10px] text-zinc-500 leading-relaxed font-bold uppercase tracking-tighter">
          * Encrypted ledger confirmed. All crypto assets are utilized for decentralized storage
          nodes and forensic R&D.
        </p>
      </div>
    </div>
  );
};

// ------------------------------
// SECTION: GRANT APPLICATION TRACKER (localStorage)
// ------------------------------
const defaultGrants: GrantApplication[] = [
  {
    id: "1",
    name: "Technology for Democracy",
    organization: "Knight Foundation",
    maxAmount: 500000,
    deadline: Date.now() + 14 * 24 * 60 * 60 * 1000,
    status: "researching",
    notes: "",
    url: "https://knightfoundation.org",
  },
  {
    id: "2",
    name: "Technology and Society",
    organization: "Ford Foundation",
    maxAmount: 300000,
    deadline: Date.now() + 45 * 24 * 60 * 60 * 1000,
    status: "researching",
    notes: "",
    url: "https://fordfoundation.org",
  },
  {
    id: "3",
    name: "Criminal Justice",
    organization: "MacArthur Foundation",
    maxAmount: 250000,
    deadline: Date.now() + 60 * 24 * 60 * 60 * 1000,
    status: "researching",
    notes: "",
    url: "https://macfound.org",
  },
];

export const GrantApplicationTracker: React.FC = () => {
  const [grants, setGrants] = useState<GrantApplication[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<GrantApplication>>({});

  useEffect(() => {
    const stored = localStorage.getItem("witness_grant_apps");
    if (stored) {
      setGrants(JSON.parse(stored));
    } else {
      setGrants(defaultGrants);
      localStorage.setItem("witness_grant_apps", JSON.stringify(defaultGrants));
    }
  }, []);

  const saveGrants = (newGrants: GrantApplication[]) => {
    setGrants(newGrants);
    localStorage.setItem("witness_grant_apps", JSON.stringify(newGrants));
  };

  const addGrant = () => {
    if (!form.name || !form.organization || !form.maxAmount || !form.deadline) return;
    const newGrant: GrantApplication = {
      id: genId(),
      name: form.name,
      organization: form.organization,
      maxAmount: form.maxAmount,
      deadline: new Date(form.deadline).getTime(),
      status: (form.status as GrantStatus) || "researching",
      notes: form.notes || "",
      url: form.url || "",
    };
    saveGrants([...grants, newGrant]);
    setShowForm(false);
    setForm({});
  };

  const updateStatus = (id: string, status: GrantStatus) => {
    const updated = grants.map((g) => (g.id === id ? { ...g, status } : g));
    saveGrants(updated);
  };

  const filteredGrants = grants.filter((g) => statusFilter === "all" || g.status === statusFilter);

  return (
    <div className="bg-zinc-900 border-l-4 border-red-600 p-6 rounded-2xl shadow-xl mb-6 text-white">
      <h3 className="text-red-600 font-black uppercase tracking-widest text-lg mb-4 italic">
        Grant Pipeline
      </h3>

      <div className="flex flex-wrap gap-2 mb-6">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-black border border-zinc-800 rounded-full px-4 py-1.5 text-xs text-red-500 font-bold outline-none focus:border-red-600"
        >
          <option value="all">Filter: ALL</option>
          <option value="researching">RESEARCHING</option>
          <option value="drafting">DRAFTING</option>
          <option value="submitted">SUBMITTED</option>
          <option value="approved">APPROVED</option>
        </select>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-red-600 hover:bg-red-700 px-4 py-1.5 rounded-full text-xs font-black uppercase transition-all"
        >
          {showForm ? "Cancel" : "+ New Entry"}
        </button>
      </div>

      {showForm && (
        <div className="bg-black p-5 rounded-2xl border border-zinc-800 mb-6 space-y-4 animate-in slide-in-from-top-4 duration-300">
          <input
            placeholder="Grant name"
            value={form.name || ""}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-xl text-sm"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="Org"
              value={form.organization || ""}
              onChange={(e) => setForm({ ...form, organization: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-xl text-sm"
            />
            <input
              type="number"
              placeholder="Amount ($)"
              value={form.maxAmount || ""}
              onChange={(e) => setForm({ ...form, maxAmount: parseInt(e.target.value) })}
              className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-xl text-sm"
            />
          </div>
          <input
            type="date"
            className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-xl text-sm text-zinc-500"
            onChange={(e) => setForm({ ...form, deadline: new Date(e.target.value).getTime() })}
          />
          <button
            onClick={addGrant}
            className="w-full bg-red-600 py-3 rounded-xl font-black text-xs uppercase"
          >
            Initialize Application
          </button>
        </div>
      )}

      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {filteredGrants.map((grant) => (
          <div
            key={grant.id}
            className="bg-black border border-zinc-800 p-4 rounded-xl hover:border-red-900/50 transition-all"
          >
            <div className="flex justify-between items-start mb-2">
              <span className="font-black text-sm uppercase tracking-tight">{grant.name}</span>
              <span className="text-[9px] bg-red-600/20 text-red-500 px-2 py-0.5 rounded font-black uppercase italic">
                {Math.ceil((grant.deadline - Date.now()) / (1000 * 60 * 60 * 24))} Days Left
              </span>
            </div>
            <div className="text-[10px] text-zinc-500 font-bold uppercase mb-4 tracking-widest">
              {grant.organization} · ${grant.maxAmount.toLocaleString()}
            </div>
            <div className="flex gap-2">
              <select
                value={grant.status}
                onChange={(e) => updateStatus(grant.id, e.target.value as GrantStatus)}
                className="bg-zinc-900 border border-zinc-800 text-[9px] font-black uppercase p-1.5 rounded outline-none text-zinc-400 focus:text-red-500"
              >
                <option value="researching">Researching</option>
                <option value="drafting">Drafting</option>
                <option value="submitted">Submitted</option>
                <option value="approved">Approved</option>
              </select>
              <a
                href={grant.url}
                target="_blank"
                rel="noreferrer"
                className="text-[9px] font-black bg-zinc-800 px-3 py-1.5 rounded uppercase hover:bg-zinc-700 flex items-center"
              >
                View Specs
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ------------------------------
// SECTION: REFERRAL TRACKING DASHBOARD
// ------------------------------
export const ReferralTrackingDashboard: React.FC = () => {
  const [referralCode] = useState(
    () =>
      (typeof window !== "undefined" ? localStorage.getItem("witness_ref_code") : null) ||
      `WITNESS-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
  );
  const [stats] = useState<ReferralStats>({
    totalReferred: 8,
    activeReferred: 6,
    recordingsFromReferrals: 42,
    pointsEarned: 1200,
  });

  const shareNative = () => {
    const link = `${window.location.origin}/signup?ref=${referralCode}`;
    if (navigator.share) {
      navigator.share({
        title: "Join Witness R.E.P",
        text: "Join the secure evidence network.",
        url: link,
      });
    } else {
      navigator.clipboard.writeText(link);
      alert("Referral key copied to clipboard.");
    }
  };

  return (
    <div className="bg-zinc-900 border-l-4 border-red-600 p-6 rounded-2xl shadow-xl mb-6 text-white">
      <h3 className="text-red-600 font-black uppercase tracking-widest text-lg mb-4 italic">
        Network Growth
      </h3>

      <div className="bg-black p-5 rounded-2xl border border-zinc-800 mb-8 text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 p-2 opacity-5 font-black text-4xl -rotate-12">
          REF
        </div>
        <p className="text-[10px] font-bold text-zinc-600 uppercase mb-2 tracking-widest">
          Your Distribution Key
        </p>
        <div className="text-2xl font-black text-white tracking-[0.2em] mb-6">{referralCode}</div>
        <button
          onClick={shareNative}
          className="bg-red-600 hover:bg-red-700 text-white font-black py-2 px-8 rounded-full text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-red-900/20"
        >
          Share Invite Link
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-900">
          <span className="text-[9px] text-zinc-600 font-black uppercase block mb-1">
            Nodes Recruited
          </span>
          <span className="text-xl font-bold text-white">{stats.totalReferred}</span>
        </div>
        <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-900">
          <span className="text-[9px] text-zinc-600 font-black uppercase block mb-1">
            Rewards Claimed
          </span>
          <span className="text-xl font-bold text-red-500">
            {stats.pointsEarned} <span className="text-[8px] tracking-tighter">PTS</span>
          </span>
        </div>
      </div>
    </div>
  );
};

// ------------------------------
// SECTION: WITNESS POINTS DISPLAY
// ------------------------------
export const WitnessPointsDisplay: React.FC = () => {
  const [points, setPoints] = useState<number>(0);
  const [userBadges] = useState<AchievementBadge[]>(badges);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("witness_points");
    setPoints(stored ? parseInt(stored) : 1250);
  }, []);

  return (
    <div className="bg-zinc-900 border-l-4 border-red-600 p-6 rounded-2xl shadow-xl mb-6 text-white">
      <div className="text-center mb-10">
        <h3 className="text-red-600 font-black uppercase tracking-[0.3em] text-xs mb-2 italic">
          Integrity Score
        </h3>
        <div className="text-7xl font-black text-white tracking-tighter italic">
          {points.toLocaleString()}
        </div>
        <div className="mt-4 flex justify-center gap-2">
          <span className="bg-green-900/20 text-green-500 border border-green-800 text-[9px] px-3 py-1 rounded-full font-black uppercase">
            Verified Node
          </span>
          <span className="bg-red-600/20 text-red-500 border border-red-800 text-[9px] px-3 py-1 rounded-full font-black uppercase italic">
            Elite Observer
          </span>
        </div>
      </div>

      <div className="space-y-6">
        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-2">
          Achievement Registry
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {userBadges.map((badge) => (
            <div
              key={badge.id}
              className="flex flex-col items-center text-center p-4 bg-black rounded-2xl border border-zinc-900 opacity-80 group hover:border-red-600 transition-all"
            >
              <span className="text-4xl mb-2 drop-shadow-[0_0_10px_rgba(232,0,28,0.2)]">
                {badge.icon}
              </span>
              <span className="text-[10px] font-black uppercase text-white mb-1 leading-tight">
                {badge.name}
              </span>
              <span className="text-[8px] text-zinc-600 font-bold uppercase tracking-tighter">
                {badge.requirement}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const badges: AchievementBadge[] = [
  {
    id: "first_witness",
    name: "First Witness",
    description: "Record your first video",
    icon: "🎥",
    requirement: "1 recording",
    earned: true,
  },
  {
    id: "certified",
    name: "Certified",
    description: "Generate first certificate",
    icon: "📜",
    requirement: "1 certificate",
    earned: true,
  },
  {
    id: "guardian",
    name: "Guardian",
    description: "Send first SOS",
    icon: "🛡️",
    requirement: "1 SOS alert",
    earned: false,
  },
  {
    id: "broadcaster",
    name: "Broadcaster",
    description: "First livestream",
    icon: "📡",
    requirement: "1 livestream",
    earned: false,
  },
  {
    id: "community_pillar",
    name: "Community Pillar",
    description: "Refer 10 people",
    icon: "🏛️",
    requirement: "10 referrals",
    earned: false,
  },
  {
    id: "veteran",
    name: "Veteran",
    description: "100 recordings",
    icon: "🎖️",
    requirement: "100 recordings",
    earned: false,
  },
];

// ------------------------------
// SECTION: MAIN APP (Tabbed Interface)
// ------------------------------
export const MainApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    "donate" | "crypto" | "grants" | "referral" | "points"
  >("donate");

  return (
    <div className="bg-black min-h-screen text-white font-sans selection:bg-red-600/30">
      <div className="max-w-xl mx-auto px-6 py-12 pb-32">
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-black italic tracking-tighter text-red-600 uppercase mb-1">
            Witness Hub
          </h1>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.4em] mt-1">
            Sustaining the Forensic Narrative
          </p>
        </header>

        <div className="flex gap-2 p-1 bg-zinc-950 border border-zinc-900 rounded-2xl mb-10 shadow-2xl">
          {(["donate", "crypto", "grants", "referral", "points"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all tracking-widest ${
                activeTab === tab
                  ? "bg-red-600 text-white shadow-lg shadow-red-900/20"
                  : "text-zinc-600 hover:text-zinc-400"
              }`}
            >
              {tab === "points" ? "XP" : tab}
            </button>
          ))}
        </div>

        <main className="animate-in fade-in duration-500">
          {activeTab === "donate" && <VoluntaryDonationPage />}
          {activeTab === "crypto" && <CryptoDonationPage />}
          {activeTab === "grants" && <GrantApplicationTracker />}
          {activeTab === "referral" && <ReferralTrackingDashboard />}
          {activeTab === "points" && <WitnessPointsDisplay />}
        </main>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #27272a; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #ef4444; }
      `}</style>

      <footer className="fixed bottom-0 left-0 right-0 p-4 bg-black/80 backdrop-blur-md border-t border-zinc-900 text-center pointer-events-none z-40">
        <p className="text-[8px] font-black text-zinc-700 uppercase tracking-[0.6em]">
          Witness R.E.P • Distributed Integrity v2.4.0
        </p>
      </footer>
    </div>
  );
};

export default MainApp;
