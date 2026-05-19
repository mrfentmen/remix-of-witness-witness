import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import { Toaster } from "@/components/ui/sonner";
import appCss from "../styles.css?url";
import { useEffect, useRef, useCallback, useState } from "react";
import { registerPwa } from "@/lib/pwa";
import { retryPendingUploads } from "@/lib/witness-uploader";
import { subscribeConnection } from "@/lib/network";
import { InstallPrompt } from "@/components/witness/install-prompt";
import { UpdateBanner } from "@/components/witness/update-banner";
import { reconcileLocationBroadcast } from "@/lib/location-broadcaster";
import { supabase } from "@/integrations/supabase/client";
import { verifyEmailTokenHash } from "@/lib/cloud-auth";
import { applyStoredTheme } from "@/lib/witness-theme";
import { reconcilePush } from "@/lib/push-client";
import { fetchProfileKeyState, hasLocalMasterKey } from "@/lib/cloud-key";
import { listCloudRecordings } from "@/lib/cloud-recordings";
import { applyA11y, getA11y, syncReducedMotionFromMedia } from "@/lib/witness-a11y";
import { WitnessProvider } from "@/lib/witness-orchestrator";
import { EmergencyOverlay } from "@/components/witness/emergency-overlay";
import { SyncConflictModal } from "@/components/witness/sync-conflict-modal";
import { A11yAnnouncer } from "@/components/witness/a11y-announcer";
import { useVoiceCommands } from "@/hooks/use-voice-commands";
import { useA11y } from "@/lib/witness-a11y";
import { useTranslation } from "@/lib/witness-i18n";
import { useNavigate } from "@tanstack/react-router";
import { useSettings } from "@/lib/witness-settings";
import { toast } from "sonner";
import { getUploadState } from "@/lib/witness-uploader";
import { listRecordings } from "@/lib/witness-db";
import { wipeAllData } from "@/lib/witness-wipe";
import { detectCountry, getRightsForCountry } from "@/lib/witness-international";
import { AlertTriangle, WifiOff, X, Sparkles } from "lucide-react";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content:
          "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover",
      },
      { name: "theme-color", content: "#0A0A0A" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black" },
      { name: "apple-touch-fullscreen", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "Witness R.E.P" },
      { title: "Witness R.E.P — Record. Encrypt. Prove." },
      {
        name: "description",
        content:
          "Camera-first civil rights and personal safety tool. Record incidents, livestream encounters, and protect footage as legal evidence.",
      },
      { property: "og:title", content: "Witness R.E.P — Record. Encrypt. Prove." },
      {
        property: "og:description",
        content:
          "Civil rights and personal safety camera. Encrypted recordings, tamper-proof certificates, live SOS.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", href: "/icon-512.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/icon-512.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

const APP_VERSION = "Witness R.E.P v1.3.0";
const LAST_SEEN_VERSION_KEY = "@Witness_lastSeenVersion";

function hasSeenCurrentVersion() {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(LAST_SEEN_VERSION_KEY) === APP_VERSION;
  } catch {
    return true;
  }
}

function markVersionSeen() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LAST_SEEN_VERSION_KEY, APP_VERSION);
  } catch {
    /* noop */
  }
}

const RECOVERY_SKIP_PATHS = new Set([
  "/",
  "/recover-vault",
  "/auth",
  "/login",
  "/signup",
  "/onboarding",
  "/legal/privacy",
  "/legal/terms",
]);

async function checkVaultRecovery(router: ReturnType<typeof useRouter>) {
  try {
    const { data } = await supabase.auth.getUser();
    const user = data?.user;
    if (!user) return;
    if (hasLocalMasterKey()) return;
    const path = router.state.location.pathname;
    if (path.startsWith("/verify") || path.startsWith("/watch")) return;
    if (RECOVERY_SKIP_PATHS.has(path)) return;
    const keyState = await fetchProfileKeyState(user.id);
    if (!keyState.hasWrappedKey) return;
    const recs = await listCloudRecordings();
    if (recs.length === 0) return;
    void router.navigate({ to: "/recover-vault" });
  } catch (e) {
    console.warn("[witness] vault recovery check failed", e);
  }
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  const navigate = useNavigate();
  const settings = useSettings();

  // ── Jailbreak / root detection warning ──
  const [jailbreakWarning, setJailbreakWarning] = useState(false);

  // ── What's New modal after app update ──
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  useEffect(() => {
    if (!hasSeenCurrentVersion()) {
      setShowWhatsNew(true);
    }
  }, []);

  useEffect(() => {
    const indicators: string[] = [];
    if (typeof navigator !== "undefined") {
      const ua = navigator.userAgent || "";
      if (/Cydia|Sileo|zxtools|checkra1n|unc0ver|palera1n|Odyssey|Taurine/i.test(ua))
        indicators.push("jailbreak tooling");
      // Android root indicators
      try {
        const buildTags = (navigator as unknown as Record<string, unknown>).buildTags as
          | string
          | undefined;
        if (buildTags && /test-keys/i.test(buildTags)) indicators.push("test-keys build");
      } catch {
        /* ignore */
      }
    }
    if (indicators.length > 0) {
      setJailbreakWarning(true);
      console.warn("[witness] security: device integrity concerns:", indicators.join(", "));
    }
  }, []);

  // Panic wipe — 3 finger 5 second hold
  const panicTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panicHeartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const panicWiping = useRef(false);

  const executePanicWipe = useCallback(async () => {
    if (panicWiping.current) return;
    panicWiping.current = true;

    // Verify all recordings are backed up to S3 before wiping
    try {
      const recs = await listRecordings();
      const unbacked = recs.filter((r) => {
        const u = getUploadState(r.id);
        return u.status !== "done";
      });
      if (unbacked.length > 0) {
        toast.warning(
          `${unbacked.length} recording${unbacked.length === 1 ? "" : "s"} not backed up. Upload first in the Vault.`,
        );
        panicWiping.current = false;
        return;
      }
    } catch {
      // If we can't check, warn but continue
      console.warn("[witness] panic wipe: couldn't verify backups");
    }

    try {
      await wipeAllData();
      if (navigator.vibrate) navigator.vibrate([500, 100, 500]);
      toast.success("All data wiped");
      void navigate({ to: "/signup", replace: true });
    } catch (e) {
      console.error("[witness] panic wipe failed", e);
      toast.error("Wipe failed");
      panicWiping.current = false;
    }
  }, [navigate]);

  useEffect(() => {
    const DB_NAMES = ["WitnessDB", "WitnessAudioDB", "WitnessChainDB", "witness_vault"];

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 3) {
        panicTimerRef.current = setTimeout(() => {
          void executePanicWipe();
        }, 5000);
        let beats = 0;
        panicHeartbeatRef.current = setInterval(() => {
          beats++;
          if (navigator.vibrate) navigator.vibrate(50);
        }, 1000);
      }
    };
    const handleTouchEnd = () => {
      if (panicTimerRef.current) {
        clearTimeout(panicTimerRef.current);
        panicTimerRef.current = null;
      }
      if (panicHeartbeatRef.current) {
        clearInterval(panicHeartbeatRef.current);
        panicHeartbeatRef.current = null;
      }
    };
    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchend", handleTouchEnd);
    window.addEventListener("touchcancel", handleTouchEnd);
    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [executePanicWipe]);

  useEffect(() => {
    applyStoredTheme();
    applyA11y(getA11y());
    syncReducedMotionFromMedia();
    registerPwa((msg) => {
      if (msg.type === "retry-uploads") void retryPendingUploads();
    });
    const onOnline = () => void retryPendingUploads();
    const onVisible = () => {
      if (document.visibilityState === "visible") void retryPendingUploads();
    };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    const unsubConn = subscribeConnection(() => void retryPendingUploads());
    void reconcileLocationBroadcast();
    void reconcilePush();
    void checkVaultRecovery(router);

    // International country detection — cache rights for CA/UK users
    void (async () => {
      try {
        const country = await detectCountry();
        if (country && country !== "US") {
          const rights = getRightsForCountry(country);
          localStorage.setItem("@Witness_internationalCountry", country);
          localStorage.setItem("@Witness_internationalRights", JSON.stringify(rights));
        }
      } catch {
        // Silently ignore — country detection is best-effort
      }
    })();

    // Handle email verification / magic-link redirects.
    // Supabase puts token_hash in query params, and access_token+refresh_token in
    // the fragment (hash). The Supabase JS client auto-detects hash params.
    void (async () => {
      const params = new URLSearchParams(window.location.search);
      const hash = window.location.hash.substring(1); // strip leading '#'
      const hashParams = new URLSearchParams(hash);

      // Handle explicit token_hash (email OTP verification redirect)
      const tokenHash = params.get("token_hash") ?? hashParams.get("token_hash");
      if (tokenHash) {
        try {
          await verifyEmailTokenHash(tokenHash);
          void router.navigate({ to: "/camera", replace: true });
          return;
        } catch (e) {
          console.warn("[witness] email token_hash verification failed", e);
        }
      }

      // Handle magic-link redirect. Wait for Supabase to establish the session
      // from hash params before redirecting to /camera.
      if (hashParams.has("access_token") && hashParams.has("type")) {
        let handled = false;
        const done = () => {
          if (handled) return;
          handled = true;
          authSubMagic.subscription.unsubscribe();
          clearTimeout(fallback);
          void router.navigate({ to: "/camera", replace: true });
        };
        const { data: authSubMagic } = supabase.auth.onAuthStateChange((_event, session) => {
          if (session) done();
        });
        // Fallback: if no session event fires within 5s, redirect anyway.
        const fallback = setTimeout(done, 5000);
      }
    })();

    const { data: authSub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) {
        void reconcileLocationBroadcast();
        void reconcilePush();
        void checkVaultRecovery(router);
      }
    });
    return () => {
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
      unsubConn();
      authSub.subscription.unsubscribe();
    };
  }, [router]);

  return (
    <>
      {settings.airGap && (
        <div className="sticky top-0 z-[1001] flex items-center justify-center gap-2 bg-red-600 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white">
          <WifiOff className="h-3.5 w-3.5" />
          Air gap mode active — all network calls blocked
        </div>
      )}
      {jailbreakWarning && (
        <div className="sticky top-0 z-[1001] flex items-center justify-center gap-2 bg-yellow-600 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white">
          <AlertTriangle className="h-3.5 w-3.5" />
          Jailbreak/root detected — device may be compromised
        </div>
      )}
      <QueryClientProvider client={queryClient}>
        <WitnessProvider>
          <GlobalVoiceCommands />
          <Outlet />
          <Toaster position="top-center" richColors />
          <InstallPrompt />
          <UpdateBanner />
          <EmergencyOverlay />
          <SyncConflictModal />
          <A11yAnnouncer />
          {/* ── What's New modal (shown after SW update) ── */}
          {showWhatsNew && (
            <div
              className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/80 backdrop-blur-sm p-4 sm:items-center"
              role="dialog"
              aria-modal="true"
              onClick={() => {
                markVersionSeen();
                setShowWhatsNew(false);
              }}
            >
              <div
                className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
                    <Sparkles className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-black uppercase tracking-wider text-primary">
                      What's New
                    </p>
                    <p className="text-[11px] text-muted-foreground">{APP_VERSION}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      markVersionSeen();
                      setShowWhatsNew(false);
                    }}
                    className="ml-auto grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-secondary"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-2 mb-5 text-xs leading-relaxed text-muted-foreground">
                  <p className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✦</span> Donation & transparency pages,
                    points & badges system, org accounts
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">▲</span> Sanitization on all user inputs,
                    verified badges on map pins
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="text-yellow-500 mt-0.5">◆</span> Auth flow edge cases, GPS
                    accuracy improvements
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    markVersionSeen();
                    setShowWhatsNew(false);
                  }}
                  className="w-full h-11 rounded-xl bg-primary text-sm font-bold uppercase tracking-wider text-primary-foreground active:scale-95"
                >
                  Got it
                </button>
              </div>
            </div>
          )}
        </WitnessProvider>
      </QueryClientProvider>
    </>
  );
}

function GlobalVoiceCommands() {
  const cfg = useA11y();
  const { lang } = useTranslation();
  const navigate = useNavigate();
  useVoiceCommands(cfg.voiceCommandsEnabled, lang, (cmd) => {
    switch (cmd) {
      case "openVault":
        void navigate({ to: "/vault" });
        break;
      case "openMap":
        void navigate({ to: "/map" });
        break;
      case "sendSos":
        void navigate({ to: "/sos" });
        break;
      case "goLive":
      case "startRecording":
      case "stopRecording":
        void navigate({ to: "/camera" });
        break;
    }
  });
  return null;
}
