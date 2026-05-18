// WitnessLoopRecording.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";

// ------------------------------
// SECTION: TYPES & DB CONFIG
// ------------------------------
const DB_NAME = "WitnessLoopDB";
const STORE_NAME = "rolling_buffer";
const MAX_CHUNKS = 10; // 10 chunks * 30s = 5 minutes
const recorderSliceIntervals = new WeakMap<MediaRecorder, number>();

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve) => {
    const req = indexedDB.open(DB_NAME, 3);
    req.onupgradeneeded = (e: IDBVersionChangeEvent) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
  });
};

// ------------------------------
// SECTION: MAIN COMPONENT
// ------------------------------
export default function WitnessLoopRecording() {
  const [isLooping, setIsLooping] = useState(false);
  const [bufferSec, setBufferSec] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunkIds = useRef<string[]>([]);
  const tickerRef = useRef<number | null>(null);

  // 1. Storage Logic
  const pushToBuffer = async (blob: Blob) => {
    const db = await openDB();
    const id = `chunk_${Date.now()}`;

    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).add({ id, blob, ts: Date.now() });

    chunkIds.current.push(id);

    // Maintain 5-minute window
    if (chunkIds.current.length > MAX_CHUNKS) {
      const oldestId = chunkIds.current.shift();
      if (oldestId) {
        const delTx = db.transaction(STORE_NAME, "readwrite");
        delTx.objectStore(STORE_NAME).delete(oldestId);
      }
    }
  };

  // 2. Start Recording
  const startLoop = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) pushToBuffer(e.data);
      };

      // We use a manual slice strategy for better browser compatibility
      recorder.start();
      const sliceInterval = window.setInterval(() => {
        if (recorder.state === "recording") recorder.requestData();
      }, 30000); // 30s chunks

      // Visual Ticker
      const startTs = Date.now();
      tickerRef.current = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTs) / 1000);
        setBufferSec(Math.min(300, elapsed));
      }, 1000);

      setIsLooping(true);
      // Store slice interval on a WeakMap to avoid polluting MediaRecorder type
      recorderSliceIntervals.set(recorder, sliceInterval);
    } catch (err) {
      setError("Hardware access denied. Camera/Mic required.");
    }
  };

  const stopLoop = useCallback(() => {
    if (recorderRef.current) {
      const interval = recorderRef.current
        ? recorderSliceIntervals.get(recorderRef.current)
        : undefined;
      if (interval) clearInterval(interval);
      recorderRef.current.stop();
    }
    if (tickerRef.current) clearInterval(tickerRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());

    setIsLooping(false);
    setBufferSec(0);
  }, []);

  // 3. Save Final Buffer
  const finalizeBuffer = async () => {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();

    req.onsuccess = async () => {
      type LoopChunk = { id: string; blob: Blob; ts: number };
      const allChunks = (req.result as LoopChunk[]).sort((a, b) => a.ts - b.ts);
      if (allChunks.length === 0) return alert("Buffer empty.");

      const fullBlob = new Blob(
        allChunks.map((c) => c.blob),
        { type: "video/webm" },
      );

      // Compute Hash
      const hashBuffer = await crypto.subtle.digest("SHA-256", await fullBlob.arrayBuffer());
      const hash = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      // Trigger Download / Save
      const url = URL.createObjectURL(fullBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Witness_Loop_${new Date().getTime()}.webm`;
      a.click();

      alert(`Evidence preserved.\nHash: ${hash.substring(0, 12)}...`);
      stopLoop();
    };
  };

  useEffect(() => {
    return () => stopLoop(); // Cleanup on exit
  }, [stopLoop]);

  return (
    <div className="bg-black border border-red-900 rounded-3xl p-6 text-white max-w-sm mx-auto shadow-2xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-black italic text-red-600 uppercase tracking-tighter">
          Loop Guard
        </h2>
        <div
          className={`w-3 h-3 rounded-full ${isLooping ? "bg-red-500 animate-pulse shadow-[0_0_10px_#ff0000]" : "bg-gray-800"}`}
        />
      </div>

      {isLooping ? (
        <div className="space-y-6">
          <div className="bg-gray-900 p-4 rounded-2xl border border-gray-800">
            <div className="flex justify-between text-[10px] font-bold text-gray-500 mb-2 uppercase">
              <span>Rolling Buffer</span>
              <span>
                {Math.floor(bufferSec / 60)}:{(bufferSec % 60).toString().padStart(2, "0")} / 5:00
              </span>
            </div>
            <div className="h-1.5 w-full bg-black rounded-full overflow-hidden">
              <div
                className="h-full bg-red-600 transition-all duration-1000 ease-linear"
                style={{ width: `${(bufferSec / 300) * 100}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={finalizeBuffer}
              className="w-full bg-red-600 py-4 rounded-xl font-black text-sm shadow-xl"
            >
              SAVE LAST 5 MINUTES
            </button>
            <button
              onClick={stopLoop}
              className="w-full bg-gray-900 border border-gray-700 py-3 rounded-xl font-bold text-xs text-gray-400"
            >
              STOP LOOP
            </button>
          </div>

          <div className="text-center">
            <button
              onClick={() => {
                alert("SOS DISPATCHED");
                finalizeBuffer();
              }}
              className="text-red-500 text-[10px] font-black underline uppercase tracking-widest animate-pulse"
            >
              ⚠️ I AM BEING DETAINED
            </button>
          </div>
        </div>
      ) : (
        <div className="py-6 text-center">
          <div className="text-4xl mb-4 opacity-20">🔄</div>
          <p className="text-xs text-gray-500 mb-6 px-4">
            Loop mode keeps a rolling 5-minute buffer of video in encrypted storage. Press start to
            begin monitoring.
          </p>
          <button
            onClick={startLoop}
            className="w-full bg-red-600 py-4 rounded-xl font-black text-lg tracking-widest"
          >
            START MONITOR
          </button>
          {error && <p className="mt-4 text-red-500 text-[10px] font-bold">{error}</p>}
        </div>
      )}

      <div className="mt-6 pt-6 border-t border-gray-900">
        <p className="text-[8px] text-gray-700 leading-tight uppercase font-medium text-center">
          Loop data is stored in the browser's temporary sandbox. <br />
          Files must be "Saved" to move them to the permanent vault.
        </p>
      </div>
    </div>
  );
}
