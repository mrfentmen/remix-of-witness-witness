// Youth education profile helpers. Wires the existing profiles.profile_type,
// points and badges columns added in this batch's migration.
import { supabase } from "@/integrations/supabase/client";

export type ProfileType = "standard" | "student";
export type ContentFilterLevel = "safe" | "moderate" | "full";

export interface YouthBadge {
  id: string;
  name: string;
  pointsRequired: number;
}

export const YOUTH_BADGES: YouthBadge[] = [
  { id: "ambassador-bronze", name: "Bronze Ambassador", pointsRequired: 50 },
  { id: "ambassador-silver", name: "Silver Ambassador", pointsRequired: 200 },
  { id: "ambassador-gold", name: "Gold Ambassador", pointsRequired: 500 },
];

export interface ProfileExtras {
  profileType: ProfileType;
  points: number;
  badges: string[];
}

export async function fetchProfileExtras(): Promise<ProfileExtras | null> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("profile_type, points, badges")
    .eq("user_id", u.user.id)
    .maybeSingle();
  if (error || !data) return null;
  return {
    profileType: (data.profile_type === "student" ? "student" : "standard") as ProfileType,
    points: data.points ?? 0,
    badges: data.badges ?? [],
  };
}

export async function setProfileType(type: ProfileType): Promise<void> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;
  await supabase.from("profiles").update({ profile_type: type }).eq("user_id", u.user.id);
}

/** Add points and award any newly-earned badges. Returns updated extras. */
export async function awardPoints(delta: number): Promise<ProfileExtras | null> {
  const cur = await fetchProfileExtras();
  if (!cur) return null;
  const points = cur.points + delta;
  const earned = new Set(cur.badges);
  for (const b of YOUTH_BADGES) {
    if (points >= b.pointsRequired) earned.add(b.id);
  }
  const badges = Array.from(earned);
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  await supabase.from("profiles").update({ points, badges }).eq("user_id", u.user.id);
  return { profileType: cur.profileType, points, badges };
}

/** Map profile to map content filter. Students start at "safe". */
export function contentFilterFor(extras: ProfileExtras | null): ContentFilterLevel {
  if (!extras || extras.profileType !== "student") return "full";
  if (extras.points >= 200) return "moderate";
  return "safe";
}

/**
 * Whether an incident category should be visible at the given filter level.
 * Mirrors the existing witness-categories taxonomy.
 */
export function categoryAllowed(category: string, level: ContentFilterLevel): boolean {
  if (level === "full") return true;
  const violent = ["brutality", "weapons", "violence", "assault"];
  const moderate = ["arrest", "raid", "incident"];
  if (level === "safe") return !violent.includes(category) && !moderate.includes(category);
  // moderate
  return !violent.includes(category);
}
