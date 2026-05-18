// WitnessMonetizationAndGrowth.tsx
// Self-contained TypeScript React module for Witness R.E.P monetization and growth features.
// Includes: Voluntary Donation (Stripe placeholder), Crypto Donation (BTC/ETH with QR placeholder),
// Referral System, Witness Points System, Achievement Badges, Monthly Personal Report, Grant Tracker.
// Uses localStorage for state management. No external dependencies except React.

import React, { useState, useEffect, useCallback, useRef } from "react";

// ------------------------------
// SECTION: TYPES & MOCK STORAGE HELPERS
// ------------------------------
export type GrantStatus =
  | "researching"
  | "drafting"
  | "submitted"
  | "under review"
  | "approved"
  | "rejected";

export interface UserProfile {
  id: string;
  referralCode: string;
  points: number;
  badges: string[];
  referredBy?: string;
}

export interface ReferralRelationship {
  id: string;
  referrerId: string;
  referredId: string;
  createdAt: number;
  active: boolean;
}

export interface PointsLogEntry {
  id: string;
  userId: string;
  action: string;
  points: number;
  timestamp: number;
}

export interface MonthlyReport {
  userId: string;
  yearMonth: string; // "2025-01"
  totalRecordings: number;
  totalDurationSec: number;
  totalCertificates: number;
  totalSOS: number;
  totalLivestreams: number;
  totalViewers: number;
  storageUsedMB: number;
  recordingLocations: { lat: number; lng: number }[];
  createdAt: number;
}

export interface GrantApplication {
  id: string;
  grantName: string;
  organization: string;
  maxAmount: number;
  deadline: number; // timestamp
  status: GrantStatus;
  notes: string;
  link: string;
}

// Demo user ID placeholder (replaced by real auth in production)
const DEMO_USER_ID = "user_demo";
const DEMO_USER_NAME = "Demo User";

// Helper: generate random ID
const genId = () => `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

// Mock storage functions
const getUserProfile = (userId: string): UserProfile => {
  const stored = localStorage.getItem(`witness_user_profile_${userId}`);
  if (stored) return JSON.parse(stored);
  const referralCode = `WITNESS-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const newProfile: UserProfile = { id: userId, referralCode, points: 0, badges: [] };
  localStorage.setItem(`witness_user_profile_${userId}`, JSON.stringify(newProfile));
  return newProfile;
};

const updateUserProfile = (userId: string, updates: Partial<UserProfile>) => {
  const profile = getUserProfile(userId);
  const updated = { ...profile, ...updates };
  localStorage.setItem(`witness_user_profile_${userId}`, JSON.stringify(updated));
  return updated;
};

const getReferralRelationships = (): ReferralRelationship[] => {
  const stored = localStorage.getItem("witness_referral_relationships");
  return stored ? JSON.parse(stored) : [];
};

const saveReferralRelationship = (rel: ReferralRelationship) => {
  const rels = getReferralRelationships();
  rels.push(rel);
  localStorage.setItem("witness_referral_relationships", JSON.stringify(rels));
};

const getPointsLog = (userId: string): PointsLogEntry[] => {
  const stored = localStorage.getItem(`witness_points_log_${userId}`);
  return stored ? JSON.parse(stored) : [];
};

const addPointsLog = (userId: string, action: string, points: number) => {
  const log = getPointsLog(userId);
  const entry: PointsLogEntry = { id: genId(), userId, action, points, timestamp: Date.now() };
  log.push(entry);
  localStorage.setItem(`witness_points_log_${userId}`, JSON.stringify(log));
  // Update profile points
  const profile = getUserProfile(userId);
  updateUserProfile(userId, { points: profile.points + points });
};

const getMonthlyReport = (userId: string, yearMonth: string): MonthlyReport | null => {
  const stored = localStorage.getItem(`witness_monthly_report_${userId}_${yearMonth}`);
  return stored ? JSON.parse(stored) : null;
};

const saveMonthlyReport = (report: MonthlyReport) => {
  localStorage.setItem(
    `witness_monthly_report_${report.userId}_${report.yearMonth}`,
    JSON.stringify(report),
  );
};

const getGrantApplications = (): GrantApplication[] => {
  const stored = localStorage.getItem("witness_grant_applications");
  if (stored) return JSON.parse(stored);
  const now = Date.now();
  const defaults: GrantApplication[] = [
    {
      id: genId(),
      grantName: "Knight Foundation Tech",
      organization: "Knight Foundation",
      maxAmount: 150000,
      deadline: now + 30 * 24 * 60 * 60 * 1000,
      status: "researching",
      notes: "",
      link: "https://knightfoundation.org",
    },
    {
      id: genId(),
      grantName: "Civil Rights Growth",
      organization: "Ford Foundation",
      maxAmount: 200000,
      deadline: now + 45 * 24 * 60 * 60 * 1000,
      status: "researching",
      notes: "",
      link: "https://fordfoundation.org",
    },
    {
      id: genId(),
      grantName: "Public Safety Fund",
      organization: "MacArthur",
      maxAmount: 250000,
      deadline: now + 60 * 24 * 60 * 60 * 1000,
      status: "researching",
      notes: "",
      link: "https://macfound.org",
    },
    {
      id: genId(),
      grantName: "Open Society Grant",
      organization: "Open Society",
      maxAmount: 100000,
      deadline: now + 15 * 24 * 60 * 60 * 1000,
      status: "researching",
      notes: "",
      link: "https://opensocietyfoundations.org",
    },
  ];
  localStorage.setItem("witness_grant_applications", JSON.stringify(defaults));
  return defaults;
};

const saveGrantApplications = (grants: GrantApplication[]) => {
  localStorage.setItem("witness_grant_applications", JSON.stringify(grants));
};

const awardPointsAndCheckBadges = (userId: string, action: string, points: number) => {
  addPointsLog(userId, action, points);
  const profile = getUserProfile(userId);
  const badges = [...profile.badges];
  const newBadges: string[] = [];
  const pointsLog = getPointsLog(userId);

  const totalRecordings = pointsLog.filter((e) => e.action === "recording").length;
  const totalCertificates = pointsLog.filter((e) => e.action === "certificate").length;
  const totalSOS = pointsLog.filter((e) => e.action === "sos").length;
  const totalLivestreams = pointsLog.filter((e) => e.action === "livestream").length;
  const totalReferrals = getReferralRelationships().filter((r) => r.referrerId === userId).length;

  if (totalRecordings >= 1 && !badges.includes("first_witness")) newBadges.push("first_witness");
  if (totalCertificates >= 1 && !badges.includes("certified")) newBadges.push("certified");
  if (totalSOS >= 1 && !badges.includes("guardian")) newBadges.push("guardian");
  if (totalLivestreams >= 1 && !badges.includes("broadcaster")) newBadges.push("broadcaster");
  if (totalReferrals >= 10 && !badges.includes("community_pillar"))
    newBadges.push("community_pillar");
  if (totalRecordings >= 100 && !badges.includes("veteran")) newBadges.push("veteran");
  if (totalCertificates >= 50 && !badges.includes("truth_keeper")) newBadges.push("truth_keeper");

  if (newBadges.length > 0) {
    newBadges.forEach((b) => addPointsLog(userId, `badge_${b}`, 100));
    updateUserProfile(userId, { badges: [...badges, ...newBadges] });
    window.dispatchEvent(
      new CustomEvent("witness_badge_earned", { detail: { badges: newBadges } }),
    );
  }
};

// ------------------------------
// SECTION: VOLUNTARY DONATION PAGE
// ------------------------------
export const DonationPage: React.FC = () => {
  const [amount, setAmount] = useState<number>(10);
  const [customAmount, setCustomAmount] = useState("");
  const [recurring, setRecurring] = useState(false);
  const monthlyDonations = 1250;
  const monthlyGoal = 5000;

  const handleDonate = () => {
    alert(
      `Stripe integration: Initializing payment for $${amount}${recurring ? " (Monthly)" : ""}`,
    );
  };

  return (
    <div className="bg-zinc-900 p-6 rounded-xl border-l-4 border-red-600 mb-6 text-white shadow-2xl">
      <h3 className="text-red-500 font-bold text-xl mb-3 uppercase tracking-wider">
        Support Witness R.E.P
      </h3>
      <p className="text-sm text-zinc-300 mb-4 leading-relaxed">
        Your contributions ensure that Witness remains ad-free, end-to-end encrypted, and available
        to those who need it most.
      </p>

      <div className="bg-black p-4 rounded-lg border border-zinc-800 mb-6">
        <div className="flex justify-between text-xs font-bold uppercase mb-2">
          <span className="text-zinc-500">Monthly Goal</span>
          <span className="text-red-500">
            ${monthlyDonations} / ${monthlyGoal}
          </span>
        </div>
        <div className="w-full bg-zinc-800 rounded-full h-3 overflow-hidden">
          <div
            className="bg-red-600 h-full transition-all duration-1000"
            style={{ width: `${(monthlyDonations / monthlyGoal) * 100}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {[5, 10, 25, 50].map((amt) => (
          <button
            key={amt}
            onClick={() => {
              setAmount(amt);
              setCustomAmount("");
            }}
            className={`py-2 rounded-lg font-bold transition-all border ${amount === amt ? "bg-red-600 border-red-600 text-white" : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-red-500"}`}
          >
            ${amt}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        <input
          type="number"
          placeholder="Custom Amount ($)"
          className="bg-black border border-zinc-800 p-3 rounded-lg text-white focus:outline-none focus:border-red-600"
          value={customAmount}
          onChange={(e) => {
            setCustomAmount(e.target.value);
            setAmount(parseFloat(e.target.value) || 0);
          }}
        />
        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            className="w-5 h-5 accent-red-600 rounded bg-zinc-800 border-zinc-700"
            checked={recurring}
            onChange={(e) => setRecurring(e.target.checked)}
          />
          <span className="text-sm text-zinc-400 group-hover:text-white transition-colors uppercase font-bold tracking-tighter">
            Enable Monthly Recurring
          </span>
        </label>
        <button
          onClick={handleDonate}
          className="bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-xl shadow-lg transition-all uppercase tracking-widest mt-2"
        >
          Donate via Stripe
        </button>
      </div>
      <p className="text-[10px] text-zinc-500 mt-4 italic text-center">
        * Witness R.E.P is not currently a 501(c)(3). Contributions are not tax-deductible.
      </p>
    </div>
  );
};

// ------------------------------
// SECTION: CRYPTO DONATION
// ------------------------------
const BITCOIN_ADDR = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa";
const ETH_ADDR = "0x742d35Cc6634C0532925a3b844Bc9e7595f0b6f0";

export const CryptoDonation: React.FC = () => {
  const btcCanvasRef = useRef<HTMLCanvasElement>(null);
  const ethCanvasRef = useRef<HTMLCanvasElement>(null);

  const drawQR = (canvas: HTMLCanvasElement | null, address: string) => {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 200, 200);
    ctx.fillStyle = "#000000";
    // Simulated QR Blocks
    for (let i = 0; i < 400; i++) {
      if (Math.random() > 0.5) {
        ctx.fillRect((i % 20) * 10, Math.floor(i / 20) * 10, 10, 10);
      }
    }
    // QR Markers
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 10;
    ctx.strokeRect(10, 10, 50, 50);
    ctx.strokeRect(140, 10, 50, 50);
    ctx.strokeRect(10, 140, 50, 50);
    // Overlay logo-ish
    ctx.fillStyle = "#d32f2f";
    ctx.font = "bold 14px sans-serif";
    ctx.fillText("REP", 85, 110);
  };

  useEffect(() => {
    drawQR(btcCanvasRef.current, BITCOIN_ADDR);
    drawQR(ethCanvasRef.current, ETH_ADDR);
  }, []);

  const copy = (addr: string) => {
    navigator.clipboard.writeText(addr);
    alert("Address copied to clipboard.");
  };

  return (
    <div className="bg-zinc-900 p-6 rounded-xl border-l-4 border-red-600 mb-6 text-white">
      <h3 className="text-red-500 font-bold text-xl mb-6 uppercase tracking-wider">
        Blockchain Support
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div className="flex flex-col items-center gap-4 bg-black p-6 rounded-xl border border-zinc-800">
          <span className="font-bold text-orange-500">BITCOIN (BTC)</span>
          <canvas ref={btcCanvasRef} width={200} height={200} className="rounded-lg shadow-xl" />
          <button
            onClick={() => copy(BITCOIN_ADDR)}
            className="bg-zinc-800 hover:bg-zinc-700 text-xs px-4 py-2 rounded-full font-bold"
          >
            Copy BTC Address
          </button>
        </div>
        <div className="flex flex-col items-center gap-4 bg-black p-6 rounded-xl border border-zinc-800">
          <span className="font-bold text-blue-400">ETHEREUM (ETH)</span>
          <canvas ref={ethCanvasRef} width={200} height={200} className="rounded-lg shadow-xl" />
          <button
            onClick={() => copy(ETH_ADDR)}
            className="bg-zinc-800 hover:bg-zinc-700 text-xs px-4 py-2 rounded-full font-bold"
          >
            Copy ETH Address
          </button>
        </div>
      </div>
    </div>
  );
};

// ------------------------------
// SECTION: REFERRAL SYSTEM
// ------------------------------
export const useReferralSystem = () => {
  const [profile, setProfile] = useState<UserProfile>(() => getUserProfile(DEMO_USER_ID));
  const [referrals, setReferrals] = useState<ReferralRelationship[]>([]);

  const refresh = useCallback(() => {
    const prof = getUserProfile(DEMO_USER_ID);
    setProfile(prof);
    setReferrals(getReferralRelationships().filter((r) => r.referrerId === DEMO_USER_ID));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const getLink = () => `${window.location.origin}/signup?ref=${profile.referralCode}`;

  const share = () => {
    navigator.clipboard.writeText(getLink());
    alert("Referral link copied!");
  };

  return { profile, referrals, getLink, share, refresh };
};

export const ReferralUI: React.FC = () => {
  const { profile, referrals, share } = useReferralSystem();
  const activeCount = referrals.filter((r) => r.active).length;

  return (
    <div className="bg-zinc-900 p-6 rounded-xl border-l-4 border-red-600 mb-6 text-white">
      <h3 className="text-red-500 font-bold text-xl mb-4 uppercase tracking-wider">
        Witness Network Referral
      </h3>
      <div className="bg-black p-5 rounded-xl border border-zinc-800 mb-6">
        <p className="text-xs text-zinc-500 uppercase font-black mb-2">Your Unique Code</p>
        <div className="flex justify-between items-center">
          <span className="text-2xl font-mono text-white tracking-tighter">
            {profile.referralCode}
          </span>
          <button
            onClick={share}
            className="bg-red-600 p-2 rounded-lg hover:bg-red-700 transition-all"
          >
            📋
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-black p-4 rounded-xl border border-zinc-800 text-center">
          <span className="block text-2xl font-bold text-red-500">{activeCount}</span>
          <span className="text-[10px] text-zinc-500 uppercase font-bold">
            Successful Referrals
          </span>
        </div>
        <div className="bg-black p-4 rounded-xl border border-zinc-800 text-center">
          <span className="block text-2xl font-bold text-red-500">{activeCount * 150}</span>
          <span className="text-[10px] text-zinc-500 uppercase font-bold">Points Earned</span>
        </div>
      </div>

      <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800">
        <p className="text-xs font-bold text-zinc-400 uppercase mb-3">Community Leaderboard</p>
        <div className="space-y-2">
          <div className="flex justify-between text-sm py-1 border-b border-zinc-900">
            <span className="text-zinc-300">1. Observer_Alpha</span>
            <span className="text-red-500 font-bold">42 Refs</span>
          </div>
          <div className="flex justify-between text-sm py-1 border-b border-zinc-900">
            <span className="text-zinc-300">2. Rights_Advocate</span>
            <span className="text-red-500 font-bold">29 Refs</span>
          </div>
          <div className="flex justify-between text-sm py-1">
            <span className="text-zinc-300">You ({DEMO_USER_NAME})</span>
            <span className="text-red-500 font-bold">{activeCount} Refs</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ------------------------------
// SECTION: WITNESS POINTS SYSTEM
// ------------------------------
export const usePointsSystem = () => {
  const [profile, setProfile] = useState<UserProfile>(() => getUserProfile(DEMO_USER_ID));
  const [pointsLog, setPointsLog] = useState<PointsLogEntry[]>([]);

  const refresh = useCallback(() => {
    setProfile(getUserProfile(DEMO_USER_ID));
    setPointsLog(getPointsLog(DEMO_USER_ID));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const simulateAction = (action: string, pts: number) => {
    awardPointsAndCheckBadges(DEMO_USER_ID, action, pts);
    refresh();
  };

  return { profile, pointsLog, simulateAction, refresh };
};

export const PointsUI: React.FC = () => {
  const { profile, pointsLog, simulateAction } = usePointsSystem();

  return (
    <div className="bg-zinc-900 p-6 rounded-xl border-l-4 border-red-600 mb-6 text-white shadow-2xl">
      <h3 className="text-red-500 font-bold text-xl mb-2 uppercase tracking-wider">
        Witness Rewards
      </h3>
      <div className="flex items-baseline gap-2 mb-6">
        <span className="text-5xl font-black text-white tracking-tighter">{profile.points}</span>
        <span className="text-zinc-500 font-bold uppercase text-xs">Total Points</span>
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        <button
          onClick={() => simulateAction("recording", 10)}
          className="bg-zinc-800 hover:bg-red-900 px-3 py-1.5 rounded-full text-[10px] font-black uppercase border border-zinc-700"
        >
          Record (+10)
        </button>
        <button
          onClick={() => simulateAction("certificate", 50)}
          className="bg-zinc-800 hover:bg-red-900 px-3 py-1.5 rounded-full text-[10px] font-black uppercase border border-zinc-700"
        >
          Certify (+50)
        </button>
        <button
          onClick={() => simulateAction("sos", 25)}
          className="bg-zinc-800 hover:bg-red-900 px-3 py-1.5 rounded-full text-[10px] font-black uppercase border border-zinc-700"
        >
          SOS (+25)
        </button>
        <button
          onClick={() => simulateAction("verification", 200)}
          className="bg-zinc-800 hover:bg-red-900 px-3 py-1.5 rounded-full text-[10px] font-black uppercase border border-zinc-700"
        >
          Verify (+200)
        </button>
      </div>

      <div className="bg-black p-4 rounded-xl border border-zinc-800">
        <p className="text-xs font-bold text-zinc-500 uppercase mb-3">Activity Ledger</p>
        <div className="space-y-3 max-h-40 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-800">
          {pointsLog.length === 0 && (
            <p className="text-xs text-zinc-600 italic">No activity yet.</p>
          )}
          {pointsLog
            .slice()
            .reverse()
            .map((entry) => (
              <div
                key={entry.id}
                className="flex justify-between items-center text-xs border-b border-zinc-900 pb-2"
              >
                <div className="flex flex-col">
                  <span className="text-zinc-300 font-bold uppercase">
                    {entry.action.replace("_", " ")}
                  </span>
                  <span className="text-[10px] text-zinc-600">
                    {new Date(entry.timestamp).toLocaleDateString()}
                  </span>
                </div>
                <span className="text-green-500 font-bold">+{entry.points}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

// ------------------------------
// SECTION: ACHIEVEMENT BADGES
// ------------------------------
const BADGE_DEFS = [
  { id: "first_witness", name: "First Witness", requirement: "1 Video Recorded", icon: "🎥" },
  { id: "certified", name: "Certified", requirement: "1 Certificate Generated", icon: "📜" },
  { id: "guardian", name: "Guardian", requirement: "1 SOS Alert Sent", icon: "🛡️" },
  { id: "broadcaster", name: "Broadcaster", requirement: "1 Livestream Started", icon: "📡" },
  { id: "community_pillar", name: "Community Pillar", requirement: "10 Referrals", icon: "🏛️" },
  { id: "veteran", name: "Veteran", requirement: "100 Videos Recorded", icon: "🎖️" },
];

export const BadgesUI: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile>(() => getUserProfile(DEMO_USER_ID));

  useEffect(() => {
    const check = () => setProfile(getUserProfile(DEMO_USER_ID));
    const interval = setInterval(check, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-zinc-900 p-6 rounded-xl border-l-4 border-red-600 mb-6 text-white shadow-2xl">
      <h3 className="text-red-500 font-bold text-xl mb-6 uppercase tracking-wider">
        Achievement Badges
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
        {BADGE_DEFS.map((badge) => {
          const earned = profile.badges.includes(badge.id);
          return (
            <div
              key={badge.id}
              className={`flex flex-col items-center p-4 rounded-xl border transition-all ${earned ? "bg-zinc-950 border-red-900/50" : "bg-zinc-950 border-zinc-800 opacity-30 grayscale"}`}
            >
              <span className="text-4xl mb-2">{badge.icon}</span>
              <span className="text-[10px] font-black uppercase text-center text-white mb-1 leading-tight">
                {badge.name}
              </span>
              <span className="text-[8px] text-zinc-500 text-center uppercase tracking-tighter">
                {badge.requirement}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ------------------------------
// SECTION: MONTHLY PERSONAL REPORT
// ------------------------------
export const MonthlyReportUI: React.FC = () => {
  const [report, setReport] = useState<MonthlyReport | null>(null);

  useEffect(() => {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const stored = getMonthlyReport(DEMO_USER_ID, ym);
    if (stored) {
      setReport(stored);
    } else {
      const logs = getPointsLog(DEMO_USER_ID);
      const newReport: MonthlyReport = {
        userId: DEMO_USER_ID,
        yearMonth: ym,
        totalRecordings: logs.filter((l) => l.action === "recording").length,
        totalDurationSec: logs.filter((l) => l.action === "recording").length * 45,
        totalCertificates: logs.filter((l) => l.action === "certificate").length,
        totalSOS: logs.filter((l) => l.action === "sos").length,
        totalLivestreams: logs.filter((l) => l.action === "livestream").length,
        totalViewers: 124,
        storageUsedMB: logs.length * 1.5,
        recordingLocations: [{ lat: 40.7128, lng: -74.006 }],
        createdAt: Date.now(),
      };
      saveMonthlyReport(newReport);
      setReport(newReport);
    }
  }, []);

  if (!report)
    return (
      <div className="text-zinc-500 font-bold animate-pulse text-center p-12">
        Generating Forensic Report...
      </div>
    );

  return (
    <div className="bg-zinc-900 p-8 rounded-2xl border-l-4 border-red-600 mb-6 text-white shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-10 font-black text-6xl italic -rotate-12 select-none pointer-events-none">
        WITNESS
      </div>

      <div className="flex justify-between items-start mb-10">
        <div>
          <h3 className="text-red-500 font-bold text-2xl uppercase tracking-tighter">
            Impact Summary
          </h3>
          <span className="text-zinc-500 font-mono text-xs uppercase">
            {report.yearMonth} Ledger
          </span>
        </div>
        <div className="text-right">
          <div className="text-xs text-zinc-500 uppercase font-black">Storage Footprint</div>
          <div className="text-xl font-bold">{report.storageUsedMB.toFixed(1)} MB</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-y-8 gap-x-4 mb-10">
        <div>
          <div className="text-zinc-500 text-[10px] uppercase font-bold mb-1">
            Encrypted Records
          </div>
          <div className="text-2xl font-black text-white">{report.totalRecordings}</div>
        </div>
        <div>
          <div className="text-zinc-500 text-[10px] uppercase font-bold mb-1">
            Valid Certificates
          </div>
          <div className="text-2xl font-black text-white">{report.totalCertificates}</div>
        </div>
        <div>
          <div className="text-zinc-500 text-[10px] uppercase font-bold mb-1">
            Emergency SOS Events
          </div>
          <div className="text-2xl font-black text-white">{report.totalSOS}</div>
        </div>
        <div>
          <div className="text-zinc-500 text-[10px] uppercase font-bold mb-1">Network Viewers</div>
          <div className="text-2xl font-black text-white">{report.totalViewers}</div>
        </div>
      </div>

      <button
        onClick={() => alert("PDF Report exported to internal vault.")}
        className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-xl shadow-lg transition-all uppercase tracking-widest"
      >
        Download Encrypted PDF
      </button>
    </div>
  );
};

// ------------------------------
// SECTION: GRANT APPLICATION TRACKER
// ------------------------------
export const GrantTracker: React.FC = () => {
  const [grants, setGrants] = useState<GrantApplication[]>(() => getGrantApplications());
  const [filter, setFilter] = useState<string>("all");

  const updateStatus = (id: string, newStatus: GrantStatus) => {
    const updated = grants.map((g) => (g.id === id ? { ...g, status: newStatus } : g));
    setGrants(updated);
    saveGrantApplications(updated);
  };

  const updateNotes = (id: string, n: string) => {
    const updated = grants.map((g) => (g.id === id ? { ...g, notes: n } : g));
    setGrants(updated);
    saveGrantApplications(updated);
  };

  const sortedGrants = [...grants]
    .filter((g) => filter === "all" || g.status === filter)
    .sort((a, b) => a.deadline - b.deadline);

  return (
    <div className="bg-zinc-900 p-6 rounded-xl border-l-4 border-red-600 mb-6 text-white shadow-2xl">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-red-500 font-bold text-xl uppercase tracking-wider">Advocacy Grants</h3>
        <select
          className="bg-black border border-zinc-800 text-[10px] uppercase font-bold p-1 rounded outline-none text-red-500"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">Filter: ALL</option>
          <option value="researching">RESEARCHING</option>
          <option value="submitted">SUBMITTED</option>
          <option value="approved">APPROVED</option>
        </select>
      </div>

      <div className="space-y-4">
        {sortedGrants.map((grant) => (
          <div
            key={grant.id}
            className="bg-zinc-950 p-4 rounded-xl border border-zinc-900 hover:border-red-900/50 transition-all"
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-sm font-black text-white">{grant.grantName}</span>
              <span className="text-[10px] bg-red-600 px-2 py-0.5 rounded-full font-bold uppercase italic">
                {Math.ceil((grant.deadline - Date.now()) / (1000 * 60 * 60 * 24))} Days Left
              </span>
            </div>
            <div className="flex gap-4 text-[10px] text-zinc-500 uppercase font-bold mb-4">
              <span>{grant.organization}</span>
              <span className="text-red-500">${grant.maxAmount.toLocaleString()}</span>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold text-zinc-600 uppercase">Status:</span>
                <select
                  className="bg-black border border-zinc-800 text-[9px] uppercase font-bold p-1 rounded outline-none text-white"
                  value={grant.status}
                  onChange={(e) => updateStatus(grant.id, e.target.value as GrantStatus)}
                >
                  <option value="researching">Researching</option>
                  <option value="drafting">Drafting</option>
                  <option value="submitted">Submitted</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <textarea
                className="w-full bg-black border border-zinc-800 p-2 rounded text-xs text-zinc-400 focus:outline-none"
                placeholder="Grant log/notes..."
                rows={2}
                value={grant.notes}
                onChange={(e) => updateNotes(grant.id, e.target.value)}
              />
              <a
                href={grant.link}
                target="_blank"
                rel="noreferrer"
                className="text-red-500 text-[10px] font-bold uppercase underline hover:text-red-400"
              >
                View Official Guidelines
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ------------------------------
// SECTION: MAIN APP (Tabbed Interface)
// ------------------------------
export const MainApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("impact");

  const tabs = [
    { id: "impact", label: "Monthly Impact" },
    { id: "donations", label: "Donations" },
    { id: "rewards", label: "Rewards" },
    { id: "grants", label: "Grants" },
  ];

  return (
    <div className="min-h-screen bg-black text-white p-4 font-sans max-w-2xl mx-auto pb-24">
      <header className="mb-12 text-center pt-8">
        <h1 className="text-4xl font-black italic text-red-600 uppercase tracking-tighter">
          Growth & Support
        </h1>
        <p className="text-[10px] text-zinc-500 tracking-[0.25em] mt-1 font-bold">
          MONETIZATION & EXPANSION
        </p>
      </header>

      <div className="flex flex-wrap gap-2 justify-center mb-10">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-full text-[10px] font-black uppercase border transition-all ${
              activeTab === tab.id
                ? "bg-red-600 border-red-600 text-white shadow-xl shadow-red-900/20"
                : "bg-black border-zinc-800 text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeTab === "impact" && <MonthlyReportUI />}
        {activeTab === "donations" && (
          <div className="space-y-4">
            <DonationPage />
            <CryptoDonation />
          </div>
        )}
        {activeTab === "rewards" && (
          <div className="space-y-4">
            <PointsUI />
            <BadgesUI />
            <ReferralUI />
          </div>
        )}
        {activeTab === "grants" && <GrantTracker />}
      </div>
    </div>
  );
};

export default MainApp;
