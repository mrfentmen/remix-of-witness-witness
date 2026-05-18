// /org — Organization accounts: fiscal sponsorship info + org dashboard.
// Accessible from Settings → Legal section for org accounts.
import { createFileRoute } from "@tanstack/react-router";
import { ScreenHeader } from "@/components/witness/screen-header";
import { useState } from "react";
import { useSession } from "@/lib/cloud-auth";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeText } from "@/lib/witness-sanitize";

export const Route = createFileRoute("/org")({
  head: () => ({
    meta: [
      { title: "Organizations — Witness R.E.P" },
      {
        name: "description",
        content: "Fiscal sponsorship info and organization dashboard for Witness R.E.P.",
      },
    ],
  }),
  component: OrgScreen,
});

function OrgScreen() {
  const [tab, setTab] = useState<"fiscal" | "register" | "dashboard">("fiscal");

  return (
    <main className="min-h-dvh">
      <ScreenHeader title="Organizations" />
      <div className="mx-auto max-w-md px-4 py-4">
        <div className="flex gap-1 p-1 bg-zinc-950 border border-zinc-900 rounded-2xl mb-6">
          {(["fiscal", "register", "dashboard"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                tab === t
                  ? "bg-primary text-primary-foreground"
                  : "text-zinc-600 hover:text-zinc-400"
              }`}
            >
              {t === "fiscal" ? "Fiscal" : t === "register" ? "Register" : "Dashboard"}
            </button>
          ))}
        </div>
        {tab === "fiscal" && <FiscalSponsorshipInfo />}
        {tab === "register" && <OrgRegistration />}
        {tab === "dashboard" && <OrgDashboard />}
      </div>
    </main>
  );
}

// ── Fiscal Sponsorship Info (static) ──
function FiscalSponsorshipInfo() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <h2 className="text-primary font-black uppercase tracking-widest text-sm">
        Fiscal Sponsorship
      </h2>
      <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
        <p>
          Fiscal sponsorship lets an established 501(c)(3) nonprofit accept tax‑deductible donations
          on Witness R.E.P's behalf, handling compliance while you focus on the mission.
        </p>
        <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-3 space-y-2">
          <p className="font-bold text-foreground">Benefits:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Donors receive tax deduction receipts</li>
            <li>Sponsor handles 990 filings & audits</li>
            <li>Access to grant opportunities requiring 501(c)(3) status</li>
            <li>Reduced administrative burden</li>
          </ul>
        </div>
        <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-3 space-y-2">
          <p className="font-bold text-foreground">Typical costs:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>5–15% administrative fee on donations</li>
            <li>Annual sponsorship agreement</li>
            <li>May require board alignment</li>
          </ul>
        </div>
        <p>
          Witness R.E.P is seeking fiscal sponsorship partners. Organizations interested in hosting
          Witness R.E.P as a fiscally sponsored project should contact{" "}
          <a href="mailto:contactae2000@gmail.com" className="text-primary underline font-bold">
            contactae2000@gmail.com
          </a>
          .
        </p>
      </div>
    </div>
  );
}

// ── Org Registration ──
function OrgRegistration() {
  const { user } = useSession();
  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState("nonprofit");
  const [fiscalSponsor, setFiscalSponsor] = useState("");
  const [ein, setEin] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!user || !orgName) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("organizations").upsert(
        {
          user_id: user.id,
          org_name: sanitizeText(orgName, 120),
          org_type: orgType,
          fiscal_sponsor: sanitizeText(fiscalSponsor, 120) || null,
          ein: sanitizeText(ein, 20) || null,
          verified: false,
        },
        { onConflict: "user_id" },
      );
      if (error) throw error;
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    } catch (e) {
      console.error("[witness] Org registration failed", e);
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 text-center">
        <p className="text-sm text-muted-foreground">Sign in to register your organization.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
      <h2 className="text-primary font-black uppercase tracking-widest text-sm">
        Register Organization
      </h2>
      <input
        placeholder="Organization name"
        value={orgName}
        onChange={(e) => setOrgName(e.target.value)}
        className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-xl text-sm text-white outline-none focus:border-primary"
      />
      <select
        value={orgType}
        onChange={(e) => setOrgType(e.target.value)}
        className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-xl text-sm text-white outline-none focus:border-primary"
      >
        <option value="nonprofit">Nonprofit</option>
        <option value="legal_aid">Legal Aid Organization</option>
        <option value="journalism">Journalism / Media</option>
        <option value="community">Community Group</option>
        <option value="research">Research Institution</option>
        <option value="other">Other</option>
      </select>
      <input
        placeholder="Fiscal sponsor (if any)"
        value={fiscalSponsor}
        onChange={(e) => setFiscalSponsor(e.target.value)}
        className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-xl text-sm text-white outline-none focus:border-primary"
      />
      <input
        placeholder="EIN (optional)"
        value={ein}
        onChange={(e) => setEin(e.target.value.replace(/\D/g, "").slice(0, 9))}
        className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-xl text-sm text-white outline-none focus:border-primary"
      />
      <button
        onClick={submit}
        disabled={!orgName || saving}
        className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-black uppercase tracking-widest text-xs active:scale-95 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Register"}
      </button>
      {done && (
        <p className="text-green-500 text-xs font-bold text-center">✓ Organization registered.</p>
      )}
    </div>
  );
}

// ── Org Dashboard ──
function OrgDashboard() {
  const { user } = useSession();
  const [org, setOrg] = useState<{ org_name: string; org_type: string; verified: boolean } | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  const fetchOrg = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("organizations")
      .select("org_name, org_type, verified")
      .eq("user_id", user.id)
      .single();
    setOrg(data ?? null);
    setLoading(false);
  };

  if (org === null && loading) {
    // Trigger fetch
    fetchOrg().catch(() => setLoading(false));
  }

  if (!user) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 text-center">
        <p className="text-sm text-muted-foreground">
          Sign in to view your organization dashboard.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 text-center">
        <p className="text-xs text-zinc-500 animate-pulse">Loading dashboard…</p>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 text-center">
        <p className="text-sm text-muted-foreground mb-3">No organization registered yet.</p>
        <button
          onClick={() => {
            const el = document.querySelector('[data-tab="register"]') as HTMLButtonElement;
            el?.click();
          }}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-full text-[10px] font-black uppercase"
        >
          Register now
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <h2 className="text-primary font-black uppercase tracking-widest text-sm">{org.org_name}</h2>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-3">
          <p className="text-[9px] text-zinc-500 uppercase font-bold">Type</p>
          <p className="text-sm font-bold capitalize">{org.org_type.replace("_", " ")}</p>
        </div>
        <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-3">
          <p className="text-[9px] text-zinc-500 uppercase font-bold">Verified</p>
          <p className={`text-sm font-bold ${org.verified ? "text-green-500" : "text-yellow-500"}`}>
            {org.verified ? "Yes" : "Pending"}
          </p>
        </div>
      </div>
      <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-3 space-y-2">
        <p className="text-[10px] text-zinc-500 uppercase font-bold">Organization Features</p>
        <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
          <li>Bulk recording management</li>
          <li>Team member invites</li>
          <li>Custom certificate branding</li>
          <li>Priority support</li>
        </ul>
        <p className="text-[9px] text-zinc-600 italic mt-2">Full org features coming soon.</p>
      </div>
    </div>
  );
}
