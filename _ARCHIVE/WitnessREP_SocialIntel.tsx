// WitnessREP_SocialIntel.tsx
// Self‑contained TypeScript React module for social intelligence & advanced map.
// Includes: Witness Network proximity, neighborhood alerts, map controls,
// comment section, SOS history, trust engine, notification center, location privacy gate.
// Exports all components and hooks. Uses localStorage for state. No Supabase dependency.

import React, { useState, useEffect, useCallback, useRef } from "react";
import type { JSX } from "react";

// ------------------------------
// SECTION: VANILLA SVG ICONS
// ------------------------------
const Icon = ({ name, className = "w-5 h-5" }: { name: string; className?: string }) => {
  const icons: Record<string, JSX.Element> = {
    "map-pin": <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />,
    bell: <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />,
    users: <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />,
    radio: <circle cx="12" cy="12" r="2" />,
    search: (
      <>
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </>
    ),
    sliders: (
      <>
        <line x1="4" y1="21" x2="4" y2="14" />
        <line x1="4" y1="10" x2="4" y2="3" />
      </>
    ),
    flag: <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />,
    "message-square": <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
    "alert-circle": (
      <>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </>
    ),
    "check-circle": (
      <>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14 9 11" />
      </>
    ),
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
    award: (
      <>
        <circle cx="12" cy="8" r="7" />
        <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
      </>
    ),
    eye: (
      <>
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    "eye-off": (
      <>
        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
        <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
        <line x1="2" y1="2" x2="22" y2="22" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </>
    ),
    x: (
      <>
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </>
    ),
    "user-plus": (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <line x1="19" y1="8" x2="19" y2="14" />
        <line x1="16" y1="11" x2="22" y2="11" />
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
      {icons[name] || <circle cx="12" cy="12" r="10" />}
    </svg>
  );
};

// ------------------------------
// SECTION: Types & Mock Data
// ------------------------------
export interface WitnessUser {
  id: string;
  location: { lat: number; lng: number };
  lastSeen: number;
  trustScore: number;
  verifiedBadge: boolean;
}

export interface NeighborhoodSubscription {
  id: string;
  name: string;
  zipCode: string;
}

export interface Notification {
  id: string;
  type: "live" | "sos" | "shareRequest" | "system";
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  data?: Record<string, unknown>;
}

export interface SOSEvent {
  id: string;
  timestamp: number;
  location: { lat: number; lng: number };
  status: "notified" | "testRun" | "escalated";
  contactsNotified: number;
}

export interface Comment {
  id: string;
  recordingId: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: number;
  reported: boolean;
}

const mockNearbyWitnesses = (radiusMiles: number): WitnessUser[] => {
  const count = Math.floor(Math.random() * 15);
  return Array.from({ length: count }, (_, i) => ({
    id: `witness-${i}`,
    location: {
      lat: 40.7128 + (Math.random() - 0.5) * (radiusMiles / 69),
      lng: -74.006 + (Math.random() - 0.5) * (radiusMiles / 53),
    },
    lastSeen: Date.now(),
    trustScore: Math.floor(Math.random() * 100),
    verifiedBadge: Math.random() > 0.7,
  }));
};

// ------------------------------
// SECTION: Witness Network & Proximity (useWitnessProximity)
// ------------------------------
export function useWitnessProximity(center: { lat: number; lng: number }, radiusMiles: number = 5) {
  const [witnessCount, setWitnessCount] = useState(0);
  const [nearbyWitnesses, setNearbyWitnesses] = useState<WitnessUser[]>([]);
  const [pulse, setPulse] = useState(false);

  const refresh = useCallback(() => {
    const witnesses = mockNearbyWitnesses(radiusMiles);
    setNearbyWitnesses(witnesses);
    setWitnessCount(witnesses.length);
    if (witnesses.length > 5) {
      setPulse(true);
      setTimeout(() => setPulse(false), 2000);
    }
  }, [radiusMiles]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { witnessCount, nearbyWitnesses, pulse, refresh };
}

// ------------------------------
// SECTION: Neighborhood Alerts (useNeighborhoodSubscription)
// ------------------------------
export function useNeighborhoodSubscription() {
  const [subscriptions, setSubscriptions] = useState<NeighborhoodSubscription[]>(() => {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem("witness_neighborhood_subs");
    return stored ? JSON.parse(stored) : [];
  });
  const [alerts, setAlerts] = useState<Notification[]>([]);

  const subscribe = (zipCode: string, name: string) => {
    if (subscriptions.some((s) => s.zipCode === zipCode)) return;
    const newSub = { id: Date.now().toString(), name, zipCode };
    const updated = [...subscriptions, newSub];
    setSubscriptions(updated);
    localStorage.setItem("witness_neighborhood_subs", JSON.stringify(updated));
  };

  const unsubscribe = (zipCode: string) => {
    const updated = subscriptions.filter((s) => s.zipCode !== zipCode);
    setSubscriptions(updated);
    localStorage.setItem("witness_neighborhood_subs", JSON.stringify(updated));
  };

  const notifyIfNeeded = (eventType: "live" | "sos", zipCode: string, title: string) => {
    if (subscriptions.some((s) => s.zipCode === zipCode)) {
      const newNotif: Notification = {
        id: Date.now().toString(),
        type: eventType,
        title: `Alert in ${zipCode}`,
        message: title,
        timestamp: Date.now(),
        read: false,
      };
      setAlerts((prev) => [newNotif, ...prev].slice(0, 50));
    }
  };

  return { subscriptions, alerts, subscribe, unsubscribe, notifyIfNeeded };
}

// ------------------------------
// SECTION: Advanced Map Controls (MapIntelControls)
// ------------------------------
interface MapFilters {
  radiusMiles: number;
  showRecordings: boolean;
  showLive: boolean;
}

export function MapIntelControls({
  onSearch,
  onRadiusChange,
  onReportPin,
  filters,
  setFilters,
}: {
  onSearch: (query: string) => void;
  onRadiusChange: (radius: number) => void;
  onReportPin: (pinId: string) => void;
  filters: MapFilters;
  setFilters: React.Dispatch<React.SetStateAction<MapFilters>>;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [reportReason, setReportReason] = useState("");
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedPinId, setSelectedPinId] = useState<string>("");

  const handleSearch = () => onSearch(searchQuery);
  const handleRadius = (val: number) => {
    setFilters((prev) => ({ ...prev, radiusMiles: val }));
    onRadiusChange(val);
  };
  const handleReportSubmit = () => {
    if (selectedPinId && reportReason) {
      onReportPin(selectedPinId);
      setShowReportModal(false);
      setReportReason("");
      setSelectedPinId("");
    }
  };

  return (
    <div className="bg-[#121212] p-5 rounded-2xl border border-zinc-800 space-y-4 shadow-2xl">
      <div className="flex items-center gap-2">
        <Icon name="search" className="w-5 h-5 text-zinc-500" />
        <input
          type="text"
          placeholder="Query sector coordinates"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-black border border-zinc-800 rounded-full px-4 py-2 text-white text-sm outline-none focus:border-red-600 transition-colors"
        />
        <button
          onClick={handleSearch}
          className="bg-red-600 hover:bg-red-700 px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all"
        >
          Go
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-[10px] font-black uppercase text-zinc-500 tracking-tighter">
          <span>Search Radius</span>
          <span className="text-red-500">{filters.radiusMiles} MI</span>
        </div>
        <input
          type="range"
          min={1}
          max={50}
          step={1}
          value={filters.radiusMiles}
          onChange={(e) => handleRadius(parseInt(e.target.value))}
          className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-red-600"
        />
      </div>

      <div className="flex gap-6 py-2 border-t border-zinc-800 pt-4">
        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            className="w-4 h-4 accent-red-600 rounded bg-black border-zinc-800"
            checked={filters.showRecordings}
            onChange={(e) => setFilters((prev) => ({ ...prev, showRecordings: e.target.checked }))}
          />
          <span className="text-[10px] font-black uppercase text-zinc-400 group-hover:text-white transition-colors">
            Recordings
          </span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            className="w-4 h-4 accent-red-600 rounded bg-black border-zinc-800"
            checked={filters.showLive}
            onChange={(e) => setFilters((prev) => ({ ...prev, showLive: e.target.checked }))}
          />
          <span className="text-[10px] font-black uppercase text-zinc-400 group-hover:text-white transition-colors">
            Live Feed
          </span>
        </label>
      </div>

      <button
        onClick={() => setShowReportModal(true)}
        className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 w-full justify-center transition-all"
      >
        <Icon name="flag" className="w-4 h-4" /> Flag Anomaly
      </button>

      {showReportModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-6 backdrop-blur-md">
          <div className="bg-[#121212] border border-red-600 p-8 rounded-3xl w-full max-w-sm shadow-2xl">
            <h3 className="text-xl font-black text-red-600 uppercase italic mb-6">
              Report Map Pin
            </h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Target ID"
                value={selectedPinId}
                onChange={(e) => setSelectedPinId(e.target.value)}
                className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none focus:border-red-600"
              />
              <textarea
                placeholder="State the nature of the inaccuracy..."
                rows={3}
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none focus:border-red-600 resize-none"
              />
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowReportModal(false)}
                  className="flex-1 px-4 py-3 rounded-xl bg-zinc-800 text-xs font-bold uppercase tracking-widest text-zinc-400 transition-all"
                >
                  Abort
                </button>
                <button
                  onClick={handleReportSubmit}
                  className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-xs font-black uppercase tracking-widest text-white transition-all shadow-lg shadow-red-900/20"
                >
                  Transmit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ------------------------------
// SECTION: Post-Stream Social Layer (CommentSection)
// ------------------------------
export function CommentSection({
  comments,
  onAddComment,
  onReport,
}: {
  recordingId: string;
  comments: Comment[];
  onAddComment: (text: string) => void;
  onReport: (commentId: string) => void;
}) {
  const [newComment, setNewComment] = useState("");
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set());

  const handleAdd = () => {
    if (newComment.trim()) {
      onAddComment(newComment);
      setNewComment("");
    }
  };

  const handleLocalReport = (id: string) => {
    onReport(id);
    setReportedIds((prev) => new Set(prev).add(id));
  };

  return (
    <div className="bg-[#121212] border border-zinc-800 rounded-2xl p-6 shadow-2xl">
      <div className="flex items-center gap-2 mb-6">
        <Icon name="message-square" className="text-red-600" />
        <h4 className="font-black text-white text-xs uppercase tracking-widest">
          Evidence Commentary
        </h4>
      </div>

      <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {comments.map((c) => (
          <div
            key={c.id}
            className={`group ${reportedIds.has(c.id) ? "opacity-20 grayscale" : ""}`}
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-red-500 uppercase italic">
                  {c.userName}
                </span>
                <span className="text-[9px] font-bold text-zinc-600 uppercase">
                  {new Date(c.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              {!reportedIds.has(c.id) && (
                <button
                  onClick={() => handleLocalReport(c.id)}
                  className="text-zinc-700 hover:text-red-600 transition-colors"
                >
                  <Icon name="flag" className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed pl-1">{c.text}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mt-8 bg-black p-1 rounded-full border border-zinc-800">
        <input
          type="text"
          placeholder="Add encrypted annotation..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="flex-1 bg-transparent px-4 py-2 text-sm text-white outline-none placeholder:text-zinc-700"
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <button
          onClick={handleAdd}
          className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-lg"
        >
          Post
        </button>
      </div>
    </div>
  );
}

// ------------------------------
// SECTION: SOS Audit History (SOSHistoryLog)
// ------------------------------
export function SOSHistoryLog({ events }: { events: SOSEvent[] }) {
  return (
    <div className="bg-[#121212] border border-zinc-800 rounded-2xl p-6 shadow-2xl">
      <div className="flex items-center gap-2 mb-6">
        <Icon name="clock" className="text-red-600" />
        <h4 className="font-black text-white text-xs uppercase tracking-widest">
          SOS Telemetry Log
        </h4>
      </div>

      {events.length === 0 && (
        <p className="text-zinc-700 text-[10px] uppercase font-bold text-center py-8">
          No transmission history detected.
        </p>
      )}
      <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar">
        {events.map((ev) => (
          <div
            key={ev.id}
            className="bg-black p-4 rounded-xl border border-zinc-900 border-l-2 border-l-red-600"
          >
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] font-mono text-zinc-500 uppercase">
                {new Date(ev.timestamp).toLocaleString()}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ${
                  ev.status === "notified"
                    ? "bg-red-600 text-white"
                    : ev.status === "testRun"
                      ? "bg-zinc-800 text-zinc-400"
                      : "bg-orange-600 text-white"
                }`}
              >
                {ev.status === "testRun" ? "Protocol Test" : ev.status.replace(/([A-Z])/g, " $1")}
              </span>
            </div>
            <div className="text-[10px] text-zinc-400 grid grid-cols-2 gap-2">
              <div className="flex items-center gap-1 font-mono">
                <Icon name="map-pin" className="w-3 h-3 text-red-900" />
                {ev.location.lat.toFixed(4)}, {ev.location.lng.toFixed(4)}
              </div>
              <div className="text-right uppercase font-bold text-zinc-600">
                {ev.contactsNotified} Targets Alerted
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ------------------------------
// SECTION: Trust Signals & Verified Badges (TrustEngine)
// ------------------------------
export function TrustEngine({ userTrustScore = 65, verified = false }) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 50) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <div className="bg-[#121212] border border-zinc-800 rounded-2xl p-6 flex items-center justify-between shadow-2xl overflow-hidden relative">
      <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12">
        <Icon name={verified ? "shield" : "award"} className="w-24 h-24" />
      </div>
      <div className="flex items-center gap-5 relative z-10">
        <div
          className={`p-4 rounded-2xl bg-black border ${verified ? "border-red-600 shadow-[0_0_15px_rgba(232,0,28,0.2)]" : "border-zinc-800"}`}
        >
          <Icon
            name={verified ? "shield" : "award"}
            className={`w-10 h-10 ${verified ? "text-red-600" : "text-zinc-700"}`}
          />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.2em] mb-2">
            Integrity Score
          </p>
          <div className="flex items-center gap-3">
            <div className="w-32 bg-black border border-zinc-900 rounded-full h-2 overflow-hidden shadow-inner">
              <div
                className="bg-red-600 h-full transition-all duration-1000"
                style={{ width: `${userTrustScore}%` }}
              />
            </div>
            <span
              className={`text-xl font-black italic font-mono ${getScoreColor(userTrustScore)}`}
            >
              {userTrustScore}
            </span>
          </div>
        </div>
      </div>
      {verified && (
        <div className="bg-red-600 text-white px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.3em] shadow-lg shadow-red-900/20">
          Verified Node
        </div>
      )}
    </div>
  );
}

// ------------------------------
// SECTION: In-App Notification Center (WitnessNotifications)
// ------------------------------
export function WitnessNotifications({
  notifications,
  onMarkRead,
  onMarkAllRead,
  onClose,
}: {
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onClose: () => void;
}) {
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="fixed top-0 right-0 bottom-0 w-full sm:w-96 bg-[#080808] border-l border-zinc-800 shadow-2xl z-[1000] flex flex-col animate-in slide-in-from-right duration-300">
      <div className="flex justify-between items-center p-6 border-b border-zinc-900 bg-[#121212]">
        <div>
          <h3 className="text-xl font-black text-red-600 uppercase italic tracking-tighter">
            Command Center
          </h3>
          <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
            {unreadCount} Pending Intel
          </p>
        </div>
        <button onClick={onClose} className="text-zinc-600 hover:text-white transition-colors">
          <Icon name="x" className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
        {notifications.length === 0 && (
          <div className="text-center py-20">
            <Icon name="bell" className="w-12 h-12 text-zinc-900 mx-auto mb-4" />
            <p className="text-zinc-700 text-[10px] uppercase font-black tracking-widest">
              Encryption silence active.
            </p>
          </div>
        )}
        {notifications.map((notif) => (
          <div
            key={notif.id}
            className={`p-4 rounded-2xl border transition-all ${
              notif.read
                ? "bg-black border-zinc-900 opacity-60"
                : "bg-[#121212] border-red-900/50 shadow-lg shadow-red-950/20"
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-black uppercase text-red-500 tracking-tighter">
                {notif.title}
              </span>
              <span className="text-[9px] font-mono text-zinc-600 uppercase">
                {new Date(notif.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <p className="text-xs text-zinc-400 leading-snug">{notif.message}</p>
            {!notif.read && (
              <button
                onClick={() => onMarkRead(notif.id)}
                className="text-[9px] font-black text-red-600 uppercase tracking-widest mt-4 hover:text-red-400 transition-colors"
              >
                Archive Signal
              </button>
            )}
          </div>
        ))}
      </div>

      {unreadCount > 0 && (
        <div className="p-6 bg-[#121212] border-t border-zinc-900">
          <button
            onClick={onMarkAllRead}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-xl transition-all"
          >
            Acknowledge All
          </button>
        </div>
      )}
    </div>
  );
}

// ------------------------------
// SECTION: Public Live Location Warning (LocationPrivacyGate)
// ------------------------------
export function LocationPrivacyGate({
  isPublic,
  onToggle,
  onConfirm,
}: {
  isPublic: boolean;
  onToggle: (value: boolean) => void;
  onConfirm: () => void;
}) {
  const [showWarning, setShowWarning] = useState(false);

  const handleToggle = () => {
    if (!isPublic) setShowWarning(true);
    else onToggle(false);
  };

  return (
    <div className="bg-[#121212] border border-zinc-800 rounded-2xl p-6 shadow-2xl">
      <div className="flex justify-between items-center gap-4">
        <div className="flex-1">
          <p className="text-sm font-black text-white uppercase tracking-tight">
            Public Spatial Transmit
          </p>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter leading-tight mt-1">
            Broadcast live telemetry to local nodes.
          </p>
        </div>
        <button
          onClick={handleToggle}
          className={`w-14 h-8 rounded-full relative transition-colors duration-300 ${
            isPublic ? "bg-red-600" : "bg-zinc-800"
          }`}
        >
          <div
            className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform duration-300 ${
              isPublic ? "translate-x-7" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {showWarning && (
        <div className="mt-6 bg-black border-2 border-red-600 p-6 rounded-2xl animate-in zoom-in duration-300">
          <div className="flex items-center gap-3 text-red-600 font-black uppercase text-sm mb-4 italic">
            <Icon name="alert-circle" className="w-6 h-6 animate-pulse" /> Security Compromise
            Warning
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed mb-6 font-bold uppercase tracking-tighter">
            Enabling public spatial transmit reveals your exact vector to all nearby observers. This
            protocol may increase physical security risk. Confirm identity before proceeding.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowWarning(false)}
              className="flex-1 bg-zinc-900 border border-zinc-800 text-zinc-500 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-white transition-all"
            >
              Abort
            </button>
            <button
              onClick={() => {
                setShowWarning(false);
                onToggle(true);
                onConfirm();
              }}
              className="flex-1 bg-red-600 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-red-900/20"
            >
              I Accept Risk
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ------------------------------
// SECTION: MainApp Demo
// ------------------------------
export function MainApp() {
  const [mapFilters, setMapFilters] = useState<MapFilters>({
    radiusMiles: 5,
    showRecordings: true,
    showLive: true,
  });
  const [locationPublic, setLocationPublic] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [comments, setComments] = useState<Comment[]>([
    {
      id: "c1",
      recordingId: "rec1",
      userId: "u1",
      userName: "Observer_Alpha",
      text: "Recording from secure distance. Signal locked.",
      timestamp: Date.now() - 3600000,
      reported: false,
    },
  ]);

  const { witnessCount, pulse } = useWitnessProximity(
    { lat: 40.7128, lng: -74.006 },
    mapFilters.radiusMiles,
  );
  const { subscriptions, subscribe, unsubscribe } = useNeighborhoodSubscription();

  useEffect(() => {
    const raw = localStorage.getItem("witness_notifications");
    if (raw) setNotifications(JSON.parse(raw));
  }, []);

  useEffect(() => {
    localStorage.setItem("witness_notifications", JSON.stringify(notifications));
  }, [notifications]);

  const addTestNotification = () => {
    const notif: Notification = {
      id: Date.now().toString(),
      type: "sos",
      title: "Proximity Alert",
      message: "Priority SOS event detected in Union Square.",
      timestamp: Date.now(),
      read: false,
    };
    setNotifications((prev) => [notif, ...prev].slice(0, 50));
  };

  return (
    <div className="min-h-screen bg-[#080808] text-white font-sans selection:bg-red-600/30">
      {/* Dynamic Header */}
      <header className="bg-[#121212] border-b border-red-600/20 p-5 flex justify-between items-center sticky top-0 z-50 backdrop-blur-md">
        <div>
          <h1 className="text-2xl font-black italic tracking-tighter text-red-600 uppercase">
            Witness <span className="text-white">Social</span>
          </h1>
          <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-[0.5em] mt-1">
            Decentralized Intelligence
          </p>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${pulse ? "bg-red-600 animate-ping" : "bg-zinc-800 border border-zinc-700"} `}
            />
            <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">
              {witnessCount} Peers
            </span>
          </div>
          <button
            onClick={() => setShowNotifications(true)}
            className="relative p-2 bg-black border border-zinc-800 rounded-xl hover:border-red-600 transition-all group"
          >
            <Icon name="bell" className="group-hover:text-red-500" />
            {notifications.some((n) => !n.read) && (
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-600 rounded-full border border-black shadow-lg" />
            )}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 lg:p-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Content Area */}
          <div className="lg:col-span-8 space-y-8">
            {/* Map Placeholder */}
            <div className="bg-[#121212] border border-zinc-800 rounded-3xl h-[450px] relative overflow-hidden group shadow-inner">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900 to-black opacity-50" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <Icon
                    name="map-pin"
                    className="w-12 h-12 text-red-900 mx-auto mb-4 animate-bounce"
                  />
                  <p className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.4em]">
                    Vector Node Initialized
                  </p>
                </div>
              </div>
              <div className="absolute bottom-6 left-6 flex gap-2">
                <button
                  onClick={addTestNotification}
                  className="bg-red-600/10 border border-red-600/50 text-red-500 text-[8px] font-black uppercase px-3 py-1.5 rounded-full backdrop-blur-md"
                >
                  Test Uplink
                </button>
              </div>
            </div>

            <MapIntelControls
              onSearch={() => {}}
              onRadiusChange={() => {}}
              onReportPin={() => {}}
              filters={mapFilters}
              setFilters={setMapFilters}
            />

            <CommentSection
              recordingId="rec1"
              comments={comments}
              onAddComment={(t) =>
                setComments((p) => [
                  {
                    id: Date.now().toString(),
                    recordingId: "rec1",
                    userId: "u",
                    userName: "You",
                    text: t,
                    timestamp: Date.now(),
                    reported: false,
                  },
                  ...p,
                ])
              }
              onReport={() => {}}
            />
          </div>

          {/* Sidebar Area */}
          <div className="lg:col-span-4 space-y-8">
            <TrustEngine userTrustScore={74} verified={true} />
            <LocationPrivacyGate
              isPublic={locationPublic}
              onToggle={setLocationPublic}
              onConfirm={() => {}}
            />
            <div className="bg-[#121212] border border-zinc-800 rounded-2xl p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-black text-white text-xs uppercase tracking-widest">
                  Subscribed Sectors
                </h3>
                <button
                  onClick={() => {
                    const z = prompt("Enter Zip");
                    if (z) subscribe(z, `Sector ${z}`);
                  }}
                  className="p-1 text-zinc-500 hover:text-red-600 transition-colors"
                >
                  <Icon name="user-plus" />
                </button>
              </div>
              {subscriptions.length === 0 && (
                <p className="text-zinc-700 text-[10px] font-bold uppercase italic py-4">
                  No active monitors.
                </p>
              )}
              <div className="space-y-3">
                {subscriptions.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex justify-between items-center bg-black p-3 rounded-xl border border-zinc-900 group"
                  >
                    <span className="text-[10px] font-black uppercase text-zinc-400 group-hover:text-white transition-colors">
                      {sub.name}
                    </span>
                    <button
                      onClick={() => unsubscribe(sub.zipCode)}
                      className="text-[8px] font-black text-red-900 uppercase tracking-widest hover:text-red-600"
                    >
                      Terminate
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <SOSHistoryLog
              events={[
                {
                  id: "1",
                  timestamp: Date.now() - 3600000,
                  location: { lat: 40.7128, lng: -74.006 },
                  status: "notified",
                  contactsNotified: 3,
                },
              ]}
            />
          </div>
        </div>
      </main>

      {showNotifications && (
        <WitnessNotifications
          notifications={notifications}
          onMarkRead={(id) =>
            setNotifications((p) => p.map((n) => (n.id === id ? { ...n, read: true } : n)))
          }
          onMarkAllRead={() => setNotifications((p) => p.map((n) => ({ ...n, read: true })))}
          onClose={() => setShowNotifications(false)}
        />
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #27272a; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #ef4444; }
      `}</style>
    </div>
  );
}

export default MainApp;
