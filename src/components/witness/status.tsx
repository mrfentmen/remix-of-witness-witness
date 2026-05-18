import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

type StatusPillProps = {
  encrypted?: boolean;
  gpsLocked?: boolean;
};

export function StatusPill({ encrypted = true, gpsLocked = true }: StatusPillProps) {
  const ok = encrypted && gpsLocked;
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider backdrop-blur-md",
        ok
          ? "border-success/40 bg-black/50 text-success"
          : "border-primary/40 bg-black/50 text-primary",
      )}
      aria-live="polite"
    >
      <span
        className={cn("h-1.5 w-1.5 rounded-full", ok ? "bg-success" : "bg-primary witness-pulse")}
      />
      <span>{encrypted ? "Encrypted" : "Unencrypted"}</span>
      <span className="text-foreground/40">·</span>
      <span>{gpsLocked ? "GPS Locked" : "GPS Off"}</span>
    </div>
  );
}

export function WitnessWordmark() {
  return (
    <Link
      to="/camera"
      className="flex items-center gap-1.5 select-none"
      aria-label="Witness R.E.P home"
    >
      <span className="text-base font-black uppercase tracking-[0.2em] text-foreground">
        Witness R.E.P
      </span>
      <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
    </Link>
  );
}
