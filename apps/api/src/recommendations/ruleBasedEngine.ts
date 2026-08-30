import type { RecommendationCandidate, RecommendationResult } from "./types.js";

function capitalize(s: string): string {
  return s.length > 0 ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

// Transparent, explainable fallback used whenever no AI provider key is
// configured (or the AI call fails) — cause-area match against the
// member's stated interests plus the orgs they're already engaged with,
// with a small boost for verification and third-party ratings.
export function ruleBasedRecommendations(
  interests: string[],
  connectedOrgCauseAreas: string[],
  candidates: RecommendationCandidate[],
  limit = 5,
): RecommendationResult[] {
  const interestSet = new Set([...interests, ...connectedOrgCauseAreas]);

  const scored = candidates.map((c) => {
    let score = 20;
    const reasons: string[] = [];

    if (interestSet.has(c.causeArea)) {
      score += 40;
      reasons.push(`matches your interest in ${c.causeArea.replace("_", " / ")}`);
    }
    if (c.verificationStatus === "verified") {
      score += 10;
      reasons.push("verified nonprofit");
    }
    if (c.charityNavigatorStars !== null) {
      score += c.charityNavigatorStars * 5;
      if (c.charityNavigatorStars >= 3) reasons.push(`${c.charityNavigatorStars}-star Charity Navigator rating`);
    }
    if (c.guideStarSealLevel && c.guideStarSealLevel !== "none") {
      score += 5;
      reasons.push(`${c.guideStarSealLevel} GuideStar seal`);
    }

    return {
      organizationId: c.id,
      matchScore: Math.min(100, score),
      reason: reasons.length > 0 ? capitalize(reasons.join(", ")) : "Popular with members like you",
    };
  });

  return scored.sort((a, b) => b.matchScore - a.matchScore).slice(0, limit);
}
