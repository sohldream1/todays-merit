import { env } from "../lib/env.js";
import type { RecommendationCandidate, RecommendationResult } from "./types.js";

// Real Claude API call (Anthropic Messages API) — only ever invoked when
// ANTHROPIC_API_KEY is set. This is the user's own key for their own
// Anthropic account; never assume ambient access just because this app was
// built with Claude Code.
export async function generateAiRecommendations(
  memberFirstName: string,
  interests: string[],
  candidates: RecommendationCandidate[],
  limit = 5,
): Promise<RecommendationResult[]> {
  const candidateList = candidates
    .map((c) => {
      const rating = c.charityNavigatorStars !== null ? `${c.charityNavigatorStars}/4 stars` : "unrated";
      const location = [c.city, c.state].filter(Boolean).join(", ") || "location unknown";
      const mission = (c.missionStatement ?? "").slice(0, 200);
      return `- id: ${c.id} | name: ${c.name} | cause: ${c.causeArea} | location: ${location} | rating: ${rating} | mission: ${mission}`;
    })
    .join("\n");

  const prompt = `You are helping ${memberFirstName}, a member of a volunteering and donation platform, discover nonprofits that match their interests.

Their stated cause-area interests: ${interests.length > 0 ? interests.join(", ") : "none specified yet"}.

Available nonprofits:
${candidateList}

Pick the best ${limit} matches for this member. Respond with ONLY valid JSON, no other text, in exactly this shape:
{"recommendations":[{"organizationId":"<id from the list above>","reason":"<one short personalized sentence, under 20 words, written to the member as \\"you\\">","matchScore":<integer 0-100>}]}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": env.anthropic.apiKey!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: env.anthropic.model,
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Anthropic API request failed: ${res.status} ${await res.text()}`);
  }

  const body = (await res.json()) as { content?: { type: string; text?: string }[] };
  const textBlock = body.content?.find((block) => block.type === "text");
  if (!textBlock?.text) {
    throw new Error("Anthropic response had no text content to parse");
  }

  const parsed = JSON.parse(textBlock.text) as { recommendations: RecommendationResult[] };
  const validIds = new Set(candidates.map((c) => c.id));

  return parsed.recommendations.filter((r) => validIds.has(r.organizationId)).slice(0, limit);
}
