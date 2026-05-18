import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Camera,
  User,
  UserCircle,
  Briefcase,
  GraduationCap,
  Check,
  Loader2,
  Upload,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { setFlag, STORAGE_KEYS } from "@/lib/witness-storage";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Profile Setup — Witness R.E.P" },
      {
        name: "description",
        content: "Set up your profile to sync your encrypted vault.",
      },
    ],
  }),
  component: ProfileOnboardingScreen,
});

type AccountType = "Standard User" | "Student" | "Journalist or Legal Observer";

function ProfileOnboardingScreen() {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("Standard User");
  const [busy, setBusy] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        // Mock user fallback for testing without real auth if needed
        const mockSess = localStorage.getItem("sb-mock-session");
        if (mockSess) {
          const sess = JSON.parse(mockSess);
          setUser(sess.user);
        } else {
          void navigate({ to: "/signup" });
        }
      } else {
        setUser(data.user);
      }
    })();
  }, [navigate]);

  async function handleSubmit() {
    if (!displayName.trim()) {
      toast.error("Display name is required");
      return;
    }
    if (displayName.length > 30) {
      toast.error("Display name must be under 30 characters");
      return;
    }

    setBusy(true);
    try {
      if (user?.id !== "mock-user-id") {
        const { error } = await supabase
          .from("profiles")
          .update({
            display_name: displayName.trim(),
            account_type: accountType,
            profile_complete: true,
          })
          .eq("user_id", user.id);

        if (error) throw error;
      }

      setFlag(STORAGE_KEYS.onboarded, true);
      toast.success("Profile updated");
      void navigate({ to: "/camera" });
    } catch (e) {
      console.error(e);
      toast.error("Failed to save profile. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const handleSkip = () => {
    setFlag(STORAGE_KEYS.onboarded, true);
    void navigate({ to: "/camera" });
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-6 py-10 pt-[max(3rem,env(safe-area-inset-top))] bg-background text-foreground">
      <div className="mb-8 flex items-center gap-2">
        <span className="text-base font-black uppercase tracking-[0.2em]">Witness R.E.P</span>
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
      </div>

      <h1 className="text-3xl font-bold leading-tight">Profile Setup</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Customize your identity for tamper-proof certificates and legal evidence.
      </p>

      <div className="mt-10 flex flex-col gap-6">
        {/* Profile Photo Placeholder */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative group cursor-pointer">
            <div className="grid h-24 w-24 place-items-center rounded-full border-2 border-dashed border-border bg-card text-muted-foreground group-hover:border-primary group-hover:text-primary transition-colors overflow-hidden">
              <UserCircle className="h-12 w-12" />
            </div>
            <div className="absolute bottom-0 right-0 grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg">
              <Upload className="h-4 w-4" />
            </div>
          </div>
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Add Photo (Optional)
          </span>
        </div>

        {/* Display Name */}
        <div>
          <label
            htmlFor="display-name"
            className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground"
          >
            Display Name
          </label>
          <input
            id="display-name"
            type="text"
            maxLength={30}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="John Doe"
            className="h-14 w-full rounded-2xl border border-border bg-card px-4 text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
          <p className="mt-1.5 text-[10px] text-muted-foreground text-right">
            {displayName.length}/30
          </p>
        </div>

        {/* Account Type */}
        <div>
          <label className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Account Type
          </label>
          <div className="grid gap-3">
            <AccountTypeOption
              icon={<User className="h-4 w-4" />}
              label="Standard User"
              selected={accountType === "Standard User"}
              onClick={() => setAccountType("Standard User")}
            />
            <AccountTypeOption
              icon={<GraduationCap className="h-4 w-4" />}
              label="Student"
              selected={accountType === "Student"}
              onClick={() => setAccountType("Student")}
            />
            <AccountTypeOption
              icon={<Briefcase className="h-4 w-4" />}
              label="Journalist or Legal Observer"
              selected={accountType === "Journalist or Legal Observer"}
              onClick={() => setAccountType("Journalist or Legal Observer")}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-[4rem]" />

      <div className="flex flex-col gap-3">
        <button
          type="button"
          disabled={busy || !displayName.trim()}
          onClick={handleSubmit}
          className="grid h-14 place-items-center rounded-2xl bg-primary text-sm font-bold uppercase tracking-[0.2em] text-primary-foreground transition active:scale-[0.98] disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "Complete Setup"}
        </button>
        <button
          type="button"
          onClick={handleSkip}
          className="h-10 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
        >
          Skip for now
        </button>
      </div>
    </main>
  );
}

function AccountTypeOption({
  icon,
  label,
  selected,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition-all ${
        selected ? "border-primary bg-primary/10" : "border-border bg-card"
      }`}
    >
      <span
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
      >
        {icon}
      </span>
      <span className="flex-1 text-sm font-semibold">{label}</span>
      {selected && <Check className="h-4 w-4 text-primary" />}
    </button>
  );
}
