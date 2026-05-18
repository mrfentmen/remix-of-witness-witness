// /transparency — Transparency & compliance pages.
// Uptime status, changelog, GDPR/DMCA forms, security disclosure, bug bounty.
import { createFileRoute } from "@tanstack/react-router";
import { ScreenHeader } from "@/components/witness/screen-header";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeText, sanitizeEmail } from "@/lib/witness-sanitize";
import { toast } from "sonner";
import {
  submitGdprRequest,
  submitDmcaNotice,
  getGovtRequestCount,
  getTransparencyReports,
  type TransparencyReport,
} from "@/lib/transparency.functions";

import type { Json } from "@/integrations/supabase/types";
interface ServiceStatus {
  id: string;
  name: string;
  status: "operational" | "degraded" | "outage";
  uptime_90day: number;
}

interface ChangelogEntry {
  version: string;
  date: string;
  new: string[];
  improvements: string[];
  fixes: string[];
}

const CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.3.0",
    date: "2025-05-19",
    new: ["Donation & transparency pages", "Points & badges system", "Org accounts"],
    improvements: ["Sanitization on all inputs", "Badges on map pins"],
    fixes: ["Auth flow edge cases"],
  },
  {
    version: "1.2.0",
    date: "2025-05-01",
    new: ["Loop recording mode", "Dark mode improvements"],
    improvements: ["Faster thumbnail loading"],
    fixes: ["GPS accuracy on iPhone 15"],
  },
  {
    version: "1.1.0",
    date: "2025-04-01",
    new: ["SOS escalation", "Witness network"],
    improvements: ["Audio enhancement", "Better battery usage"],
    fixes: ["Crash on Android 14"],
  },
  {
    version: "1.0.0",
    date: "2025-03-01",
    new: ["Initial release", "Camera, vault, SOS"],
    improvements: [],
    fixes: [],
  },
];
const CURRENT_VERSION = "1.3.0";

// ── Route ──
export const Route = createFileRoute("/transparency")({
  head: () => ({
    meta: [
      { title: "Transparency — Witness R.E.P" },
      {
        name: "description",
        content:
          "Service uptime, changelog, security disclosure, GDPR, and compliance information.",
      },
    ],
  }),
  component: TransparencyScreen,
});

function TransparencyScreen() {
  const [tab, setTab] = useState<"uptime" | "changelog" | "reports" | "security" | "gdpr" | "dmca">(
    "uptime",
  );

  return (
    <main className="min-h-dvh">
      <ScreenHeader title="Transparency" />
      <div className="mx-auto max-w-md px-4 py-4">
        <div className="flex gap-1 p-1 bg-zinc-950 border border-zinc-900 rounded-2xl mb-6 overflow-x-auto">
          {(["uptime", "changelog", "reports", "security", "gdpr", "dmca"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all ${
                tab === t
                  ? "bg-primary text-primary-foreground"
                  : "text-zinc-600 hover:text-zinc-400"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        {tab === "uptime" && <UptimeSection />}
        {tab === "changelog" && <ChangelogSection />}
        {tab === "reports" && <TransparencyReportsSection />}
        {tab === "security" && <SecuritySection />}
        {tab === "gdpr" && <GDPRSection />}
        {tab === "dmca" && <DMCASection />}
        {/* Government request counter — always visible at bottom */}
        <GovtRequestCounter />
      </div>
    </main>
  );
}

// ── Uptime Status ──
function UptimeSection() {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("service_status")
        .select("id, name, status, uptime_90day");
      if (!error && data) setServices(data as ServiceStatus[]);
      setLoading(false);
    })();
  }, []);

  const color = (s: string) =>
    s === "operational" ? "#22c55e" : s === "degraded" ? "#eab308" : "#E8001C";

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-primary font-black uppercase tracking-widest text-sm mb-4">
        System Status
      </h2>
      {loading ? (
        <p className="text-xs text-zinc-500 animate-pulse">Loading status…</p>
      ) : (
        <div className="space-y-2">
          {services.map((s) => (
            <div
              key={s.id}
              className="flex justify-between items-center bg-zinc-950 border border-zinc-900 rounded-xl p-3"
            >
              <span className="text-xs font-bold">{s.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-zinc-500 font-mono">{s.uptime_90day}%</span>
                <span
                  className="text-[10px] font-black uppercase"
                  style={{ color: color(s.status) }}
                >
                  ● {s.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Changelog ──
function ChangelogSection() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-primary font-black uppercase tracking-widest text-sm mb-2">Changelog</h2>
      <p className="text-xs text-muted-foreground mb-4">
        Current version: <span className="text-primary font-bold">{CURRENT_VERSION}</span>
      </p>
      <div className="space-y-3">
        {CHANGELOG.map((e) => (
          <div key={e.version} className="bg-zinc-950 border border-zinc-900 rounded-xl p-3">
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-sm">v{e.version}</span>
              <span className="text-[10px] text-zinc-500">{e.date}</span>
            </div>
            {e.new.length > 0 && (
              <div className="text-[10px] mb-1">
                <span className="text-green-500 font-bold">✦ NEW</span> {e.new.join(", ")}
              </div>
            )}
            {e.improvements.length > 0 && (
              <div className="text-[10px] mb-1">
                <span className="text-blue-500 font-bold">▲ IMPROVED</span>{" "}
                {e.improvements.join(", ")}
              </div>
            )}
            {e.fixes.length > 0 && (
              <div className="text-[10px]">
                <span className="text-yellow-500 font-bold">◆ FIXED</span> {e.fixes.join(", ")}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Security Disclosure ──
function SecuritySection() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-primary font-black uppercase tracking-widest text-sm mb-3">
        Security Disclosure
      </h2>
      <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
        <p>
          <strong className="text-foreground">AES‑256‑GCM:</strong> Military‑grade encryption — your
          recordings are scrambled with a key derived from your PIN. Even if servers are
          compromised, the data is useless without your PIN.
        </p>
        <p>
          <strong className="text-foreground">SHA‑256:</strong> Creates a unique digital fingerprint
          of every recording. Any alteration, even a single pixel, changes the fingerprint.
        </p>
        <p>
          <strong className="text-foreground">PBKDF2:</strong> Turns your PIN into an unguessable
          encryption key with 600,000 iterations, protecting against brute‑force attacks.
        </p>
        <p>
          <strong className="text-foreground">Decoy PIN:</strong> Entering a different passcode
          shows a fake vault, protecting your real recordings under duress.
        </p>
        <p>
          <strong className="text-foreground">Zero-Knowledge:</strong> Recordings are encrypted
          client‑side; we never have the keys.
        </p>
      </div>
      <div className="mt-4 bg-zinc-950 border border-zinc-900 rounded-xl p-3">
        <p className="text-[10px] text-zinc-500 uppercase font-bold">
          Report vulnerabilities:{" "}
          <a href="mailto:contactae2000@gmail.com" className="text-primary underline">
            contactae2000@gmail.com
          </a>
        </p>
      </div>
    </div>
  );
}

// ── GDPR Request Form ──
function GDPRSection() {
  const [right, setRight] = useState("");
  const [email, setEmail] = useState("");
  const [desc, setDesc] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!right || !email) return;
    const cleanEmail = sanitizeEmail(email);
    const cleanDesc = sanitizeText(desc, 500);
    setBusy(true);
    try {
      const result = await submitGdprRequest({
        data: {
          right: right as "access" | "erasure" | "portability" | "objection",
          email: cleanEmail,
          description: cleanDesc,
        },
      });
      if (result.ok) {
        toast.success(`Request submitted. Ref: ${result.ref}`);
        setSent(true);
        setRight("");
        setEmail("");
        setDesc("");
        setTimeout(() => setSent(false), 4000);
      } else {
        toast.error("Couldn't submit request. Try again or email us.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-primary font-black uppercase tracking-widest text-sm mb-3">
        GDPR Data Request
      </h2>
      <p className="text-xs text-muted-foreground mb-4">
        Exercise your rights under GDPR. We process requests within 30 days.
      </p>
      <div className="space-y-3">
        <select
          value={right}
          onChange={(e) => setRight(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-xl text-xs text-white outline-none focus:border-primary"
        >
          <option value="">Select right…</option>
          <option value="access">Right to Access</option>
          <option value="erasure">Right to Erasure (Forget Me)</option>
          <option value="portability">Right to Data Portability</option>
          <option value="objection">Right to Objection</option>
        </select>
        <input
          type="email"
          placeholder="Your account email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-xl text-xs text-white outline-none focus:border-primary"
        />
        <textarea
          placeholder="Additional details (optional)"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          rows={2}
          className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-xl text-xs text-white outline-none focus:border-primary resize-none"
        />
        <button
          onClick={submit}
          disabled={!right || !email || busy}
          className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-black uppercase tracking-widest text-xs active:scale-95 disabled:opacity-50"
        >
          {busy ? "Submitting…" : "Submit Request"}
        </button>
        {sent && (
          <p className="text-green-500 text-xs font-bold text-center">✓ Request submitted.</p>
        )}
      </div>
    </div>
  );
}

// ── Quarterly Transparency Reports ──

function TransparencyReportsSection() {
  const [reports, setReports] = useState<TransparencyReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await getTransparencyReports();
        setReports(data);
      } catch {
        setReports([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-primary font-black uppercase tracking-widest text-sm mb-4">
        Quarterly Transparency Reports
      </h2>
      {loading ? (
        <p className="text-xs text-zinc-500 animate-pulse">Loading reports…</p>
      ) : reports.length === 0 ? (
        <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 text-center">
          <p className="text-xs text-muted-foreground mb-2">
            No transparency reports published yet.
          </p>
          <p className="text-[10px] text-zinc-600 uppercase font-bold">
            Reports are published quarterly by Witness R.E.P administrators.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <div key={r.id} className="bg-zinc-950 border border-zinc-900 rounded-xl p-4">
              <div className="flex justify-between items-center mb-3">
                <span className="font-black text-sm text-primary">{r.quarter}</span>
                <span className="text-[10px] text-zinc-500">
                  {new Date(r.published_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
              <div className="space-y-2 text-xs text-muted-foreground">
                {Object.entries(r.report_data as Record<string, Json>).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex justify-between items-center py-1 border-b border-zinc-900 last:border-0"
                  >
                    <span className="font-bold uppercase text-zinc-400">
                      {key.replace(/_/g, " ")}
                    </span>
                    <span className="text-white tabular-nums">
                      {typeof value === "number" ? value.toLocaleString() : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Government Request Counter ──
function GovtRequestCounter() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const result = await getGovtRequestCount();
        if (result) setCount(result.count);
      } catch {
        setCount(0);
      }
    })();
  }, []);

  return (
    <div className="mt-4 rounded-2xl border border-border bg-card p-5">
      <h2 className="text-primary font-black uppercase tracking-widest text-sm mb-3">
        Government Requests
      </h2>
      <div className="flex items-center justify-between bg-zinc-950 border border-zinc-900 rounded-xl p-4">
        <p className="text-xs text-muted-foreground">
          Number of government requests for user data received since launch. Updated by
          administrators.
        </p>
        <span className="text-3xl font-black text-primary tabular-nums">
          {count !== null ? count : "—"}
        </span>
      </div>
      <p className="mt-3 text-[10px] text-zinc-600 uppercase font-bold">
        Witness R.E.P has never provided user data in response to a government request. All
        recordings are zero-knowledge encrypted.
      </p>
    </div>
  );
}

// ── DMCA Takedown ──
function DMCASection() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [work, setWork] = useState("");
  const [url, setUrl] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name || !email || !work || !url) return;
    setBusy(true);
    try {
      const result = await submitDmcaNotice({
        data: {
          name: sanitizeText(name, 120),
          email: sanitizeEmail(email),
          work: sanitizeText(work, 2000),
          url: sanitizeText(url, 2000),
        },
      });
      if (result.ok) {
        toast.success(`DMCA notice filed. Ref: ${result.ref}`);
        setSent(true);
        setName("");
        setEmail("");
        setWork("");
        setUrl("");
        setTimeout(() => setSent(false), 4000);
      } else {
        toast.error("Couldn't file notice. Try again or email us.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Filing failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-primary font-black uppercase tracking-widest text-sm mb-3">
        DMCA Takedown Notice
      </h2>
      <p className="text-xs text-muted-foreground mb-4">
        Recordings of police performing duties are generally protected public interest. DMCA claims
        without legitimate copyright basis will be challenged.
      </p>
      <div className="space-y-3">
        <input
          placeholder="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-xl text-xs text-white outline-none focus:border-primary"
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-xl text-xs text-white outline-none focus:border-primary"
        />
        <input
          placeholder="Description of copyrighted work"
          value={work}
          onChange={(e) => setWork(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-xl text-xs text-white outline-none focus:border-primary"
        />
        <input
          placeholder="Infringing URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-xl text-xs text-white outline-none focus:border-primary"
        />
        <button
          onClick={submit}
          disabled={!name || !email || !work || !url || busy}
          className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-black uppercase tracking-widest text-xs active:scale-95 disabled:opacity-50"
        >
          {busy ? "Submitting…" : "Submit Notice"}
        </button>
        {sent && (
          <p className="text-green-500 text-xs font-bold text-center">✓ DMCA notice filed.</p>
        )}
      </div>
    </div>
  );
}
