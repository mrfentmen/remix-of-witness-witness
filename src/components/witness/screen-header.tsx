import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

export function ScreenHeader({ title, backTo = "/" }: { title: string; backTo?: string }) {
  return (
    <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-background/85 px-3 py-3 backdrop-blur-md pt-[max(0.75rem,env(safe-area-inset-top))]">
      <Link
        to={backTo}
        className="grid h-10 w-10 place-items-center rounded-full text-primary active:scale-95"
        aria-label="Back"
      >
        <ChevronLeft className="h-6 w-6" />
      </Link>
      <h1 className="text-lg font-bold tracking-tight">{title}</h1>
    </header>
  );
}
