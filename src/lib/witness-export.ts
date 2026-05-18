// Export helpers for Witness recordings.
import { buildCertificate } from "./witness-certificate";
import { getRecordingBlob, getRecordingRaw, type RecordingMeta } from "./witness-db";
import { getString, STORAGE_KEYS } from "./witness-storage";

function extFromMime(mime: string): string {
  if (!mime) return "bin";
  if (mime.includes("webm")) return "webm";
  if (mime.includes("mp4")) return "mp4";
  if (mime.includes("ogg")) return "ogv";
  if (mime.includes("quicktime")) return "mov";
  const m = /\/([a-z0-9.+-]+)/i.exec(mime);
  return m ? m[1].split(";")[0] : "bin";
}

function stamp(ms: number): string {
  return new Date(ms).toISOString().replace(/[:.]/g, "-");
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function bufToB64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    s += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(s);
}

export async function exportDecrypted(meta: RecordingMeta): Promise<void> {
  const pin = getString(STORAGE_KEYS.pin);
  const result = await getRecordingBlob(meta.id, pin);
  if (!result) throw new Error("Recording not found");
  const name = `witness-${stamp(meta.createdAt)}.${extFromMime(meta.mimeType)}`;
  triggerDownload(result.blob, name);
}

export async function exportEncrypted(meta: RecordingMeta): Promise<void> {
  const raw = await getRecordingRaw(meta.id);
  if (!raw) throw new Error("Recording not found");
  if (!raw.encrypted) {
    // Nothing to export encrypted — just download the plain blob.
    const name = `witness-${stamp(meta.createdAt)}.${extFromMime(meta.mimeType)}`;
    triggerDownload(raw.blob, name);
    return;
  }
  const envelope = {
    format: "witness-encrypted/v1",
    algorithm: "AES-256-GCM",
    note: "iv and cipher are base64-encoded. Decrypt with the key derived from your Witness R.E.P PIN (PBKDF2-SHA256, 150000 iters) or device key.",
    meta,
    iv: bufToB64(raw.iv),
    cipher: bufToB64(raw.cipher),
  };
  const blob = new Blob([JSON.stringify(envelope, null, 2)], {
    type: "application/json",
  });
  triggerDownload(blob, `witness-${stamp(meta.createdAt)}.witness.json`);
}

export async function exportCertificate(meta: RecordingMeta): Promise<void> {
  const doc = await buildCertificate(meta);
  doc.save(`witness-certificate-${stamp(meta.createdAt)}.pdf`);
}

export async function exportBundle(meta: RecordingMeta): Promise<void> {
  await exportCertificate(meta);
  await exportDecrypted(meta);
  if (meta.encrypted) await exportEncrypted(meta);
}
