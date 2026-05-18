// witness-points.ts — Award points & badges to user profiles in Supabase.
// Point values:
//   first recording: 50 pts
//   each recording: 10 pts
//   first certificate: 50 pts
//   SOS sent: 25 pts
//   account verified: 200 pts
//   referral: 150 pts each
//   first livestream: 50 pts

import { supabase } from "@/integrations/supabase/client";

export const POINTS = {
  RECORDING: 10,
  FIRST_RECORDING: 50,
  FIRST_CERTIFICATE: 50,
  SOS_SENT: 25,
  ACCOUNT_VERIFIED: 200,
  REFERRAL: 150,
  FIRST_LIVESTREAM: 50,
  BADGE_BONUS: 100,
} as const;

export const BADGE_DEFS = [
  { id: "first_witness", name: "First Witness", requirement: "1 Video Recorded", icon: "🎥" },
  { id: "certified", name: "Certified", requirement: "1 Certificate Generated", icon: "📜" },
  { id: "guardian", name: "Guardian", requirement: "1 SOS Alert Sent", icon: "🛡️" },
  { id: "broadcaster", name: "Broadcaster", requirement: "1 Livestream Started", icon: "📡" },
  { id: "community_pillar", name: "Community Pillar", requirement: "10 Referrals", icon: "🏛️" },
  { id: "veteran", name: "Veteran", requirement: "100 Videos Recorded", icon: "🎖️" },
  { id: "truth_keeper", name: "Truth Keeper", requirement: "50 Certificates", icon: "🔐" },
  { id: "verified_node", name: "Verified Node", requirement: "Account Verified", icon: "✅" },
] as const;

export interface PointsProfile {
  points: number;
  badges: string[];
}

/** Fetch the user's points + badges from Supabase profiles. */
export async function getPointsProfile(): Promise<PointsProfile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("points, badges")
    .eq("user_id", user.id)
    .single();

  if (error || !data) return null;
  return { points: data.points ?? 0, badges: data.badges ?? [] };
}

/** Award points to a user and auto-check for newly earned badges. */
export async function awardPoints(
  action: keyof typeof POINTS,
  overridePoints?: number,
): Promise<{ points: number; newBadges: string[] } | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const pts = overridePoints ?? POINTS[action];

  // Fetch current profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("points, badges")
    .eq("user_id", user.id)
    .single();

  if (!profile) return null;

  const currentBadges: string[] = profile.badges ?? [];
  const newPoints = (profile.points ?? 0) + pts;

  // Determine newly earned badges based on action
  const newBadges: string[] = [];

  // Count actions from recordings table for more accurate badge checking
  if (action === "RECORDING" || action === "FIRST_RECORDING") {
    const { count } = await supabase
      .from("recordings")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);
    const total = (count ?? 0) + 1;
    if (total >= 1 && !currentBadges.includes("first_witness")) newBadges.push("first_witness");
    if (total >= 100 && !currentBadges.includes("veteran")) newBadges.push("veteran");
  }

  if (action === "FIRST_CERTIFICATE" && !currentBadges.includes("certified")) {
    newBadges.push("certified");
  }

  if (action === "SOS_SENT" && !currentBadges.includes("guardian")) {
    newBadges.push("guardian");
  }

  if (action === "FIRST_LIVESTREAM" && !currentBadges.includes("broadcaster")) {
    newBadges.push("broadcaster");
  }

  if (action === "ACCOUNT_VERIFIED" && !currentBadges.includes("verified_node")) {
    newBadges.push("verified_node");
  }

  // Check truth_keeper based on certificate count
  if (action === "FIRST_CERTIFICATE") {
    const { count } = await supabase
      .from("certificates")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);
    const total = (count ?? 0) + 1;
    if (total >= 50 && !currentBadges.includes("truth_keeper")) newBadges.push("truth_keeper");
  }

  const mergedBadges = [...currentBadges];
  for (const b of newBadges) {
    if (!mergedBadges.includes(b)) mergedBadges.push(b);
  }

  // Add badge bonus points
  let totalPoints = newPoints;
  if (newBadges.length > 0) {
    totalPoints += newBadges.length * POINTS.BADGE_BONUS;
  }

  // Update profile
  const { error } = await supabase
    .from("profiles")
    .update({ points: totalPoints, badges: mergedBadges })
    .eq("user_id", user.id);

  if (error) {
    console.warn("[witness] Failed to update points", error);
    return null;
  }

  // Dispatch badge event if new badges earned
  if (newBadges.length > 0 && typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("witness_badge_earned", { detail: { badges: newBadges } }),
    );
  }

  return { points: totalPoints, newBadges };
}

/** Fetch community leaderboard: top 50 users by points descending. */
export async function getLeaderboard(): Promise<
  { userId: string; points: number; badges: string[] }[]
> {
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, points, badges")
    .order("points", { ascending: false })
    .limit(50);

  if (error || !data) return [];
  return data.map((r) => ({
    userId: r.user_id,
    points: r.points ?? 0,
    badges: r.badges ?? [],
  }));
}

/** Fetch many users' badge arrays at once (for map pins etc). */
export async function fetchManyUserBadges(userIds: string[]): Promise<Map<string, string[]>> {
  if (userIds.length === 0) return new Map();
  const unique = [...new Set(userIds.filter(Boolean))];
  const map = new Map<string, string[]>();

  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, badges")
    .in("user_id", unique);

  if (error || !data) return map;
  for (const r of data) {
    map.set(r.user_id, r.badges ?? []);
  }
  return map;
}

/** Render badges as HTML string of small pill tags (used in Leaflet popups). */
export function badgeTagsHtml(badges: string[]): string {
  if (!badges || badges.length === 0) return "";
  const labels: Record<string, string> = {
    first_witness: "🎥 First Witness",
    certified: "📜 Certified",
    guardian: "🛡️ Guardian",
    broadcaster: "📡 Broadcaster",
    community_pillar: "🏛️ Pillar",
    veteran: "🎖️ Veteran",
    truth_keeper: "🔐 Truth Keeper",
    verified_node: "✅ Verified",
  };
  return (
    '<div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:3px;">' +
    badges
      .map(
        (b) =>
          `<span style="background:rgba(232,0,28,0.15);color:#E8001C;font-size:9px;font-weight:700;padding:1px 6px;border-radius:999px;text-transform:uppercase;white-space:nowrap;">${labels[b] ?? b}</span>`,
      )
      .join("") +
    "</div>"
  );
}
