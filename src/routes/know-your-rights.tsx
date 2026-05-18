import { createFileRoute } from "@tanstack/react-router";
import { ScreenHeader } from "@/components/witness/screen-header";
import knowYourRights from "@/data/knowYourRights.json";
import { useState, useMemo } from "react";
import {
  Search,
  ChevronRight,
  Globe,
  BookOpen,
  AlertTriangle,
  ShieldCheck,
  MapPin,
} from "lucide-react";

interface RightEntry {
  state: string;
  stateCode: string;
  consentLaw: string;
  legalStatus: string;
  keyCaseOrLaw: string;
  bufferZoneRisk: string;
  plainEnglishSummary: string;
}

const entries = knowYourRights as RightEntry[];

const BUFFER_ZONES = new Set(["FL", "KS", "TN"]);
const bufferZoneStates = entries.filter((e) => BUFFER_ZONES.has(e.stateCode));
const nonBufferStates = entries.filter((e) => !BUFFER_ZONES.has(e.stateCode));

export const Route = createFileRoute("/know-your-rights")({
  head: () => ({
    meta: [
      { title: "Know Your Rights — Witness R.E.P" },
      {
        name: "description",
        content: "State-by-state guide to recording police and exercising your civil rights.",
      },
    ],
  }),
  component: KnowYourRightsScreen,
});

function KnowYourRightsScreen() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<RightEntry | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return entries.filter(
      (e) => e.state.toLowerCase().includes(q) || e.stateCode.toLowerCase().includes(q),
    );
  }, [search]);

  return (
    <main className="min-h-dvh">
      <ScreenHeader title="Know Your Rights" />
      <section className="mx-auto flex max-w-md flex-col gap-4 px-4 py-6 pb-32">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelected(null);
            }}
            placeholder="Search by state name or code…"
            maxLength={30}
            className="h-11 w-full rounded-2xl border border-border bg-card pl-10 pr-4 text-sm outline-none focus:border-primary"
          />
        </div>

        {/* Selected card detail */}
        {selected && (
          <div className="animate-in fade-in slide-in-from-top-2 rounded-2xl border border-border bg-card p-5 shadow-lg">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-black text-foreground">{selected.state}</h2>
                <p className="text-xs text-muted-foreground">
                  {selected.consentLaw} consent · {selected.legalStatus}
                </p>
              </div>
              {BUFFER_ZONES.has(selected.stateCode) ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-600/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-400">
                  <AlertTriangle className="h-3 w-3" />
                  Buffer Zone
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success">
                  <ShieldCheck className="h-3 w-3" />
                  Protected
                </span>
              )}
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-sm leading-relaxed text-foreground">
                {selected.plainEnglishSummary}
              </p>
              <div className="rounded-xl border border-border bg-background p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Key Case / Law
                </p>
                <p className="mt-1 text-xs font-mono text-foreground">{selected.keyCaseOrLaw}</p>
              </div>
              {BUFFER_ZONES.has(selected.stateCode) && (
                <div className="flex items-start gap-2 rounded-xl border border-red-600/30 bg-red-600/10 p-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-red-400">
                      Buffer Zone Active
                    </p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-red-300">
                      {selected.bufferZoneRisk}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSelected(null)}
              className="mt-4 text-xs font-semibold text-primary underline"
            >
              ← Back to all states
            </button>
          </div>
        )}

        {/* Buffer zone alert banner */}
        {!selected && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-600/30 bg-red-600/10 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-red-400">
                Active Buffer Zone States
              </h3>
              <p className="mt-1 text-xs text-red-300">
                {bufferZoneStates
                  .map(
                    (s) =>
                      `${s.state}: ${s.bufferZoneRisk.split(" ")[0]} ${s.bufferZoneRisk.split(" ")[1] ?? ""} buffer`,
                  )
                  .join(" · ")}
              </p>
            </div>
          </div>
        )}

        {/* State list */}
        {!selected && search.trim() === "" && (
          <div className="flex flex-col gap-3">
            <h3 className="flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              <Globe className="h-3.5 w-3.5" />
              All 50 states
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {nonBufferStates.map((e) => (
                <StateRow key={e.stateCode} entry={e} onClick={() => setSelected(e)} />
              ))}
            </div>

            <h3 className="mt-2 flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-red-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              Buffer Zone States
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {bufferZoneStates.map((e) => (
                <StateRow key={e.stateCode} entry={e} danger onClick={() => setSelected(e)} />
              ))}
            </div>
          </div>
        )}

        {/* Search results */}
        {!selected && search.trim() !== "" && (
          <div className="flex flex-col gap-2">
            {filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No states match "{search}"
              </p>
            ) : (
              filtered.map((e) => (
                <StateRow key={e.stateCode} entry={e} onClick={() => setSelected(e)} />
              ))
            )}
          </div>
        )}

        {/* Disclaimer */}
        <p className="mt-6 text-center text-[10px] text-muted-foreground leading-relaxed">
          This guide is for informational purposes only and does not constitute legal advice. Laws
          change. Consult an attorney in your jurisdiction for advice specific to your situation.
        </p>
      </section>
    </main>
  );
}

function StateRow({
  entry,
  danger,
  onClick,
}: {
  entry: RightEntry;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition active:scale-[0.99] ${
        danger ? "border-red-600/30 bg-red-600/5" : "border-border bg-card"
      }`}
    >
      <span
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg text-sm font-black ${
          danger ? "bg-red-600/15 text-red-400" : "bg-secondary text-muted-foreground"
        }`}
      >
        {entry.stateCode}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{entry.state}</p>
        <p className="truncate text-[11px] text-muted-foreground">
          {entry.consentLaw} consent · {entry.legalStatus}
        </p>
      </div>
      <ChevronRight
        className={`h-4 w-4 shrink-0 ${danger ? "text-red-400" : "text-muted-foreground"}`}
      />
    </button>
  );
}
