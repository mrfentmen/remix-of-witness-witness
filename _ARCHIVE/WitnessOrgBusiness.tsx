// WitnessOrgBusiness.tsx
import React, { useState, useEffect } from "react";

// ------------------------------
// SECTION: Types & Interfaces
// ------------------------------
export interface Volunteer {
  id: string;
  name: string;
  role: "block_captain" | "observer" | "admin";
  assignedZone: string;
  active: boolean;
  hours: number;
}

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: number;
  permissions: string;
}

export interface GrantApplication {
  id: string;
  name: string;
  foundation: string;
  amount: number;
  deadline: number;
  status: "researching" | "drafting" | "submitted" | "approved" | "rejected";
}

const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

// ------------------------------
// SECTION: Whistleblower Suite
// ------------------------------
export function WhistleblowerSuite() {
  const [noteInput, setNoteInput] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submitReport = () => {
    if (!noteInput) return;
    // Mock encryption & submission
    console.log("Encrypted Payload:", btoa(noteInput));
    setSubmitted(true);
    setNoteInput("");
    setTimeout(() => setSubmitted(false), 5000);
  };

  return (
    <div className="bg-gray-900 p-4 rounded-xl border-l-4 border-red-600 space-y-3 text-white">
      <h3 className="font-bold text-red-500">Secure Whistleblower Portal</h3>
      <div className="bg-black p-3 rounded-lg border border-gray-800">
        <p className="text-xs text-gray-400 mb-2 font-mono">STATUS: END-TO-END ENCRYPTED</p>
        <textarea
          rows={4}
          placeholder="Describe the incident or corporate misconduct..."
          value={noteInput}
          onChange={(e) => setNoteInput(e.target.value)}
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm"
        />
        <button
          onClick={submitReport}
          className="mt-2 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-full text-sm w-full font-bold transition-colors"
        >
          Submit Anonymous Report
        </button>
        {submitted && (
          <div className="text-xs text-green-500 mt-2 text-center font-bold italic underline">
            Submission Received & Securely Queued
          </div>
        )}
      </div>
    </div>
  );
}

// ------------------------------
// SECTION: Admin Ops (Volunteers & API)
// ------------------------------
export function VolunteerManager() {
  const [volunteers, setVolunteers] = useState<Volunteer[]>(() => {
    const saved = localStorage.getItem("org_volunteers");
    return saved ? JSON.parse(saved) : [];
  });
  const [name, setName] = useState("");

  useEffect(() => {
    localStorage.setItem("org_volunteers", JSON.stringify(volunteers));
  }, [volunteers]);

  const addVolunteer = () => {
    if (!name) return;
    const v: Volunteer = {
      id: genId(),
      name,
      role: "observer",
      assignedZone: "General",
      active: true,
      hours: 0,
    };
    setVolunteers([v, ...volunteers]);
    setName("");
  };

  const removeVolunteer = (id: string) => setVolunteers(volunteers.filter((v) => v.id !== id));

  return (
    <div className="bg-gray-900 p-4 rounded-xl border-l-4 border-red-600 space-y-3 text-white">
      <h3 className="font-bold text-red-500">Volunteer Roster</h3>
      <div className="flex gap-2">
        <input
          placeholder="Volunteer Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 bg-black border border-gray-700 rounded px-3 py-1 text-sm"
        />
        <button onClick={addVolunteer} className="bg-red-600 px-3 py-1 rounded text-sm font-bold">
          Add
        </button>
      </div>
      <div className="space-y-2 max-h-40 overflow-y-auto">
        {volunteers.map((v) => (
          <div
            key={v.id}
            className="bg-black p-2 rounded flex justify-between items-center border border-gray-800"
          >
            <div>
              <div className="text-sm font-bold">{v.name}</div>
              <div className="text-[10px] text-gray-500 uppercase">
                {v.role} • {v.assignedZone}
              </div>
            </div>
            <button onClick={() => removeVolunteer(v.id)} className="text-red-900 text-xs">
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ApiKeyManager() {
  const [keys, setKeys] = useState<ApiKey[]>(() => {
    const saved = localStorage.getItem("org_api_keys");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem("org_api_keys", JSON.stringify(keys));
  }, [keys]);

  const generateKey = () => {
    const newKey: ApiKey = {
      id: genId(),
      name: `Newsroom Access ${keys.length + 1}`,
      key: `wit_live_${Math.random().toString(36).slice(2, 18)}`,
      createdAt: Date.now(),
      permissions: "read_public",
    };
    setKeys([newKey, ...keys]);
  };

  return (
    <div className="bg-gray-900 p-4 rounded-xl border-l-4 border-red-600 space-y-3 text-white">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-red-500">Newsroom API Keys</h3>
        <button
          onClick={generateKey}
          className="bg-gray-800 px-2 py-1 rounded text-[10px] uppercase font-bold text-red-400 border border-red-900"
        >
          New Key
        </button>
      </div>
      <div className="space-y-2">
        {keys.map((k) => (
          <div key={k.id} className="bg-black p-2 rounded border border-gray-800">
            <div className="text-xs font-bold text-gray-300">{k.name}</div>
            <div className="text-[10px] font-mono text-red-500 truncate">{k.key}</div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(k.key);
                alert("Copied!");
              }}
              className="text-[9px] text-gray-500 hover:text-white mt-1 underline"
            >
              Copy Key
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ------------------------------
// SECTION: Fiscal (Grant Tracker)
// ------------------------------
export function GrantTracker() {
  const [grants, setGrants] = useState<GrantApplication[]>(() => {
    const saved = localStorage.getItem("org_grants");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem("org_grants", JSON.stringify(grants));
  }, [grants]);

  const addGrant = () => {
    const g: GrantApplication = {
      id: genId(),
      name: "New Technology Grant",
      foundation: "Knight Foundation",
      amount: 25000,
      deadline: Date.now() + 14 * 86400000, // 14 days from now
      status: "drafting",
    };
    setGrants([g, ...grants]);
  };

  return (
    <div className="bg-gray-900 p-4 rounded-xl border-l-4 border-red-600 space-y-3 text-white font-sans">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-red-500">Grant Tracker</h3>
        <button onClick={addGrant} className="bg-red-600 px-2 py-1 rounded text-xs font-bold">
          + Grant
        </button>
      </div>
      <div className="space-y-2">
        {grants.map((g) => {
          const daysLeft = Math.round((g.deadline - Date.now()) / 86400000);
          return (
            <div
              key={g.id}
              className="bg-black p-3 rounded-lg border border-gray-800 flex justify-between items-center"
            >
              <div>
                <div className="text-sm font-bold">{g.name}</div>
                <div className="text-xs text-gray-500">
                  ${g.amount.toLocaleString()} • {g.foundation}
                </div>
              </div>
              <div className="text-right text-[10px]">
                <div className={daysLeft < 7 ? "text-red-500 font-bold" : "text-gray-400"}>
                  {daysLeft} Days Left
                </div>
                <div className="bg-gray-800 px-1 rounded mt-1 uppercase">{g.status}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ------------------------------
// SECTION: Main Application
// ------------------------------
export default function MainApp() {
  const [tab, setTab] = useState<"reports" | "admin" | "fiscal">("reports");

  return (
    <div className="min-h-screen bg-black text-white p-4 max-w-md mx-auto pb-24">
      <header className="mb-6">
        <h1 className="text-2xl font-black text-red-600 italic">WITNESS ORG</h1>
        <p className="text-[10px] text-gray-500 tracking-widest uppercase">
          Institutional Integrity Suite
        </p>
      </header>

      <div className="space-y-6">
        {tab === "reports" && <WhistleblowerSuite />}
        {tab === "admin" && (
          <>
            <VolunteerManager />
            <ApiKeyManager />
          </>
        )}
        {tab === "fiscal" && (
          <>
            <GrantTracker />
            <div className="bg-gray-900 p-4 rounded-xl border-l-4 border-red-600">
              <h3 className="text-red-500 font-bold text-sm">Fiscal Sponsorship</h3>
              <p className="text-[11px] text-gray-400 mt-1">
                Fiscally sponsored by Social Justice Foundation (EIN: 12-3456789). All donations are
                501(c)(3) tax-deductible.
              </p>
            </div>
          </>
        )}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-red-600 flex justify-around py-4">
        <button
          onClick={() => setTab("reports")}
          className={tab === "reports" ? "text-red-500" : "text-gray-500"}
        >
          🔒 Legal
        </button>
        <button
          onClick={() => setTab("admin")}
          className={tab === "admin" ? "text-red-500" : "text-gray-500"}
        >
          👥 Ops
        </button>
        <button
          onClick={() => setTab("fiscal")}
          className={tab === "fiscal" ? "text-red-500" : "text-gray-500"}
        >
          💰 Fiscal
        </button>
      </nav>
    </div>
  );
}
