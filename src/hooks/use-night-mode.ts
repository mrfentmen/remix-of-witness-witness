import { useCallback, useEffect, useRef, useState } from "react";

interface CapsWithTorch extends MediaTrackCapabilities {
  torch?: boolean;
}
interface ConstraintsWithTorch extends MediaTrackConstraintSet {
  torch?: boolean;
}

/**
 * Night mode: applies torch when supported, otherwise uses a canvas pipeline
 * at ~15fps to boost brightness and contrast by painting a brightness-enhanced
 * copy of the video onto an overlay canvas.
 */
export function useNightMode(
  stream: MediaStream | null,
  videoRef: React.RefObject<HTMLVideoElement | null>,
) {
  const [enabled, setEnabled] = useState(false);
  const [brightness, setBrightness] = useState(0);
  const [torchSupported, setTorchSupported] = useState(false);
  const sampleRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const track = stream?.getVideoTracks()[0];
    if (!track) return;
    const caps = (track.getCapabilities?.() ?? {}) as CapsWithTorch;
    setTorchSupported(!!caps.torch);
  }, [stream]);

  // Canvas pipeline: draw video frame → apply brightness/contrast → show overlay.
  useEffect(() => {
    if (!enabled) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      if (canvasRef.current) {
        canvasRef.current.remove();
        canvasRef.current = null;
      }
      return;
    }

    const v = videoRef.current;
    if (!v) return;

    const canvas = document.createElement("canvas");
    canvas.className = "absolute inset-0 h-full w-full object-cover pointer-events-none";
    canvas.style.zIndex = "4";
    canvasRef.current = canvas;
    v.parentElement?.appendChild(canvas);

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    let lastFrame = 0;
    const FPS = 15;
    const frameInterval = 1000 / FPS;

    const draw = (now: number) => {
      rafRef.current = requestAnimationFrame(draw);
      if (now - lastFrame < frameInterval) return;
      lastFrame = now;

      if (v.videoWidth === 0 || v.videoHeight === 0) return;
      canvas.width = v.videoWidth;
      canvas.height = v.videoHeight;

      try {
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        let sum = 0;
        for (let i = 0; i < data.length; i += 4) {
          const r = Math.min(255, data[i] * 1.6);
          const g = Math.min(255, data[i + 1] * 1.6);
          const b = Math.min(255, data[i + 2] * 1.15);
          const luma = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
          // Boost dark areas more; apply contrast
          const boosted = Math.min(255, 128 + (luma - 128) * 1.3);
          data[i] = r * 0.6 + boosted * 0.4;
          data[i + 1] = g * 0.6 + boosted * 0.4;
          data[i + 2] = b * 0.6 + boosted * 0.4;
          sum += luma;
        }
        ctx.putImageData(imageData, 0, 0);
        setBrightness(Math.round(sum / (data.length / 4)));
      } catch {
        /* canvas tainted or video not ready */
      }
    };
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      if (canvasRef.current) {
        canvasRef.current.remove();
        canvasRef.current = null;
      }
    };
  }, [enabled, videoRef]);

  const apply = useCallback(
    (on: boolean) => {
      const track = stream?.getVideoTracks()[0];
      if (track && torchSupported) {
        const c: ConstraintsWithTorch = { torch: on };
        track.applyConstraints({ advanced: [c] } as MediaTrackConstraints).catch(() => {});
      }
    },
    [stream, torchSupported],
  );

  const toggle = useCallback(() => {
    setEnabled((e) => {
      const next = !e;
      apply(next);
      return next;
    });
  }, [apply]);

  return { enabled, toggle, brightness, torchSupported };
}
