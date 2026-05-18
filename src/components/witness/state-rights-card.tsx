// Dismissible rights card shown on the camera screen for 8 seconds when
// the user enters a new state or 24h have passed since the last reminder.
// Shows red buffer-zone warning for FL, KS, TN.

import { useEffect, useState, useRef } from "react";
import { detectState, type StateInfo } from "@/lib/witness-state-detection";
import { X, AlertTriangle, ShieldCheck } from "lucide-react";

export function StateRightsCard() {
  const [info, setInfo] = useState<StateInfo | null>(null);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await detectState();
      if (cancelled || !result) return;
      setInfo(result);
      setVisible(true);

      // Auto-dismiss after 8 seconds
      timerRef.current = setTimeout(() => setVisible(false), 8000);
    })();
    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!visible || !info) return null;

  const isBufferZone = info.isBufferZone;

  return (
    <div className="absolute top-[12%] left-4 right-4 z-20 animate-in fade-in slide-in-from-top-2 duration-300">
      <div
        className={`rounded-2xl p-4 shadow-2xl border ${
          isBufferZone
            ? "border-red-600/50 bg-red-950/90"
            : "border-border bg-card/95 backdrop-blur-md"
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            {isBufferZone ? (
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
            ) : (
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            )}
            <div>
              <h3
                className={`text-sm font-black uppercase tracking-tighter ${
                  isBufferZone ? "text-red-400" : "text-foreground"
                }`}
              >
                {info.state} ({info.consentLaw} Consent)
              </h3>
              <p className="mt-1 text-[11px] leading-tight text-muted-foreground">
                {info.plainEnglishSummary.slice(0, 160)}
                {info.plainEnglishSummary.length > 160 ? "…" : ""}
              </p>
              {isBufferZone && (
                <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-red-600/20 px-2.5 py-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                  <p className="text-[10px] font-bold uppercase tracking-wider text-red-300">
                    Buffer zone warning · {info.bufferZoneRisk}
                  </p>
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setVisible(false)}
            aria-label="Dismiss"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-secondary text-muted-foreground active:scale-95"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
