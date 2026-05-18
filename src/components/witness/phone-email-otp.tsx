import { useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { Phone, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { sendPhoneOtp, verifyPhoneOtp } from "@/lib/cloud-auth";
import { setFlag, STORAGE_KEYS } from "@/lib/witness-storage";
import { sanitizePhone } from "@/lib/witness-sanitize";

export function PhoneEmailOtp({
  heading,
  subhead,
  footerPrompt,
  footerLinkLabel,
  footerTo,
  isLogin,
  extraFields,
  onAfterVerify,
}: {
  heading: string;
  subhead?: string;
  footerPrompt: string;
  footerLinkLabel: string;
  footerTo: "/login" | "/signup";
  /** When true, supabase will NOT create a new user — only existing accounts can sign in. */
  isLogin?: boolean;
  extraFields?: React.ReactNode;
  onAfterVerify?: () => Promise<void> | void;
}) {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"identifier" | "code">("identifier");
  const [busy, setBusy] = useState(false);

  // Always use phone as identifier now
  const identifier = phone.trim();

  async function handleContinue() {
    // Basic validation: must have at least 10 digits if we strip spaces
    const digitsOnly = phone.replace(/\D/g, "");
    if (digitsOnly.length < 10) {
      toast.error("Enter a valid 10-digit phone number");
      return;
    }

    setBusy(true);
    try {
      const shouldCreate = !isLogin;
      // We are only sending phone OTP now.
      // If no + is present, assume +1 for US/Canada as a default for these inputs
      let formattedPhone = phone.trim();
      if (!formattedPhone.startsWith("+")) {
        formattedPhone = `+1${formattedPhone.replace(/\D/g, "")}`;
      }

      await sendPhoneOtp(sanitizePhone(formattedPhone), { shouldCreateUser: shouldCreate });
      toast.success("Verification code sent");
      setStage("code");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't send code");
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify() {
    if (!/^\d{6}$/.test(code)) {
      toast.error("Enter the 6-digit code");
      return;
    }
    setBusy(true);
    try {
      // Re-format phone for verification as well
      let formattedPhone = phone.trim();
      if (!formattedPhone.startsWith("+")) {
        formattedPhone = `+1${formattedPhone.replace(/\D/g, "")}`;
      }

      await verifyPhoneOtp(sanitizePhone(formattedPhone), code);
      // Mark onboarded so future opens go straight to camera/login flow.
      setFlag(STORAGE_KEYS.onboarded, true);
      try {
        await onAfterVerify?.();
      } catch {
        /* non-fatal */
      }
      toast.success("Verified");
      void navigate({ to: "/onboarding" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Invalid code");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col px-6 pb-10 pt-[max(3rem,env(safe-area-inset-top))]">
      <div className="mb-8 flex items-center gap-2">
        <span className="text-base font-black uppercase tracking-[0.2em]">Witness R.E.P</span>
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
      </div>

      <h1 className="text-3xl font-bold leading-tight">{heading}</h1>
      {subhead && <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{subhead}</p>}

      {stage === "identifier" ? (
        <div className="mt-8 flex flex-col gap-4">
          <div>
            <label
              htmlFor="phone-input"
              className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground"
            >
              <Phone className="h-3.5 w-3.5" /> Phone number
            </label>
            <input
              id="phone-input"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
              }}
              placeholder="917 655 3924"
              className="h-14 w-full rounded-2xl border border-border bg-card px-4 text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={handleContinue}
            disabled={busy || phone.trim().length < 5} // Enable as soon as a few characters are typed
            className="mt-2 grid h-14 place-items-center rounded-2xl bg-primary text-sm font-bold uppercase tracking-[0.2em] text-primary-foreground transition active:scale-[0.98] disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "Continue"}
          </button>

          <p className="text-[11px] leading-relaxed text-muted-foreground">
            We'll text you a 6-digit code. Standard message rates may apply. By continuing you agree
            to our{" "}
            <Link to="/legal/terms" className="underline">
              Terms
            </Link>{" "}
            and{" "}
            <Link to="/legal/privacy" className="underline">
              Privacy Policy
            </Link>
            .
          </p>
          {extraFields}
        </div>
      ) : (
        <div className="mt-8 flex flex-col gap-4">
          <p className="text-xs text-muted-foreground">
            Enter the 6-digit code sent to{" "}
            <span className="font-semibold text-foreground">{identifier}</span>
          </p>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="••••••"
            className="h-16 w-full rounded-2xl border border-border bg-card px-4 text-center text-2xl tracking-[0.5em] text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
          <button
            type="button"
            onClick={handleVerify}
            disabled={busy}
            className="grid h-14 place-items-center rounded-2xl bg-primary text-sm font-bold uppercase tracking-[0.2em] text-primary-foreground transition active:scale-[0.98] disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "Verify & continue"}
          </button>
          <button
            type="button"
            onClick={() => {
              setStage("identifier");
              setCode("");
            }}
            className="text-center text-[11px] uppercase tracking-[0.2em] text-muted-foreground"
          >
            ← Use a different phone number
          </button>
        </div>
      )}

      <div className="mt-auto pt-10 text-center text-sm text-muted-foreground">
        {footerPrompt}{" "}
        <Link to={footerTo} className="font-semibold text-primary">
          {footerLinkLabel}
        </Link>
      </div>
    </main>
  );
}
