// Chain of custody: logs every significant action on a recording
// with SHA‑256 hash chaining for tamper detection.
export type CustodyAction = "viewed" | "exported" | "shared" | "uploaded" | "certificate_generated";

export interface CustodyLogEntry {
  id: string;
  recordingId: string;
  action: CustodyAction;
  timestamp: string;
  deviceId: string;
  previousHash: string;
  hash: string;
}

const DB_NAME = "WitnessAuditTrail";
const STORE_NAME = "custody_logs";

function stableStringify(obj: Record<string, unknown>): string {
  return JSON.stringify(obj, Object.keys(obj).sort());
}

async function computeSHA256(data: string): Promise<string> {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(data));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function openAuditDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 2);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("recordingId", "recordingId");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Log a custody action for a recording. Returns the new log entry. */
export async function recordCustodyAction(
  recordingId: string,
  action: CustodyAction,
): Promise<CustodyLogEntry> {
  const db = await openAuditDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  const index = store.index("recordingId");

  return new Promise((resolve, reject) => {
    const req = index.getAll(recordingId);
    req.onsuccess = async () => {
      const logs = (req.result as CustodyLogEntry[]).sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );
      const previousHash = logs.length > 0 ? logs[logs.length - 1].hash : "0".repeat(64);

      const entryBase = {
        id: crypto.randomUUID(),
        recordingId,
        action,
        timestamp: new Date().toISOString(),
        deviceId: navigator.userAgent.slice(0, 50),
        previousHash,
      };

      const hash = await computeSHA256(
        stableStringify(entryBase as unknown as Record<string, unknown>),
      );
      const fullEntry: CustodyLogEntry = { ...entryBase, hash };

      const putReq = store.add(fullEntry);
      putReq.onsuccess = () => resolve(fullEntry);
      putReq.onerror = () => reject(putReq.error);
    };
    req.onerror = () => reject(req.error);
  });
}

/** Fetch all custody logs for a recording, sorted by timestamp. */
export async function getCustodyLogs(recordingId: string): Promise<CustodyLogEntry[]> {
  const db = await openAuditDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.index("recordingId").getAll(recordingId);
    req.onsuccess = () => {
      const entries = (req.result as CustodyLogEntry[]).sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );
      resolve(entries);
    };
    req.onerror = () => reject(req.error);
  });
}

/** Verify the entire hash chain for a recording. Returns { valid: boolean, entries }. */
export async function verifyCustodyChain(
  recordingId: string,
): Promise<{ valid: boolean; entries: CustodyLogEntry[] }> {
  const entries = await getCustodyLogs(recordingId);

  let valid = true;
  let lastHash = "0".repeat(64);

  for (const entry of entries) {
    if (entry.previousHash !== lastHash) {
      valid = false;
      break;
    }
    const { hash: _, ...base } = entry;
    const recalculated = await computeSHA256(
      stableStringify(base as unknown as Record<string, unknown>),
    );
    if (recalculated !== entry.hash) {
      valid = false;
      break;
    }
    lastHash = entry.hash;
  }

  return { valid, entries };
}
