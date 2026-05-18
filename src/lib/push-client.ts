// Browser-side Web Push helpers. Subscribes the device with the SW, sends
// the subscription to the server, and keeps prefs in sync with toggles.
import { supabase } from "@/integrations/supabase/client";
import {
  getVapidPublicKey,
  savePushSubscription,
  deletePushSubscription,
  updatePushPrefs,
} from "./push.functions";
import { getSettings } from "./witness-settings";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}

function bufToB64Url(buf: ArrayBuffer | null): string {
  if (!buf) return "";
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** Subscribe (or refresh) this device for push and persist server-side. */
export async function subscribePush(): Promise<{ ok: boolean; reason?: string }> {
  if (!pushSupported()) return { ok: false, reason: "Push not supported on this device" };
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, reason: "Sign in to enable notifications" };

  const perm = await Notification.requestPermission();
  if (perm !== "granted") return { ok: false, reason: "Notifications were blocked" };

  const reg = await navigator.serviceWorker.ready;
  const { publicKey } = await getVapidPublicKey();

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    const keyBytes = urlBase64ToUint8Array(publicKey);
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyBytes.buffer.slice(
        keyBytes.byteOffset,
        keyBytes.byteOffset + keyBytes.byteLength,
      ) as ArrayBuffer,
    });
  }

  const json = sub.toJSON();
  const p256dh = json.keys?.p256dh ?? bufToB64Url(sub.getKey("p256dh"));
  const authKey = json.keys?.auth ?? bufToB64Url(sub.getKey("auth"));
  if (!p256dh || !authKey) return { ok: false, reason: "Subscription missing keys" };

  const settings = getSettings();
  await savePushSubscription({
    data: {
      endpoint: sub.endpoint,
      p256dh,
      auth: authKey,
      userAgent: navigator.userAgent.slice(0, 400),
      prefs: {
        notifSos: settings.notifSosReceived,
        notifShareRequest: settings.notifShareRequest,
        notifLiveNearby: settings.notifLiveNearby,
      },
    },
  });
  return { ok: true };
}

/** Unsubscribe this device from push and remove the server row. */
export async function unsubscribePush(): Promise<void> {
  if (!pushSupported()) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    const endpoint = sub.endpoint;
    await sub.unsubscribe();
    try {
      await deletePushSubscription({ data: { endpoint } });
    } catch {
      /* ignore */
    }
  } catch (e) {
    console.warn("[push] unsubscribe failed", e);
  }
}

/** Push pref change for the signed-in user across all of their devices. */
export async function syncPushPrefs(prefs: {
  notifSos?: boolean;
  notifShareRequest?: boolean;
  notifLiveNearby?: boolean;
}): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;
  try {
    await updatePushPrefs({ data: prefs });
  } catch (e) {
    console.warn("[push] update prefs failed", e);
  }
}

/** Whether the user has any toggle enabled that requires a push subscription. */
export function anyPushToggleOn(): boolean {
  const s = getSettings();
  return s.notifSosReceived || s.notifShareRequest || s.notifLiveNearby;
}

/**
 * Reconcile push state with current settings. If any toggle is on and the
 * user is signed in, subscribe; otherwise unsubscribe. Safe to call on
 * app start and whenever toggles change.
 */
export async function reconcilePush(): Promise<void> {
  if (!pushSupported()) return;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;
  if (anyPushToggleOn()) {
    if (Notification.permission === "granted") {
      await subscribePush().catch(() => undefined);
    }
  } else {
    await unsubscribePush();
  }
}
