import { env } from "../lib/env.js";

export type GuideStarSealLevel = "platinum" | "gold" | "silver" | "bronze" | "none";

export interface GuideStarRating {
  sealLevel: GuideStarSealLevel;
  url: string;
}

const SEAL_LEVELS: readonly GuideStarSealLevel[] = ["none", "bronze", "silver", "gold", "platinum"];

export function isGuideStarMock(): boolean {
  return !env.guideStar.apiKey;
}

// Stable per-EIN pseudo-rating, same rationale as the Charity Navigator mock.
function deterministicMock(ein: string): GuideStarRating {
  let hash = 0;
  for (let i = 0; i < ein.length; i++) hash = (hash * 17 + ein.charCodeAt(i)) >>> 0;

  return {
    sealLevel: SEAL_LEVELS[hash % SEAL_LEVELS.length],
    url: `https://www.guidestar.org/profile/${ein}`,
  };
}

// Real Candid Premier API lookup (Seal of Transparency level by EIN). Never
// called unless CANDID_API_KEY is set. Verify the base URL and auth header
// name against https://developer.candid.org/ before relying on this in
// production — modeled from public docs, not exercised against a live key.
export async function fetchGuideStarRating(ein: string): Promise<GuideStarRating | null> {
  if (isGuideStarMock()) {
    return deterministicMock(ein);
  }

  const res = await fetch(`${env.guideStar.apiUrl}/organizations/${ein}`, {
    headers: {
      "Subscription-Key": env.guideStar.apiKey!,
      Accept: "application/json",
    },
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`Candid API request failed: ${res.status} ${await res.text()}`);
  }

  const body = (await res.json()) as { seal?: { level?: string } };
  const rawLevel = body.seal?.level?.toLowerCase() ?? "none";
  const sealLevel = SEAL_LEVELS.includes(rawLevel as GuideStarSealLevel)
    ? (rawLevel as GuideStarSealLevel)
    : "none";

  return { sealLevel, url: `https://www.guidestar.org/profile/${ein}` };
}
