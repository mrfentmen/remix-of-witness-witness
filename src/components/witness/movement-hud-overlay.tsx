import { useMemo, useRef, useEffect } from "react";
import { Activity, Gauge, Zap, Compass, Mountain, Wind, Timer, TrendingUp } from "lucide-react";
import type { MovementData, MovementState } from "@/hooks/use-movement-tracker";

interface Props {
  data: MovementData;
  history: MovementData[];
  debugEnabled?: boolean;
  onToggleDebug?: () => void;
}

const STATE_COLORS: Record<MovementState, string> = {
  idle: "text-gray-400",
  walking: "text-emerald-400",
  running: "text-amber-400",
  sprinting: "text-orange-500",
  sliding: "text-cyan-400",
  wallrunning: "text-purple-400",
  airborne: "text-blue-400",
  grounded: "text-green-400",
};

const STATE_BADGES: Record<MovementState, { bg: string; label: string }> = {
  idle: { bg: "bg-gray-500/30", label: "Idle" },
  walking: { bg: "bg-emerald-500/30", label: "Walking" },
  running: { bg: "bg-amber-500/30", label: "Running" },
  sprinting: { bg: "bg-orange-500/30", label: "Sprinting" },
  sliding: { bg: "bg-cyan-500/30", label: "Sliding" },
  wallrunning: { bg: "bg-purple-500/30", label: "Wall Run" },
  airborne: { bg: "bg-blue-500/30", label: "Airborne" },
  grounded: { bg: "bg-green-500/30", label: "Grounded" },
};

function formatSpeed(speed: number): string {
  return speed.toFixed(1);
}

function formatMomentum(momentum: number): string {
  return momentum.toFixed(2);
}

function formatVector(v: { x: number; y: number; z: number }): string {
  return `${v.x.toFixed(1)}, ${v.y.toFixed(1)}, ${v.z.toFixed(1)}`;
}

function SpeedGraph({ history, maxSpeed = 25 }: { history: MovementData[]; maxSpeed?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || history.length < 2) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Draw grid lines
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const y = (height / 4) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw speed line
      ctx.strokeStyle = "rgba(96, 165, 250, 0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();

      const pointCount = Math.min(history.length, 100);
      const step = width / (pointCount - 1);

      for (let i = 0; i < pointCount; i++) {
        const dataIndex = history.length - pointCount + i;
        const speed = history[dataIndex]?.speed ?? 0;
        const x = i * step;
        const y = height - (Math.min(speed, maxSpeed) / maxSpeed) * height;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.stroke();

      // Draw fill gradient
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, "rgba(96, 165, 250, 0.3)");
      gradient.addColorStop(1, "rgba(96, 165, 250, 0)");
      ctx.fillStyle = gradient;
      ctx.fill();
    };

    render();

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [history, maxSpeed]);

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={60}
      className="w-full rounded border border-white/10 bg-black/30"
    />
  );
}

function MomentumBar({ momentum, maxMomentum = 40 }: { momentum: number; maxMomentum?: number }) {
  const percentage = Math.min(momentum / maxMomentum, 1);
  const color = percentage > 0.8 ? "#f97316" : percentage > 0.5 ? "#eab308" : "#22c55e";

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-white/60">
        <span>Momentum</span>
        <span style={{ color }}>{formatMomentum(momentum)} kg.m/s</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full transition-all duration-200"
          style={{ width: `${percentage * 100}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function VelocityVector({ data }: { data: MovementData }) {
  const speed = Math.sqrt(data.velocity.x ** 2 + data.velocity.z ** 2);
  const angle = Math.atan2(data.velocity.x, data.velocity.z) * (180 / Math.PI);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-white/60">
        <Wind className="h-3 w-3" />
        <span>Velocity Vector</span>
      </div>
      <div className="flex items-center justify-center">
        <div className="relative h-16 w-16">
          <div className="absolute inset-0 rounded-full border border-white/20" />
          <div className="absolute left-1/2 top-0 h-2 w-0.5 -translate-x-1/2 rounded-full bg-red-500" />
          <div className="absolute left-1/2 bottom-0 h-2 w-0.5 -translate-x-1/2 rounded-full bg-white/30" />
          <div className="absolute top-1/2 left-0 h-0.5 w-2 -translate-y-1/2 rounded-full bg-white/30" />
          <div className="absolute top-1/2 right-0 h-0.5 w-2 -translate-y-1/2 rounded-full bg-white/30" />
          <div
            className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-400 shadow-lg"
            style={{
              transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-6px)`,
            }}
          />
        </div>
      </div>
      <div className="text-center text-xs text-white/40">{formatVector(data.velocity)} studs/s</div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  unit,
  color = "text-white",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  unit?: string;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-white/5 px-2 py-1.5">
      <Icon className={`h-4 w-4 ${color}`} />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-wider text-white/40">{label}</div>
        <div className={`font-mono text-sm font-semibold ${color}`}>
          {value}
          {unit && <span className="ml-0.5 text-xs text-white/40">{unit}</span>}
        </div>
      </div>
    </div>
  );
}

export function MovementHUDOverlay({ data, history, debugEnabled = false, onToggleDebug }: Props) {
  const stateBadge = STATE_BADGES[data.state] ?? STATE_BADGES.idle;
  const maxSpeedInHistory = useMemo(() => {
    return Math.max(...history.map((h) => h.speed), 25);
  }, [history]);

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      <div className="pointer-events-auto absolute left-3 top-16 space-y-2">
        <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 ${stateBadge.bg}`}>
          <Activity className={`h-3 w-3 ${STATE_COLORS[data.state]}`} />
          <span
            className={`text-xs font-bold uppercase tracking-wider ${STATE_COLORS[data.state]}`}
          >
            {stateBadge.label}
          </span>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/50 backdrop-blur-md">
          <div className="grid grid-cols-2 gap-3 p-3">
            <StatCard
              icon={Gauge}
              label="Speed"
              value={formatSpeed(data.speed)}
              unit="m/s"
              color={
                data.speed > 12
                  ? "text-orange-400"
                  : data.speed > 5
                    ? "text-amber-400"
                    : "text-emerald-400"
              }
            />
            <StatCard
              icon={TrendingUp}
              label="Max"
              value={formatSpeed(data.maxSpeed)}
              unit="m/s"
              color="text-blue-400"
            />
          </div>

          <div className="border-t border-white/5 px-3 pb-3 pt-2">
            <MomentumBar momentum={data.momentum} />
          </div>
        </div>
      </div>

      {debugEnabled && history.length > 0 && (
        <div className="pointer-events-auto absolute bottom-20 left-3 w-52 space-y-2">
          <div className="rounded-xl border border-white/10 bg-black/50 backdrop-blur-md p-3">
            <div className="mb-2 flex items-center gap-2">
              <Activity className="h-3 w-3 text-blue-400" />
              <span className="text-xs font-medium text-white/60">Speed History</span>
            </div>
            <SpeedGraph history={history} maxSpeed={maxSpeedInHistory * 1.2} />
            <div className="mt-1 flex justify-between text-[10px] text-white/30">
              <span>0</span>
              <span>{maxSpeedInHistory.toFixed(0)} m/s</span>
            </div>
          </div>
        </div>
      )}

      <div className="pointer-events-auto absolute right-3 top-16">
        <div className="rounded-xl border border-white/10 bg-black/50 backdrop-blur-md p-3">
          <VelocityVector data={data} />
        </div>
      </div>

      <div className="pointer-events-auto absolute bottom-20 right-3 space-y-2">
        <div className="rounded-xl border border-white/10 bg-black/50 backdrop-blur-md p-3">
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={Compass}
              label="Heading"
              value={data.heading.toFixed(0)}
              unit="deg"
              color="text-cyan-400"
            />
            <StatCard
              icon={Mountain}
              label="Slope"
              value={Math.abs(data.slopeAngle).toFixed(1)}
              unit="deg"
              color={Math.abs(data.slopeAngle) > 15 ? "text-amber-400" : "text-emerald-400"}
            />
          </div>
        </div>

        <div
          className={`flex items-center justify-center gap-1.5 rounded-full px-3 py-1 ${
            data.isGrounded ? "bg-emerald-500/20" : "bg-blue-500/20"
          }`}
        >
          <div
            className={`h-2 w-2 rounded-full ${data.isGrounded ? "bg-emerald-400" : "bg-blue-400"}`}
          />
          <span
            className={`text-[10px] font-medium uppercase tracking-wider ${
              data.isGrounded ? "text-emerald-400" : "text-blue-400"
            }`}
          >
            {data.isGrounded ? "Grounded" : "Airborne"}
          </span>
        </div>
      </div>

      {onToggleDebug && (
        <button
          type="button"
          onClick={onToggleDebug}
          className={`pointer-events-auto absolute bottom-20 left-1/2 -translate-x-1/2 rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
            debugEnabled
              ? "bg-blue-500/30 text-blue-300"
              : "bg-white/10 text-white/50 hover:bg-white/20"
          }`}
        >
          {debugEnabled ? "Hide Debug" : "Show Debug"}
        </button>
      )}
    </div>
  );
}
