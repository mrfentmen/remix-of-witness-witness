import { Link } from "@tanstack/react-router";
import { Radio, Siren, Lock, Map as MapIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  isRecording: boolean;
  onToggleRecord: () => void;
};

export function CameraControls({ isRecording, onToggleRecord }: Props) {
  return (
    <div className="pointer-events-auto flex flex-col items-center gap-5 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] a11y-handed">
      <div className="flex w-full items-center justify-center">
        <button
          type="button"
          onClick={onToggleRecord}
          aria-label={isRecording ? "Stop recording" : "Start recording"}
          aria-pressed={isRecording}
          className={cn(
            "relative grid h-20 w-20 place-items-center rounded-full ring-4 ring-white/90 shadow-[0_8px_30px_rgba(255,59,48,0.45)] transition-transform active:scale-95",
            "bg-primary",
          )}
        >
          {isRecording ? (
            <span className="h-7 w-7 rounded-md bg-white" />
          ) : (
            <span className="h-16 w-16 rounded-full bg-primary" />
          )}
        </button>
      </div>

      <div className="grid w-full grid-cols-4 gap-2 a11y-handed">
        <SideAction to="/sos" label="Go Live" tone="neutral">
          <Radio className="h-5 w-5 text-primary" />
        </SideAction>
        <SideAction to="/sos" label="SOS" tone="danger">
          <Siren className="h-5 w-5" />
        </SideAction>
        <SideAction to="/map" label="Map" tone="neutral">
          <MapIcon className="h-5 w-5" />
        </SideAction>
        <SideAction to="/vault" label="Vault" tone="neutral">
          <Lock className="h-5 w-5" />
        </SideAction>
      </div>
    </div>
  );
}

function SideAction({
  to,
  label,
  tone,
  children,
}: {
  to: "/sos" | "/vault" | "/map";
  label: string;
  tone: "danger" | "neutral";
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "flex h-14 w-full flex-col items-center justify-center gap-0.5 rounded-2xl border backdrop-blur-md transition active:scale-95",
        tone === "danger"
          ? "border-primary/50 bg-primary/15 text-primary"
          : "border-white/15 bg-white/10 text-foreground",
      )}
      aria-label={label}
    >
      {children}
      <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
    </Link>
  );
}
