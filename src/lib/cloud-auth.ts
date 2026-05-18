// Reactive Supabase auth-session hook + sign-in helpers.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export function useSession(): { session: Session | null; user: User | null; loading: boolean } {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session, clearing corrupted tokens if needed
    void supabase.auth.getSession().then(({ data, error }) => {
      if (error && error.message.includes("JWT")) {
        console.error("Corrupted session detected, clearing Auth keys.");
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith("sb-")) localStorage.removeItem(key);
        });
        window.location.reload();
        return;
      }
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
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
  const { error } = await supabase.auth.signInWithOtp({
    phone,
    options: {
      shouldCreateUser: opts?.shouldCreateUser,
    },
  });
  if (error) throw new Error(humaniseAuthError(error));
}

export async function verifyPhoneOtp(phone: string, token: string) {
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
