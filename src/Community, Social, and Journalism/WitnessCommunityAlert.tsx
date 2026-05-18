// WitnessCommunityAlert.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";

// ------------------------------
// SECTION: TYPES
// ------------------------------
export interface Organization {
  id: string;
  name: string;
  verified: boolean;
  coverageArea: number[][]; // [lng, lat] points
}

export interface Alert {
  id: string;
  orgId: string;
  title: string;
  message: string;
  severity: "info" | "warning" | "emergency";
  expiresAt: number;
}

// ------------------------------
// SECTION: MAIN COMPONENT
// ------------------------------
export default function WitnessCommunityAlert() {
  const [role, setRole] = useState<"user" | "org">("user");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState("");

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 1. Initialize GPS & Data
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => console.error("Location denied"),
      { enableHighAccuracy: true },
    );

    // Mock Load Orgs
    const mockOrgs: Organization[] = [
      { id: "1", name: "City Safety HQ", verified: true, coverageArea: [] },
      { id: "2", name: "Legal Observer Group", verified: true, coverageArea: [] },
    ];
    setOrgs(mockOrgs);
    setSelectedOrgId(mockOrgs[0].id);

    // Initial Alert Load
    const rawAlerts = localStorage.getItem("witness_community_alerts");
    if (rawAlerts) setAlerts(JSON.parse(rawAlerts));
  }, []);

  // 2. Alert Heartbeat (Checks for new alerts every 30s)
  useEffect(() => {
    const interval = setInterval(() => {
      const freshAlerts = JSON.parse(localStorage.getItem("witness_community_alerts") || "[]");
      setAlerts(freshAlerts.filter((a: Alert) => a.expiresAt > Date.now()));
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // 3. Dynamic Map Drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !userLocation) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    // Dark Map Base
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, width, height);

    // Draw Grid Lines (Scale based on zoom)
    ctx.strokeStyle = "#1a1a1a";
    for (let i = 0; i < width; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, height);
      ctx.stroke();
    }
    for (let i = 0; i < height; i += 40) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(width, i);
      ctx.stroke();
    }

    // Draw User in Center
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, 6, 0, Math.PI * 2);
    ctx.fillStyle = "#c00";
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw Nearby Alerts (Simulated positions)
    alerts.forEach((alert, i) => {
      const color = alert.severity === "emergency" ? "#ff0000" : "#ff9900";
      // Mock alert offsets from user
      const offsetX = i % 2 === 0 ? 80 : -80;
      const offsetY = i > 0 ? 50 : -50;

      ctx.beginPath();
      ctx.arc(width / 2 + offsetX, height / 2 + offsetY, 40, 0, Math.PI * 2);
      ctx.fillStyle = color + "22"; // Transparent fill
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
    });
  }, [userLocation, alerts]);

  const handlePublish = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);

    const newAlert: Alert = {
      id: crypto.randomUUID(),
      orgId: selectedOrgId,
      title: data.get("title") as string,
      message: data.get("message") as string,
      severity: data.get("severity") as any,
      expiresAt: Date.now() + 3600000 * 2, // 2 hour expiry
    };

    const updated = [newAlert, ...alerts];
    setAlerts(updated);
    localStorage.setItem("witness_community_alerts", JSON.stringify(updated));
    alert("Alert Published to Area");
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 font-sans">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-black italic text-red-600">COMMUNITY ALERTS</h1>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest">
            Verified Organizational Dispatch
          </p>
        </div>
        <button
          onClick={() => setRole(role === "user" ? "org" : "user")}
          className="bg-gray-900 border border-gray-800 px-3 py-1 rounded-full text-[10px] font-bold text-red-500"
        >
          {role === "user" ? "ADMIN LOGIN" : "EXIT ADMIN"}
        </button>
      </header>

      {role === "user" ? (
        <div className="space-y-6">
          {/* Map Visualization */}
          <div className="relative rounded-2xl overflow-hidden border border-red-900 shadow-2xl">
            <canvas ref={canvasRef} width={600} height={300} className="w-full h-auto" />
            <div className="absolute top-3 left-3 bg-black/80 px-2 py-1 rounded text-[9px] font-bold border border-gray-800">
              LIVE RADIUS: 5 MILES
            </div>
          </div>

          {/* Active Alerts List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-tighter">
              Active Dispatches
            </h3>
            {alerts.length === 0 && (
              <p className="text-xs text-gray-700 italic">No alerts in your immediate area.</p>
            )}
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-xl border-l-4 shadow-lg ${alert.severity === "emergency" ? "bg-red-950/20 border-red-600" : "bg-orange-950/10 border-orange-500"}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-black text-sm uppercase tracking-tight">{alert.title}</span>
                  <span className="text-[9px] opacity-50">
                    {new Date(alert.expiresAt).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-xs text-gray-400 leading-snug">{alert.message}</p>
                <div className="mt-3 text-[8px] font-bold text-gray-600 uppercase">
                  Verified Org: {orgs.find((o) => o.id === alert.orgId)?.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Organization Form */
        <form
          onSubmit={handlePublish}
          className="bg-gray-900 border border-gray-800 rounded-3xl p-6 space-y-4 animate-in fade-in zoom-in duration-300"
        >
          <h2 className="text-red-600 font-black italic">DISPATCH TERMINAL</h2>

          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase">Alert Severity</label>
            <select
              name="severity"
              className="w-full bg-black border border-gray-700 p-3 rounded-xl mt-1 text-sm outline-none focus:border-red-600"
            >
              <option value="info">Information (Blue)</option>
              <option value="warning">Public Warning (Orange)</option>
              <option value="emergency">High Emergency (Red)</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase">Subject</label>
            <input
              name="title"
              required
              placeholder="e.g. Police Activity at Central Park"
              className="w-full bg-black border border-gray-700 p-3 rounded-xl mt-1 text-sm"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase">Full Message</label>
            <textarea
              name="message"
              required
              rows={3}
              placeholder="Provide clear instructions for users in the area..."
              className="w-full bg-black border border-gray-700 p-3 rounded-xl mt-1 text-sm resize-none"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-red-600 py-4 rounded-xl font-black text-lg shadow-xl shadow-red-900/20"
          >
            BROADCAST ALERT
          </button>
        </form>
      )}

      <footer className="mt-12 text-center">
        <p className="text-[9px] text-gray-600 uppercase tracking-widest leading-loose">
          Alerts are only accepted from verified 501(c)3 organizations <br /> and accredited legal
          observer teams.
        </p>
      </footer>
    </div>
  );
}
