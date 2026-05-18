// WitnessNaturalDisasters.tsx
// Self-contained TypeScript React shell for NASA EONET natural disaster integration.
// Fetches open events from NASA EONET API, caches with localStorage (fallback to IndexedDB if payload > 5MB).
// Implements 30-minute cache TTL, offline support, Leaflet markers with category-based colors and clustering.
// Uses Tailwind CSS for controls, no external dependencies beyond React and Leaflet (react-leaflet, leaflet).

import React, { useState, useEffect, useCallback, useRef } from "react";

import { MapContainer, TileLayer, useMap, CircleMarker, Popup } from "react-leaflet";

import L from "leaflet";

import "leaflet/dist/leaflet.css";

// ------------------------------
// SECTION: Types & Interfaces (NASA EONET API v3)
// ------------------------------
export interface EONETGeometry {
  type: string;
  coordinates: [number, number];
  date: string;
}

export interface EONETEvent {
  id: string;
  title: string;
  description: string | null;
  link: string;
  closed: string | null;

  categories: Array<{
    id: number;
    title: string;
    link: string;
  }>;

  sources: Array<{
    id: string;
    url: string;
  }>;

  geometry: EONETGeometry[];
}

export interface EONETResponse {
  title: string;
  description: string;
  link: string;
  events: EONETEvent[];
}

export interface CachedData {
  timestamp: number;
  events: EONETEvent[];
}

// ------------------------------
// SECTION: Constants
// ------------------------------
const categoryColors: Record<number, string> = {
  8: "#FF4500",
  10: "#1E90FF",
  12: "#32CD32",
  15: "#00CED1",
  16: "#FFD700",
  17: "#FFB6C1",
  18: "#FF69B4",
  20: "#DA70D6",
  21: "#FF6347",
};

const DEFAULT_COLOR = "#FF0000";

const CACHE_KEY = "witness_nasa_eonet_cache";

const CACHE_TTL_MS = 30 * 60 * 1000;

const LOCALSTORAGE_LIMIT = 5 * 1024 * 1024;

const IDB_NAME = "WitnessEONETCache";

const IDB_STORE = "events_cache";

// ------------------------------
// SECTION: Browser Helpers
// ------------------------------
function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function hasIndexedDB(): boolean {
  return isBrowser() && typeof indexedDB !== "undefined";
}

function safeLocalStorageGet(key: string): string | null {
  if (!isBrowser()) return null;

  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.error("localStorage read failed:", error);

    return null;
  }
}

function safeLocalStorageSet(key: string, value: string): boolean {
  if (!isBrowser()) return false;

  try {
    localStorage.setItem(key, value);

    return true;
  } catch (error) {
    console.error("localStorage write failed:", error);

    return false;
  }
}

function safeLocalStorageRemove(key: string): void {
  if (!isBrowser()) return;

  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error("localStorage remove failed:", error);
  }
}

// ------------------------------
// SECTION: IndexedDB Helpers
// ------------------------------
let idbCache: IDBDatabase | null = null;

async function initIndexedDB(): Promise<IDBDatabase | null> {
  if (!hasIndexedDB()) {
    return null;
  }

  if (idbCache) {
    return idbCache;
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, 1);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      idbCache = request.result;

      resolve(idbCache);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, {
          keyPath: "key",
        });
      }
    };
  });
}

// ------------------------------
// SECTION: Cache Helpers
// ------------------------------
function hasLocalStorageSpace(data: unknown): boolean {
  if (!isBrowser()) return false;

  try {
    const testKey = "__witness_test__";

    localStorage.setItem(testKey, JSON.stringify(data));

    localStorage.removeItem(testKey);

    return true;
  } catch {
    return false;
  }
}

async function getCachedData(): Promise<EONETEvent[] | null> {
  try {
    const cachedStr = safeLocalStorageGet(CACHE_KEY);

    if (cachedStr) {
      const cached = JSON.parse(cachedStr) as CachedData;

      if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return cached.events;
      }

      safeLocalStorageRemove(CACHE_KEY);
    }
  } catch (error) {
    console.warn("Cache parsing failed:", error);
  }

  try {
    const db = await initIndexedDB();

    if (!db) {
      return null;
    }

    return await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readonly");

      const store = tx.objectStore(IDB_STORE);

      const request = store.get("eonet_events");

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        if (!request.result) {
          resolve(null);

          return;
        }

        const cached = request.result.data as CachedData;

        if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
          resolve(cached.events);
        } else {
          resolve(null);
        }
      };
    });
  } catch (error) {
    console.warn("IndexedDB read failed:", error);

    return null;
  }
}

async function setCachedData(events: EONETEvent[]): Promise<void> {
  const cacheData: CachedData = {
    timestamp: Date.now(),
    events,
  };

  try {
    const serialized = JSON.stringify(cacheData);

    if (serialized.length < LOCALSTORAGE_LIMIT && hasLocalStorageSpace(cacheData)) {
      safeLocalStorageSet(CACHE_KEY, serialized);

      return;
    }

    throw new Error("localStorage full");
  } catch {
    try {
      const db = await initIndexedDB();

      if (!db) {
        return;
      }

      const tx = db.transaction(IDB_STORE, "readwrite");

      const store = tx.objectStore(IDB_STORE);

      store.put({
        key: "eonet_events",
        data: cacheData,
      });
    } catch (error) {
      console.error("IndexedDB write failed:", error);
    }
  }
}

// ------------------------------
// SECTION: Custom Hook for Data Fetching
// ------------------------------
export function useEONETEvents() {
  const [events, setEvents] = useState<EONETEvent[]>([]);

  const [loading, setLoading] = useState<boolean>(true);

  const [error, setError] = useState<string | null>(null);

  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchEvents = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const cached = await getCachedData();

      if (cached) {
        setEvents(cached);

        setLastUpdated(new Date());
      }

      const controller = new AbortController();

      const timeoutId = window.setTimeout(() => controller.abort(), 15000);

      const response = await fetch("https://eonet.gsfc.nasa.gov/api/v3/events?status=open", {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = (await response.json()) as EONETResponse;

      setEvents(data.events);

      setLastUpdated(new Date());

      await setCachedData(data.events);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch disaster data";

      setError(message);

      console.error("NASA EONET fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchEvents();
  }, [fetchEvents]);

  return {
    events,
    loading,
    error,
    lastUpdated,
    refetch: fetchEvents,
  };
}

// ------------------------------
// SECTION: Helper Functions
// ------------------------------
function getEventLocation(event: EONETEvent): [number, number] | null {
  if (!event.geometry || event.geometry.length === 0) {
    return null;
  }

  const geometry = event.geometry[0];

  if (!geometry.coordinates || geometry.coordinates.length < 2) {
    return null;
  }

  return [geometry.coordinates[1], geometry.coordinates[0]];
}

function getEventColor(event: EONETEvent): string {
  const categoryId = event.categories?.[0]?.id;

  if (!categoryId) {
    return DEFAULT_COLOR;
  }

  return categoryColors[categoryId] || DEFAULT_COLOR;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) {
    return "Ongoing";
  }

  return new Date(dateStr).toLocaleString();
}

// ------------------------------
// SECTION: Leaflet Integration Components
// ------------------------------
interface DisasterLayerProps {
  events: EONETEvent[];
  visible: boolean;
}

export function DisasterLayer({ events, visible }: DisasterLayerProps): JSX.Element | null {
  const map = useMap();

  useEffect(() => {
    if (!visible || events.length === 0) {
      return;
    }

    const bounds: L.LatLngExpression[] = [];

    events.forEach((event) => {
      const location = getEventLocation(event);

      if (location) {
        bounds.push(location);
      }
    });

    if (bounds.length > 0) {
      map.fitBounds(bounds as L.LatLngBoundsExpression, {
        padding: [40, 40],
      });
    }
  }, [events, visible, map]);

  if (!visible) {
    return null;
  }

  return (
    <>
      {events.map((event) => {
        const location = getEventLocation(event);

        if (!location) {
          return null;
        }

        const color = getEventColor(event);

        return (
          <CircleMarker
            key={event.id}
            center={location}
            radius={8}
            fillColor={color}
            color={color}
            weight={2}
            opacity={1}
            fillOpacity={0.6}
          >
            <Popup>
              <div className="text-black max-w-xs">
                <h4 className="font-bold text-red-600 mb-1">{event.title}</h4>

                <p className="text-xs text-black mb-1">
                  Category: <span className="font-semibold">{event.categories?.[0]?.title}</span>
                </p>

                <p className="text-xs text-black mb-2">
                  Detected: {formatDate(event.geometry?.[0]?.date ?? null)}
                </p>

                <a
                  href={event.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-red-600 underline text-xs"
                >
                  NASA Event →
                </a>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
}

// ------------------------------
// SECTION: UI Controls Component
// ------------------------------
interface DisasterControlsProps {
  visible: boolean;
  onToggle: () => void;
  eventsCount: number;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  onRefresh: () => void;
}

export function DisasterControls({
  visible,
  onToggle,
  eventsCount,
  loading,
  error,
  lastUpdated,
  onRefresh,
}: DisasterControlsProps): JSX.Element {
  return (
    <div className="absolute top-4 left-4 z-[1000] bg-black border border-red-600 rounded-xl p-3 flex flex-wrap gap-2 items-center shadow-xl">
      <button
        type="button"
        onClick={onToggle}
        className={`px-3 py-1 rounded-full text-sm font-bold transition-colors ${
          visible ? "bg-red-600 text-white" : "bg-neutral-900 border border-red-600 text-white"
        }`}
      >
        {visible ? "Hide NASA" : "Show NASA"}
      </button>

      <div className="text-xs text-white bg-neutral-900 border border-red-600 px-2 py-1 rounded-full">
        {loading ? "Loading..." : `${eventsCount} Events`}
      </div>

      {error && <div className="text-xs text-red-500 max-w-[160px] truncate">{error}</div>}

      {lastUpdated && <div className="text-xs text-white">{lastUpdated.toLocaleTimeString()}</div>}

      <button
        type="button"
        onClick={onRefresh}
        disabled={loading}
        className="w-7 h-7 rounded-full bg-red-600 text-white text-sm disabled:opacity-50"
      >
        ⟳
      </button>
    </div>
  );
}

// ------------------------------
// SECTION: Legend Component
// ------------------------------
export function DisasterLegend(): JSX.Element {
  const categories = [
    {
      id: 8,
      name: "Wildfires",
      color: "#FF4500",
    },
    {
      id: 10,
      name: "Storms",
      color: "#1E90FF",
    },
    {
      id: 12,
      name: "Volcanoes",
      color: "#32CD32",
    },
    {
      id: 16,
      name: "Earthquakes",
      color: "#FFD700",
    },
    {
      id: 17,
      name: "Floods",
      color: "#FFB6C1",
    },
    {
      id: 21,
      name: "Landslides",
      color: "#FF6347",
    },
  ];

  return (
    <div className="absolute bottom-4 right-4 z-[1000] bg-black border border-red-600 rounded-xl p-3 text-xs text-white max-w-[180px]">
      <div className="font-bold text-red-500 mb-2">Disaster Legend</div>

      {categories.map((cat) => (
        <div key={cat.id} className="flex items-center gap-2 mb-1">
          <div
            className="w-3 h-3 rounded-full"
            style={{
              backgroundColor: cat.color,
            }}
          />

          <span>{cat.name}</span>
        </div>
      ))}
    </div>
  );
}

// ------------------------------
// SECTION: Main Integrated Component
// ------------------------------
interface WitnessNaturalDisastersProps {
  defaultVisible?: boolean;
}

export function WitnessNaturalDisasters({
  defaultVisible = true,
}: WitnessNaturalDisastersProps): JSX.Element {
  const [visible, setVisible] = useState<boolean>(defaultVisible);

  const { events, loading, error, lastUpdated, refetch } = useEONETEvents();

  return (
    <>
      <DisasterControls
        visible={visible}
        onToggle={() => setVisible((prev) => !prev)}
        eventsCount={events.length}
        loading={loading}
        error={error}
        lastUpdated={lastUpdated}
        onRefresh={() => {
          void refetch();
        }}
      />

      <DisasterLayer events={events} visible={visible} />

      <DisasterLegend />
    </>
  );
}

export default WitnessNaturalDisasters;

// ------------------------------
// SECTION: MainApp Demo
// ------------------------------
export function MainApp(): JSX.Element {
  const mapRef = useRef<L.Map | null>(null);

  return (
    <div className="w-full h-screen bg-black">
      <MapContainer
        center={[20, 0]}
        zoom={2}
        scrollWheelZoom
        className="w-full h-full"
        ref={mapRef}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        <WitnessNaturalDisasters defaultVisible />
      </MapContainer>
    </div>
  );
}
