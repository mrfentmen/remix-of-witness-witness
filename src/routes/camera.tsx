import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { CameraControls } from "@/components/witness/camera-controls";
import { RecordingTimer } from "@/components/witness/recording-timer";
import { StatusPill, WitnessWordmark } from "@/components/witness/status";
import { useCameraStream } from "@/hooks/use-camera-stream";
import { useMediaRecorder } from "@/hooks/use-media-recorder";
import { useGpsTrack } from "@/hooks/use-gps-track";
import { useAudioMeter } from "@/hooks/use-audio-meter";
import { useRecordingContinuity } from "@/hooks/use-recording-continuity";
import { useZoom } from "@/hooks/use-zoom";
import { useNightMode } from "@/hooks/use-night-mode";
import { useVolumeTrigger } from "@/hooks/use-volume-trigger";
import { useSceneDetection } from "@/hooks/use-scene-detection";
import { useLoopRecording } from "@/hooks/use-loop-recording";
import { useCovertCornerTaps } from "@/hooks/use-covert-recording";
import { CameraAdvancedOverlay } from "@/components/witness/camera-advanced-overlay";
import { MovementHUDOverlay } from "@/components/witness/movement-hud-overlay";
import { useMovementTracker } from "@/hooks/use-movement-tracker";
import { getFlag, getString, STORAGE_KEYS } from "@/lib/witness-storage";
import { useSettings } from "@/lib/witness-settings";
import { supabase } from "@/integrations/supabase/client";
import {
  saveRecording,
  deleteRecording,
  type RecordingGPS,
  type RecordingQuality,
  type ContinuityLog,
} from "@/lib/witness-db";
import { captureVideoThumbnail, getCurrentPosition } from "@/lib/witness-thumbnail";
import { SwitchCamera, AlertTriangle, CheckCircle2, Radio, Copy, X, Settings } from "lucide-react";
import { createMuxLiveStream, type MuxLiveStream } from "@/lib/mux.functions";
import { publishWhip, type WhipSession } from "@/lib/mux-whip";
import { startLiveStreamRow, endLiveStreamRow } from "@/lib/map-data";
import { notifyLiveNearby } from "@/lib/push.functions";
import { hapticRecordStart, hapticRecordStop, hapticPoliceConnect } from "@/lib/haptics";
import { markFirstRecording } from "@/components/witness/install-prompt";
import { RecordingDetailsSheet } from "@/components/witness/recording-details-sheet";
import type { RecordingMeta } from "@/lib/witness-db";
import { buildSosMessage, getQuickLocation, listContacts, smsHref } from "@/lib/witness-contacts";
import { toast } from "sonner";
import { announce } from "@/components/witness/a11y-announcer";
import { checkDuplicate } from "@/lib/witness-fingerprint";
import { DuplicateModal } from "@/components/witness/duplicate-modal";
import type { RecordingFingerprint } from "@/lib/witness-fingerprint";
import { StateRightsCard } from "@/components/witness/state-rights-card";
import { generateMockTranscription, flagPhrases } from "@/lib/witness-ai-forensics";
import type { TranscriptionSegment } from "@/lib/witness-ai-forensics";

// ── NYPD precinct list for Police Connect (Haversine-based nearest lookup) ──
type Precinct = {
  id: number;
  name: string;
  address: string;
  phone: string;
  lat: number;
  lng: number;
};
const NYPD_PRECINCTS: Precinct[] = [
  {
    id: 1,
    name: "1st Precinct",
    address: "16 Ericsson Place, New York, NY 10013",
    phone: "+12123340611",
    lat: 40.7207,
    lng: -74.0097,
  },
  {
    id: 5,
    name: "5th Precinct",
    address: "19 Elizabeth Street, New York, NY 10013",
    phone: "+12123340711",
    lat: 40.7163,
    lng: -73.9973,
  },
  {
    id: 6,
    name: "6th Precinct",
    address: "233 West 10th Street, New York, NY 10014",
    phone: "+12127414811",
    lat: 40.7366,
    lng: -74.0048,
  },
  {
    id: 7,
    name: "7th Precinct",
    address: "134 Delancey Street, New York, NY 10002",
    phone: "+12124777311",
    lat: 40.7188,
    lng: -73.9832,
  },
  {
    id: 9,
    name: "9th Precinct",
    address: "321 East 5th Street, New York, NY 10003",
    phone: "+12124777911",
    lat: 40.7266,
    lng: -73.9859,
  },
  {
    id: 10,
    name: "10th Precinct",
    address: "230 West 20th Street, New York, NY 10011",
    phone: "+12127414611",
    lat: 40.7439,
    lng: -74.0011,
  },
  {
    id: 14,
    name: "14th Precinct",
    address: "14 West 35th Street, New York, NY 10018",
    phone: "+12122399811",
    lat: 40.7499,
    lng: -73.9856,
  },
  {
    id: 17,
    name: "17th Precinct",
    address: "167 East 51st Street, New York, NY 10022",
    phone: "+12128263211",
    lat: 40.7562,
    lng: -73.9695,
  },
  {
    id: 20,
    name: "20th Precinct",
    address: "120 West 82nd Street, New York, NY 10024",
    phone: "+12125806411",
    lat: 40.7861,
    lng: -73.9755,
  },
  {
    id: 22,
    name: "22nd Precinct",
    address: "610 Columbus Avenue, New York, NY 10024",
    phone: "+12126781311",
    lat: 40.7857,
    lng: -73.9661,
  },
  {
    id: 23,
    name: "23rd Precinct",
    address: "162 East 102nd Street, New York, NY 10029",
    phone: "+12128605811",
    lat: 40.7894,
    lng: -73.9468,
  },
  {
    id: 25,
    name: "25th Precinct",
    address: "120 East 119th Street, New York, NY 10035",
    phone: "+12128606511",
    lat: 40.8013,
    lng: -73.9409,
  },
  {
    id: 28,
    name: "28th Precinct",
    address: "2271 Frederick Douglass Blvd, New York, NY 10027",
    phone: "+12126781311",
    lat: 40.8046,
    lng: -73.9548,
  },
  {
    id: 30,
    name: "30th Precinct",
    address: "451 West 151st Street, New York, NY 10031",
    phone: "+12126908811",
    lat: 40.8315,
    lng: -73.9477,
  },
  {
    id: 32,
    name: "32nd Precinct",
    address: "250 West 135th Street, New York, NY 10030",
    phone: "+12126906311",
    lat: 40.8178,
    lng: -73.9443,
  },
  {
    id: 33,
    name: "33rd Precinct",
    address: "2207 Amsterdam Avenue, New York, NY 10032",
    phone: "+12129273200",
    lat: 40.8352,
    lng: -73.9441,
  },
  {
    id: 34,
    name: "34th Precinct",
    address: "4295 Broadway, New York, NY 10033",
    phone: "+12129279711",
    lat: 40.8492,
    lng: -73.9375,
  },
  {
    id: 40,
    name: "40th Precinct",
    address: "257 Alexander Avenue, Bronx, NY 10454",
    phone: "+17184022270",
    lat: 40.8123,
    lng: -73.9209,
  },
  {
    id: 41,
    name: "41st Precinct",
    address: "1086 Simpson Street, Bronx, NY 10459",
    phone: "+17185424771",
    lat: 40.8265,
    lng: -73.8913,
  },
  {
    id: 42,
    name: "42nd Precinct",
    address: "830 Washington Avenue, Bronx, NY 10451",
    phone: "+17184022270",
    lat: 40.8301,
    lng: -73.9137,
  },
  {
    id: 44,
    name: "44th Precinct",
    address: "2 East 169th Street, Bronx, NY 10452",
    phone: "+17185907811",
    lat: 40.8367,
    lng: -73.9215,
  },
  {
    id: 46,
    name: "46th Precinct",
    address: "2120 Ryer Avenue, Bronx, NY 10457",
    phone: "+17182205211",
    lat: 40.8534,
    lng: -73.9022,
  },
  {
    id: 48,
    name: "48th Precinct",
    address: "450 Cross Bronx Expressway, Bronx, NY 10457",
    phone: "+17182995211",
    lat: 40.8473,
    lng: -73.8873,
  },
  {
    id: 52,
    name: "52nd Precinct",
    address: "3016 Webster Avenue, Bronx, NY 10467",
    phone: "+17182205811",
    lat: 40.8742,
    lng: -73.8734,
  },
];

function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function findNearestPrecinct(
  lat: number,
  lng: number,
): { precinct: Precinct; distance: number } | null {
  let best: Precinct | null = null;
  let bestDist = Infinity;
  for (const p of NYPD_PRECINCTS) {
    const dist = haversineMiles(lat, lng, p.lat, p.lng);
    if (dist < bestDist) {
      bestDist = dist;
      best = p;
    }
  }
  return best ? { precinct: best, distance: bestDist } : null;
}

export const Route = createFileRoute("/camera")({
  head: () => ({
    meta: [
      { title: "Witness R.E.P — Record. Encrypt. Prove." },
      {
        name: "description",
        content:
          "Camera-first civil rights and personal safety tool. Tap to record. Encrypted by default.",
      },
    ],
  }),
  component: CameraScreen,
});

function CameraScreen() {
  const navigate = useNavigate();
  const camera = useCameraStream("environment");
  const recorder = useMediaRecorder(camera.stream);
  const settings = useSettings();
  const gpsTrack = useGpsTrack(settings.gps);
  const continuity = useRecordingContinuity();
  const audioLevel = useAudioMeter(camera.stream);
  const zoom = useZoom(camera.stream, camera.videoRef);
  const night = useNightMode(camera.stream, camera.videoRef);
  const [quality, setQuality] = useState<RecordingQuality>("high");
  const [flashOn, setFlashOn] = useState(false);
  const [loopEnabled, setLoopEnabled] = useState(false);
  const loop = useLoopRecording(
    camera.stream,
    (loopEnabled || settings.dashcamMode) && !recorder.lastResult,
  );
  const sceneEvent = useSceneDetection(camera.videoRef, audioLevel, true);
  const movement = useMovementTracker();
  const [stealth, setStealth] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("@Witness_stealth") === "1";
  });
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // Background recording: request screen wake lock during recording.
  const acquireWakeLock = useCallback(async () => {
    try {
      if ("wakeLock" in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request("screen");
        wakeLockRef.current?.addEventListener("release", () => {
          wakeLockRef.current = null;
        });
      }
    } catch {
      /* WakeLock not supported or denied — silent fallback */
    }
  }, []);
  const releaseWakeLock = useCallback(async () => {
    try {
      await wakeLockRef.current?.release();
    } catch {
      /* already released */
    }
    wakeLockRef.current = null;
  }, []);

  // Release WakeLock on unmount if still held.
  useEffect(() => {
    return () => {
      void releaseWakeLock();
    };
  }, [releaseWakeLock]);

  // Listen for stealth mode changes from other tabs
  useEffect(() => {
    const onStorage = () => {
      setStealth(localStorage.getItem("@Witness_stealth") === "1");
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const [bootChecked, setBootChecked] = useState(false);
  const [savedToast, setSavedToast] = useState<string | null>(null);
  const gpsRef = useRef<RecordingGPS | null>(null);
  const gpsTrackRef = useRef<import("@/lib/witness-db").GPSTrackPoint[] | null>(null);
  const continuityRef = useRef<ContinuityLog | null>(null);
  const covertRef = useRef<boolean>(false);
  const lastSavedIdRef = useRef<string | null>(null);
  const autoStopTimerRef = useRef<number | null>(null);
  const [live, setLive] = useState<MuxLiveStream | null>(null);
  const [liveStarting, setLiveStarting] = useState(false);
  const [showLiveSheet, setShowLiveSheet] = useState(false);
  const whipRef = useRef<WhipSession | null>(null);
  const liveRowIdRef = useRef<string | null>(null);
  const [detailsFor, setDetailsFor] = useState<RecordingMeta | null>(null);
  const [dupCheck, setDupCheck] = useState<{
    match: RecordingFingerprint;
    currentPreview: string;
    similarity: number;
    pendingBlob: Blob;
    pendingMeta: {
      mimeType: string;
      durationMs: number;
      gps: RecordingGPS | null;
      gpsTrack: import("@/lib/witness-db").GPSTrackPoint[] | null;
      thumbnailDataUrl: string | null;
      quality: RecordingQuality;
      zoom: import("@/lib/witness-db").ZoomMetadata | null;
      nightMode: boolean;
      continuity: ContinuityLog | null;
    };
  } | null>(null);

  // Boot gate: first-time → /signup, signed-out → /login, otherwise camera.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!getFlag(STORAGE_KEYS.onboarded)) {
        void navigate({ to: "/signup" });
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;

      if (!session) {
        void navigate({ to: "/login" });
        return;
      }

      // Check if profile is complete
      const { data: profile } = await supabase
        .from("profiles")
        .select("profile_complete")
        .eq("user_id", session.user.id)
        .single();

      if (cancelled) return;

      if (!profile?.profile_complete) {
        void navigate({ to: "/onboarding" });
        return;
      }

      setBootChecked(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  // Auto-start camera once allowed past onboarding
  useEffect(() => {
    if (bootChecked && camera.status === "idle") {
      void camera.start();
    }
  }, [bootChecked, camera]);

  const isRecording = recorder.state === "recording";
  const isPaused = recorder.state === "paused";

  // Toggle hardware flash/torch on the active video track when supported.
  const flashSupported = (() => {
    const t = camera.stream?.getVideoTracks()[0];
    if (!t) return false;
    const caps = (t.getCapabilities?.() ?? {}) as MediaTrackCapabilities & {
      torch?: boolean;
    };
    return !!caps.torch;
  })();
  const toggleFlash = () => {
    const t = camera.stream?.getVideoTracks()[0];
    if (!t) return;
    const next = !flashOn;
    setFlashOn(next);
    const c = { torch: next } as MediaTrackConstraintSet & { torch: boolean };
    t.applyConstraints({ advanced: [c] } as MediaTrackConstraints).catch(() => {});
  };

  const handlePauseResume = () => {
    if (isPaused) {
      recorder.resume();
      continuity.resume();
    } else if (isRecording) {
      recorder.pause();
      continuity.pause();
    }
  };

  // Debounce and critical-save lock to prevent accidental double-taps or
  // interrupting a save-in-progress.
  const isTransitioningRef = useRef(false);
  const handleToggle = async () => {
    if (isTransitioningRef.current) return;
    if (camera.status !== "ready") {
      void camera.start();
      return;
    }
    if (isRecording) {
      // Prevent stopping again while save is running.
      isTransitioningRef.current = true;
      recorder.stop();
      gpsTrackRef.current = gpsTrack.stop();
      continuityRef.current = continuity.stop();
      hapticRecordStop();
      announce("Recording stopped");
      void releaseWakeLock();
      // Safety valve: if the save effect never fires, unlock after 30s
      window.setTimeout(() => {
        isTransitioningRef.current = false;
      }, 30000);
    } else {
      isTransitioningRef.current = true;
      try {
        // Capture GPS at record start (if enabled).
        if (settings.gps) {
          const pos = await getCurrentPosition();
          gpsRef.current = pos
            ? {
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
              }
            : null;
        } else {
          gpsRef.current = null;
        }
        gpsTrackRef.current = null;
        continuityRef.current = null;
        covertRef.current = false;
        gpsTrack.start();
        continuity.start();
        await recorder.start();
        hapticRecordStart();
        announce("Recording started");
        void acquireWakeLock();
      } catch (e) {
        console.error("[witness] start recording failed", e);
        toast.error("Failed to start recording");
      } finally {
        isTransitioningRef.current = false;
      }
    }
  };

  // Volume hardware key quick-start.
  useVolumeTrigger(() => void handleToggle(), camera.status === "ready");

  // Loop mode: when user taps "detained" we flush the rolling buffer to vault.
  const handleLoopFlush = useCallback(async () => {
    const blob = await loop.flush();
    if (!blob) {
      toast.warning("Loop buffer empty");
      return;
    }
    try {
      const thumb = await captureVideoThumbnail(blob);
      const pin = getString(STORAGE_KEYS.pin);
      const pos = settings.gps ? await getCurrentPosition() : null;
      const meta = await saveRecording({
        blob,
        mimeType: blob.type || "video/webm",
        durationMs: loop.bufferedMs,
        gps: pos
          ? {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
            }
          : null,
        gpsTrack: null,
        thumbnailDataUrl: thumb,
        encrypt: settings.encrypt,
        pin,
        quality,
        nightMode: night.enabled,
      });
      setSavedToast(`Loop saved · ${(meta.sizeBytes / 1024 / 1024).toFixed(1)} MB`);
      setTimeout(() => setSavedToast(null), 2400);
      setDetailsFor(meta);
    } catch (e) {
      console.error("[witness] loop flush failed", e);
      toast.error("Loop save failed");
    }
  }, [loop, settings.encrypt, settings.gps, quality, night.enabled]);

  // Covert capture (corner-tap gesture). Front camera, audio-only.
  const covertChunksRef = useRef<Blob[]>([]);
  const covertRecRef = useRef<MediaRecorder | null>(null);
  const covertStreamRef = useRef<MediaStream | null>(null);
  const covertStartedAtRef = useRef<number>(0);

  const startCovert = useCallback(async () => {
    if (covertRecRef.current) return;
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      covertStreamRef.current = s;
      const rec = new MediaRecorder(s);
      covertChunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data?.size) covertChunksRef.current.push(e.data);
      };
      rec.start(1000);
      covertRecRef.current = rec;
      covertStartedAtRef.current = Date.now();
    } catch (e) {
      console.warn("[witness] covert start failed", e);
    }
  }, []);

  const stopCovert = useCallback(async () => {
    const rec = covertRecRef.current;
    if (!rec) return;
    await new Promise<void>((resolve) => {
      rec.onstop = () => resolve();
      try {
        rec.stop();
      } catch {
        resolve();
      }
    });
    covertStreamRef.current?.getTracks().forEach((t) => t.stop());
    covertStreamRef.current = null;
    covertRecRef.current = null;
    const dur = Date.now() - covertStartedAtRef.current;
    const blob = new Blob(covertChunksRef.current, { type: rec.mimeType || "audio/webm" });
    covertChunksRef.current = [];
    if (!blob.size) return;
    // Critical-save lock: prevent user from starting a new recording while we save.
    isTransitioningRef.current = true;
    try {
      const pin = getString(STORAGE_KEYS.pin);
      await saveRecording({
        blob,
        mimeType: blob.type,
        durationMs: dur,
        gps: null,
        gpsTrack: null,
        thumbnailDataUrl: null,
        encrypt: settings.encrypt,
        pin,
        covert: true,
      });
      setSavedToast("Covert clip saved");
      setTimeout(() => setSavedToast(null), 2400);
    } catch (e) {
      console.error("[witness] covert save failed", e);
      toast.error("Covert save failed — clip kept in memory, try again");
      // Emergency fallback: if IndexedDB is full/corrupted, at least try to
      // offer a download so the user isn't left with nothing.
      try {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `witness-covert-${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
      } catch {
        /* final fallback exhausted */
      }
    } finally {
      isTransitioningRef.current = false;
    }
  }, [settings.encrypt]);

  useCovertCornerTaps({
    onStart: () => void startCovert(),
    onStop: () => void stopCovert(),
  });

  // Auto-stop timer: schedule a stop after N minutes when recording starts.
  useEffect(() => {
    if (autoStopTimerRef.current) {
      window.clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = null;
    }
    if (isRecording && settings.autoStopMinutes > 0) {
      const ms = settings.autoStopMinutes * 60_000;
      autoStopTimerRef.current = window.setTimeout(() => {
        recorder.stop();
        gpsTrackRef.current = gpsTrack.stop();
        setSavedToast(`Auto-stopped after ${settings.autoStopMinutes} min`);
        setTimeout(() => setSavedToast(null), 2400);
      }, ms);
    }
    return () => {
      if (autoStopTimerRef.current) {
        window.clearTimeout(autoStopTimerRef.current);
        autoStopTimerRef.current = null;
      }
    };
  }, [isRecording, settings.autoStopMinutes, recorder]);

  // Persist completed recording to IndexedDB.
  useEffect(() => {
    const result = recorder.lastResult;
    if (!result) return;
    const key = `${result.startedAt}-${result.endedAt}`;
    if (lastSavedIdRef.current === key) return;
    lastSavedIdRef.current = key;

    void (async () => {
      try {
        const thumb = await captureVideoThumbnail(result.blob);
        const pin = getString(STORAGE_KEYS.pin);
        const coords = gpsRef.current
          ? { lat: gpsRef.current.latitude, lng: gpsRef.current.longitude }
          : null;
        const dupResult = await checkDuplicate({
          blob: result.blob,
          durationMs: result.durationMs,
          coords,
        });
        if (dupResult.match && dupResult.similarity > 70) {
          setDupCheck({
            match: dupResult.match,
            currentPreview: dupResult.currentPreview,
            similarity: dupResult.similarity,
            pendingBlob: result.blob,
            pendingMeta: {
              mimeType: result.mimeType,
              durationMs: result.durationMs,
              gps: gpsRef.current,
              gpsTrack: gpsTrackRef.current,
              thumbnailDataUrl: thumb,
              quality,
              zoom: { level: zoom.level, type: zoom.type },
              nightMode: night.enabled,
              continuity: continuityRef.current,
            },
          });
          return;
        }
        const meta = await saveRecording({
          blob: result.blob,
          mimeType: result.mimeType,
          durationMs: result.durationMs,
          gps: gpsRef.current,
          gpsTrack: gpsTrackRef.current,
          thumbnailDataUrl: thumb,
          encrypt: settings.encrypt,
          pin,
          quality,
          zoom: { level: zoom.level, type: zoom.type },
          nightMode: night.enabled,
          continuity: continuityRef.current,
        });
        setSavedToast(`Saved to Vault · ${meta.encrypted ? "AES-256" : "Unencrypted"}`);
        setTimeout(() => setSavedToast(null), 2400);
        markFirstRecording();
        setDetailsFor(meta);
      } catch (e) {
        console.error("[witness] save failed", e);
        setSavedToast("Save failed");
        setTimeout(() => setSavedToast(null), 2400);
      } finally {
        // Release the transition lock so the user can record again.
        isTransitioningRef.current = false;
      }
    })();
  }, [recorder.lastResult, settings.encrypt, quality, zoom.level, zoom.type, night.enabled]);

  const isLive = live !== null;

  async function handleGoLive() {
    if (isLive) return;
    if (camera.status !== "ready" || !camera.stream) {
      toast.error("Camera not ready");
      return;
    }
    setLiveStarting(true);
    try {
      const stream = await createMuxLiveStream();
      const session = await publishWhip(stream.whipUrl, camera.stream);
      whipRef.current = session;
      setLive(stream);
      setShowLiveSheet(true);
      toast.success("You are live on Mux");

      // Grab a GPS fix once (respect opt-out) and reuse for both the
      // live_streams row (so the public map can pin it) and Auto-SOS.
      const loc = settings.gps ? await getQuickLocation() : null;
      // Public Live Location: only expose coords on the public map / nearby
      // push when the user has opted in. Default = contacts-only.
      const isPublicLive = settings.publicLiveLocation === "public";
      const publicLat = isPublicLive ? (loc?.latitude ?? null) : null;
      const publicLng = isPublicLive ? (loc?.longitude ?? null) : null;
      const publicAcc = isPublicLive ? (loc?.accuracy ?? null) : null;

      // Publish to the public map by inserting a live_streams row.
      // Silently no-ops if the user is not signed in.
      try {
        const rowId = await startLiveStreamRow({
          muxStreamId: stream.streamId,
          playbackId: stream.playbackId,
          lat: publicLat,
          lng: publicLng,
          accuracy: publicAcc,
        });
        liveRowIdRef.current = rowId;
        // Push: nearby Witness users with the toggle on.
        if (rowId && loc && isPublicLive) {
          notifyLiveNearby({
            data: {
              streamId: rowId,
              playbackId: stream.playbackId,
              lat: loc.latitude,
              lng: loc.longitude,
            },
          }).catch((e) => console.warn("[witness] notifyLiveNearby failed", e));
        }
      } catch (e) {
        console.warn("[witness] live_streams insert failed", e);
      }

      // Auto-SOS: text contacts the watch link + GPS.
      if (settings.autoSosOnLive) {
        const contacts = listContacts();
        if (contacts.length > 0) {
          const watchUrl = `${window.location.origin}/watch/${stream.playbackId}`;
          const body = buildSosMessage(loc, { id: stream.playbackId, url: watchUrl });
          window.location.href = smsHref(
            contacts.map((c) => c.phone),
            body,
          );
          toast.success(
            `Auto-SOS texting ${contacts.length} contact${contacts.length === 1 ? "" : "s"}`,
          );
        } else {
          toast.warning("Auto-SOS on, but no trusted contacts saved");
        }
      }

      // Police Connect: notify nearest NYPD precinct on Go Live
      if (settings.policeConnect && loc) {
        try {
          const nearest = findNearestPrecinct(loc.latitude, loc.longitude);
          if (nearest) {
            hapticPoliceConnect();
            const watchUrl = `${window.location.origin}/watch/${stream.playbackId}`;
            const userName =
              (await supabase.auth.getUser()).data.user?.user_metadata?.display_name ||
              (await supabase.auth.getUser()).data.user?.phone ||
              "Witness user";
            const precinctBody = `Witness R.E.P — Live Stream Alert\n\nA livestream is active near ${nearest.precinct.name}.\nStream: ${watchUrl}\nUser: ${userName}\nGPS: ${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)}\nDistance: ${nearest.distance.toFixed(2)} mi`;
            const precinctHref = smsHref([nearest.precinct.phone], precinctBody);
            window.location.href = precinctHref;
            toast.success(
              `Police Connect: notifying ${nearest.precinct.name} (${nearest.distance.toFixed(1)} mi)`,
            );
          }
        } catch (e) {
          console.warn("[witness] police connect failed", e);
        }
      }
    } catch (e) {
      console.error("[witness] go live failed", e);
      toast.error(e instanceof Error ? e.message : "Failed to go live");
      whipRef.current?.stop().catch(() => undefined);
      whipRef.current = null;
      setLive(null);
    } finally {
      setLiveStarting(false);
    }
  }

  async function handleStopLive() {
    if (whipRef.current) {
      await whipRef.current.stop().catch(() => undefined);
      whipRef.current = null;
    }
    if (liveRowIdRef.current) {
      const rowId = liveRowIdRef.current;
      liveRowIdRef.current = null;
      void endLiveStreamRow(rowId);
    }
    setLive(null);
    setShowLiveSheet(false);
    toast.success("Live stream ended");
  }

  // Cleanup WHIP on unmount.
  useEffect(() => {
    return () => {
      whipRef.current?.stop().catch(() => undefined);
      const rowId = liveRowIdRef.current;
      if (rowId) {
        liveRowIdRef.current = null;
        void endLiveStreamRow(rowId);
      }
    };
  }, []);

  async function handleDuplicateResolve(action: "both" | "replace" | "discard") {
    if (!dupCheck) return;
    if (action === "discard") {
      setDupCheck(null);
      return;
    }
    try {
      const pin = getString(STORAGE_KEYS.pin);
      const meta = await saveRecording({
        blob: dupCheck.pendingBlob,
        mimeType: dupCheck.pendingMeta.mimeType,
        durationMs: dupCheck.pendingMeta.durationMs,
        gps: dupCheck.pendingMeta.gps,
        gpsTrack: dupCheck.pendingMeta.gpsTrack,
        thumbnailDataUrl: dupCheck.pendingMeta.thumbnailDataUrl,
        encrypt: settings.encrypt,
        pin,
        quality: dupCheck.pendingMeta.quality,
        zoom: dupCheck.pendingMeta.zoom,
        nightMode: dupCheck.pendingMeta.nightMode,
        continuity: dupCheck.pendingMeta.continuity,
      });
      if (action === "replace") {
        try {
          await deleteRecording(dupCheck.match.id);
        } catch {
          /* best-effort */
        }
      }
      setSavedToast(`Saved to Vault · ${meta.encrypted ? "AES-256" : "Unencrypted"}`);
      setTimeout(() => setSavedToast(null), 2400);
      markFirstRecording();
      setDetailsFor(meta);
    } catch (e) {
      console.error("[witness] duplicate-resolve save failed", e);
      toast.error("Save failed");
    } finally {
      setDupCheck(null);
    }
  }

  return (
    <main
      className="fixed inset-0 flex flex-col bg-background text-foreground select-none"
      aria-label="Witness R.E.P camera"
      onTouchStart={zoom.bindPinch.onTouchStart}
      onTouchMove={zoom.bindPinch.onTouchMove}
      onTouchEnd={zoom.bindPinch.onTouchEnd}
    >
      {/* Stealth mode: black out the viewfinder */}
      {stealth ? (
        <div className="absolute inset-0 z-5 bg-black h-[100dvh]" />
      ) : (
        <video
          ref={camera.videoRef}
          playsInline
          muted
          autoPlay
          className="absolute inset-0 viewfinder"
        />
      )}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.7)_0%,rgba(0,0,0,0)_25%,rgba(0,0,0,0)_55%,rgba(0,0,0,0.85)_100%)]"
      />
      {stealth && (
        <div className="absolute top-[40%] left-1/2 -translate-x-1/2 z-10 text-xs font-bold uppercase tracking-[0.3em] text-white/30 select-none">
          Stealth
        </div>
      )}

      <CameraAdvancedOverlay
        recording={isRecording || isPaused}
        paused={isPaused}
        onPauseResume={handlePauseResume}
        flashOn={flashOn}
        onToggleFlash={toggleFlash}
        flashSupported={flashSupported}
        nightMode={night.enabled}
        onToggleNightMode={night.toggle}
        audioLevel={audioLevel}
        quality={quality}
        onQualityChange={setQuality}
        zoom={zoom.level}
        zoomMin={zoom.min}
        zoomMax={zoom.max}
        zoomType={zoom.type}
        onZoomChange={zoom.setLevel}
        loopActive={loop.active}
        loopBufferedMs={loop.bufferedMs}
        onToggleLoop={() => {
          if (loop.active) void handleLoopFlush();
          setLoopEnabled((v) => !v);
        }}
        sceneHint={
          sceneEvent && Date.now() - sceneEvent.ts < 2000
            ? sceneEvent.kind === "motion"
              ? `Motion · ${sceneEvent.magnitude}`
              : `Sound · ${sceneEvent.level}`
            : null
        }
      />

      {/* Top bar */}
      <header className="relative z-10 flex items-start justify-between gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <WitnessWordmark />
        <div className="flex items-center gap-2">
          <StatusPill encrypted={settings.encrypt} gpsLocked={settings.gps} />
          <Link
            to="/settings"
            aria-label="Open settings"
            className="grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-black/50 text-white backdrop-blur-md active:scale-95"
          >
            <Settings size={20} strokeWidth={2.25} />
          </Link>
        </div>
      </header>

      {/* Recording timer pinned top-center */}
      <div className="relative z-10 mt-3 flex justify-center">
        <RecordingTimer active={isRecording} />
        {isLive && (
          <button
            type="button"
            onClick={() => setShowLiveSheet(true)}
            className="ml-2 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground shadow"
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary-foreground" />
            Live
          </button>
        )}
      </div>

      <div className="flex-1" />

      {/* Flip + Go Live row */}
      <div className="relative z-10 flex items-center justify-between px-6">
        <button
          type="button"
          onClick={isLive ? handleStopLive : handleGoLive}
          disabled={liveStarting || camera.status !== "ready"}
          className={`mb-4 inline-flex h-11 items-center gap-2 rounded-full px-4 text-xs font-bold uppercase tracking-wider shadow active:scale-95 disabled:opacity-50 ${
            isLive ? "bg-foreground text-background" : "bg-primary text-primary-foreground"
          }`}
        >
          <Radio className="h-4 w-4" />
          {liveStarting ? "Going live…" : isLive ? "End live" : "Go Live"}
        </button>
        <button
          type="button"
          onClick={camera.flip}
          aria-label="Flip camera"
          className="mb-4 grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-white/10 text-foreground backdrop-blur-md active:scale-95"
        >
          <SwitchCamera className="h-5 w-5" />
        </button>
      </div>

      {/* Bottom controls */}
      <div className="relative z-10 a11y-handed">
        <CameraControls isRecording={isRecording} onToggleRecord={handleToggle} />
      </div>

      {/* Status overlays */}
      {camera.status !== "ready" && (
        <div className="pointer-events-none absolute inset-0 z-0 grid place-items-center">
          <div className="pointer-events-auto max-w-xs rounded-2xl border border-border bg-card/90 p-5 text-center backdrop-blur-md">
            {camera.status === "denied" ||
            camera.status === "unsupported" ||
            camera.status === "error" ? (
              <>
                <AlertTriangle className="mx-auto mb-2 h-6 w-6 text-primary" />
                <p className="text-sm font-semibold">Camera unavailable</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {camera.error ?? "Allow camera and microphone to record."}
                </p>
                <button
                  type="button"
                  onClick={() => void camera.start()}
                  className="mt-4 inline-flex h-9 items-center rounded-full bg-primary px-4 text-xs font-bold uppercase tracking-wider text-primary-foreground"
                >
                  Try again
                </button>
              </>
            ) : (
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                {camera.status === "requesting" ? "Requesting camera…" : "Camera ready"}
              </p>
            )}
          </div>
        </div>
      )}

      {recorder.error && (
        <p className="pointer-events-none absolute bottom-44 left-1/2 z-10 -translate-x-1/2 rounded-full bg-primary/20 px-3 py-1 text-[11px] text-primary">
          {recorder.error}
        </p>
      )}

      {savedToast && (
        <div className="pointer-events-none absolute bottom-44 left-1/2 z-10 -translate-x-1/2 inline-flex items-center gap-2 rounded-full border border-success/40 bg-success/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-success">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {savedToast}
        </div>
      )}

      {showLiveSheet && live && (
        <LiveSheet live={live} onClose={() => setShowLiveSheet(false)} onEnd={handleStopLive} />
      )}

      <RecordingDetailsSheet
        meta={detailsFor}
        onClose={() => setDetailsFor(null)}
        transcription={null}
      />

      {/* State rights card overlay */}
      <StateRightsCard />

      {/* Movement HUD overlay with velocity, momentum, and state display */}
      <MovementHUDOverlay
        data={movement}
        history={movement.history}
        debugEnabled={movement.debugEnabled}
        onToggleDebug={movement.toggleDebug}
      />

      {dupCheck && (
        <DuplicateModal
          match={dupCheck.match}
          currentPreview={dupCheck.currentPreview}
          similarity={dupCheck.similarity}
          onResolve={handleDuplicateResolve}
        />
      )}

      {/* AI Forensics: transcription trigger after recording saves */}
      {recorder.lastResult && (
        <AiTranscriptionBanner
          durationMs={recorder.lastResult.durationMs}
          onTranscribe={(segments) => {
            if (detailsFor) {
              setDetailsFor({ ...detailsFor });
            }
          }}
        />
      )}
    </main>
  );
}

function LiveSheet({
  live,
  onClose,
  onEnd,
}: {
  live: MuxLiveStream;
  onClose: () => void;
  onEnd: () => void;
}) {
  const watchUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/watch/${live.playbackId}`
      : `/watch/${live.playbackId}`;

  function copy(value: string, label: string) {
    void navigator.clipboard?.writeText(value);
    toast.success(`${label} copied`);
  }

  return (
    <div className="absolute inset-0 z-30 flex items-end bg-black/70 backdrop-blur-sm">
      <div className="w-full rounded-t-3xl border-t border-border bg-card p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary-foreground" />
              Live on Mux
            </span>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground active:bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <Field
            label="Watch link (share this)"
            value={watchUrl}
            onCopy={() => copy(watchUrl, "Watch link")}
            primary
          />
          <Field
            label="Stream key"
            value={live.streamKey}
            onCopy={() => copy(live.streamKey, "Stream key")}
            mono
          />
          <Field
            label="RTMPS ingest"
            value={live.rtmpUrl}
            onCopy={() => copy(live.rtmpUrl, "RTMPS URL")}
            mono
          />
        </div>

        <button
          type="button"
          onClick={onEnd}
          className="mt-5 h-12 w-full rounded-2xl bg-primary text-sm font-bold uppercase tracking-wider text-primary-foreground active:scale-95"
        >
          End live stream
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onCopy,
  primary,
  mono,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  primary?: boolean;
  mono?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-3 ${
        primary ? "border-primary/40 bg-primary/5" : "border-border bg-background"
      }`}
    >
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        <p className={`min-w-0 flex-1 truncate text-xs ${mono ? "font-mono" : ""}`}>{value}</p>
        <button
          type="button"
          onClick={onCopy}
          aria-label={`Copy ${label}`}
          className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground active:bg-secondary"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

/* ---------------- AI Transcription Banner ---------------- */

function AiTranscriptionBanner({
  durationMs,
  onTranscribe,
}: {
  durationMs: number;
  onTranscribe: (segments: TranscriptionSegment[]) => void;
}) {
  const [transcribing, setTranscribing] = useState(false);
  const [done, setDone] = useState(false);

  async function run() {
    setTranscribing(true);
    // Simulate async transcription processing
    await new Promise((r) => setTimeout(r, 1500));
    const segments = generateMockTranscription(durationMs / 1000);
    onTranscribe(segments);
    setDone(true);
    setTranscribing(false);
  }

  if (done) return null;

  return (
    <div className="absolute bottom-36 left-1/2 z-10 -translate-x-1/2">
      <button
        type="button"
        onClick={run}
        disabled={transcribing}
        className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-primary backdrop-blur-md transition active:scale-95 disabled:opacity-50"
      >
        {transcribing ? "Transcribing…" : "AI Transcribe"}
      </button>
    </div>
  );
}
