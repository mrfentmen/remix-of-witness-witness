import React, { useState, useEffect, useRef, useCallback } from "react";
import type { JSX } from "react";

// ------------------------------
// SECTION: VANILLA SVG ICONS
// ------------------------------
const WitnessIcon = ({ name, className = "w-6 h-6" }: { name: string; className?: string }) => {
  const icons: Record<string, JSX.Element> = {
    camera: (
      <>
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
      </>
    ),
    lock: (
      <>
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </>
    ),
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
    eye: (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    eyeOff: (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </>
    ),
    mic: (
      <>
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
      </>
    ),
    volume: (
      <>
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
      </>
    ),
    fingerprint: (
      <>
        <path d="M2 12c0-4.4 3.6-8 8-8s8 3.6 8 8M5 12c0-2.8 2.2-5 5-5s5 2.2 5 5M8 12c0-1.1.9-2 2-2s2 .9 2 2" />
        <path d="M15 22c0-2.8-2.2-5-5-5s-5 2.2-5 5M18 22c0-5.5-4.5-10-10-10S2 16.5 2 22M21 22c0-8.3-6.7-15-15-15" />
      </>
    ),
    alert: (
      <>
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </>
    ),
    activity: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />,
    users: (
      <>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    radio: (
      <>
        <circle cx="12" cy="12" r="2" />
        <path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14" />
      </>
    ),
    skip: (
      <>
        <polygon points="5 4 15 12 5 20 5 4" />
        <line x1="19" y1="5" x2="19" y2="19" />
      </>
    ),
    chevronLeft: <polyline points="15 18 9 12 15 6" />,
    chevronRight: <polyline points="9 18 15 12 9 6" />,
    home: (
      <>
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </>
    ),
    map: (
      <>
        <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
        <line x1="8" y1="2" x2="8" y2="18" />
        <line x1="16" x2="16" y1="6" y2="22" />
      </>
    ),
    book: (
      <>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </>
    ),
    help: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </>
    ),
  };

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {icons[name] || null}
    </svg>
  );
};

// ------------------------------
// SECTION: Decoy PIN System (WitnessDecoyVault)
// ------------------------------
type VaultType = "real" | "decoy" | "locked";

interface DecoySession {
  vaultType: VaultType;
  isDecoyActive: boolean;
  switchToReal: (pin: string) => boolean;
  switchToDecoy: (pin: string) => boolean;
  lock: () => void;
}

const REAL_PIN = "1234";
const DECOY_PIN = "9999";

export function useDecoySession(): DecoySession {
  const [vaultType, setVaultType] = useState<VaultType>("locked");

  const switchToReal = (pin: string) => {
    if (pin === REAL_PIN) {
      setVaultType("real");
      return true;
    }
    return false;
  };
  const switchToDecoy = (pin: string) => {
    if (pin === DECOY_PIN) {
      setVaultType("decoy");
      return true;
    }
    return false;
  };
  const lock = () => setVaultType("locked");

  return {
    vaultType,
    isDecoyActive: vaultType === "decoy",
    switchToReal,
    switchToDecoy,
    lock,
  };
}

// ------------------------------
// SECTION: Hidden Corner Tap Gestures (useHiddenGestures)
// ------------------------------
type CovertMode = "off" | "audio" | "front" | "back";

export function useHiddenGestures(
  onCovertStart: (mode: CovertMode) => void,
  onCovertStop: () => void,
) {
  const tapCounts = useRef({ topLeft: 0, topRight: 0 });
  const tapTimer = useRef<number | null>(null);
  const [covertActive, setCovertActive] = useState<CovertMode>("off");

  const resetTaps = useCallback(() => {
    tapCounts.current = { topLeft: 0, topRight: 0 };
    if (tapTimer.current) window.clearTimeout(tapTimer.current);
  }, []);

  useEffect(() => {
    const handlePointer = (e: PointerEvent) => {
      const x = e.clientX;
      const y = e.clientY;
      const isTopLeft = x < 80 && y < 80;
      const isTopRight = window.innerWidth - x < 80 && y < 80;
      if (!isTopLeft && !isTopRight) return;

      if (tapTimer.current) window.clearTimeout(tapTimer.current);
      tapTimer.current = window.setTimeout(() => resetTaps(), 3000);

      if (isTopLeft) {
        tapCounts.current.topLeft++;
        if (tapCounts.current.topLeft === 4 && covertActive === "off") {
          onCovertStart("audio");
          setCovertActive("audio");
          if (navigator.vibrate) navigator.vibrate(100);
          resetTaps();
        } else if (tapCounts.current.topLeft === 5 && covertActive === "off") {
          onCovertStart("front");
          setCovertActive("front");
          if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
          resetTaps();
        } else if (tapCounts.current.topLeft === 6 && covertActive === "off") {
          onCovertStart("back");
          setCovertActive("back");
          if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 100]);
          resetTaps();
        }
      } else if (isTopRight && covertActive !== "off") {
        tapCounts.current.topRight++;
        if (tapCounts.current.topRight === 3) {
          onCovertStop();
          setCovertActive("off");
          if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
          resetTaps();
        }
      }
    };
    window.addEventListener("pointerdown", handlePointer);
    return () => {
      window.removeEventListener("pointerdown", handlePointer);
      if (tapTimer.current) window.clearTimeout(tapTimer.current);
    };
  }, [covertActive, onCovertStart, onCovertStop, resetTaps]);

  return { covertActive };
}

// ------------------------------
// SECTION: Camera Hardware Toggles (CameraControls)
// ------------------------------
interface CameraControlsProps {
  onFlip: () => void;
  onTorch: () => void;
  torchActive: boolean;
  facingMode: "user" | "environment";
}

export function CameraControls({ onFlip, onTorch, torchActive, facingMode }: CameraControlsProps) {
  return (
    <div className="flex space-x-4 justify-center my-4">
      <button
        onClick={onFlip}
        className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 p-3 rounded-full transition"
      >
        <WitnessIcon name="camera" className="w-6 h-6 text-white" />
      </button>
      <button
        onClick={onTorch}
        className={`p-3 rounded-full border transition ${
          torchActive ? "bg-red-600 border-red-500" : "bg-zinc-900 border-zinc-800"
        }`}
      >
        <WitnessIcon name={torchActive ? "eyeOff" : "eye"} className="w-6 h-6 text-white" />
      </button>
      <div className="text-[10px] uppercase font-black tracking-widest text-zinc-500 self-center ml-2">
        {facingMode === "user" ? "Front" : "Back"} SENSOR
      </div>
    </div>
  );
}

// ------------------------------
// SECTION: Volume Button Quick Start (useVolumeTrigger)
// ------------------------------
const VOLUME_SEQUENCE = ["ArrowUp", "ArrowUp", "ArrowDown"];

export function useVolumeTrigger(onTrigger: () => void) {
  const sequenceRef = useRef<string[]>([]);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!["ArrowUp", "ArrowDown"].includes(e.key)) return;
      sequenceRef.current.push(e.key);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => {
        sequenceRef.current = [];
      }, 2000);

      if (sequenceRef.current.length === VOLUME_SEQUENCE.length) {
        const isMatch = sequenceRef.current.every((val, index) => val === VOLUME_SEQUENCE[index]);
        if (isMatch) {
          onTrigger();
          sequenceRef.current = [];
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onTrigger]);
}

// ------------------------------
// SECTION: Biometric Unlock (BiometricAuth)
// ------------------------------
export function BiometricAuth({
  onSuccess,
  onFallback,
}: {
  onSuccess: () => void;
  onFallback: () => void;
}) {
  const [support, setSupport] = useState<boolean | null>(null);

  useEffect(() => {
    const checkBiometrics = async () => {
      if ((window as any).PublicKeyCredential) {
        const available = await (
          window as any
        ).PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        setSupport(available);
      } else {
        setSupport(false);
      }
    };
    checkBiometrics();
  }, []);

  const handleBiometric = async () => {
    if (!support) {
      onFallback();
      return;
    }
    // Simulation logic
    const success = Math.random() > 0.3;
    if (success) {
      onSuccess();
    } else {
      onFallback();
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
      {support === null ? (
        <p className="text-zinc-500 text-xs animate-pulse">Syncing Biometric Hardware...</p>
      ) : support ? (
        <div className="space-y-4">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-tighter">
            Auth Required
          </p>
          <button
            onClick={handleBiometric}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-3 rounded-xl uppercase text-xs tracking-widest transition-all"
          >
            <WitnessIcon name="fingerprint" className="w-5 h-5 inline mr-2" /> Verify Identity
          </button>
        </div>
      ) : (
        <p className="text-red-500 text-[10px] font-black uppercase">Hardware Auth Unavailable</p>
      )}
    </div>
  );
}

// ------------------------------
// SECTION: Emergency Broadcast Mode (BroadcastController)
// ------------------------------
interface BroadcastState {
  active: boolean;
  witnessCount: number;
}

export function useBroadcast(initialCount = 0) {
  const [state, setState] = useState<BroadcastState>({
    active: false,
    witnessCount: initialCount,
  });

  const startBroadcast = () => {
    setState({ active: true, witnessCount: 0 });
  };

  const stopBroadcast = () => setState({ active: false, witnessCount: 0 });

  useEffect(() => {
    let interval: number | null = null;
    if (state.active) {
      interval = window.setInterval(() => {
        setState((prev) => ({
          ...prev,
          witnessCount: prev.witnessCount + Math.floor(Math.random() * 3),
        }));
      }, 5000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [state.active]);

  return { broadcastState: state, startBroadcast, stopBroadcast };
}

export function BroadcastController() {
  const { broadcastState, startBroadcast, stopBroadcast } = useBroadcast();

  return (
    <div
      className={`rounded-2xl p-5 transition-all border ${
        broadcastState.active ? "bg-red-950/30 border-red-600" : "bg-zinc-900 border-zinc-800"
      }`}
    >
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <WitnessIcon name="radio" className="text-red-600" />
          <span className="font-black text-white text-xs uppercase tracking-widest">
            Network Stream
          </span>
        </div>
        {broadcastState.active && (
          <div className="flex items-center gap-2 bg-red-600 px-2 py-0.5 rounded text-[10px] font-black uppercase">
            <WitnessIcon name="users" className="w-3 h-3" />
            <span>{broadcastState.witnessCount} Observers</span>
          </div>
        )}
      </div>
      {!broadcastState.active ? (
        <button
          onClick={startBroadcast}
          className="w-full bg-zinc-800 hover:bg-red-600 text-white py-3 rounded-xl font-black uppercase text-xs transition-all"
        >
          GO LIVE
        </button>
      ) : (
        <button
          onClick={stopBroadcast}
          className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-black uppercase text-xs transition-all animate-pulse"
        >
          CUT TRANSMISSION
        </button>
      )}
    </div>
  );
}

// ------------------------------
// SECTION: Skip Onboarding & Button Tutorial (TutorialOverlay)
// ------------------------------
export function TutorialOverlay({ onSkip, visible }: { onSkip: () => void; visible: boolean }) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[9999] flex flex-col p-8">
      <div className="flex justify-end">
        <button
          onClick={onSkip}
          className="text-zinc-500 hover:text-white transition-colors flex items-center gap-2 font-black uppercase text-[10px] tracking-widest"
        >
          <WitnessIcon name="skip" className="w-4 h-4" /> Skip Setup
        </button>
      </div>
      <div className="flex-1 flex flex-col justify-center items-center">
        <div className="text-center max-w-sm">
          <div className="mb-10 relative flex justify-center">
            <div className="w-24 h-24 rounded-full bg-red-600/20 animate-ping absolute" />
            <div className="w-24 h-24 rounded-full bg-red-600 flex items-center justify-center relative shadow-[0_0_40px_rgba(232,0,28,0.4)]">
              <WitnessIcon name="lock" className="w-10 h-10 text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-black text-white mb-4 italic uppercase tracking-tighter">
            Forensic Guard
          </h2>
          <p className="text-zinc-400 text-sm leading-relaxed mb-10">
            Use bottom tactical shortcuts for SOS, Map, and Vault. Stealth gestures are active in
            corners.
          </p>
          <button
            onClick={onSkip}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-4 rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl shadow-red-900/20"
          >
            Acknowledge Protocols
          </button>
        </div>
      </div>
    </div>
  );
}

// ------------------------------
// SECTION: MainApp Demo
// ------------------------------
export function MainApp() {
  const { vaultType, switchToReal, switchToDecoy, lock } = useDecoySession();
  const [pinInput, setPinInput] = useState("");
  const [vaultLocked, setVaultLocked] = useState(true);
  const [error, setError] = useState("");

  const handlePinSubmit = () => {
    if (switchToReal(pinInput) || switchToDecoy(pinInput)) {
      setVaultLocked(false);
      setError("");
      setPinInput("");
    } else {
      setError("Authorization Failed");
      setPinInput("");
    }
  };

  const [covertLog, setCovertLog] = useState<string[]>([]);
  const onCovertStart = (mode: string) =>
    setCovertLog((prev) => [`[ALERT] ${mode.toUpperCase()} UPLOAD ACTIVE`, ...prev].slice(0, 3));
  const onCovertStop = () => setCovertLog((prev) => [`[SAFE] BUFFER LOCKED`, ...prev].slice(0, 3));
  const { covertActive } = useHiddenGestures(onCovertStart, onCovertStop);

  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [torch, setTorch] = useState(false);
  const [showTutorial, setShowTutorial] = useState(true);
  const { broadcastState } = useBroadcast();

  useVolumeTrigger(() => {
    if (navigator.vibrate) navigator.vibrate([200, 50, 200]);
    setCovertLog((prev) => ["[AUTO] VOLUME TRIGGER LOGGED", ...prev].slice(0, 3));
  });

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-red-600/30">
      {broadcastState.active && (
        <div className="fixed top-0 left-0 right-0 bg-red-600 text-white py-1 px-4 z-[100] text-[10px] font-black uppercase tracking-widest text-center shadow-lg">
          Broadcast Active • {broadcastState.witnessCount} Observers Connected
        </div>
      )}

      <div className="max-w-xl mx-auto px-6 py-12 pb-32">
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-black text-red-600 italic tracking-tighter uppercase">
            Witness <span className="text-white">REP</span>
          </h1>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.4em] mt-1">
            Tactical Evidence Suite
          </p>
        </header>

        {/* Status Log */}
        <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 mb-8 font-mono text-[9px] space-y-2 uppercase">
          <p className="text-zinc-600 font-bold tracking-widest">Hardware Logs</p>
          {covertLog.map((log, i) => (
            <div key={i} className="text-red-500/80">
              {log}
            </div>
          ))}
          {covertActive !== "off" && (
            <div className="text-green-500 animate-pulse">
              Status: {covertActive} Capture Underway
            </div>
          )}
          {covertLog.length === 0 && (
            <div className="text-zinc-800 italic">Listening for system triggers...</div>
          )}
        </div>

        {/* Identity & Vault */}
        <div className="space-y-6 mb-12">
          {vaultLocked ? (
            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl shadow-2xl">
              <h3 className="text-center font-black uppercase text-xs mb-6 tracking-widest text-zinc-400">
                Authorization Portal
              </h3>
              <div className="flex flex-col items-center gap-6">
                <input
                  type="password"
                  maxLength={4}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  className="bg-black border-2 border-zinc-800 focus:border-red-600 text-white rounded-2xl px-4 py-4 text-center text-4xl w-40 outline-none transition-all font-mono tracking-widest"
                  placeholder="••••"
                />
                <button
                  onClick={handlePinSubmit}
                  className="w-full bg-red-600 hover:bg-red-700 py-4 rounded-xl font-black uppercase tracking-widest"
                >
                  Unlock
                </button>
              </div>
              {error && (
                <p className="text-red-500 text-[10px] font-black text-center mt-4 uppercase tracking-tighter animate-bounce">
                  {error}
                </p>
              )}
            </div>
          ) : (
            <div className="bg-zinc-950 border-2 border-red-900/50 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 font-black text-5xl italic uppercase -rotate-12 select-none pointer-events-none">
                {vaultType}
              </div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-red-600 uppercase italic">
                  {vaultType === "real" ? "Primary Vault" : "Decoy Buffer"}
                </h3>
                <button
                  onClick={() => {
                    lock();
                    setVaultLocked(true);
                  }}
                  className="text-zinc-600 hover:text-white uppercase text-[10px] font-black"
                >
                  Secure
                </button>
              </div>
              <p className="text-zinc-400 text-sm mb-6">
                {vaultType === "real"
                  ? "Forensic recordings encrypted with SHA-256 binary lock."
                  : "This session contains temporary mock cache data."}
              </p>
              <button className="w-full bg-zinc-900 border border-zinc-800 py-3 rounded-xl text-xs font-black uppercase tracking-widest">
                Explore Directory
              </button>
            </div>
          )}

          <BiometricAuth
            onSuccess={() => setVaultLocked(false)}
            onFallback={() => alert("Biometric Error: Manual Override Required")}
          />
        </div>

        {/* Camera Interface */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl">
          <CameraControls
            onFlip={() => setFacingMode((f) => (f === "user" ? "environment" : "user"))}
            onTorch={() => setTorch(!torch)}
            torchActive={torch}
            facingMode={facingMode}
          />
          <BroadcastController />
        </div>
      </div>

      {/* Dock */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-zinc-900/90 backdrop-blur-xl border border-zinc-800 p-4 rounded-3xl flex justify-around shadow-2xl z-[90]">
        {[
          { icon: "radio", label: "LIVE" },
          { icon: "alert", label: "SOS" },
          { icon: "map", label: "MAP" },
          { icon: "lock", label: "VAULT" },
        ].map((item, idx) => (
          <button key={idx} className="flex flex-col items-center gap-1 group">
            <div
              className={`p-2 rounded-xl transition-all ${item.label === "SOS" ? "bg-red-600 text-white" : "text-zinc-500 group-hover:text-red-500"}`}
            >
              <WitnessIcon name={item.icon} className="w-6 h-6" />
            </div>
            <span className="text-[8px] font-black text-zinc-600 uppercase tracking-tighter">
              {item.label}
            </span>
          </button>
        ))}
      </nav>

      <TutorialOverlay visible={showTutorial} onSkip={() => setShowTutorial(false)} />
    </div>
  );
}

export default MainApp;
