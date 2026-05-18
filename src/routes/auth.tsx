import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { Phone, Mail, ShieldCheck, LogOut, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ScreenHeader } from "@/components/witness/screen-header";
import {
  useSession,
  sendPhoneOtp,
  verifyPhoneOtp,
  sendEmailOtp,
  verifyEmailOtp,
  signOut,
} from "@/lib/cloud-auth";
import {
  fetchProfileKeyState,
  hasLocalMasterKey,
  provisionMasterKey,
  recoverMasterKey,
} from "@/lib/cloud-key";
import { getString, setString, STORAGE_KEYS } from "@/lib/witness-storage";
import { sanitizePhone, sanitizeEmail } from "@/lib/witness-sanitize";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Witness R.E.P" },
      { name: "description", content: "Sign in to sync your encrypted vault across devices." },
    ],
  }),
  component: AuthScreen,
});

function AuthScreen() {
  const { user, loading } = useSession();

  return (
    <main className="min-h-dvh">
      <ScreenHeader title="Account" />
      {loading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : user ? (
        <SignedIn />
      ) : (
        <SignInForm />
      )}
    </main>
  );
}

/* ---------------- Signed-in panel ---------------- */

function SignedIn() {
  const { user } = useSession();
  const navigate = useNavigate();
  const [keyState, setKeyState] = useState<"loading" | "needs-pin" | "needs-recover" | "ready">(
    "loading",
  );
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);

  // Determine key state once user known
  useEffect(() => {
    if (!user) return;
    void (async () => {
      try {
        const state = await fetchProfileKeyState(user.id);
        if (hasLocalMasterKey()) setKeyState("ready");
        else if (state.hasWrappedKey) setKeyState("needs-recover");
        else setKeyState("needs-pin");
      } catch (e) {
        console.error(e);
        setKeyState("needs-pin");
      }
    })();
  }, [user]);

  async function handleProvision() {
    if (!user) return;
    if (!/^\d{4}$/.test(pin)) {
      toast.error("PIN must be 4 digits");
      return;
    }
    setBusy(true);
    try {
      await provisionMasterKey(user.id, pin);
      setString(STORAGE_KEYS.pin, pin);
      toast.success("Vault key set up — synced to cloud");
      setKeyState("ready");
      setPin("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Setup failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleRecover() {
    if (!user) return;
    if (!/^\d{4}$/.test(pin)) {
      toast.error("Enter your 4-digit PIN");
      return;
    }
    setBusy(true);
    try {
      await recoverMasterKey(user.id, pin);
      setString(STORAGE_KEYS.pin, pin);
      toast.success("Vault unlocked");
      setKeyState("ready");
      setPin("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Recovery failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto flex max-w-sm flex-col gap-5 px-6 py-8">
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Signed in as</p>
        <p className="mt-1 truncate text-sm font-semibold">
          {user?.phone ?? user?.email ?? user?.id}
        </p>
      </div>

      {keyState === "loading" && (
        <div className="grid place-items-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {keyState === "needs-pin" && (
        <KeyCard
          title="Set a vault PIN"
          desc="Your recordings are encrypted with a key wrapped by this 4-digit PIN. We store the wrapped key in the cloud so you can recover after reinstalling."
          pin={pin}
          setPin={setPin}
          busy={busy}
          ctaIcon={<KeyRound className="h-4 w-4" />}
          ctaLabel="Create vault key"
          onSubmit={handleProvision}
        />
      )}

      {keyState === "needs-recover" && (
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
          <div>
            <h3 className="text-base font-bold">Restore your vault</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              You have encrypted recordings backed up in the cloud. Re-enter your PIN on the
              dedicated recovery screen to unwrap your master key and bring them back.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate({ to: "/recover-vault" })}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-bold uppercase tracking-wider text-primary-foreground"
          >
            <ShieldCheck className="h-4 w-4" /> Open recovery
          </button>
        </div>
      )}

      {keyState === "ready" && (
        <div className="rounded-2xl border border-success/40 bg-success/10 p-4 text-sm">
          <p className="inline-flex items-center gap-2 font-semibold text-success">
            <ShieldCheck className="h-4 w-4" /> Vault key ready
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Recordings sync metadata + encrypted backups to your account.
          </p>
          <button
            onClick={() => navigate({ to: "/vault" })}
            className="mt-3 text-xs font-bold uppercase tracking-wider text-primary"
          >
            Open vault →
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={async () => {
          await signOut();
          toast.success("Signed out");
        }}
        className="mt-2 inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-card py-3 text-sm font-semibold"
      >
        <LogOut className="h-4 w-4" /> Sign out
      </button>
    </section>
  );
}

function KeyCard({
  title,
  desc,
  pin,
  setPin,
  busy,
  ctaIcon,
  ctaLabel,
  onSubmit,
}: {
  title: string;
  desc: string;
  pin: string;
  setPin: (p: string) => void;
  busy: boolean;
  ctaIcon: React.ReactNode;
  ctaLabel: string;
  onSubmit: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <div>
        <h3 className="text-base font-bold">{title}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
      </div>
      <input
        inputMode="numeric"
        maxLength={4}
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
        placeholder="••••"
        className="h-14 rounded-2xl border border-border bg-background px-4 text-center text-2xl tracking-[0.6em] placeholder:text-muted-foreground"
      />
      <button
        type="button"
        disabled={busy || pin.length !== 4}
        onClick={onSubmit}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-bold uppercase tracking-wider text-primary-foreground disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : ctaIcon}
        {ctaLabel}
      </button>
    </div>
  );
}

/* ---------------- Sign-in form ---------------- */

type Mode = "phone" | "email";

function SignInForm() {
  const [mode, setMode] = useState<Mode>("phone");
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"identifier" | "code">("identifier");
  const [busy, setBusy] = useState(false);

  async function sendCode() {
    const clean = mode === "phone" ? sanitizePhone(identifier) : sanitizeEmail(identifier);
    if (!clean) {
      toast.error(`Enter your ${mode}`);
      return;
    }
    setBusy(true);
    try {
      if (mode === "phone") await sendPhoneOtp(clean);
      else await sendEmailOtp(clean);
      toast.success("Code sent");
      setStage("code");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send code");
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    if (!/^\d{6}$/.test(code)) {
      toast.error("Enter the 6-digit code");
      return;
    }
    setBusy(true);
    try {
      const clean = mode === "phone" ? sanitizePhone(identifier) : sanitizeEmail(identifier);
      if (mode === "phone") await verifyPhoneOtp(clean, code);
      else await verifyEmailOtp(clean, code);
      toast.success("Signed in");
      // Restore last known PIN locally so legacy save flow keeps working
      const existing = getString(STORAGE_KEYS.pin);
      if (existing) setString(STORAGE_KEYS.pin, existing);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Invalid code");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto flex max-w-sm flex-col gap-6 px-6 py-8">
      <div>
        <h2 className="text-2xl font-bold">Sign in to Witness R.E.P</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Sync your encrypted vault across devices. Your recordings stay end-to-end encrypted — only
          your PIN unlocks them.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border bg-card p-1 text-xs font-semibold uppercase tracking-wider">
        <button
          onClick={() => {
            setMode("phone");
            setStage("identifier");
          }}
          className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 ${mode === "phone" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
        >
          <Phone className="h-3.5 w-3.5" /> Phone
        </button>
        <button
          onClick={() => {
            setMode("email");
            setStage("identifier");
          }}
          className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 ${mode === "email" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
        >
          <Mail className="h-3.5 w-3.5" /> Email
        </button>
      </div>

      {stage === "identifier" ? (
        <>
          <input
            type={mode === "phone" ? "tel" : "email"}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder={mode === "phone" ? "+1 555 555 5555" : "you@example.com"}
            className="h-14 rounded-2xl border border-border bg-card px-4 text-base placeholder:text-muted-foreground"
          />
          <button
            type="button"
            onClick={sendCode}
            disabled={busy}
            className="grid h-14 place-items-center rounded-2xl bg-primary text-sm font-bold uppercase tracking-wider text-primary-foreground disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send code"}
          </button>
          {mode === "phone" && (
            <p className="text-[11px] text-muted-foreground">
              SMS provider must be configured in Cloud → Auth. If unavailable, use email instead.
            </p>
          )}
        </>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            Enter the 6-digit code sent to{" "}
            <span className="font-semibold text-foreground">{identifier}</span>
          </p>
          <input
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="123456"
            className="h-14 rounded-2xl border border-border bg-card px-4 text-center text-2xl tracking-[0.5em] placeholder:text-muted-foreground"
          />
          <button
            type="button"
            onClick={verify}
            disabled={busy}
            className="grid h-14 place-items-center rounded-2xl bg-primary text-sm font-bold uppercase tracking-wider text-primary-foreground disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & sign in"}
          </button>
          <button
            onClick={() => setStage("identifier")}
            className="text-xs uppercase tracking-wider text-muted-foreground"
          >
            ← Use a different {mode}
          </button>
        </>
      )}

      <Link
        to="/camera"
        className="mt-2 text-center text-xs uppercase tracking-wider text-muted-foreground"
      >
        Skip — use offline only
      </Link>
    </section>
  );
}
