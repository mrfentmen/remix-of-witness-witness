// WitnessCovertRecording.tsx
import React, { useEffect, useRef, useCallback, useState } from "react";

// ------------------------------
// SECTION: STORAGE ENGINE (IndexedDB)
// ------------------------------
const DB_NAME = "WitnessCovertDB";
const CHUNK_STORE = "encrypted_chunks";
const META_STORE = "recording_meta";

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2);
    request.onupgradeneeded = (e: IDBVersionChangeEvent) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(CHUNK_STORE))
        db.createObjectStore(CHUNK_STORE, { keyPath: "id" });
      if (!db.objectStoreNames.contains(META_STORE))
        db.createObjectStore(META_STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// ------------------------------
// SECTION: COVERT HOOK
// ------------------------------
export function useCovertRecording() {
  const [isRecording, setIsRecording] = useState(false);
  const isRecordingRef = useRef(false); // Essential for event listeners
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const encryptionKeyRef = useRef<CryptoKey | null>(null);

  const tapCounts = useRef({ left: 0, right: 0 });
  const gestureTimeout = useRef<number | null>(null);

  const haptic = (p: number | number[]) => navigator.vibrate?.(p);

  // 1. Encryption
  const initKey = async () => {
    encryptionKeyRef.current = await crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"],
    );
  };

  // 2. Start Logic
  const startCovert = async (mode: "audio" | "video") => {
    if (isRecordingRef.current) return;

    try {
      const constraints =
        mode === "audio" ? { audio: true } : { audio: true, video: { facingMode: "environment" } };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      await initKey();

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      const recId = crypto.randomUUID();

      recorder.ondataavailable = async (e) => {
        if (e.data.size > 0 && encryptionKeyRef.current) {
          const buffer = await e.data.arrayBuffer();
          const iv = crypto.getRandomValues(new Uint8Array(12));
          const encrypted = await crypto.subtle.encrypt(
            { name: "AES-GCM", iv },
            encryptionKeyRef.current,
            buffer,
          );

          const db = await openDB();
          const tx = db.transaction(CHUNK_STORE, "readwrite");
          tx.objectStore(CHUNK_STORE).add({
            id: crypto.randomUUID(),
            recId,
            data: encrypted,
            iv,
            timestamp: Date.now(),
          });
        }
      };

      recorder.start(2000); // Save chunks every 2s to prevent data loss
      isRecordingRef.current = true;
      setIsRecording(true);

      // Feedback: Short pulse for audio, long for video
      haptic(mode === "audio" ? 100 : [100, 50, 100]);
    } catch (err) {
      console.error("Covert failure", err);
      haptic([50, 50, 50, 50]); // Error vibration
    }
  };

  // 3. Stop Logic
  const stopCovert = useCallback(() => {
    if (!isRecordingRef.current) return;

    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }

    isRecordingRef.current = false;
    setIsRecording(false);
    haptic([300, 100, 300]); // "Safe" vibration
  }, []);

  // 4. Gesture Listener (Secret Corners)
  useEffect(() => {
    const handleTouch = (e: TouchEvent) => {
      const x = e.touches[0].clientX;
      const y = e.touches[0].clientY;
      const width = window.innerWidth;

      // Detect Corners (Hotzones: 80px)
      const isLeft = x < 80 && y < 80;
      const isRight = x > width - 80 && y < 80;

      if (!isLeft && !isRight) return;

      if (gestureTimeout.current) window.clearTimeout(gestureTimeout.current);
      gestureTimeout.current = window.setTimeout(() => {
        tapCounts.current = { left: 0, right: 0 };
      }, 2000);

      if (isLeft && !isRecordingRef.current) {
        tapCounts.current.left++;
        if (tapCounts.current.left === 4) startCovert("audio");
        if (tapCounts.current.left === 6) startCovert("video");
      } else if (isRight && isRecordingRef.current) {
        tapCounts.current.right++;
        if (tapCounts.current.right === 3) stopCovert();
      }
    };

    window.addEventListener("touchstart", handleTouch);
    return () => window.removeEventListener("touchstart", handleTouch);
  }, [stopCovert]);

  return { isRecording, stopCovert };
}

// ------------------------------
// SECTION: WRAPPER COMPONENT
// ------------------------------
export const WitnessCovertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isRecording } = useCovertRecording();

  return (
    <div className="relative w-full h-full">
      {children}
      {/* 
        This dot is purely for development testing. 
        In production, delete the <div> below to make it truly invisible. 
      */}
      {isRecording && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-red-600/20 rounded-full pointer-events-none" />
      )}
    </div>
  );
};
