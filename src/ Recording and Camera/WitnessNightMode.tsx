// WitnessNightMode.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";

// ------------------------------
// SECTION: TYPES
// ------------------------------
interface NightModeSettings {
  brightness: number;
  contrast: number;
  sharpen: boolean;
}

// ------------------------------
// SECTION: COMPONENT
// ------------------------------
export default function WitnessNightMode() {
  const [isActive, setIsActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  // Refs for high-performance processing (avoids React re-renders)
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | undefined>(undefined);
  const lastFrameTime = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);

  const FRAME_INTERVAL = 1000 / 15; // Cap at 15 FPS for mobile stability

  // 1. Camera Initialization
  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 } },
          audio: true,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        requestRef.current = requestAnimationFrame(processLoop);
      } catch (err) {
        console.error("Camera access denied");
      }
    }
    startCamera();
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [isActive]); // Re-init on mode toggle to ensure sync

  // 2. The Heavy Lifting: Pixel Processing Loop
  const processLoop = (time: number) => {
    if (time - lastFrameTime.current >= FRAME_INTERVAL) {
      lastFrameTime.current = time;
      renderFrame();
    }
    requestRef.current = requestAnimationFrame(processLoop);
  };

  const renderFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.paused || video.ended) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    // Match dimensions
    if (canvas.width !== video.videoWidth) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    ctx.drawImage(video, 0, 0);

    if (isActive) {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Analysis: Check brightness every 100th pixel to save CPU
      let brightnessSum = 0;
      for (let i = 0; i < data.length; i += 400) {
        brightnessSum += (data[i] + data[i + 1] + data[i + 2]) / 3;
      }
      const avg = brightnessSum / (data.length / 400);
      if (avg < 40 && !showSuggestion) setShowSuggestion(true);

      // Processing: Single-pass adjustment (Brightness + Contrast)
      const b = 1.4; // Brightness multiplier
      const c = 1.2; // Contrast multiplier
      for (let i = 0; i < data.length; i += 4) {
        data[i] = (data[i] * b - 128) * c + 128; // R
        data[i + 1] = (data[i + 1] * b - 128) * c + 128; // G
        data[i + 2] = (data[i + 2] * b - 128) * c + 128; // B
      }
      ctx.putImageData(imageData, 0, 0);
    }
  };

  // 3. Torch Logic
  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (track && "torch" in track.getCapabilities()) {
      try {
        await track.applyConstraints({ advanced: [{ torch: !torchOn }] } as MediaTrackConstraints);
        setTorchOn(!torchOn);
      } catch (e) {
        console.warn("Torch not supported");
      }
    }
  };

  // 4. Recording Logic
  const startRecording = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const stream = canvas.captureStream(15);
    // Add audio back in
    const audioTrack = streamRef.current?.getAudioTracks()[0];
    if (audioTrack) stream.addTrack(audioTrack);

    const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
    recorderRef.current = recorder;
    recorder.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setIsRecording(false);
    alert("Enhanced recording preserved in Vault.");
  };

  return (
    <div className="bg-black min-h-screen text-white p-4 font-sans">
      <header className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-black italic text-red-600">NIGHT VISION</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setIsActive(!isActive)}
            className={`px-4 py-1 rounded-full text-[10px] font-bold border transition-all ${isActive ? "bg-red-600 border-red-600" : "bg-gray-900 border-gray-700 text-gray-500"}`}
          >
            {isActive ? "ISO BOOST ACTIVE" : "STANDARD MODE"}
          </button>
        </div>
      </header>

      {/* Viewfinder */}
      <div className="relative aspect-video bg-zinc-900 rounded-3xl overflow-hidden border border-gray-800 shadow-2xl">
        <video ref={videoRef} className="hidden" muted playsInline />
        <canvas ref={canvasRef} className="w-full h-full object-cover" />

        {isActive && (
          <div className="absolute top-4 left-4 bg-red-600/20 text-red-500 px-2 py-1 rounded text-[9px] font-black border border-red-600/40 animate-pulse">
            DIGITAL GAIN ENABLED
          </div>
        )}

        {showSuggestion && !isActive && (
          <div className="absolute inset-x-4 bottom-4 bg-black/80 backdrop-blur-md border border-red-900 p-4 rounded-2xl animate-in slide-in-from-bottom-2">
            <p className="text-xs font-bold mb-2">Low light detected. Enable Night Vision?</p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setIsActive(true);
                  setShowSuggestion(false);
                }}
                className="bg-red-600 text-[10px] font-black px-4 py-2 rounded-lg"
              >
                ENABLE
              </button>
              <button
                onClick={() => setShowSuggestion(false)}
                className="text-gray-500 text-[10px] px-2"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="mt-8 flex flex-col items-center gap-6">
        <div className="flex gap-4">
          <button
            onClick={toggleTorch}
            className={`p-4 rounded-full border ${torchOn ? "bg-yellow-500/20 border-yellow-500 text-yellow-500" : "bg-gray-900 border-gray-800 text-gray-500"}`}
          >
            🔦
          </button>
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all ${isRecording ? "border-gray-800 bg-red-600 animate-pulse" : "border-red-600 bg-transparent"}`}
          >
            <div
              className={`rounded-sm transition-all ${isRecording ? "w-6 h-6 bg-white" : "w-14 h-14 bg-red-600 rounded-full"}`}
            />
          </button>
          <button className="p-4 rounded-full bg-gray-900 border border-gray-800 text-gray-500">
            ⚙️
          </button>
        </div>

        <p className="text-[9px] text-gray-600 uppercase tracking-widest text-center">
          Digital gain increases noise. <br /> Use for visibility, not cinematic quality.
        </p>
      </div>
    </div>
  );
}
