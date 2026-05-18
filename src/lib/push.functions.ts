// Server functions for Web Push: VAPID public key, subscription CRUD, and
// the three notification triggers (SOS, share-request, live-nearby).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  ensureVapid,
  sendToSubscriptions,
  distanceMiles,
  type SubscriptionRow,
} from "./push.server";

const NEARBY_RADIUS_MILES = 5;

// ---------- Public: VAPID key for client subscribe() ----------
export const getVapidPublicKey = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ publicKey: string }> => {
    const { publicKey } = await ensureVapid();
    return { publicKey };
  },
);

// ---------- Subscription CRUD ----------
const SubInput = z.object({
  endpoint: z.string().url().max(2000),
  p256dh: z.string().min(10).max(500),
  auth: z.string().min(8).max(500),
  prefs: z
    .object({
      notifSos: z.boolean().optional(),
      notifShareRequest: z.boolean().optional(),
      notifLiveNearby: z.boolean().optional(),
    })
    .optional(),
  userAgent: z.string().max(400).optional(),
});

export const savePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SubInput.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const row = {
      user_id: userId,
      endpoint: data.endpoint,
      p256dh: data.p256dh,
      auth: data.auth,
      user_agent: data.userAgent ?? null,
      ...(data.prefs?.notifSos !== undefined && { notif_sos: data.prefs.notifSos }),
      ...(data.prefs?.notifShareRequest !== undefined && {
        notif_share_request: data.prefs.notifShareRequest,
      }),
      ...(data.prefs?.notifLiveNearby !== undefined && {
        notif_live_nearby: data.prefs.notifLiveNearby,
      }),
    };
    const { error } = await supabaseAdmin
      .from("push_subscriptions")
      .upsert(row, { onConflict: "endpoint" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ endpoint: z.string().url().max(2000) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    await supabaseAdmin
      .from("push_subscriptions")
      .delete()
      .eq("user_id", userId)
      .eq("endpoint", data.endpoint);
    return { ok: true };
  });

export const updatePushPrefs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        notifSos: z.boolean().optional(),
        notifShareRequest: z.boolean().optional(),
        notifLiveNearby: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const patch: {
      notif_sos?: boolean;
      notif_share_request?: boolean;
      notif_live_nearby?: boolean;
    } = {};
    if (data.notifSos !== undefined) patch.notif_sos = data.notifSos;
    if (data.notifShareRequest !== undefined) patch.notif_share_request = data.notifShareRequest;
    if (data.notifLiveNearby !== undefined) patch.notif_live_nearby = data.notifLiveNearby;
    if (Object.keys(patch).length === 0) return { ok: true };
    await supabaseAdmin.from("push_subscriptions").update(patch).eq("user_id", userId);
    return { ok: true };
  });

// ---------- Helper: friendly name for "from" user ----------
async function senderLabel(userId: string): Promise<string> {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("phone, email")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return "A Witness R.E.P contact";
  if (data.phone) return data.phone;
  if (data.email) return data.email;
  return "A Witness R.E.P contact";
}

// ---------- 1. SOS received ----------
export const notifySosTriggered = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;

    // Find every user mutually-accepted with this user.
    const { data: shares } = await supabaseAdmin
      .from("location_shares")
      .select("requester_id, recipient_id")
      .eq("status", "accepted")
      .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`);

    const peerIds = (shares ?? [])
      .map((s) => (s.requester_id === userId ? s.recipient_id : s.requester_id))
      .filter((id): id is string => !!id);
    if (peerIds.length === 0) return { sent: 0, pruned: 0, failed: 0 };

    const { data: subs } = await supabaseAdmin
      .from("push_subscriptions")
      .select("id, user_id, endpoint, p256dh, auth")
      .in("user_id", peerIds)
      .eq("notif_sos", true);

    const name = await senderLabel(userId);
    return sendToSubscriptions((subs as SubscriptionRow[]) ?? [], {
      title: "SOS triggered",
      body: `${name} just triggered a Witness R.E.P SOS. Tap to see their live location.`,
      url: "/sos",
      tag: `sos-${userId}`,
      data: { type: "sos", userId },
    });
  });

// ---------- 2. Location-share request ----------
export const notifyLocationShareRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ shareId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: share } = await supabaseAdmin
      .from("location_shares")
      .select("requester_id, recipient_id, status")
      .eq("id", data.shareId)
      .maybeSingle();
    if (!share || share.requester_id !== userId) {
      return { sent: 0, pruned: 0, failed: 0 };
    }

    const { data: subs } = await supabaseAdmin
      .from("push_subscriptions")
      .select("id, user_id, endpoint, p256dh, auth")
      .eq("user_id", share.recipient_id)
      .eq("notif_share_request", true);

    const name = await senderLabel(userId);
    return sendToSubscriptions((subs as SubscriptionRow[]) ?? [], {
      title: "Location-share request",
      body: `${name} wants to share locations with you on Witness R.E.P.`,
      url: "/sos",
      tag: `share-${data.shareId}`,
      actions: [
        { action: "accept", title: "Accept" },
        { action: "decline", title: "Decline" },
      ],
      data: { type: "share-request", shareId: data.shareId },
    });
  });

// ---------- 3. Live nearby ----------
const LiveNearbyInput = z.object({
  streamId: z.string().uuid(),
  playbackId: z.string().min(1).max(120),
  lat: z.number().gte(-90).lte(90),
  lng: z.number().gte(-180).lte(180),
});

export const notifyLiveNearby = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => LiveNearbyInput.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    // Bounding box prefilter (≈ 1° lat = 69 mi).
    const dLat = NEARBY_RADIUS_MILES / 69;
    const dLng = NEARBY_RADIUS_MILES / (69 * Math.max(Math.cos((data.lat * Math.PI) / 180), 0.01));

    const { data: rows } = await supabaseAdmin
      .from("contact_locations")
      .select("user_id, latitude, longitude")
      .neq("user_id", userId)
      .gte("latitude", data.lat - dLat)
      .lte("latitude", data.lat + dLat)
      .gte("longitude", data.lng - dLng)
      .lte("longitude", data.lng + dLng);

    const nearbyIds = (rows ?? [])
      .filter(
        (r) =>
          r.latitude != null &&
          r.longitude != null &&
          distanceMiles(data.lat, data.lng, r.latitude, r.longitude) <= NEARBY_RADIUS_MILES,
      )
      .map((r) => r.user_id as string);

    if (nearbyIds.length === 0) return { sent: 0, pruned: 0, failed: 0 };

    const { data: subs } = await supabaseAdmin
      .from("push_subscriptions")
      .select("id, user_id, endpoint, p256dh, auth")
      .in("user_id", nearbyIds)
      .eq("notif_live_nearby", true);

    return sendToSubscriptions((subs as SubscriptionRow[]) ?? [], {
      title: "Witness R.E.P going live nearby",
      body: "Someone is streaming live within 5 miles of you. Tap to watch.",
      url: `/watch/${data.playbackId}`,
      tag: `live-${data.streamId}`,
      data: { type: "live-nearby", streamId: data.streamId, playbackId: data.playbackId },
    });
  });
