import { useEffect, useRef, useState } from "react";

function formatTime(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export function RecordingTimer({ active }: { active: boolean }) {
  const [seconds, setSeconds] = useState(0);
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    if (!active) {
      startedAt.current = null;
      setSeconds(0);
      return;
    }
    startedAt.current = Date.now();
    const id = window.setInterval(() => {
      if (startedAt.current) {
        setSeconds(Math.floor((Date.now() - startedAt.current) / 1000));
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [active]);

  if (!active) return null;

  return (
    <div className="flex items-center gap-2 rounded-full border border-primary/40 bg-black/60 px-3 py-1.5 backdrop-blur-md">
      <span className="h-2.5 w-2.5 rounded-full bg-primary witness-pulse" aria-hidden />
      <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
        {formatTime(seconds)}
      </span>
    </div>
  );
}
