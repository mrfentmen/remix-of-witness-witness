// WitnessFrameAnalysis.tsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";

// ------------------------------
// SECTION: TYPES
// ------------------------------
export interface FrameMarker {
  id: string;
  frame: number;
  x: number; // 0-1
  y: number;
  note: string;
}

// ------------------------------
// SECTION: UTILS
// ------------------------------
const computeHash = async (data: ArrayBuffer): Promise<string> => {
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

// ------------------------------
// SECTION: COMPONENT
// ------------------------------
export default function WitnessFrameAnalysis({
  videoUrl,
  fps = 30,
  recordingId,
}: {
  videoUrl: string;
  fps?: number;
  recordingId: string;
}) {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [markers, setMarkers] = useState<FrameMarker[]>([]);
  const [compareSnapshot, setCompareSnapshot] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isSeeking = useRef(false);

  // 1. Core Navigation
  const seekTo = useCallback(
    async (frame: number) => {
      const video = videoRef.current;
      if (!video || isSeeking.current) return;

      isSeeking.current = true;
      const targetTime = frame / fps;
      video.currentTime = targetTime;

      return new Promise<void>((resolve) => {
        const onSeeked = () => {
          video.removeEventListener("seeked", onSeeked);
          renderFrame();
          setCurrentFrame(frame);
          isSeeking.current = false;
          resolve();
        };
        video.addEventListener("seeked", onSeeked);
      });
    },
    [fps],
  );

  // 2. High-Fidelity Rendering
  const renderFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Maintain aspect ratio
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    // Draw Markers
    markers
      .filter((m) => m.frame === currentFrame)
      .forEach((m) => {
        ctx.beginPath();
        ctx.arc(m.x * canvas.width, m.y * canvas.height, 10, 0, Math.PI * 2);
        ctx.fillStyle = "#ff0000";
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.stroke();
      });
  };

  // 3. Snapshot for Comparison
  const captureComparison = () => {
    const canvas = canvasRef.current;
    if (canvas) setCompareSnapshot(canvas.toDataURL("image/jpeg", 0.9));
  };

  // 4. Forensic Export
  const exportFrame = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsExporting(true);

    // A. Generate JPEG
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 1.0));
    if (!blob) return;

    // B. Generate Frame-Specific Hash
    const hash = await computeHash(await blob.arrayBuffer());

    // C. Download Package
    const timestamp = (currentFrame / fps).toFixed(3);
    const certText = `WITNESS FRAME CERTIFICATE\nSource: ${recordingId}\nFrame: ${currentFrame}\nTime: ${timestamp}s\nSHA256: ${hash}\nDate: ${new Date().toISOString()}`;

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Witness_Frame_${currentFrame}.jpg`;
    link.click();

    const certBlob = new Blob([certText], { type: "text/plain" });
    link.href = URL.createObjectURL(certBlob);
    link.download = `Witness_Frame_${currentFrame}_Cert.txt`;
    link.click();

    setIsExporting(false);
  };

  return (
    <div className="fixed inset-0 bg-black text-white font-sans flex flex-col z-[4000]">
      {/* Top Header */}
      <header className="p-4 border-b border-gray-800 flex justify-between items-center bg-zinc-900">
        <div>
          <h1 className="text-red-600 font-black italic">FRAME ANALYSIS</h1>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest">
            Frame {currentFrame} • {(currentFrame / fps).toFixed(2)}s
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={captureComparison}
            className="bg-gray-800 text-[10px] font-bold px-3 py-1 rounded"
          >
            SET COMPARE
          </button>
          <button
            onClick={exportFrame}
            className="bg-red-600 text-[10px] font-bold px-3 py-1 rounded"
          >
            EXPORT JPEG
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 relative overflow-hidden flex flex-col lg:flex-row">
        {/* Primary View */}
        <div className="flex-1 relative bg-black flex items-center justify-center p-4">
          <div
            className="relative transition-transform duration-200 ease-out cursor-crosshair"
            style={{ transform: `scale(${zoom})` }}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = (e.clientX - rect.left) / rect.width;
              const y = (e.clientY - rect.top) / rect.height;
              setMarkers([
                ...markers,
                { id: crypto.randomUUID(), frame: currentFrame, x, y, note: "" },
              ]);
            }}
          >
            <video ref={videoRef} src={videoUrl} className="hidden" muted playsInline />
            <canvas
              ref={canvasRef}
              className="max-w-full max-h-[60vh] rounded-lg shadow-2xl border border-gray-800"
            />
          </div>
        </div>

        {/* Comparison Sidebar (The Snapshot View) */}
        {compareSnapshot && (
          <div className="w-full lg:w-72 bg-zinc-900 border-l border-gray-800 p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-bold text-gray-500 uppercase">
                Comparison Reference
              </span>
              <button onClick={() => setCompareSnapshot(null)} className="text-red-500 text-xs">
                Clear
              </button>
            </div>
            <img
              src={compareSnapshot}
              className="w-full rounded border border-red-900/30 opacity-60 grayscale hover:opacity-100 transition-opacity"
            />
            <p className="text-[9px] text-gray-600 mt-2 italic">
              Scrub main view to compare differences frame-by-frame.
            </p>
          </div>
        )}
      </main>

      {/* Bottom Controls */}
      <footer className="p-6 bg-zinc-950 border-t border-red-900/20">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => seekTo(currentFrame - 1)}
            className="w-12 h-12 rounded-full bg-gray-900 border border-gray-800"
          >
            ◀
          </button>
          <input
            type="range"
            min={0}
            max={1000} // Dynamic based on video duration in real app
            value={currentFrame}
            onChange={(e) => seekTo(parseInt(e.target.value))}
            className="flex-1 accent-red-600 h-1"
          />
          <button
            onClick={() => seekTo(currentFrame + 1)}
            className="w-12 h-12 rounded-full bg-gray-900 border border-gray-800"
          >
            ▶
          </button>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex gap-4">
            <div className="text-[10px] font-bold">
              <span className="text-gray-500">ZOOM:</span> {zoom}x
              <input
                type="range"
                min={1}
                max={4}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="ml-2 w-20 accent-red-600"
              />
            </div>
          </div>

          <div className="flex gap-2">
            {markers.filter((m) => m.frame === currentFrame).length > 0 && (
              <div className="text-[10px] text-red-500 font-bold animate-pulse">
                ⚠️ {markers.filter((m) => m.frame === currentFrame).length} POINT(S) MARKED
              </div>
            )}
          </div>
        </div>
      </footer>

      {isExporting && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-[5000]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm font-black tracking-widest animate-pulse text-red-600">
              CERTIFYING DATA...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
