import { env } from "../lib/env.js";
import { generateAiRecommendations } from "./aiEngine.js";
import { ruleBasedRecommendations } from "./ruleBasedEngine.js";
import type { RecommendationCandidate, RecommendationResult } from "./types.js";

export interface RecommendationsOutcome {
  results: RecommendationResult[];
  isAiGenerated: boolean;
}

// Tries the real AI engine first when a key is configured; any failure
// there (network issue, malformed model output) falls back to the
// rule-based engine rather than surfacing an error to the member — a
// recommendation list that's merely less clever beats no list at all.
export async function getRecommendations(
  memberFirstName: string,
  interests: string[],
  connectedOrgCauseAreas: string[],
  candidates: RecommendationCandidate[],
): Promise<RecommendationsOutcome> {
  if (env.anthropic.apiKey) {
    try {
      const results = await generateAiRecommendations(memberFirstName, interests, candidates);
      if (results.length > 0) {
        return { results, isAiGenerated: true };
      }
    } catch (err) {
      console.error("AI recommendation generation failed, falling back to rule-based matching:", err);
    }
  }

  return {
    results: ruleBasedRecommendations(interests, connectedOrgCauseAreas, candidates),
    isAiGenerated: false,
  };
}
