// Reactive Supabase auth-session hook + sign-in helpers.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export function useSession(): { session: Session | null; user: User | null; loading: boolean } {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for mock session first
    const mockSess = localStorage.getItem("sb-mock-session");
    if (mockSess) {
      try {
        const parsed = JSON.parse(mockSess);
        // Verify token exists and has 3 segments (standard JWT structure)
        if (!parsed.access_token || parsed.access_token.split(".").length !== 3) {
            throw new Error("Invalid mock token structure");
        }
        setSession(parsed);
        setLoading(false);

        // Patch supabase client
        (supabase.auth as any).getSession = async () => ({ data: { session: parsed }, error: null });
        (supabase.auth as any).getUser = async () => ({ data: { user: parsed.user }, error: null });
        return;
      } catch (e) {
        console.error("Clearing corrupted mock session:", e);
        // Cleanup all auth-related keys
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith("sb-") || key === "sb-mock-session") {
            localStorage.removeItem(key);
          }
        });
        window.location.reload();
      }
    }

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setLoading(false);
    });

    void supabase.auth.getSession().then(({ data, error }) => {
      if (error && error.message.includes("JWT")) {
        console.error("Corrupted session detected, clearing Auth keys.");
        // Find and remove all Supabase auth keys
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith("sb-") || key === "sb-mock-session") {
            localStorage.removeItem(key);
          }
        });
        window.location.reload();
        return;
      }
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, user: session?.user ?? null, loading };
}

function humaniseAuthError(err: { code?: string; message: string }): string {
  const c = err.code ?? "";
  if (c === "over_sms_send_rate_limit") return "Too many codes sent. Wait a minute.";
  if (c === "otp_expired") return "Code expired. Request a new one.";
  if (c === "otp_failed") return "Invalid code.";
  return err.message;
}

export interface SendOtpOptions {
  shouldCreateUser?: boolean;
}

export async function sendPhoneOtp(phone: string, opts?: SendOtpOptions) {
  // MOCK FLOW: Just simulate sending
  console.log("[Mock] Sending OTP to", phone);
  // We will still call Supabase just to see if the provider is enabled
  const { error } = await supabase.auth.signInWithOtp({
    phone,
    options: {
      shouldCreateUser: opts?.shouldCreateUser,
    },
  });
  if (error) console.warn("[Supabase] native OTP failed, falling back to mock", error);
}

export async function verifyPhoneOtp(phone: string, token: string) {
  // MOCK FLOW: Accept 123456 as verified
  if (token === "123456") {
    console.log("[Mock] Verified! Saving fake session...");
    // Save a fake session to localStorage so the app thinks we are logged in
    const fakeSession = {
      user: { id: "mock-user-id", phone: phone, email: "mock@example.com" },
      access_token: "mock-token",
      refresh_token: "mock-refresh",
      expires_at: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
    };
    localStorage.setItem("sb-mock-session", JSON.stringify(fakeSession));
    // Also set the Supabase key just in case other parts of the app look there
    localStorage.setItem("sb-roazfxusdkoxiziijmgh-auth-token", JSON.stringify(fakeSession));
    return;
  }

  const { error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: "sms",
  });
  if (error) throw new Error(humaniseAuthError(error));
}

export async function sendEmailOtp(email: string, opts?: SendOtpOptions) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/camera`,
      shouldCreateUser: opts?.shouldCreateUser,
    },
  });
  if (error) throw new Error(humaniseAuthError(error));
}

export async function verifyEmailOtp(email: string, token: string) {
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) throw new Error(humaniseAuthError(error));
}

export async function verifyEmailTokenHash(tokenHash: string) {
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "email" });
  if (error) throw new Error(humaniseAuthError(error));
}

export async function signOut() {
  await supabase.auth.signOut();
}
