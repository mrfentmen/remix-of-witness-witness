// Duplicate detection: generates a visual fingerprint from a video blob's
// first frame and compares against stored fingerprints for similarity.

export interface RecordingFingerprint {
  id: string;
  firstFrameHash: string;
  durationMs: number;
  size: number;
  coords: { lat: number; lng: number } | null;
  ts: number;
  preview: string;
}

/**
 * Generate a visual hash + thumbnail preview from the first frame of a video blob.
 * Downsamples to 160×120 for fast hashing.
 */
export async function generateVisualHash(blob: Blob): Promise<{ hash: string; preview: string }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const canvas = document.createElement("canvas");
    const url = URL.createObjectURL(blob);

    video.muted = true;
    video.playsInline = true;
    video.src = url;

    video.onloadeddata = () => {
      video.currentTime = 0.1;
    };

    video.onseeked = () => {
      canvas.width = 160;
      canvas.height = 120;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        video.remove();
        reject(new Error("Canvas context unavailable"));
        return;
      }
      ctx.drawImage(video, 0, 0, 160, 120);
      const preview = canvas.toDataURL("image/jpeg", 0.5);
      const imageData = ctx.getImageData(0, 0, 160, 120).data;

      crypto.subtle
        .digest("SHA-256", imageData)
        .then((hashBuffer) => {
          const hash = Array.from(new Uint8Array(hashBuffer))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
          URL.revokeObjectURL(url);
          video.remove();
          resolve({ hash, preview });
        })
        .catch(reject);
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      video.remove();
      reject(new Error("Failed to load video for fingerprint"));
    };
  });
}

/**
 * Calculate similarity score (0–100) between two fingerprints.
 *   - Visual match: 50 points
 *   - Duration within 2 seconds: 25 points
 *   - Location within ~100m: 25 points
 */
export function calculateSimilarity(a: RecordingFingerprint, b: RecordingFingerprint): number {
  let score = 0;

  if (a.firstFrameHash === b.firstFrameHash) score += 50;
  if (Math.abs(a.durationMs - b.durationMs) < 2000) score += 25;
  if (a.coords && b.coords) {
    const dist = Math.sqrt((a.coords.lat - b.coords.lat) ** 2 + (a.coords.lng - b.coords.lng) ** 2);
    if (dist < 0.001) score += 25;
  }

  return score;
}

const STORAGE_KEY = "witness_fingerprints";
const PREVIEW_PREFIX = "prev_";

/** Store a fingerprint in localStorage (keeps last 100). */
function persistFingerprint(fp: RecordingFingerprint): void {
  const raw = localStorage.getItem(STORAGE_KEY);
  const fingerprints: RecordingFingerprint[] = raw ? JSON.parse(raw) : [];
  fingerprints.push(fp);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fingerprints.slice(-100)));
  if (fp.preview) {
    try {
      localStorage.setItem(`${PREVIEW_PREFIX}${fp.id}`, fp.preview);
    } catch {
      /* quota exceeded — ignore */
    }
  }
}

/** Load all stored fingerprints from localStorage. */
function loadFingerprints(): RecordingFingerprint[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export interface DuplicateCheckResult {
  /** The matching stored fingerprint, if any above threshold. */
  match: RecordingFingerprint | null;
  /** Similarity score (0–100). */
  similarity: number;
  /** Preview of the new recording. */
  currentPreview: string;
}

/**
 * Run a duplicate check against the new recording.
 * If no match above threshold, persists the fingerprint automatically.
 * Threshold: 70% similarity.
 */
export async function checkDuplicate(params: {
  blob: Blob;
  durationMs: number;
  coords: { lat: number; lng: number } | null;
}): Promise<DuplicateCheckResult> {
  const { hash, preview } = await generateVisualHash(params.blob);

  const currentFP: RecordingFingerprint = {
    id: crypto.randomUUID(),
    firstFrameHash: hash,
    durationMs: params.durationMs,
    size: params.blob.size,
    coords: params.coords,
    ts: Date.now(),
    preview,
  };

  const fingerprints = loadFingerprints();
  let bestMatch: RecordingFingerprint | null = null;
  let highestScore = 0;

  for (const fp of fingerprints) {
    const score = calculateSimilarity(currentFP, fp);
    if (score > 70 && score > highestScore) {
      highestScore = score;
      bestMatch = fp;
      // Load the old preview
      if (!bestMatch.preview) {
        const stored = localStorage.getItem(`${PREVIEW_PREFIX}${fp.id}`);
        if (stored) bestMatch = { ...bestMatch, preview: stored };
      }
    }
  }

  if (!bestMatch) {
    persistFingerprint(currentFP);
  }

  return {
    match: bestMatch,
    similarity: highestScore,
    currentPreview: preview,
  };
}
