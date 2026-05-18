// WitnessAppStoreAssets.tsx
// Self-contained TypeScript React shell for App Store and Play Store launch assets.
// Implements: store metadata dashboard (descriptions, keywords), privacy rating walkthrough,
// release assets (release notes, press kit, screenshot checklist). Exports all components/hooks.
// Uses Tailwind CSS. MainApp with tabs: App Store, Play Store, Press Kit.

import React, { useState, useCallback } from "react";

// ------------------------------
// SECTION: Types & Interfaces
// ------------------------------
export interface StoreDescription {
  short: string;
  long: string;
  keywords: string[];
}

export interface ScreenshotItem {
  id: string;
  title: string;
  captured: boolean;
}

// Apple App Store description (short only)
const appleShort =
  "Record. Encrypt. Prove. Instant video recording with SHA-256 verification and encrypted vault.";

// Google Play Store descriptions
const googleShort =
  "Record police encounters with cryptographic proof. Encrypted vault, SOS alerts, and legal tools.";
const googleLong = `Witness R.E.P. is a civil rights documentation tool that puts cryptographic verification in your pocket.
- One‑tap recording starts instantly
- SHA-256 hash ensures video authenticity
- Encrypted vault keeps your evidence secure
- SOS alerts with location sharing
- Export certificates for court
- No ads, no paywalls, no data selling
Your recordings belong to you. Period.`;

const appleKeywords = [
  "police",
  "evidence",
  "recording",
  "civil rights",
  "bodycam",
  "encryption",
  "safety",
  "witness",
];
const googleKeywords = [
  "police",
  "evidence",
  "bodycam",
  "civil rights",
  "encryption",
  "safety",
  "witness",
  "record",
  "SOS",
];

// Screenshot checklist
const screenshots: ScreenshotItem[] = [
  { id: "s1", title: "Camera screen (holding record)", captured: false },
  { id: "s2", title: "Vault list with recordings", captured: false },
  { id: "s3", title: "Map with incident pins", captured: false },
  { id: "s4", title: "SOS contacts screen", captured: false },
  { id: "s5", title: "Witness Certificate PDF preview", captured: false },
  { id: "s6", title: "Settings / Privacy controls", captured: false },
];

// ------------------------------
// SECTION: Vanilla SVG Icons
// ------------------------------
const AppleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.073 21.318c-.917.51-2.004.81-3.14.81-2.316 0-3.567-1.464-5.696-1.464-2.115 0-3.51 1.464-5.658 1.464-1.127 0-2.226-.3-3.15-.81l.013-.024c.483-.243 3.197-1.688 3.197-5.112 0-2.85-2.261-4.24-3.167-4.783l.024-.047c.806-.403 2.148-.737 3.52-.737 2.05 0 3.326 1.343 5.4 1.343 2.062 0 3.238-1.343 5.373-1.343.834 0 1.63.13 2.336.37l.035.064c-.754.542-3.197 2.315-3.197 5.513 0 3.864 2.633 5.414 3.21 5.753l.01.02zm-3.21-16.892c0-2.29-1.85-4.14-4.14-4.14-.04 0-.08 0-.12.003.11-2.25 1.98-4.04 4.26-4.04 2.29 0 4.14 1.85 4.14 4.14 0 2.29-1.85 4.14-4.14 4.14z" />
  </svg>
);

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3.609 1.814L13.792 12 3.609 22.186c-.18.18-.328.09-.328-.164V1.978c0-.254.148-.344.328-.164zm10.89 10.89l3.115 3.115-13.435 7.677 10.32-10.792zm.703-.704l1.914-2 3.428 1.96c.656.374.656.986 0 1.36l-3.428 1.96-1.914-2.32zm-.703-.704l-10.32-10.792 13.435 7.677-3.115 3.115z" />
  </svg>
);

// ------------------------------
// SECTION: Store Metadata (MetadataDashboard)
// ------------------------------
export function MetadataDashboard({ platform }: { platform: "apple" | "google" }) {
  const [appleText, setAppleText] = useState(appleShort);
  const [googleShortText, setGoogleShortText] = useState(googleShort);
  const [googleLongText, setGoogleLongText] = useState(googleLong);
  const [keywords, setKeywords] = useState(platform === "apple" ? appleKeywords : googleKeywords);
  const [newKeyword, setNewKeyword] = useState("");

  const addKeyword = () => {
    if (newKeyword && !keywords.includes(newKeyword) && keywords.length < 10) {
      setKeywords([...keywords, newKeyword]);
      setNewKeyword("");
    }
  };

  const removeKeyword = (kw: string) => setKeywords(keywords.filter((k) => k !== kw));

  const charCount = platform === "apple" ? appleText.length : googleShortText.length;
  const maxShort = platform === "apple" ? 30 : 80;
  const isOverLimit = charCount > maxShort;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 border-l-4 border-l-red-600 shadow-2xl">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="font-black text-red-600 uppercase italic tracking-tighter">
            Store Descriptions
          </h3>
          <span className="ml-auto opacity-50">
            {platform === "apple" ? <AppleIcon /> : <GoogleIcon />}
          </span>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">
              Short Description (Target: {maxShort} chars)
            </label>
            <textarea
              rows={2}
              value={platform === "apple" ? appleText : googleShortText}
              onChange={(e) =>
                platform === "apple"
                  ? setAppleText(e.target.value)
                  : setGoogleShortText(e.target.value)
              }
              className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white text-sm focus:border-red-600 outline-none transition-colors"
              placeholder="Enter tag-line..."
            />
            <div
              className={`text-[10px] font-mono mt-1 text-right ${isOverLimit ? "text-red-600 font-bold" : "text-zinc-600"}`}
            >
              {charCount} / {maxShort}
            </div>
          </div>

          {platform === "google" && (
            <div>
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">
                Full Description (Store Listing)
              </label>
              <textarea
                rows={6}
                value={googleLongText}
                onChange={(e) => setGoogleLongText(e.target.value)}
                className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white text-sm focus:border-red-600 outline-none transition-colors"
                placeholder="Enter detailed description..."
              />
            </div>
          )}
        </div>
      </div>

      <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 border-l-4 border-l-red-600 shadow-2xl">
        <h3 className="font-black text-red-600 uppercase italic tracking-tighter mb-4">
          ASO Keywords
        </h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {keywords.map((kw) => (
            <span
              key={kw}
              className="bg-red-600/10 border border-red-600/30 text-red-500 text-[10px] font-black uppercase px-3 py-1 rounded-full flex items-center gap-2"
            >
              {kw}
              <button
                onClick={() => removeKeyword(kw)}
                className="hover:text-white transition-colors"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && addKeyword()}
            placeholder="Add indexing term..."
            className="flex-1 bg-black border border-zinc-800 rounded-full px-4 py-2 text-xs text-white focus:border-red-600 outline-none"
          />
          <button
            onClick={addKeyword}
            className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all"
          >
            Add
          </button>
        </div>
        <div className="text-[9px] text-zinc-600 font-bold uppercase mt-3 tracking-widest">
          {keywords.length} / 10 index tokens utilized
        </div>
      </div>
    </div>
  );
}

// ------------------------------
// SECTION: Privacy & Rating (ComplianceWalkthrough)
// ------------------------------
export function ComplianceWalkthrough() {
  const [privacyUrl, setPrivacyUrl] = useState("https://witness.rep/privacy");
  const [ratingAnswers, setRatingAnswers] = useState({
    violence: "none",
    sexual: "none",
    drugs: "none",
    profanity: "occasional",
  });

  const updateRating = (field: keyof typeof ratingAnswers, value: string) => {
    setRatingAnswers((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6 mt-6 animate-in fade-in duration-500">
      <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 border-l-4 border-l-red-600 shadow-2xl">
        <h3 className="font-black text-red-600 uppercase italic tracking-tighter mb-4 text-lg">
          Classification Audit
        </h3>
        <div className="space-y-4 text-xs font-bold uppercase tracking-tighter">
          {[
            {
              id: "violence",
              label: "Violence / Graphic Content",
              options: ["none", "occasional", "frequent"],
            },
            { id: "sexual", label: "Sexual Content", options: ["none", "mild"] },
            { id: "drugs", label: "Drugs / Alcohol", options: ["none", "occasional"] },
            { id: "profanity", label: "Profanity", options: ["none", "occasional", "frequent"] },
          ].map((item) => (
            <div
              key={item.id}
              className="flex justify-between items-center bg-black/40 p-3 rounded-xl border border-zinc-800"
            >
              <span className="text-zinc-300">{item.label}</span>
              <select
                value={ratingAnswers[item.id as keyof typeof ratingAnswers]}
                onChange={(e) =>
                  updateRating(item.id as keyof typeof ratingAnswers, e.target.value)
                }
                className="bg-zinc-900 text-red-500 border border-zinc-700 rounded px-2 py-1 outline-none"
              >
                {item.options.map((opt) => (
                  <option key={item.id + opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <div className="mt-6 p-3 bg-red-950/20 border border-red-900/50 rounded-lg text-center">
          <p className="text-[10px] text-red-400 font-black uppercase tracking-widest">
            Recommended Rating: Mature 17+
          </p>
        </div>
      </div>

      <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 border-l-4 border-l-red-600 shadow-2xl">
        <h3 className="font-black text-red-600 uppercase italic tracking-tighter mb-2">
          Legal Endpoints
        </h3>
        <p className="text-[10px] text-zinc-500 font-bold uppercase mb-4 tracking-widest">
          Privacy Policy Manifest
        </p>
        <input
          type="url"
          value={privacyUrl}
          onChange={(e) => setPrivacyUrl(e.target.value)}
          className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white text-xs font-mono focus:border-red-600 outline-none"
        />
        <p className="text-[9px] text-zinc-600 mt-2 italic">
          Provide this URL during the compliance phase of submission.
        </p>
      </div>
    </div>
  );
}

// ------------------------------
// SECTION: Release Assets (ReleaseKit)
// ------------------------------
export function ReleaseKit() {
  const [screenshotList, setScreenshotList] = useState(screenshots);
  const [notesVariant, setNotesVariant] = useState<"short" | "standard" | "detailed">("standard");

  const toggleScreenshot = (id: string) => {
    setScreenshotList((prev) =>
      prev.map((s) => (s.id === id ? { ...s, captured: !s.captured } : s)),
    );
  };

  const releaseNotes = {
    short: "Witness R.E.P. v1.0. Record. Encrypt. Prove.",
    standard:
      "Initial launch of Witness R.E.P. Record encounters with one tap, secure evidence in an encrypted vault, and generate court-ready certificates.",
    detailed: `WITNESS R.E.P. v1.0.0 DEPLOYMENT
- ZERO-LATENCY SENSOR CAPTURE
- SHA-256 BINARY HASH INTEGRITY
- AES-256-GCM LOCAL ENCRYPTION
- SOS DISTRIBUTED ALERTS
- GPS TEMPORAL STAMPING
- NATIVE PDF CERTIFICATE GENERATION
- NO AD-TRACKING / NO DATA HARVESTING`,
  };

  const copyNotes = () => {
    navigator.clipboard.writeText(releaseNotes[notesVariant]);
    alert("Metadata copied to clipboard.");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 border-l-4 border-l-red-600 shadow-2xl">
        <h3 className="font-black text-red-600 uppercase italic tracking-tighter mb-4 text-lg">
          Visual Evidence Checklist
        </h3>
        <div className="space-y-2">
          {screenshotList.map((s) => (
            <label
              key={s.id}
              className="flex items-center gap-3 p-3 bg-black/40 rounded-xl border border-zinc-800 cursor-pointer group"
            >
              <input
                type="checkbox"
                checked={s.captured}
                onChange={() => toggleScreenshot(s.id)}
                className="w-4 h-4 accent-red-600 rounded bg-zinc-900 border-zinc-700"
              />
              <span
                className={`text-xs font-bold uppercase transition-colors ${s.captured ? "text-zinc-500 line-through" : "text-zinc-100 group-hover:text-red-500"}`}
              >
                {s.title}
              </span>
            </label>
          ))}
        </div>
        <div className="mt-4 text-[10px] font-black uppercase text-zinc-600 tracking-[0.2em] text-center">
          {screenshotList.filter((s) => s.captured).length} / {screenshotList.length} Assets
          Validated
        </div>
      </div>

      <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 border-l-4 border-l-red-600 shadow-2xl">
        <h3 className="font-black text-red-600 uppercase italic tracking-tighter mb-4">
          Changelog / Release Notes
        </h3>
        <div className="flex gap-2 mb-4 bg-black p-1 rounded-full border border-zinc-800">
          {(["short", "standard", "detailed"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setNotesVariant(v)}
              className={`flex-1 py-1.5 rounded-full text-[10px] font-black uppercase transition-all ${notesVariant === v ? "bg-red-600 text-white" : "text-zinc-500 hover:text-white"}`}
            >
              {v}
            </button>
          ))}
        </div>
        <div className="bg-black border border-zinc-800 p-4 rounded-xl mb-4 min-h-[100px]">
          <pre className="text-[11px] text-zinc-300 whitespace-pre-wrap font-mono leading-relaxed">
            {releaseNotes[notesVariant]}
          </pre>
        </div>
        <button
          onClick={copyNotes}
          className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
        >
          Copy Metadata
        </button>
      </div>

      <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-900 shadow-xl border-l-4 border-l-red-900">
        <h3 className="font-black text-red-600 uppercase italic tracking-widest mb-4 text-sm">
          Media Advocacy Guide
        </h3>
        <ul className="space-y-3 text-[11px] font-bold text-zinc-400 uppercase tracking-tighter">
          <li className="flex gap-3">
            <span className="text-red-500">▶</span> Open-source encryption protocol for full
            transparency.
          </li>
          <li className="flex gap-3">
            <span className="text-red-500">▶</span> Direct accountability mechanism for public
            officials.
          </li>
          <li className="flex gap-3">
            <span className="text-red-500">▶</span> Zero-knowledge architecture ensures total user
            privacy.
          </li>
          <li className="flex gap-3">
            <span className="text-red-500">▶</span> Cryptographic timestamps verified by network
            nodes.
          </li>
        </ul>
      </div>
    </div>
  );
}

// ------------------------------
// SECTION: MainApp Demo
// ------------------------------
export function MainApp() {
  const [activeTab, setActiveTab] = useState<"apple" | "google" | "press">("apple");

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-red-600/30">
      <div className="max-w-4xl mx-auto px-6 py-10 pb-32">
        <header className="mb-12 text-center">
          <h1 className="text-5xl font-black italic tracking-tighter text-red-600 uppercase mb-2">
            Launch Terminal
          </h1>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.5em]">
            Witness R.E.P. Deployment Assets
          </p>
        </header>

        <nav className="flex gap-2 p-1 bg-zinc-950 border border-zinc-900 rounded-2xl mb-10 shadow-2xl">
          {(["apple", "google", "press"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase transition-all tracking-widest ${
                activeTab === tab
                  ? "bg-red-600 text-white shadow-lg"
                  : "text-zinc-600 hover:text-zinc-300"
              }`}
            >
              {tab === "apple" && <AppleIcon />}
              {tab === "google" && <GoogleIcon />}
              {tab === "press" && "Press Kit"}
              <span className="hidden sm:inline">
                {tab === "apple" ? "App Store" : tab === "google" ? "Play Store" : ""}
              </span>
            </button>
          ))}
        </nav>

        <main>
          {activeTab === "apple" && <MetadataDashboard platform="apple" />}
          {activeTab === "google" && <MetadataDashboard platform="google" />}
          {activeTab === "press" && <ReleaseKit />}
          {activeTab !== "press" && <ComplianceWalkthrough />}
        </main>
      </div>

      <footer className="fixed bottom-0 left-0 right-0 p-4 bg-black/80 backdrop-blur-md border-t border-zinc-900 text-center pointer-events-none z-40">
        <p className="text-[8px] font-black text-zinc-700 uppercase tracking-[0.6em]">
          Protocol Deployment v1.0 • Ready for Transmission
        </p>
      </footer>
    </div>
  );
}

export default MainApp;
