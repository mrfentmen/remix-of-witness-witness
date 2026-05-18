import { useCallback, useEffect, useRef, useState } from "react";

export type CameraFacing = "user" | "environment";

export type CameraStatus = "idle" | "requesting" | "ready" | "denied" | "unsupported" | "error";

export interface UseCameraStreamResult {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  status: CameraStatus;
  error: string | null;
  facing: CameraFacing;
  flip: () => void;
  start: () => Promise<void>;
  stop: () => void;
  stream: MediaStream | null;
}

export function useCameraStream(
  initialFacing: CameraFacing = "environment",
): UseCameraStreamResult {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [facing, setFacing] = useState<CameraFacing>(initialFacing);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const start = useCallback(async () => {
    console.log("[useCameraStream] Start button clicked, initializing...");
    // 1. Strict HTTPS/Secure Context Enforcement
    if (typeof window !== "undefined") {
      const isLocalIp = /^192\.168\.|^10\.|^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(location.hostname);
      const isSecure = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1' || isLocalIp;
      
      console.log("[useCameraStream] IsSecure:", isSecure, "Protocol:", location.protocol);

      if (!isSecure) {
        setStatus("error");
        setError("Camera requires a secure connection (HTTPS).");
        return;
      }
    }

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      console.error("[useCameraStream] MediaDevices API missing!");
      setStatus("unsupported");
      setError("Camera API not supported in this browser.");
      return;
    }

    setStatus("requesting");
    setError(null);
    try {
      stop();
      // 2. iOS Constraints Compliance
      const constraints = {
        video: { facingMode: 'environment' },
        audio: true
      };

      console.log("[useCameraStream] Requesting getUserMedia with:", constraints);
      const next = await navigator.mediaDevices.getUserMedia(constraints);
      console.log("[useCameraStream] Successfully acquired stream!");
      streamRef.current = next;
      setStream(next);
      
      if (videoRef.current) {
        videoRef.current.srcObject = next;
        videoRef.current.muted = true;
        // 3. iOS-Required Attributes
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.setAttribute('autoplay', 'true');
        await videoRef.current.play().catch(err => {
          console.warn("[useCameraStream] video.play() failed:", err);
        });
      }
      setStatus("ready");
    } catch (e: unknown) {
      const err = e as Error;
      console.error("[useCameraStream] getUserMedia failed:", err);
      
      setStatus("error");
      setError(
        `Camera Error: ${err.name} - ${err.message}. Please check Settings > Safari > Camera & Microphone.`
      );
    }
  }, [facing, stop]);

  const flip = useCallback(() => {
    setFacing((f) => (f === "user" ? "environment" : "user"));
  }, []);

  // restart on facing change once started
  useEffect(() => {
    if (streamRef.current) {
      void start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facing]);

  useEffect(() => () => stop(), [stop]);

  return { videoRef, status, error, facing, flip, start, stop, stream };
}
