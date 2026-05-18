// Account deletion: wipes cloud-side rows the user owns, then local data.
import { supabase } from "@/integrations/supabase/client";
import { wipeAllData } from "./witness-wipe";

export async function deleteMyAccount(): Promise<void> {
  const { data } = await supabase.auth.getUser();
  const uid = data.user?.id;
  if (uid) {
    // Best-effort cloud cleanup (RLS scopes each delete to the current user).
    await Promise.allSettled([
      supabase.from("recordings").delete().eq("user_id", uid),
      supabase.from("location_shares").delete().or(`requester_id.eq.${uid},recipient_id.eq.${uid}`),
      supabase.from("contact_locations").delete().eq("user_id", uid),
      supabase.from("live_streams").delete().eq("user_id", uid),
      // Scrub identifying profile fields (no DELETE policy on profiles).
      supabase
        .from("profiles")
        .update({
          phone: null,
          email: null,
          home_address: null,
          wrapped_master_key: null,
          key_iv: null,
          key_salt: null,
        })
        .eq("user_id", uid),
    ]);
  }
  await wipeAllData();
}
