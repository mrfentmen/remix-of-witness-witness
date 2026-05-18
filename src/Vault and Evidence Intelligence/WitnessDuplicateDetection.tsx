// WitnessDuplicateDetection.tsx
import React, { useState, useEffect, useRef } from "react";

// ------------------------------
// SECTION: TYPES
// ------------------------------
export interface RecordingFingerprint {
  id: string;
  firstFrameHash: string;
  durationMs: number;
  size: number;
  coords: { lat: number; lng: number } | null;
  ts: number;
}

// ------------------------------
// SECTION: CORE ENGINE
// ------------------------------

// Captures a small thumbnail and generates a hash
const generateVisualHash = async (blob: Blob): Promise<{ hash: string; preview: string }> => {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const canvas = document.createElement("canvas");
    const url = URL.createObjectURL(blob);

    video.muted = true;
    video.playsInline = true;
    video.src = url;

    video.onloadeddata = () => {
      video.currentTime = 0.1; // Seek to 100ms to skip potential black start
    };

    video.onseeked = async () => {
      // Downsample to 160x120 for fast hashing
      canvas.width = 160;
      canvas.height = 120;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(video, 0, 0, 160, 120);

      const preview = canvas.toDataURL("image/jpeg", 0.5);
      const imageData = ctx?.getImageData(0, 0, 160, 120).data;

      // Hash the pixels
      const hashBuffer = await crypto.subtle.digest("SHA-256", imageData!);
      const hash = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      // Cleanup
      URL.revokeObjectURL(url);
      video.remove();
      resolve({ hash, preview });
    };
  });
};

// Calculates similarity between two recordings (0 to 100)
const calculateSimilarity = (a: RecordingFingerprint, b: RecordingFingerprint): number => {
  let score = 0;

  // 1. Visual Match (50 points)
  if (a.firstFrameHash === b.firstFrameHash) score += 50;

  // 2. Metadata Match (25 points) - Duration within 2 seconds
  if (Math.abs(a.durationMs - b.durationMs) < 2000) score += 25;

  // 3. Location Match (25 points) - Within ~100 meters
  if (a.coords && b.coords) {
    const dist = Math.sqrt(
      Math.pow(a.coords.lat - b.coords.lat, 2) + Math.pow(a.coords.lng - b.coords.lng, 2),
    );
    if (dist < 0.001) score += 25;
  }

  return score;
};

// ------------------------------
// SECTION: MAIN COMPONENT
// ------------------------------
export default function WitnessDuplicateDetection({
  newFile,
  onResolve,
}: {
  newFile: { blob: Blob; duration: number; coords: { lat: number; lng: number } | null };
  onResolve: (action: "both" | "replace" | "discard") => void;
}) {
  const [matchingRec, setMatchingRec] = useState<RecordingFingerprint | null>(null);
  const [previews, setPreviews] = useState({ old: "", current: "" });
  const [similarity, setSimilarity] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const runCheck = async () => {
      // 1. Fingerprint the new file
      const { hash, preview } = await generateVisualHash(newFile.blob);
      const currentFP: RecordingFingerprint = {
        id: "temp",
        firstFrameHash: hash,
        durationMs: newFile.duration,
        size: newFile.blob.size,
        coords: newFile.coords,
        ts: Date.now(),
      };

      // 2. Compare against local DB
      const raw = localStorage.getItem("witness_fingerprints");
      const fingerprints: RecordingFingerprint[] = raw ? JSON.parse(raw) : [];

      let bestMatch: RecordingFingerprint | null = null;
      let highestScore = 0;

      for (const fp of fingerprints) {
        const score = calculateSimilarity(currentFP, fp);
        if (score > 70 && score > highestScore) {
          highestScore = score;
          bestMatch = fp;
        }
      }

      if (bestMatch) {
        setMatchingRec(bestMatch);
        setSimilarity(highestScore);
        setPreviews({ old: localStorage.getItem(`prev_${bestMatch.id}`) || "", current: preview });
        setLoading(false);
      } else {
        // No duplicate - save the fingerprint and move on
        fingerprints.push({ ...currentFP, id: crypto.randomUUID() });
        localStorage.setItem("witness_fingerprints", JSON.stringify(fingerprints.slice(-100))); // Keep last 100
        onResolve("both");
      }
    };

    runCheck();
  }, [newFile]);

  if (loading)
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-[3000]">
        <div className="text-red-600 font-black animate-pulse uppercase tracking-tighter">
          Analyzing for Duplicates...
        </div>
      </div>
    );

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center p-6 z-[3000]">
      <div className="bg-gray-900 border border-red-900 rounded-3xl p-8 max-w-lg w-full shadow-2xl">
        <h2 className="text-red-600 font-black italic text-xl mb-2 uppercase">
          Duplicate Detected
        </h2>
        <p className="text-gray-400 text-xs mb-6">
          This recording shares a {similarity}% similarity with an existing file in your vault.
        </p>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="text-center">
            <div className="text-[10px] text-gray-500 font-bold mb-2 uppercase">Existing File</div>
            <img
              src={previews.old}
              className="w-full aspect-video object-cover rounded-lg border border-gray-800"
            />
          </div>
          <div className="text-center">
            <div className="text-[10px] text-red-500 font-bold mb-2 uppercase">New Entry</div>
            <img
              src={previews.current}
              className="w-full aspect-video object-cover rounded-lg border border-red-600"
            />
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => onResolve("replace")}
            className="w-full bg-red-600 py-4 rounded-xl font-bold text-sm"
          >
            REPLACE EXISTING
          </button>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onResolve("both")}
              className="bg-gray-800 py-3 rounded-xl text-xs font-bold"
            >
              KEEP BOTH
            </button>
            <button
              onClick={() => onResolve("discard")}
              className="bg-gray-800 py-3 rounded-xl text-xs font-bold text-red-400"
            >
              DISCARD NEW
            </button>
          </div>
        </div>

        {similarity > 90 && (
          <div className="mt-6 bg-red-950/20 border border-red-900 p-3 rounded-lg text-center">
            <p className="text-[10px] text-red-400 font-bold italic">
              PRO-TIP: These look like a direct match. Replacing will save storage space.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
