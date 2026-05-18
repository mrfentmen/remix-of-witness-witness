// Anonymized aggregate queries against public recordings.
// All queries respect RLS; only is_public=true rows are visible to anon.
import { supabase } from "@/integrations/supabase/client";

export interface AnalyticsFilter {
  fromIso: string;
  toIso: string;
  categories?: string[];
}

export interface CategoryCount {
  category: string;
  count: number;
}
export interface DayCount {
  day: string;
  count: number;
}
export interface CellCount {
  cellLat: number;
  cellLng: number;
  count: number;
}

interface Row {
  id: string;
  recorded_at: string;
  category: string | null;
  gps_lat: number | null;
  gps_lng: number | null;
}

async function fetchRows(filter: AnalyticsFilter): Promise<Row[]> {
  let q = supabase
    .from("recordings")
    .select("id,recorded_at,category,gps_lat,gps_lng")
    .eq("is_public", true)
    .gte("recorded_at", filter.fromIso)
    .lte("recorded_at", filter.toIso)
    .limit(5000);
  if (filter.categories && filter.categories.length) {
    q = q.in("category", filter.categories);
  }
  const { data, error } = await q;
  if (error) {
    console.warn("[witness] analytics fetch failed", error);
    return [];
  }
  return (data ?? []) as Row[];
}

export async function getAnalytics(filter: AnalyticsFilter) {
  const rows = await fetchRows(filter);
  const byCategory = new Map<string, number>();
  const byDay = new Map<string, number>();
  const byCell = new Map<string, CellCount>();
  for (const r of rows) {
    const cat = r.category ?? "Uncategorized";
    byCategory.set(cat, (byCategory.get(cat) ?? 0) + 1);
    const day = r.recorded_at.slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
    if (r.gps_lat != null && r.gps_lng != null) {
      // 0.5km grid ≈ 0.0045 deg lat
      const cellLat = Math.round(r.gps_lat / 0.0045) * 0.0045;
      const cellLng = Math.round(r.gps_lng / 0.0045) * 0.0045;
      const key = `${cellLat.toFixed(4)},${cellLng.toFixed(4)}`;
      const prev = byCell.get(key);
      if (prev) prev.count += 1;
      else byCell.set(key, { cellLat, cellLng, count: 1 });
    }
  }
  const categories: CategoryCount[] = [...byCategory.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
  const days: DayCount[] = [...byDay.entries()]
    .map(([day, count]) => ({ day, count }))
    .sort((a, b) => a.day.localeCompare(b.day));
  const cells: CellCount[] = [...byCell.values()].sort((a, b) => b.count - a.count);
  return { total: rows.length, categories, days, cells };
}

export type AnalyticsResult = Awaited<ReturnType<typeof getAnalytics>>;

/** Score 0-100 — higher = safer. Lower density of incidents in the cell = higher score. */
export function safetyScoreForCell(cells: CellCount[], lat: number, lng: number): number {
  const cellLat = Math.round(lat / 0.0045) * 0.0045;
  const cellLng = Math.round(lng / 0.0045) * 0.0045;
  let here = 0;
  let neighbors = 0;
  for (const c of cells) {
    const dLat = Math.abs(c.cellLat - cellLat);
    const dLng = Math.abs(c.cellLng - cellLng);
    if (dLat < 0.0023 && dLng < 0.0023) here += c.count;
    else if (dLat < 0.0135 && dLng < 0.0135) neighbors += c.count;
  }
  const weighted = here * 3 + neighbors;
  return Math.max(0, Math.min(100, Math.round(100 - weighted * 4)));
}

export function toCsv(result: AnalyticsResult): string {
  const lines: string[] = [];
  lines.push("section,key,value");
  lines.push(`summary,total,${result.total}`);
  for (const c of result.categories) lines.push(`category,${escape(c.category)},${c.count}`);
  for (const d of result.days) lines.push(`day,${d.day},${d.count}`);
  for (const c of result.cells)
    lines.push(`cell,"${c.cellLat.toFixed(4)};${c.cellLng.toFixed(4)}",${c.count}`);
  return lines.join("\n");
}

function escape(s: string): string {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
