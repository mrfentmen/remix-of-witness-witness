// Multi-device sync. Persistent device id in localStorage; backed by
// public.devices table with realtime subscription.
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type DeviceRow = Database["public"]["Tables"]["devices"]["Row"];

const LOCAL_DEVICE_ID_KEY = "witness:device-id";

export function getLocalDeviceId(): string {
  if (typeof localStorage === "undefined") return "ssr";
  let id = localStorage.getItem(LOCAL_DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(LOCAL_DEVICE_ID_KEY, id);
  }
  return id;
}

function defaultDeviceName(): string {
  if (typeof navigator === "undefined") return "Device";
  const ua = navigator.userAgent;
  if (/iPad/.test(ua)) return "iPad";
  if (/iPhone/.test(ua)) return "iPhone";
  if (/Android/.test(ua)) return "Android";
  if (/Mac/.test(ua)) return "Mac";
  if (/Win/.test(ua)) return "Windows";
  return "Device";
}

export async function registerThisDevice(): Promise<DeviceRow | null> {
  const { data: u } = await supabase.auth.getUser();
  const userId = u.user?.id;
  if (!userId) return null;
  const deviceId = getLocalDeviceId();

  const { data: existing } = await supabase
    .from("devices")
    .select("*")
    .eq("user_id", userId)
    .eq("device_id", deviceId)
    .maybeSingle();

  if (existing) {
    const { data: updated } = await supabase
      .from("devices")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("id", existing.id)
      .select("*")
      .maybeSingle();
    return updated ?? existing;
  }

  const { data: countRows } = await supabase.from("devices").select("id").eq("user_id", userId);
  const isPrimary = (countRows?.length ?? 0) === 0;

  const { data: inserted, error } = await supabase
    .from("devices")
    .insert({
      user_id: userId,
      device_id: deviceId,
      name: defaultDeviceName(),
      is_primary: isPrimary,
    })
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return inserted ?? null;
}

export async function listMyDevices(): Promise<DeviceRow[]> {
  const { data, error } = await supabase
    .from("devices")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function unlinkDevice(id: string): Promise<void> {
  const { error } = await supabase.from("devices").delete().eq("id", id);
  if (error) throw error;
}

export async function renameDevice(id: string, name: string): Promise<void> {
  const { error } = await supabase.from("devices").update({ name }).eq("id", id);
  if (error) throw error;
}

export async function setPrimaryDevice(id: string): Promise<void> {
  const { data: u } = await supabase.auth.getUser();
  const userId = u.user?.id;
  if (!userId) return;
  await supabase.from("devices").update({ is_primary: false }).eq("user_id", userId);
  await supabase.from("devices").update({ is_primary: true }).eq("id", id);
}

/** Subscribe to realtime device-table changes for this user. */
export function subscribeToDevices(userId: string, cb: () => void): () => void {
  const channel = supabase
    .channel(`devices:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "devices",
        filter: `user_id=eq.${userId}`,
      },
      () => cb(),
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}

/** Generate a 6-digit pairing code (ephemeral, in-memory). */
export function generatePairingCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
