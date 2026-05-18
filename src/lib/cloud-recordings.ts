// Sync recording metadata + S3 keys to Postgres, and recover encrypted
// recordings from S3 back into IndexedDB on a fresh install.
import { supabase } from "@/integrations/supabase/client";
import {
  saveRecordingRaw,
  type RecordingMeta,
  type RecordingGPS,
  type GPSTrackPoint,
} from "./witness-db";
import { getS3SignedDownloadUrl } from "./s3-download.functions";

function currentUserId(): string | null {
  // Cheap sync read of cached session — caller should also check `useSession`.
  if (typeof window === "undefined") return null;
  return null; // Real check happens via getUser()
}

async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/** Push a freshly-saved recording's metadata to Postgres (no blob). */
export async function syncRecordingMetadata(meta: RecordingMeta): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;
  const { error } = await supabase.from("recordings").upsert({
    id: meta.id,
    user_id: userId,
    recorded_at: new Date(meta.createdAt).toISOString(),
    duration_ms: meta.durationMs,
    mime_type: meta.mimeType,
    size_bytes: meta.sizeBytes,
    sha256: meta.sha256,
    encrypted: meta.encrypted,
    gps_lat: meta.gps?.latitude ?? null,
    gps_lng: meta.gps?.longitude ?? null,
    gps_accuracy: meta.gps?.accuracy ?? null,
    thumbnail_data_url: meta.thumbnailDataUrl,
    title: meta.title ?? null,
    description: meta.description ?? null,
    category: meta.category ?? null,
    gps_track: (meta.gpsTrack ?? null) as unknown as never,
  });
  if (error) console.warn("[witness] metadata sync failed", error);
}

/** Patch the S3 key after a successful upload. */
export async function syncRecordingS3Key(id: string, s3Key: string): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;
  const { error } = await supabase
    .from("recordings")
    .update({ s3_key: s3Key, uploaded_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) console.warn("[witness] s3 key sync failed", error);
}

/** Delete metadata when user removes a local recording. */
export async function deleteRecordingMetadata(id: string): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;
  await supabase.from("recordings").delete().eq("id", id).eq("user_id", userId);
}

export interface CloudRecording extends RecordingMeta {
  s3Key: string | null;
  uploadedAt: number | null;
}

/** List all recordings owned by current user (cloud source of truth). */
export async function listCloudRecordings(): Promise<CloudRecording[]> {
  const userId = await getUserId();
  if (!userId) return [];
  const { data, error } = await supabase
    .from("recordings")
    .select("*")
    .eq("user_id", userId)
    .order("recorded_at", { ascending: false });
  if (error) {
    console.warn("[witness] list cloud recordings failed", error);
    return [];
  }
  return (data ?? []).map((r) => {
    const gps: RecordingGPS | null =
      r.gps_lat != null && r.gps_lng != null
        ? {
            latitude: r.gps_lat,
            longitude: r.gps_lng,
            accuracy: r.gps_accuracy ?? undefined,
          }
        : null;
    const trackRaw = (r as { gps_track?: unknown }).gps_track;
    const gpsTrack: GPSTrackPoint[] | null = Array.isArray(trackRaw)
      ? (trackRaw as GPSTrackPoint[])
      : null;
    return {
      id: r.id,
      createdAt: new Date(r.recorded_at).getTime(),
      durationMs: r.duration_ms,
      mimeType: r.mime_type,
      sizeBytes: Number(r.size_bytes),
      sha256: r.sha256,
      encrypted: r.encrypted,
      gps,
      thumbnailDataUrl: r.thumbnail_data_url,
      title: r.title ?? null,
      description: r.description ?? null,
      category: (r as { category?: string | null }).category ?? null,
      gpsTrack,
      s3Key: r.s3_key,
      uploadedAt: r.uploaded_at ? new Date(r.uploaded_at).getTime() : null,
    };
  });
}

/** Pull an encrypted recording from S3 back into IndexedDB. */
export async function recoverRecordingFromS3(rec: CloudRecording): Promise<void> {
  if (!rec.s3Key) throw new Error("Recording has no S3 backup");
  const { downloadUrl } = await getS3SignedDownloadUrl({
    data: { objectKey: rec.s3Key },
  });
  const res = await fetch(downloadUrl);
  if (!res.ok) throw new Error(`Download failed [${res.status}]`);

  if (rec.encrypted) {
    const envelope = (await res.json()) as {
      format: string;
      iv: string;
      cipher: string;
      mimeType: string;
    };
    if (!envelope?.iv || !envelope.cipher) throw new Error("Bad envelope");
    const ivBin = atob(envelope.iv);
    const iv = new Uint8Array(ivBin.length);
    for (let i = 0; i < ivBin.length; i++) iv[i] = ivBin.charCodeAt(i);
    const cipherBin = atob(envelope.cipher);
    const cipher = new Uint8Array(cipherBin.length);
    for (let i = 0; i < cipherBin.length; i++) cipher[i] = cipherBin.charCodeAt(i);
    await saveRecordingRaw({
      meta: { ...rec },
      cipher: cipher.buffer,
      iv,
    });
  } else {
    const blob = await res.blob();
    await saveRecordingRaw({ meta: { ...rec }, blob });
  }
}

// Avoid unused-helper warning
void currentUserId;
