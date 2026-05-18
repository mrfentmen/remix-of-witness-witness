// Server-only push helpers: VAPID keypair lifecycle + web-push send.
// Imported only by src/lib/push.functions.ts.
import webpush from "web-push";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

let configured = false;
let cachedPublic: string | null = null;

export async function ensureVapid(): Promise<{ publicKey: string; subject: string }> {
  if (configured && cachedPublic) {
    const { data } = await supabaseAdmin
      .from("vapid_keys")
      .select("public_key, subject")
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) return { publicKey: data.public_key, subject: data.subject };
  }

  const existing = await supabaseAdmin
    .from("vapid_keys")
    .select("public_key, private_key, subject")
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let publicKey: string;
  let privateKey: string;
  let subject: string;

  if (existing.data) {
    publicKey = existing.data.public_key;
    privateKey = existing.data.private_key;
    subject = existing.data.subject;
  } else {
    const pair = webpush.generateVAPIDKeys();
    publicKey = pair.publicKey;
    privateKey = pair.privateKey;
    subject = "mailto:contactae2000@gmail.com";
    const { error } = await supabaseAdmin.from("vapid_keys").insert({
      public_key: publicKey,
      private_key: privateKey,
      subject,
      active: true,
    });
    if (error) throw new Error(`Failed to persist VAPID keys: ${error.message}`);
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  cachedPublic = publicKey;
  return { publicKey, subject };
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  actions?: Array<{ action: string; title: string }>;
  data?: Record<string, unknown>;
}

export interface SubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** Send a payload to a list of subscriptions. Removes 404/410 (gone) endpoints. */
export async function sendToSubscriptions(
  subs: SubscriptionRow[],
  payload: PushPayload,
): Promise<{ sent: number; pruned: number; failed: number }> {
  if (subs.length === 0) return { sent: 0, pruned: 0, failed: 0 };
  await ensureVapid();
  const json = JSON.stringify(payload);
  let sent = 0;
  let pruned = 0;
  let failed = 0;
  const dead: string[] = [];

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          json,
          { TTL: 60 * 60 * 24 },
        );
        sent++;
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode ?? 0;
        if (status === 404 || status === 410) {
          dead.push(s.endpoint);
          pruned++;
        } else {
          failed++;
          console.warn("[push] send failed", status, (err as Error).message);
        }
      }
    }),
  );

  if (dead.length > 0) {
    await supabaseAdmin.from("push_subscriptions").delete().in("endpoint", dead);
  }
  return { sent, pruned, failed };
}

/** Great-circle distance in miles between two coords (Haversine). */
export function distanceMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.7613;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
