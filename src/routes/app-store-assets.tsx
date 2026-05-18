// /app-store-assets — Internal admin screen for App Store & Play Store launch assets.
// Accessible only by tapping the version number 5 times in Settings.
// All copy buttons use the native clipboard API.
import { createFileRoute } from "@tanstack/react-router";
import { ScreenHeader } from "@/components/witness/screen-header";
import { useState } from "react";

// ── Store Descriptions ──
const APPLE_SHORT =
  "Record. Encrypt. Prove. Instant video recording with SHA-256 verification and encrypted vault.";
const GOOGLE_SHORT =
  "Record police encounters with cryptographic proof. Encrypted vault, SOS alerts, and legal tools.";
const GOOGLE_LONG = `Witness R.E.P. is a civil rights documentation tool that puts cryptographic verification in your pocket.
- One‑tap recording starts instantly
- SHA-256 hash ensures video authenticity
- Encrypted vault keeps your evidence secure
- SOS alerts with location sharing
- Export certificates for court
- No ads, no paywalls, no data selling
Your recordings belong to you. Period.`;

const APPLE_KEYWORDS = [
  "police",
  "evidence",
  "recording",
  "civil rights",
  "bodycam",
  "encryption",
  "safety",
  "witness",
];
const GOOGLE_KEYWORDS = [
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

interface ScreenshotItem {
  id: string;
  title: string;
  captured: boolean;
}
const SCREENSHOTS: ScreenshotItem[] = [
  { id: "s1", title: "Camera screen (holding record)", captured: false },
  { id: "s2", title: "Vault list with recordings", captured: false },
  { id: "s3", title: "Map with incident pins", captured: false },
  { id: "s4", title: "SOS contacts screen", captured: false },
  { id: "s5", title: "Witness Certificate PDF preview", captured: false },
  { id: "s6", title: "Settings / Privacy controls", captured: false },
];

const RELEASE_NOTES = {
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

// ── Route ──
export const Route = createFileRoute("/app-store-assets")({
  head: () => ({
    meta: [
      { title: "App Store Assets — Witness R.E.P" },
      { name: "description", content: "App Store and Play Store launch assets for Witness R.E.P." },
    ],
  }),
  component: AppStoreAssetsScreen,
});

function AppStoreAssetsScreen() {
  const [tab, setTab] = useState<"apple" | "google" | "press">("apple");

  return (
    <main className="min-h-dvh">
      <ScreenHeader title="Launch Terminal" />
      <div className="mx-auto max-w-md px-4 py-4">
        <div className="flex gap-1 p-1 bg-zinc-950 border border-zinc-900 rounded-2xl mb-6">
          {(["apple", "google", "press"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                tab === t
                  ? "bg-primary text-primary-foreground"
                  : "text-zinc-600 hover:text-zinc-400"
              }`}
            >
              {t === "apple" ? "App Store" : t === "google" ? "Play Store" : "Press Kit"}
            </button>
          ))}
        </div>
        {tab === "apple" && <StoreMetadata platform="apple" />}
        {tab === "google" && <StoreMetadata platform="google" />}
        {tab === "press" && <PressKit />}
      </div>
    </main>
  );
}

// ── Store Metadata ──
function StoreMetadata({ platform }: { platform: "apple" | "google" }) {
  const [shortText, setShortText] = useState(platform === "apple" ? APPLE_SHORT : GOOGLE_SHORT);
  const [longText, setLongText] = useState(GOOGLE_LONG);
  const [keywords, setKeywords] = useState(platform === "apple" ? APPLE_KEYWORDS : GOOGLE_KEYWORDS);
  const [newKw, setNewKw] = useState("");
  const [copied, setCopied] = useState("");

  const maxShort = platform === "apple" ? 30 : 80;
  const isOver = shortText.length > maxShort;

  const addKw = () => {
    if (newKw && !keywords.includes(newKw) && keywords.length < 10) {
      setKeywords([...keywords, newKw]);
      setNewKw("");
    }
  };

  const copy = (label: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(""), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Short Description */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-primary font-black uppercase tracking-widest text-sm mb-3">
          Short Description
        </h2>
        <textarea
          rows={2}
          value={shortText}
          onChange={(e) => setShortText(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-white focus:border-primary outline-none resize-none"
        />
        <div
          className={`text-[10px] font-mono text-right mt-1 ${isOver ? "text-primary font-bold" : "text-zinc-600"}`}
        >
          {shortText.length} / {maxShort}
        </div>
        <button
          onClick={() => copy("short", shortText)}
          className="w-full mt-2 bg-zinc-800 hover:bg-zinc-700 py-2 rounded-xl text-[10px] font-black uppercase"
        >
          {copied === "short" ? "✓ Copied" : "Copy Short Description"}
        </button>
      </div>

      {/* Long Description (Google only) */}
      {platform === "google" && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-primary font-black uppercase tracking-widest text-sm mb-3">
            Full Description
          </h2>
          <textarea
            rows={6}
            value={longText}
            onChange={(e) => setLongText(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-white focus:border-primary outline-none resize-none"
          />
          <button
            onClick={() => copy("long", longText)}
            className="w-full mt-2 bg-zinc-800 hover:bg-zinc-700 py-2 rounded-xl text-[10px] font-black uppercase"
          >
            {copied === "long" ? "✓ Copied" : "Copy Full Description"}
          </button>
        </div>
      )}

      {/* Keywords */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-primary font-black uppercase tracking-widest text-sm mb-3">
          ASO Keywords
        </h2>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {keywords.map((kw) => (
            <span
              key={kw}
              className="bg-primary/10 border border-primary/30 text-primary text-[10px] font-black uppercase px-2 py-1 rounded-full flex items-center gap-1"
            >
              {kw}
              <button
                onClick={() => setKeywords(keywords.filter((k) => k !== kw))}
                className="hover:text-white"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={newKw}
            onChange={(e) => setNewKw(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addKw()}
            placeholder="Add keyword…"
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-full px-3 py-1.5 text-xs text-white outline-none focus:border-primary"
          />
          <button
            onClick={addKw}
            className="bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-[10px] font-black uppercase"
          >
            Add
          </button>
        </div>
        <div className="text-[9px] text-zinc-600 font-bold uppercase mt-2">
          {keywords.length} / 10 used
        </div>
        <button
          onClick={() => copy("keywords", keywords.join(", "))}
          className="w-full mt-2 bg-zinc-800 hover:bg-zinc-700 py-2 rounded-xl text-[10px] font-black uppercase"
        >
          {copied === "keywords" ? "✓ Copied" : "Copy Keywords"}
        </button>
      </div>
    </div>
  );
}

// ── Press Kit / Release Assets ──
function PressKit() {
  const [screenshots, setScreenshots] = useState(SCREENSHOTS);
  const [notesVariant, setNotesVariant] = useState<"short" | "standard" | "detailed">("standard");
  const [copied, setCopied] = useState("");

  const toggle = (id: string) => {
    setScreenshots((prev) => prev.map((s) => (s.id === id ? { ...s, captured: !s.captured } : s)));
  };

  const copy = () => {
    navigator.clipboard.writeText(RELEASE_NOTES[notesVariant]);
    setCopied("notes");
    setTimeout(() => setCopied(""), 2000);
  };

  const done = screenshots.filter((s) => s.captured).length;

  return (
    <div className="space-y-4">
      {/* Screenshot Checklist */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-primary font-black uppercase tracking-widest text-sm mb-3">
          Screenshot Checklist
        </h2>
        {screenshots.map((s) => (
          <label
            key={s.id}
            className="flex items-center gap-3 p-2.5 bg-zinc-950 border border-zinc-900 rounded-xl mb-2 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={s.captured}
              onChange={() => toggle(s.id)}
              className="accent-primary"
            />
            <span
              className={`text-xs font-bold uppercase ${s.captured ? "text-zinc-500 line-through" : "text-zinc-100"}`}
            >
              {s.title}
            </span>
          </label>
        ))}
        <div className="text-[10px] font-black uppercase text-zinc-600 text-center mt-2">
          {done} / {screenshots.length} Validated
        </div>
      </div>

      {/* Release Notes */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-primary font-black uppercase tracking-widest text-sm mb-3">
          Release Notes
        </h2>
        <div className="flex gap-1 bg-zinc-950 border border-zinc-900 rounded-full p-1 mb-3">
          {(["short", "standard", "detailed"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setNotesVariant(v)}
              className={`flex-1 py-1.5 rounded-full text-[10px] font-black uppercase transition ${
                notesVariant === v
                  ? "bg-primary text-primary-foreground"
                  : "text-zinc-500 hover:text-white"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
        <pre className="bg-zinc-950 border border-zinc-900 p-3 rounded-xl text-[10px] text-zinc-300 whitespace-pre-wrap font-mono leading-relaxed min-h-[80px]">
          {RELEASE_NOTES[notesVariant]}
        </pre>
        <button
          onClick={copy}
          className="w-full mt-2 bg-zinc-800 hover:bg-zinc-700 py-2 rounded-xl text-[10px] font-black uppercase"
        >
          {copied === "notes" ? "✓ Copied" : "Copy Release Notes"}
        </button>
      </div>

      {/* Press Talking Points */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-primary font-black uppercase tracking-widest text-sm mb-3">
          Media Talking Points
        </h2>
        <ul className="space-y-2 text-[10px] font-bold text-zinc-400 uppercase">
          <li className="flex gap-2">
            <span className="text-primary">▶</span> Open-source encryption for transparency.
          </li>
          <li className="flex gap-2">
            <span className="text-primary">▶</span> Direct accountability for public officials.
          </li>
          <li className="flex gap-2">
            <span className="text-primary">▶</span> Zero-knowledge architecture — user privacy.
          </li>
          <li className="flex gap-2">
            <span className="text-primary">▶</span> Cryptographic timestamps verified on chain.
          </li>
        </ul>
      </div>
    </div>
  );
}
