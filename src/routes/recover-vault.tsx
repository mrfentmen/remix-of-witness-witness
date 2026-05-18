import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck, KeyRound, AlertTriangle, Loader2, Cloud, Lock } from "lucide-react";
import { toast } from "sonner";
import { ScreenHeader } from "@/components/witness/screen-header";
import { useSession } from "@/lib/cloud-auth";
import { fetchProfileKeyState, hasLocalMasterKey, recoverMasterKey } from "@/lib/cloud-key";
import { listCloudRecordings } from "@/lib/cloud-recordings";
import { setString, STORAGE_KEYS } from "@/lib/witness-storage";

export const Route = createFileRoute("/recover-vault")({
  head: () => ({
    meta: [
      { title: "Restore your vault — Witness R.E.P" },
      {
        name: "description",
        content:
          "Re-enter your PIN to unwrap your master key and restore your encrypted recordings.",
      },
    ],
  }),
  component: RecoverVaultScreen,
});

type Stage = "loading" | "no-cloud-key" | "ready-to-recover" | "already-unlocked";

function RecoverVaultScreen() {
  const { user, loading } = useSession();
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>("loading");
  const [cloudCount, setCloudCount] = useState<number | null>(null);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    void (async () => {
      try {
        if (hasLocalMasterKey()) {
          setStage("already-unlocked");
          return;
        }
        const [keyState, recs] = await Promise.all([
          fetchProfileKeyState(user.id),
          listCloudRecordings(),
        ]);
        setCloudCount(recs.length);
        if (!keyState.hasWrappedKey) setStage("no-cloud-key");
        else setStage("ready-to-recover");
      } catch (e) {
        console.error(e);
        setStage("no-cloud-key");
      }
    })();
  }, [user, loading, navigate]);

  async function handleUnlock() {
    if (!user) return;
    setError(null);
    if (!/^\d{4}$/.test(pin)) {
      setError("PIN must be 4 digits");
      return;
    }
    setBusy(true);
    try {
      await recoverMasterKey(user.id, pin);
      setString(STORAGE_KEYS.pin, pin);
      toast.success("Vault unlocked — your recordings are being restored");
      navigate({ to: "/vault" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Recovery failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-dvh">
      <ScreenHeader title="Restore vault" />
      <section className="mx-auto flex max-w-sm flex-col gap-5 px-6 py-6">
        {stage === "loading" && (
          <div className="grid place-items-center py-20">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {stage === "already-unlocked" && (
          <div className="rounded-2xl border border-success/40 bg-success/10 p-4 text-sm">
            <p className="inline-flex items-center gap-2 font-semibold text-success">
              <ShieldCheck className="h-4 w-4" /> Vault already unlocked
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Your master key is loaded on this device. Nothing more to do.
            </p>
            <button
              onClick={() => navigate({ to: "/vault" })}
              className="mt-3 text-xs font-bold uppercase tracking-wider text-primary"
            >
              Open vault →
            </button>
          </div>
        )}

        {stage === "no-cloud-key" && (
          <div className="rounded-2xl border border-border bg-card p-4 text-sm">
            <p className="inline-flex items-center gap-2 font-semibold">
              <KeyRound className="h-4 w-4" /> No cloud-wrapped key found
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              We couldn't find a wrapped vault key on your account. If this is a new device, sign in
              and create a vault PIN from the account screen first.
            </p>
            <Link
              to="/auth"
              className="mt-3 inline-block text-xs font-bold uppercase tracking-wider text-primary"
            >
              Go to account →
            </Link>
          </div>
        )}

        {stage === "ready-to-recover" && (
          <>
            <div className="space-y-3">
              <h2 className="text-2xl font-bold leading-tight">
                Welcome back. Let's restore your vault.
              </h2>
              <p className="text-sm text-muted-foreground">
                We detected{" "}
                {cloudCount && cloudCount > 0 ? (
                  <>
                    encrypted backups of{" "}
                    <span className="font-semibold text-foreground">
                      {cloudCount} recording{cloudCount === 1 ? "" : "s"}
                    </span>
                  </>
                ) : (
                  <>your encrypted vault</>
                )}{" "}
                in the cloud, but no local key on this device.
              </p>
            </div>

            <ol className="space-y-3">
              <Step
                icon={<Cloud className="h-4 w-4" />}
                title="Your recordings are safe"
                desc="They're stored end-to-end encrypted. Witness R.E.P servers never see the raw video — only your PIN can unlock them."
              />
              <Step
                icon={<Lock className="h-4 w-4" />}
                title="Enter your PIN"
                desc="The 4-digit PIN you set when you first created your vault unwraps your master key directly on this device."
              />
              <Step
                icon={<ShieldCheck className="h-4 w-4" />}
                title="Vault restored"
                desc="Your library reappears immediately. Recordings stream back from cloud backup as you tap them."
              />
            </ol>

            <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-destructive">
                <AlertTriangle className="h-4 w-4" /> If you forgot your PIN
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Your recordings{" "}
                <span className="font-semibold text-foreground">cannot be recovered</span>. Witness
                R.E.P has zero knowledge of your PIN — it never leaves your device. Without it the
                encrypted backups in the cloud are permanent ciphertext.
              </p>
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Vault PIN
              </label>
              <input
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value.replace(/\D/g, "").slice(0, 4));
                  setError(null);
                }}
                placeholder="••••"
                autoFocus
                className="h-14 rounded-2xl border border-border bg-background px-4 text-center text-2xl tracking-[0.6em] placeholder:text-muted-foreground"
              />
              {error && <p className="text-xs font-semibold text-destructive">{error}</p>}
              <button
                type="button"
                disabled={busy || pin.length !== 4}
                onClick={handleUnlock}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-bold uppercase tracking-wider text-primary-foreground disabled:opacity-50"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                Unlock vault
              </button>
            </div>

            <Link
              to="/camera"
              className="text-center text-xs uppercase tracking-wider text-muted-foreground"
            >
              Skip for now
            </Link>
          </>
        )}
      </section>
    </main>
  );
}

function Step({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <li className="flex gap-3 rounded-2xl border border-border bg-card p-3">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
      </div>
    </li>
  );
}
