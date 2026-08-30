import type { CharityRating } from "@todays-merit/shared-types";
import { prisma } from "../lib/prisma.js";
import { fetchCharityNavigatorRating, isCharityNavigatorMock } from "./charityNavigator.js";
import { fetchGuideStarRating, isGuideStarMock } from "./guideStar.js";

const STALE_AFTER_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

type CharityRatingRow = Awaited<ReturnType<typeof prisma.charityRating.findUnique>>;

function isStale(fetchedAt: Date | null | undefined): boolean {
  if (!fetchedAt) return true;
  return Date.now() - fetchedAt.getTime() > STALE_AFTER_MS;
}

export function toCharityRatingDto(row: CharityRatingRow | null | undefined): CharityRating | null {
  if (!row) return null;
  return {
    charityNavigatorStars: row.charityNavigatorStars,
    charityNavigatorScore: row.charityNavigatorScore !== null ? Number(row.charityNavigatorScore) : null,
    charityNavigatorUrl: row.charityNavigatorUrl,
    guideStarSealLevel: row.guideStarSealLevel as CharityRating["guideStarSealLevel"],
    guideStarUrl: row.guideStarUrl,
    isMock: row.isMock,
  };
}

// Fetches + caches whichever provider(s) are missing or stale for this org,
// and returns the current row either way. Safe to call on every detail-page
// view — no-ops (a single indexed read) once cached data is fresh. A failed
// fetch (rate limit, network blip) leaves the existing cache and its
// `fetchedAt` untouched, so the next call retries rather than caching the
// failure.
export async function getOrRefreshRating(organizationId: string, ein: string): Promise<CharityRatingRow> {
  const existing = await prisma.charityRating.findUnique({ where: { organizationId } });

  const needsCharityNavigator = isStale(existing?.charityNavigatorFetchedAt);
  const needsGuideStar = isStale(existing?.guideStarFetchedAt);
  if (!needsCharityNavigator && !needsGuideStar) return existing;

  const [cnResult, gsResult] = await Promise.allSettled([
    needsCharityNavigator ? fetchCharityNavigatorRating(ein) : Promise.resolve(undefined),
    needsGuideStar ? fetchGuideStarRating(ein) : Promise.resolve(undefined),
  ]);

  const cn = cnResult.status === "fulfilled" ? cnResult.value : undefined;
  const gs = gsResult.status === "fulfilled" ? gsResult.value : undefined;
  const isMock = isCharityNavigatorMock() || isGuideStarMock();

  const cnFields =
    cn !== undefined
      ? {
          charityNavigatorStars: cn?.stars ?? null,
          charityNavigatorScore: cn?.score ?? null,
          charityNavigatorUrl: cn?.url ?? null,
          charityNavigatorFetchedAt: new Date(),
        }
      : {};
  const gsFields =
    gs !== undefined
      ? {
          guideStarSealLevel: gs?.sealLevel ?? null,
          guideStarUrl: gs?.url ?? null,
          guideStarFetchedAt: new Date(),
        }
      : {};

  return prisma.charityRating.upsert({
    where: { organizationId },
    create: { organizationId, ...cnFields, ...gsFields, isMock },
    update: { ...cnFields, ...gsFields, isMock },
  });
}

// Fire-and-forget refresh for use in list endpoints, where blocking the
// response on every result's rating lookup would make search too slow.
// Results ship with whatever's currently cached (possibly null the first
// time); this populates the cache for the next request.
export function refreshRatingInBackground(organizationId: string, ein: string): void {
  getOrRefreshRating(organizationId, ein).catch((err) => {
    console.error(`Rating refresh failed for org ${organizationId}:`, err);
  });
}
