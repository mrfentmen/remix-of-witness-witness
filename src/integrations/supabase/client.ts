import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * SENIOR ENGINEER AUDIT FIX:
 * 1. Safe Token Sanitizer (No race conditions)
 * 2. Standard Singleton Pattern (Fixes build-time Proxy issues)
 * 3. Robust Fetch Interceptor (No infinite reload loops)
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

// 1. SAFE TOKEN SANITIZER
if (typeof window !== "undefined") {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith("sb-") && key.endsWith("-auth-token")) {
      const raw = localStorage.getItem(key);
      try {
        if (raw) {
          const parsed = JSON.parse(raw);
          const user = parsed?.user;
          const token = parsed?.access_token ?? parsed;
          
          const isInvalidToken = typeof token !== "string" || token.split(".").length !== 3;

          if (isMockId || isInvalidToken) {
            keysToRemove.push(key);
          }
        }
      } catch {
        keysToRemove.push(key);
      }
    }
  }

  keysToRemove.forEach(k => localStorage.removeItem(k));
}

// 2. SINGLETON CLIENT
const client = createClient<Database>(
  SUPABASE_URL || "",
  SUPABASE_PUBLISHABLE_KEY || "",
  {
    auth: {
      storage: typeof window !== "undefined" ? localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

// 3. ROBUST FETCH INTERCEPTOR
if (typeof window !== "undefined") {
  const originalFetch = globalThis.fetch;
  let isWiping = false;

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const response = await originalFetch(input, init);

    if (!isWiping && (response.status === 401 || response.status === 403)) {
      const clone = response.clone();
      try {
        const body = await clone.json();
        if (body.code === "PGRST301" || body.message?.toLowerCase().includes("jwt")) {
          isWiping = true;
          console.error("[Supabase] Fatal Auth Error - Wiping Session");
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith("sb-")) localStorage.removeItem(key);
          });
          window.location.reload();
        }
      } catch {
        // Ignore
      }
    }
    return response;
  };
}

export const supabase = client;
