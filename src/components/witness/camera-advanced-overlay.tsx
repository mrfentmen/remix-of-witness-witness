import { Pause, Play, Sparkles, Zap, ZapOff, RefreshCw } from "lucide-react";
import type { RecordingQuality } from "@/lib/witness-db";

interface Props {
  recording: boolean;
  paused: boolean;
  onPauseResume: () => void;
  flashOn: boolean;
  onToggleFlash: () => void;
  flashSupported: boolean;
  nightMode: boolean;
  onToggleNightMode: () => void;
  audioLevel: number; // 0..100
  quality: RecordingQuality;
  onQualityChange: (q: RecordingQuality) => void;
  zoom: number;
  zoomMin: number;
  zoomMax: number;
  zoomType: "optical" | "digital";
  onZoomChange: (n: number) => void;
  loopActive: boolean;
  loopBufferedMs: number;
  onToggleLoop: () => void;
  sceneHint: string | null;
}

function fmt(ms: number) {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

export function CameraAdvancedOverlay(p: Props) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {/* Top-right control stack */}
      <div className="pointer-events-auto absolute right-3 top-24 flex flex-col gap-2 a11y-handed">
        {p.flashSupported && (
          <button
            type="button"
            onClick={p.onToggleFlash}
            aria-label={p.flashOn ? "Turn flash off" : "Turn flash on"}
            className={`grid h-10 w-10 place-items-center rounded-full border border-white/20 backdrop-blur-md active:scale-95 ${
              p.flashOn ? "bg-amber-400/90 text-black" : "bg-black/50 text-white"
            }`}
          >
            {p.flashOn ? <Zap className="h-4 w-4" /> : <ZapOff className="h-4 w-4" />}
          </button>
        )}
        <button
          type="button"
          onClick={p.onToggleNightMode}
          aria-label="Toggle night mode"
          aria-pressed={p.nightMode}
          className={`grid h-10 w-10 place-items-center rounded-full border border-white/20 backdrop-blur-md active:scale-95 ${
            p.nightMode ? "bg-indigo-500/90 text-white" : "bg-black/50 text-white"
          }`}
        >
          <Sparkles className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={p.onToggleLoop}
          aria-label="Toggle loop mode"
          aria-pressed={p.loopActive}
          className={`grid h-10 w-10 place-items-center rounded-full border border-white/20 backdrop-blur-md active:scale-95 ${
            p.loopActive ? "bg-emerald-500/90 text-white" : "bg-black/50 text-white"
          }`}
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Quality selector — top-left under timer area */}
      <div className="pointer-events-auto absolute left-3 top-24 flex flex-col items-start gap-1">
        <div className="flex overflow-hidden rounded-full border border-white/20 bg-black/50 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md">
          {(["standard", "high"] as const).map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => p.onQualityChange(q)}
              className={`px-2.5 py-1 ${p.quality === q ? "bg-white text-black" : ""}`}
            >
              {q === "high" ? "HD" : "SD"}
            </button>
          ))}
        </div>
        {p.loopActive && (
          <span className="rounded-full bg-emerald-500/85 px-2 py-0.5 text-[10px] font-semibold text-white shadow">
            Loop · {fmt(p.loopBufferedMs)}
          </span>
        )}
        {p.sceneHint && (
          <span className="rounded-full bg-amber-500/85 px-2 py-0.5 text-[10px] font-semibold text-white shadow">
            {p.sceneHint}
          </span>
        )}
      </div>

      {/* Pause/resume — only while recording */}
      {p.recording && (
        <div className="pointer-events-auto absolute left-1/2 top-16 -translate-x-1/2">
          <button
            type="button"
            onClick={p.onPauseResume}
            aria-label={p.paused ? "Resume recording" : "Pause recording"}
            className="inline-flex h-9 items-center gap-1 rounded-full bg-black/60 px-3 text-xs font-bold uppercase tracking-wider text-white backdrop-blur-md active:scale-95"
          >
            {p.paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            {p.paused ? "Resume" : "Pause"}
          </button>
        </div>
      )}

      {/* Audio meter — left edge */}
      <div
        className="pointer-events-none absolute left-1 top-1/2 h-40 w-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-white/15"
        aria-hidden
      >
        <div
          className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-emerald-400 via-amber-400 to-rose-500 transition-[height] duration-75"
          style={{ height: `${Math.min(100, p.audioLevel)}%` }}
        />
      </div>

      {/* Zoom slider — bottom-right vertical */}
      <div className="pointer-events-auto absolute bottom-44 right-3 flex flex-col items-center gap-1 a11y-handed">
        <div className="flex gap-1">
          {[1, 2, 3].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => p.onZoomChange(preset)}
              aria-label={`Zoom ${preset}x`}
              className={`rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white/70 transition hover:text-white ${
                Math.abs(p.zoom - preset) < 0.15 ? "text-white ring-1 ring-white/30" : ""
              }`}
            >
              {preset}x
            </button>
          ))}
        </div>
        <span className="rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">
          {p.zoom.toFixed(1)}x
        </span>
        <input
          type="range"
          min={p.zoomMin}
          max={p.zoomMax}
          step={0.1}
          value={p.zoom}
          onChange={(e) => p.onZoomChange(Number(e.target.value))}
          aria-label="Zoom"
          className="h-32 w-1.5 -rotate-90 origin-center accent-white"
        />
        <span className="rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-white/80">
          {p.zoomType === "optical" ? "Opt" : "Dig"}
        </span>
      </div>
    </div>
  );
}
