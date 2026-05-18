// Wrapped master key: stored encrypted in profile, unwrapped locally with PIN.
// Local raw master key lives in localStorage as @Witness_master.
import { supabase } from "@/integrations/supabase/client";

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
function asBuf(u: Uint8Array): ArrayBuffer {
  return u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength) as ArrayBuffer;
}

async function deriveWrapKey(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: asBuf(salt), iterations: PBKDF2_ITERS, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt", "wrapKey", "unwrapKey"],
  );
}

export function hasLocalMasterKey(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem(MASTER_KEY_LS);
}

export function clearLocalMasterKey() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(MASTER_KEY_LS);
}

export async function getMasterKey(): Promise<CryptoKey | null> {
  const raw = localStorage.getItem(MASTER_KEY_LS);
  if (!raw) return null;
  return crypto.subtle.importKey(
    "raw",
    asBuf(b64decode(raw)),
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/** First-time PIN setup: generate master key, wrap with PIN, push to profile. */
export async function provisionMasterKey(userId: string, pin: string) {
  const masterRaw = crypto.getRandomValues(new Uint8Array(32));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const wrapKey = await deriveWrapKey(pin, salt);
  const wrapped = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: asBuf(iv) },
    wrapKey,
    asBuf(masterRaw),
  );

  // Persist locally
  localStorage.setItem(MASTER_KEY_LS, b64encode(masterRaw));

  // Push to profile
  const { error } = await supabase
    .from("profiles")
    .update({
      wrapped_master_key: b64encode(wrapped),
      key_salt: b64encode(salt),
      key_iv: b64encode(iv),
      pin_set: true,
    })
    .eq("user_id", userId);
  if (error) throw error;
}

export interface ProfileKeyState {
  hasWrappedKey: boolean;
  pinSet: boolean;
}
export async function fetchProfileKeyState(userId: string): Promise<ProfileKeyState> {
  const { data, error } = await supabase
    .from("profiles")
    .select("wrapped_master_key,pin_set")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return {
    hasWrappedKey: !!data?.wrapped_master_key,
    pinSet: !!data?.pin_set,
  };
}

/** Recover-on-reinstall: pull wrapped key, unwrap with PIN, persist locally. */
export async function recoverMasterKey(userId: string, pin: string): Promise<void> {
  const { data, error } = await supabase
    .from("profiles")
    .select("wrapped_master_key,key_salt,key_iv")
    .eq("user_id", userId)
    .single();
  if (error) throw error;
  if (!data?.wrapped_master_key || !data.key_salt || !data.key_iv) {
    throw new Error("No wrapped key on profile");
  }
  const salt = b64decode(data.key_salt);
  const iv = b64decode(data.key_iv);
  const wrapped = b64decode(data.wrapped_master_key);
  const wrapKey = await deriveWrapKey(pin, salt);
  let plain: ArrayBuffer;
  try {
    plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: asBuf(iv) },
      wrapKey,
      asBuf(wrapped),
    );
  } catch {
    throw new Error("Incorrect PIN");
  }
  localStorage.setItem(MASTER_KEY_LS, b64encode(new Uint8Array(plain)));
}
