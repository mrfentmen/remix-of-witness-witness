// Trusted-contact location sharing data layer.
// Wraps the Supabase RPCs and contact_locations table.
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type ShareStatus = Database["public"]["Enums"]["location_share_status"];
export type ShareDirection = "outgoing" | "incoming";

export interface SharedContact {
  shareId: string;
  contactUserId: string;
  alias: string | null;
  phone: string | null;
  homeAddress: string | null;
  status: ShareStatus;
  direction: ShareDirection;
  latitude: number | null;
  longitude: number | null;
  sosActive: boolean;
  sosAt: number | null;
  locationUpdatedAt: number | null;
  createdAt: number;
}

const SOS_PULSE_WINDOW_MS = 10 * 60 * 1000; // contact's red pulse decays after 10m

export async function listSharedContacts(): Promise<SharedContact[]> {
  const { data, error } = await supabase.rpc("get_shared_contacts");
  if (error) {
    console.warn("[witness] get_shared_contacts failed", error);
    return [];
  }
  const now = Date.now();
  return (data ?? []).map((r) => {
    const sosAt = r.sos_at ? new Date(r.sos_at).getTime() : null;
    const stillSos = !!r.sos_active && sosAt != null && now - sosAt < SOS_PULSE_WINDOW_MS;
    return {
      shareId: r.share_id,
      contactUserId: r.contact_user_id,
      alias: r.alias ?? null,
      phone: r.phone ?? null,
      homeAddress: r.home_address ?? null,
      status: r.status,
      direction: r.direction as ShareDirection,
      latitude: r.latitude ?? null,
      longitude: r.longitude ?? null,
      sosActive: stillSos,
      sosAt,
      locationUpdatedAt: r.location_updated_at ? new Date(r.location_updated_at).getTime() : null,
      createdAt: new Date(r.created_at).getTime(),
    };
  });
}

export async function inviteContactByPhone(phone: string, alias?: string): Promise<string> {
  const { data, error } = await supabase.rpc("request_location_share", {
    _phone: phone,
    _alias: alias ?? undefined,
  });
  if (error) throw error;
  return data as string;
}

export async function respondToShare(
  shareId: string,
  accept: boolean,
  alias?: string,
): Promise<void> {
  const { error } = await supabase.rpc("respond_location_share", {
    _share_id: shareId,
    _accept: accept,
    _alias: alias ?? undefined,
  });
  if (error) throw error;
}

export async function deleteShare(shareId: string): Promise<void> {
  const { error } = await supabase.from("location_shares").delete().eq("id", shareId);
  if (error) throw error;
}

export async function upsertMyLocation(input: {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
}): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return;
  const { error } = await supabase.from("contact_locations").upsert(
    {
      user_id: userId,
      latitude: input.latitude,
      longitude: input.longitude,
      accuracy: input.accuracy ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) console.warn("[witness] upsert location failed", error);
}

export async function deleteMyLocation(): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return;
  const { error } = await supabase.from("contact_locations").delete().eq("user_id", userId);
  if (error) console.warn("[witness] delete location failed", error);
}

export async function setMySosState(active: boolean): Promise<void> {
  const { error } = await supabase.rpc("set_my_sos_state", { _active: active });
  if (error) console.warn("[witness] set_my_sos_state failed", error);
}

export async function updateHomeAddress(address: string | null): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return;
  const value = address && address.trim() ? address.trim() : null;
  const { error } = await supabase
    .from("profiles")
    .update({ home_address: value })
    .eq("user_id", userId);
  if (error) throw error;
}

export async function getMyProfile(): Promise<{
  phone: string | null;
  email: string | null;
  homeAddress: string | null;
} | null> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("phone,email,home_address")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    phone: data.phone,
    email: data.email,
    homeAddress: data.home_address,
  };
}
