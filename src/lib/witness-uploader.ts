// Background uploader for Witness recordings → S3.
// Per-recording state is persisted in localStorage so cards can show progress.
import { useSyncExternalStore } from "react";
import { getRecordingRaw, type RecordingMeta } from "./witness-db";
import { getFlagWithDefault, getString, STORAGE_KEYS } from "./witness-storage";
import { getS3SignedUploadUrl } from "./s3-upload.functions";
import { syncRecordingS3Key } from "./cloud-recordings";
import { requestBackgroundSync } from "./pwa";
import { isWifiOrUnknown } from "./network";

export type UploadStatus = "idle" | "queued" | "waiting-wifi" | "uploading" | "done" | "error";

export interface UploadState {
  status: UploadStatus;
  progress: number; // 0..1
  objectKey?: string;
  error?: string;
  uploadedAt?: number;
}

const STORAGE_KEY = "@Witness_uploads";

/** Max concurrent uploads to avoid memory and network overload on low-end devices. */
const MAX_CONCURRENT = 2;
/** Upload timeout in milliseconds (5 minutes). */
const UPLOAD_TIMEOUT_MS = 5 * 60 * 1000;

let activeUploads = 0;

/** Reset activeUploads on page load in case a previous session crashed mid-upload. */
if (typeof window !== "undefined") {
  try {
    window.addEventListener("load", () => {
      activeUploads = 0;
    });
  } catch {
    /* noop */
  }
}

function readAll(): Record<string, UploadState> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, UploadState>) : {};
  } catch {
    return {};
  }
}
function writeAll(map: Record<string, UploadState>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* noop */
  }
}

const listeners = new Set<() => void>();
let cache: Record<string, UploadState> = readAll();

function emit() {
  cache = { ...cache };
  writeAll(cache);
  listeners.forEach((l) => l());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getUploadState(id: string): UploadState {
  return cache[id] ?? { status: "idle", progress: 0 };
}

export function useUploadState(id: string): UploadState {
  return useSyncExternalStore(
    subscribe,
    () => cache[id] ?? IDLE,
    () => IDLE,
  );
}
const IDLE: UploadState = { status: "idle", progress: 0 };

function update(id: string, patch: Partial<UploadState>) {
  cache[id] = { ...(cache[id] ?? IDLE), ...patch };
  emit();
}

function extFor(mime: string): string {
  if (mime.includes("webm")) return "webm";
  if (mime.includes("mp4")) return "mp4";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("quicktime")) return "mov";
  return "bin";
}

function putWithProgress(
  url: string,
  body: Blob,
  onProgress: (p: number) => void,
  signal: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed [${xhr.status}]`));
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.ontimeout = () => reject(new Error("Upload timed out"));
    xhr.onabort = () => reject(new Error("Upload was aborted"));

    const onAbort = () => {
      try {
        xhr.abort();
      } catch {
        /* ignore */
      }
    };
    signal.addEventListener("abort", onAbort);

    xhr.onloadend = () => {
      signal.removeEventListener("abort", onAbort);
    };

    xhr.send(body);
  });
}

/**
 * Build a metadata sidecar for encrypted recordings.
 * This is a tiny JSON object (kilobytes, not megabytes) uploaded
 * alongside the binary ciphertext so the recipient can decrypt.
 */
function buildMetadataSidecar(raw: { meta: RecordingMeta; cipher: ArrayBuffer; iv: Uint8Array }) {
  const ivB64 = btoa(String.fromCharCode(...raw.iv));
  const meta = {
    format: "witness-encrypted/v1",
    algorithm: "AES-GCM-256",
    recordingId: raw.meta.id,
    mimeType: raw.meta.mimeType,
    sha256: raw.meta.sha256,
    iv: ivB64,
    pinProtected: !!getString(STORAGE_KEYS.pin),
    recordedAt: raw.meta.createdAt,
  };
  return new Blob([JSON.stringify(meta)], { type: "application/json" });
}

export async function uploadRecording(id: string): Promise<void> {
  const current = cache[id]?.status;
  if (current === "uploading" || current === "queued") return;

  // WiFi-only gate. If on cellular, mark and bail; resumed by retryPendingUploads().
  const wifiOnly = getFlagWithDefault(STORAGE_KEYS.wifiOnly, false);
  if (wifiOnly && !isWifiOrUnknown()) {
    update(id, {
      status: "waiting-wifi",
      progress: 0,
      error: undefined,
    });
    return;
  }

  // Concurrency limit: wait our turn so low-end phones don't OOM.
  if (activeUploads >= MAX_CONCURRENT) {
    update(id, { status: "queued", progress: 0, error: undefined });
    return;
  }

  update(id, { status: "queued", progress: 0, error: undefined });

  try {
    const raw = await getRecordingRaw(id);
    if (!raw) throw new Error("Recording not found");

    let body: Blob;
    let key: string;
    let sidecarBlob: Blob | null = null;
    if (raw.encrypted) {
      // Upload raw binary ciphertext — no base64 inflation, no giant JSON envelope.
      body = new Blob([raw.cipher], { type: "application/octet-stream" });
      key = `recordings/${raw.meta.id}.witness.enc`;
      sidecarBlob = buildMetadataSidecar(raw);
    } else {
      body = raw.blob;
      key = `recordings/${raw.meta.id}.${extFor(raw.meta.mimeType)}`;
    }

    const { uploadUrl } = await getS3SignedUploadUrl({
      data: { objectKey: key },
    });

    update(id, { status: "uploading", progress: 0, objectKey: key });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);
    activeUploads++;

    try {
      await putWithProgress(
        uploadUrl,
        body,
        (p) => update(id, { status: "uploading", progress: p, objectKey: key }),
        controller.signal,
      );

      // If encrypted, also upload the tiny metadata sidecar so decryption keys + IV travel with the file.
      if (sidecarBlob) {
        try {
          const sidecarKey = `recordings/${raw.meta.id}.witness.meta.json`;
          const { uploadUrl: sidecarUrl } = await getS3SignedUploadUrl({
            data: { objectKey: sidecarKey },
          });
          await putWithProgress(
            sidecarUrl,
            sidecarBlob,
            () => {
              /* tiny file — no progress needed */
            },
            controller.signal,
          );
        } catch (sidecarErr) {
          // Non-fatal: the ciphertext is already safely stored. Log and continue.
          console.warn("[witness] metadata sidecar upload failed", sidecarErr);
        }
      }

      update(id, {
        status: "done",
        progress: 1,
        objectKey: key,
        uploadedAt: Date.now(),
      });
      // Sync S3 key to Postgres for cross-device recovery.
      void syncRecordingS3Key(id, key).catch(() => {});
    } finally {
      clearTimeout(timeoutId);
      activeUploads = Math.max(0, activeUploads - 1);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // If it was a timeout or network error, queue for retry instead of permanent error.
    const isRetryable =
      msg.includes("timeout") ||
      msg.includes("Network error") ||
      msg.includes("failed [5") ||
      msg.includes("aborted");

    update(id, {
      status: isRetryable ? "queued" : "error",
      error: msg,
    });

    // Ask the SW for a background sync; the browser will replay when online.
    void requestBackgroundSync();
    throw e;
  }
}

export function resetUpload(id: string) {
  delete cache[id];
  emit();
}

/** Retry every queued/errored/waiting-wifi upload. Best-effort, fire-and-forget. */
export async function retryPendingUploads(): Promise<void> {
  const ids = Object.entries(cache)
    .filter(([, s]) => s.status === "error" || s.status === "queued" || s.status === "waiting-wifi")
    .map(([id]) => id);
  for (const id of ids) {
    try {
      cache[id] = { ...cache[id], status: "idle", progress: 0, error: undefined };
      emit();
      await uploadRecording(id);
    } catch {
      /* will be retried on next online/sync event */
    }
  }
}
