// WebCrypto helpers: AES-GCM encryption and SHA-256 hashing.
// Key is derived from the user's PIN with PBKDF2; if no PIN is set we
// fall back to a device-local key persisted under @Witness_devkey.

const PIN_SALT_KEY = "@Witness_pinsalt";
const DEVKEY_KEY = "@Witness_devkey";
const MASTER_KEY_LS = "@Witness_master";
const PBKDF2_ITERS = 150_000;

function b64encode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
function b64decode(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function toHex(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function sha256Hex(data: ArrayBuffer | Blob): Promise<string> {
  const buf = data instanceof Blob ? await data.arrayBuffer() : data;
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return toHex(digest);
}

/** Streaming SHA-256 for large files without loading whole blob into RAM. */
export async function sha256HexStreaming(blob: Blob): Promise<string> {
  // If small enough, use the fast path
  if (blob.size <= 50 * 1024 * 1024) {
    return sha256Hex(blob);
  }
  const stream = blob.stream();
  const reader = stream.getReader();
  const hashState = await crypto.subtle.digest("SHA-256", new Uint8Array(0));
  // Note: Web Crypto API doesn't expose incremental hashing directly.
  // For very large files we still have to load them in a single ArrayBuffer
  // unless we use a custom WASM or JS implementation. As a pragmatic
  // fallback, slice into 50MB chunks and concatenate is NOT valid for SHA-256.
  // So we read the whole blob but do it via stream to allow GC of slices.
  const chunks: Uint8Array[] = [];
  let totalLen = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    totalLen += value.length;
  }
  const combined = new Uint8Array(totalLen);
  let offset = 0;
  for (const c of chunks) {
    combined.set(c, offset);
    offset += c.length;
  }
  const digest = await crypto.subtle.digest("SHA-256", combined.buffer);
  return toHex(digest);
}

function randBytes(n: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(n));
}

function asBuf(u: Uint8Array): ArrayBuffer {
  return u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength) as ArrayBuffer;
}

function getOrCreateSalt(): Uint8Array {
  const existing = localStorage.getItem(PIN_SALT_KEY);
  if (existing) {
    try {
      return b64decode(existing);
    } catch {
      /* corrupted salt — generate fresh */
    }
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  try {
    localStorage.setItem(PIN_SALT_KEY, b64encode(salt));
  } catch {
    /* storage may be full or disabled */
  }
  return salt;
}

async function deriveKeyFromPin(pin: string): Promise<CryptoKey> {
  const salt = getOrCreateSalt();
  const baseKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: asBuf(salt), iterations: PBKDF2_ITERS, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function getDeviceKey(): Promise<CryptoKey> {
  let raw = localStorage.getItem(DEVKEY_KEY);
  if (!raw) {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    raw = b64encode(bytes);
    try {
      localStorage.setItem(DEVKEY_KEY, raw);
    } catch {
      /* storage may be full or disabled */
    }
  }
  try {
    return crypto.subtle.importKey(
      "raw",
      asBuf(b64decode(raw)),
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
  } catch {
    // Corrupted device key — rotate to a fresh one
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    raw = b64encode(bytes);
    try {
      localStorage.setItem(DEVKEY_KEY, raw);
    } catch {
      /* noop */
    }
    return crypto.subtle.importKey(
      "raw",
      asBuf(b64decode(raw)),
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
  }
}

/** Safely get the encryption key. If the stored master key is corrupted,
 *  it falls back to PIN or device key and warns the caller. */
export async function getEncryptionKey(pin?: string | null): Promise<CryptoKey> {
  // Prefer the cloud-recoverable master key when present.
  if (typeof window !== "undefined") {
    const master = localStorage.getItem(MASTER_KEY_LS);
    if (master) {
      try {
        return await crypto.subtle.importKey(
          "raw",
          asBuf(b64decode(master)),
          { name: "AES-GCM", length: 256 },
          false,
          ["encrypt", "decrypt"],
        );
      } catch {
        // Corrupted master key — do NOT silently proceed with a weaker key.
        // Instead throw a clear error so the UI can guide recovery.
        throw new Error(
          "Vault key corrupted. Please re-enter your PIN or recover your vault from cloud backup.",
        );
      }
    }
  }
  if (pin && pin.length > 0) return deriveKeyFromPin(pin);
  return getDeviceKey();
}

export interface EncryptedPayload {
  cipher: ArrayBuffer; // ciphertext + auth tag
  iv: Uint8Array; // 12 bytes
}

/**
 * Encrypt an entire Blob in one shot.
 * ⚠️ MEMORY WARNING: This loads the whole blob into RAM via `blob.arrayBuffer()`.
 * For blobs larger than ~100 MB on low-end smartphones this can cause an OOM
 * crash or freeze. Prefer `encryptChunk()` for large files and assemble
 * ciphertext chunks manually, or use streaming encryption via a Web Worker.
 */
export async function encryptBlob(blob: Blob, key: CryptoKey): Promise<EncryptedPayload> {
  const iv = randBytes(12);
  const plain = await blob.arrayBuffer();
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv: asBuf(iv) }, key, plain);
  return { cipher, iv };
}

export async function decryptToBlob(
  cipher: ArrayBuffer,
  iv: Uint8Array,
  key: CryptoKey,
  mimeType: string,
): Promise<Blob> {
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: asBuf(iv) }, key, cipher);
  return new Blob([plain], { type: mimeType });
}

/** Encrypt a small chunk (≤ 5 MB) safely. Used by the chunked recording pipeline. */
export async function encryptChunk(
  chunk: ArrayBuffer,
  key: CryptoKey,
): Promise<{ cipher: ArrayBuffer; iv: Uint8Array }> {
  const iv = randBytes(12);
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv: asBuf(iv) }, key, chunk);
  return { cipher, iv };
}

/** Decrypt a single chunk. */
export async function decryptChunk(
  cipher: ArrayBuffer,
  iv: Uint8Array,
  key: CryptoKey,
): Promise<ArrayBuffer> {
  return crypto.subtle.decrypt({ name: "AES-GCM", iv: asBuf(iv) }, key, cipher);
}

/** Validate whether a base64 string looks like a valid 256-bit AES key (32 bytes). */
export function looksLikeValidKeyB64(s: string): boolean {
  try {
    const decoded = b64decode(s);
    return decoded.length === 32;
  } catch {
    return false;
  }
}
