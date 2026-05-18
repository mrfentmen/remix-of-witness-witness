// NASA EONET v3 disaster events with 30-min localStorage cache.
// API: https://eonet.gsfc.nasa.gov/docs/v3

export interface DisasterEvent {
  id: string;
  title: string;
  category: string;
  link: string;
  date: number; // ms
  lat: number;
  lng: number;
}

const CACHE_KEY = "witness:eonet:v1";
const CACHE_TTL_MS = 30 * 60 * 1000;

interface CacheShape {
  fetchedAt: number;
  events: DisasterEvent[];
}

interface EonetGeometry {
  date: string;
  type: string;
  coordinates: number[] | number[][];
}
interface EonetEvent {
  id: string;
  title: string;
  link: string;
  categories: Array<{ id: string; title: string }>;
  geometry: EonetGeometry[];
}
interface EonetResponse {
  events: EonetEvent[];
}

function readCache(): CacheShape | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CacheShape;
  } catch {
    return null;
  }
}
function writeCache(c: CacheShape): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(c));
  } catch {
    /* quota: ignore */
  }
}

function flatten(events: EonetEvent[]): DisasterEvent[] {
  const out: DisasterEvent[] = [];
  for (const e of events) {
    const g = e.geometry[e.geometry.length - 1];
    if (!g) continue;
    let lng = NaN;
    let lat = NaN;
    if (
      g.type === "Point" &&
      Array.isArray(g.coordinates) &&
      typeof g.coordinates[0] === "number"
    ) {
      lng = g.coordinates[0] as number;
      lat = g.coordinates[1] as number;
    } else if (Array.isArray(g.coordinates) && Array.isArray(g.coordinates[0])) {
      const first = (g.coordinates as number[][])[0];
      lng = first[0];
      lat = first[1];
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    out.push({
      id: e.id,
      title: e.title,
      category: e.categories[0]?.title ?? "Event",
      link: e.link,
      date: new Date(g.date).getTime(),
      lat,
      lng,
    });
  }
  return out;
}

export async function getDisasters(): Promise<{
  events: DisasterEvent[];
  stale: boolean;
}> {
  const cached = readCache();
  const fresh = cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS;
  if (fresh && cached) return { events: cached.events, stale: false };
  try {
    const res = await fetch("https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=200");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as EonetResponse;
    const events = flatten(json.events);
    writeCache({ fetchedAt: Date.now(), events });
    return { events, stale: false };
  } catch (err) {
    console.warn("[witness] EONET fetch failed", err);
    if (cached) return { events: cached.events, stale: true };
    return { events: [], stale: true };
  }
}

export function disasterColor(category: string): string {
  const c = category.toLowerCase();
  if (c.includes("wildfire")) return "#f97316";
  if (c.includes("storm") || c.includes("cyclone")) return "#06b6d4";
  if (c.includes("flood")) return "#3b82f6";
  if (c.includes("volcan")) return "#dc2626";
  if (c.includes("earthquake")) return "#a855f7";
  if (c.includes("ice") || c.includes("snow")) return "#e5e7eb";
  if (c.includes("drought")) return "#eab308";
  return "#fbbf24";
}
