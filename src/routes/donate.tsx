// /donate — Voluntary donation page with crypto QR and grant tracker.
// Wired from settings "Support Witness R.E.P" donate placeholder.
import { createFileRoute } from "@tanstack/react-router";
import { ScreenHeader } from "@/components/witness/screen-header";
import { useState, useEffect, useRef } from "react";
import { useSession } from "@/lib/cloud-auth";
import { sanitizeText } from "@/lib/witness-sanitize";

// ── Constants ──
const BITCOIN_ADDRESS = "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq";
const ETHEREUM_ADDRESS = "0x742d35Cc6634C0532925a3b844Bc9e7595f0b6f0";

// Prepopulated grants per prior research
const DEFAULT_GRANTS: GrantApp[] = [
  {
    id: "g1",
    name: "Tech & Democracy",
    org: "Mozilla Foundation",
    maxAmount: 250000,
    deadline: Date.now() + 60 * 86400000,
    status: "researching",
    notes: "",
    url: "https://foundation.mozilla.org",
  },
  {
    id: "g2",
    name: "Tech & Society",
    org: "MacArthur Foundation",
    maxAmount: 300000,
    deadline: Date.now() + 45 * 86400000,
    status: "researching",
    notes: "",
    url: "https://macfound.org",
  },
  {
    id: "g3",
    name: "AI & Civil Rights",
    org: "Humanity AI",
    maxAmount: 150000,
    deadline: Date.now() + 30 * 86400000,
    status: "researching",
    notes: "",
    url: "https://humanityai.org",
  },
  {
    id: "g4",
    name: "Open Tech Fund",
    org: "OTF",
    maxAmount: 200000,
    deadline: Date.now() + 90 * 86400000,
    status: "researching",
    notes: "",
    url: "https://opentech.fund",
  },
  {
    id: "g5",
    name: "Criminal Justice Tech",
    org: "NIJ",
    maxAmount: 500000,
    deadline: Date.now() + 120 * 86400000,
    status: "researching",
    notes: "",
    url: "https://nij.ojp.gov",
  },
  {
    id: "g6",
    name: "Civil Rights Growth",
    org: "Ford Foundation",
    maxAmount: 200000,
    deadline: Date.now() + 75 * 86400000,
    status: "researching",
    notes: "",
    url: "https://fordfoundation.org",
  },
  {
    id: "g7",
    name: "Technology for Democracy",
    org: "Knight Foundation",
    maxAmount: 500000,
    deadline: Date.now() + 14 * 86400000,
    status: "researching",
    notes: "",
    url: "https://knightfoundation.org",
  },
];

// ── Types ──
type GrantStatus =
  | "researching"
  | "drafting"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected";
interface GrantApp {
  id: string;
  name: string;
  org: string;
  maxAmount: number;
  deadline: number;
  status: GrantStatus;
  notes: string;
  url: string;
}

const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

function drawMockQR(canvas: HTMLCanvasElement | null, address: string) {
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
}

// ── Route ──
export const Route = createFileRoute("/donate")({
  head: () => ({
    meta: [
      { title: "Donate — Witness R.E.P" },
      {
        name: "description",
        content: "Support Witness R.E.P with voluntary donations, crypto, or grant tracking.",
      },
    ],
  }),
  component: DonateScreen,
});

function DonateScreen() {
  const { user } = useSession();
  const [tab, setTab] = useState<"donate" | "crypto" | "grants" | "referral">("donate");

  return (
    <main className="min-h-dvh">
      <ScreenHeader title="Support Witness" />
      <div className="mx-auto max-w-md px-4 py-4">
        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-zinc-950 border border-zinc-900 rounded-2xl mb-6">
          {(["donate", "crypto", "grants", "referral"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                tab === t
                  ? "bg-primary text-primary-foreground"
                  : "text-zinc-600 hover:text-zinc-400"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "donate" && <DonationSection />}
        {tab === "crypto" && <CryptoSection />}
        {tab === "grants" && <GrantSection />}
        {tab === "referral" && <ReferralSection userId={user?.id ?? null} />}
      </div>
    </main>
  );
}

// ── Voluntary Donation ──
function DonationSection() {
  const [amount, setAmount] = useState(10);
  const [customAmount, setCustomAmount] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [monthly, setMonthly] = useState(() => {
    if (typeof window === "undefined") return 28;
    return parseInt(localStorage.getItem("witness_monthly_donations") ?? "28");
  });
  const [thankYou, setThankYou] = useState(false);
  const goal = 40;

  const handleDonate = () => {
    const amt = amount || parseFloat(customAmount) || 10;
    const newTotal = monthly + amt;
    setMonthly(newTotal);
    localStorage.setItem("witness_monthly_donations", newTotal.toString());
    setThankYou(true);
    setTimeout(() => setThankYou(false), 3000);
    // Stripe placeholder — replace with actual Stripe integration
  };

  const pct = Math.min(100, (monthly / goal) * 100);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-primary font-black uppercase tracking-widest text-sm mb-2">
          Voluntary Donation
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          Witness R.E.P is ad‑free and will never charge for features. Your donation keeps servers
          running and encryption open-source.
        </p>
        <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 mb-4">
          <div className="flex justify-between text-[10px] font-bold uppercase text-zinc-500 mb-2">
            <span>Infrastructure Goal</span>
            <span className="text-primary">
              ${monthly} / ${goal}
            </span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-3 overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[5, 10, 25, 50].map((a) => (
            <button
              key={a}
              onClick={() => {
                setAmount(a);
                setCustomAmount("");
              }}
              className={`py-2 rounded-lg text-xs font-bold transition ${
                amount === a && !customAmount
                  ? "bg-primary text-primary-foreground"
                  : "bg-zinc-800 text-zinc-400 hover:border-primary border border-transparent"
              }`}
            >
              ${a}
            </button>
          ))}
        </div>
        <input
          type="number"
          placeholder="Custom Amount ($)"
          value={customAmount}
          onChange={(e) => {
            setCustomAmount(e.target.value);
            setAmount(0);
          }}
          className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-xl text-sm text-white focus:border-primary outline-none mb-3"
        />
        <label className="flex items-center gap-2 mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={recurring}
            onChange={(e) => setRecurring(e.target.checked)}
            className="accent-primary"
          />
          <span className="text-[10px] font-bold uppercase text-zinc-500">Monthly Recurring</span>
        </label>
        <button
          onClick={handleDonate}
          className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-black uppercase tracking-widest text-xs active:scale-95 transition"
        >
          Donate via Stripe
        </button>
        {thankYou && (
          <div className="mt-3 p-2 bg-green-950/30 border border-green-900 text-green-500 text-center rounded-lg text-xs font-bold">
            ✓ Thank you for your support.
          </div>
        )}
        <p className="text-[9px] text-zinc-600 mt-4 text-center uppercase tracking-tight">
          * Witness R.E.P is not a registered 501(c)(3). Donations are not tax‑deductible.
        </p>
      </div>
    </div>
  );
}

// ── Crypto Donation ──
function CryptoSection() {
  const btcRef = useRef<HTMLCanvasElement>(null);
  const ethRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState<"btc" | "eth" | null>(null);

  useEffect(() => {
    drawMockQR(btcRef.current, BITCOIN_ADDRESS);
    drawMockQR(ethRef.current, ETHEREUM_ADDRESS);
  }, []);

  const copy = (type: "btc" | "eth", addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-primary font-black uppercase tracking-widest text-sm mb-2">
        Blockchain Support
      </h2>
      <p className="text-xs text-muted-foreground mb-6">
        Maintain network sovereignty with peer‑to‑peer contributions.
      </p>
      <div className="grid grid-cols-1 gap-8">
        {/* BTC */}
        <div className="flex flex-col items-center bg-zinc-950 border border-zinc-900 rounded-xl p-4">
          <span className="text-[10px] font-black text-orange-500 uppercase mb-3">
            Bitcoin (BTC)
          </span>
          <div className="bg-white p-2 rounded-xl mb-3">
            <canvas ref={btcRef} className="rounded-lg" />
          </div>
          <p className="text-[9px] font-mono text-zinc-500 mb-2 truncate w-full text-center">
            {BITCOIN_ADDRESS.slice(0, 20)}…
          </p>
          <button
            onClick={() => copy("btc", BITCOIN_ADDRESS)}
            className="w-full bg-zinc-800 hover:bg-primary text-white font-bold py-2 rounded-xl text-[10px] uppercase transition"
          >
            {copied === "btc" ? "✓ Copied" : "Copy BTC Address"}
          </button>
        </div>
        {/* ETH */}
        <div className="flex flex-col items-center bg-zinc-950 border border-zinc-900 rounded-xl p-4">
          <span className="text-[10px] font-black text-blue-400 uppercase mb-3">
            Ethereum (ETH)
          </span>
          <div className="bg-white p-2 rounded-xl mb-3">
            <canvas ref={ethRef} className="rounded-lg" />
          </div>
          <p className="text-[9px] font-mono text-zinc-500 mb-2 truncate w-full text-center">
            {ETHEREUM_ADDRESS.slice(0, 20)}…
          </p>
          <button
            onClick={() => copy("eth", ETHEREUM_ADDRESS)}
            className="w-full bg-zinc-800 hover:bg-primary text-white font-bold py-2 rounded-xl text-[10px] uppercase transition"
          >
            {copied === "eth" ? "✓ Copied" : "Copy ETH Address"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Grant Tracker (localStorage) ──
function GrantSection() {
  const [grants, setGrants] = useState<GrantApp[]>(() => {
    if (typeof window === "undefined") return DEFAULT_GRANTS;
    const stored = localStorage.getItem("witness_grant_apps");
    if (stored) return JSON.parse(stored);
    localStorage.setItem("witness_grant_apps", JSON.stringify(DEFAULT_GRANTS));
    return DEFAULT_GRANTS;
  });
  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<GrantApp>>({});

  const save = (g: GrantApp[]) => {
    setGrants(g);
    localStorage.setItem("witness_grant_apps", JSON.stringify(g));
  };

  const add = () => {
    if (!form.name || !form.org || !form.maxAmount) return;
    save([
      ...grants,
      {
        id: genId(),
        name: sanitizeText(form.name, 120),
        org: sanitizeText(form.org, 80),
        maxAmount: form.maxAmount,
        deadline: form.deadline ?? Date.now() + 30 * 86400000,
        status: (form.status as GrantStatus) ?? "researching",
        notes: "",
        url: sanitizeText(form.url ?? "", 300),
      },
    ]);
    setShowForm(false);
    setForm({});
  };

  const updateStatus = (id: string, status: GrantStatus) => {
    save(grants.map((g) => (g.id === id ? { ...g, status } : g)));
  };

  const filtered = grants.filter((g) => filter === "all" || g.status === filter);

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-primary font-black uppercase tracking-widest text-sm mb-3">
        Grant Pipeline
      </h2>
      <div className="flex gap-2 mb-4">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase text-primary outline-none"
        >
          <option value="all">All</option>
          <option value="researching">Researching</option>
          <option value="drafting">Drafting</option>
          <option value="submitted">Submitted</option>
          <option value="approved">Approved</option>
        </select>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-primary text-primary-foreground px-3 py-1.5 rounded-full text-[10px] font-black uppercase"
        >
          {showForm ? "Cancel" : "+ Add"}
        </button>
      </div>
      {showForm && (
        <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 mb-4 space-y-2">
          <input
            placeholder="Grant name"
            value={form.name ?? ""}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded-lg text-xs text-white"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              placeholder="Organization"
              value={form.org ?? ""}
              onChange={(e) => setForm({ ...form, org: e.target.value })}
              className="bg-zinc-900 border border-zinc-800 p-2 rounded-lg text-xs text-white"
            />
            <input
              type="number"
              placeholder="Amount ($)"
              value={form.maxAmount ?? ""}
              onChange={(e) => setForm({ ...form, maxAmount: parseInt(e.target.value) })}
              className="bg-zinc-900 border border-zinc-800 p-2 rounded-lg text-xs text-white"
            />
          </div>
          <input
            type="date"
            className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded-lg text-xs text-zinc-500"
            onChange={(e) => setForm({ ...form, deadline: new Date(e.target.value).getTime() })}
          />
          <input
            placeholder="URL"
            value={form.url ?? ""}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded-lg text-xs text-white"
          />
          <button
            onClick={add}
            className="w-full bg-primary py-2 rounded-lg font-black text-xs uppercase text-primary-foreground"
          >
            Add Application
          </button>
        </div>
      )}
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {filtered.map((g) => (
          <div key={g.id} className="bg-zinc-950 border border-zinc-900 rounded-xl p-3">
            <div className="flex justify-between items-start mb-1">
              <span className="font-bold text-xs uppercase">{g.name}</span>
              <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-bold">
                {Math.ceil((g.deadline - Date.now()) / 86400000)}d
              </span>
            </div>
            <div className="text-[9px] text-zinc-500 font-bold uppercase mb-2">
              {g.org} · ${g.maxAmount.toLocaleString()}
            </div>
            <div className="flex gap-2">
              <select
                value={g.status}
                onChange={(e) => updateStatus(g.id, e.target.value as GrantStatus)}
                className="bg-zinc-900 border border-zinc-800 text-[9px] font-bold uppercase p-1 rounded text-zinc-400 outline-none"
              >
                <option value="researching">Researching</option>
                <option value="drafting">Drafting</option>
                <option value="submitted">Submitted</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
              <a
                href={g.url}
                target="_blank"
                rel="noreferrer"
                className="text-[9px] font-bold bg-zinc-800 px-2 py-1 rounded uppercase hover:bg-zinc-700 text-zinc-300"
              >
                View
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Referral ──
function ReferralSection({ userId }: { userId: string | null }) {
  const link = userId
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/signup?ref=${userId}`
    : "Sign in to get your referral link";

  const share = () => {
    if (!userId) return;
    if (navigator.share) {
      navigator.share({
        title: "Join Witness R.E.P",
        text: "Join the secure evidence network.",
        url: link,
      });
    } else {
      navigator.clipboard.writeText(link);
      alert("Referral link copied!");
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-primary font-black uppercase tracking-widest text-sm mb-3">
        Network Growth
      </h2>
      <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 mb-4 text-center">
        <p className="text-[10px] text-zinc-500 uppercase font-bold mb-2">Your Referral Link</p>
        <p className="text-sm font-mono text-white break-all mb-3">{link}</p>
        <button
          onClick={share}
          disabled={!userId}
          className="bg-primary text-primary-foreground px-6 py-2 rounded-full text-[10px] font-black uppercase disabled:opacity-50"
        >
          {userId ? "Share Link" : "Sign in to refer"}
        </button>
      </div>
      <p className="text-[10px] text-zinc-600 text-center uppercase">
        Earn 150 points for each person who signs up with your link.
      </p>
    </div>
  );
}
