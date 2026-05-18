import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScreenHeader } from "@/components/witness/screen-header";
import {
  Lock,
  FileText,
  Play,
  Trash2,
  MapPin,
  Shield,
  ShieldOff,
  X,
  Download,
  Package,
  FileLock2,
  FileVideo,
  Cloud,
  CloudOff,
  CloudUpload,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  Globe2,
  EyeOff,
  List,
  CalendarDays,
  Wifi,
  Mail,
  KeyRound,
  Search,
  Tag,
  Film,
  FilePen,
  ArrowUpDown,
  CheckSquare,
  Square,
  Layers,
  Eraser,
} from "lucide-react";
import { GpsTrackViewer } from "@/components/witness/gps-track-viewer";
import { ContinuityBadge } from "@/components/witness/continuity-badge";
import {
  deleteRecording,
  getRecordingBlob,
  listRecordings,
  updateRecordingDetails,
  type RecordingMeta,
} from "@/lib/witness-db";
import {
  exportBundle,
  exportCertificate,
  exportDecrypted,
  exportEncrypted,
} from "@/lib/witness-export";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { announce } from "@/components/witness/a11y-announcer";
import { getString, setString, STORAGE_KEYS } from "@/lib/witness-storage";
import { resetUpload, uploadRecording, useUploadState } from "@/lib/witness-uploader";
import {
  listCloudRecordings,
  recoverRecordingFromS3,
  type CloudRecording,
} from "@/lib/cloud-recordings";
import { useSession, sendEmailOtp } from "@/lib/cloud-auth";
import { CloudDownload } from "lucide-react";
import { getPublicFlags, setRecordingPublic } from "@/lib/map-data";
import { usePinLockout } from "@/hooks/use-pin-lockout";
import { useSessionTimeout } from "@/hooks/use-session-timeout";
import { tryUnlock, hasDecoyPin, setRealPin, setDecoyPin, getRealPin } from "@/lib/witness-decoy";
import { supabase } from "@/integrations/supabase/client";
import { verifyEmailOtp } from "@/lib/cloud-auth";
import { NotesEditor } from "@/components/witness/notes-editor";
import { FrameAnalysis } from "@/components/witness/frame-analysis";
import { CustodyLog } from "@/components/witness/custody-log";
import { recordCustodyAction } from "@/lib/witness-chain";
import { RECORDING_CATEGORIES } from "@/lib/witness-categories";
import { hapticVaultUnlock, hapticVaultLock } from "@/lib/haptics";
import { sanitizeText } from "@/lib/witness-sanitize";
import JSZip from "jszip";
import { buildCertificate } from "@/lib/witness-certificate";

export const Route = createFileRoute("/vault")({
  head: () => ({
    meta: [
      { title: "Vault — Witness R.E.P" },
      { name: "description", content: "Your encrypted recordings, PIN-protected." },
    ],
  }),
  component: VaultScreen,
});

function VaultScreen() {
  const [unlocked, setUnlocked] = useState(false);
  const [vaultType, setVaultType] = useState<"real" | "decoy" | null>(null);
  const hasPin = useMemo(() => !!getString(STORAGE_KEYS.pin), []);

  useSessionTimeout(() => {
    if (unlocked && hasPin) {
      setUnlocked(false);
      setVaultType(null);
      hapticVaultLock();
      announce("Vault locked due to inactivity");
      toast("Vault locked · 10 min inactivity", { description: "Enter your PIN to unlock again." });
    }
  });

  return (
    <main className="min-h-dvh">
      <ScreenHeader title="Vault" />
      {unlocked || !hasPin ? (
        <VaultShield>
          <VaultList
            onLock={() => {
              setUnlocked(false);
              setVaultType(null);
              hapticVaultLock();
              announce("Vault locked");
            }}
            hasPin={hasPin}
            vaultType={vaultType}
          />
        </VaultShield>
      ) : (
        <PinGate
          onUnlocked={(type) => {
            setUnlocked(true);
            setVaultType(type);
          }}
        />
      )}
    </main>
  );
}

/* ---------------- Vault blur on tab switch ---------------- */

function VaultShield({ children }: { children: React.ReactNode }) {
  const [blurred, setBlurred] = useState(false);

  useEffect(() => {
    const onHide = () => setBlurred(true);
    const onShow = () => setTimeout(() => setBlurred(false), 200);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) onHide();
      else onShow();
    });
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      document.removeEventListener("visibilitychange", onShow);
    };
  }, []);

  return (
    <div className="relative">
      <div
        className={`transition-all duration-300 ${blurred ? "blur-xl brightness-50 select-none" : "blur-0"}`}
        style={
          blurred
            ? ({ userSelect: "none", WebkitTouchCallout: "none" } as React.CSSProperties)
            : undefined
        }
      >
        {children}
      </div>
      {blurred && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 text-xs font-bold uppercase tracking-[0.15em] text-primary">
          Locked · Switch back to Witness R.E.P
        </div>
      )}
    </div>
  );
}

/* ---------------- PIN gate with dual vault + lockout + forgot PIN ---------------- */

function PinGate({ onUnlocked }: { onUnlocked: (vaultType: "real" | "decoy") => void }) {
  const [digits, setDigits] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotSending, setForgotSending] = useState(false);
  const [forgotToken, setForgotToken] = useState("");
  const [forgotVerifying, setForgotVerifying] = useState(false);
  const [forgotNewPin, setForgotNewPin] = useState("");
  const [forgotStep, setForgotStep] = useState<"email" | "token" | "newPin">("email");
  const [biometricAttempted, setBiometricAttempted] = useState(false);
  const { isLocked, remainingSeconds, recordFailedAttempt, resetAttempts, attemptsLeft } =
    usePinLockout();

  // Attempt biometric (WebAuthn) unlock if enrolled
  useEffect(() => {
    if (biometricAttempted || isLocked) return;
    const enrolled = localStorage.getItem("@Witness_biometricEnrolled");
    if (enrolled !== "1") {
      setBiometricAttempted(true);
      return;
    }
    void (async () => {
      try {
        const cred = await navigator.credentials.get({
          publicKey: {
            challenge: crypto.getRandomValues(new Uint8Array(32)),
            rpId: window.location.hostname,
            allowCredentials: [],
            userVerification: "required",
            timeout: 30000,
          },
        });
        if (cred) {
          resetAttempts();
          hapticVaultUnlock();
          onUnlocked("real");
          return;
        }
      } catch {
        // Biometric failed or user canceled — fall through to PIN
      }
      setBiometricAttempted(true);
    })();
    return () => {
      setBiometricAttempted(true);
    };
  }, [biometricAttempted, isLocked, onUnlocked, resetAttempts]);

  function press(d: string) {
    if (isLocked || digits.length >= 4) return;
    const next = digits + d;
    setDigits(next);
    setError(null);
    if (next.length === 4) {
      const result = tryUnlock(next);
      if (result) {
        resetAttempts();
        hapticVaultUnlock();
        announce("Vault unlocked");
        onUnlocked(result);
      } else {
        recordFailedAttempt();
        const stored = getString(STORAGE_KEYS.pin);
        if (!stored) {
          // No PIN set yet — allow any 4 digits as first PIN
          setRealPin(next);
          resetAttempts();
          hapticVaultUnlock();
          onUnlocked("real");
          return;
        }
        setError("Incorrect PIN");
        setTimeout(() => setDigits(""), 250);
      }
    }
  }

  function back() {
    setDigits((d) => d.slice(0, -1));
  }

  async function handleForgotSend() {
    if (!forgotEmail.trim()) return;
    setForgotSending(true);
    try {
      await sendEmailOtp(forgotEmail.trim(), { shouldCreateUser: false });
      setForgotSent(true);
      setForgotStep("token");
      toast.success("Verification code sent to your email");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send code");
    } finally {
      setForgotSending(false);
    }
  }

  async function handleForgotVerify() {
    if (!forgotToken.trim()) return;
    setForgotVerifying(true);
    try {
      await verifyEmailOtp(forgotEmail.trim(), forgotToken.trim());
      setForgotStep("newPin");
      toast.success("Identity verified");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Invalid code");
    } finally {
      setForgotVerifying(false);
    }
  }

  function handleForgotSetPin() {
    if (!/^\d{4}$/.test(forgotNewPin)) {
      setError("PIN must be 4 digits");
      return;
    }
    setRealPin(forgotNewPin);
    resetAttempts();
    setShowForgot(false);
    setForgotStep("email");
    setForgotEmail("");
    setForgotSent(false);
    setForgotToken("");
    setForgotNewPin("");
    toast.success(
      "PIN reset. Recordings encrypted with your old PIN won't be accessible — export them first if needed.",
    );
  }

  if (showForgot) {
    return (
      <section className="mx-auto flex max-w-sm flex-col items-center gap-5 px-6 py-10 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-2xl border border-border bg-card">
          <Mail className="h-7 w-7 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Forgot PIN</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Verify your email to reset your vault PIN.
          </p>
        </div>

        {forgotStep === "email" && (
          <>
            <input
              type="email"
              placeholder="Your email"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={handleForgotSend}
              disabled={forgotSending || !forgotEmail.trim()}
              className="h-11 w-full rounded-xl bg-primary text-sm font-bold uppercase tracking-wider text-primary-foreground transition active:scale-95 disabled:opacity-50"
            >
              {forgotSending ? "Sending…" : "Send code"}
            </button>
          </>
        )}

        {forgotStep === "token" && (
          <>
            <p className="text-xs text-muted-foreground">Enter the code sent to {forgotEmail}</p>
            <input
              type="text"
              placeholder="6-digit code"
              value={forgotToken}
              onChange={(e) => setForgotToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-center font-mono text-lg tracking-[0.4em] outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={handleForgotVerify}
              disabled={forgotVerifying || forgotToken.length !== 6}
              className="h-11 w-full rounded-xl bg-primary text-sm font-bold uppercase tracking-wider text-primary-foreground transition active:scale-95 disabled:opacity-50"
            >
              {forgotVerifying ? "Verifying…" : "Verify"}
            </button>
            <button
              type="button"
              onClick={handleForgotSend}
              disabled={forgotSending}
              className="text-xs font-semibold text-muted-foreground underline"
            >
              Re-send code
            </button>
          </>
        )}

        {forgotStep === "newPin" && (
          <>
            <p className="text-xs text-muted-foreground">Set a new 4-digit PIN for your vault</p>
            <input
              type="password"
              maxLength={4}
              placeholder="New PIN"
              value={forgotNewPin}
              onChange={(e) => setForgotNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-center font-mono text-xl tracking-[0.5em] outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={handleForgotSetPin}
              disabled={forgotNewPin.length !== 4}
              className="h-11 w-full rounded-xl bg-primary text-sm font-bold uppercase tracking-wider text-primary-foreground transition active:scale-95 disabled:opacity-50"
            >
              Set PIN
            </button>
          </>
        )}

        <button
          type="button"
          onClick={() => {
            setShowForgot(false);
            setForgotStep("email");
            setError(null);
          }}
          className="text-xs font-semibold text-muted-foreground"
        >
          ← Back to PIN entry
        </button>
      </section>
    );
  }

  return (
    <section className="mx-auto flex max-w-sm flex-col items-center gap-6 px-6 py-10 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-2xl border border-border bg-card">
        <Lock className="h-7 w-7 text-primary" />
      </div>
      <div>
        <h2 className="text-xl font-bold">Enter PIN</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {hasDecoyPin()
            ? "Enter your real or decoy PIN to unlock the vault."
            : "4-digit PIN protects your encrypted recordings."}
        </p>
      </div>

      {isLocked ? (
        <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wider text-primary">
            Too many attempts
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">Try again in {remainingSeconds}s</p>
        </div>
      ) : (
        <>
          <div className="flex gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`h-3.5 w-3.5 rounded-full border ${
                  i < digits.length ? "border-primary bg-primary" : "border-border"
                }`}
              />
            ))}
          </div>
          {error && <p className="text-xs text-primary">{error}</p>}
          {attemptsLeft < 5 && (
            <p className="text-[11px] text-muted-foreground">
              {attemptsLeft} attempt{attemptsLeft === 1 ? "" : "s"} remaining
            </p>
          )}

          <div className="grid w-full grid-cols-3 gap-3">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
              <PadKey key={d} label={d} onPress={() => press(d)} />
            ))}
            <div />
            <PadKey label="0" onPress={() => press("0")} />
            <button
              type="button"
              onClick={back}
              className="grid h-16 place-items-center rounded-2xl text-sm text-muted-foreground active:bg-card"
            >
              ⌫
            </button>
          </div>

          {getString(STORAGE_KEYS.pin) && (
            <button
              type="button"
              onClick={() => setShowForgot(true)}
              className="text-xs font-semibold text-muted-foreground underline"
            >
              Forgot PIN?
            </button>
          )}
        </>
      )}
    </section>
  );
}

function PadKey({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <button
      type="button"
      onClick={onPress}
      className="grid h-16 place-items-center rounded-2xl border border-border bg-card text-2xl font-semibold text-foreground active:scale-95"
    >
      {label}
    </button>
  );
}

/* ---------------- Vault list ---------------- */

function VaultList({
  onLock,
  hasPin,
  vaultType,
}: {
  onLock: () => void;
  hasPin: boolean;
  vaultType: "real" | "decoy" | null;
}) {
  const [items, setItems] = useState<RecordingMeta[] | null>(null);
  const [cloudOnly, setCloudOnly] = useState<CloudRecording[]>([]);
  const [recoveringId, setRecoveringId] = useState<string | null>(null);
  const { user } = useSession();
  const [playing, setPlaying] = useState<{ meta: RecordingMeta; url: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [publicFlags, setPublicFlags] = useState<Record<string, boolean>>({});
  const [view, setView] = useState<"list" | "timeline">(() => {
    if (typeof window === "undefined") return "list";
    return (window.localStorage.getItem("@Witness_vault_view") as "list" | "timeline") || "list";
  });

  function changeView(next: "list" | "timeline") {
    setView(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("@Witness_vault_view", next);
    }
  }

  // ── search, filter & sort ──
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">(() => {
    if (typeof window === "undefined") return "newest";
    return (localStorage.getItem("vault_sort_preference") as "oldest" | null) ?? "newest";
  });
  const [notesMeta, setNotesMeta] = useState<RecordingMeta | null>(null);
  const [frameUrl, setFrameUrl] = useState<{ meta: RecordingMeta; url: string } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);

  // ── bulk helpers ──
  function toggleSelect(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }
  function clearSelection() {
    setSelectedIds(new Set());
    setSelectionMode(false);
  }

  // ── filter & sort ──
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    if (items) items.forEach((m) => m.tags?.forEach((t) => tags.add(t)));
    return Array.from(tags).sort();
  }, [items]);
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = items ?? [];
    const term = search.toLowerCase();
    if (term) {
      list = list.filter(
        (m) =>
          (m.title ?? "").toLowerCase().includes(term) ||
          (m.description ?? "").toLowerCase().includes(term) ||
          (m.notes ?? "").toLowerCase().includes(term) ||
          (m.tags ?? []).some((t) => t.toLowerCase().includes(term)),
      );
    }
    if (categoryFilter !== "all") {
      list = list.filter((m) => m.category === categoryFilter);
    }
    if (activeTag) {
      list = list.filter((m) => (m.tags ?? []).includes(activeTag));
    }
    if (sortOrder === "newest") list.sort((a, b) => b.createdAt - a.createdAt);
    else list.sort((a, b) => a.createdAt - b.createdAt);
    return list;
  }, [items, search, categoryFilter, sortOrder, activeTag]);

  // ── total storage used ──
  const totalMB = useMemo(
    () => (items ?? []).reduce((s, m) => s + m.sizeBytes, 0) / 1_000_000,
    [items],
  );

  async function refresh() {
    const local = await listRecordings();
    setItems(local);
    if (user) {
      const cloud = await listCloudRecordings();
      const localIds = new Set(local.map((r) => r.id));
      setCloudOnly(cloud.filter((c) => !localIds.has(c.id) && c.s3Key));
      const flags = await getPublicFlags(local.map((r) => r.id));
      setPublicFlags(flags);
    } else {
      setCloudOnly([]);
      setPublicFlags({});
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    return () => {
      if (playing?.url) URL.revokeObjectURL(playing.url);
    };
  }, [playing]);

  async function handlePlay(meta: RecordingMeta) {
    setBusyId(meta.id);
    try {
      const pin = getString(STORAGE_KEYS.pin);
      const result = await getRecordingBlob(meta.id, pin);
      if (!result) return;
      const url = URL.createObjectURL(result.blob);
      setPlaying({ meta, url });
      recordCustodyAction(meta.id, "viewed").catch(() => {});
    } finally {
      setBusyId(null);
    }
  }

  async function handleFrameAnalysis(meta: RecordingMeta) {
    setBusyId(meta.id);
    try {
      const pin = getString(STORAGE_KEYS.pin);
      const result = await getRecordingBlob(meta.id, pin);
      if (!result) return;
      const url = URL.createObjectURL(result.blob);
      setFrameUrl({ meta, url });
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(meta: RecordingMeta) {
    if (!confirm("Delete this recording? This cannot be undone.")) return;
    await deleteRecording(meta.id);
    await refresh();
  }

  async function handleRecover(rec: CloudRecording) {
    setRecoveringId(rec.id);
    try {
      await recoverRecordingFromS3(rec);
      toast.success("Recording restored to vault");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Recovery failed");
    } finally {
      setRecoveringId(null);
    }
  }

  function setupPin() {
    const pin = prompt("Set a 4-digit PIN to lock your vault:");
    if (!pin || !/^\d{4}$/.test(pin)) {
      alert("PIN must be exactly 4 digits.");
      return;
    }
    setRealPin(pin);
    alert("PIN set. Vault will require it next time.");
  }

  function renderCardBody(m: RecordingMeta) {
    return (
      <>
        {selectionMode && (
          <button
            type="button"
            onClick={() => toggleSelect(m.id)}
            className="absolute left-3 top-3 z-10 grid h-7 w-7 place-items-center rounded-lg bg-background/80 backdrop-blur"
          >
            {selectedIds.has(m.id) ? (
              <CheckSquare className="h-4 w-4 text-primary" />
            ) : (
              <Square className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        )}
        <div className="flex gap-3 p-3">
          <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-secondary">
            {m.thumbnailDataUrl ? (
              <img src={m.thumbnailDataUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center text-muted-foreground">
                <Play className="h-5 w-5" />
              </div>
            )}
            <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              {fmtDuration(m.durationMs)}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {m.title ? (
                <p className="truncate text-sm font-semibold text-foreground">{m.title}</p>
              ) : (
                <p className="truncate text-sm font-semibold">{fmtDate(m.createdAt)}</p>
              )}
              {m.category && (
                <span className="inline-flex items-center gap-0.5 rounded-full border border-border px-2 py-0.5 text-[9px] font-bold uppercase text-muted-foreground">
                  <Tag className="h-2.5 w-2.5" />
                  {m.category}
                </span>
              )}
            </div>
            {m.title && (
              <p className="truncate text-[11px] text-muted-foreground">{fmtDate(m.createdAt)}</p>
            )}
            {m.description && (
              <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground/90">
                {m.description}
              </p>
            )}
            {m.notes ? (
              <p className="mt-0.5 line-clamp-2 text-[11px] italic text-muted-foreground/80 border-l-2 border-primary/30 pl-2">
                "{m.notes}"
              </p>
            ) : m.description ? null : null}
            {m.tags && m.tags.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {m.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-secondary/50 px-1.5 py-0.5 text-[9px] font-bold text-primary"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                {m.encrypted ? (
                  <>
                    <Shield className="h-3 w-3 text-success" /> AES-256
                  </>
                ) : (
                  <>
                    <ShieldOff className="h-3 w-3" /> Plain
                  </>
                )}
              </span>
              <ContinuityBadge log={m.continuity} />
              {m.covert && (
                <span className="rounded-full bg-foreground/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase">
                  Covert
                </span>
              )}
              {m.gps ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-primary" />
                  {m.gps.latitude.toFixed(4)}, {m.gps.longitude.toFixed(4)}
                </span>
              ) : (
                <span className="text-muted-foreground/70">No GPS</span>
              )}
            </div>
            <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground/80">
              SHA-256 {m.sha256.slice(0, 12)}…{m.sha256.slice(-6)}
            </p>
          </div>
        </div>
        <div className="flex border-t border-border text-xs">
          <ActionBtn
            onClick={() => handlePlay(m)}
            disabled={busyId === m.id}
            icon={<Play className="h-4 w-4" />}
            label="Play"
          />
          <ExportMenu
            meta={m}
            onBusy={(b) => setBusyId(b ? m.id : null)}
            onFrameAnalysis={(meta) => handleFrameAnalysis(meta)}
          />
          <ActionBtn
            onClick={() => setNotesMeta(m)}
            icon={<FilePen className="h-4 w-4" />}
            label="Notes"
          />
          <ActionBtn
            onClick={() => handleDelete(m)}
            icon={<Trash2 className="h-4 w-4" />}
            label="Delete"
            destructive
          />
        </div>
        <UploadRow id={m.id} />
        <PublishRow
          id={m.id}
          hasGps={!!m.gps}
          signedIn={!!user}
          isPublic={!!publicFlags[m.id]}
          onChange={(next) => setPublicFlags((prev) => ({ ...prev, [m.id]: next }))}
        />
      </>
    );
  }

  return (
    <section className="mx-auto max-w-md px-4 py-4">
      {/* Storage bar */}
      {totalMB > 0 && (
        <div className="mb-3 rounded-xl bg-card p-3 border border-border">
          <div className="mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
            <span className="text-muted-foreground">Vault Used</span>
            <span className="text-foreground">{totalMB.toFixed(1)} MB</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full bg-primary transition-all shadow-[0_0_6px_rgba(232,0,28,0.3)]"
              style={{ width: `${Math.min(100, (totalMB / 1024) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Search & filter bar */}
      <div className="mb-3 space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search notes, titles, tags…"
            value={search}
            onChange={(e) => setSearch(sanitizeText(e.target.value, 200))}
            className="w-full rounded-xl border border-input bg-background py-2.5 pl-10 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-[10px] font-bold uppercase outline-none focus:border-primary"
          >
            <option value="all">All Categories</option>
            {RECORDING_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              const next = sortOrder === "newest" ? "oldest" : "newest";
              setSortOrder(next);
              localStorage.setItem("vault_sort_preference", next);
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-input px-2.5 py-1.5 text-[10px] font-bold uppercase text-muted-foreground hover:text-foreground"
          >
            <ArrowUpDown className="h-3 w-3" />
            {sortOrder === "newest" ? "Newest" : "Oldest"}
          </button>
          {items && items.length > 0 && (
            <button
              onClick={() => setSelectionMode(!selectionMode)}
              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[10px] font-bold uppercase ${selectionMode ? "border-primary bg-primary text-primary-foreground" : "border-input text-muted-foreground hover:text-foreground"}`}
            >
              {selectionMode ? "Cancel" : "Select"}
              {selectedIds.size > 0 && ` (${selectedIds.size})`}
            </button>
          )}
        </div>
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {allTags.map((t) => (
              <button
                key={t}
                onClick={() => setActiveTag(activeTag === t ? null : t)}
                className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase transition-all ${activeTag === t ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
              >
                #{t}
              </button>
            ))}
          </div>
        )}
        {selectionMode && selectedIds.size > 0 && (
          <button
            onClick={async () => {
              if (
                !confirm(
                  `PERMANENTLY DELETE ${selectedIds.size} recording(s)? This cannot be undone.`,
                )
              )
                return;
              for (const id of selectedIds) await deleteRecording(id);
              clearSelection();
              await refresh();
              toast.success(`${selectedIds.size} recording(s) deleted`);
            }}
            className="w-full rounded-xl bg-destructive/10 border border-destructive/30 py-2 text-[10px] font-bold uppercase text-destructive hover:bg-destructive hover:text-destructive-foreground"
          >
            <Trash2 className="mr-1 inline h-3.5 w-3.5" />
            Delete {selectedIds.size} Recording(s)
          </button>
        )}
      </div>

      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {vaultType === "decoy" ? (
            <span className="text-primary">Decoy vault</span>
          ) : (
            <>
              {filtered.length} recording{filtered.length === 1 ? "" : "s"}
            </>
          )}
        </p>
        <div className="flex items-center gap-2">
          {hasPin && (
            <>
              {!hasDecoyPin() && (
                <button
                  type="button"
                  onClick={() => {
                    const dpin = prompt("Set a decoy PIN (different from your real PIN):");
                    if (!dpin || !/^\d{4}$/.test(dpin)) {
                      alert("PIN must be exactly 4 digits.");
                      return;
                    }
                    if (dpin === getRealPin()) {
                      alert("Decoy PIN must be different from your real PIN.");
                      return;
                    }
                    setDecoyPin(dpin);
                    toast.success("Decoy PIN set. Use it to open a harmless vault.");
                  }}
                  className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  <KeyRound className="mr-1 inline h-3 w-3" />
                  Decoy
                </button>
              )}
              <button
                type="button"
                onClick={onLock}
                className="text-xs font-semibold uppercase tracking-wider text-primary"
              >
                Lock
              </button>
            </>
          )}
          {!hasPin && (
            <button
              type="button"
              onClick={setupPin}
              className="text-xs font-semibold uppercase tracking-wider text-primary"
            >
              Set PIN
            </button>
          )}
        </div>
      </div>

      <div
        role="tablist"
        aria-label="Vault view"
        className="mb-4 inline-flex rounded-xl border border-border bg-card p-0.5 text-xs font-semibold"
      >
        <button
          role="tab"
          aria-selected={view === "list"}
          onClick={() => changeView("list")}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors ${view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          <List className="h-3.5 w-3.5" /> List
        </button>
        <button
          role="tab"
          aria-selected={view === "timeline"}
          onClick={() => changeView("timeline")}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors ${view === "timeline" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          <CalendarDays className="h-3.5 w-3.5" /> Timeline
        </button>
      </div>

      {items === null ? (
        <p className="py-12 text-center text-sm text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        items.length === 0 ? (
          cloudOnly.length === 0 ? (
            <EmptyState />
          ) : null
        ) : (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No recordings match your search.
          </p>
        )
      ) : view === "timeline" ? (
        <div className="flex flex-col gap-5">
          {groupByDay(filtered).map((group) => (
            <section key={group.key}>
              <div className="sticky top-0 z-10 -mx-4 mb-2 border-b border-border/60 bg-background/85 px-4 py-1.5 backdrop-blur">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {group.label}
                  <span className="ml-2 text-muted-foreground/60">· {group.items.length}</span>
                </h3>
              </div>
              <ul className="relative flex flex-col gap-3 border-l border-border/60 pl-4">
                {group.items.map((m) => (
                  <li
                    key={m.id}
                    className="relative overflow-hidden rounded-2xl border border-border bg-card"
                  >
                    <span className="absolute -left-[1.18rem] top-5 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
                    {renderCardBody(m)}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((m) => (
            <li
              key={m.id}
              className="relative overflow-hidden rounded-2xl border border-border bg-card"
            >
              {renderCardBody(m)}
            </li>
          ))}
        </ul>
      )}

      {cloudOnly.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            On your account · {cloudOnly.length} backed-up recording
            {cloudOnly.length === 1 ? "" : "s"}
          </p>
          <ul className="flex flex-col gap-2">
            {cloudOnly.map((c) => (
              <li
                key={c.id}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
              >
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-secondary">
                  <Cloud className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{fmtDate(c.createdAt)}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {fmtDuration(c.durationMs)} · {c.encrypted ? "AES-256" : "Plain"} ·{" "}
                    {(Number(c.sizeBytes) / 1_000_000).toFixed(1)} MB
                  </p>
                </div>
                <button
                  type="button"
                  disabled={recoveringId === c.id}
                  onClick={() => handleRecover(c)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-primary-foreground disabled:opacity-60"
                >
                  {recoveringId === c.id ? (
                    <RotateCw className="h-3 w-3 animate-spin" />
                  ) : (
                    <CloudDownload className="h-3 w-3" />
                  )}
                  {recoveringId === c.id ? "…" : "Restore"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {playing && <PlayModal playing={playing} onClose={() => setPlaying(null)} />}

      {notesMeta && (
        <NotesEditor
          meta={notesMeta}
          onClose={() => setNotesMeta(null)}
          onSaved={(updated) => {
            refresh();
          }}
        />
      )}

      {frameUrl && (
        <FrameAnalysis
          videoUrl={frameUrl.url}
          recordingId={frameUrl.meta.id}
          durationMs={frameUrl.meta.durationMs}
          fps={30}
          onClose={() => {
            URL.revokeObjectURL(frameUrl.url);
            setFrameUrl(null);
          }}
        />
      )}

      {items && items.length > 0 && (
        <div className="mt-6 space-y-6">
          {items.slice(0, 3).map((m) => (
            <CustodyLog key={m.id} recordingId={m.id} />
          ))}
        </div>
      )}
    </section>
  );
}

function PlayModal({
  playing,
  onClose,
}: {
  playing: { meta: RecordingMeta; url: string };
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center gap-3 overflow-y-auto bg-black/90 p-4">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-card text-foreground"
      >
        <X className="h-5 w-5" />
      </button>
      <video
        ref={videoRef}
        src={playing.url}
        controls
        autoPlay
        playsInline
        className="max-h-[60vh] w-full max-w-md rounded-xl bg-black"
      />
      {playing.meta.gpsTrack && playing.meta.gpsTrack.length > 0 && (
        <div className="w-full max-w-md">
          <GpsTrackViewer
            recordingId={playing.meta.id}
            track={playing.meta.gpsTrack}
            startedAt={playing.meta.createdAt}
            videoRef={videoRef}
          />
        </div>
      )}
    </div>
  );
}

function ActionBtn({
  onClick,
  icon,
  label,
  destructive,
  disabled,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  destructive?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-1 items-center justify-center gap-1.5 py-3 font-semibold uppercase tracking-wider transition active:bg-secondary ${
        destructive ? "text-primary" : "text-foreground"
      } disabled:opacity-50`}
    >
      {icon}
      {label}
    </button>
  );
}

function ExportMenu({
  meta,
  onBusy,
  onFrameAnalysis,
}: {
  meta: RecordingMeta;
  onBusy: (busy: boolean) => void;
  onFrameAnalysis?: (meta: RecordingMeta) => void;
}) {
  async function run(label: string, fn: () => Promise<void> | void) {
    onBusy(true);
    try {
      await fn();
      toast.success(`${label} downloaded`);
    } catch (e) {
      console.error(e);
      toast.error(`${label} failed`);
    } finally {
      onBusy(false);
    }
  }

  async function handleBundle() {
    onBusy(true);
    try {
      const pin = getString(STORAGE_KEYS.pin);
      const result = await getRecordingBlob(meta.id, pin);
      if (!result) throw new Error("Recording not found");
      const zip = new JSZip();
      const safeName = (meta.title ?? "recording").replace(/[^a-z0-9]/gi, "_");
      zip.file(`${safeName}.${result.meta.mimeType.includes("mp4") ? "mp4" : "webm"}`, result.blob);
      const certDoc = await buildCertificate(meta);
      zip.file("certificate.pdf", certDoc.output("arraybuffer"));
      zip.file(
        "coverLetter.txt",
        `Witness R.E.P Evidence Package\nRecording: ${meta.title ?? "Untitled"}\nSHA-256: ${meta.sha256}\nDate: ${new Date(meta.createdAt).toISOString()}\nGenerated: ${new Date().toISOString()}`,
      );
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Witness_Evidence_${safeName}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      recordCustodyAction(meta.id, "exported").catch(() => {});
      toast.success("Evidence package downloaded");
    } catch (e) {
      console.error(e);
      toast.error("Bundle failed");
    } finally {
      onBusy(false);
    }
  }

  async function handleWatermark() {
    onBusy(true);
    try {
      const pin = getString(STORAGE_KEYS.pin);
      const result = await getRecordingBlob(meta.id, pin);
      if (!result) throw new Error("Recording not found");
      const video = document.createElement("video");
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas unavailable");
      const url = URL.createObjectURL(result.blob);
      await new Promise<void>((resolve, reject) => {
        video.src = url;
        video.onloadeddata = () => {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          ctx.font = "20px monospace";
          ctx.fillStyle = "#E8001C";
          ctx.shadowColor = "black";
          ctx.shadowBlur = 4;
          ctx.fillText(
            `WITNESS • ${new Date(meta.createdAt).toISOString()}`,
            canvas.width - 320,
            canvas.height - 30,
          );
          canvas.toBlob((blob) => {
            if (blob) {
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = `Witness_Watermark_${meta.id.slice(0, 8)}.jpg`;
              a.click();
              resolve();
            } else {
              reject(new Error("Canvas blob error"));
            }
            URL.revokeObjectURL(url);
          }, "image/jpeg");
        };
        video.onerror = () => reject(new Error("Video load error"));
      });
      recordCustodyAction(meta.id, "exported").catch(() => {});
      toast.success("Watermarked frame downloaded");
    } catch (e) {
      console.error(e);
      toast.error("Watermark failed");
    } finally {
      onBusy(false);
    }
  }

  function handleFrameAnalysis() {
    if (onFrameAnalysis) onFrameAnalysis(meta);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-semibold uppercase tracking-wider text-foreground transition active:bg-secondary"
        >
          <Download className="h-4 w-4" />
          Export
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-64">
        <DropdownMenuLabel>Export recording</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            recordCustodyAction(meta.id, "exported").catch(() => {});
            run("Media", () => exportDecrypted(meta));
          }}
        >
          <FileVideo className="mr-2 h-4 w-4" />
          Media file (decrypted)
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            recordCustodyAction(meta.id, "exported").catch(() => {});
            run("Encrypted media", () => exportEncrypted(meta));
          }}
          disabled={!meta.encrypted}
        >
          <FileLock2 className="mr-2 h-4 w-4" />
          Encrypted media (.witness.json)
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            recordCustodyAction(meta.id, "certificate_generated").catch(() => {});
            run("Certificate", () => exportCertificate(meta));
          }}
        >
          <FileText className="mr-2 h-4 w-4" />
          Certificate (PDF)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            recordCustodyAction(meta.id, "exported").catch(() => {});
            run("Bundle", () => exportBundle(meta));
          }}
        >
          <Package className="mr-2 h-4 w-4" />
          Full bundle (all of the above)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleBundle}>
          <Layers className="mr-2 h-4 w-4" />
          Evidence package (ZIP)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleWatermark}>
          <Film className="mr-2 h-4 w-4" />
          Watermarked frame (JPEG)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleFrameAnalysis}>
          <Film className="mr-2 h-4 w-4" />
          Frame analysis…
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function EmptyState() {
  return EmptyStateImpl();
}

function UploadRow({ id }: { id: string }) {
  const state = useUploadState(id);
  const pct = Math.round(state.progress * 100);
  async function start() {
    try {
      await uploadRecording(id);
      toast.success("Uploaded to S3");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    }
  }
  let icon: React.ReactNode = <CloudUpload className="h-3.5 w-3.5" />;
  let label = "Upload to S3";
  let tone = "text-muted-foreground";
  if (state.status === "queued") {
    icon = <Cloud className="h-3.5 w-3.5 animate-pulse" />;
    label = "Queued…";
    tone = "text-muted-foreground";
  } else if (state.status === "uploading") {
    icon = <CloudUpload className="h-3.5 w-3.5 animate-pulse" />;
    label = `Uploading ${pct}%`;
    tone = "text-primary";
  } else if (state.status === "done") {
    icon = <CheckCircle2 className="h-3.5 w-3.5 text-success" />;
    label = "Backed up";
    tone = "text-success";
  } else if (state.status === "error") {
    icon = <AlertCircle className="h-3.5 w-3.5 text-primary" />;
    label = state.error ? `Failed: ${state.error.slice(0, 40)}` : "Upload failed";
    tone = "text-primary";
  } else if (state.status === "waiting-wifi") {
    icon = <Wifi className="h-3.5 w-3.5" />;
    label = "Queued · waiting for WiFi";
    tone = "text-muted-foreground";
  } else {
    icon = <CloudOff className="h-3.5 w-3.5" />;
  }

  return (
    <div className="border-t border-border px-3 py-2">
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className={`inline-flex items-center gap-1.5 ${tone}`}>
          {icon}
          {label}
        </span>
        {state.status === "done" ? (
          <button
            type="button"
            onClick={() => resetUpload(id)}
            className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
          >
            <RotateCw className="h-3 w-3" />
            Reset
          </button>
        ) : state.status === "uploading" || state.status === "queued" ? null : (
          <button
            type="button"
            onClick={start}
            className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-primary"
          >
            {state.status === "error" ? "Retry" : "Upload"}
          </button>
        )}
      </div>
      {(state.status === "uploading" || state.status === "queued") && (
        <div className="mt-1.5 h-1 overflow-hidden rounded bg-secondary">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${Math.max(4, pct)}%` }}
          />
        </div>
      )}
    </div>
  );
}

function EmptyStateImpl() {
  return (
    <div className="mx-auto mt-10 max-w-xs rounded-2xl border border-border bg-card p-6 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-secondary">
        <Lock className="h-5 w-5 text-primary" />
      </div>
      <p className="mt-3 text-sm font-semibold">Vault is empty</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Recordings you make will be encrypted and stored here.
      </p>
    </div>
  );
}

function PublishRow({
  id,
  hasGps,
  signedIn,
  isPublic,
  onChange,
}: {
  id: string;
  hasGps: boolean;
  signedIn: boolean;
  isPublic: boolean;
  onChange: (next: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (!signedIn) {
      toast.error("Sign in to publish to the public map");
      return;
    }
    if (!hasGps) {
      toast.error("This recording has no GPS — it can't be placed on the map");
      return;
    }
    const next = !isPublic;
    setBusy(true);
    try {
      await setRecordingPublic(id, next);
      onChange(next);
      toast.success(next ? "Published to public map" : "Removed from public map");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2 text-[11px]">
      <span
        className={`inline-flex items-center gap-1.5 ${isPublic ? "text-success" : "text-muted-foreground"}`}
      >
        {isPublic ? <Globe2 className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        {isPublic ? "On public map (24h)" : "Private"}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={isPublic}
        aria-label="Publish to public map"
        disabled={busy || !signedIn || !hasGps}
        onClick={toggle}
        className={`relative h-5 w-9 shrink-0 rounded-full border transition disabled:opacity-50 ${
          isPublic ? "border-success bg-success" : "border-border bg-secondary"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-background shadow transition ${
            isPublic ? "left-[1.125rem]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}

function fmtDate(ms: number) {
  return new Date(ms).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
function fmtDuration(ms: number) {
  const s = Math.round(ms / 1000);
  const mm = Math.floor(s / 60)
    .toString()
    .padStart(2, "0");
  const ss = (s % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
}

interface DayGroup {
  key: string;
  label: string;
  items: RecordingMeta[];
}

function groupByDay(items: RecordingMeta[]): DayGroup[] {
  const today = startOfDay(Date.now());
  const yesterday = today - 86_400_000;
  const groups = new Map<string, RecordingMeta[]>();
  for (const m of items) {
    const day = startOfDay(m.createdAt);
    const key = String(day);
    const arr = groups.get(key);
    if (arr) arr.push(m);
    else groups.set(key, [m]);
  }
  return Array.from(groups.entries())
    .sort((a, b) => Number(b[0]) - Number(a[0]))
    .map(([key, list]) => {
      const day = Number(key);
      let label: string;
      if (day === today) label = "Today";
      else if (day === yesterday) label = "Yesterday";
      else
        label = new Date(day).toLocaleDateString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: new Date(day).getFullYear() === new Date().getFullYear() ? undefined : "numeric",
        });
      return { key, label, items: list };
    });
}

function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
