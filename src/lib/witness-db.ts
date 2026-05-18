// IndexedDB store for Witness recordings using `idb`.
// Now includes session-based chunk persistence so a crash or battery death
// during recording does NOT lose evidence. Each chunk is written to disk
// immediately as it arrives from the MediaRecorder.
import { openDB, type IDBPDatabase } from "idb";
import {
  decryptToBlob,
  encryptBlob,
  encryptChunk,
  decryptChunk,
  getEncryptionKey,
  sha256Hex,
  sha256HexStreaming,
} from "./witness-crypto";
import { syncRecordingMetadata, deleteRecordingMetadata } from "./cloud-recordings";

export interface RecordingGPS {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface GPSTrackPoint {
  lat: number;
  lng: number;
  timestamp: number;
  accuracy: number;
}

export interface ContinuitySegment {
  startTime: number;
  endTime: number;
}

export interface ContinuityLog {
  segments: ContinuitySegment[];
  totalRecordedMs: number;
  totalElapsedMs: number;
  hasGaps: boolean;
}

export type RecordingQuality = "standard" | "high";
export type ZoomType = "optical" | "digital";

export interface ZoomMetadata {
  level: number;
  type: ZoomType;
}

export interface RecordingMeta {
  id: string;
  createdAt: number;
  durationMs: number;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  encrypted: boolean;
  gps: RecordingGPS | null;
  thumbnailDataUrl: string | null;
  title?: string | null;
  description?: string | null;
  category?: string | null;
  gpsTrack?: GPSTrackPoint[] | null;
  quality?: RecordingQuality | null;
  zoom?: ZoomMetadata | null;
  nightMode?: boolean | null;
  continuity?: ContinuityLog | null;
  covert?: boolean | null;
  notes?: string | null;
  tags?: string[] | null;
}

interface StoredRecording extends RecordingMeta {
  cipher?: ArrayBuffer;
  iv?: Uint8Array;
  blob?: Blob;
  /** Uint8Array copy of blob data — survives IndexedDB structured clone. */
  blobBytes?: Uint8Array;
}

/** A chunk written immediately during recording so it survives crashes. */
export interface RecordingChunk {
  sessionId: string;
  seq: number;
  blob?: Blob;
  /** Uint8Array copy of blob data — survives IndexedDB structured clone. */
  blobBytes?: Uint8Array;
  cipher?: ArrayBuffer;
  iv?: Uint8Array;
  sizeBytes: number;
}

/** In-progress session stored for crash recovery. */
export interface RecordingSession {
  sessionId: string;
  startedAt: number;
  mimeType: string;
  encrypt: boolean;
  gps: RecordingGPS | null;
  thumbnailDataUrl: string | null;
  category: string | null;
  gpsTrack: GPSTrackPoint[] | null;
  quality: RecordingQuality | null;
  zoom: ZoomMetadata | null;
  nightMode: boolean | null;
  continuity: ContinuityLog | null;
  covert: boolean | null;
  notes: string | null;
  tags: string[] | null;
  chunkCount: number;
  totalSizeBytes: number;
  finalized: boolean;
}

const DB_NAME = "witness-db";
const DB_VERSION = 2;
const RECORDINGS_STORE = "recordings";
const CHUNKS_STORE = "chunks";
const SESSIONS_STORE = "sessions";

let dbPromise: Promise<IDBPDatabase> | null = null;

/** Reset the DB promise so tests can start with a fresh connection. */
export function __resetDBForTests(): void {
  dbPromise = null;
}

/** Access the raw DB instance (tests only). */
export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains(RECORDINGS_STORE)) {
          const s = db.createObjectStore(RECORDINGS_STORE, { keyPath: "id" });
          s.createIndex("createdAt", "createdAt");
        }
        if (oldVersion < 2) {
          if (!db.objectStoreNames.contains(CHUNKS_STORE)) {
            const cs = db.createObjectStore(CHUNKS_STORE, { keyPath: ["sessionId", "seq"] });
            cs.createIndex("sessionId", "sessionId");
          }
          if (!db.objectStoreNames.contains(SESSIONS_STORE)) {
            db.createObjectStore(SESSIONS_STORE, { keyPath: "sessionId" });
          }
        }
      },
    });
  }
  return dbPromise;
}

// ------------------------------------------------------------------
// Session-based chunk recording (crash-safe)
// ------------------------------------------------------------------

export interface SaveRecordingInput {
  blob: Blob;
  mimeType: string;
  durationMs: number;
  gps: RecordingGPS | null;
  thumbnailDataUrl: string | null;
  encrypt: boolean;
  pin?: string | null;
  category?: string | null;
  gpsTrack?: GPSTrackPoint[] | null;
  quality?: RecordingQuality | null;
  zoom?: ZoomMetadata | null;
  nightMode?: boolean | null;
  continuity?: ContinuityLog | null;
  covert?: boolean | null;
  notes?: string | null;
  tags?: string[] | null;
}

/** Begin a new crash-safe recording session. Returns a sessionId. */
export async function startRecordingSession(
  meta: Omit<SaveRecordingInput, "blob" | "durationMs">,
): Promise<string> {
  const sessionId = crypto.randomUUID();
  const session: RecordingSession = {
    sessionId,
    startedAt: Date.now(),
    mimeType: meta.mimeType,
    encrypt: meta.encrypt,
    gps: meta.gps ?? null,
    thumbnailDataUrl: meta.thumbnailDataUrl ?? null,
    category: meta.category ?? null,
    gpsTrack: meta.gpsTrack && meta.gpsTrack.length > 0 ? meta.gpsTrack : null,
    quality: meta.quality ?? null,
    zoom: meta.zoom ?? null,
    nightMode: meta.nightMode ?? null,
    continuity: meta.continuity ?? null,
    covert: meta.covert ?? null,
    notes: meta.notes ?? null,
    tags: meta.tags ?? null,
    chunkCount: 0,
    totalSizeBytes: 0,
    finalized: false,
  };
  const db = await getDB();
  await db.put(SESSIONS_STORE, session);
  return sessionId;
}

/** In-flight chunk-save promises per session so rapid ondataavailable events
 *  don't race on the shared chunkCount / seq counter. */
const chunkSaveQueues = new Map<string, Promise<void>>();

/** Persist a single chunk immediately to IndexedDB.
 *  Chunk saves for the same sessionId are automatically serialized so
 *  seq numbers and chunkCount stay correct even under rapid back-to-back
 */
export async function saveRecordingChunk(
  sessionId: string,
  chunk: Blob,
  pin?: string | null,
): Promise<void> {
  const previous = chunkSaveQueues.get(sessionId) ?? Promise.resolve();

  const current = (async () => {
    try {
      await previous;
    } catch {
      // Previous save failed — we still run this one to avoid losing evidence.
    }
    const db = await getDB();
    const session = (await db.get(SESSIONS_STORE, sessionId)) as RecordingSession | undefined;
    if (!session) throw new Error("Session not found: " + sessionId);

    const seq = session.chunkCount;
    const stored: RecordingChunk = {
      sessionId,
      seq,
      sizeBytes: chunk.size,
    };

    if (session.encrypt) {
      const key = await getEncryptionKey(pin).catch((e) => {
        throw new Error("Encryption failed: " + (e instanceof Error ? e.message : String(e)));
      });
      const buffer = await chunk.arrayBuffer();
      const { cipher, iv } = await encryptChunk(buffer, key);
      // Store as plain Uint8Array — survives structured clone cross-realm.
      stored.cipher = new Uint8Array(cipher).buffer;
      // Note: ArrayBuffer.from() creates a real ArrayBuffer in the current realm.
      // But since cipher might be cross-realm, use Uint8Array as intermediary.
      stored.iv = new Uint8Array(iv);
    } else {
      stored.blobBytes = new Uint8Array(await chunk.arrayBuffer());
    }

    await db.put(CHUNKS_STORE, stored);
    session.chunkCount = seq + 1;
    session.totalSizeBytes += chunk.size;
    await db.put(SESSIONS_STORE, session);
  })();

  chunkSaveQueues.set(sessionId, current);
  try {
    await current;
  } finally {
    if (chunkSaveQueues.get(sessionId) === current) {
      chunkSaveQueues.delete(sessionId);
    }
  }
}

/** Finalize a session into a single RecordingMeta entry.
 *  Reconstructs the full blob from chunks, then optionally re-encrypts
 *  the whole file for compatibility with existing vault consumers. */
export async function finalizeRecordingSession(
  sessionId: string,
  durationMs: number,
  pin?: string | null,
): Promise<RecordingMeta> {
  const db = await getDB();
  const session = (await db.get(SESSIONS_STORE, sessionId)) as RecordingSession | undefined;
  if (!session) throw new Error("Session not found: " + sessionId);

  // Read all chunks in order
  const chunks: RecordingChunk[] = [];
  for (let i = 0; i < session.chunkCount; i++) {
    const c = (await db.get(CHUNKS_STORE, [sessionId, i])) as RecordingChunk | undefined;
    if (c) chunks.push(c);
  }

  if (chunks.length === 0) {
    throw new Error("No chunks found for session " + sessionId);
  }

  // Memory guard: if total encrypted size > 200 MB, warn that older phones may struggle.
  // The web platform requires us to re-assemble the blob in RAM for vault storage.
  const totalEncryptedBytes = chunks.reduce(
    (sum, c) => sum + (c.cipher?.byteLength ?? c.blob?.size ?? 0),
    0,
  );
  if (totalEncryptedBytes > 200 * 1024 * 1024) {
    console.warn(
      "[witness] Large recording (" +
        Math.round(totalEncryptedBytes / 1024 / 1024) +
        "MB). Finalizing may use significant RAM on low-end devices.",
    );
  }

  let fullBlob: Blob;
  if (session.encrypt) {
    const key = await getEncryptionKey(pin);
    // Decrypt each chunk, concatenate, then re-encrypt whole blob.
    // In modern browsers `new Blob(parts)` references the underlying buffers
    // rather than deep-copying, but the decrypted ArrayBuffers still live in
    // memory until the Blob is garbage-collected. For very large recordings
    // (hundreds of MB) this can still exhaust RAM on budget smartphones.
    const decryptedParts: Blob[] = [];
    for (const c of chunks) {
      if (!c.cipher || !c.iv) continue;
      const plain = await decryptChunk(c.cipher, c.iv, key);
      decryptedParts.push(new Blob([plain], { type: session.mimeType }));
    }
    fullBlob = new Blob(decryptedParts, { type: session.mimeType });
    // Re-encrypt the full blob for vault compatibility.
    // encryptBlob loads the entire blob into RAM — see memory note in witness-crypto.ts.
    const { cipher, iv } = await encryptBlob(fullBlob, key);
    const sha256 = await sha256HexStreaming(fullBlob);
    const meta: RecordingMeta = {
      id: sessionId,
      createdAt: session.startedAt,
      durationMs,
      mimeType: session.mimeType,
      sizeBytes: fullBlob.size,
      sha256,
      encrypted: true,
      gps: session.gps,
      thumbnailDataUrl: session.thumbnailDataUrl,
      category: session.category,
      gpsTrack: session.gpsTrack,
      quality: session.quality,
      zoom: session.zoom,
      nightMode: session.nightMode,
      continuity: session.continuity,
      covert: session.covert,
      notes: session.notes,
      tags: session.tags,
    };
    // Store as explicit copies so cross-realm structured clone preserves data.
    const stored: StoredRecording = {
      ...meta,
      cipher: new Uint8Array(cipher).slice().buffer as ArrayBuffer,
      iv: new Uint8Array(iv),
    };
    await db.put(RECORDINGS_STORE, stored);
    await db.delete(SESSIONS_STORE, sessionId);
    await db.delete(
      CHUNKS_STORE,
      IDBKeyRange.bound([sessionId, 0], [sessionId, Number.MAX_SAFE_INTEGER]),
    );
    void syncRecordingMetadata(meta).catch(() => {});
    return meta;
  } else {
    const parts: Blob[] = [];
    for (const c of chunks) {
      const chunkBlob = c.blob;
      if (chunkBlob) parts.push(chunkBlob);
      else if (c.blobBytes) parts.push(new Blob([c.blobBytes], { type: session.mimeType }));
    }
    fullBlob = new Blob(parts, { type: session.mimeType });
    const sha256 = await sha256HexStreaming(fullBlob);
    const meta: RecordingMeta = {
      id: sessionId,
      createdAt: session.startedAt,
      durationMs,
      mimeType: session.mimeType,
      sizeBytes: fullBlob.size,
      sha256,
      encrypted: false,
      gps: session.gps,
      thumbnailDataUrl: session.thumbnailDataUrl,
      category: session.category,
      gpsTrack: session.gpsTrack,
      quality: session.quality,
      zoom: session.zoom,
      nightMode: session.nightMode,
      continuity: session.continuity,
      covert: session.covert,
      notes: session.notes,
      tags: session.tags,
    };
    const stored: StoredRecording = {
      ...meta,
      blobBytes: new Uint8Array(await fullBlob.arrayBuffer()),
    };
    await db.put(RECORDINGS_STORE, stored);
    await db.delete(SESSIONS_STORE, sessionId);
    await db.delete(
      CHUNKS_STORE,
      IDBKeyRange.bound([sessionId, 0], [sessionId, Number.MAX_SAFE_INTEGER]),
    );
    void syncRecordingMetadata(meta).catch(() => {});
    return meta;
  }
}

/** Find any unfinalized sessions (e.g. after a crash). */
export async function recoverUnfinalizedSessions(): Promise<RecordingSession[]> {
  const db = await getDB();
  const all = (await db.getAll(SESSIONS_STORE)) as RecordingSession[];
  return all.filter((s) => !s.finalized);
}

/** Drop a session and its chunks without creating a recording. */
export async function discardSession(sessionId: string): Promise<void> {
  const db = await getDB();
  await db.delete(SESSIONS_STORE, sessionId);
  await db.delete(
    CHUNKS_STORE,
    IDBKeyRange.bound([sessionId, 0], [sessionId, Number.MAX_SAFE_INTEGER]),
  );
}

/** Keep the old single-shot saveRecording for consumers that don't need
 *  chunk-level crash safety, but implement it via the session pipeline
 *  so it still benefits from the same robust path. */
export async function saveRecording(input: SaveRecordingInput): Promise<RecordingMeta> {
  const sessionId = await startRecordingSession({
    mimeType: input.mimeType,
    encrypt: input.encrypt,
    gps: input.gps,
    thumbnailDataUrl: input.thumbnailDataUrl,
    category: input.category,
    gpsTrack: input.gpsTrack,
    quality: input.quality,
    zoom: input.zoom,
    nightMode: input.nightMode,
    continuity: input.continuity,
    covert: input.covert,
    notes: input.notes,
    tags: input.tags,
  });

  // Treat the entire blob as one chunk
  await saveRecordingChunk(sessionId, input.blob, input.pin);

  return finalizeRecordingSession(sessionId, input.durationMs, input.pin);
}

/**
 * Persist a recording whose blob/cipher we already have (used by recover-from-S3).
 * Does not re-sync to cloud — assumes the cloud row already exists.
 */
export async function saveRecordingRaw(input: {
  meta: RecordingMeta;
  blob?: Blob;
  cipher?: ArrayBuffer;
  iv?: Uint8Array;
}): Promise<void> {
  const stored: StoredRecording = { ...input.meta };
  if (input.cipher && input.iv) {
    // Make in-realm copies to survive IndexedDB structured clone.
    stored.cipher = new Uint8Array(input.cipher).slice().buffer as ArrayBuffer;
    stored.iv = new Uint8Array(input.iv);
  } else if (input.blob) {
    stored.blobBytes = new Uint8Array(await input.blob.arrayBuffer());
  }
  const db = await getDB();
  await db.put(RECORDINGS_STORE, stored);
}

export async function listRecordings(): Promise<RecordingMeta[]> {
  const db = await getDB();
  const all = (await db.getAll(RECORDINGS_STORE)) as StoredRecording[];
  return all
    .map(({ cipher: _c, iv: _i, blob: _b, blobBytes: _bb, ...meta }) => meta)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function getRecordingBlob(
  id: string,
  pin?: string | null,
): Promise<{ meta: RecordingMeta; blob: Blob } | null> {
  const db = await getDB();
  const rec = (await db.get(RECORDINGS_STORE, id)) as StoredRecording | undefined;
  if (!rec) return null;
  const { cipher, iv, blob: _b, blobBytes, ...meta } = rec;
  if (rec.encrypted && cipher && iv) {
    const key = await getEncryptionKey(pin);
    const decrypted = await decryptToBlob(cipher, iv, key, meta.mimeType);
    return { meta, blob: decrypted };
  }
  const blob = blobBytes
    ? new Blob([blobBytes], { type: meta.mimeType })
    : _b ?? new Blob([], { type: meta.mimeType });
  return { meta, blob };
}

export async function getRecordingRaw(
  id: string,
): Promise<
  | { meta: RecordingMeta; encrypted: true; cipher: ArrayBuffer; iv: Uint8Array }
  | { meta: RecordingMeta; encrypted: false; blob: Blob }
  | null
> {
  const db = await getDB();
  const rec = (await db.get(RECORDINGS_STORE, id)) as StoredRecording | undefined;
  if (!rec) return null;
  const { cipher, iv, blob: _b, blobBytes, ...meta } = rec;
  if (rec.encrypted && cipher && iv) {
    return { meta, encrypted: true, cipher, iv };
  }
  const blob = blobBytes
    ? new Blob([blobBytes], { type: meta.mimeType })
    : _b ?? new Blob([], { type: meta.mimeType });
  return { meta, encrypted: false, blob };
}

export async function deleteRecording(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(RECORDINGS_STORE, id);
  void deleteRecordingMetadata(id).catch(() => {});
}

export async function clearAllRecordings(): Promise<void> {
  const db = await getDB();
  await db.clear(RECORDINGS_STORE);
}

/** Update the user-editable title/description of a recording (local + cloud). */
export async function updateRecordingDetails(
  id: string,
  patch: {
    title?: string | null;
    description?: string | null;
    category?: string | null;
    notes?: string | null;
    tags?: string[] | null;
  },
): Promise<RecordingMeta | null> {
  const db = await getDB();
  const rec = (await db.get(RECORDINGS_STORE, id)) as StoredRecording | undefined;
  if (!rec) return null;
  const next: StoredRecording = {
    ...rec,
    title: patch.title ?? rec.title ?? null,
    description: patch.description ?? rec.description ?? null,
    category: patch.category !== undefined ? patch.category : (rec.category ?? null),
    notes: patch.notes !== undefined ? patch.notes : (rec.notes ?? null),
    tags: patch.tags !== undefined ? patch.tags : (rec.tags ?? null),
  };
  await db.put(RECORDINGS_STORE, next);
  const { cipher: _c, iv: _i, blob: _b, blobBytes: _bb, ...meta } = next;
  void syncRecordingMetadata(meta).catch(() => {});
  return meta;
}
