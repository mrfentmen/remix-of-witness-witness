import { ShieldCheck, ShieldAlert } from "lucide-react";
import type { ContinuityLog } from "@/lib/witness-db";

/** Visual badge showing whether a recording is continuous or has gaps. */
export function ContinuityBadge({ log }: { log: ContinuityLog | null | undefined }) {
  if (!log) return null;
  const ok = !log.hasGaps;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
        ok ? "bg-success/15 text-success" : "bg-amber-500/15 text-amber-500"
      }`}
      title={
        ok
          ? "Continuous recording — no pauses"
          : `${log.segments.length} segments — pause/resume detected`
      }
    >
      {ok ? <ShieldCheck className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
      {ok ? "Continuous" : `${log.segments.length} segs`}
    </span>
  );
}
