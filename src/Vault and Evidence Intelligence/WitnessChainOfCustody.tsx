// WitnessChainOfCustody.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";

// ------------------------------
// SECTION: TYPES & INTERFACES
// ------------------------------
export type ActionType = "viewed" | "exported" | "shared" | "uploaded" | "certificate_generated";

export interface LogEntry {
  id: string;
  recordingId: string;
  action: ActionType;
  timestamp: string;
  deviceId: string;
  userId: string;
  previousHash: string;
  hash: string;
}

// ------------------------------
// SECTION: CRYPTO ENGINE
// ------------------------------

// Stable stringify: sorts keys so hashes don't break if key order changes
const stableStringify = (obj: Record<string, unknown>): string => {
  return JSON.stringify(obj, Object.keys(obj).sort());
};

const computeSHA256 = async (data: string): Promise<string> => {
  const encoder = new TextEncoder();
  const buffer = await crypto.subtle.digest("SHA-256", encoder.encode(data));
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

// ------------------------------
// SECTION: INDEXEDDB HELPERS
// ------------------------------
const DB_NAME = "WitnessAuditTrail";
const STORE_NAME = "custody_logs";

const openAuditDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 2);
    req.onupgradeneeded = (e: IDBVersionChangeEvent) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("recordingId", "recordingId");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
};

// ------------------------------
// SECTION: LOGGING & VERIFICATION
// ------------------------------
export const recordCustodyAction = async (
  recordingId: string,
  action: ActionType,
  userId: string,
) => {
  const db = await openAuditDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);

  // 1. Get all logs for this recording to find the last hash
  const index = store.index("recordingId");
  const request = index.getAll(recordingId);

  return new Promise<void>((resolve) => {
    request.onsuccess = async () => {
      const logs = request.result.sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );
      const previousHash = logs.length > 0 ? logs[logs.length - 1].hash : "00000000000000000000";

      const entryBase = {
        id: crypto.randomUUID(),
        recordingId,
        action,
        timestamp: new Date().toISOString(),
        deviceId: navigator.userAgent.substring(0, 50), // Device footprint
        userId,
        previousHash,
      };

      const hash = await computeSHA256(stableStringify(entryBase));
      const fullEntry: LogEntry = { ...entryBase, hash };

      store.add(fullEntry);
      resolve();
    };
  });
};

// ------------------------------
// SECTION: MAIN UI COMPONENT
// ------------------------------
export default function ChainOfCustodyUI({ recordingId }: { recordingId: string }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAndVerify = useCallback(async () => {
    setLoading(true);
    const db = await openAuditDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.index("recordingId").getAll(recordingId);

    request.onsuccess = async () => {
      const entries: LogEntry[] = request.result.sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );

      // Verify the whole chain
      let valid = true;
      let lastHash = "00000000000000000000";

      for (const entry of entries) {
        // A. Check if the link to previous is broken
        if (entry.previousHash !== lastHash) {
          valid = false;
          break;
        }
        // B. Re-calculate hash to ensure data wasn't edited
        const { hash, ...base } = entry;
        const recalculated = await computeSHA256(stableStringify(base));
        if (recalculated !== hash) {
          valid = false;
          break;
        }
        lastHash = hash;
      }

      setLogs(entries);
      setIsVerified(valid);
      setLoading(false);
    };
  }, [recordingId]);

  useEffect(() => {
    fetchAndVerify();
  }, [fetchAndVerify]);

  return (
    <div className="bg-black border border-red-900 rounded-2xl p-6 text-white max-w-2xl mx-auto shadow-2xl">
      <div className="flex justify-between items-center mb-6 border-b border-red-900 pb-4">
        <h2 className="text-xl font-black italic text-red-600">AUDIT LOG / CHAIN OF CUSTODY</h2>
        <button onClick={fetchAndVerify} className="text-[10px] bg-gray-900 px-2 py-1 rounded">
          REFRESH
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10 animate-pulse text-gray-500">
          Verifying Cryptographic Chain...
        </div>
      ) : (
        <>
          <div
            className={`mb-6 p-3 rounded-lg text-center font-bold text-sm ${isVerified ? "bg-green-900/30 text-green-400 border border-green-800" : "bg-red-900/30 text-red-400 border border-red-800"}`}
          >
            {isVerified
              ? "✓ CHAIN VERIFIED: EVIDENCE TAMPER-FREE"
              : "⚠️ CHAIN BREACH: INTEGRITY COMPROMISED"}
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
            {logs.map((log, i) => (
              <div key={log.id} className="bg-gray-900 p-3 rounded border-l-2 border-red-600">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs font-black text-red-500 uppercase">{log.action}</span>
                  <span className="text-[10px] text-gray-500 font-mono">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="text-[9px] text-gray-400 truncate">SHA256: {log.hash}</div>
                <div className="text-[9px] text-gray-600">
                  User: {log.userId} • Device: {log.deviceId.substring(0, 30)}...
                </div>
              </div>
            ))}
            {logs.length === 0 && (
              <div className="text-center text-gray-600 text-xs py-10">
                No custody events recorded yet.
              </div>
            )}
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => window.print()}
              className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold text-sm"
            >
              GENERATE AUDIT PDF
            </button>
          </div>
        </>
      )}
    </div>
  );
}
