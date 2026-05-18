import { Award } from "lucide-react";
import { YOUTH_BADGES } from "@/lib/witness-youth";

export function AmbassadorBadge({ id }: { id: string }) {
  const badge = YOUTH_BADGES.find((b) => b.id === id);
  if (!badge) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
      <Award className="h-3 w-3" /> {badge.name}
    </span>
  );
}
