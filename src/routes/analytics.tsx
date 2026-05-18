import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { getAnalytics, toCsv, type AnalyticsResult } from "@/lib/witness-analytics";
import { RECORDING_CATEGORIES } from "@/lib/witness-categories";
import { toast } from "sonner";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — Witness R.E.P" },
      {
        name: "description",
        content:
          "Anonymized incident density, category breakdown, and trends from public recordings.",
      },
    ],
  }),
  component: AnalyticsScreen,
});

function isoDaysAgo(days: number): string {
  const d = new Date(Date.now() - days * 86_400_000);
  return d.toISOString().slice(0, 10);
}
function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function AnalyticsScreen() {
  const [from, setFrom] = useState(isoDaysAgo(30));
  const [to, setTo] = useState(isoToday());
  const [cats, setCats] = useState<string[]>([]);
  const [data, setData] = useState<AnalyticsResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getAnalytics({
      fromIso: new Date(from + "T00:00:00").toISOString(),
      toIso: new Date(to + "T23:59:59").toISOString(),
      categories: cats.length ? cats : undefined,
    })
      .then((r) => {
        if (!cancelled) setData(r);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [from, to, cats]);

  const maxDay = useMemo(
    () => (data?.days.length ? Math.max(...data.days.map((d) => d.count)) : 1),
    [data],
  );
  const maxCat = useMemo(
    () => (data?.categories.length ? Math.max(...data.categories.map((c) => c.count)) : 1),
    [data],
  );

  function toggleCat(c: string) {
    setCats((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));
  }

  function exportCsv() {
    if (!data) return;
    const blob = new Blob([toCsv(data)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `witness-analytics-${from}_to_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded");
  }

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-background/90 px-3 py-3 backdrop-blur">
        <Link
          to="/map"
          aria-label="Back to map"
          className="grid h-9 w-9 place-items-center rounded-full border border-border"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="flex-1 text-sm font-bold uppercase tracking-wider">Analytics</h1>
        <button
          type="button"
          onClick={exportCsv}
          disabled={!data || data.total === 0}
          className="grid h-9 place-items-center gap-1 rounded-full border border-border px-3 text-[11px] font-bold uppercase tracking-wider disabled:opacity-50"
        >
          <span className="flex items-center gap-1.5">
            <Download className="h-3.5 w-3.5" /> CSV
          </span>
        </button>
      </header>

      <section className="space-y-3 p-3">
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-card p-3">
          <label className="flex flex-col gap-1 text-[11px] uppercase tracking-wider text-muted-foreground">
            From
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground"
            />
          </label>
          <label className="flex flex-col gap-1 text-[11px] uppercase tracking-wider text-muted-foreground">
            To
            <input
              type="date"
              value={to}
              min={from}
              max={isoToday()}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground"
            />
          </label>
          <div className="col-span-2 flex flex-wrap gap-1.5 pt-1">
            {RECORDING_CATEGORIES.map((c) => {
              const on = cats.includes(c);
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleCat(c)}
                  aria-pressed={on}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider transition ${on ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground"}`}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div className="grid place-items-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : !data || data.total === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No public recordings match these filters.
          </div>
        ) : (
          <>
            <Stat label="Total recordings" value={data.total.toString()} />
            <Stat label="Unique neighborhood cells" value={data.cells.length.toString()} />

            <div className="rounded-xl border border-border bg-card p-3">
              <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Daily activity
              </h2>
              <div className="flex h-32 items-end gap-1">
                {data.days.map((d) => (
                  <div key={d.day} className="group flex flex-1 flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t bg-primary"
                      style={{ height: `${(d.count / maxDay) * 100}%`, minHeight: 2 }}
                      title={`${d.day}: ${d.count}`}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                <span>{data.days[0]?.day}</span>
                <span>{data.days[data.days.length - 1]?.day}</span>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-3">
              <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                By category
              </h2>
              <ul className="space-y-1.5">
                {data.categories.map((c) => (
                  <li key={c.category} className="flex items-center gap-2 text-xs">
                    <span className="w-24 truncate">{c.category}</span>
                    <div className="flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-1.5 bg-primary"
                        style={{ width: `${(c.count / maxCat) * 100}%` }}
                      />
                    </div>
                    <span className="w-8 text-right tabular-nums text-muted-foreground">
                      {c.count}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-border bg-card p-3">
              <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Top neighborhood cells (~0.5km)
              </h2>
              <ul className="space-y-1 text-xs">
                {data.cells.slice(0, 10).map((c) => (
                  <li
                    key={`${c.cellLat},${c.cellLng}`}
                    className="flex items-center justify-between"
                  >
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {c.cellLat.toFixed(3)}, {c.cellLng.toFixed(3)}
                    </span>
                    <span className="tabular-nums">{c.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
