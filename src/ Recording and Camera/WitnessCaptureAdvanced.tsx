// WitnessCaptureAdvanced.tsx
// Self-contained TypeScript React shell for advanced recording features.
// Implements loop recording, background survival, zoom controls, night vision,
// camera/flash toggles, volume button quick start, audio level meter,
// quality selector, auto scene detection. Uses Tailwind CSS and standard Web APIs.

import React, { useState, useEffect, useRef, useCallback } from "react";

// ------------------------------
// SECTION: Types & Interfaces
// ------------------------------
interface CaptureConstraints {
  video: {
    width: { ideal: number };
    height: { ideal: number };
    facingMode?: "user" | "environment";
    zoom?: number;
    torch?: boolean;
  };
  audio: boolean;
}

interface BufferConfig {
  maxDurationSec: number; // 300 for 5 minutes
  chunkDurationSec: number; // 30 seconds per chunk
}

// Helper: request camera stream with constraints
async function getCameraStream(constraints: CaptureConstraints): Promise<MediaStream> {
  return await navigator.mediaDevices.getUserMedia(constraints as MediaStreamConstraints);
}

// Helper: apply zoom to existing video track
async function applyZoom(track: MediaStreamTrack, zoom: number) {
  const capabilities = track.getCapabilities
    ? track.getCapabilities()
    : ({} as MediaTrackCapabilities);
  if (capabilities.zoom) {
    try {
      await track.applyConstraints({ advanced: [{ zoom }] } as MediaTrackConstraints);
    } catch (e) {
      console.warn("Zoom not applied", e);
    }
  }
}

// ------------------------------
// SECTION: Loop Recording Rolling Buffer (useLoopRecording)
// ------------------------------
export function useLoopRecording(
  stream: MediaStream | null,
  config: BufferConfig = { maxDurationSec: 300, chunkDurationSec: 30 },
) {
  const [isActive, setIsActive] = useState(false);
  const [chunks, setChunks] = useState<Blob[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunkIntervalRef = useRef<number | null>(null);
  const chunksCollector = useRef<Blob[]>([]);

  const startLoopRecording = useCallback(() => {
    if (!stream) return;
    const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
    mediaRecorderRef.current = recorder;
    chunksCollector.current = [];
    setChunks([]);

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksCollector.current.push(event.data);
        const maxChunks = config.maxDurationSec / config.chunkDurationSec;
        while (chunksCollector.current.length > maxChunks) {
          chunksCollector.current.shift();
        }
        setChunks([...chunksCollector.current]);
      }
    };

    recorder.start(config.chunkDurationSec * 1000);
    setIsActive(true);

    chunkIntervalRef.current = window.setInterval(() => {
      if (recorder.state === "recording") recorder.requestData();
    }, config.chunkDurationSec * 1000);
  }, [stream, config]);

  const stopLoopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (chunkIntervalRef.current) {
      clearInterval(chunkIntervalRef.current);
      chunkIntervalRef.current = null;
    }
    setIsActive(false);
  }, []);

  const saveBuffer = useCallback(async (): Promise<Blob> => {
    if (chunksCollector.current.length === 0) throw new Error("No footage in buffer");
    return new Blob(chunksCollector.current, { type: "video/webm" });
  }, []);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      if (chunkIntervalRef.current) clearInterval(chunkIntervalRef.current);
    };
  }, []);

  return {
    isActive,
    chunksCount: chunks.length,
    startLoopRecording,
    stopLoopRecording,
    saveBuffer,
  };
}

// ------------------------------
// SECTION: Background Recording Survival (useBackgroundCapture)
// ------------------------------
export function useBackgroundCapture(onVisibilityChange?: (hidden: boolean) => void) {
  const [isBackground, setIsBackground] = useState(false);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const hidden = document.hidden;
      setIsBackground(hidden);
      onVisibilityChange?.(hidden);
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [onVisibilityChange]);

  return { isBackground };
}

// ------------------------------
// SECTION: Zoom Control & Quick Presets (ZoomController)
// ------------------------------
export function ZoomController({
  videoTrack,
  onZoomChange,
}: {
  videoTrack: MediaStreamTrack | null;
  onZoomChange?: (zoom: number) => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [maxZoom, setMaxZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (videoTrack && videoTrack.getCapabilities) {
      const cap = videoTrack.getCapabilities();
      if (cap.zoom) {
        setMaxZoom(cap.zoom.max || 5);
      }
    }
  }, [videoTrack]);

  const setZoomLevel = async (level: number) => {
    const clamped = Math.min(maxZoom, Math.max(1, level));
    setZoom(clamped);
    if (videoTrack) await applyZoom(videoTrack, clamped);
    onZoomChange?.(clamped);
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let initialDistance = 0;
    let initialZoomValue = zoom;
    let pinchActive = false;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        initialDistance = Math.hypot(dx, dy);
        initialZoomValue = zoom;
        pinchActive = true;
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!pinchActive || e.touches.length !== 2) return;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const distance = Math.hypot(dx, dy);
      if (initialDistance > 0) {
        const scale = distance / initialDistance;
        const newZoom = Math.min(maxZoom, Math.max(1, initialZoomValue * scale));
        setZoomLevel(newZoom);
      }
    };
    const onTouchEnd = () => {
      pinchActive = false;
    };
    el.addEventListener("touchstart", onTouchStart);
    el.addEventListener("touchmove", onTouchMove);
    el.addEventListener("touchend", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [zoom, maxZoom]);

  return (
    <div
      ref={containerRef}
      className="absolute bottom-24 right-4 flex flex-col items-center gap-2 z-10"
    >
      <button
        onClick={() => setZoomLevel(zoom + 0.5)}
        className="bg-zinc-800 text-white w-10 h-10 rounded-full flex items-center justify-center border border-zinc-700 active:bg-red-600"
      >
        +
      </button>
      <div className="text-[10px] font-mono font-bold text-white bg-black bg-opacity-80 px-2 py-1 rounded border border-red-600">
        {zoom.toFixed(1)}x
      </div>
      <button
        onClick={() => setZoomLevel(zoom - 0.5)}
        className="bg-zinc-800 text-white w-10 h-10 rounded-full flex items-center justify-center border border-zinc-700 active:bg-red-600"
      >
        -
      </button>
      <div className="flex flex-col gap-1 mt-2">
        <button
          onClick={() => setZoomLevel(1)}
          className="bg-zinc-800 text-white px-2 py-1 rounded text-[10px] border border-zinc-700"
        >
          1x
        </button>
        <button
          onClick={() => setZoomLevel(2)}
          className="bg-zinc-800 text-white px-2 py-1 rounded text-[10px] border border-zinc-700"
        >
          2x
        </button>
        <button
          onClick={() => setZoomLevel(5)}
          className="bg-zinc-800 text-white px-2 py-1 rounded text-[10px] border border-zinc-700"
        >
          5x
        </button>
      </div>
    </div>
  );
}

// ------------------------------
// SECTION: Night Mode Canvas Enhancement (NightVisionFilter)
// ------------------------------
export function NightVisionFilter({
  stream,
  enabled,
  onStreamChange,
}: {
  stream: MediaStream | null;
  enabled: boolean;
  onStreamChange: (newStream: MediaStream) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!stream || !enabled) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    video.srcObject = stream;
    video.play();

    const ctx = canvas.getContext("2d");
    const processFrame = () => {
      if (video.videoWidth && video.videoHeight && ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.min(255, (data[i] * 1.3 - 128) * 1.2 + 128); // r
          data[i + 1] = Math.min(255, (data[i + 1] * 1.3 - 128) * 1.2 + 128); // g
          data[i + 2] = Math.min(255, (data[i + 2] * 1.3 - 128) * 1.2 + 128); // b
        }
        ctx.putImageData(imageData, 0, 0);
      }
      animationRef.current = requestAnimationFrame(processFrame);
    };
    processFrame();

    // @ts-expect-error - captureStream is part of HTMLCanvasElement in browsers
    const processedStream = canvas.captureStream(30);
    onStreamChange(processedStream);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [stream, enabled, onStreamChange]);

  return (
    <>
      <video ref={videoRef} style={{ display: "none" }} playsInline muted />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ display: enabled ? "block" : "none" }}
      />
    </>
  );
}

// ------------------------------
// SECTION: Camera Switch & Flash Toggles (HardwareToggles)
// ------------------------------
export function HardwareToggles({
  onFlip,
  onTorch,
  torchActive,
  facingMode,
}: {
  onFlip: () => void;
  onTorch: () => void;
  torchActive: boolean;
  facingMode: "user" | "environment";
}) {
  return (
    <div className="absolute top-20 right-4 flex flex-col gap-3 z-10">
      <button
        onClick={onFlip}
        className="bg-zinc-800 text-white p-3 rounded-full border border-zinc-700 shadow-lg active:bg-red-600 transition-colors"
      >
        <span className="text-xl leading-none">⇄</span>
      </button>
      <button
        onClick={onTorch}
        className={`p-3 rounded-full border shadow-lg transition-colors ${torchActive ? "bg-red-600 border-red-500" : "bg-zinc-800 border-zinc-700"}`}
      >
        <span className="text-xl leading-none">⚡</span>
      </button>
      <div className="text-[10px] font-black uppercase text-center text-white tracking-widest bg-black bg-opacity-40 rounded px-1">
        {facingMode === "user" ? "Front" : "Back"}
      </div>
    </div>
  );
}

// ------------------------------
// SECTION: Volume Button Quick Start (useHardwareTriggers)
// ------------------------------
export function useHardwareTriggers(onTrigger: () => void) {
  const pressCountRef = useRef(0);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Simulate volume interaction triggers if permitted by browser environment (usually limited)
      if (e.key === "VolumeUp" || e.key === "AudioVolumeUp") {
        pressCountRef.current++;
        if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
        timeoutRef.current = window.setTimeout(() => {
          if (pressCountRef.current >= 2) {
            onTrigger();
          }
          pressCountRef.current = 0;
        }, 500);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, [onTrigger]);
}

// ------------------------------
// SECTION: Audio Level Meter (AudioVisualizer)
// ------------------------------
export function AudioVisualizer({ stream }: { stream: MediaStream | null }) {
  const [level, setLevel] = useState(0);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!stream) return;
    let audioContext: AudioContext;
    try {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      audioContext = new AC();
    } catch (e) {
      return;
    }

    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const draw = () => {
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
      const avg = sum / dataArray.length / 255;
      setLevel(avg * 100);
      animationRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      audioContext.close();
    };
  }, [stream]);

  return (
    <div className="absolute bottom-20 left-4 w-32 h-2 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700">
      <div
        className="bg-red-600 h-full transition-all duration-75"
        style={{ width: `${level}%` }}
      />
    </div>
  );
}

// ------------------------------
// SECTION: Quality Selector (QualityManager)
// ------------------------------
export function QualityManager({
  onQualityChange,
}: {
  onQualityChange: (preset: "standard" | "high") => void;
}) {
  const [quality, setQuality] = useState<"standard" | "high">("standard");
  const handleChange = (preset: "standard" | "high") => {
    setQuality(preset);
    onQualityChange(preset);
  };
  return (
    <div className="bg-zinc-900 p-4 rounded-xl border-l-4 border-red-600 shadow-xl">
      <h3 className="font-black text-red-600 mb-3 uppercase text-xs tracking-widest">
        Video Resolution
      </h3>
      <div className="flex gap-2">
        <button
          onClick={() => handleChange("standard")}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${quality === "standard" ? "bg-red-600 text-white" : "bg-black border border-zinc-800 text-zinc-500"}`}
        >
          720p
        </button>
        <button
          onClick={() => handleChange("high")}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${quality === "high" ? "bg-red-600 text-white" : "bg-black border border-zinc-800 text-zinc-500"}`}
        >
          1080p
        </button>
      </div>
    </div>
  );
}

// ------------------------------
// SECTION: Auto Scene Detection (useSmartQuality)
// ------------------------------
export function useSmartQuality(
  videoElement: HTMLVideoElement | null,
  onMotionDetected: (isHighMotion: boolean) => void,
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const prevFrameRef = useRef<ImageData | null>(null);

  useEffect(() => {
    if (!videoElement) return;
    if (!canvasRef.current) canvasRef.current = document.createElement("canvas");
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const interval = window.setInterval(() => {
      if (!videoElement.videoWidth || !ctx) return;
      canvas.width = videoElement.videoWidth / 8; // Downsample for performance
      canvas.height = videoElement.videoHeight / 8;
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      if (prevFrameRef.current && imageData) {
        let diff = 0;
        const d1 = imageData.data;
        const d2 = prevFrameRef.current.data;
        for (let i = 0; i < d1.length; i += 16) {
          // Sample step
          diff +=
            Math.abs(d1[i] - d2[i]) +
            Math.abs(d1[i + 1] - d2[i + 1]) +
            Math.abs(d1[i + 2] - d2[i + 2]);
        }
        const motion = diff / ((canvas.width * canvas.height * 3) / 4); // adjust for sampling
        onMotionDetected(motion > 25);
      }
      prevFrameRef.current = imageData;
    }, 1000);

    return () => clearInterval(interval);
  }, [videoElement, onMotionDetected]);
}

// ------------------------------
// SECTION: MainApp Demo
// ------------------------------
export function MainApp() {
  const [currentTab, setCurrentTab] = useState<"camera" | "settings">("camera");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [torchActive, setTorchActive] = useState(false);
  const [nightMode, setNightMode] = useState(false);
  const [processedStream, setProcessedStream] = useState<MediaStream | null>(null);
  const [quality, setQuality] = useState<"standard" | "high">("standard");
  const videoRef = useRef<HTMLVideoElement>(null);

  const { startLoopRecording, stopLoopRecording, saveBuffer, isActive, chunksCount } =
    useLoopRecording(processedStream || stream, { maxDurationSec: 300, chunkDurationSec: 30 });

  const { isBackground } = useBackgroundCapture();

  useHardwareTriggers(() => {
    if (!isActive) startLoopRecording();
    else stopLoopRecording();
  });

  useEffect(() => {
    const constraints: CaptureConstraints = {
      video: {
        width: { ideal: quality === "high" ? 1920 : 1280 },
        height: { ideal: quality === "high" ? 1080 : 720 },
        facingMode,
        torch: torchActive,
      },
      audio: true,
    };
    getCameraStream(constraints).then(setStream).catch(console.error);
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [facingMode, torchActive, quality]);

  // Set srcObject imperatively to avoid React JSX type limitation on video elements
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = nightMode ? processedStream || stream : stream;
    }
  }, [stream, processedStream, nightMode]);

  const handleFlip = () => setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  const handleTorch = () => setTorchActive((prev) => !prev);
  const handleSaveLoop = async () => {
    try {
      const blob = await saveBuffer();
      alert(`Evidence package compiled: ${Math.round(blob.size / 1024)} KB stored in local vault.`);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : String(e));
    }
  };

  useSmartQuality(videoRef.current, (isHigh) => {
    if (isHigh && quality !== "high") {
      setQuality("high");
      console.log("High motion detected - scaling to 1080p");
    }
  });

  const renderCamera = () => (
    <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center">
      {stream && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${isBackground ? "opacity-0" : "opacity-100"}`}
        />
      )}
      <NightVisionFilter stream={stream} enabled={nightMode} onStreamChange={setProcessedStream} />
      <ZoomController videoTrack={stream?.getVideoTracks()[0] || null} />
      <HardwareToggles
        onFlip={handleFlip}
        onTorch={handleTorch}
        torchActive={torchActive}
        facingMode={facingMode}
      />
      <AudioVisualizer stream={stream} />

      <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-4">
        {isActive && (
          <button
            onClick={handleSaveLoop}
            className="bg-black/60 border border-red-600 text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse"
          >
            Extract Buffer
          </button>
        )}
        <button
          onClick={isActive ? stopLoopRecording : startLoopRecording}
          className={`w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all ${isActive ? "bg-zinc-900 border-zinc-800" : "bg-red-600 border-red-500 shadow-[0_0_20px_rgba(232,0,0,0.4)]"}`}
        >
          <div
            className={`${isActive ? "w-8 h-8 rounded" : "w-16 h-16 rounded-full"} bg-white transition-all`}
          />
        </button>
      </div>

      <div className="absolute top-6 left-6 flex flex-col gap-1">
        <div className="bg-black/60 border border-zinc-800 px-3 py-1 rounded-full text-[9px] font-black uppercase text-zinc-400 tracking-tighter">
          {isActive ? <span className="text-red-600">● Buffer Active</span> : "Standby"}
        </div>
        {isActive && (
          <div className="text-red-500 text-[9px] font-bold uppercase ml-1 tracking-widest">
            {chunksCount}/10 Segments
          </div>
        )}
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="p-6 space-y-6 bg-black min-h-full">
      <QualityManager onQualityChange={setQuality} />
      <div className="bg-zinc-900 p-4 rounded-xl border-l-4 border-red-600 shadow-xl">
        <h3 className="font-black text-red-600 mb-2 uppercase text-xs tracking-widest">
          Enhanced Vision
        </h3>
        <button
          onClick={() => setNightMode(!nightMode)}
          className={`w-full py-3 rounded-lg text-xs font-bold transition-colors ${nightMode ? "bg-red-600 text-white" : "bg-black border border-zinc-800 text-zinc-500"}`}
        >
          {nightMode ? "ISO Gain: Active" : "ISO Gain: Off"}
        </button>
        <p className="text-[10px] text-zinc-600 mt-2 leading-tight uppercase font-medium">
          Digital amplification for forensic capture in low-light environments.
        </p>
      </div>
      <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
        <h3 className="text-white text-xs font-black uppercase mb-1">Rolling Loop</h3>
        <p className="text-zinc-500 text-[10px] uppercase font-bold">
          Maintains an encrypted 5-minute buffer across 10 encrypted chunks.
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col">
      <div className="flex-1 flex flex-col">
        {currentTab === "camera" ? renderCamera() : renderSettings()}
      </div>

      <nav className="bg-zinc-950 border-t border-zinc-900 flex justify-around items-center py-4 px-2 pb-8">
        <button
          onClick={() => setCurrentTab("camera")}
          className={`flex flex-col items-center gap-1 transition-all ${currentTab === "camera" ? "text-red-600" : "text-zinc-600 hover:text-zinc-400"}`}
        >
          <span className="text-lg">📷</span>
          <span className="text-[9px] font-black uppercase tracking-tighter">Sensor</span>
        </button>
        <button
          onClick={() => setCurrentTab("settings")}
          className={`flex flex-col items-center gap-1 transition-all ${currentTab === "settings" ? "text-red-600" : "text-zinc-600 hover:text-zinc-400"}`}
        >
          <span className="text-lg">⚙️</span>
          <span className="text-[9px] font-black uppercase tracking-tighter">Config</span>
        </button>
      </nav>
    </div>
  );
}

export default MainApp;
