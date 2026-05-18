// Public map data layer — public recordings + active live streams.
import { supabase } from "@/integrations/supabase/client";
import type { RecordingCategory } from "@/lib/witness-categories";

export interface MapRecording {
  id: string;
  userId: string | null;
  recordedAt: number;
  durationMs: number;
  lat: number;
  lng: number;
  thumbnailDataUrl: string | null;
  title: string | null;
  category: string | null;
}

export interface MapStream {
  id: string;
  userId: string | null;
  playbackId: string;
  startedAt: number;
  title: string | null;
  lat: number;
  lng: number;
}

export interface PublicRecordingsFilter {
  withinHours?: number;
  fromIso?: string;
  toIso?: string;
  categories?: RecordingCategory[];
}

/** Public recordings with optional date / category filters that have a GPS fix. */
export async function getPublicRecordings(
  filter: number | PublicRecordingsFilter = 24,
): Promise<MapRecording[]> {
  const opts: PublicRecordingsFilter =
    typeof filter === "number" ? { withinHours: filter } : filter;
  const since =
    opts.fromIso ?? new Date(Date.now() - (opts.withinHours ?? 24) * 3600 * 1000).toISOString();
  let query = supabase
    .from("recordings")
    .select("id,user_id,recorded_at,duration_ms,gps_lat,gps_lng,thumbnail_data_url,title,category")
    .eq("is_public", true)
    .gte("recorded_at", since)
    .not("gps_lat", "is", null)
    .not("gps_lng", "is", null)
    .order("recorded_at", { ascending: false })
    .limit(500);
  if (opts.toIso) query = query.lte("recorded_at", opts.toIso);
  if (opts.categories && opts.categories.length > 0) {
    query = query.in("category", opts.categories as unknown as string[]);
  }
  const { data, error } = await query;
  if (error) {
    console.warn("[witness] public recordings fetch failed", error);
    return [];
  }
  return (data ?? [])
    .filter((r) => r.gps_lat != null && r.gps_lng != null)
    .map((r) => ({
      id: r.id,
      userId: (r as { user_id?: string | null }).user_id ?? null,
      recordedAt: new Date(r.recorded_at).getTime(),
      durationMs: r.duration_ms,
      lat: r.gps_lat as number,
      lng: r.gps_lng as number,
      thumbnailDataUrl: r.thumbnail_data_url ?? null,
      title: (r as { title?: string | null }).title ?? null,
      category: (r as { category?: string | null }).category ?? null,
    }));
}

/** All live streams whose ended_at is null and that have a GPS fix. */
export async function getActiveStreams(): Promise<MapStream[]> {
  const { data, error } = await supabase
    .from("live_streams")
    .select("id,user_id,playback_id,started_at,title,gps_lat,gps_lng")
    .is("ended_at", null)
    .not("gps_lat", "is", null)
    .not("gps_lng", "is", null)
    .order("started_at", { ascending: false })
    .limit(500);
  if (error) {
    console.warn("[witness] active streams fetch failed", error);
    return [];
  }
  return (data ?? [])
    .filter((r) => r.gps_lat != null && r.gps_lng != null)
    .map((r) => ({
      id: r.id,
      userId: (r as { user_id?: string | null }).user_id ?? null,
      playbackId: r.playback_id,
      startedAt: new Date(r.started_at).getTime(),
      title: r.title,
      lat: r.gps_lat as number,
      lng: r.gps_lng as number,
    }));
}

/** Toggle the public flag on a recording the current user owns. */
export async function setRecordingPublic(id: string, isPublic: boolean): Promise<void> {
  const { error } = await supabase
    .from("recordings")
    .update({
      is_public: isPublic,
      published_at: isPublic ? new Date().toISOString() : null,
    })
    .eq("id", id);
  if (error) throw error;
}

/** Read current public state for a set of local recording ids. */
export async function getPublicFlags(ids: string[]): Promise<Record<string, boolean>> {
  if (ids.length === 0) return {};
  const { data, error } = await supabase.from("recordings").select("id,is_public").in("id", ids);
  if (error) {
    console.warn("[witness] publish flags fetch failed", error);
    return {};
  }
  const out: Record<string, boolean> = {};
  for (const r of data ?? []) out[r.id] = !!r.is_public;
  return out;
}

/**
 * Insert a live_streams row when the user goes live.
 * Returns the row id so the caller can mark it ended later.
 * Returns null silently if the user is not signed in (anonymous live).
 */
export async function startLiveStreamRow(input: {
  muxStreamId: string;
  playbackId: string;
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  title?: string | null;
}): Promise<string | null> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return null;
  const { data, error } = await supabase
    .from("live_streams")
    .insert({
      user_id: userId,
      mux_stream_id: input.muxStreamId,
      playback_id: input.playbackId,
      gps_lat: input.lat,
      gps_lng: input.lng,
      gps_accuracy: input.accuracy,
      title: input.title ?? null,
    })
    .select("id")
    .single();
  if (error) {
    console.warn("[witness] live_streams insert failed", error);
    return null;
  }
  return data.id;
}

/** Mark a live stream row as ended (sets ended_at = now()). */
export async function endLiveStreamRow(id: string): Promise<void> {
  const { error } = await supabase
    .from("live_streams")
    .update({ ended_at: new Date().toISOString() })
    .eq("id", id);
  if (error) console.warn("[witness] live_streams end failed", error);
}
