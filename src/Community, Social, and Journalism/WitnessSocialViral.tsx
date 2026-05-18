// WitnessSocialViral.tsx
import React, { useState, useEffect } from "react";

// ------------------------------
// SECTION: Types & Interfaces
// ------------------------------
export interface Recording {
  id: string;
  title: string;
  hash: string;
  timestamp: number;
  views: number;
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastRecordingDate: string; // YYYY-MM-DD
}

// ------------------------------
// SECTION: Social Proofing (ViralShare)
// ------------------------------
export function ViralShare() {
  const [copied, setCopied] = useState(false);
  const [platform, setPlatform] = useState("Twitter");

  const mockHash = "sha256-7a8b9c0d1e2f3g4h5i6j7k8l9m0n";

  const handleCopy = () => {
    const text = `🚨 VERIFIED EVIDENCE: Traffic Stop\n🔐 Hash: ${mockHash.slice(0, 16)}...\n✅ Verified via WitnessREP\n#WitnessREP #Transparency`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gray-900 p-4 rounded-xl border-l-4 border-red-600 space-y-3 text-white">
      <h3 className="font-bold text-red-500">Verified Sharing</h3>
      <div className="bg-black p-3 rounded-lg border border-gray-800">
        <p className="text-xs text-gray-400 italic mb-2">"Traffic Stop on Broadway..."</p>
        <div className="flex gap-2 mb-3">
          {["Twitter", "Instagram", "TikTok"].map((p) => (
            <button
              key={p}
              onClick={() => setPlatform(p)}
              className={`px-3 py-1 rounded-full text-[10px] font-bold ${platform === p ? "bg-red-600" : "bg-gray-800"}`}
            >
              {p}
            </button>
          ))}
        </div>
        <button
          onClick={handleCopy}
          className="w-full bg-red-600 py-2 rounded-lg text-sm font-bold hover:bg-red-700"
        >
          {copied ? "✅ Copied Caption" : `Share to ${platform}`}
        </button>
      </div>
    </div>
  );
}

// ------------------------------
// SECTION: Engagement (Streaks & Challenges)
// ------------------------------
export function StreaksAndChallenges() {
  const [points, setPoints] = useState(() => Number(localStorage.getItem("witness_points") || 0));
  const [streak, setStreak] = useState<StreakData>(() => {
    const saved = localStorage.getItem("witness_streak");
    return saved
      ? JSON.parse(saved)
      : { currentStreak: 0, longestStreak: 0, lastRecordingDate: "" };
  });

  const recordWitnessEvent = () => {
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    let newStreak = streak.currentStreak;

    if (streak.lastRecordingDate === today) {
      // Already recorded today, just add points
    } else if (streak.lastRecordingDate === yesterday) {
      newStreak += 1;
    } else {
      newStreak = 1;
    }

    const updatedStreak = {
      currentStreak: newStreak,
      longestStreak: Math.max(newStreak, streak.longestStreak),
      lastRecordingDate: today,
    };

    setStreak(updatedStreak);
    setPoints((prev) => prev + 50);
    localStorage.setItem("witness_streak", JSON.stringify(updatedStreak));
    localStorage.setItem("witness_points", (points + 50).toString());
  };

  return (
    <div className="bg-gray-900 p-4 rounded-xl border-l-4 border-red-600 space-y-4 text-white">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-red-500">Witness Rewards</h3>
        <span className="text-yellow-500 font-bold text-sm">{points} PTS</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-black p-3 rounded-lg text-center border border-gray-800">
          <div className="text-2xl">🔥</div>
          <div className="text-lg font-black">{streak.currentStreak}</div>
          <div className="text-[10px] text-gray-500 uppercase">Day Streak</div>
        </div>
        <div className="bg-black p-3 rounded-lg text-center border border-gray-800">
          <div className="text-2xl">🏆</div>
          <div className="text-lg font-black">{streak.longestStreak}</div>
          <div className="text-[10px] text-gray-500 uppercase">Best Streak</div>
        </div>
      </div>

      <button
        onClick={recordWitnessEvent}
        className="w-full bg-gray-800 border border-red-900 py-2 rounded-full text-xs font-bold hover:bg-gray-700"
      >
        Simulate Recording (+50 Pts)
      </button>
    </div>
  );
}

// ------------------------------
// SECTION: Impact Reporting (Visual Stats Card)
// ------------------------------
export function ImpactSummaryUI() {
  const [showCard, setShowCard] = useState(false);

  return (
    <div className="bg-gray-900 p-4 rounded-xl border-l-4 border-red-600 text-white space-y-3">
      <h3 className="font-bold text-red-500">Monthly Impact</h3>
      <p className="text-xs text-gray-400">
        Generate a shareable summary of your contribution to public safety.
      </p>

      {!showCard ? (
        <button
          onClick={() => setShowCard(true)}
          className="w-full bg-red-600 py-2 rounded-lg text-sm font-bold"
        >
          Generate My Stats Card
        </button>
      ) : (
        <div className="bg-white text-black p-4 rounded-lg shadow-2xl relative">
          <div className="text-[10px] font-black text-red-600 mb-2">WITNESS IMPACT REPORT</div>
          <div className="space-y-1">
            <div className="flex justify-between border-b border-gray-200 py-1">
              <span className="text-xs font-bold">Videos Verified</span>
              <span className="text-xs">14</span>
            </div>
            <div className="flex justify-between border-b border-gray-200 py-1">
              <span className="text-xs font-bold">Public Views</span>
              <span className="text-xs">1.2k</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-xs font-bold">Safety Score</span>
              <span className="text-xs text-green-600">98%</span>
            </div>
          </div>
          <button
            onClick={() => setShowCard(false)}
            className="absolute -top-2 -right-2 bg-black text-white rounded-full w-5 h-5 text-[10px]"
          >
            X
          </button>
        </div>
      )}
    </div>
  );
}

// ------------------------------
// SECTION: Web3 (NFT Verification)
// ------------------------------
export function NFTVerification() {
  const [status, setStatus] = useState<"idle" | "minting" | "done">("idle");
  const [txId, setTxId] = useState("");

  const mintNFT = () => {
    setStatus("minting");
    setTimeout(() => {
      const fakeTx =
        "0x" +
        Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
      setTxId(fakeTx);
      setStatus("done");
    }, 2000);
  };

  return (
    <div className="bg-gray-900 p-4 rounded-xl border-l-4 border-red-600 text-white space-y-3">
      <h3 className="font-bold text-red-500">Immutable Ledger</h3>
      <p className="text-[10px] text-gray-400 uppercase tracking-tighter">
        Secure this evidence on the blockchain
      </p>

      {status === "idle" && (
        <button
          onClick={mintNFT}
          className="w-full bg-gray-800 py-2 rounded-lg text-xs font-bold border border-gray-700"
        >
          Mint Verification NFT
        </button>
      )}

      {status === "minting" && (
        <div className="text-center py-2 animate-pulse text-xs text-yellow-500 font-mono">
          Writing to Polygon Network...
        </div>
      )}

      {status === "done" && (
        <div className="bg-black p-2 rounded border border-green-900">
          <div className="text-[9px] text-green-500 font-bold mb-1">RECORD MINTED SUCCESSFULLY</div>
          <div className="text-[8px] font-mono text-gray-500 truncate">{txId}</div>
        </div>
      )}
    </div>
  );
}

// ------------------------------
// SECTION: Main Application
// ------------------------------
export default function MainApp() {
  const [tab, setTab] = useState<"social" | "impact" | "web3">("social");

  return (
    <div className="min-h-screen bg-black text-white p-4 max-w-md mx-auto pb-24 font-sans">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-black italic text-red-600">WITNESS SOCIAL</h1>
        <div className="bg-gray-900 px-3 py-1 rounded-full text-[10px] border border-gray-700">
          LVL 4 AMBASSADOR
        </div>
      </header>

      <div className="space-y-6">
        {tab === "social" && (
          <>
            <StreaksAndChallenges />
            <ViralShare />
          </>
        )}
        {tab === "impact" && <ImpactSummaryUI />}
        {tab === "web3" && <NFTVerification />}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-red-600 flex justify-around py-4">
        <button
          onClick={() => setTab("social")}
          className={
            tab === "social" ? "text-red-500 scale-110 transition-transform" : "text-gray-500"
          }
        >
          📱 Social
        </button>
        <button
          onClick={() => setTab("impact")}
          className={
            tab === "impact" ? "text-red-500 scale-110 transition-transform" : "text-gray-500"
          }
        >
          📊 Impact
        </button>
        <button
          onClick={() => setTab("web3")}
          className={
            tab === "web3" ? "text-red-500 scale-110 transition-transform" : "text-gray-500"
          }
        >
          ⛓️ Web3
        </button>
      </nav>
    </div>
  );
}
