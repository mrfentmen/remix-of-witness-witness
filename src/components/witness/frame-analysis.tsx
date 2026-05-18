import { useState, useEffect, useCallback, useRef } from "react";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { toast } from "sonner";

interface FrameAnalysisProps {
  videoUrl: string;
  fps?: number;
  recordingId: string;
  durationMs: number;
  onClose: () => void;
}

interface FrameMarker {
  id: string;
  frame: number;
  x: number;
  y: number;
  note: string;
}

export function FrameAnalysis({
  videoUrl,
  fps = 30,
  recordingId,
  durationMs,
  onClose,
}: FrameAnalysisProps) {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [markers, setMarkers] = useState<FrameMarker[]>([]);
  const [compareSnapshot, setCompareSnapshot] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isSeeking = useRef(false);
  const [totalFrames, setTotalFrames] = useState(0);
  const [videoReady, setVideoReady] = useState(false);

  // Calculate totalFrames from duration × fps on metadata loaded
  useEffect(() => {
    if (videoReady) return;
    const video = videoRef.current;
    if (!video) return;
    const onMeta = () => {
      const frames = Math.floor((video.duration || durationMs / 1000) * fps);
      setTotalFrames(frames);
      setVideoReady(true);
    };
    video.addEventListener("loadedmetadata", onMeta);
    return () => video.removeEventListener("loadedmetadata", onMeta);
  }, [fps, durationMs, videoReady]);

  const renderFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
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
  }, [currentFrame, markers]);

  const seekTo = useCallback(
    async (frame: number) => {
      const video = videoRef.current;
      if (!video || isSeeking.current) return;
      const clamped = Math.max(0, Math.min(frame, totalFrames - 1));
      isSeeking.current = true;
      video.currentTime = clamped / fps;
      return new Promise<void>((resolve) => {
        const onSeeked = () => {
          video.removeEventListener("seeked", onSeeked);
          renderFrame();
          setCurrentFrame(clamped);
          isSeeking.current = false;
          resolve();
        };
        video.addEventListener("seeked", onSeeked);
      });
    },
    [fps, totalFrames, renderFrame],
  );

  const captureComparison = () => {
    const canvas = canvasRef.current;
    if (canvas) setCompareSnapshot(canvas.toDataURL("image/jpeg", 0.9));
  };

  const exportFrame = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsExporting(true);
    try {
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 1.0));
      if (!blob) return;
      const hashBuf = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
      const hash = Array.from(new Uint8Array(hashBuf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      const timestamp = (currentFrame / fps).toFixed(3);
      const certText = [
        "WITNESS FRAME CERTIFICATE",
        `Source: ${recordingId}`,
        `Frame: ${currentFrame}`,
        `Time: ${timestamp}s`,
        `SHA256: ${hash}`,
        `Date: ${new Date().toISOString()}`,
      ].join("\n");
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `Witness_Frame_${currentFrame}.jpg`;
      link.click();
      setTimeout(() => {
        link.href = URL.createObjectURL(new Blob([certText], { type: "text/plain" }));
        link.download = `Witness_Frame_${currentFrame}_Cert.txt`;
        link.click();
      }, 500);
      toast.success(`Frame ${currentFrame} exported`);
    } catch (e) {
      console.error("[witness] frame export failed", e);
      toast.error("Frame export failed");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border/20 bg-zinc-900 px-4 py-3">
        <div>
          <h1 className="text-sm font-black uppercase italic text-primary">Frame Analysis</h1>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Frame {currentFrame} / {totalFrames} · {(currentFrame / fps).toFixed(2)}s
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={captureComparison}
            className="rounded-lg border border-border/30 px-3 py-1.5 text-[10px] font-bold uppercase text-muted-foreground hover:text-foreground"
          >
            Set Compare
          </button>
          <button
            onClick={exportFrame}
            disabled={isExporting}
            className="rounded-lg bg-primary px-3 py-1.5 text-[10px] font-bold uppercase text-primary-foreground disabled:opacity-50"
          >
            {isExporting ? "…" : "Export JPEG"}
          </button>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main canvas */}
      <main className="relative flex flex-1 items-center justify-center overflow-hidden bg-black p-4">
        <div
          className="relative cursor-crosshair transition-transform duration-200 ease-out"
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
            className="max-h-[60vh] max-w-full rounded-lg border border-border/20 shadow-2xl"
          />
        </div>
      </main>

      {/* Comparison sidebar */}
      {compareSnapshot && (
        <div className="border-t border-border/20 bg-zinc-900 px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-muted-foreground">
              Comparison Reference
            </span>
            <button onClick={() => setCompareSnapshot(null)} className="text-xs text-primary">
              Clear
            </button>
          </div>
          <img
            src={compareSnapshot}
            className="mt-2 h-24 rounded border border-primary/20 object-contain opacity-60 grayscale hover:opacity-100"
            alt="Comparison snapshot"
          />
        </div>
      )}

      {/* Bottom controls */}
      <footer className="border-t border-border/20 bg-zinc-950 px-4 py-4">
        <div className="mb-3 flex items-center gap-3">
          <button
            onClick={() => seekTo(currentFrame - 1)}
            className="grid h-10 w-10 place-items-center rounded-full border border-border/30 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <input
            type="range"
            min={0}
            max={totalFrames || 1}
            value={currentFrame}
            onChange={(e) => seekTo(parseInt(e.target.value))}
            className="flex-1 accent-primary"
          />
          <button
            onClick={() => seekTo(currentFrame + 1)}
            className="grid h-10 w-10 place-items-center rounded-full border border-border/30 text-muted-foreground hover:text-foreground"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] font-bold">
            <ZoomOut className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="range"
              min={1}
              max={4}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-20 accent-primary"
            />
            <ZoomIn className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">×{zoom.toFixed(1)}</span>
          </div>
          {markers.filter((m) => m.frame === currentFrame).length > 0 && (
            <div className="text-[10px] font-bold text-primary">
              ⚠️ {markers.filter((m) => m.frame === currentFrame).length} point(s)
            </div>
          )}
        </div>
      </footer>

      {isExporting && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/80">
          <div className="text-center">
            <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm font-black uppercase tracking-widest text-primary">Certifying…</p>
          </div>
        </div>
      )}
    </div>
  );
}
