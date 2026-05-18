// Server-side Ed25519 signing for Witness certificates.
// Holds the private key in `signing_keys` (service-role only) and writes
// every issued certificate to `public.certificates` for public verification.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// ---------- Base64 helpers (Node + browser compatible) ----------
function b64encode(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
function b64decode(s: string): ArrayBuffer {
  const bin = atob(s);
  const buf = new ArrayBuffer(bin.length);
  const out = new Uint8Array(buf);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return buf;
}

// ---------- Active key management ----------
interface ActiveKey {
  id: string;
  publicKeyB64: string;
  privateKey: CryptoKey;
  publicKey: CryptoKey;
}

async function importKeys(
  privateKeyB64: string,
  publicKeyB64: string,
): Promise<{ privateKey: CryptoKey; publicKey: CryptoKey }> {
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    b64decode(privateKeyB64),
    { name: "Ed25519" },
    true,
    ["sign"],
  );
  const publicKey = await crypto.subtle.importKey(
    "raw",
    b64decode(publicKeyB64),
    { name: "Ed25519" },
    true,
    ["verify"],
  );
  return { privateKey, publicKey };
}

async function getOrCreateActiveKey(): Promise<ActiveKey> {
  // Try existing active key first.
  const existing = await supabaseAdmin
    .from("signing_keys")
    .select("id, public_key_b64, private_key_b64")
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing.data) {
    const { privateKey, publicKey } = await importKeys(
      existing.data.private_key_b64,
      existing.data.public_key_b64,
    );
    return {
      id: existing.data.id,
      publicKeyB64: existing.data.public_key_b64,
      privateKey,
      publicKey,
    };
  }

  // Generate a new Ed25519 keypair.
  const pair = (await crypto.subtle.generateKey({ name: "Ed25519" }, true, [
    "sign",
    "verify",
  ])) as CryptoKeyPair;
  const pkcs8 = await crypto.subtle.exportKey("pkcs8", pair.privateKey);
  const raw = await crypto.subtle.exportKey("raw", pair.publicKey);
  const privateKeyB64 = b64encode(pkcs8);
  const publicKeyB64 = b64encode(raw);

  const inserted = await supabaseAdmin
    .from("signing_keys")
    .insert({
      alg: "Ed25519",
      public_key_b64: publicKeyB64,
      private_key_b64: privateKeyB64,
      active: true,
    })
    .select("id")
    .single();
  if (inserted.error || !inserted.data) {
    throw new Error(`Failed to persist signing key: ${inserted.error?.message}`);
  }
  return {
    id: inserted.data.id,
    publicKeyB64,
    privateKey: pair.privateKey,
    publicKey: pair.publicKey,
  };
}

// ---------- Canonical payload ----------
const SignInputSchema = z.object({
  recordingId: z.string().uuid(),
  sha256: z.string().regex(/^[0-9a-f]{64}$/i),
  createdAt: z.number().int().nonnegative(),
  durationMs: z.number().int().nonnegative(),
  mimeType: z.string().min(1).max(120),
  sizeBytes: z.number().int().nonnegative(),
});
export type SignInput = z.infer<typeof SignInputSchema>;

function canonicalize(input: SignInput): string {
  // Stable, deterministic JSON: sorted keys, no whitespace.
  const ordered = {
    createdAt: input.createdAt,
    durationMs: input.durationMs,
    mimeType: input.mimeType,
    recordingId: input.recordingId,
    sha256: input.sha256.toLowerCase(),
    sizeBytes: input.sizeBytes,
  };
  return JSON.stringify(ordered);
}

// ---------- Server functions ----------
export interface IssuedCertificate {
  recordingId: string;
  sha256: string;
  payload: SignInput;
  signatureB64: string;
  keyId: string;
  publicKeyB64: string;
  alg: "Ed25519";
  issuedAt: string;
}

/** Sign a recording's certificate payload and persist it for public verification. */
export const signCertificate = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SignInputSchema.parse(input))
  .handler(async ({ data }): Promise<IssuedCertificate> => {
    const key = await getOrCreateActiveKey();
    const message = new TextEncoder().encode(canonicalize(data));
    const sig = await crypto.subtle.sign({ name: "Ed25519" }, key.privateKey, message);
    const signatureB64 = b64encode(sig);

    // Upsert by (recording_id, sha256) so re-issuing is idempotent.
    const { data: row, error } = await supabaseAdmin
      .from("certificates")
      .upsert(
        {
          recording_id: data.recordingId,
          sha256: data.sha256.toLowerCase(),
          payload: data,
          signature_b64: signatureB64,
          key_id: key.id,
        },
        { onConflict: "recording_id,sha256" },
      )
      .select("issued_at")
      .single();
    if (error || !row) {
      throw new Error(`Failed to record certificate: ${error?.message}`);
    }

    return {
      recordingId: data.recordingId,
      sha256: data.sha256.toLowerCase(),
      payload: data,
      signatureB64,
      keyId: key.id,
      publicKeyB64: key.publicKeyB64,
      alg: "Ed25519",
      issuedAt: row.issued_at as string,
    };
  });

// ---------- Verification ----------
export interface VerifyResult {
  status: "verified" | "tampered" | "not_found";
  certificate?: IssuedCertificate;
  reason?: string;
}

async function verifySignature(
  publicKeyB64: string,
  signatureB64: string,
  payload: SignInput,
): Promise<boolean> {
  try {
    const publicKey = await crypto.subtle.importKey(
      "raw",
      b64decode(publicKeyB64),
      { name: "Ed25519" },
      true,
      ["verify"],
    );
    const message = new TextEncoder().encode(canonicalize(payload));
    return await crypto.subtle.verify(
      { name: "Ed25519" },
      publicKey,
      b64decode(signatureB64),
      message,
    );
  } catch {
    return false;
  }
}

async function loadCertBySha(sha256: string) {
  const { data, error } = await supabaseAdmin
    .from("certificates")
    .select(
      "recording_id, sha256, payload, signature_b64, key_id, issued_at, signing_keys!inner(public_key_b64, alg)",
    )
    .eq("sha256", sha256.toLowerCase())
    .order("issued_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  // supabase returns the joined row as an object (or array) depending on relationship.
  const sk = Array.isArray(data.signing_keys) ? data.signing_keys[0] : data.signing_keys;
  if (!sk) return null;
  return {
    recordingId: data.recording_id as string,
    sha256: data.sha256 as string,
    payload: data.payload as SignInput,
    signatureB64: data.signature_b64 as string,
    keyId: data.key_id as string,
    publicKeyB64: sk.public_key_b64 as string,
    alg: (sk.alg as "Ed25519") ?? "Ed25519",
    issuedAt: data.issued_at as string,
  };
}

/** Verify by SHA-256 hash. Looks up the issued certificate and re-checks the signature. */
export const verifyByHash = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ sha256: z.string().regex(/^[0-9a-f]{64}$/i) }).parse(input),
  )
  .handler(async ({ data }): Promise<VerifyResult> => {
    const cert = await loadCertBySha(data.sha256);
    if (!cert) {
      return { status: "not_found", reason: "No certificate found for that hash." };
    }
    const ok = await verifySignature(cert.publicKeyB64, cert.signatureB64, cert.payload);
    return { status: ok ? "verified" : "tampered", certificate: cert };
  });

/**
 * Verify a payload supplied by the user (e.g. parsed from a .witness.json file).
 * Compares the supplied recording metadata against the signed payload on file.
 */
export const verifyPayload = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        recordingId: z.string().uuid().optional(),
        sha256: z.string().regex(/^[0-9a-f]{64}$/i),
        meta: z
          .object({
            createdAt: z.number().int().optional(),
            durationMs: z.number().int().optional(),
            mimeType: z.string().optional(),
            sizeBytes: z.number().int().optional(),
          })
          .partial()
          .optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<VerifyResult> => {
    const cert = await loadCertBySha(data.sha256);
    if (!cert) {
      return { status: "not_found", reason: "No certificate found for that hash." };
    }
    if (data.recordingId && data.recordingId !== cert.recordingId) {
      return {
        status: "tampered",
        certificate: cert,
        reason: "Recording ID does not match the signed certificate.",
      };
    }
    if (data.meta) {
      const m = data.meta;
      const p = cert.payload;
      const mismatches: string[] = [];
      if (m.createdAt != null && m.createdAt !== p.createdAt) mismatches.push("createdAt");
      if (m.durationMs != null && m.durationMs !== p.durationMs) mismatches.push("durationMs");
      if (m.mimeType != null && m.mimeType !== p.mimeType) mismatches.push("mimeType");
      if (m.sizeBytes != null && m.sizeBytes !== p.sizeBytes) mismatches.push("sizeBytes");
      if (mismatches.length > 0) {
        return {
          status: "tampered",
          certificate: cert,
          reason: `Mismatched fields: ${mismatches.join(", ")}`,
        };
      }
    }
    const ok = await verifySignature(cert.publicKeyB64, cert.signatureB64, cert.payload);
    return { status: ok ? "verified" : "tampered", certificate: cert };
  });
