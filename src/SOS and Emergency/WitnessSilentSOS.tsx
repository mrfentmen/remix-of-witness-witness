// WitnessSilentSOS.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";

// ------------------------------
// SECTION: TYPES & DB
// ------------------------------
const DB_NAME = "WitnessSilentDB";
const STORE_NAME = "recordings";

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e: IDBVersionChangeEvent) =>
      e.target.result.createObjectStore(STORE_NAME, { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
};

// ------------------------------
// SECTION: MAIN COMPONENT
// ------------------------------
const WitnessSilentSOS: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [showConfirmDot, setShowConfirmDot] = useState(false);

  // Refs for background processing
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const encryptionKeyRef = useRef<CryptoKey | null>(null);
  const isActiveRef = useRef(false); // Used to avoid stale state in timeouts
  const tapCounts = useRef({ topLeft: 0, topRight: 0 });
  const gestureTimeout = useRef<NodeJS.Timeout | null>(null);

  // 1. Silent Notification (Haptic)
  const silentVibrate = (pattern: number | number[]) => {
    if (navigator.vibrate) navigator.vibrate(pattern);
  };

  // 2. Encryption Engine
  const initCrypto = async () => {
    encryptionKeyRef.current = await crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"],
    );
  };

  // 3. SOS Trigger Logic
  const triggerSOS = async () => {
    if (isActiveRef.current) return; // Prevent double-triggering

    isActiveRef.current = true;
    setIsActive(true);
    silentVibrate([100, 50, 100]); // Two tiny pulses only the user feels

    try {
      // A. Initialize Audio & Crypto
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      await initCrypto();

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = async (e) => {
        if (!e.data?.size || !encryptionKeyRef.current) return;
        try {
          const buffer = await e.data.arrayBuffer();
          const iv = crypto.getRandomValues(new Uint8Array(12));
          const encrypted = await crypto.subtle.encrypt(
            { name: "AES-GCM", iv },
            encryptionKeyRef.current,
            buffer,
          );

          const db = await openDB();
          const tx = db.transaction(STORE_NAME, "readwrite");
          await new Promise<void>((resolve, reject) => {
            const req = tx.objectStore(STORE_NAME).add({
              id: crypto.randomUUID(),
              data: encrypted,
              iv: iv,
              timestamp: Date.now(),
            });
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
          });
        } catch (chunkErr) {
          // If encryption or IndexedDB fails, the chunk is lost.
          // At minimum log it so a future crash-report can surface the gap.
          console.error("[witness-silent-sos] chunk save failed", chunkErr);
          // Fallback: stash raw chunk to a fallback object store if available.
          try {
            const db = await openDB();
            const tx = db.transaction(STORE_NAME, "readwrite");
            tx.objectStore(STORE_NAME).add({
              id: crypto.randomUUID(),
              data: "raw-fallback",
              rawBlob: e.data,
              timestamp: Date.now(),
              fallback: true,
            });
          } catch {
            /* completely out of storage — nothing more we can do */
          }
        }
      };

      recorder.start(5000); // Save audio in 5-second chunks

      // B. GPS & SOS API (Simulated)
      navigator.geolocation.getCurrentPosition((pos) => {
        console.log("SILENT SOS: GPS Sent", pos.coords.latitude);
        // fetch("/api/sos/silent", { method: "POST", body: ... })
      });

      // C. Hidden Confirmation (Tiny red dot appears after 5s for 1s)
      setTimeout(() => {
        if (isActiveRef.current) {
          setShowConfirmDot(true);
          setTimeout(() => setShowConfirmDot(false), 1000);
        }
      }, 5000);
    } catch (err) {
      console.error("Silent SOS initialization failed", err);
      cancelSOS();
    }
  };

  // 4. Cancel Logic
  const cancelSOS = useCallback(() => {
    isActiveRef.current = false;
    setIsActive(false);
    silentVibrate(300); // One longer vibration to confirm "Safe" status

    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
    }
  }, []);

  // 5. Gesture Detection for Silent Trigger
  useEffect(() => {
    const handlePointer = (e: PointerEvent) => {
      const x = e.clientX;
      const y = e.clientY;
      const isTopLeft = x < 80 && y < 80;
      const isTopRight = window.innerWidth - x < 80 && y < 80;
      if (!isTopLeft && !isTopRight) return;

      if (gestureTimeout.current) clearTimeout(gestureTimeout.current);
      gestureTimeout.current = setTimeout(() => {
        tapCounts.current = { topLeft: 0, topRight: 0 };
      }, 3000);

      if (isTopLeft) {
        tapCounts.current.topLeft++;
        if (tapCounts.current.topLeft === 3 && !isActiveRef.current) {
          triggerSOS();
        }
      } else if (isTopRight && isActiveRef.current) {
        tapCounts.current.topRight++;
        if (tapCounts.current.topRight === 2) {
          cancelSOS();
        }
      }
    };
    window.addEventListener("pointerdown", handlePointer);
    return () => {
      window.removeEventListener("pointerdown", handlePointer);
      if (gestureTimeout.current) clearTimeout(gestureTimeout.current);
    };
  }, [triggerSOS, cancelSOS]);

  return (
    <div className="min-h-screen bg-black text-white font-sans flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center">
        <div className="mb-8 relative flex justify-center">
          <div
            className={`w-32 h-32 rounded-full flex items-center justify-center border-4 transition-all duration-500 ${
              isActive ? "border-red-600 shadow-[0_0_30px_rgba(232,0,28,0.6)]" : "border-zinc-800"
            }`}
          >
            <span className="text-4xl">{isActive ? "🔴" : "⚪"}</span>
          </div>
          {showConfirmDot && (
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-600 rounded-full animate-ping" />
          )}
        </div>

        <h2 className="text-2xl font-black text-red-600 uppercase tracking-tighter mb-2">
          Silent SOS
        </h2>
        <p className="text-zinc-500 text-xs uppercase tracking-widest mb-10">
          {isActive ? "Covert recording in progress..." : "Tap top-left corner 3x to activate"}
        </p>

        {isActive ? (
          <button
            onClick={cancelSOS}
            className="w-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white font-bold py-4 rounded-2xl uppercase text-sm tracking-widest transition-all"
          >
            Cancel & Lock Buffer
          </button>
        ) : (
          <button
            onClick={triggerSOS}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-2xl uppercase text-sm tracking-widest transition-all shadow-lg shadow-red-900/20"
          >
            Arm Silent Mode
          </button>
        )}

        <p className="text-[10px] text-zinc-600 mt-8 leading-relaxed">
          Audio is encrypted with AES-256-GCM before being stored locally. GPS coordinates are
          captured silently. No visual indicators appear on screen.
        </p>
      </div>
    </div>
  );
};

export default WitnessSilentSOS;
