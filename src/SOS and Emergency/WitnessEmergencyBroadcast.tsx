// WitnessEmergencyBroadcast.tsx
import React, { useState, useEffect, useRef } from "react";

// ------------------------------
// SECTION: TYPES & INTERFACES
// ------------------------------
interface BroadcastState {
  active: boolean;
  recording: "idle" | "active" | "stopping";
  livestream: "idle" | "active" | "failed";
  sos: "idle" | "sent" | "failed";
  map: "idle" | "posted" | "failed";
  location: "idle" | "active" | "failed";
  watchUrl?: string;
}

interface EncryptedChunk {
  id: string;
  data: ArrayBuffer;
  iv: Uint8Array;
  timestamp: number;
}

// ------------------------------
// SECTION: CONSTANTS & DB
// ------------------------------
const DB_NAME = "WitnessDB";
const RECORDINGS_STORE = "recordings";
const CHUNKS_STORE = "chunks";

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e: IDBVersionChangeEvent) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(RECORDINGS_STORE))
        db.createObjectStore(RECORDINGS_STORE, { keyPath: "id" });
      if (!db.objectStoreNames.contains(CHUNKS_STORE))
        db.createObjectStore(CHUNKS_STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// ------------------------------
// SECTION: COMPONENT
// ------------------------------
const WitnessEmergencyBroadcast: React.FC = () => {
  const [state, setState] = useState<BroadcastState>({
    active: false,
    recording: "idle",
    livestream: "idle",
    sos: "idle",
    map: "idle",
    location: "idle",
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const encryptionKeyRef = useRef<CryptoKey | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const broadcastIdRef = useRef<string>(crypto.randomUUID());
  const locationIntervalRef = useRef<number | null>(null);

  // 1. Encryption Engine
  const initCrypto = async () => {
    encryptionKeyRef.current = await crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"],
    );
  };

  const encryptData = async (data: ArrayBuffer) => {
    if (!encryptionKeyRef.current) return null;
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      encryptionKeyRef.current,
      data,
    );
    return { ciphertext, iv };
  };

  // 2. Livestream Logic (WHIP Mock)
  const startMuxStream = async () => {
    // Simulation of Mux WHIP Ingest
    await new Promise((r) => setTimeout(r, 1000));
    return {
      id: "mux-123",
      url: `https://stream.mux.com/${Math.random().toString(36).slice(2)}.m3u8`,
    };
  };

  // 3. The Big Red Button Logic
  const startEmergency = async () => {
    broadcastIdRef.current = crypto.randomUUID();
    setState((s) => ({ ...s, active: true }));

    try {
      // Initialize Camera & Crypto
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      await initCrypto();

      // A. Start Livestream First (to get the URL for SOS)
      const streamData = await startMuxStream();
      setState((s) => ({ ...s, livestream: "active", watchUrl: streamData.url }));

      // B. Start Encrypted Recording
      const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
      recorder.ondataavailable = async (e) => {
        if (!e.data?.size) return;
        try {
          const buffer = await e.data.arrayBuffer();
          const encrypted = await encryptData(buffer);
          if (encrypted) {
            const db = await openDB();
            const tx = db.transaction(CHUNKS_STORE, "readwrite");
            await new Promise<void>((resolve, reject) => {
              const req = tx.objectStore(CHUNKS_STORE).add({
                id: crypto.randomUUID(),
                parent: broadcastIdRef.current,
                data: encrypted.ciphertext,
                iv: encrypted.iv,
                timestamp: Date.now(),
              });
              req.onsuccess = () => resolve();
              req.onerror = () => reject(req.error);
            });
          }
        } catch (chunkErr) {
          console.error("[witness-emergency] chunk save failed", chunkErr);
          // Fallback: keep raw chunk unencrypted if encryption/DB fails.
          try {
            const db = await openDB();
            const tx = db.transaction(CHUNKS_STORE, "readwrite");
            tx.objectStore(CHUNKS_STORE).add({
              id: crypto.randomUUID(),
              parent: broadcastIdRef.current,
              rawBlob: e.data,
              timestamp: Date.now(),
              fallback: true,
            });
          } catch {
            /* storage exhausted */
          }
        }
      };
      recorder.start(2000); // 2-second chunks for better sync
      mediaRecorderRef.current = recorder;
      setState((s) => ({ ...s, recording: "active" }));

      // C. Send SOS & Map Pin
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude, longitude } = pos.coords;
        setState((s) => ({ ...s, location: "active" }));

        // Mock API calls
        console.log(`SOS Sent to contacts with URL: ${streamData.url}`);
        setState((s) => ({ ...s, sos: "sent", map: "posted" }));
      });

      // D. Continuous Location Updates
      locationIntervalRef.current = window.setInterval(() => {
        navigator.geolocation.getCurrentPosition((pos) => {
          console.log("Updating broadcast location:", pos.coords.latitude);
        });
      }, 15000);
    } catch (err) {
      console.error("Emergency Start Failed", err);
      stopEmergency();
    }
  };

  const stopEmergency = async () => {
    if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);

    setState({
      active: false,
      recording: "idle",
      livestream: "idle",
      sos: "idle",
      map: "idle",
      location: "idle",
      watchUrl: undefined,
    });

    alert("Emergency Broadcast Terminated. Evidence preserved in Vault.");
  };

  return (
    <div style={styles.container}>
      {/* Visual Feedback Panel */}
      <div style={styles.monitor}>
        <div style={styles.statusGrid}>
          <StatusIndicator label="REC" active={state.recording === "active"} pulse={true} />
          <StatusIndicator label="LIVE" active={state.livestream === "active"} pulse={true} />
          <StatusIndicator label="SOS" active={state.sos === "sent"} />
          <StatusIndicator label="MAP" active={state.map === "posted"} />
          <StatusIndicator label="GPS" active={state.location === "active"} />
        </div>

        {state.watchUrl && (
          <div style={styles.urlDisplay}>LIVE: {state.watchUrl.substring(0, 30)}...</div>
        )}
      </div>

      {!state.active ? (
        <button style={styles.emergencyBtn} onClick={startEmergency}>
          <div style={styles.btnInner}>
            <span style={styles.btnText}>EMERGENCY</span>
            <span style={styles.btnSubText}>BROADCAST</span>
          </div>
        </button>
      ) : (
        <button style={styles.stopBtn} onClick={stopEmergency}>
          STOP BROADCAST
        </button>
      )}

      <style>{`
        @keyframes pulse-red {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(211, 47, 47, 0.7); }
          70% { transform: scale(1.05); box-shadow: 0 0 0 20px rgba(211, 47, 47, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(211, 47, 47, 0); }
        }
      `}</style>
    </div>
  );
};

// ------------------------------
// SECTION: SUB-COMPONENTS
// ------------------------------
const StatusIndicator = ({
  label,
  active,
  pulse,
}: {
  label: string;
  active: boolean;
  pulse?: boolean;
}) => (
  <div style={{ ...styles.indicator, opacity: active ? 1 : 0.3 }}>
    <div
      style={{
        ...styles.dot,
        backgroundColor: active ? "#ff0000" : "#555",
        boxShadow: active ? "0 0 10px #ff0000" : "none",
      }}
    />
    <span style={styles.indicatorLabel}>{label}</span>
  </div>
);

// ------------------------------
// SECTION: STYLES
// ------------------------------
const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: "#000",
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "Inter, system-ui, sans-serif",
    color: "#fff",
    overflow: "hidden",
  },
  monitor: {
    position: "absolute",
    top: "10%",
    width: "90%",
    backgroundColor: "#111",
    padding: "20px",
    borderRadius: "20px",
    border: "1px solid #333",
  },
  statusGrid: {
    display: "flex",
    justifyContent: "space-between",
    width: "100%",
  },
  indicator: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
  },
  dot: {
    width: "12px",
    height: "12px",
    borderRadius: "50%",
    transition: "all 0.3s ease",
  },
  indicatorLabel: {
    fontSize: "10px",
    fontWeight: "bold",
    color: "#888",
  },
  urlDisplay: {
    marginTop: "15px",
    fontSize: "10px",
    color: "#4CAF50",
    fontFamily: "monospace",
    textAlign: "center",
  },
  emergencyBtn: {
    width: "250px",
    height: "250px",
    borderRadius: "50%",
    backgroundColor: "#ff0000",
    border: "8px solid #600",
    cursor: "pointer",
    animation: "pulse-red 2s infinite",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "transform 0.2s",
  },
  btnInner: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  btnText: {
    fontSize: "28px",
    fontWeight: "900",
    letterSpacing: "-1px",
  },
  btnSubText: {
    fontSize: "14px",
    fontWeight: "bold",
    opacity: 0.8,
  },
  stopBtn: {
    backgroundColor: "#222",
    color: "#ff0000",
    border: "2px solid #ff0000",
    padding: "15px 40px",
    borderRadius: "40px",
    fontWeight: "bold",
    cursor: "pointer",
    marginTop: "20px",
  },
};

export default WitnessEmergencyBroadcast;
