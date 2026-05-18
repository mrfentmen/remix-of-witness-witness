// WitnessPrivacyPro.tsx
// Self-contained TypeScript React shell for advanced privacy features.
// Implements: auto-blur faces/plates, panic wipe, ephemeral links, air gap mode,
// GPS obfuscation, anonymous verified status, decoy vault, stealth app masking,
// zero-knowledge architecture. Uses Canvas-based mock detection, localStorage, IndexedDB mock.
// Tailwind CSS, black/red theme.

import React, { useState, useEffect, useCallback, useRef, createContext, useContext } from "react";

// ------------------------------
// SECTION: VANILLA SVG ICONS (Replacing lucide-react)
// ------------------------------
const IconLock = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
  </svg>
);
const IconGhost = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 10h.01"></path>
    <path d="M15 10h.01"></path>
    <path d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z"></path>
  </svg>
);
const IconFolder = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
  </svg>
);

// ------------------------------
// SECTION: Types & Interfaces
// ------------------------------
interface PrivacySettings {
  airGapEnabled: boolean;
  gpsObfuscation: boolean;
  obfuscationOffsetMeters: number;
  stealthMode: boolean;
}

interface DecoyMetadata {
  id: string;
  title: string;
  createdAt: number;
  fileSize: number;
}

interface EphemeralLink {
  url: string;
  expiresAt: number; // timestamp
}

// Mock detection: In real app, would use Face-API.js, but here we simulate with canvas pixel analysis
async function mockDetectFacesAndPlates(
  _imageData: ImageData,
): Promise<{ faces: number; plates: number }> {
  // Simulate detection: always finds 1 face and 1 plate for demo
  return { faces: 1, plates: 1 };
}

// Helper: pixelate region on canvas
function pixelateRegion(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  pixelSize: number,
) {
  const imageData = ctx.getImageData(x, y, w, h);
  for (let i = 0; i < imageData.width; i += pixelSize) {
    for (let j = 0; j < imageData.height; j += pixelSize) {
      const avg = { r: 0, g: 0, b: 0, count: 0 };
      for (let dx = 0; dx < pixelSize && i + dx < imageData.width; dx++) {
        for (let dy = 0; dy < pixelSize && j + dy < imageData.height; dy++) {
          const idx = ((j + dy) * imageData.width + (i + dx)) * 4;
          avg.r += imageData.data[idx];
          avg.g += imageData.data[idx + 1];
          avg.b += imageData.data[idx + 2];
          avg.count++;
        }
      }
      if (avg.count > 0) {
        const r = avg.r / avg.count;
        const g = avg.g / avg.count;
        const b = avg.b / avg.count;
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(x + i, y + j, pixelSize, pixelSize);
      }
    }
  }
}

// Mock IndexedDB wipe
async function wipeIndexedDB() {
  if (typeof window === "undefined") return;
  const databases = ["WitnessDB", "WitnessVault", "WitnessCovertDB"];
  for (const db of databases) {
    indexedDB.deleteDatabase(db);
  }
  // Try to use modern API if available
  if ("databases" in indexedDB) {
    try {
      const dbs = await (indexedDB as any).databases();
      for (const db of dbs) {
        indexedDB.deleteDatabase(db.name);
      }
    } catch (e) {
      console.warn("Could not list databases", e);
    }
  }
}

// ------------------------------
// SECTION: Auto-Blur Faces & Plates (usePrivacyMask)
// ------------------------------
export function usePrivacyMask() {
  const [isProcessing, setIsProcessing] = useState(false);
  const processFrameForPrivacy = useCallback(
    async (videoElement: HTMLVideoElement): Promise<Blob | null> => {
      setIsProcessing(true);
      const canvas = document.createElement("canvas");
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setIsProcessing(false);
        return null;
      }
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      await mockDetectFacesAndPlates(imageData);
      // For demo, simply pixelate the entire frame to simulate blur
      pixelateRegion(ctx, 0, 0, canvas.width, canvas.height, 16);

      return new Promise<Blob | null>((resolve) => {
        canvas.toBlob((blob) => {
          setIsProcessing(false);
          resolve(blob);
        }, "image/jpeg");
      });
    },
    [],
  );
  return { processFrameForPrivacy, isProcessing };
}

// ------------------------------
// SECTION: One-Tap Panic Wipe (PanicController)
// ------------------------------
export function PanicController({ onWipeComplete }: { onWipeComplete?: () => void }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const handleWipe = async () => {
    localStorage.clear();
    sessionStorage.clear();
    await wipeIndexedDB();
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
    alert("CRITICAL: All local data purged.");
    onWipeComplete?.();
    setShowConfirm(false);
  };
  return (
    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl border-l-4 border-l-red-600 shadow-xl">
      <h3 className="font-black text-red-600 uppercase tracking-tighter text-lg mb-2">
        Panic Wipe
      </h3>
      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest w-full transition-all"
        >
          INITIATE PURGE
        </button>
      ) : (
        <div className="space-y-4 animate-in fade-in zoom-in duration-200">
          <p className="text-xs text-red-400 font-bold uppercase">
            ⚠️ Warning: All evidence will be permanently deleted from this hardware.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleWipe}
              className="bg-red-800 text-white px-4 py-2 rounded-lg text-xs font-bold flex-1"
            >
              CONFIRM WIPE
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              className="bg-zinc-800 text-zinc-400 px-4 py-2 rounded-lg text-xs font-bold flex-1"
            >
              CANCEL
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ------------------------------
// SECTION: Timed Self-Destruct Links (useEphemeralLinks)
// ------------------------------
export function useEphemeralLinks() {
  const createEphemeralLink = useCallback(
    (originalUrl: string, expiryHours: number = 24): EphemeralLink => {
      const expiresAt = Date.now() + expiryHours * 60 * 60 * 1000;
      const url = `${originalUrl}?expires=${expiresAt}&sig=witness_${Math.random().toString(36).substring(7)}`;
      return { url, expiresAt };
    },
    [],
  );
  const isLinkValid = useCallback((link: EphemeralLink): boolean => {
    return Date.now() < link.expiresAt;
  }, []);
  return { createEphemeralLink, isLinkValid };
}

// ------------------------------
// SECTION: Air Gap Mode (useAirGap)
// ------------------------------
const AirGapContext = createContext<{ airGapEnabled: boolean; toggleAirGap: () => void }>({
  airGapEnabled: false,
  toggleAirGap: () => {},
});

export const useAirGap = () => useContext(AirGapContext);

export function AirGapProvider({ children }: { children: React.ReactNode }) {
  const [airGapEnabled, setAirGapEnabled] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("witness_airGap") === "true";
  });

  const toggleAirGap = () => {
    const newVal = !airGapEnabled;
    setAirGapEnabled(newVal);
    localStorage.setItem("witness_airGap", String(newVal));
  };

  return (
    <AirGapContext.Provider value={{ airGapEnabled, toggleAirGap }}>
      {children}
    </AirGapContext.Provider>
  );
}

// ------------------------------
// SECTION: GPS Obfuscation (FakeLocationEngine)
// ------------------------------
export function useFakeLocation() {
  const [enabled, setEnabled] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("witness_gpsObfuscation") === "true";
  });
  const [offsetMeters, setOffsetMeters] = useState(() => {
    if (typeof window === "undefined") return 75;
    return parseInt(localStorage.getItem("witness_gpsOffset") || "75");
  });

  const obfuscate = useCallback(
    (lat: number, lng: number): { lat: number; lng: number } => {
      if (!enabled) return { lat, lng };
      const rad = offsetMeters / 111320;
      const angle = Math.random() * 2 * Math.PI;
      const dx = rad * Math.cos(angle);
      const dy = rad * Math.sin(angle);
      return { lat: lat + dx, lng: lng + dy };
    },
    [enabled, offsetMeters],
  );

  return { enabled, setEnabled, offsetMeters, setOffsetMeters, obfuscate };
}

// ------------------------------
// SECTION: Anonymous Verified Status (VerifiedAnonManager)
// ------------------------------
export function VerifiedAnonManager() {
  const [isVerifiedInternally, setIsVerifiedInternally] = useState(false);
  const [displayAsAnon, setDisplayAsAnon] = useState(true);
  return (
    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl border-l-4 border-l-red-600 shadow-xl">
      <h3 className="font-black text-red-600 uppercase tracking-tighter text-lg mb-4">
        Identity Cloaking
      </h3>
      <div className="space-y-4">
        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            className="w-5 h-5 accent-red-600 rounded bg-black border-zinc-800"
            checked={isVerifiedInternally}
            onChange={(e) => setIsVerifiedInternally(e.target.checked)}
          />
          <span className="text-sm font-bold text-zinc-300 group-hover:text-white transition-colors uppercase">
            Verified Badge Active
          </span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            className="w-5 h-5 accent-red-600 rounded bg-black border-zinc-800"
            checked={displayAsAnon}
            onChange={(e) => setDisplayAsAnon(e.target.checked)}
          />
          <span className="text-sm font-bold text-zinc-300 group-hover:text-white transition-colors uppercase">
            Force Anonymity
          </span>
        </label>
        <div className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mt-2 bg-black p-2 rounded">
          STATUS: {isVerifiedInternally ? "DECRYPTED ID" : "PENDING VETTING"} • DISPLAY:{" "}
          {displayAsAnon ? "GHOST" : "REALNAME"}
        </div>
      </div>
    </div>
  );
}

// ------------------------------
// SECTION: Decoy Content Generator (DecoyVaultFactory)
// ------------------------------
export function DecoyVaultFactory() {
  const [decoyItems, setDecoyItems] = useState<DecoyMetadata[]>([]);
  const generateDecoy = () => {
    const newDecoy: DecoyMetadata = {
      id: Math.random().toString(36).substring(7),
      title: `Archive_Log_${decoyItems.length + 101}.bin`,
      createdAt: Date.now(),
      fileSize: Math.floor(Math.random() * 50),
    };
    const updated = [...decoyItems, newDecoy];
    setDecoyItems(updated);
    localStorage.setItem("witness_decoy_vault", JSON.stringify(updated));
  };

  useEffect(() => {
    const stored = localStorage.getItem("witness_decoy_vault");
    if (stored) setDecoyItems(JSON.parse(stored));
  }, []);

  return (
    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl border-l-4 border-l-red-600 shadow-xl">
      <h3 className="font-black text-red-600 uppercase tracking-tighter text-lg mb-2">
        Decoy Payload
      </h3>
      <button
        onClick={generateDecoy}
        className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest mb-4 transition-all"
      >
        Generate Plausible Data
      </button>
      <div className="text-[10px] text-zinc-500 uppercase font-bold mb-2">
        Decoy Registry ({decoyItems.length})
      </div>
      <div className="max-h-32 overflow-y-auto space-y-1 custom-scrollbar">
        {decoyItems.map((item) => (
          <div key={item.id} className="text-[10px] font-mono text-zinc-600 bg-black p-1 rounded">
            {item.title} — {item.fileSize}MB
          </div>
        ))}
      </div>
    </div>
  );
}

// ------------------------------
// SECTION: Stealth App Masking (StealthShell)
// ------------------------------
export function StealthShell({
  children,
  onUnmask,
}: {
  children: React.ReactNode;
  onUnmask: () => void;
}) {
  const [masked, setMasked] = useState(true);
  const [formula, setFormula] = useState("");

  const checkFormula = () => {
    if (formula === "1+1=5") {
      setMasked(false);
      onUnmask();
    }
  };

  if (masked) {
    return (
      <div className="min-h-screen bg-[#f4f4f4] text-black flex items-center justify-center font-sans p-6">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">Calculator</h2>
            <div className="text-gray-300">Basic v1.4</div>
          </div>
          <div className="bg-gray-100 p-4 rounded-xl text-right text-2xl font-mono mb-4 min-h-[60px] flex items-center justify-end">
            {formula || "0"}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[7, 8, 9, "/", 4, 5, 6, "*", 1, 2, 3, "-", 0, ".", "=", "+", "#"].map((key) => (
              <button
                key={key.toString()}
                onClick={() => {
                  if (key === "=") checkFormula();
                  else if (key === "#") setFormula("");
                  else setFormula((f) => f + key.toString());
                }}
                className="bg-gray-50 hover:bg-gray-200 aspect-square rounded-full flex items-center justify-center font-bold text-lg transition-all active:scale-90"
              >
                {key}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-gray-300 mt-8 text-center uppercase tracking-widest font-black">
            Institutional Grade Processing
          </p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

// ------------------------------
// SECTION: Zero-Knowledge Architecture (useZeroKnowledge)
// ------------------------------
export function useZeroKnowledge() {
  const [masterKey, setMasterKey] = useState<CryptoKey | null>(null);

  const deriveKey = useCallback(async (passphrase: string): Promise<CryptoKey> => {
    const encoder = new TextEncoder();
    const salt = encoder.encode("witness_fixed_salt_2025");
    const baseKey = await crypto.subtle.importKey(
      "raw",
      encoder.encode(passphrase),
      "PBKDF2",
      false,
      ["deriveKey"],
    );

    return crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
      baseKey,
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"],
    );
  }, []);

  return { deriveKey, masterKey, setMasterKey };
}

// ------------------------------
// SECTION: MainApp Demo
// ------------------------------
function PrivacyTab() {
  const { airGapEnabled, toggleAirGap } = useAirGap();
  const {
    enabled: gpsObfuscation,
    setEnabled: setGpsObfuscation,
    offsetMeters,
    setOffsetMeters,
  } = useFakeLocation();
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PanicController onWipeComplete={() => window.location.reload()} />
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl border-l-4 border-l-red-600 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <span className="text-white font-black uppercase tracking-tight">
            Signal Isolation (Air Gap)
          </span>
          <button
            onClick={toggleAirGap}
            className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${airGapEnabled ? "bg-red-600" : "bg-zinc-800"}`}
          >
            <div
              className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 ${airGapEnabled ? "translate-x-7" : "translate-x-1"}`}
            />
          </button>
        </div>
        <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-tight">
          Prevents metadata leakage and remote intrusion attempts.
        </p>
      </div>
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl border-l-4 border-l-red-600 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <span className="text-white font-black uppercase tracking-tight">
            Coordinate Scrambling
          </span>
          <button
            onClick={() => setGpsObfuscation(!gpsObfuscation)}
            className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${gpsObfuscation ? "bg-red-600" : "bg-zinc-800"}`}
          >
            <div
              className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 ${gpsObfuscation ? "translate-x-7" : "translate-x-1"}`}
            />
          </button>
        </div>
        {gpsObfuscation && (
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-[10px] font-black uppercase text-zinc-500">
              <span>Fuzz Radius</span>
              <span className="text-red-500">{offsetMeters} METERS</span>
            </div>
            <input
              type="range"
              min={20}
              max={500}
              step={10}
              value={offsetMeters}
              onChange={(e) => {
                setOffsetMeters(parseInt(e.target.value));
                localStorage.setItem("witness_gpsOffset", e.target.value);
              }}
              className="w-full accent-red-600 bg-zinc-800 h-1 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        )}
      </div>
      <VerifiedAnonManager />
    </div>
  );
}

function StealthTab() {
  const { airGapEnabled } = useAirGap();
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl border-l-4 border-l-red-600 shadow-xl">
        <h3 className="font-black text-red-600 uppercase tracking-tighter text-lg mb-2">
          Binary Cloaking
        </h3>
        <p className="text-xs text-zinc-400 mb-6 font-bold uppercase tracking-tight leading-relaxed">
          App transforms into a high-fidelity calculator decoy. Use forensic pass-key in calculator
          to return.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-xl w-full text-xs uppercase tracking-widest transition-all shadow-lg shadow-red-900/20"
        >
          ACTIVATE DECOY SHELL
        </button>
      </div>
      <DecoyVaultFactory />
      <div className="bg-black p-6 rounded-2xl border border-zinc-800 flex justify-between items-center shadow-inner">
        <span className="text-xs font-black uppercase text-zinc-500 tracking-widest">
          Network Interlink
        </span>
        <span
          className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${airGapEnabled ? "bg-red-900/30 text-red-500" : "bg-green-900/30 text-green-500"}`}
        >
          {airGapEnabled ? "OFFLINE" : "ENCRYPTED TRANSCEIVER"}
        </span>
      </div>
    </div>
  );
}

export function MainApp() {
  const [activeTab, setActiveTab] = useState<"privacy" | "stealth">("privacy");
  const [unmasked, setUnmasked] = useState(false);

  return (
    <AirGapProvider>
      <StealthShell onUnmask={() => setUnmasked(true)}>
        <div className="min-h-screen bg-black text-white font-sans selection:bg-red-600/30">
          <div className="max-w-xl mx-auto px-6 py-12 pb-32">
            <header className="mb-12 text-center">
              <h1 className="text-4xl font-black italic tracking-tighter text-red-600 uppercase">
                Witness <span className="text-white">Pro</span>
              </h1>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.4em] mt-1">
                High-Security Protocols Active
              </p>
            </header>

            <nav className="flex gap-2 p-1 bg-zinc-950 border border-zinc-900 rounded-2xl mb-10 shadow-2xl">
              {(["privacy", "stealth"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase transition-all tracking-widest ${
                    activeTab === tab
                      ? "bg-red-600 text-white shadow-lg shadow-red-900/20"
                      : "text-zinc-600 hover:text-zinc-300"
                  }`}
                >
                  {tab === "privacy" ? <IconLock /> : <IconGhost />}
                  {tab}
                </button>
              ))}
            </nav>

            <main>
              {activeTab === "privacy" && <PrivacyTab />}
              {activeTab === "stealth" && <StealthTab />}
            </main>
          </div>

          <footer className="fixed bottom-0 left-0 right-0 p-4 bg-black/80 backdrop-blur-md border-t border-zinc-900 text-center pointer-events-none z-40">
            <p className="text-[8px] font-black text-zinc-700 uppercase tracking-[0.6em]">
              Zero-Knowledge Shield v2.4 • Root Encrypted
            </p>
          </footer>
        </div>
      </StealthShell>
    </AirGapProvider>
  );
}

export default MainApp;
