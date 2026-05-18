// WitnessTransparencyAndCompliance.tsx
// Self-contained TypeScript React module for transparency and compliance.
// Features: Open Source Notice, Security Disclosure, Uptime Status Page,
// Changelog, DMCA Takedown, GDPR Compliance, Transparency Report,
// Disaster Recovery, Data Retention, Bug Bounty Program.
// Uses localStorage for mock data, jsPDF for PDF export.
// No external dependencies except React and jsPDF.

import React, { useState, useEffect, useCallback } from "react";
import { jsPDF } from "jspdf";

// ============================================================
// GLOBAL STYLES & DESIGN TOKENS
// ============================================================

const injectGlobalStyles = () => {
  if (typeof document === "undefined") return;
  const id = "witness-static-global";
  if (document.getElementById(id)) return;
  const style = document.createElement("style");
  style.id = id;
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Barlow+Condensed:wght@300;400;600;700;900&family=Barlow:wght@300;400;500;600&display=swap');

    :root {
      --red: #E8001C;
      --red-dim: #9B0013;
      --red-glow: rgba(232,0,28,0.18);
      --black: #080808;
      --surface: #111111;
      --surface2: #1A1A1A;
      --border: #2A2A2A;
      --white: #FFFFFF;
      --gray: #999999;
      --gray2: #555555;
      --font-mono: 'Share Tech Mono', monospace;
      --font-display: 'Barlow Condensed', sans-serif;
      --font-body: 'Barlow', sans-serif;
    }

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    .w-page {
      background: var(--black);
      color: var(--white);
      font-family: var(--font-body);
      min-height: 100vh;
      padding: 0;
    }

    .w-header {
      border-bottom: 1px solid var(--border);
      padding: 28px 32px 22px;
      position: relative;
    }

    .w-badge {
      display: inline-block;
      font-family: var(--font-mono);
      font-size: 10px;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: var(--red);
      border: 1px solid var(--red-dim);
      padding: 3px 10px;
      margin-bottom: 12px;
      background: rgba(232,0,28,0.06);
    }

    .w-title {
      font-family: var(--font-display);
      font-weight: 900;
      font-size: clamp(28px, 5vw, 48px);
      line-height: 1;
      letter-spacing: -0.01em;
      color: var(--white);
    }

    .w-subtitle {
      font-family: var(--font-body);
      font-weight: 300;
      font-size: 15px;
      color: var(--gray);
      margin-top: 8px;
      line-height: 1.5;
    }

    .w-body {
      padding: 32px;
      position: relative;
      z-index: 1;
    }

    .w-section {
      margin-bottom: 40px;
    }

    .w-section-title {
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 18px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--red);
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .w-section-title::after {
      content: '';
      flex: 1;
      height: 1px;
      background: var(--border);
    }

    .w-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 2px;
      padding: 20px 24px;
      margin-bottom: 12px;
      position: relative;
    }

    .w-card.accent::before {
      content: '';
      position: absolute;
      top: 0; left: 0;
      width: 3px; height: 100%;
      background: var(--red);
      border-radius: 2px 0 0 2px;
    }

    .w-card-title {
      font-family: var(--font-display);
      font-weight: 600;
      font-size: 16px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--white);
      margin-bottom: 8px;
    }

    .w-card-body {
      font-size: 14px;
      color: #CCCCCC;
      line-height: 1.65;
    }

    .w-mono {
      font-family: var(--font-mono);
      font-size: 12px;
      color: var(--red);
      background: rgba(232,0,28,0.08);
      border: 1px solid rgba(232,0,28,0.2);
      padding: 2px 8px;
      border-radius: 1px;
    }

    .w-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 13px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      padding: 10px 22px;
      border: none;
      cursor: pointer;
      transition: all 0.15s ease;
      text-decoration: none;
    }

    .w-btn-red {
      background: var(--red);
      color: var(--white);
    }

    .w-btn-outline {
      background: transparent;
      color: var(--white);
      border: 1px solid var(--border);
    }

    .w-input {
      width: 100%;
      background: var(--surface2);
      border: 1px solid var(--border);
      color: var(--white);
      font-family: var(--font-body);
      font-size: 14px;
      padding: 12px 16px;
      outline: none;
      border-radius: 1px;
    }

    .w-input:focus { border-color: var(--red); }

    .w-label {
      display: block;
      font-family: var(--font-mono);
      font-size: 11px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--gray);
      margin-bottom: 6px;
    }

    .w-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }

    .w-table th {
      font-family: var(--font-mono);
      font-size: 10px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--gray);
      text-align: left;
      padding: 10px 14px;
      border-bottom: 1px solid var(--border);
    }

    .w-table td {
      padding: 12px 14px;
      border-bottom: 1px solid rgba(42,42,42,0.5);
      color: #CCCCCC;
    }

    .w-dot {
      display: inline-block;
      width: 8px; height: 8px;
      border-radius: 50%;
    }

    .w-dot.green { background: #22c55e; box-shadow: 0 0 6px #22c55e; }
    .w-dot.yellow { background: #eab308; box-shadow: 0 0 6px #eab308; }
    .w-dot.red { background: var(--red); box-shadow: 0 0 6px var(--red); }

    .w-pill {
      display: inline-block;
      font-family: var(--font-mono);
      font-size: 10px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      padding: 3px 10px;
      border-radius: 1px;
    }

    .w-pill.green { background: rgba(34,197,94,0.12); color: #22c55e; border: 1px solid rgba(34,197,94,0.3); }
    .w-pill.yellow { background: rgba(234,179,8,0.12); color: #eab308; border: 1px solid rgba(234,179,8,0.3); }
    .w-pill.red { background: rgba(232,0,28,0.12); color: var(--red); border: 1px solid rgba(232,0,28,0.3); }

    .w-main-tabs {
      display: flex;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      overflow-x: auto;
      padding: 0 8px;
    }

    .w-main-tab {
      font-family: var(--font-mono);
      font-size: 10px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      padding: 14px 14px;
      border: none;
      background: none;
      color: var(--gray2);
      cursor: pointer;
      border-bottom: 2px solid transparent;
      white-space: nowrap;
    }

    .w-main-tab.active {
      color: var(--red);
      border-bottom-color: var(--red);
    }
  `;
  document.head.appendChild(style);
};

// ============================================================
// SHARED UI COMPONENTS
// ============================================================

function Toast({ message, visible }: { message: string; visible: boolean }) {
  if (!visible) return null;
  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        background: "#22c55e",
        color: "#000",
        padding: "12px 20px",
        fontWeight: "bold",
        zIndex: 9999,
        textTransform: "uppercase",
      }}
    >
      ✓ {message}
    </div>
  );
}

function PageHeader({
  badge,
  title,
  subtitle,
}: {
  badge: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="w-header">
      <div className="w-badge">{badge}</div>
      <h1 className="w-title">{title}</h1>
      <p className="w-subtitle">{subtitle}</p>
    </div>
  );
}

// ------------------------------
// SECTION: TYPES & HELPERS
// ------------------------------
interface ServiceStatus {
  id: string;
  name: string;
  status: "operational" | "degraded" | "outage";
  uptime90: number;
}

interface Incident {
  date: string;
  service: string;
  duration: string;
  resolution: string;
}

interface ChangelogEntry {
  version: string;
  date: string;
  new: string[];
  improvements: string[];
  fixes: string[];
}

interface DMCARequest {
  id: string;
  name: string;
  email: string;
  copyrightWork: string;
  infringingURL: string;
  submittedAt: number;
}

interface GDPRRequest {
  id: string;
  right: string;
  email: string;
  description: string;
  submittedAt: number;
}

interface BugReport {
  id: string;
  vulnerability: string;
  steps: string;
  impact: string;
  researcherEmail: string;
  trackingNumber: string;
  submittedAt: number;
}

const genId = () => `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

const getServiceStatuses = (): ServiceStatus[] => {
  const stored = typeof window !== "undefined" ? localStorage.getItem("witness_statuses") : null;
  if (stored) return JSON.parse(stored);
  return [
    { id: "rec", name: "Recording and encryption", status: "operational", uptime90: 99.99 },
    { id: "s3", name: "Cloud backup (S3)", status: "operational", uptime90: 99.95 },
    { id: "supabase", name: "Authentication (Supabase)", status: "operational", uptime90: 99.98 },
    { id: "mux", name: "Livestreaming (Mux)", status: "operational", uptime90: 99.97 },
    { id: "map", name: "Map service (Leaflet)", status: "operational", uptime90: 99.99 },
    { id: "push", name: "Push notifications", status: "operational", uptime90: 99.9 },
    { id: "twilio", name: "SMS alerts (Twilio)", status: "operational", uptime90: 99.99 },
    { id: "verify", name: "Public verify page", status: "operational", uptime90: 99.99 },
  ];
};

const getIncidents = (): Incident[] => {
  const stored = typeof window !== "undefined" ? localStorage.getItem("witness_incidents") : null;
  if (stored) return JSON.parse(stored);
  return [
    {
      date: "2025-04-15",
      service: "Push notifications",
      duration: "2 hours",
      resolution: "Fixed API rate limiting",
    },
    {
      date: "2025-03-10",
      service: "Mux",
      duration: "45 minutes",
      resolution: "Upstream provider issue",
    },
  ];
};

const saveServiceStatuses = (statuses: ServiceStatus[]) =>
  localStorage.setItem("witness_statuses", JSON.stringify(statuses));
const saveIncidents = (incidents: Incident[]) =>
  localStorage.setItem("witness_incidents", JSON.stringify(incidents));

// ------------------------------
// SECTION: OPEN SOURCE NOTICE
// ------------------------------
export const OpenSourceNotice: React.FC = () => {
  return (
    <div className="w-card accent">
      <h3 className="w-card-title">Open Source Notice</h3>
      <div className="w-card-body">
        <p>Witness R.E.P's core cryptographic modules are open source under the MIT License.</p>
        <ul style={{ color: "#ccc", marginBottom: 16 }}>
          <li>✅ AES‑256‑GCM encryption module</li>
          <li>✅ SHA‑256 hashing module</li>
          <li>✅ Witness Certificate generator</li>
        </ul>
        <p>
          GitHub:{" "}
          <a href="https://github.com/witness-rep/core" target="_blank" rel="noreferrer">
            github.com/witness-rep/core
          </a>
        </p>
        <p>
          Open source means anyone can inspect, audit, and verify the code that protects your
          recordings. This makes the encryption more trustworthy than closed‑source alternatives.
        </p>
        <button
          onClick={() => window.open("https://github.com/witness-rep/core", "_blank")}
          className="w-btn w-btn-red"
        >
          View Source
        </button>
      </div>
    </div>
  );
};

// ------------------------------
// SECTION: SECURITY DISCLOSURE
// ------------------------------
export const SecurityDisclosure: React.FC = () => {
  const [lastAudit, setLastAudit] = useState(
    () =>
      (typeof window !== "undefined" ? localStorage.getItem("witness_last_audit_date") : null) ||
      "2025-01-15",
  );

  const updateAudit = () => {
    const newDate = prompt("Enter new audit date (YYYY-MM-DD)", lastAudit);
    if (newDate) {
      localStorage.setItem("witness_last_audit_date", newDate);
      setLastAudit(newDate);
    }
  };

  return (
    <div className="w-card accent">
      <h3 className="w-card-title">Security Disclosure</h3>
      <div className="w-card-body">
        <div style={{ marginBottom: 16 }}>
          <strong>Last independent security audit:</strong> {lastAudit}
          <button
            onClick={updateAudit}
            className="w-btn w-btn-outline"
            style={{ marginLeft: 12, padding: "4px 10px", fontSize: 10 }}
          >
            Update (admin)
          </button>
        </div>
        <p>
          <strong>AES‑256‑GCM:</strong> Military‑grade encryption – your recordings are scrambled
          with a key derived from your PIN. Even if our servers are hacked, the encrypted data is
          useless without your PIN.
        </p>
        <p>
          <strong>SHA‑256:</strong> Creates a unique digital fingerprint of your recording. Any
          alteration, even a single pixel, changes the fingerprint.
        </p>
        <p>
          <strong>PBKDF2:</strong> Turns your PIN into an unguessable encryption key, protecting
          against brute‑force attacks.
        </p>
        <p>
          <strong>Decoy PIN:</strong> Entering a different passcode shows a fake vault, protecting
          your real recordings.
        </p>
        <p>
          <strong>Zero-Knowledge:</strong> Recordings are encrypted client‑side; we never have the
          keys. Even Witness R.E.P employees cannot read your recordings.
        </p>
      </div>
    </div>
  );
};

// ------------------------------
// SECTION: UPTIME STATUS PAGE
// ------------------------------
export const UptimeStatusPage: React.FC = () => {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [adminMode, setAdminMode] = useState(false);
  const [selectedService, setSelectedService] = useState<string>("");
  const [newStatus, setNewStatus] = useState<"operational" | "degraded" | "outage">("operational");

  useEffect(() => {
    setServices(getServiceStatuses());
    setIncidents(getIncidents());
  }, []);

  const updateServiceStatus = () => {
    const updated = services.map((s) =>
      s.id === selectedService ? { ...s, status: newStatus } : s,
    );
    setServices(updated);
    saveServiceStatuses(updated);
  };

  const addIncident = () => {
    const date = new Date().toISOString().substring(0, 10);
    const newInc: Incident = {
      date,
      service: selectedService || "All Services",
      duration: "Unknown",
      resolution: "Investigating",
    };
    const updated = [newInc, ...incidents];
    setIncidents(updated);
    saveIncidents(updated);
  };

  const getStatusColor = (status: string) => {
    if (status === "operational") return "#4caf50";
    if (status === "degraded") return "#ff9800";
    return "#d32f2f";
  };

  return (
    <div className="w-card accent">
      <h3 className="w-card-title">Uptime Status Page</h3>
      <div className="w-card-body">
        <button
          onClick={() => setAdminMode(!adminMode)}
          className="w-btn w-btn-outline"
          style={{ marginBottom: 16 }}
        >
          Admin Mode (toggle)
        </button>
        {adminMode && (
          <div
            style={{
              marginTop: 8,
              display: "flex",
              gap: 8,
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="w-input"
              style={{ width: "auto" }}
            >
              <option value="">Select service</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as any)}
              className="w-input"
              style={{ width: "auto" }}
            >
              <option value="operational">Operational</option>
              <option value="degraded">Degraded</option>
              <option value="outage">Outage</option>
            </select>
            <button onClick={updateServiceStatus} className="w-btn w-btn-red">
              Update
            </button>
            <button onClick={addIncident} className="w-btn w-btn-outline">
              Add Incident
            </button>
          </div>
        )}
        <table className="w-table">
          <thead>
            <tr>
              <th>Service</th>
              <th>Status</th>
              <th>90‑day uptime</th>
            </tr>
          </thead>
          <tbody>
            {services.map((s) => (
              <tr key={s.id}>
                <td>
                  <strong>{s.name}</strong>
                </td>
                <td style={{ color: getStatusColor(s.status) }}>● {s.status}</td>
                <td>{s.uptime90}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: 24 }}>
          <strong>Recent incidents</strong>
          {incidents.slice(0, 5).map((inc, i) => (
            <div
              key={i}
              style={{
                fontSize: 12,
                marginTop: 8,
                borderLeft: "2px solid var(--border)",
                paddingLeft: 12,
              }}
            >
              <div>
                📅 {inc.date}: {inc.service}
              </div>
              <div style={{ color: "var(--gray)" }}>
                {inc.duration} – {inc.resolution}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ------------------------------
// SECTION: CHANGELOG
// ------------------------------
const changelogData: ChangelogEntry[] = [
  {
    version: "1.2.0",
    date: "2025-05-01",
    new: ["Loop recording mode", "Dark mode improvements"],
    improvements: ["Faster thumbnail loading"],
    fixes: ["GPS accuracy on iPhone 15"],
  },
  {
    version: "1.1.0",
    date: "2025-04-01",
    new: ["SOS escalation", "Witness network"],
    improvements: ["Audio enhancement", "Better battery usage"],
    fixes: ["Crash on Android 14"],
  },
  {
    version: "1.0.0",
    date: "2025-03-01",
    new: ["Initial release", "Camera, vault, SOS"],
    improvements: [],
    fixes: [],
  },
];
const currentVersion = "1.2.0";

export const Changelog: React.FC = () => {
  const [showWhatsNew, setShowWhatsNew] = useState(() => {
    if (typeof window === "undefined") return false;
    const lastSeen = localStorage.getItem("witness_last_seen_version");
    if (lastSeen !== currentVersion) {
      localStorage.setItem("witness_last_seen_version", currentVersion);
      return true;
    }
    return false;
  });

  return (
    <div className="w-card accent">
      <h3 className="w-card-title">Changelog</h3>
      <div className="w-card-body">
        <div style={{ marginBottom: 16 }}>
          Current version:{" "}
          <span style={{ color: "var(--red)", fontWeight: "bold" }}>{currentVersion}</span>
        </div>
        {showWhatsNew && (
          <div
            style={{
              background: "rgba(232,0,28,0.1)",
              border: "1px solid var(--red)",
              padding: 16,
              borderRadius: 2,
              marginBottom: 24,
            }}
          >
            <strong>✨ What's new in {currentVersion}</strong>
            <ul style={{ marginTop: 8, marginBottom: 0 }}>
              {changelogData
                .find((e) => e.version === currentVersion)
                ?.new.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
            </ul>
            <button
              onClick={() => setShowWhatsNew(false)}
              className="w-btn w-btn-outline"
              style={{ marginTop: 12, padding: "4px 10px", fontSize: 10 }}
            >
              Dismiss
            </button>
          </div>
        )}
        <div className="space-y-4">
          {changelogData.map((entry) => (
            <div
              key={entry.version}
              style={{
                borderBottom: "1px solid var(--border)",
                paddingBottom: 16,
                marginBottom: 16,
              }}
            >
              <div style={{ fontSize: 16, marginBottom: 8 }}>
                <strong>v{entry.version}</strong> –{" "}
                <span style={{ fontSize: 12, color: "var(--gray)" }}>{entry.date}</span>
              </div>
              {entry.new.length > 0 && <div>✨ New: {entry.new.join(", ")}</div>}
              {entry.improvements.length > 0 && (
                <div>🔧 Improvements: {entry.improvements.join(", ")}</div>
              )}
              {entry.fixes.length > 0 && <div>🐛 Fixes: {entry.fixes.join(", ")}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ------------------------------
// SECTION: DMCA TAKEDOWN PROCESS
// ------------------------------
export const DMCATakedown: React.FC = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [work, setWork] = useState("");
  const [url, setUrl] = useState("");

  const submit = () => {
    if (!name || !email || !work || !url) {
      alert("Please fill in all fields.");
      return;
    }
    const req: DMCARequest = {
      id: genId(),
      name,
      email,
      copyrightWork: work,
      infringingURL: url,
      submittedAt: Date.now(),
    };
    const stored = localStorage.getItem("witness_dmca_requests");
    const list = stored ? JSON.parse(stored) : [];
    list.push(req);
    localStorage.setItem("witness_dmca_requests", JSON.stringify(list));
    alert(`DMCA request submitted. Reference: ${req.id}`);
    setName("");
    setEmail("");
    setWork("");
    setUrl("");
  };

  return (
    <div className="w-card accent">
      <h3 className="w-card-title">DMCA Takedown Notice</h3>
      <div className="w-card-body">
        <p>
          Recordings of police performing duties are generally protected public interest. DMCA
          claims lacking a legitimate copyright basis will be challenged.
        </p>
        <div className="w-field">
          <label className="w-label">Full name</label>
          <input className="w-input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="w-field">
          <label className="w-label">Email</label>
          <input className="w-input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="w-field">
          <label className="w-label">Description of work</label>
          <input className="w-input" value={work} onChange={(e) => setWork(e.target.value)} />
        </div>
        <div className="w-field">
          <label className="w-label">Infringing URL</label>
          <input className="w-input" value={url} onChange={(e) => setUrl(e.target.value)} />
        </div>
        <button onClick={submit} className="w-btn w-btn-red">
          Submit Notice
        </button>
      </div>
    </div>
  );
};

// ------------------------------
// SECTION: GDPR COMPLIANCE
// ------------------------------
export const GDPRCompliance: React.FC = () => {
  const [right, setRight] = useState("");
  const [email, setEmail] = useState("");

  const submitGDPR = () => {
    if (!right || !email) return;
    const req: GDPRRequest = {
      id: genId(),
      right,
      email,
      description: "",
      submittedAt: Date.now(),
    };
    const stored = localStorage.getItem("witness_gdpr_requests");
    const list = stored ? JSON.parse(stored) : [];
    list.push(req);
    localStorage.setItem("witness_gdpr_requests", JSON.stringify(list));
    alert(`GDPR request logged. ID: ${req.id}`);
    setEmail("");
    setRight("");
  };

  return (
    <div className="w-card accent">
      <h3 className="w-card-title">GDPR Data Request</h3>
      <div className="w-card-body">
        <div className="w-field">
          <label className="w-label">Right to exercise</label>
          <select value={right} onChange={(e) => setRight(e.target.value)} className="w-input">
            <option value="">Select right...</option>
            <option value="access">Right to Access</option>
            <option value="erasure">Right to Erasure (Forget Me)</option>
            <option value="portability">Right to Data Portability</option>
            <option value="objection">Right to Objection</option>
          </select>
        </div>
        <div className="w-field">
          <label className="w-label">Account Email</label>
          <input className="w-input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <button onClick={submitGDPR} className="w-btn w-btn-red">
          Submit Request
        </button>
      </div>
    </div>
  );
};

// ------
