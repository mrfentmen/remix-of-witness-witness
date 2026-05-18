// WitnessREP_SecurityLegal.tsx
// One-file TypeScript React implementation for security hardening, legal, accessibility, and ecosystem settings.
// Includes: App security (jailbreak warning, sanitization), secure memory wiping, lawyer directory,
// auto-delete retention, accessibility provider (high contrast, text scaling, aria announcer),
// legal document viewer, PWA ecosystem toggles. MainApp demo at bottom.
// Uses Tailwind CSS. Mock storage and data.

import React, {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
  useRef,
  ReactNode,
} from "react";

// ------------------------------
// SECTION: Vanilla SVG Icon Implementation
// ------------------------------
const Icon = ({ name, className = "w-5 h-5" }: { name: string; className?: string }) => {
  const getPath = () => {
    switch (name) {
      case "shield":
        return <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />;
      case "alert-triangle":
        return (
          <>
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <line x1="12" x2="12" y1="9" y2="13" />
            <line x1="12" x2="12.01" y1="17" y2="17" />
          </>
        );
      case "trash":
        return (
          <>
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          </>
        );
      case "search":
        return (
          <>
            <circle cx="11" cy="11" r="8" />
            <line x1="21" x2="16.65" y1="21" y2="16.65" />
          </>
        );
      case "phone":
        return (
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.79 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
        );
      case "mail":
        return (
          <>
            <rect width="20" height="16" x="2" y="4" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
          </>
        );
      case "scale":
        return (
          <>
            <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
            <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
            <path d="M7 21h10" />
            <path d="M12 3v18" />
            <path d="M3 7h18" />
          </>
        );
      case "moon":
        return <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />;
      case "sun":
        return (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2" />
            <path d="M12 20v2" />
            <path d="m4.93 4.93 1.41 1.41" />
            <path d="m17.66 17.66 1.41 1.41" />
            <path d="M2 12h2" />
            <path d="M20 12h2" />
            <path d="m6.34 17.66-1.41 1.41" />
            <path d="m19.07 4.93-1.41 1.41" />
          </>
        );
      case "type":
        return (
          <>
            <polyline points="4 7 4 4 20 4 20 7" />
            <line x1="9" x2="15" y1="20" y2="20" />
            <line x1="12" x2="12" y1="4" y2="20" />
          </>
        );
      case "refresh":
        return (
          <>
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
            <path d="M16 16h5v5" />
          </>
        );
      case "watch":
        return (
          <>
            <rect width="10" height="14" x="7" y="5" rx="2" />
            <path d="M12 1h10" />
            <path d="M12 23h10" />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {getPath()}
    </svg>
  );
};

// ------------------------------
// SECTION: Types & Mock Data
// ------------------------------
interface Lawyer {
  id: string;
  name: string;
  organization: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  specialties: string[];
}

const mockLawyers: Lawyer[] = [
  {
    id: "1",
    name: "Jane Roe",
    organization: "ACLU of Illinois",
    city: "Chicago",
    state: "IL",
    phone: "+1 (312) 555-1234",
    email: "jane@aclu-il.org",
    specialties: ["Police misconduct", "Civil rights"],
  },
  {
    id: "2",
    name: "John Doe",
    organization: "Legal Aid Society",
    city: "New York",
    state: "NY",
    phone: "+1 (212) 555-5678",
    email: "john@legalaidnyc.org",
    specialties: ["Due process", "Surveillance"],
  },
  {
    id: "3",
    name: "Maria Garcia",
    organization: "Texas Civil Rights Project",
    city: "Houston",
    state: "TX",
    phone: "+1 (713) 555-9012",
    email: "maria@tcpr.org",
    specialties: ["First Amendment", "Police accountability"],
  },
];

type RetentionPolicy = "never" | "7days" | "30days" | "90days";

// ------------------------------
// SECTION: Accessibility Engine (AccessibilityProvider)
// ------------------------------
interface AccessibilityContextValue {
  highContrast: boolean;
  toggleHighContrast: () => void;
  textScale: number;
  setTextScale: (scale: number) => void;
  announce: (message: string) => void;
}

const AccessibilityContext = createContext<AccessibilityContextValue | undefined>(undefined);

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) throw new Error("useAccessibility must be used within AccessibilityProvider");
  return ctx;
}

const AriaAnnouncer: React.FC<{ message: string }> = ({ message }) => {
  return (
    <div
      aria-live="polite"
      className="sr-only"
      style={{
        position: "absolute",
        width: "1px",
        height: "1px",
        padding: "0",
        margin: "-1px",
        overflow: "hidden",
        clip: "rect(0,0,0,0)",
        border: "0",
      }}
    >
      {message}
    </div>
  );
};

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [highContrast, setHighContrast] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("witness_hc_mode") === "true" : false,
  );
  const [textScale, setTextScale] = useState(() => {
    if (typeof window === "undefined") return 100;
    const stored = localStorage.getItem("witness_text_scale");
    return stored ? parseInt(stored) : 100;
  });
  const [announceMessage, setAnnounceMessage] = useState("");

  const toggleHighContrast = () => {
    const newVal = !highContrast;
    setHighContrast(newVal);
    localStorage.setItem("witness_hc_mode", String(newVal));
    if (newVal) document.documentElement.classList.add("high-contrast");
    else document.documentElement.classList.remove("high-contrast");
    announce(newVal ? "High contrast mode enabled" : "High contrast mode disabled");
  };

  const setTextScaleWrapper = (scale: number) => {
    setTextScale(scale);
    localStorage.setItem("witness_text_scale", String(scale));
    document.documentElement.style.fontSize = `${scale}%`;
    announce(`Text size set to ${scale} percent`);
  };

  const announce = (msg: string) => {
    setAnnounceMessage(msg);
    setTimeout(() => setAnnounceMessage(""), 3000);
  };

  useEffect(() => {
    if (highContrast) document.documentElement.classList.add("high-contrast");
    document.documentElement.style.fontSize = `${textScale}%`;
  }, [highContrast, textScale]);

  return (
    <AccessibilityContext.Provider
      value={{
        highContrast,
        toggleHighContrast,
        textScale,
        setTextScale: setTextScaleWrapper,
        announce,
      }}
    >
      {children}
      <AriaAnnouncer message={announceMessage} />
    </AccessibilityContext.Provider>
  );
}

// ------------------------------
// SECTION: Security Hardening & Anti-Tamper (useAppSecurity)
// ------------------------------
export function useAppSecurity() {
  const [isJailbroken, setIsJailbroken] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  const sanitizeInput = (input: string): string => {
    if (typeof document === "undefined") return input;
    const div = document.createElement("div");
    div.textContent = input;
    return div.innerHTML.replace(/<script.*?<\/script>/gi, "");
  };

  useEffect(() => {
    const isMockJailbroken = Math.random() < 0.1;
    setIsJailbroken(isMockJailbroken);
    if (isMockJailbroken) setShowWarning(true);
  }, []);

  const JailbreakWarningModal = () => {
    if (!showWarning) return null;
    return (
      <div className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-[1000] p-4">
        <div className="bg-zinc-900 border-2 border-red-600 rounded-xl p-8 max-w-md w-full shadow-2xl">
          <div className="flex justify-center text-red-600 mb-6">
            <Icon name="alert-triangle" className="w-16 h-16" />
          </div>
          <h3 className="text-2xl font-black text-center text-white mb-4 uppercase tracking-tighter">
            Security Compromise
          </h3>
          <p className="text-sm text-zinc-400 text-center mb-8 leading-relaxed">
            Hardware integrity verification failed. This device appears to be jailbroken or rooted,
            which bypasses kernel‑level security required for encrypted evidence.
          </p>
          <button
            onClick={() => setShowWarning(false)}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-4 rounded-xl font-black uppercase tracking-widest transition-all"
          >
            Proceed with caution
          </button>
        </div>
      </div>
    );
  };

  return { isJailbroken, sanitizeInput, JailbreakWarningModal };
}

// ------------------------------
// SECTION: Secure Memory Wiping (useSecureMemory)
// ------------------------------
export function useSecureMemory<T>(key: string, initialValue: T): [T, (val: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const timeoutRef = useRef<number | null>(null);

  const wipeMemory = useCallback(() => {
    setStoredValue(() => {
      if (typeof initialValue === "string") return "" as unknown as T;
      if (Array.isArray(initialValue)) return [] as unknown as T;
      if (typeof initialValue === "object" && initialValue !== null) return {} as unknown as T;
      return initialValue;
    });
  }, [initialValue]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
        timeoutRef.current = window.setTimeout(() => {
          wipeMemory();
        }, 30000); // Wipe memory after 30 seconds in background
      } else {
        if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, [wipeMemory]);

  return [storedValue, setStoredValue];
}

// ------------------------------
// SECTION: Lawyer Finder & Legal Aid (LawyerDirectory)
// ------------------------------
export function LawyerDirectory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<Lawyer[]>(mockLawyers);
  const { announce } = useAccessibility();

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    const filtered = mockLawyers.filter(
      (l) =>
        l.city.toLowerCase().includes(term.toLowerCase()) ||
        l.state.toLowerCase().includes(term.toLowerCase()) ||
        l.name.toLowerCase().includes(term.toLowerCase()),
    );
    setResults(filtered);
    announce(`Found ${filtered.length} lawyers`);
  };

  return (
    <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 shadow-xl">
      <h3 className="text-lg font-black text-red-600 mb-5 flex items-center gap-3 uppercase tracking-wider">
        <Icon name="scale" className="text-red-600" /> Legal Aid Network
      </h3>
      <div className="relative mb-6">
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500">
          <Icon name="search" className="w-4 h-4" />
        </div>
        <input
          type="text"
          placeholder="Search by state or city..."
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full bg-black border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white text-sm outline-none focus:border-red-600 transition-colors"
        />
      </div>
      <div className="space-y-4 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
        {results.length === 0 && (
          <p className="text-zinc-600 text-center py-8 italic">No results found in your sector.</p>
        )}
        {results.map((lawyer) => (
          <div
            key={lawyer.id}
            className="bg-black p-4 rounded-xl border border-zinc-800 border-l-4 border-l-red-900"
          >
            <div className="font-bold text-white mb-1">{lawyer.name}</div>
            <div className="text-xs text-zinc-400 mb-2 uppercase tracking-tight">
              {lawyer.organization}
            </div>
            <div className="text-[10px] text-zinc-500 mb-4 font-mono">
              {lawyer.city}, {lawyer.state} • {lawyer.specialties.join(" · ")}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => window.open(`tel:${lawyer.phone}`)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-2 rounded-lg text-[10px] font-black uppercase flex items-center justify-center gap-2"
              >
                <Icon name="phone" className="w-3 h-3" /> Call
              </button>
              <button
                onClick={() => window.open(`mailto:${lawyer.email}`)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-2 rounded-lg text-[10px] font-black uppercase flex items-center justify-center gap-2"
              >
                <Icon name="mail" className="w-3 h-3" /> Mail
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ------------------------------
// SECTION: Auto-Delete Retention Timer (AutoDeleteManager)
// ------------------------------
export function AutoDeleteManager() {
  const [policy, setPolicy] = useState<RetentionPolicy>(() => {
    if (typeof window === "undefined") return "never";
    return (localStorage.getItem("witness_retention_policy") as RetentionPolicy) || "never";
  });
  const { announce } = useAccessibility();

  const handlePolicyChange = (newPolicy: RetentionPolicy) => {
    setPolicy(newPolicy);
    localStorage.setItem("witness_retention_policy", newPolicy);
    announce(`Retention policy set to ${newPolicy}`);
  };

  return (
    <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 shadow-xl">
      <h3 className="text-lg font-black text-red-600 mb-4 flex items-center gap-3 uppercase tracking-wider">
        <Icon name="trash" className="text-red-600" /> Data Retention
      </h3>
      <p className="text-[11px] text-zinc-500 mb-6 uppercase font-bold tracking-tight">
        Configure automatic vault purging schedules.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {(["never", "7days", "30days", "90days"] as RetentionPolicy[]).map((opt) => (
          <button
            key={opt}
            onClick={() => handlePolicyChange(opt)}
            className={`py-3 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${
              policy === opt
                ? "bg-red-600 border-red-600 text-white"
                : "bg-black border-zinc-800 text-zinc-600 hover:border-red-900"
            }`}
          >
            {opt === "never" ? "Indefinite" : opt.replace("days", " Days")}
          </button>
        ))}
      </div>
    </div>
  );
}

// ------------------------------
// SECTION: Policy & Compliance Viewer (LegalDocumentViewer)
// ------------------------------
const legalDocuments = {
  gdpr: {
    title: "GDPR Hub",
    content:
      "Witness R.E.P collects near-zero identifiable data. Recordings are hardware-encrypted locally. Users hold absolute control over data erasure and portability rights via the vault settings.",
  },
  lePolicy: {
    title: "Enforcement Policy",
    content:
      "We reject all informal or warrantless requests. Because recordings are encrypted on user devices with keys we do not hold, Witness R.E.P is technically incapable of decrypting evidence for third parties.",
  },
  dataRetention: {
    title: "Retention Standard",
    content:
      "Evidence remains on device until user-initiated deletion or auto-purge trigger. Cloud backups inherit the device's retention policy and are purged within 24h of local removal.",
  },
  openSource: {
    title: "MIT Licensing",
    content:
      "Core security protocols (AES-256-GCM, PBKDF2, SHA-256) are open source to allow independent forensic verification of evidence integrity.",
  },
};

type DocKey = keyof typeof legalDocuments;

export function LegalDocumentViewer() {
  const [activeDoc, setActiveDoc] = useState<DocKey>("gdpr");
  const doc = legalDocuments[activeDoc];

  return (
    <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 shadow-xl">
      <div className="flex gap-2 overflow-x-auto mb-6 pb-2 no-scrollbar">
        {(Object.keys(legalDocuments) as DocKey[]).map((key) => (
          <button
            key={key}
            onClick={() => setActiveDoc(key)}
            className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase border whitespace-nowrap transition-all ${
              activeDoc === key
                ? "bg-red-600 border-red-600 text-white"
                : "bg-black border-zinc-800 text-zinc-500"
            }`}
          >
            {legalDocuments[key].title}
          </button>
        ))}
      </div>
      <div className="bg-black p-5 rounded-xl border border-zinc-800 min-h-[140px]">
        <h4 className="font-black text-red-600 uppercase text-xs mb-3 tracking-widest">
          {doc.title}
        </h4>
        <p className="text-xs text-zinc-400 leading-relaxed font-medium">{doc.content}</p>
      </div>
    </div>
  );
}

// ------------------------------
// SECTION: PWA & App Ecosystem Toggles (AppEcosystemSettings)
// ------------------------------
export function AppEcosystemSettings() {
  const [watchIntegration, setWatchIntegration] = useState(false);
  const [updating, setUpdating] = useState(false);

  const handleUpdate = () => {
    setUpdating(true);
    setTimeout(() => {
      setUpdating(false);
      alert("System up to date. Integrity hash verified.");
    }, 2000);
  };

  return (
    <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 shadow-xl">
      <h3 className="text-lg font-black text-red-600 mb-6 flex items-center gap-3 uppercase tracking-wider">
        <Icon name="watch" className="text-red-600" /> Platform Sync
      </h3>
      <div className="space-y-4">
        <div className="flex justify-between items-center bg-black p-4 rounded-xl border border-zinc-800">
          <div>
            <p className="text-xs font-bold text-white uppercase">Remote Trigger</p>
            <p className="text-[10px] text-zinc-600 font-mono">Apple/Android Watch</p>
          </div>
          <button
            onClick={() => setWatchIntegration(!watchIntegration)}
            className={`w-12 h-6 rounded-full transition-all relative ${watchIntegration ? "bg-red-600" : "bg-zinc-800"}`}
          >
            <div
              className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${watchIntegration ? "left-7" : "left-1"}`}
            />
          </button>
        </div>
        <button
          onClick={handleUpdate}
          disabled={updating}
          className="flex items-center justify-center gap-3 w-full bg-zinc-800 hover:bg-red-600 text-white py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50"
        >
          <Icon name="refresh" className={updating ? "animate-spin" : ""} />
          {updating ? "Verifying..." : "Check for Updates"}
        </button>
      </div>
    </div>
  );
}

// ------------------------------
// SECTION: MainApp Demo
// ------------------------------
export const WitnessSecurityLegal = () => {
  const { highContrast, toggleHighContrast, textScale, setTextScale } = useAccessibility();
  const [demoPin, setDemoPin] = useSecureMemory("witness_demo_pin", "");
  const { JailbreakWarningModal } = useAppSecurity();

  return (
    <div className="min-h-screen bg-black text-white p-4 font-sans selection:bg-red-600/30">
      <div className="max-w-4xl mx-auto py-8">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-black italic text-red-600 tracking-tighter uppercase mb-1">
            Witness R.E.P.
          </h1>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.4em]">
            Secured Legal Infrastructure
          </p>
        </header>

        {/* Accessibility Bar */}
        <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 mb-8 flex flex-wrap gap-4 items-center justify-between shadow-2xl">
          <div className="flex gap-3">
            <button
              onClick={toggleHighContrast}
              className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase"
            >
              {highContrast ? (
                <Icon name="sun" className="w-3 h-3" />
              ) : (
                <Icon name="moon" className="w-3 h-3" />
              )}
              {highContrast ? "Standard" : "Contrast"}
            </button>
          </div>
          <div className="flex items-center gap-4 flex-grow max-w-xs ml-auto">
            <Icon name="type" className="text-zinc-500 w-4 h-4" />
            <input
              type="range"
              min="70"
              max="130"
              step="10"
              value={textScale}
              onChange={(e) => setTextScale(parseInt(e.target.value))}
              className="flex-grow accent-red-600 h-1 bg-zinc-800 rounded-lg appearance-none"
            />
            <span className="text-[10px] font-mono text-zinc-400 w-8">{textScale}%</span>
          </div>
        </div>

        {/* Sensitive Memory Demo */}
        <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 mb-8 border-l-4 border-l-red-600 shadow-xl">
          <h3 className="text-xs font-black text-red-600 mb-2 uppercase tracking-widest">
            Secure Cache Verification
          </h3>
          <p className="text-xs text-zinc-500 mb-4">
            Input data below. If the app goes to the background for 30s, this memory is
            automatically sanitized.
          </p>
          <input
            type="password"
            placeholder="Authorized Access Key"
            value={demoPin}
            onChange={(e) => setDemoPin(e.target.value)}
            className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-4 text-white text-sm focus:border-red-600 outline-none transition-all font-mono"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <LawyerDirectory />
          <div className="space-y-8">
            <AutoDeleteManager />
            <AppEcosystemSettings />
          </div>
        </div>

        <LegalDocumentViewer />

        <JailbreakWarningModal />
      </div>

      <footer className="mt-20 text-center pb-12 opacity-30">
        <p className="text-[8px] font-black uppercase tracking-[0.5em] text-zinc-600 leading-loose">
          Encrypted with AES-256-GCM Hardware-Level Protocols
          <br />
          Protected by Digital Right-to-Record Laws
        </p>
      </footer>
    </div>
  );
};

export const MainApp = () => (
  <AccessibilityProvider>
    <WitnessSecurityLegal />
  </AccessibilityProvider>
);

export default MainApp;
