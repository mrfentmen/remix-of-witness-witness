import { createFileRoute } from "@tanstack/react-router";
import { ScreenHeader } from "@/components/witness/screen-header";
import legalAid from "@/data/legalAid.json";
import { useState, useMemo } from "react";
import { Search, Phone, Globe, MapPin, ChevronRight, Scale } from "lucide-react";

interface LawyerEntry {
  organization_name: string;
  city: string;
  state: string;
  phone_number: string;
  website: string;
  free_services: string;
  case_types: string;
}

const entries = legalAid as LawyerEntry[];

const states = Array.from(new Set(entries.map((e) => e.state))).sort();

export const Route = createFileRoute("/lawyer-finder")({
  head: () => ({
    meta: [
      { title: "Lawyer Finder — Witness R.E.P" },
      {
        name: "description",
        content:
          "Find pro bono and legal aid organizations for civil rights and police accountability cases.",
      },
    ],
  }),
  component: LawyerFinderScreen,
});

function LawyerFinderScreen() {
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("");

  const filtered = useMemo(() => {
    let result = entries;
    if (stateFilter) {
      result = result.filter((e) => e.state === stateFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.organization_name.toLowerCase().includes(q) ||
          e.city.toLowerCase().includes(q) ||
          e.case_types.toLowerCase().includes(q),
      );
    }
    return result;
  }, [search, stateFilter]);

  return (
    <main className="min-h-dvh">
      <ScreenHeader title="Lawyer Finder" />
      <section className="mx-auto flex max-w-md flex-col gap-4 px-4 py-6 pb-32">
        {/* Intro banner */}
        <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
            <Scale className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-foreground">Legal Aid Network</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              These organizations provide free or low-cost legal services for civil rights, police
              accountability, and related cases. Contact them directly to determine eligibility.
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, city, or case type…"
              maxLength={60}
              className="h-11 w-full rounded-2xl border border-border bg-card pl-10 pr-4 text-sm outline-none focus:border-primary"
            />
          </div>
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="h-11 rounded-2xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
          >
            <option value="">All states</option>
            {states.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Results */}
        <div className="flex flex-col gap-3">
          {filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No organizations found. Try a different search or state.
            </p>
          ) : (
            filtered.map((entry, idx) => (
              <div
                key={`${entry.organization_name}-${idx}`}
                className="rounded-2xl border border-border bg-card p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-foreground leading-snug">
                      {entry.organization_name}
                    </h3>
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {entry.city}, {entry.state}
                    </div>
                  </div>
                  {entry.free_services && entry.free_services !== "Not specified" && (
                    <span className="inline-flex shrink-0 items-center rounded-full bg-success/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success">
                      Free
                    </span>
                  )}
                </div>

                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  {entry.case_types}
                </p>

                <div className="mt-3 flex items-center gap-2">
                  <a
                    href={`tel:${entry.phone_number.replace(/[^0-9]/g, "")}`}
                    className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-background text-[11px] font-bold uppercase tracking-wider text-foreground transition active:bg-secondary"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    Call
                  </a>
                  {entry.website && (
                    <a
                      href={entry.website}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary text-[11px] font-bold uppercase tracking-wider text-primary-foreground transition active:scale-95"
                    >
                      <Globe className="h-3.5 w-3.5" />
                      Website
                    </a>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Disclaimer */}
        <p className="text-center text-[10px] text-muted-foreground leading-relaxed">
          Witness R.E.P does not endorse any specific organization. Always verify an organization's
          credentials before sharing sensitive information.
        </p>
      </section>
    </main>
  );
}
