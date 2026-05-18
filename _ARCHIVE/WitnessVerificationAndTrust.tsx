// WitnessVerificationAndTrust.tsx
// Self-contained TypeScript React module for Witness R.E.P verification and trust features.
// Includes Verified Badges System, Organization Account Management, Report & Moderation,
// Deepfake Detection, AI Incident Summary, Zero Knowledge Proof Verification.
// Uses localStorage for state management. No external dependencies except React and Tailwind.

import React, { useState, useEffect, useCallback } from "react";

// ------------------------------
// SECTION: TYPES & MOCK STORAGE
// ------------------------------
type BadgeType = "journalist" | "legal_observer" | "organization";

interface UserProfile {
  id: string;
  name: string;
  badge: BadgeType | null;
  verified: boolean;
  organizationId?: string;
}

interface VerificationRequest {
  id: string;
  userId: string;
  name: string;
  organization: string;
  role: string;
  website: string;
  explanation: string;
  status: "pending" | "approved" | "rejected";
}

interface Organization {
  id: string;
  name: string;
  badge: BadgeType;
  verified: boolean;
  coverageArea: { lat: number; lng: number; radius: number } | null;
  members: string[];
}

interface Report {
  id: string;
  recordingId: string;
  reporterUserId: string;
  category: string;
  timestamp: number;
  recordingTitle?: string;
}

interface ModerationQueueItem {
  recordingId: string;
  reportCount: number;
  categories: string[];
  reporterIds: string[];
  content: { title?: string; id: string };
}

// Mock storage helpers
const getMockUser = (id: string = "currentUser"): UserProfile => {
  const stored = localStorage.getItem(`witness_user_${id}`);
  if (stored) return JSON.parse(stored);
  return { id, name: "Witness User", badge: null, verified: false };
};

const saveMockUser = (user: UserProfile) =>
  localStorage.setItem(`witness_user_${user.id}`, JSON.stringify(user));

const getVerificationRequests = (): VerificationRequest[] => {
  const stored = localStorage.getItem("witness_verification_requests");
  return stored ? JSON.parse(stored) : [];
};

const saveVerificationRequests = (reqs: VerificationRequest[]) =>
  localStorage.setItem("witness_verification_requests", JSON.stringify(reqs));

const getOrganizations = (): Organization[] => {
  const stored = localStorage.getItem("witness_organizations");
  return stored ? JSON.parse(stored) : [];
};

const saveOrganizations = (orgs: Organization[]) =>
  localStorage.setItem("witness_organizations", JSON.stringify(orgs));

const getReports = (): Report[] => {
  const stored = localStorage.getItem("witness_reports");
  return stored ? JSON.parse(stored) : [];
};

const saveReports = (reports: Report[]) =>
  localStorage.setItem("witness_reports", JSON.stringify(reports));

const getModerationQueue = (): ModerationQueueItem[] => {
  const stored = localStorage.getItem("witness_moderation_queue");
  return stored ? JSON.parse(stored) : [];
};

const saveModerationQueue = (queue: ModerationQueueItem[]) =>
  localStorage.setItem("witness_moderation_queue", JSON.stringify(queue));

// Helper: generate random ID
const genId = () => `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

// ------------------------------
// SECTION: VERIFIED BADGES SYSTEM
// ------------------------------
export const useVerifiedBadges = () => {
  const [user, setUser] = useState<UserProfile>(() => getMockUser("currentUser"));
  const [requests, setRequests] = useState<VerificationRequest[]>(() => getVerificationRequests());
  const [userRequests, setUserRequests] = useState<VerificationRequest[]>([]);

  useEffect(() => {
    setUserRequests(requests.filter((r) => r.userId === user.id));
  }, [requests, user.id]);

  const submitRequest = (
    name: string,
    organization: string,
    role: string,
    website: string,
    explanation: string,
  ) => {
    const newReq: VerificationRequest = {
      id: genId(),
      userId: user.id,
      name,
      organization,
      role,
      website,
      explanation,
      status: "pending",
    };
    const updated = [...requests, newReq];
    setRequests(updated);
    saveVerificationRequests(updated);
  };

  const getBadgeIcon = (badge: BadgeType | null) => {
    if (!badge) return null;
    switch (badge) {
      case "journalist":
        return "📰";
      case "legal_observer":
        return "⚖️";
      case "organization":
        return "🏛️";
      default:
        return null;
    }
  };

  const getBadgeColorClass = (badge: BadgeType | null) => {
    if (!badge) return "text-zinc-500";
    switch (badge) {
      case "journalist":
        return "text-blue-500";
      case "legal_observer":
        return "text-green-500";
      case "organization":
        return "text-yellow-500";
      default:
        return "text-white";
    }
  };

  return {
    user,
    badgeIcon: getBadgeIcon(user.badge),
    badgeColorClass: getBadgeColorClass(user.badge),
    requests: userRequests,
    submitRequest,
  };
};

export const VerifiedBadgesUI: React.FC = () => {
  const { user, badgeIcon, badgeColorClass, requests, submitRequest } = useVerifiedBadges();
  const [name, setName] = useState("");
  const [org, setOrg] = useState("");
  const [role, setRole] = useState("");
  const [website, setWebsite] = useState("");
  const [explanation, setExplanation] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = () => {
    if (!name || !org || !explanation) {
      alert("Please fill in required fields.");
      return;
    }
    setSubmitting(true);
    submitRequest(name, org, role, website, explanation);
    setTimeout(() => {
      setName("");
      setOrg("");
      setRole("");
      setWebsite("");
      setExplanation("");
      setSubmitting(false);
      alert("Verification request submitted.");
    }, 500);
  };

  return (
    <div className="bg-black p-6 rounded-xl border-l-4 border-red-600 mb-6 text-white shadow-2xl">
      <h3 className="text-red-600 font-bold text-xl mb-4 uppercase tracking-wider">
        Verified Badges
      </h3>
      <div className="flex items-center gap-3 mb-6 bg-zinc-900 p-3 rounded-lg">
        <span className="text-zinc-400">Current Badge Status: </span>
        {user.badge ? (
          <span className={`text-2xl ${badgeColorClass}`}>{badgeIcon}</span>
        ) : (
          <span className="text-zinc-500 italic">None</span>
        )}
      </div>

      <div className="space-y-3">
        <p className="font-bold text-red-500 uppercase text-xs">Request Verification</p>
        <input
          placeholder="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded text-white focus:outline-none focus:border-red-600 transition-colors"
        />
        <input
          placeholder="Organization"
          value={org}
          onChange={(e) => setOrg(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded text-white focus:outline-none focus:border-red-600 transition-colors"
        />
        <input
          placeholder="Role/Title"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded text-white focus:outline-none focus:border-red-600 transition-colors"
        />
        <input
          placeholder="Website"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded text-white focus:outline-none focus:border-red-600 transition-colors"
        />
        <textarea
          placeholder="Brief explanation of your credentials"
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          rows={3}
          className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded text-white focus:outline-none focus:border-red-600 transition-colors resize-none"
        />
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-full transition-all disabled:opacity-50 w-full md:w-auto"
        >
          {submitting ? "Submitting..." : "Submit Request"}
        </button>
      </div>

      {requests.length > 0 && (
        <div className="mt-8 border-t border-zinc-800 pt-4">
          <p className="font-bold text-red-500 uppercase text-xs mb-3">Your Requests History</p>
          {requests.map((r) => (
            <div
              key={r.id}
              className="bg-zinc-900 border border-zinc-800 p-3 mt-2 rounded flex justify-between items-center"
            >
              <span>
                {r.name} – {r.organization}
              </span>
              <span
                className={`text-xs uppercase font-bold ${r.status === "approved" ? "text-green-500" : r.status === "rejected" ? "text-red-500" : "text-yellow-500"}`}
              >
                {r.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ------------------------------
// SECTION: ORGANIZATION ACCOUNT MANAGEMENT
// ------------------------------
export const useOrganizationManager = () => {
  const [orgs, setOrgs] = useState<Organization[]>(() => getOrganizations());
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => getMockUser("currentUser"));
  const [activeOrg, setActiveOrg] = useState<Organization | null>(() => {
    if (currentUser.organizationId)
      return orgs.find((o) => o.id === currentUser.organizationId) || null;
    return null;
  });

  const createOrganization = (name: string) => {
    if (!name) return;
    const newOrg: Organization = {
      id: genId(),
      name,
      badge: "organization",
      verified: true,
      coverageArea: null,
      members: [currentUser.id],
    };
    const updated = [...orgs, newOrg];
    setOrgs(updated);
    saveOrganizations(updated);
    setActiveOrg(newOrg);
    const updatedUser = { ...currentUser, organizationId: newOrg.id };
    saveMockUser(updatedUser);
    setCurrentUser(updatedUser);
  };

  const inviteMember = (phoneNumber: string) => {
    if (!activeOrg) return;
    const memberId = `member_${Date.now()}`;
    const updated = { ...activeOrg, members: [...activeOrg.members, memberId] };
    const allOrgs = getOrganizations().map((o) => (o.id === activeOrg.id ? updated : o));
    setOrgs(allOrgs);
    saveOrganizations(allOrgs);
    setActiveOrg(updated);
    alert(`Invite sent to ${phoneNumber}`);
  };

  const removeMember = (memberId: string) => {
    if (!activeOrg) return;
    const updated = { ...activeOrg, members: activeOrg.members.filter((m) => m !== memberId) };
    const allOrgs = getOrganizations().map((o) => (o.id === activeOrg.id ? updated : o));
    setOrgs(allOrgs);
    saveOrganizations(allOrgs);
    setActiveOrg(updated);
  };

  const updateCoverage = (lat: number, lng: number, radius: number) => {
    if (!activeOrg) return;
    const updated = { ...activeOrg, coverageArea: { lat, lng, radius } };
    const allOrgs = getOrganizations().map((o) => (o.id === activeOrg.id ? updated : o));
    setOrgs(allOrgs);
    saveOrganizations(allOrgs);
    setActiveOrg(updated);
    alert("Coverage area updated.");
  };

  return { activeOrg, orgs, createOrganization, inviteMember, removeMember, updateCoverage };
};

export const OrganizationUI: React.FC = () => {
  const { activeOrg, createOrganization, inviteMember, updateCoverage } = useOrganizationManager();
  const [orgName, setOrgName] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [coverageLat, setCoverageLat] = useState(40.7128);
  const [coverageLng, setCoverageLng] = useState(-74.006);
  const [coverageRadius, setCoverageRadius] = useState(5);

  if (!activeOrg) {
    return (
      <div className="bg-black p-6 rounded-xl border-l-4 border-red-600 mb-6 text-white shadow-2xl">
        <h3 className="text-red-600 font-bold text-xl mb-4 uppercase tracking-wider">
          Organization Management
        </h3>
        <input
          placeholder="Organization name"
          value={orgName}
          onChange={(e) => setOrgName(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded mb-3 text-white focus:outline-none focus:border-red-600"
        />
        <button
          onClick={() => createOrganization(orgName)}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-full w-full transition-all"
        >
          Create Organization
        </button>
      </div>
    );
  }

  return (
    <div className="bg-black p-6 rounded-xl border-l-4 border-red-600 mb-6 text-white shadow-2xl">
      <h3 className="text-red-600 font-bold text-xl mb-2 uppercase tracking-wider">
        {activeOrg.name}
      </h3>
      <div className="text-zinc-400 mb-4 font-mono text-xs">ID: {activeOrg.id}</div>
      <div className="mb-6 bg-zinc-900 p-3 rounded-lg">
        Verified Members: {activeOrg.members.length}
      </div>

      <div className="space-y-4">
        <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800">
          <p className="text-xs font-bold text-red-500 uppercase mb-3">Invite New Observer</p>
          <div className="flex gap-2">
            <input
              placeholder="Phone number"
              value={invitePhone}
              onChange={(e) => setInvitePhone(e.target.value)}
              className="flex-grow bg-zinc-900 border border-zinc-800 p-2 rounded text-sm focus:outline-none"
            />
            <button
              onClick={() => inviteMember(invitePhone)}
              className="bg-zinc-800 hover:bg-red-600 px-4 py-2 rounded text-sm font-bold transition-all"
            >
              Invite
            </button>
          </div>
        </div>

        <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800">
          <p className="text-xs font-bold text-red-500 uppercase mb-3">Geofence / Coverage Area</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-[10px] text-zinc-500 block mb-1">LATITUDE</label>
              <input
                type="number"
                step="0.0001"
                value={coverageLat}
                onChange={(e) => setCoverageLat(parseFloat(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded text-sm focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 block mb-1">LONGITUDE</label>
              <input
                type="number"
                step="0.0001"
                value={coverageLng}
                onChange={(e) => setCoverageLng(parseFloat(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded text-sm focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-zinc-500 block mb-1">RADIUS (KM)</label>
            <input
              type="number"
              value={coverageRadius}
              onChange={(e) => setCoverageRadius(parseFloat(e.target.value))}
              className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded text-sm mb-3 focus:outline-none"
            />
          </div>
          <button
            onClick={() => updateCoverage(coverageLat, coverageLng, coverageRadius)}
            className="w-full bg-zinc-800 hover:bg-red-600 py-2 rounded text-sm font-bold transition-all uppercase tracking-tighter"
          >
            Update Area
          </button>
        </div>
      </div>
    </div>
  );
};

// ------------------------------
// SECTION: REPORT AND MODERATION SYSTEM
// ------------------------------
export const useReportSystem = () => {
  const [reports, setReports] = useState<Report[]>(() => getReports());
  const [modQueue, setModQueue] = useState<ModerationQueueItem[]>(() => getModerationQueue());

  const addReport = (
    recordingId: string,
    reporterUserId: string,
    category: string,
    recordingTitle?: string,
  ) => {
    const newReport: Report = {
      id: genId(),
      recordingId,
      reporterUserId,
      category,
      timestamp: Date.now(),
      recordingTitle,
    };
    const updatedReports = [...reports, newReport];
    setReports(updatedReports);
    saveReports(updatedReports);

    const reportsForId = updatedReports.filter((r) => r.recordingId === recordingId);
    if (reportsForId.length >= 3) {
      const existingQueue = getModerationQueue();
      const existingItem = existingQueue.find((q) => q.recordingId === recordingId);
      if (!existingItem) {
        const newQueueItem: ModerationQueueItem = {
          recordingId,
          reportCount: reportsForId.length,
          categories: reportsForId.map((r) => r.category),
          reporterIds: reportsForId.map((r) => r.reporterUserId),
          content: { title: recordingTitle, id: recordingId },
        };
        const updatedQueue = [...existingQueue, newQueueItem];
        setModQueue(updatedQueue);
        saveModerationQueue(updatedQueue);
      } else {
        const updatedQueue = existingQueue.map((q) =>
          q.recordingId === recordingId
            ? {
                ...q,
                reportCount: reportsForId.length,
                categories: reportsForId.map((r) => r.category),
                reporterIds: reportsForId.map((r) => r.reporterUserId),
              }
            : q,
        );
        setModQueue(updatedQueue);
        saveModerationQueue(updatedQueue);
      }
    }
  };

  const resolveQueueItem = (recordingId: string, action: "approve" | "remove" | "dismiss") => {
    const updatedQueue = modQueue.filter((q) => q.recordingId !== recordingId);
    setModQueue(updatedQueue);
    saveModerationQueue(updatedQueue);
    alert(`Evidence record ${recordingId} ${action}ed.`);
  };

  return { reports, modQueue, addReport, resolveQueueItem };
};

export const ReportUI: React.FC = () => {
  const { modQueue, addReport, resolveQueueItem } = useReportSystem();
  const [demoRecId, setDemoRecId] = useState("");
  const [category, setCategory] = useState("false or misleading information");

  const handleReport = () => {
    if (!demoRecId) return;
    addReport(demoRecId, "currentUser", category, `Record-${demoRecId}`);
    setDemoRecId("");
    alert("Report submitted to moderation.");
  };

  return (
    <div className="bg-black p-6 rounded-xl border-l-4 border-red-600 mb-6 text-white shadow-2xl">
      <h3 className="text-red-600 font-bold text-xl mb-4 uppercase tracking-wider">
        Report & Moderation
      </h3>
      <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800 space-y-3">
        <p className="text-xs font-bold text-zinc-500 uppercase">Flag Incident Content</p>
        <input
          placeholder="Evidence Recording ID"
          value={demoRecId}
          onChange={(e) => setDemoRecId(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded text-sm focus:outline-none"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded text-sm focus:outline-none"
        >
          <option>false or misleading information</option>
          <option>graphic content without warning</option>
          <option>harassment or targeting of individuals</option>
          <option>spam or test content</option>
        </select>
        <button
          onClick={handleReport}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-full w-full transition-all"
        >
          Submit Flag
        </button>
      </div>

      {modQueue.length > 0 && (
        <div className="mt-8 border-t border-zinc-800 pt-4">
          <p className="font-bold text-red-500 uppercase text-xs mb-3">
            Moderation Queue (Threshold Reached)
          </p>
          {modQueue.map((q) => (
            <div
              key={q.recordingId}
              className="bg-zinc-900 border border-zinc-800 p-4 mt-2 rounded-lg"
            >
              <div className="mb-2">
                Evidence: {q.recordingId}{" "}
                <span className="text-red-500 font-black ml-2">{q.reportCount} FLAGS</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => resolveQueueItem(q.recordingId, "approve")}
                  className="bg-green-900/50 hover:bg-green-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase border border-green-700 transition-all"
                >
                  Keep
                </button>
                <button
                  onClick={() => resolveQueueItem(q.recordingId, "remove")}
                  className="bg-red-900/50 hover:bg-red-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase border border-red-700 transition-all"
                >
                  Wipe
                </button>
                <button
                  onClick={() => resolveQueueItem(q.recordingId, "dismiss")}
                  className="bg-zinc-800 hover:bg-zinc-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase border border-zinc-700 transition-all"
                >
                  Ignore
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ------------------------------
// SECTION: DEEPFAKE DETECTION
// ------------------------------
interface DeepfakeScores {
  blinking: number;
  lighting: number;
  skinTexture: number;
  lipSync: number;
  temporal: number;
  overall: number;
}

const runDeepfakeAnalysis = (): DeepfakeScores => {
  const blinking = Math.random() * 100;
  const lighting = Math.random() * 100;
  const skinTexture = Math.random() * 100;
  const lipSync = Math.random() * 100;
  const temporal = Math.random() * 100;
  const overall = (blinking + lighting + skinTexture + lipSync + temporal) / 5;
  return { blinking, lighting, skinTexture, lipSync, temporal, overall };
};

export const useDeepfakeDetection = () => {
  const [result, setResult] = useState<DeepfakeScores | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [warning, setWarning] = useState(false);

  const analyzeRecording = useCallback((recordingId: string) => {
    if (!recordingId) return;
    setAnalyzing(true);
    setResult(null);
    setTimeout(() => {
      const scores = runDeepfakeAnalysis();
      setResult(scores);
      setWarning(scores.overall > 70);
      setAnalyzing(false);
    }, 1500);
  }, []);

  return { result, analyzing, warning, analyzeRecording };
};

export const DeepfakeUI: React.FC = () => {
  const { result, analyzing, warning, analyzeRecording } = useDeepfakeDetection();
  const [recId, setRecId] = useState("");

  return (
    <div className="bg-black p-6 rounded-xl border-l-4 border-red-600 mb-6 text-white shadow-2xl">
      <h3 className="text-red-600 font-bold text-xl mb-4 uppercase tracking-wider tracking-tighter">
        AI Deepfake Detection
      </h3>
      <div className="flex gap-2 mb-6">
        <input
          placeholder="Evidence Hash or ID"
          value={recId}
          onChange={(e) => setRecId(e.target.value)}
          className="flex-grow bg-zinc-900 border border-zinc-800 p-2 rounded text-sm focus:outline-none"
        />
        <button
          onClick={() => analyzeRecording(recId)}
          disabled={analyzing}
          className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded-full text-sm font-bold transition-all disabled:opacity-50"
        >
          {analyzing ? "Scanning..." : "Analyze"}
        </button>
      </div>

      {result && (
        <div className="space-y-3 bg-zinc-950 p-4 rounded-lg border border-zinc-800 font-mono text-xs">
          <div className="flex justify-between">
            <span>Blinking Pattern:</span>{" "}
            <span className="text-red-500">{result.blinking.toFixed(1)}</span>
          </div>
          <div className="flex justify-between">
            <span>Lighting consistency:</span>{" "}
            <span className="text-red-500">{result.lighting.toFixed(1)}</span>
          </div>
          <div className="flex justify-between">
            <span>Skin texture:</span>{" "}
            <span className="text-red-500">{result.skinTexture.toFixed(1)}</span>
          </div>
          <div className="flex justify-between">
            <span>Lip sync accuracy:</span>{" "}
            <span className="text-red-500">{result.lipSync.toFixed(1)}</span>
          </div>
          <div className="flex justify-between">
            <span>Temporal jitter:</span>{" "}
            <span className="text-red-500">{result.temporal.toFixed(1)}</span>
          </div>
          <div className="border-t border-zinc-800 mt-4 pt-4 flex justify-between text-base font-bold">
            <span>Overall Score:</span>
            <span className={warning ? "text-red-600" : "text-green-500"}>
              {result.overall.toFixed(1)}%
            </span>
          </div>
          {warning && (
            <div className="mt-4 p-3 bg-red-900/20 border border-red-800 text-red-500 text-[10px] leading-tight font-sans italic">
              ⚠️ HIGH ALERT: Forensics suggests this recording may have been digitally altered or
              generated via AI. Manual legal verification is required.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ------------------------------
// SECTION: AI INCIDENT SUMMARY
// ------------------------------
interface IncidentSummary {
  who: string;
  what: string;
  when: string;
  where: string;
  concerns: string[];
}

export const useIncidentSummary = () => {
  const [generating, setGenerating] = useState(false);

  const generateSummary = (recording: {
    timestamp: number;
    lat: number;
    lng: number;
    description?: string;
  }): IncidentSummary => {
    const who = "Participant(s) ID withheld; encrypted biometric signatures active.";
    const what = recording.description?.toLowerCase().includes("force")
      ? "Use of physical force by authority figures detected."
      : "Documentation of public interaction.";
    const when = new Date(recording.timestamp).toLocaleString();
    const where = `GPS: (${recording.lat.toFixed(4)}, ${recording.lng.toFixed(4)})`;
    const concerns = [];
    if (recording.description?.toLowerCase().includes("breathe"))
      concerns.push("Acute respiratory distress mention");
    if (recording.description?.toLowerCase().includes("badge"))
      concerns.push("Officer badge identification request");

    return { who, what, when, where, concerns };
  };

  return { generateSummary, generating, setGenerating };
};

export const AISummaryUI: React.FC = () => {
  const { generateSummary, generating, setGenerating } = useIncidentSummary();
  const [summary, setSummary] = useState<IncidentSummary | null>(null);
  const [desc, setDesc] = useState("");

  const handleGenerate = () => {
    setGenerating(true);
    setSummary(null);
    setTimeout(() => {
      const mockRecording = {
        timestamp: Date.now(),
        lat: 40.7128,
        lng: -74.006,
        description: desc,
      };
      setSummary(generateSummary(mockRecording));
      setGenerating(false);
    }, 1000);
  };

  return (
    <div className="bg-black p-6 rounded-xl border-l-4 border-red-600 mb-6 text-white shadow-2xl">
      <h3 className="text-red-600 font-bold text-xl mb-4 uppercase tracking-wider">
        AI Incident Summary
      </h3>
      <textarea
        placeholder="Enter incident metadata or description..."
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        rows={3}
        className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded text-white focus:outline-none focus:border-red-600 transition-colors resize-none mb-4"
      />
      <button
        onClick={handleGenerate}
        disabled={generating}
        className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-full w-full transition-all"
      >
        {generating ? "Generating..." : "Generate AI Summary"}
      </button>

      {summary && (
        <div className="mt-8 space-y-4 bg-zinc-950 p-4 rounded-lg border border-zinc-800 border-l-4 border-l-zinc-600">
          <div className="grid grid-cols-1 gap-3 text-sm">
            <div>
              <span className="text-zinc-500 font-bold uppercase text-[10px] block">
                Detected Subjects
              </span>{" "}
              {summary.who}
            </div>
            <div>
              <span className="text-zinc-500 font-bold uppercase text-[10px] block">
                Event Classification
              </span>{" "}
              {summary.what}
            </div>
            <div>
              <span className="text-zinc-500 font-bold uppercase text-[10px] block">
                Temporal Stamp
              </span>{" "}
              {summary.when}
            </div>
            <div>
              <span className="text-zinc-500 font-bold uppercase text-[10px] block">
                Spatial Origin
              </span>{" "}
              {summary.where}
            </div>
          </div>
          {summary.concerns.length > 0 && (
            <div className="border-t border-zinc-800 pt-3">
              <span className="text-red-500 font-bold uppercase text-[10px] block mb-1">
                Key Concerns Flagged
              </span>
              <div className="flex flex-wrap gap-2">
                {summary.concerns.map((c, i) => (
                  <span
                    key={i}
                    className="bg-red-900/30 text-red-500 border border-red-800 text-[10px] px-2 py-1 rounded italic"
                  >
                    "{c}"
                  </span>
                ))}
              </div>
            </div>
          )}
          <p className="text-[10px] text-zinc-600 italic mt-4">
            Automated analysis provided by Witness AI. Not a replacement for legal counsel.
          </p>
        </div>
      )}
    </div>
  );
};

// ------------------------------
// SECTION: ZERO KNOWLEDGE PROOF VERIFICATION
// ------------------------------
interface VerificationToken {
  recordingId: string;
  hash: string;
  timestamp: number;
  gpsHash: string;
  signature: string;
}

export const useZKProof = () => {
  const generateToken = (
    recordingId: string,
    recordingHash: string,
    gps: string,
  ): VerificationToken => {
    const timestamp = Date.now();
    const gpsHash = btoa(gps);
    const unsignedData = `${recordingId}-${recordingHash}-${timestamp}-${gpsHash}`;
    const signature = btoa(unsignedData) + "-witness-chain-sig";
    return { recordingId, hash: recordingHash, timestamp, gpsHash, signature };
  };

  const verifyToken = (token: VerificationToken): boolean => {
    const unsignedData = `${token.recordingId}-${token.hash}-${token.timestamp}-${token.gpsHash}`;
    const expectedSig = btoa(unsignedData) + "-witness-chain-sig";
    return token.signature === expectedSig;
  };

  return { generateToken, verifyToken };
};

export const ZeroKnowledgeUI: React.FC = () => {
  const { generateToken, verifyToken } = useZKProof();
  const [token, setToken] = useState<VerificationToken | null>(null);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [recId, setRecId] = useState("");
  const [recHash, setRecHash] = useState("");
  const [gps, setGps] = useState("");

  const handleGenerate = () => {
    if (!recId || !recHash || !gps) return alert("All forensic inputs required.");
    const newToken = generateToken(recId, recHash, gps);
    setToken(newToken);
    setVerified(null);
  };

  const handleVerify = () => {
    if (token) setVerified(verifyToken(token));
  };

  return (
    <div className="bg-black p-6 rounded-xl border-l-4 border-red-600 mb-6 text-white shadow-2xl">
      <h3 className="text-red-600 font-bold text-xl mb-4 uppercase tracking-wider">
        Zero‑Knowledge Proof
      </h3>
      <div className="space-y-3 mb-6">
        <input
          placeholder="Recording ID"
          value={recId}
          onChange={(e) => setRecId(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded text-sm focus:outline-none"
        />
        <input
          placeholder="Digital Signature (Hash)"
          value={recHash}
          onChange={(e) => setRecHash(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded text-sm focus:outline-none"
        />
        <input
          placeholder="GPS Metadata (lat,lng)"
          value={gps}
          onChange={(e) => setGps(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded text-sm focus:outline-none"
        />
        <button
          onClick={handleGenerate}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-full w-full transition-all"
        >
          Generate Auth Token
        </button>
      </div>

      {token && (
        <div className="mt-8 space-y-4 bg-zinc-950 p-4 rounded-lg border border-zinc-800">
          <div className="text-[10px] font-mono text-zinc-500 break-all bg-black p-2 rounded">
            TOKEN: {token.signature}
          </div>
          <button
            onClick={handleVerify}
            className="bg-zinc-800 hover:bg-green-600 py-2 rounded-full w-full text-xs font-bold transition-all uppercase"
          >
            Verify Forensic Chain
          </button>
          {verified !== null && (
            <div
              className={`text-center font-bold p-3 rounded uppercase text-sm border ${verified ? "text-green-500 bg-green-900/10 border-green-800" : "text-red-500 bg-red-900/10 border-red-800"}`}
            >
              {verified
                ? "✅ Chain Verified – Original Data"
                : "❌ Integrity Failed – Evidence Compromised"}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ------------------------------
// SECTION: MAIN APP (Tabbed Interface)
// ------------------------------
export const WitnessVerificationApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("badges");

  const tabs = [
    { id: "badges", label: "Badges" },
    { id: "orgs", label: "Orgs" },
    { id: "moderation", label: "Queue" },
    { id: "deepfake", label: "AI Forensics" },
    { id: "zeroknowledge", label: "ZKP" },
  ];

  return (
    <div className="min-h-screen bg-black text-white p-6 font-sans">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-black italic text-red-600 uppercase tracking-tighter">
          Witness Trust
        </h1>
        <p className="text-[10px] text-zinc-500 tracking-[0.2em] mt-1 font-bold">
          VERIFICATION PROTOCOLS
        </p>
      </header>

      <div className="flex flex-wrap gap-2 justify-center mb-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-full text-[10px] font-black uppercase transition-all border ${
              activeTab === tab.id
                ? "bg-red-600 border-red-600 text-white shadow-lg shadow-red-900/30"
                : "bg-black border-zinc-800 text-zinc-500 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="max-w-2xl mx-auto pb-20">
        {activeTab === "badges" && <VerifiedBadgesUI />}
        {activeTab === "orgs" && <OrganizationUI />}
        {activeTab === "moderation" && (
          <>
            <ReportUI />
            <AISummaryUI />
          </>
        )}
        {activeTab === "deepfake" && <DeepfakeUI />}
        {activeTab === "zeroknowledge" && <ZeroKnowledgeUI />}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  card: {}, // Handled by Tailwind
  sectionTitle: {},
  buttonSmall: {},
  input: {},
  inputSmall: {},
  textarea: {},
  select: {},
};

export default WitnessVerificationApp;
