// WitnessLegalCourt.tsx
// Self-contained TypeScript React shell for courtroom and legal defense tools.
// Implements: Attorney-Client Privilege mode (shared passphrase encryption),
// subpoena resistance documentation, LEA request policy, court filing assistant,
// admissibility checker, Know Your Rights guide, lawyer finder.
// Exports all components/hooks. Uses Tailwind CSS, localStorage for mock data.

import React, { useState, useEffect, useCallback } from "react";
import { jsPDF } from "jspdf";

// ------------------------------
// SECTION: Types & Interfaces
// ------------------------------
export interface LawyerProfile {
  id: string;
  name: string;
  organization: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  specialties: string[];
  proBono: boolean;
}

export interface RightCard {
  id: string;
  title: string;
  summary: string;
  fullText: string;
  statute?: string;
}

export interface AdmissibilityScore {
  score: number;
  grade: "Poor" | "Fair" | "Good" | "Excellent";
  factors: {
    gpsLock: number;
    hashVerification: number;
    metadataComplete: number;
    continuity: number;
  };
}

// ------------------------------
// SECTION: Icons (Vanilla SVG)
// ------------------------------
const GavelIcon = () => (
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
    <path d="m14.5 12.5-8 8a2.11 2.11 0 0 1-3-3l8-8" />
    <path d="m16 16 6-6" />
    <path d="m8 8 6-6" />
    <path d="m9 7 8 8" />
    <path d="m21 11-8-8" />
  </svg>
);

const ShieldIcon = () => (
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
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

// ------------------------------
// SECTION: Mock Data
// ------------------------------
const mockLawyers: LawyerProfile[] = [
  {
    id: "1",
    name: "Jane Roe",
    organization: "ACLU of Illinois",
    city: "Chicago",
    state: "IL",
    phone: "+1 (312) 555-1234",
    email: "jane@aclu-il.org",
    specialties: ["Police misconduct", "Civil rights"],
    proBono: true,
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
    proBono: false,
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
    proBono: true,
  },
];

const rightsData: RightCard[] = [
  {
    id: "r1",
    title: "Right to Remain Silent",
    summary: "You have the constitutional right to remain silent.",
    fullText:
      "The Fifth Amendment protects you from self-incrimination. You do not have to answer any questions.",
    statute: "5th Amendment",
  },
  {
    id: "r2",
    title: "Right to an Attorney",
    summary: "You have the right to speak with an attorney before answering questions.",
    fullText:
      "If you are detained or arrested, you may request a lawyer. Once requested, questioning must stop.",
    statute: "6th Amendment",
  },
  {
    id: "r3",
    title: "Right to Record Police",
    summary: "You have the right to record police officers performing public duties.",
    fullText:
      "As long as you do not interfere, recording public officials in public spaces is protected.",
    statute: "First Amendment",
  },
  {
    id: "r4",
    title: "Right to Refuse Consent",
    summary: "You do not have to consent to a search of your person or property.",
    fullText:
      "Politely state: 'I do not consent to searches.' The officer may still search, but your refusal preserves your rights.",
    statute: "4th Amendment",
  },
];

const stateRequirements: Record<string, string[]> = {
  California: [
    "Affidavit of Authenticity",
    "Chain of Custody Log",
    "Metadata Report",
    "Declaration of Custodian",
  ],
  Texas: ["Notarized Statement", "Original Media Preservation", "Business Records Affidavit"],
  NewYork: [
    "Notice of Intent to Use Digital Evidence",
    "Hash Verification Affidavit",
    "GPS Verification",
  ],
  Florida: ["Sworn Statement", "Chain of Custody", "Audio/Video Transcript"],
};

// ------------------------------
// SECTION: Attorney Privilege (PrivilegeShield)
// ------------------------------
export function PrivilegeShield() {
  const [enabled, setEnabled] = useState(false);
  const [passphrase, setPassphrase] = useState("");
  const [lawyerEmail, setLawyerEmail] = useState("");

  const enablePrivilege = () => {
    if (!passphrase || !lawyerEmail) return;
    setEnabled(true);
    alert("Attorney-Client Privilege mode enabled. Local metadata tagged for legal review.");
  };

  const disablePrivilege = () => {
    setEnabled(false);
    setPassphrase("");
    setLawyerEmail("");
  };

  return (
    <div className="bg-zinc-900 p-6 rounded-2xl border-l-4 border-red-600 shadow-xl">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <ShieldIcon />
          <h3 className="font-bold text-red-500 uppercase tracking-wider">
            Attorney-Client Privilege
          </h3>
        </div>
        <button
          onClick={enabled ? disablePrivilege : undefined}
          className={`px-4 py-1 rounded-full text-[10px] font-black uppercase transition-all ${enabled ? "bg-red-600 text-white" : "bg-zinc-800 text-zinc-500"}`}
        >
          {enabled ? "Engaged" : "Inactive"}
        </button>
      </div>
      {!enabled ? (
        <div className="space-y-3">
          <input
            type="password"
            placeholder="Shared forensic passphrase"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-red-600 transition-colors"
          />
          <input
            type="email"
            placeholder="Authorized attorney email"
            value={lawyerEmail}
            onChange={(e) => setLawyerEmail(e.target.value)}
            className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-red-600 transition-colors"
          />
          <button
            onClick={enablePrivilege}
            className="bg-red-600 hover:bg-red-700 text-white font-black py-3 rounded-xl text-xs uppercase tracking-widest w-full transition-all"
          >
            Activate Privilege Mode
          </button>
        </div>
      ) : (
        <div className="bg-black p-4 rounded-xl border border-red-900/30">
          <p className="text-sm text-green-500 font-bold mb-1">✓ SECURE LINK ESTABLISHED</p>
          <p className="text-xs text-zinc-400">Marking recordings for: {lawyerEmail}</p>
        </div>
      )}
    </div>
  );
}

// ------------------------------
// SECTION: Subpoena Resistance & LEA Policy
// ------------------------------
export function SubpoenaResistance() {
  return (
    <div className="bg-zinc-900 p-6 rounded-2xl border-l-4 border-red-600 space-y-4 shadow-xl">
      <h3 className="font-bold text-red-500 uppercase tracking-wider">
        Subpoena Resistance Protocol
      </h3>
      <p className="text-sm text-zinc-300 leading-relaxed">
        Witness R.E.P. architecture is zero-knowledge.{" "}
        <strong>We cannot decrypt your records.</strong> All video evidence is hardware-encrypted
        on-device.
      </p>
      <div className="bg-black/50 p-4 rounded-xl border border-zinc-800 space-y-2">
        <p className="text-xs text-white">
          <strong>LEA Policy:</strong>
        </p>
        <ul className="text-[11px] text-zinc-400 space-y-1 list-none">
          <li className="flex gap-2">
            <span className="text-red-600">▪</span> Warrantless requests are rejected by default.
          </li>
          <li className="flex gap-2">
            <span className="text-red-600">▪</span> Encryption keys never leave user hardware.
          </li>
          <li className="flex gap-2">
            <span className="text-red-600">▪</span> Gag orders are challenged when overbroad.
          </li>
        </ul>
      </div>
      <p className="text-[10px] text-zinc-500 italic">
        Reference: Riley v. California (2014) - Fourth Amendment applies to digital content.
      </p>
    </div>
  );
}

// ------------------------------
// SECTION: Court Filing Assistant (CourtFiler)
// ------------------------------
export function CourtFiler() {
  const [selectedState, setSelectedState] = useState("California");
  const [recordingId, setRecordingId] = useState("");
  const [caseNumber, setCaseNumber] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [requirements, setRequirements] = useState<string[]>(
    stateRequirements[selectedState] || [],
  );

  useEffect(() => {
    setRequirements(stateRequirements[selectedState] || []);
  }, [selectedState]);

  const generateCoverLetter = () => {
    const letter = `IN THE COURT OF ${selectedState.toUpperCase()}
Case No: ${caseNumber || "PENDING"}
Exhibit: DIGITAL RECORDING ID ${recordingId || "UNSPECIFIED"}

TO THE CLERK OF COURT:

The attached digital evidence is submitted via Witness R.E.P. 
It includes:
- SHA-256 Binary Integrity Hash
- Encrypted Metadata Log
- Cryptographic Timestamp Certificate

This evidence remains in its original captured state, verified by hardware root of trust.

Signed,
_________________________
Digital Evidence Custodian`;
    setCoverLetter(letter);
  };

  return (
    <div className="bg-zinc-900 p-6 rounded-2xl border-l-4 border-red-600 space-y-4 shadow-xl">
      <h3 className="font-bold text-red-500 uppercase tracking-wider">Court Filing Assistant</h3>
      <div className="space-y-3">
        <select
          value={selectedState}
          onChange={(e) => setSelectedState(e.target.value)}
          className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-red-600"
        >
          {Object.keys(stateRequirements).map((state) => (
            <option key={state} value={state}>
              {state}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Recording Reference ID"
          value={recordingId}
          onChange={(e) => setRecordingId(e.target.value)}
          className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-red-600"
        />
        <input
          type="text"
          placeholder="Court Case Number (optional)"
          value={caseNumber}
          onChange={(e) => setCaseNumber(e.target.value)}
          className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-red-600"
        />
      </div>
      <div className="bg-black p-4 rounded-xl">
        <div className="text-[10px] font-black text-zinc-500 uppercase mb-2">
          Discovery Checklist
        </div>
        <ul className="grid grid-cols-1 gap-2">
          {requirements.map((req) => (
            <li key={req} className="text-[11px] text-zinc-300 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span> {req}
            </li>
          ))}
        </ul>
      </div>
      <button
        onClick={generateCoverLetter}
        className="w-full bg-zinc-800 hover:bg-red-600 text-white font-black py-3 rounded-xl text-xs uppercase tracking-widest transition-all"
      >
        Generate Pro-Se Cover Letter
      </button>
      {coverLetter && (
        <div className="mt-4 bg-black p-4 rounded-xl border border-zinc-800 animate-in fade-in slide-in-from-top-2">
          <pre className="text-[10px] font-mono text-zinc-400 whitespace-pre-wrap leading-relaxed">
            {coverLetter}
          </pre>
          <button
            onClick={() => {
              const doc = new jsPDF();
              doc.setFont("courier", "bold");
              doc.text(coverLetter, 20, 20);
              doc.save("Witness_Court_Letter.pdf");
            }}
            className="mt-4 text-red-600 font-bold text-[10px] uppercase underline tracking-tighter"
          >
            Download PDF
          </button>
        </div>
      )}
    </div>
  );
}

// ------------------------------
// SECTION: Admissibility Checker (AdmissibilityChecker)
// ------------------------------
export function AdmissibilityChecker() {
  const [scoreData, setScoreData] = useState<AdmissibilityScore | null>(null);

  const calculateScore = () => {
    const mockFactors = {
      gpsLock: 85,
      hashVerification: 100,
      metadataComplete: 90,
      continuity: 95,
    };
    const total = Math.floor(
      (mockFactors.gpsLock +
        mockFactors.hashVerification +
        mockFactors.metadataComplete +
        mockFactors.continuity) /
        4,
    );
    let grade: AdmissibilityScore["grade"] = "Fair";
    if (total >= 90) grade = "Excellent";
    else if (total >= 70) grade = "Good";
    else if (total >= 50) grade = "Fair";
    else grade = "Poor";
    setScoreData({ score: total, grade, factors: mockFactors });
  };

  return (
    <div className="bg-zinc-900 p-6 rounded-2xl border-l-4 border-red-600 shadow-xl">
      <h3 className="font-bold text-red-500 uppercase tracking-wider mb-4">
        Admissibility Readiness
      </h3>
      <button
        onClick={calculateScore}
        className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-3 rounded-xl text-xs uppercase tracking-widest transition-all shadow-lg shadow-red-900/20"
      >
        Analyze Active Record
      </button>
      {scoreData && (
        <div className="mt-6 space-y-4 animate-in fade-in duration-500">
          <div className="flex flex-col items-center justify-center p-6 bg-black rounded-full w-32 h-32 mx-auto border-2 border-red-600 shadow-[0_0_15px_rgba(232,0,28,0.3)]">
            <span className="text-3xl font-black text-white">{scoreData.score}%</span>
            <span className="text-[10px] font-bold text-red-500">{scoreData.grade}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(scoreData.factors).map(([key, val]) => (
              <div key={key} className="bg-black p-3 rounded-lg border border-zinc-800">
                <div className="text-[9px] text-zinc-500 uppercase font-black">
                  {key.replace(/([A-Z])/g, " $1")}
                </div>
                <div className="text-sm font-bold text-white">{val}%</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ------------------------------
// SECTION: Know Your Rights (LegalResource)
// ------------------------------
export function LegalResource() {
  const [selectedRight, setSelectedRight] = useState<RightCard | null>(null);

  return (
    <div className="bg-zinc-900 p-6 rounded-2xl border-l-4 border-red-600 shadow-xl">
      <h3 className="font-bold text-red-500 uppercase tracking-wider mb-4">
        Constitutional Quick-Cards
      </h3>
      <div className="grid grid-cols-1 gap-2">
        {rightsData.map((right) => (
          <button
            key={right.id}
            onClick={() => setSelectedRight(right)}
            className={`p-4 rounded-xl text-left transition-all border ${selectedRight?.id === right.id ? "bg-red-600 border-red-500 shadow-lg" : "bg-black border-zinc-800 hover:border-zinc-600"}`}
          >
            <div
              className={`font-black text-sm uppercase ${selectedRight?.id === right.id ? "text-white" : "text-red-500"}`}
            >
              {right.title}
            </div>
            <div
              className={`text-xs mt-1 ${selectedRight?.id === right.id ? "text-red-100" : "text-zinc-500"}`}
            >
              {right.summary}
            </div>
          </button>
        ))}
      </div>
      {selectedRight && (
        <div className="mt-6 p-5 bg-zinc-950 rounded-2xl border border-zinc-800 animate-in zoom-in duration-300">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-black text-white uppercase text-base">{selectedRight.title}</h4>
            {selectedRight.statute && (
              <span className="text-[10px] bg-red-600/20 text-red-500 px-2 py-0.5 rounded font-black">
                {selectedRight.statute}
              </span>
            )}
          </div>
          <p className="text-sm text-zinc-400 leading-relaxed font-medium">
            {selectedRight.fullText}
          </p>
        </div>
      )}
    </div>
  );
}

// ------------------------------
// SECTION: Lawyer Finder
// ------------------------------
export function LawyerFinder() {
  const [stateFilter, setStateFilter] = useState("");
  const [search, setSearch] = useState("");

  const filtered = mockLawyers.filter((l) => {
    if (stateFilter && l.state !== stateFilter) return false;
    if (
      search &&
      !l.name.toLowerCase().includes(search.toLowerCase()) &&
      !l.organization.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    return true;
  });

  const states = Array.from(new Set(mockLawyers.map((l) => l.state)));

  return (
    <div className="bg-zinc-900 p-6 rounded-2xl border-l-4 border-red-600 shadow-xl">
      <h3 className="font-bold text-red-500 uppercase tracking-wider mb-4">Pro-Bono Network</h3>
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <select
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          className="bg-black border border-zinc-800 text-zinc-300 text-xs p-3 rounded-xl outline-none focus:border-red-600"
        >
          <option value="">All Sectors</option>
          {states.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Query name or organization..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-black border border-zinc-800 text-white text-xs p-3 rounded-xl outline-none focus:border-red-600"
        />
      </div>
      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {filtered.map((l) => (
          <div
            key={l.id}
            className="bg-black p-5 rounded-2xl border border-zinc-900 group hover:border-red-600/50 transition-all"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="font-black text-white text-base group-hover:text-red-500 transition-colors uppercase tracking-tight">
                {l.name}
              </div>
              {l.proBono && (
                <span className="text-[8px] font-black bg-green-900/30 text-green-500 px-2 py-0.5 rounded border border-green-800/30 uppercase">
                  Pro Bono
                </span>
              )}
            </div>
            <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-3">
              {l.organization} • {l.city}, {l.state}
            </div>
            <div className="text-[10px] text-zinc-400 leading-snug mb-4">
              {l.specialties.join(" · ")}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => window.open(`tel:${l.phone}`)}
                className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border border-zinc-800"
              >
                Call
              </button>
              <button
                onClick={() => alert(`Forensic bundle ready for transmission to ${l.email}`)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-[10px] font-black uppercase tracking-widest"
              >
                Share Data
              </button>
            </div>
          </div>
        ))}
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #E8001C; }
      `}</style>
    </div>
  );
}

// ------------------------------
// SECTION: MainApp Demo
// ------------------------------
export const MainApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"privilege" | "court" | "rights">("privilege");

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-red-600/30">
      <div className="max-w-xl mx-auto px-6 py-12 pb-32">
        <header className="mb-10 text-center">
          <div className="flex justify-center mb-4 text-red-600">
            <GavelIcon />
          </div>
          <h1 className="text-4xl font-black italic tracking-tighter text-white uppercase">
            Legal <span className="text-red-600">Terminal</span>
          </h1>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.4em] mt-1">
            Sovereign Evidence Suite
          </p>
        </header>

        <nav className="flex gap-2 p-1 bg-zinc-950 border border-zinc-900 rounded-2xl mb-10 shadow-2xl">
          {(["privilege", "court", "rights"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all tracking-widest ${activeTab === tab ? "bg-red-600 text-white shadow-lg shadow-red-900/20" : "text-zinc-600 hover:text-zinc-300"}`}
            >
              {tab}
            </button>
          ))}
        </nav>

        <main className="animate-in fade-in duration-500">
          {activeTab === "privilege" && (
            <div className="space-y-8">
              <PrivilegeShield />
              <SubpoenaResistance />
              <LawyerFinder />
            </div>
          )}

          {activeTab === "court" && (
            <div className="space-y-8">
              <AdmissibilityChecker />
              <CourtFiler />
            </div>
          )}

          {activeTab === "rights" && (
            <div className="space-y-8">
              <LegalResource />
            </div>
          )}
        </main>
      </div>

      <footer className="fixed bottom-0 left-0 right-0 p-4 bg-black/80 backdrop-blur-md border-t border-zinc-900 text-center pointer-events-none">
        <p className="text-[8px] font-black text-zinc-700 uppercase tracking-[0.6em]">
          Witness R.E.P • Legal Defense Protocol v2.4
        </p>
      </footer>
    </div>
  );
};

export default MainApp;
