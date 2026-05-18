// Verified badges system for Witness R.E.P
// Reads badges from Supabase profiles.badges JSONB field.
// Badges display on map pins, recordings, and livestreams.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type VerifiedBadge =
  | "verified_witness"
  | "legal_observer"
  | "journalist"
  | "organization"
  | "ambassador";

export interface BadgeInfo {
  id: VerifiedBadge;
  name: string;
  icon: string; // emoji
  color: string;
}

export const VERIFIED_BADGES: Record<VerifiedBadge, BadgeInfo> = {
  verified_witness: {
    id: "verified_witness",
    name: "Verified Witness",
    icon: "✅",
    color: "#22c55e",
  },
  legal_observer: {
    id: "legal_observer",
    name: "Legal Observer",
    icon: "⚖️",
    color: "#3b82f6",
  },
  journalist: {
    id: "journalist",
    name: "Journalist",
    icon: "📰",
    color: "#f59e0b",
  },
  organization: {
    id: "organization",
    name: "Organization",
    icon: "🏛️",
    color: "#8b5cf6",
  },
  ambassador: {
    id: "ambassador",
    name: "Ambassador",
    icon: "🌟",
    color: "#ec4899",
  },
};

/** Fetch badges for a given user from Supabase profiles */
export async function fetchUserBadges(userId: string): Promise<VerifiedBadge[]> {
  try {
    const { data } = await supabase
      .from("profiles")
      .select("badges")
      .eq("user_id", userId)
      .single();
    if (!data?.badges) return [];
    const badges = Array.isArray(data.badges) ? data.badges : [];
    return badges
      .map((b: unknown) => {
        const name =
          typeof b === "object" && b !== null && "name" in b ? (b as { name: string }).name : "";
        return name as VerifiedBadge;
      })
      .filter((b: string) => b in VERIFIED_BADGES);
  } catch {
    return [];
  }
}

/** Batch fetch badges for multiple user IDs */
export async function fetchManyUserBadges(
  userIds: string[],
): Promise<Map<string, VerifiedBadge[]>> {
  const results = new Map<string, VerifiedBadge[]>();
  if (userIds.length === 0) return results;
  try {
    const { data } = await supabase
      .from("profiles")
      .select("user_id, badges")
      .in("user_id", userIds);
    if (!data) return results;
    for (const row of data) {
      const badges = Array.isArray(row.badges) ? row.badges : [];
      const parsed = badges
        .map((b: unknown) => {
          const name =
            typeof b === "object" && b !== null && "name" in b ? (b as { name: string }).name : "";
          return name as VerifiedBadge;
        })
        .filter((b: string) => b in VERIFIED_BADGES);
      results.set(row.user_id, parsed);
    }
  } catch {
    /* ignore */
  }
  return results;
}

/** React hook for fetching a single user's badges */
export function useUserBadges(userId: string | null | undefined): {
  badges: VerifiedBadge[];
  loading: boolean;
} {
  const [badges, setBadges] = useState<VerifiedBadge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setBadges([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    void fetchUserBadges(userId).then((b) => {
      if (!cancelled) {
        setBadges(b);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { badges, loading };
}

/**
 * Render verified badge HTML string for Leaflet popups.
 * Returns empty string if no badges.
 */
export function badgeTagsHtml(badges: VerifiedBadge[]): string {
  if (badges.length === 0) return "";
  const tags = badges
    .map((b) => {
      const info = VERIFIED_BADGES[b];
      return `<span class="witness-badge-tag" style="--badge-color:${info.color}">${info.icon} ${info.name}</span>`;
    })
    .join("");
  return `<div class="witness-badge-row">${tags}</div>`;
}
