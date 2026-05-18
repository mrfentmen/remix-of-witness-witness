// WitnessScheduledCheckIn.tsx
import React, { useState, useEffect, useRef } from "react";

// ------------------------------
// SECTION: TYPES
// ------------------------------
interface CheckInSchedule {
  id: string;
  targetTime: number; // Timestamp
  message: string;
  contactIds: string[];
  recurring: boolean;
  isActive: boolean;
}

// ------------------------------
// SECTION: COMPONENT
// ------------------------------
export default function WitnessScheduledCheckIn() {
  const [schedules, setSchedules] = useState<CheckInSchedule[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [isSettingUp, setIsSettingUp] = useState(false);

  // Form State
  const [timeInput, setTimeInput] = useState("");
  const [msgInput, setMsgInput] = useState("");

  const checkInterval = useRef<number | null>(null);

  // 1. Load Data & Start "Heartbeat"
  useEffect(() => {
    const saved = localStorage.getItem("witness_schedules");
    if (saved) setSchedules(JSON.parse(saved));

    const savedHistory = localStorage.getItem("witness_history");
    if (savedHistory) setHistory(JSON.parse(savedHistory));

    // Monitor for missed check-ins every 10 seconds
    checkInterval.current = window.setInterval(monitorSchedules, 10000);

    return () => {
      if (checkInterval.current) clearInterval(checkInterval.current);
    };
  }, []);

  // 2. Monitoring Logic
  const monitorSchedules = () => {
    const now = Date.now();
    const currentSchedules = JSON.parse(localStorage.getItem("witness_schedules") || "[]");

    currentSchedules.forEach((s: CheckInSchedule) => {
      if (s.isActive && now > s.targetTime) {
        handleMissedCheckIn(s);
      }
    });
  };

  const handleMissedCheckIn = (schedule: CheckInSchedule) => {
    // 1. Deactivate
    const updated = { ...schedule, isActive: false };
    updateScheduleInList(updated);

    // 2. Log History
    logToHistory(schedule, "SOS_TRIGGERED");

    // 3. Alert User & Trigger SMS
    console.error("SOS SENT: Check-in missed for", schedule.targetTime);
    if (navigator.vibrate) navigator.vibrate([500, 100, 500]);
    alert("MISSED CHECK-IN: Emergency contacts have been notified.");
  };

  // 3. User Actions
  const createSchedule = () => {
    if (!timeInput) return alert("Select a time");

    const [hours, mins] = timeInput.split(":").map(Number);
    const target = new Date();
    target.setHours(hours, mins, 0, 0);

    // If the time is in the past, set it for tomorrow
    if (target.getTime() < Date.now()) {
      target.setDate(target.getDate() + 1);
    }

    const newSchedule: CheckInSchedule = {
      id: crypto.randomUUID(),
      targetTime: target.getTime(),
      message: msgInput || "Safe check-in missed.",
      contactIds: ["1"], // Placeholder
      recurring: true,
      isActive: true,
    };

    const newList = [...schedules, newSchedule];
    setSchedules(newList);
    localStorage.setItem("witness_schedules", JSON.stringify(newList));
    setIsSettingUp(false);
  };

  const performCheckIn = (id: string) => {
    const schedule = schedules.find((s) => s.id === id);
    if (!schedule) return;

    if (navigator.vibrate) navigator.vibrate(50); // Confirmation pulse

    const newList = schedules.filter((s) => s.id !== id);

    if (schedule.recurring) {
      // Schedule for same time tomorrow
      const nextTime = schedule.targetTime + 24 * 60 * 60 * 1000;
      newList.push({ ...schedule, targetTime: nextTime, isActive: true });
    }

    setSchedules(newList);
    localStorage.setItem("witness_schedules", JSON.stringify(newList));
    logToHistory(schedule, "CHECKED_IN");
  };

  const logToHistory = (s: CheckInSchedule, status: string) => {
    const newEntry = { id: crypto.randomUUID(), time: s.targetTime, status };
    const newHistory = [newEntry, ...history].slice(0, 10);
    setHistory(newHistory);
    localStorage.setItem("witness_history", JSON.stringify(newHistory));
  };

  const updateScheduleInList = (updated: CheckInSchedule) => {
    const newList = schedules.map((s) => (s.id === updated.id ? updated : s));
    setSchedules(newList);
    localStorage.setItem("witness_schedules", JSON.stringify(newList));
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 font-sans">
      <header className="text-center mb-8">
        <h1 className="text-2xl font-black text-red-600 italic">SCHEDULED CHECK-IN</h1>
        <p className="text-[10px] text-gray-500 uppercase tracking-widest">
          Automatic Safety Monitor
        </p>
      </header>

      <div className="space-y-6">
        {/* List of Active Schedules */}
        {schedules
          .filter((s) => s.isActive)
          .map((s) => (
            <div key={s.id} className="bg-gray-900 p-5 rounded-2xl border-l-4 border-red-600">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-xs text-gray-500 font-bold uppercase">Target Time</div>
                  <div className="text-2xl font-black">
                    {new Date(s.targetTime).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
                <button
                  onClick={() => performCheckIn(s.id)}
                  className="bg-red-600 px-6 py-2 rounded-full font-bold text-sm"
                >
                  I'M SAFE
                </button>
              </div>
            </div>
          ))}

        {/* Setup Form */}
        {isSettingUp ? (
          <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 space-y-4">
            <input
              type="time"
              className="w-full bg-black border border-gray-700 p-3 rounded text-white"
              value={timeInput}
              onChange={(e) => setTimeInput(e.target.value)}
            />
            <textarea
              placeholder="SOS message (Optional)"
              className="w-full bg-black border border-gray-700 p-3 rounded text-sm h-20"
              value={msgInput}
              onChange={(e) => setMsgInput(e.target.value)}
            />
            <button
              onClick={createSchedule}
              className="w-full bg-red-600 py-3 rounded-full font-bold"
            >
              SAVE SCHEDULE
            </button>
            <button onClick={() => setIsSettingUp(false)} className="w-full text-xs text-gray-500">
              CANCEL
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsSettingUp(true)}
            className="w-full bg-gray-900 border border-dashed border-gray-700 py-4 rounded-2xl text-gray-400 font-bold"
          >
            + ADD DAILY CHECK-IN
          </button>
        )}

        {/* History */}
        <div className="mt-10">
          <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Recent Logs</h3>
          <div className="space-y-2">
            {history.map((h) => (
              <div
                key={h.id}
                className="flex justify-between text-[10px] bg-gray-900/50 p-2 rounded"
              >
                <span className="text-gray-400">{new Date(h.time).toLocaleDateString()}</span>
                <span className={h.status === "CHECKED_IN" ? "text-green-500" : "text-red-500"}>
                  {h.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
