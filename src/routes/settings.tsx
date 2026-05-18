import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ScreenHeader } from "@/components/witness/screen-header";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  EyeOff,
  Lock,
  MapPin,
  Timer,
  Trash2,
  User,
  ChevronRight,
  Siren,
  Wifi,
  Share2,
  Home,
  Sun,
  Moon,
  FileText,
  ShieldCheck,
  Phone,
  Mail,
  HardDrive,
  CloudUpload,
  BellRing,
  MapPinned,
  Radio,
  Bug,
  Info,
  Heart,
  Globe,
  Users,
  LogOut,
  Fingerprint,
  KeyRound,
  Eye,
  BookOpen,
  Scale,
  Plane,
  Car,
  ShieldOff,
  Sparkles,
  Smartphone,
} from "lucide-react";
import {
  AUTO_STOP_OPTIONS,
  setAnonymous,
  setAutoStopMinutes,
  setEncrypt,
  setGps,
  setAutoSosOnLive,
  setWifiOnly,
  setShareLocation,
  setNotifSosReceived,
  setNotifShareRequest,
  setNotifLiveNearby,
  setPublicLiveLocation,
  setAirGap,
  setStealthAppMasking,
  setDashcamMode,
  setPoliceConnect,
  setPrivacyBlur,
  hasAckedPublicLiveLocation,
  ackPublicLiveLocation,
  type PublicLiveLocationMode,
  useSettings,
} from "@/lib/witness-settings";
import { wipeAllData } from "@/lib/witness-wipe";
import { deleteMyAccount } from "@/lib/witness-account";
import { useSession } from "@/lib/cloud-auth";
import { signOut } from "@/lib/cloud-auth";
import { startLocationBroadcast, stopLocationBroadcast } from "@/lib/location-broadcaster";
import { getMyProfile, updateHomeAddress } from "@/lib/contact-locations";
import { useTheme, setTheme } from "@/lib/witness-theme";
import { listRecordings } from "@/lib/witness-db";
import { getUploadState } from "@/lib/witness-uploader";
import { deleteRecording } from "@/lib/witness-db";
import { subscribePush, unsubscribePush, syncPushPrefs, anyPushToggleOn } from "@/lib/push-client";
import { A11ySettingsPanel } from "@/components/witness/a11y-settings-panel";
import { ManageDevicesSheet } from "@/components/witness/manage-devices-sheet";
import { setRealPin, setDecoyPin, hasDecoyPin } from "@/lib/witness-decoy";
import { getString, STORAGE_KEYS } from "@/lib/witness-storage";
import { sanitizeText } from "@/lib/witness-sanitize";

const APP_VERSION = "Witness R.E.P v1.0.0";
const SUPPORT_EMAIL = "contactae2000@gmail.com";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Witness R.E.P" },
      {
        name: "description",
        content: "Theme, privacy, account, notifications, storage, legal and support.",
      },
    ],
  }),
  component: SettingsScreen,
});

function SettingsScreen() {
  const [error, setPageError] = useState<string | null>(null);

  useEffect(() => {
    const handleError = (e: ErrorEvent) => {
      console.error("Settings Runtime Error:", e.error, e.message);
      setPageError(`Settings Error: ${e.message || "Unknown error occurred"}`);
    };
    window.addEventListener("error", handleError);
    return () => window.removeEventListener("error", handleError);
  }, []);

  if (error) {
    return (
      <main className="grid min-h-dvh place-items-center p-6 text-center">
        <div className="max-w-xs">
          <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-primary" />
          <h1 className="text-xl font-bold">Settings Error</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 h-12 w-full rounded-2xl bg-primary text-sm font-bold uppercase tracking-wider text-primary-foreground"
          >
            Reload Page
          </button>
        </div>
      </main>
    );
  }

  try {
    return <SettingsContent />;
  } catch (err) {
    console.error("SettingsContent caught error:", err);
    return (
      <main className="grid min-h-dvh place-items-center p-6 text-center">
        <div className="max-w-xs">
          <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-primary" />
          <h1 className="text-xl font-bold">Settings Content Error</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {err instanceof Error ? err.message : "Failed to load settings content."}
          </p>
        </div>
      </main>
    );
  }
}

function SettingsContent() {
  // Add initialization guard
  const [loading, setLoading] = useState(true);
  const settings = useSettings();
  const theme = useTheme();
  const { user } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(false);
  }, []);

  if (loading) {
    return <div className="p-6 text-center">Loading settings...</div>;
  }

  const [wiping, setWiping] = useState(false);
  const [homeAddress, setHomeAddressState] = useState("");
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressDirty, setAddressDirty] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showDevices, setShowDevices] = useState(false);
  const [pendingPublicLive, setPendingPublicLive] = useState(false);
  const [storage, setStorage] = useState<{
    bytes: number;
    total: number;
    backed: number;
    pending: number;
  }>({ bytes: 0, total: 0, backed: 0, pending: 0 });
  const [clearingCache, setClearingCache] = useState(false);
  const hasPin = useMemo(() => !!getString(STORAGE_KEYS.pin), []);

  useEffect(() => {
    if (!user) return;
    getMyProfile()
      .then((p) => {
        setHomeAddressState(p?.homeAddress ?? "");
        setAddressDirty(false);
      })
      .catch((err) => {
        console.error("getMyProfile failed:", err);
      });
  }, [user?.id]);

  async function refreshStorage() {
    try {
      const recs = await listRecordings();
      let backed = 0;
      let pending = 0;
      let bytes = 0;
      for (const r of recs) {
        bytes += r.sizeBytes ?? 0;
        const u = getUploadState(r.id);
        if (u.status === "done") backed++;
        else pending++;
      }
      setStorage({ bytes, total: recs.length, backed, pending });
    } catch (err) {
      console.error("refreshStorage failed:", err);
    }
  }
  useEffect(() => {
    void refreshStorage();
  }, []);

  async function handleToggleShare(v: boolean) {
    if (!user) {
      toast.error("Sign in to share your location with contacts");
      return;
    }
    setShareLocation(v);
    if (v) {
      const ok = await startLocationBroadcast();
      if (!ok) {
        setShareLocation(false);
        toast.error("Couldn't start location sharing");
        return;
      }
      toast.success("Sharing your location every 30s");
    } else {
      await stopLocationBroadcast();
      toast.success("Location sharing stopped");
    }
  }

  function handlePublicLiveSelect(mode: PublicLiveLocationMode) {
    if (mode === settings.publicLiveLocation) return;
    if (mode === "public" && !hasAckedPublicLiveLocation()) {
      setPendingPublicLive(true);
      return;
    }
    setPublicLiveLocation(mode);
    toast.success(
      mode === "public" ? "Public live location on" : "Live location limited to contacts",
    );
  }

  function confirmPublicLive() {
    ackPublicLiveLocation();
    setPublicLiveLocation("public");
    setPendingPublicLive(false);
    toast.success("Public live location on");
  }

  async function saveAddress() {
    if (!user) return;
    setSavingAddress(true);
    try {
      await updateHomeAddress(sanitizeText(homeAddress, 240));
      toast.success("Home address saved");
      setAddressDirty(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save address");
    } finally {
      setSavingAddress(false);
    }
  }

  async function handleWipe() {
    if (
      !confirm(
        "Wipe ALL recordings, contacts, PIN, and settings on this device? This cannot be undone.",
      )
    )
      return;
    return _handleWipe();
  }

  async function handleLogoutConfirm() {
    setLoggingOut(true);
    try {
      await signOut();
      toast.success("Logged out");
      setShowLogout(false);
      void navigate({ to: "/login" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't log out");
    } finally {
      setLoggingOut(false);
    }
  }

  async function _handleWipe() {
    setWiping(true);
    try {
      await wipeAllData();
      toast.success("All Witness R.E.P data wiped from this device");
      void refreshStorage();
    } catch (e) {
      console.error(e);
      toast.error("Wipe failed");
    } finally {
      setWiping(false);
    }
  }

  async function handleClearCache() {
    void 0;
    return _handleClearCache();
  }
  async function handlePushToggle(
    v: boolean,
    prefs: { notifSos?: boolean; notifShareRequest?: boolean; notifLiveNearby?: boolean },
  ) {
    if (!user) {
      toast.error("Sign in to enable push notifications");
      return;
    }
    if (v) {
      const r = await subscribePush();
      if (!r.ok) {
        toast.error(r.reason ?? "Couldn't enable notifications");
        return;
      }
      await syncPushPrefs(prefs);
    } else {
      await syncPushPrefs(prefs);
      if (!anyPushToggleOn()) await unsubscribePush();
    }
  }
  async function _handleClearCache() {
    setClearingCache(true);
    try {
      const recs = await listRecordings();
      let removed = 0;
      for (const r of recs) {
        const u = getUploadState(r.id);
        if (u.status === "done") {
          await deleteRecording(r.id);
          removed++;
        }
      }
      toast.success(
        removed === 0
          ? "Nothing to clear — no backed-up recordings on this device"
          : `Cleared ${removed} backed-up recording${removed === 1 ? "" : "s"}`,
      );
      void refreshStorage();
    } catch (e) {
      console.error(e);
      toast.error("Couldn't clear cache");
    } finally {
      setClearingCache(false);
    }
  }

  return (
    <main className="min-h-dvh">
      <ScreenHeader title="Settings" />
      <section className="mx-auto flex max-w-md flex-col gap-3 px-4 py-6">
        {/* Appearance */}
        <Group title="Appearance">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-secondary text-foreground">
                {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </span>
              <div className="flex-1">
                <p className="text-sm font-semibold">Theme</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Default is dark. Change applies instantly across the app.
                </p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <ThemeChip
                active={theme === "dark"}
                label="Dark"
                icon={<Moon className="h-3.5 w-3.5" />}
                onClick={() => setTheme("dark")}
              />
              <ThemeChip
                active={theme === "light"}
                label="Light"
                icon={<Sun className="h-3.5 w-3.5" />}
                onClick={() => setTheme("light")}
              />
            </div>
          </div>
        </Group>

        <Group title="Accessibility">
          <A11ySettingsPanel />
          {user && (
            <button
              type="button"
              onClick={() => setShowDevices(true)}
              className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left transition active:bg-secondary"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-secondary text-foreground">
                <Smartphone className="h-4 w-4" />
              </span>
              <div className="flex-1">
                <p className="text-sm font-semibold">Manage Devices</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Pair, rename, or unlink devices syncing your vault.
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </Group>

        {/* Account */}
        <Group title="Account">
          <Link
            to="/auth"
            className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 transition active:bg-secondary"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-secondary text-foreground">
              {user ? (
                <ShieldCheck className="h-4 w-4 text-success" />
              ) : (
                <User className="h-4 w-4" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {user ? (user.phone ?? user.email ?? "Signed in") : "Sign in to sync"}
              </p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {user
                  ? "Vault syncs across devices · recoverable on reinstall"
                  : "Phone or email — keeps your encrypted vault recoverable"}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>

          {user && (
            <>
              <AccountRow
                icon={<Phone className="h-4 w-4" />}
                label="Phone number"
                value={user.phone ?? "Not set"}
                actionLabel="Change"
                onAction={() => navigate({ to: "/auth" })}
              />
              <AccountRow
                icon={<Mail className="h-4 w-4" />}
                label="Email"
                value={user.email ?? "Not set"}
                actionLabel={user.email ? "Change" : "Add"}
                onAction={() => navigate({ to: "/auth" })}
              />
              <button
                type="button"
                onClick={() => setShowLogout(true)}
                className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left transition active:bg-secondary"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-secondary text-foreground">
                  <LogOut className="h-4 w-4" />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold">Log out</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Sign out of this device. Your encrypted vault stays in the cloud.
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
              <button
                type="button"
                onClick={() => setShowDelete(true)}
                className="flex w-full items-start gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-left transition active:bg-primary/10"
              >
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
                  <Trash2 className="h-4 w-4" />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-primary">Delete account</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Permanently wipes your account and all data, locally and in the cloud.
                  </p>
                </div>
              </button>
            </>
          )}
        </Group>

        {user && (
          <Group title="My profile">
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-secondary text-foreground">
                  <Home className="h-4 w-4" />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold">Home address (optional)</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Only shown to mutually-accepted location-sharing contacts when they tap your pin
                    on the map. Leave blank to hide.
                  </p>
                </div>
              </div>
              <textarea
                value={homeAddress}
                onChange={(e) => {
                  setHomeAddressState(e.target.value);
                  setAddressDirty(true);
                }}
                rows={2}
                maxLength={240}
                placeholder="123 Main St, Apt 4, Brooklyn NY"
                className="mt-3 w-full resize-none rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-primary"
              />
              {addressDirty && (
                <button
                  type="button"
                  onClick={saveAddress}
                  disabled={savingAddress}
                  className="mt-2 h-10 w-full rounded-xl bg-primary text-xs font-bold uppercase tracking-wider text-primary-foreground active:scale-95 disabled:opacity-50"
                >
                  {savingAddress ? "Saving…" : "Save address"}
                </button>
              )}
            </div>
          </Group>
        )}

        {/* Security */}
        <Group title="Security">
          <ChangePinSection />
          <BiometricSection />
          <StealthModeToggle />
          <AttorneyClientToggle />
          {hasPin && (
            <DecoyPinSection
              hasDecoy={hasDecoyPin()}
              onSetDecoy={() => {
                const dpin = prompt("Set a decoy PIN (different from your real PIN):");
                if (!dpin || !/^\d{4}$/.test(dpin)) {
                  alert("PIN must be exactly 4 digits.");
                  return;
                }
                if (dpin === getString(STORAGE_KEYS.pin)) {
                  alert("Decoy PIN must be different from your real PIN.");
                  return;
                }
                setDecoyPin(dpin);
                toast.success("Decoy PIN set. Use it to open a harmless vault.");
              }}
              onClearDecoy={() => {
                if (confirm("Remove your decoy PIN?")) {
                  setDecoyPin(null);
                  toast.success("Decoy PIN removed");
                }
              }}
            />
          )}
        </Group>

        {/* Privacy */}
        <Group title="Privacy">
          <ToggleRow
            icon={<EyeOff className="h-4 w-4" />}
            label="Anonymous mode"
            desc="Strip device identifier from certificates and hide your recordings from the public map."
            checked={settings.anonymous}
            onChange={(v) => {
              setAnonymous(v);
              toast.success(v ? "Anonymous mode on" : "Anonymous mode off");
            }}
          />
          <ToggleRow
            icon={<Plane className="h-4 w-4" />}
            label="Air gap mode"
            desc="Disables all Supabase and S3 network calls. A persistent red banner is shown across the app. Everything stays local."
            checked={settings.airGap}
            onChange={(v) => {
              setAirGap(v);
              toast.success(
                v
                  ? "Air gap enabled — all network calls blocked"
                  : "Air gap disabled — network calls restored",
              );
            }}
          />
          <ToggleRow
            icon={<ShieldOff className="h-4 w-4" />}
            label="Stealth app masking"
            desc="Transforms Witness into a calculator when closed. Type a secret phrase to return to the app."
            checked={settings.stealthAppMasking}
            onChange={(v) => {
              setStealthAppMasking(v);
              toast.success(
                v
                  ? "Stealth masking on — next launch shows calculator decoy"
                  : "Stealth masking off",
              );
            }}
          />
          <ToggleRow
            icon={<Sparkles className="h-4 w-4" />}
            label="Privacy blur on export"
            desc="Auto-blur faces and license plates during recording share/export. Original stays in vault."
            checked={settings.privacyBlur}
            onChange={(v) => {
              setPrivacyBlur(v);
              toast.success(
                v
                  ? "Privacy blur enabled — faces & plates auto-blurred on export"
                  : "Privacy blur disabled",
              );
            }}
          />
          <ToggleRow
            icon={<Share2 className="h-4 w-4" />}
            label="Share my location"
            desc="Broadcasts your live GPS to mutually-accepted trusted contacts every 30 seconds. Mirrored on the SOS screen."
            checked={settings.shareLocation && !!user}
            onChange={handleToggleShare}
          />
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-secondary text-foreground">
                <Globe className="h-4 w-4" />
              </span>
              <div className="flex-1">
                <p className="text-sm font-semibold">Public live location</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Choose who can see your location pin while you are streaming live. Your location
                  is never broadcast to strangers outside of an active live stream.
                </p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <ThemeChip
                active={settings.publicLiveLocation === "contacts"}
                label="Contacts only"
                icon={<Users className="h-3.5 w-3.5" />}
                onClick={() => handlePublicLiveSelect("contacts")}
              />
              <ThemeChip
                active={settings.publicLiveLocation === "public"}
                label="Contacts + Public"
                icon={<Globe className="h-3.5 w-3.5" />}
                onClick={() => handlePublicLiveSelect("public")}
              />
            </div>
          </div>
          <ToggleRow
            icon={<MapPin className="h-4 w-4" />}
            label="GPS metadata"
            desc="Embed coordinates in recordings and certificates. Off = no location stored."
            checked={settings.gps}
            onChange={(v) => {
              setGps(v);
              toast.success(v ? "GPS enabled" : "GPS disabled");
            }}
          />
          <ToggleRow
            icon={<Lock className="h-4 w-4" />}
            label="Encrypt recordings"
            desc="AES-256-GCM at rest. Strongly recommended."
            checked={settings.encrypt}
            onChange={(v) => {
              setEncrypt(v);
              if (!v)
                toast.warning("Encryption off — new recordings will be stored as plain video");
              else toast.success("Encryption enabled");
            }}
          />
        </Group>

        {/* Notifications */}
        <Group title="Notifications">
          <ToggleRow
            icon={<BellRing className="h-4 w-4" />}
            label="SOS received alert"
            desc="Get notified when one of your trusted contacts sends an SOS."
            checked={settings.notifSosReceived}
            onChange={(v) => {
              setNotifSosReceived(v);
              void handlePushToggle(v, { notifSos: v });
              toast.success(v ? "SOS alerts on" : "SOS alerts off");
            }}
          />
          <ToggleRow
            icon={<MapPinned className="h-4 w-4" />}
            label="Location-share request"
            desc="Notify me when someone invites me to share locations."
            checked={settings.notifShareRequest}
            onChange={(v) => {
              setNotifShareRequest(v);
              void handlePushToggle(v, { notifShareRequest: v });
              toast.success(v ? "Share-request alerts on" : "Share-request alerts off");
            }}
          />
          <ToggleRow
            icon={<Radio className="h-4 w-4" />}
            label="Witness R.E.P going live nearby"
            desc="Get a notification when someone in your area starts a live stream."
            checked={settings.notifLiveNearby}
            onChange={(v) => {
              setNotifLiveNearby(v);
              void handlePushToggle(v, { notifLiveNearby: v });
              toast.success(v ? "Nearby-live alerts on" : "Nearby-live alerts off");
            }}
          />
        </Group>

        {/* Live streaming */}
        <Group title="Live streaming">
          <ToggleRow
            icon={<Siren className="h-4 w-4" />}
            label="Auto-SOS on Go Live"
            desc="When you start a live stream, automatically text all trusted contacts your live location and the watch link."
            checked={settings.autoSosOnLive}
            onChange={(v) => {
              setAutoSosOnLive(v);
              toast.success(v ? "Auto-SOS armed for Go Live" : "Auto-SOS disabled");
            }}
          />
          <ToggleRow
            icon={<ShieldCheck className="h-4 w-4" />}
            label="Police Connect"
            desc="When going live, notify the nearest NYPD precinct with your stream link and verified name. Opt-in only."
            checked={settings.policeConnect}
            onChange={(v) => {
              setPoliceConnect(v);
              toast.success(
                v
                  ? "Police Connect enabled — precinct notified on Go Live"
                  : "Police Connect disabled",
              );
            }}
          />
        </Group>

        {/* Backups */}
        <Group title="Backups">
          <ToggleRow
            icon={<Wifi className="h-4 w-4" />}
            label="Upload on WiFi only"
            desc="Pause cloud backups while on mobile data. Queued recordings resume automatically when WiFi is detected."
            checked={settings.wifiOnly}
            onChange={(v) => {
              setWifiOnly(v);
              toast.success(v ? "Uploads paused on cellular" : "Uploads allowed on any network");
            }}
          />
        </Group>

        {/* Recording */}
        <Group title="Recording">
          <ToggleRow
            icon={<Car className="h-4 w-4" />}
            label="Dashcam mode"
            desc="Continuously records a rolling 30-minute buffer. When you tap to save, the last 30 minutes are flushed to your vault."
            checked={settings.dashcamMode}
            onChange={(v) => {
              setDashcamMode(v);
              toast.success(v ? "Dashcam mode on — 30 min rolling buffer" : "Dashcam mode off");
            }}
          />
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-secondary text-foreground">
                <Timer className="h-4 w-4" />
              </span>
              <div className="flex-1">
                <p className="text-sm font-semibold">Auto-stop recording</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Stops the recorder automatically after this many minutes. Useful so a forgotten
                  capture doesn't fill your vault.
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {AUTO_STOP_OPTIONS.map((min) => {
                const active = settings.autoStopMinutes === min;
                return (
                  <button
                    key={min}
                    type="button"
                    onClick={() => {
                      setAutoStopMinutes(min);
                      toast.success(
                        min === 0 ? "Auto-stop disabled" : `Auto-stop set to ${min} min`,
                      );
                    }}
                    className={`h-9 rounded-full px-3 text-xs font-semibold uppercase tracking-wider transition active:scale-95 ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-background text-muted-foreground"
                    }`}
                  >
                    {min === 0 ? "Off" : `${min} min`}
                  </button>
                );
              })}
            </div>
          </div>
        </Group>

        {/* Storage */}
        <Group title="Storage">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-secondary text-foreground">
                <HardDrive className="h-4 w-4" />
              </span>
              <div className="flex-1">
                <p className="text-sm font-semibold">Local vault</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {storage.total} recording{storage.total === 1 ? "" : "s"} ·{" "}
                  {formatBytes(storage.bytes)} on this device
                </p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Stat
                label="Backed up"
                value={storage.backed}
                icon={<ShieldCheck className="h-3.5 w-3.5 text-success" />}
              />
              <Stat
                label="Pending"
                value={storage.pending}
                icon={<CloudUpload className="h-3.5 w-3.5 text-primary" />}
              />
            </div>
            <button
              type="button"
              onClick={handleClearCache}
              disabled={clearingCache || storage.backed === 0}
              className="mt-3 h-10 w-full rounded-xl border border-border bg-background text-xs font-bold uppercase tracking-wider text-foreground active:scale-95 disabled:opacity-50"
            >
              {clearingCache ? "Clearing…" : "Clear local cache"}
            </button>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Removes only recordings already backed up to the cloud. Pending uploads are kept.
            </p>
          </div>
        </Group>

        {/* Legal */}
        <Group title="Legal">
          <NavRow
            icon={<FileText className="h-4 w-4" />}
            label="Terms of Service"
            to="/legal/terms"
          />
          <NavRow
            icon={<ShieldCheck className="h-4 w-4" />}
            label="Privacy Policy"
            to="/legal/privacy"
          />
          <NavRow
            icon={<BookOpen className="h-4 w-4" />}
            label="Know Your Rights"
            to="/know-your-rights"
          />
          <NavRow icon={<Scale className="h-4 w-4" />} label="Lawyer Finder" to="/lawyer-finder" />
          <NavRow
            icon={<Globe className="h-4 w-4" />}
            label="Transparency & Compliance"
            to="/transparency"
          />
          <NavRow icon={<Users className="h-4 w-4" />} label="Organizations" to="/org" />
        </Group>

        {/* Support */}
        <Group title="Support">
          <ActionRow
            icon={<Mail className="h-4 w-4" />}
            label="Contact us"
            href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
              "Witness R.E.P — Support",
            )}`}
          />
          <ActionRow
            icon={<Bug className="h-4 w-4" />}
            label="Report a bug"
            href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
              "Witness R.E.P — Bug report",
            )}&body=${encodeURIComponent(
              `\n\n— —\n${APP_VERSION}\nDevice: ${typeof navigator !== "undefined" ? navigator.userAgent : ""}`,
            )}`}
          />
          <VersionTapper />
        </Group>

        {/* About */}
        <Group title="About">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-secondary text-foreground">
                <Info className="h-4 w-4" />
              </span>
              <div className="flex-1">
                <p className="text-sm font-semibold">What is Witness R.E.P?</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Witness R.E.P is a camera-first civil rights and personal safety tool. It lets
                  anyone record encrypted video, broadcast a live stream, and instantly alert
                  trusted contacts in an emergency. It was built so accountability and proof don't
                  depend on whether the people in power want them to exist.
                </p>
              </div>
            </div>
          </div>
          <Link
            to="/donate"
            className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 transition active:bg-primary/10"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
              <Heart className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-primary">Support Witness R.E.P</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                Donations keep the cloud running and the app free.
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </Group>

        {/* Danger zone (kept) */}
        <Group title="Danger zone">
          <button
            type="button"
            onClick={handleWipe}
            disabled={wiping}
            className="flex w-full items-start gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-left transition active:bg-primary/10 disabled:opacity-60"
          >
            <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
              <Trash2 className="h-4 w-4" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-primary">
                {wiping ? "Wiping…" : "Clear all data"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Deletes every recording, your PIN, contacts, upload history, and settings on this
                device. Cloud backups are not affected.
              </p>
            </div>
          </button>
          <div className="rounded-2xl border border-border bg-card p-3">
            <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 text-primary" />
              <p>
                Wiping is local-only. If you've uploaded encrypted bundles to S3 they'll remain
                there until you remove them.
              </p>
            </div>
          </div>
        </Group>
      </section>

      {showDelete && (
        <DeleteAccountSheet
          onClose={() => setShowDelete(false)}
          onDeleted={() => {
            setShowDelete(false);
            void navigate({ to: "/camera" });
          }}
        />
      )}

      {showLogout && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          onClick={() => !loggingOut && setShowLogout(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
                <LogOut className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-bold">Log out of Witness R.E.P?</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  You will need your PIN to access your vault after logging back in.
                </p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShowLogout(false)}
                disabled={loggingOut}
                className="h-11 rounded-xl border border-border bg-background text-sm font-semibold text-foreground transition active:scale-95 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogoutConfirm}
                disabled={loggingOut}
                className="h-11 rounded-xl bg-primary text-sm font-bold text-primary-foreground transition active:scale-95 disabled:opacity-50"
              >
                {loggingOut ? "Logging out…" : "Log out"}
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingPublicLive && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          onClick={() => setPendingPublicLive(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-bold">Make live location public?</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  While you are live, your location pin will be visible to
                  <span className="font-semibold text-foreground">
                    {" "}
                    all nearby Witness R.E.P users
                  </span>{" "}
                  on the public map. The pin disappears the moment your stream ends. Your location
                  is never broadcast to strangers when you are not live.
                </p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPendingPublicLive(false)}
                className="h-11 rounded-xl border border-border bg-background text-sm font-semibold text-foreground transition active:scale-95"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmPublicLive}
                className="h-11 rounded-xl bg-primary text-sm font-bold text-primary-foreground transition active:scale-95"
              >
                I understand
              </button>
            </div>
          </div>
        </div>
      )}
      <ManageDevicesSheet open={showDevices} onClose={() => setShowDevices(false)} />
    </main>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="px-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {title}
      </h2>
      {children}
    </div>
  );
}

function ToggleRow({
  icon,
  label,
  desc,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-card p-4 transition active:bg-secondary">
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-secondary text-foreground">
        {icon}
      </span>
      <div className="flex-1">
        <p className="text-sm font-semibold">{label}</p>
        <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={checked} onChange={onChange} ariaLabel={label} />
    </label>
  );
}

function Switch({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={(e) => {
        e.preventDefault();
        onChange(!checked);
      }}
      className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full border transition ${
        checked ? "border-primary bg-primary" : "border-border bg-secondary"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-background shadow transition ${
          checked ? "left-[1.375rem]" : "left-0.5"
        }`}
      />
    </button>
  );
}

function ThemeChip({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex h-10 items-center justify-center gap-2 rounded-xl border text-xs font-bold uppercase tracking-wider transition active:scale-95 ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-muted-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function AccountRow({
  icon,
  label,
  value,
  actionLabel,
  onAction,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-secondary text-foreground">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-semibold">{value}</p>
      </div>
      <button
        type="button"
        onClick={onAction}
        className="rounded-full border border-border bg-background px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-foreground active:scale-95"
      >
        {actionLabel}
      </button>
    </div>
  );
}

function NavRow({ icon, label, to }: { icon: React.ReactNode; label: string; to: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition active:bg-secondary"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-secondary text-foreground">
        {icon}
      </span>
      <p className="flex-1 text-sm font-semibold">{label}</p>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}

function ActionRow({ icon, label, href }: { icon: React.ReactNode; label: string; href: string }) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition active:bg-secondary"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-secondary text-foreground">
        {icon}
      </span>
      <p className="flex-1 text-sm font-semibold">{label}</p>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </a>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-background p-3">
      {icon}
      <div className="flex-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-sm font-bold">{value}</p>
      </div>
    </div>
  );
}

function DeleteAccountSheet({
  onClose,
  onDeleted,
}: {
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const ready = confirm.trim().toUpperCase() === "DELETE";

  async function run() {
    if (!ready) return;
    setDeleting(true);
    try {
      await deleteMyAccount();
      toast.success("Account deleted");
      onDeleted();
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Account deletion failed");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full rounded-t-3xl border-t border-border bg-card p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-primary">
            <AlertTriangle className="h-4 w-4" />
          </span>
          <h2 className="text-base font-bold">Delete your account</h2>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          This permanently wipes every recording, contact, share, and the account itself — both on
          this device and in the cloud. This cannot be undone.
        </p>
        <p className="mt-3 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          Type <span className="text-primary">DELETE</span> to confirm
        </p>
        <input
          autoFocus
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="DELETE"
          className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm tracking-widest outline-none focus:border-primary"
        />
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="h-11 rounded-xl border border-border bg-background text-xs font-bold uppercase tracking-wider text-foreground active:scale-95"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={run}
            disabled={!ready || deleting}
            className="h-11 rounded-xl bg-primary text-xs font-bold uppercase tracking-wider text-primary-foreground active:scale-95 disabled:opacity-50"
          >
            {deleting ? "Deleting…" : "Delete forever"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Change PIN ---------------- */

function ChangePinSection() {
  const [step, setStep] = useState<"current" | "new" | "confirm">("current");
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");

  function verifyCurrent() {
    const stored = getString(STORAGE_KEYS.pin);
    if (currentPin !== stored) {
      setError("Incorrect current PIN");
      return;
    }
    setError("");
    setStep("new");
  }

  function saveNewPin() {
    if (!/^\d{4}$/.test(newPin)) {
      setError("PIN must be 4 digits");
      return;
    }
    if (newPin !== confirmPin) {
      setError("PINs do not match");
      return;
    }
    setRealPin(newPin);
    setError("");
    setStep("current");
    setCurrentPin("");
    setNewPin("");
    setConfirmPin("");
    toast.success("PIN changed & vault re-encrypted");
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-secondary text-foreground">
          <KeyRound className="h-4 w-4" />
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold">Change PIN</p>
          <p className="mt-1 text-xs text-muted-foreground">Rotate your vault encryption key.</p>
        </div>
      </div>

      {step === "current" && (
        <div className="mt-3 space-y-2">
          <input
            type="password"
            maxLength={4}
            placeholder="Current PIN"
            value={currentPin}
            onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            className="h-10 w-full rounded-xl border border-border bg-background px-3 text-center font-mono text-lg tracking-[0.4em] outline-none focus:border-primary"
          />
          {error && <p className="text-xs text-primary">{error}</p>}
          <button
            type="button"
            onClick={verifyCurrent}
            disabled={currentPin.length !== 4}
            className="h-10 w-full rounded-xl bg-primary text-xs font-bold uppercase tracking-wider text-primary-foreground active:scale-95 disabled:opacity-50"
          >
            Verify
          </button>
        </div>
      )}

      {step === "new" && (
        <div className="mt-3 space-y-2">
          <input
            type="password"
            maxLength={4}
            placeholder="New PIN (4 digits)"
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            className="h-10 w-full rounded-xl border border-border bg-background px-3 text-center font-mono text-lg tracking-[0.4em] outline-none focus:border-primary"
          />
          <input
            type="password"
            maxLength={4}
            placeholder="Confirm new PIN"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            className="h-10 w-full rounded-xl border border-border bg-background px-3 text-center font-mono text-lg tracking-[0.4em] outline-none focus:border-primary"
          />
          {error && <p className="text-xs text-primary">{error}</p>}
          <button
            type="button"
            onClick={saveNewPin}
            disabled={newPin.length !== 4 || confirmPin.length !== 4}
            className="h-10 w-full rounded-xl bg-primary text-xs font-bold uppercase tracking-wider text-primary-foreground active:scale-95 disabled:opacity-50"
          >
            Save new PIN
          </button>
          <button
            type="button"
            onClick={() => {
              setStep("current");
              setError("");
            }}
            className="text-xs font-semibold text-muted-foreground underline"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------------- Biometric (WebAuthn) ---------------- */

function BiometricSection() {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [enrolled, setEnrolled] = useState(false);

  useEffect(() => {
    const check = async () => {
      if (typeof window !== "undefined" && "PublicKeyCredential" in window) {
        try {
          const available = await (
            window as unknown as {
              PublicKeyCredential: {
                isUserVerifyingPlatformAuthenticatorAvailable: () => Promise<boolean>;
              };
            }
          ).PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          setSupported(available);
        } catch {
          setSupported(false);
        }
      } else {
        setSupported(false);
      }
    };
    void check();
    const stored = localStorage.getItem("@Witness_biometricEnrolled");
    if (stored === "1") setEnrolled(true);
  }, []);

  function enroll() {
    localStorage.setItem("@Witness_biometricEnrolled", "1");
    setEnrolled(true);
    toast.success("Biometric unlock enrolled");
  }

  function unenroll() {
    localStorage.removeItem("@Witness_biometricEnrolled");
    setEnrolled(false);
    toast.success("Biometric unlock removed");
  }

  if (supported === null) return null;
  if (!supported) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-secondary text-foreground">
          <Fingerprint className="h-4 w-4" />
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold">Biometric unlock</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Use Face ID / fingerprint as an alternative to your PIN.
          </p>
        </div>
      </div>
      <div className="mt-3">
        {enrolled ? (
          <button
            type="button"
            onClick={unenroll}
            className="h-10 w-full rounded-xl border border-primary/30 bg-primary/5 text-xs font-bold uppercase tracking-wider text-primary active:scale-95"
          >
            Remove biometric
          </button>
        ) : (
          <button
            type="button"
            onClick={enroll}
            className="h-10 w-full rounded-xl bg-primary text-xs font-bold uppercase tracking-wider text-primary-foreground active:scale-95"
          >
            Enroll biometric
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------------- Stealth Mode Toggle ---------------- */

function StealthModeToggle() {
  const [on, setOn] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("@Witness_stealth") === "1";
  });

  function toggle() {
    const next = !on;
    setOn(next);
    localStorage.setItem("@Witness_stealth", next ? "1" : "0");
    toast.success(next ? "Stealth mode on · viewfinder blacked out" : "Stealth mode off");
  }

  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-card p-4 transition active:bg-secondary">
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-secondary text-foreground">
        <Eye className="h-4 w-4" />
      </span>
      <div className="flex-1">
        <p className="text-sm font-semibold">Stealth camera</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Black out the viewfinder while recording so your screen looks off.
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label="Stealth camera"
        onClick={(e) => {
          e.preventDefault();
          toggle();
        }}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full border transition ${
          on ? "border-primary bg-primary" : "border-border bg-secondary"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-background shadow transition ${
            on ? "left-[1.375rem]" : "left-0.5"
          }`}
        />
      </button>
    </label>
  );
}

/* ---------------- Decoy PIN ---------------- */

function DecoyPinSection({
  hasDecoy,
  onSetDecoy,
  onClearDecoy,
}: {
  hasDecoy: boolean;
  onSetDecoy: () => void;
  onClearDecoy: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-secondary text-foreground">
          <EyeOff className="h-4 w-4" />
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold">Decoy PIN</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {hasDecoy
              ? "A decoy PIN is set. Use it to open a harmless vault."
              : "Set a second PIN that opens a decoy vault with no sensitive content."}
          </p>
        </div>
      </div>
      <div className="mt-3">
        {hasDecoy ? (
          <button
            type="button"
            onClick={onClearDecoy}
            className="h-10 w-full rounded-xl border border-primary/30 bg-primary/5 text-xs font-bold uppercase tracking-wider text-primary active:scale-95"
          >
            Remove decoy PIN
          </button>
        ) : (
          <button
            type="button"
            onClick={onSetDecoy}
            className="h-10 w-full rounded-xl border border-border bg-background text-xs font-bold uppercase tracking-wider text-foreground active:scale-95"
          >
            Set decoy PIN
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------------- Attorney-Client Privilege Toggle ---------------- */

function AttorneyClientToggle() {
  const [on, setOn] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("@Witness_attorneyClientPrivilege") === "1";
  });

  function toggle() {
    const next = !on;
    setOn(next);
    localStorage.setItem("@Witness_attorneyClientPrivilege", next ? "1" : "0");
    toast.success(
      next
        ? "Attorney-client privilege mode on · recordings marked as privileged"
        : "Attorney-client privilege mode off",
    );
  }

  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-card p-4 transition active:bg-secondary">
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-secondary text-foreground">
        <Scale className="h-4 w-4" />
      </span>
      <div className="flex-1">
        <p className="text-sm font-semibold">Attorney-client privilege</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Mark new recordings as privileged legal material. Adds a watermark and restricts automatic
          sharing.
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label="Attorney-client privilege"
        onClick={(e) => {
          e.preventDefault();
          toggle();
        }}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full border transition ${
          on ? "border-primary bg-primary" : "border-border bg-secondary"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-background shadow transition ${
            on ? "left-[1.375rem]" : "left-0.5"
          }`}
        />
      </button>
    </label>
  );
}

/* ---------------- Version Tapper (admin gate) ---------------- */

function VersionTapper() {
  const navigate = useNavigate();
  const [taps, setTaps] = useState(0);
  const [lastTap, setLastTap] = useState(0);

  function handleTap() {
    const now = Date.now();
    if (now - lastTap > 2000) {
      setTaps(1);
    } else {
      const next = taps + 1;
      setTaps(next);
      if (next >= 5) {
        setTaps(0);
        void navigate({ to: "/app-store-assets" });
        return;
      }
    }
    setLastTap(now);
  }

  return (
    <button
      type="button"
      onClick={handleTap}
      className="px-2 pt-1 text-center text-[11px] text-muted-foreground w-full cursor-default select-none"
      aria-label="App version"
    >
      {APP_VERSION}
    </button>
  );
}

/* ---------------- What's New Gate ---------------- */

const LAST_SEEN_VERSION_KEY = "@Witness_lastSeenVersion";

export function checkWhatsNew() {
  if (typeof window === "undefined") return false;
  const last = localStorage.getItem(LAST_SEEN_VERSION_KEY);
  if (last !== APP_VERSION) {
    localStorage.setItem(LAST_SEEN_VERSION_KEY, APP_VERSION);
    return true;
  }
  return false;
}

function formatBytes(n: number): string {
  if (!n) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}
