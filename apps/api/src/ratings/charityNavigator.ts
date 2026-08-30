import { env } from "../lib/env.js";

export interface CharityNavigatorRating {
  stars: number;
  score: number;
  url: string;
}

export function isCharityNavigatorMock(): boolean {
  return !env.charityNavigator.apiKey;
}

// Stable per-EIN pseudo-rating (simple string hash, not cryptographic) so
// repeated lookups for the same org don't flap between renders — mock data
// should feel like a real cached rating, not random noise.
function deterministicMock(ein: string): CharityNavigatorRating {
  let hash = 0;
  for (let i = 0; i < ein.length; i++) hash = (hash * 31 + ein.charCodeAt(i)) >>> 0;

  return {
    stars: hash % 5, // 0-4
    score: 40 + (hash % 61), // 40-100
    url: `https://www.charitynavigator.org/ein/${ein}`,
  };
}

// Real Charity Navigator Data API lookup (GraphQL). Never called unless
// CHARITY_NAVIGATOR_API_KEY is set. Verify the query shape against
// https://developer.charitynavigator.org/ before relying on this in
// production — modeled from public docs, not exercised against a live key.
export async function fetchCharityNavigatorRating(ein: string): Promise<CharityNavigatorRating | null> {
  if (isCharityNavigatorMock()) {
    return deterministicMock(ein);
  }

  const query = `
    query OrgByEin($ein: String!) {
      publicSearchFaceted(ein: $ein) {
        results {
          ein
          encompassScore
          encompassStarRating
        }
      }
    }
  `;

  const res = await fetch(env.charityNavigator.apiUrl, {
    method: "POST",
    headers: {
      Authorization: env.charityNavigator.apiKey!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables: { ein } }),
  });

  if (!res.ok) {
    throw new Error(`Charity Navigator API request failed: ${res.status} ${await res.text()}`);
  }

  const body = (await res.json()) as {
    data?: {
      publicSearchFaceted?: {
        results?: { ein: string; encompassScore: number; encompassStarRating: number }[];
      };
    };
  };
  const result = body.data?.publicSearchFaceted?.results?.[0];
  if (!result) return null;

  return {
    stars: result.encompassStarRating,
    score: result.encompassScore,
    url: `https://www.charitynavigator.org/ein/${ein}`,
  };
}
