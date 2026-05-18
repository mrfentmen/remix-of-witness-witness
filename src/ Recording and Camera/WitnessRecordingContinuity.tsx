// WitnessRecordingContinuity.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";

// ------------------------------
// SECTION: TYPES
// ------------------------------
export interface RecordingSegment {
  startTime: number;
  endTime: number;
}

export interface ContinuityLog {
  recordingId: string;
  segments: RecordingSegment[];
  totalRecordedMs: number;
  totalElapsedMs: number;
  hasGaps: boolean;
}

// ------------------------------
// SECTION: STORAGE (IndexedDB)
// ------------------------------
const DB_NAME = "WitnessContinuityDB";
const STORE_NAME = "continuity_logs";

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, 2);
    request.onupgradeneeded = (e: IDBVersionChangeEvent) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "recordingId" });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
};

// ------------------------------
// SECTION: UI COMPONENTS
// ------------------------------

export const ContinuityBadge: React.FC<{ hasGaps: boolean }> = ({ hasGaps }) => (
  <div style={hasGaps ? styles.badgeSegmented : styles.badgeContinuous}>
    <span style={!hasGaps ? styles.pulseDot : {}} />
    {hasGaps ? "SEGMENTED DATA" : "CONTINUOUS SOURCE"}
  </div>
);

export const ContinuityTimeline: React.FC<{ log: ContinuityLog }> = ({ log }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Handle High-DPI Scaling
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Draw Background
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, width, height);

    const total = log.totalElapsedMs;

    log.segments.forEach((seg, i) => {
      const xStart = (seg.startTime / total) * width;
      const xEnd = (seg.endTime / total) * width;

      // Draw Segment (Green)
      ctx.fillStyle = "#4caf50";
      ctx.fillRect(xStart, 0, xEnd - xStart, height);

      // Label
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.font = "bold 9px monospace";
      ctx.fillText(`S${i + 1}`, xStart + 2, 12);
    });

    // Draw Pauses (Hashed/Gray)
    for (let i = 0; i < log.segments.length - 1; i++) {
      const gapStart = (log.segments[i].endTime / total) * width;
      const gapEnd = (log.segments[i + 1].startTime / total) * width;
      ctx.fillStyle = "#333";
      ctx.fillRect(gapStart, 0, gapEnd - gapStart, height);
    }
  }, [log]);

  return (
    <div style={{ marginTop: 10 }}>
      <canvas ref={canvasRef} style={styles.timelineCanvas} />
      <div style={styles.timelineLegend}>
        <span style={{ color: "#4caf50" }}>■ RECORDING</span>
        <span style={{ color: "#444" }}>■ PAUSED</span>
      </div>
    </div>
  );
};

// ------------------------------
// SECTION: LOGIC & HOOK
// ------------------------------

export const generateContinuityCert = (log: ContinuityLog): string => {
  const status = log.hasGaps ? "SEGMENTED" : "CONTINUOUS";
  return `
AUDIT: RECORDING CONTINUITY REPORT
----------------------------------
ID: ${log.recordingId}
INTEGRITY STATUS: ${status}
TOTAL DURATION: ${(log.totalElapsedMs / 1000).toFixed(2)}s
ACTIVE FOOTAGE: ${(log.totalRecordedMs / 1000).toFixed(2)}s
SEGMENTS: ${log.segments.length}

${log.hasGaps ? "LEGAL NOTICE: Gaps detected in recording stream. Forensic timestamps provided for audit trail." : "VERIFIED: Uninterrupted single-stream capture."}
    `.trim();
};

export function useRecordingContinuity() {
  const [segments, setSegments] = useState<RecordingSegment[]>([]);
  const startTs = useRef<number>(0);

  const start = () => {
    startTs.current = Date.now();
    setSegments([{ startTime: 0, endTime: 0 }]);
  };

  const pause = () => {
    const elapsed = Date.now() - startTs.current;
    setSegments((prev) => {
      const last = [...prev];
      last[last.length - 1].endTime = elapsed;
      return last;
    });
  };

  const resume = () => {
    const elapsed = Date.now() - startTs.current;
    setSegments((prev) => [...prev, { startTime: elapsed, endTime: elapsed }]);
  };

  const stop = (id: string): ContinuityLog => {
    const elapsed = Date.now() - startTs.current;
    const finalSegments = [...segments];

    // Close the final open segment
    if (
      finalSegments[finalSegments.length - 1].endTime ===
      finalSegments[finalSegments.length - 1].startTime
    ) {
      finalSegments[finalSegments.length - 1].endTime = elapsed;
    }

    const recorded = finalSegments.reduce((s, seg) => s + (seg.endTime - seg.startTime), 0);

    const log: ContinuityLog = {
      recordingId: id,
      segments: finalSegments,
      totalRecordedMs: recorded,
      totalElapsedMs: elapsed,
      hasGaps: finalSegments.length > 1,
    };

    openDB().then((db) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(log);
    });

    return log;
  };

  return { start, pause, resume, stop };
}

// ------------------------------
// SECTION: DEMO
// ------------------------------
export default function WitnessRecordingContinuity() {
  const { start, pause, resume, stop } = useRecordingContinuity();
  const [log, setLog] = useState<ContinuityLog | null>(null);
  const [status, setStatus] = useState<"idle" | "rec" | "paused">("idle");

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>INTEGRITY MONITOR</h2>

      <div style={styles.controls}>
        {status === "idle" && (
          <button
            style={styles.btnRec}
            onClick={() => {
              start();
              setStatus("rec");
            }}
          >
            START CAPTURE
          </button>
        )}

        {status === "rec" && (
          <div style={styles.btnRow}>
            <button
              style={styles.btn}
              onClick={() => {
                pause();
                setStatus("paused");
              }}
            >
              PAUSE
            </button>
            <button
              style={styles.btnStop}
              onClick={() => {
                setLog(stop("demo_123"));
                setStatus("idle");
              }}
            >
              STOP & LOG
            </button>
          </div>
        )}

        {status === "paused" && (
          <button
            style={styles.btnRec}
            onClick={() => {
              resume();
              setStatus("rec");
            }}
          >
            RESUME
          </button>
        )}
      </div>

      {log && (
        <div style={styles.resultBox}>
          <ContinuityBadge hasGaps={log.hasGaps} />
          <ContinuityTimeline log={log} />
          <pre style={styles.certBox}>{generateContinuityCert(log)}</pre>
        </div>
      )}
    </div>
  );
}

// ------------------------------
// SECTION: STYLES
// ------------------------------
const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: "#000",
    padding: "25px",
    borderRadius: "20px",
    fontFamily: "monospace",
    color: "#fff",
    maxWidth: "500px",
    margin: "20px auto",
    border: "1px solid #333",
  },
  title: {
    color: "#d32f2f",
    fontSize: "18px",
    fontWeight: "black",
    marginBottom: "20px",
    italic: "true",
  },
  controls: { marginBottom: "20px" },
  btnRec: {
    backgroundColor: "#d32f2f",
    color: "#fff",
    padding: "12px 20px",
    borderRadius: "8px",
    border: "none",
    width: "100%",
    fontWeight: "bold",
  },
  btn: {
    backgroundColor: "#222",
    color: "#fff",
    padding: "12px 20px",
    borderRadius: "8px",
    border: "1px solid #444",
    flex: 1,
  },
  btnStop: {
    backgroundColor: "#fff",
    color: "#000",
    padding: "12px 20px",
    borderRadius: "8px",
    border: "none",
    flex: 1,
    fontWeight: "bold",
  },
  btnRow: { display: "flex", gap: "10px" },
  resultBox: { marginTop: "30px", borderTop: "1px solid #222", paddingTop: "20px" },
  badgeContinuous: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    backgroundColor: "#1b5e20",
    color: "#4caf50",
    padding: "5px 12px",
    borderRadius: "20px",
    fontSize: "10px",
    fontWeight: "bold",
  },
  badgeSegmented: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    backgroundColor: "#422006",
    color: "#ff9800",
    padding: "5px 12px",
    borderRadius: "20px",
    fontSize: "10px",
    fontWeight: "bold",
  },
  pulseDot: {
    width: "6px",
    height: "6px",
    backgroundColor: "#4caf50",
    borderRadius: "50%",
    animation: "pulse 1.5s infinite",
  },
  timelineCanvas: { width: "100%", height: "40px", borderRadius: "4px", marginTop: "15px" },
  timelineLegend: {
    display: "flex",
    gap: "15px",
    fontSize: "8px",
    marginTop: "5px",
    fontWeight: "bold",
  },
  certBox: {
    backgroundColor: "#111",
    padding: "15px",
    borderRadius: "10px",
    fontSize: "10px",
    color: "#888",
    marginTop: "20px",
    whiteSpace: "pre-wrap",
    border: "1px solid #222",
  },
};
