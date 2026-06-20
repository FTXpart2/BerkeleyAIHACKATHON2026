import type { UserProfile, Friend } from "@drunk-buddy/shared";

// In-thread onboarding (brief §8): the buddy is "armed" once it knows the
// minimum it needs to actually help — name, home address, and one emergency
// contact. Blocklist is nice-to-have, collected conversationally afterward.
export interface OnboardingStatus {
  armed: boolean;
  missing: string[];
}

export function onboardingStatus(
  profile: UserProfile | null,
  friends: Friend[],
): OnboardingStatus {
  const missing: string[] = [];
  if (!profile?.name) missing.push("name");
  if (!profile?.home_address) missing.push("home address");
  if (!friends.some((f) => f.is_emergency)) missing.push("at least one emergency contact");
  return { armed: missing.length === 0, missing };
}
