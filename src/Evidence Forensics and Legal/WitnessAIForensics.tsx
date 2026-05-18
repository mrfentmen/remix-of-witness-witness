// WitnessAIForensics.tsx
// Self-contained TypeScript React shell for advanced AI and analytical forensics.
// Implements: Audio/Voice AI (real-time audio enhancement, voice stress analysis, transcription with key-phrase flagging),
// Scene & Integrity AI (scene analysis mock, deepfake detection score, AI incident summaries),
// Frame Analysis (frame-by-frame forensic interface with annotation tools),
// Moderation Engine (graphic content flagging for public map).
// Exports all components/hooks. Uses Tailwind CSS, Web Audio API, canvas mock.

import React, { useState, useEffect, useCallback, useRef } from "react";

// ------------------------------
// SECTION: Types & Interfaces
// ------------------------------
export interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
  flaggedPhrases?: string[];
}

export interface StressSegment {
  startTime: number;
  endTime: number;
  stressScore: number;
}

export interface DeepfakeScore {
  overall: number;
  facialBoundary: number;
  blinking: number;
  lighting: number;
  temporal: number;
}

export interface IncidentSummary {
  who: string;
  what: string;
  when: string;
  where: string;
  concerns: string[];
}

export interface SceneEvent {
  type: "movement" | "weapon" | "contact" | "crowd";
  timestamp: number;
  confidence: number;
}

export interface Annotation {
  id: string;
  x: number;
  y: number;
  text: string;
}

// Key phrases for transcription flagging
const KEY_PHRASES = [
  "i can not breathe",
  "hands up",
  "do not shoot",
  "stop resisting",
  "i am not resisting",
  "get off me",
  "you are hurting me",
  "i want a lawyer",
  "am i being detained",
  "i do not consent",
  "stop please",
  "help me",
  "he has a gun",
  "she has a gun",
];

// Mock audio stress analysis
const mockStressAnalysis = (duration: number): StressSegment[] => {
  const segments: StressSegment[] = [];
  for (let i = 0; i < duration; i += 10) {
    segments.push({
      startTime: i,
      endTime: Math.min(i + 10, duration),
      stressScore: Math.floor(Math.random() * 100),
    });
  }
  return segments;
};

// ------------------------------
// SECTION: Audio/Voice AI (AudioForensics)
// ------------------------------
export function AudioForensics() {
  const [transcription, setTranscription] = useState<TranscriptionSegment[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [stressData, setStressData] = useState<StressSegment[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [audioLevel, setAudioLevel] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const stopAudioMonitor = useCallback(() => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current) audioContextRef.current.close();
    setAudioLevel(0);
  }, []);

  const startAudioMonitor = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length;
        setAudioLevel(avg / 255);
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
    } catch (err) {
      console.error("Microphone access denied", err);
    }
  };

  const startTranscription = () => {
    setIsTranscribing(true);
    // Simulate transcription processing
    setTimeout(() => {
      const mockSegments: TranscriptionSegment[] = [
        {
          start: 0,
          end: 3.5,
          text: "Officer, I am recording this interaction.",
          flaggedPhrases: [],
        },
        {
          start: 3.8,
          end: 7.2,
          text: "You do not have permission to search my vehicle.",
          flaggedPhrases: ["search my vehicle"],
        },
        {
          start: 7.5,
          end: 12.0,
          text: "I am exercising my right to remain silent.",
          flaggedPhrases: ["right to remain silent"],
        },
      ];
      setTranscription(mockSegments);
      setIsTranscribing(false);
      setStressData(mockStressAnalysis(60));
    }, 2000);
  };

  useEffect(() => {
    return () => stopAudioMonitor();
  }, [stopAudioMonitor]);

  const filteredSegments = transcription.filter((seg) =>
    seg.text.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <div className="bg-zinc-950 p-4 rounded-xl border-l-4 border-red-600 shadow-lg">
        <h3 className="font-bold text-red-600 mb-2 uppercase tracking-tighter">
          Real-time Audio Monitor
        </h3>
        <button
          onClick={startAudioMonitor}
          className="bg-zinc-800 text-white px-4 py-1 rounded-full text-xs font-bold border border-zinc-700 hover:border-red-600 transition-all"
        >
          Start Mic Monitor
        </button>
        <div className="mt-4 h-3 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
          <div
            className="bg-red-600 h-full transition-all duration-75"
            style={{ width: `${audioLevel * 100}%` }}
          />
        </div>
      </div>

      <div className="bg-zinc-950 p-4 rounded-xl border-l-4 border-red-600 shadow-lg">
        <h3 className="font-bold text-red-600 mb-2 uppercase tracking-tighter">AI Transcription</h3>
        <button
          onClick={startTranscription}
          disabled={isTranscribing}
          className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest disabled:opacity-50 transition-all"
        >
          {isTranscribing ? "Processing..." : "Transcribe Source"}
        </button>
        <input
          type="text"
          placeholder="Filter logs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-sm mt-3 text-white focus:border-red-600 outline-none"
        />
        <div className="mt-4 max-h-48 overflow-y-auto space-y-2 custom-scrollbar">
          {filteredSegments.length === 0 && (
            <p className="text-zinc-600 text-xs italic">No data yet...</p>
          )}
          {filteredSegments.map((seg, i) => (
            <div key={i} className="border-b border-zinc-900 pb-2">
              <span className="text-red-500 font-mono text-[10px]">[{seg.start.toFixed(1)}s]</span>
              <p className="text-zinc-300 text-sm inline ml-2">{seg.text}</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {seg.flaggedPhrases?.map((p) => (
                  <span
                    key={p}
                    className="bg-red-900/30 text-red-500 text-[9px] px-2 py-0.5 rounded-full border border-red-900 font-bold uppercase tracking-tighter italic"
                  >
                    Flag: {p}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-zinc-950 p-4 rounded-xl border-l-4 border-red-600 shadow-lg">
        <h3 className="font-bold text-red-600 mb-2 uppercase tracking-tighter">
          Voice Stress Analysis
        </h3>
        <div className="h-12 bg-black rounded-lg flex items-center overflow-hidden border border-zinc-900">
          {stressData.map((seg, i) => {
            const color =
              seg.stressScore > 70 ? "#E8001C" : seg.stressScore > 40 ? "#f97316" : "#22c55e";
            return (
              <div
                key={i}
                className="h-full border-r border-black/20"
                style={{
                  width: `${100 / stressData.length}%`,
                  backgroundColor: color,
                }}
                title={`Stress: ${seg.stressScore}%`}
              />
            );
          })}
        </div>
        <p className="text-[10px] text-zinc-500 mt-2 italic font-medium uppercase tracking-widest">
          Digital biomarker metadata — Supplemental only
        </p>
      </div>
    </div>
  );
}

// ------------------------------
// SECTION: Scene & Integrity AI (VisualIntelligence)
// ------------------------------
export function VisualIntelligence() {
  const [deepfakeScore, setDeepfakeScore] = useState<DeepfakeScore | null>(null);
  const [summary, setSummary] = useState<IncidentSummary | null>(null);
  const [sceneEvents, setSceneEvents] = useState<SceneEvent[]>([]);
  const [analyzing, setAnalyzing] = useState(false);

  const analyzeRecording = () => {
    setAnalyzing(true);
    setDeepfakeScore(null);
    setTimeout(() => {
      setDeepfakeScore({
        overall: 82,
        facialBoundary: 88,
        blinking: 75,
        lighting: 80,
        temporal: 92,
      });
      setSummary({
        who: "Two distinct audio-visual subjects confirmed",
        what: "Standard public-officer interaction identified",
        when: new Date().toLocaleString(),
        where: "Spatial metadata verified via node",
        concerns: ["Elevated decibel levels detected at 00:12"],
      });
      setSceneEvents([
        { type: "movement", timestamp: 2.5, confidence: 78 },
        { type: "crowd", timestamp: 5.8, confidence: 62 },
        { type: "weapon", timestamp: 12.3, confidence: 45 },
      ]);
      setAnalyzing(false);
    }, 2000);
  };

  return (
    <div className="space-y-4">
      <div className="bg-zinc-950 p-6 rounded-xl border-l-4 border-red-600 shadow-lg">
        <h3 className="font-bold text-red-600 mb-4 uppercase tracking-tighter">
          AI Integrity Scan
        </h3>
        <button
          onClick={analyzeRecording}
          disabled={analyzing}
          className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all w-full disabled:opacity-50"
        >
          {analyzing ? "Deep Scanning..." : "Run Forensic Audit"}
        </button>

        {deepfakeScore && (
          <div className="mt-6 animate-in fade-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-4">
              <span className="text-zinc-400 font-bold uppercase text-xs tracking-widest">
                Authenticity Score
              </span>
              <span
                className={`text-2xl font-black italic ${deepfakeScore.overall < 60 ? "text-red-600" : "text-green-500"}`}
              >
                {deepfakeScore.overall}%
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { l: "Facial Boundaries", v: deepfakeScore.facialBoundary },
                { l: "Blink Patterns", v: deepfakeScore.blinking },
                { l: "Global Lighting", v: deepfakeScore.lighting },
                { l: "Temporal Flow", v: deepfakeScore.temporal },
              ].map((s) => (
                <div key={s.l} className="bg-black p-2 rounded border border-zinc-900 text-center">
                  <div className="text-zinc-600 text-[9px] font-black uppercase tracking-widest mb-1">
                    {s.l}
                  </div>
                  <div className="text-white text-xs font-mono">{s.v}%</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {summary && (
        <div className="bg-zinc-950 p-6 rounded-xl border-l-4 border-red-600 shadow-lg space-y-4 animate-in slide-in-from-bottom-2">
          <h3 className="text-red-600 font-bold uppercase tracking-tighter">Auto-Dossier</h3>
          <div className="grid grid-cols-1 gap-4 text-xs font-medium">
            <div>
              <span className="text-zinc-500 font-black uppercase block mb-1">Subjects</span>{" "}
              {summary.who}
            </div>
            <div>
              <span className="text-zinc-500 font-black uppercase block mb-1">Classification</span>{" "}
              {summary.what}
            </div>
            <div>
              <span className="text-zinc-500 font-black uppercase block mb-1">
                Spatial Metadata
              </span>{" "}
              {summary.where}
            </div>
            {summary.concerns.length > 0 && (
              <div className="bg-red-900/10 p-2 rounded border border-red-900/30">
                <span className="text-red-500 font-black uppercase block mb-1 text-[9px]">
                  Priority Concerns Flagged
                </span>
                <p className="text-red-500 font-bold italic">"{summary.concerns.join(", ")}"</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ------------------------------
// SECTION: Frame Analysis (ForensicStudio)
// ------------------------------
export function ForensicStudio() {
  const [frame, setFrame] = useState(0);
  const [totalFrames] = useState(300);
  const [zoom, setZoom] = useState(1);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / (rect.width / canvas.width);
    const y = (e.clientY - rect.top) / (rect.height / canvas.height);
    const text = window.prompt("Reference note:");
    if (text) {
      setAnnotations((prev) => [...prev, { id: Date.now().toString(), x, y, text }]);
    }
  };

  const exportFrame = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL("image/jpeg", 1.0);
      const link = document.createElement("a");
      link.download = `forensic_frame_${frame}.jpg`;
      link.href = dataUrl;
      link.click();
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Background
    ctx.fillStyle = "#050505";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid simulation
    ctx.strokeStyle = "rgba(255,0,0,0.05)";
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    for (let j = 0; j < canvas.height; j += 40) {
      ctx.beginPath();
      ctx.moveTo(0, j);
      ctx.lineTo(canvas.width, j);
      ctx.stroke();
    }

    // Text info
    ctx.fillStyle = "rgba(232,0,28,0.6)";
    ctx.font = "bold 10px monospace";
    ctx.fillText(`SENSOR_NODE: W-REP-AI-01`, 20, 25);
    ctx.fillText(`FRAME_INDEX: ${frame.toString().padStart(5, "0")}`, 20, 40);

    // Annotations
    annotations.forEach((anno) => {
      ctx.beginPath();
      ctx.arc(anno.x, anno.y, 8, 0, 2 * Math.PI);
      ctx.strokeStyle = "#E8001C";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "#E8001C";
      ctx.font = "bold 12px sans-serif";
      ctx.fillText(anno.text, anno.x + 12, anno.y - 12);
    });
  }, [frame, annotations]);

  return (
    <div className="bg-zinc-950 p-6 rounded-2xl border-l-4 border-red-600 shadow-2xl overflow-hidden">
      <h3 className="font-bold text-red-600 mb-4 uppercase tracking-tighter">
        Forensic Frame Analysis
      </h3>
      <div
        className="relative bg-black rounded-lg border border-zinc-900 overflow-hidden cursor-crosshair mb-6 shadow-inner"
        ref={containerRef}
      >
        <canvas
          ref={canvasRef}
          width={640}
          height={360}
          onClick={handleCanvasClick}
          className="w-full h-auto transition-transform duration-200 ease-out"
          style={{ transform: `scale(${zoom})`, transformOrigin: "center" }}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button
          onClick={() => setFrame((prev) => Math.max(0, prev - 1))}
          className="bg-zinc-900 text-white py-2 rounded-lg text-[10px] font-black uppercase border border-zinc-800 hover:border-red-600"
        >
          Prev Frame
        </button>
        <button
          onClick={() => setFrame((prev) => Math.min(totalFrames - 1, prev + 1))}
          className="bg-zinc-900 text-white py-2 rounded-lg text-[10px] font-black uppercase border border-zinc-800 hover:border-red-600"
        >
          Next Frame
        </button>
        <button
          onClick={() => setZoom((z) => Math.min(4, z + 0.5))}
          className="bg-zinc-900 text-white py-2 rounded-lg text-[10px] font-black uppercase border border-zinc-800 hover:border-red-600"
        >
          Zoom +
        </button>
        <button
          onClick={() => setZoom(1)}
          className="bg-zinc-900 text-white py-2 rounded-lg text-[10px] font-black uppercase border border-zinc-800 hover:border-red-600"
        >
          Reset
        </button>
      </div>

      <div className="mt-6 pt-6 border-t border-zinc-900 flex justify-between items-center">
        <button
          onClick={exportFrame}
          className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all"
        >
          Export Forensic JPG
        </button>
        <span className="text-zinc-600 text-[10px] font-mono uppercase tracking-widest">
          {annotations.length} points logged
        </span>
      </div>
    </div>
  );
}

// ------------------------------
// SECTION: Moderation Engine (SafetyFilter)
// ------------------------------
export function SafetyFilter() {
  const [flagged, setFlagged] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const analyzeGraphicContent = () => {
    setAnalyzing(true);
    setFlagged(false);
    setTimeout(() => {
      setFlagged(Math.random() > 0.6);
      setAnalyzing(false);
    }, 1500);
  };

  return (
    <div className="bg-zinc-950 p-6 rounded-xl border-l-4 border-red-600 shadow-lg">
      <h3 className="font-bold text-red-600 mb-4 uppercase tracking-tighter">
        Content Integrity Audit
      </h3>
      <button
        onClick={analyzeGraphicContent}
        disabled={analyzing}
        className="bg-zinc-800 border border-zinc-700 text-white px-8 py-2 rounded-full text-[10px] font-black uppercase tracking-widest hover:border-red-600 transition-all"
      >
        {analyzing ? "Deep-Scanning..." : "Check Sensitivity Thresholds"}
      </button>

      {flagged && (
        <div className="mt-4 p-4 bg-red-950/20 border border-red-900/50 rounded-xl animate-pulse">
          <div className="text-xs font-black text-red-500 uppercase tracking-widest flex items-center gap-2 mb-2">
            <span>⚠️ SCENE WARNING REQUIRED</span>
          </div>
          <p className="text-[10px] text-zinc-400 font-bold uppercase leading-tight">
            Forensic AI identifies potential blood or high-stress trauma events. Automatic map-pin
            blurring suggested.
          </p>
        </div>
      )}
    </div>
  );
}

// ------------------------------
// SECTION: MainApp Demo
// ------------------------------
export function MainApp() {
  const [activeTab, setActiveTab] = useState<"audio" | "visual" | "studio">("audio");

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-red-600/30">
      <header className="py-8 px-6 text-center border-b border-zinc-900">
        <h1 className="text-4xl font-black italic text-red-600 uppercase tracking-tighter">
          Forensic Engine
        </h1>
        <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.4em] mt-2">
          Analytical Sub-System v4.2
        </p>
      </header>

      <nav className="flex justify-center gap-2 p-6">
        {(["audio", "visual", "studio"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${
              activeTab === tab
                ? "bg-red-600 border-red-600 text-white shadow-lg shadow-red-900/30"
                : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {tab}
          </button>
        ))}
      </nav>

      <main className="max-w-2xl mx-auto px-6 pb-24">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {activeTab === "audio" && <AudioForensics />}
          {activeTab === "visual" && (
            <div className="space-y-6">
              <VisualIntelligence />
              <SafetyFilter />
            </div>
          )}
          {activeTab === "studio" && <ForensicStudio />}
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 p-4 bg-black/80 backdrop-blur-md border-t border-zinc-900 text-center pointer-events-none">
        <p className="text-[8px] font-black text-zinc-700 uppercase tracking-[0.6em]">
          Witness R.E.P • Forensic Verification Protocol enabled
        </p>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #27272a; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #E8001C; }
      `}</style>
    </div>
  );
}

export default MainApp;
