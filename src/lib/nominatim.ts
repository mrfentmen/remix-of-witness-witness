// Lightweight Nominatim search (OpenStreetMap). No API key required.
// Respects usage policy via 1s minimum spacing.

export interface GeocodeResult {
  displayName: string;
  lat: number;
  lng: number;
  type: string | null;
}

let lastCall = 0;

export async function geocode(query: string, limit = 5): Promise<GeocodeResult[]> {
  const q = query.trim();
  if (!q) return [];
  const wait = Math.max(0, 1000 - (Date.now() - lastCall));
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("addressdetails", "0");
  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as Array<{
      display_name: string;
      lat: string;
      lon: string;
      type?: string;
    }>;
    return data.map((r) => ({
      displayName: r.display_name,
      lat: Number(r.lat),
      lng: Number(r.lon),
      type: r.type ?? null,
    }));
  } catch (err) {
    console.warn("[witness] geocode failed", err);
    return [];
  }
}
