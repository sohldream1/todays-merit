import type { Request, Response } from "express";
import type { RecommendationsResult } from "@todays-merit/shared-types";
import { toOrganization } from "./organizations.controller.js";
import { toCharityRatingDto } from "../ratings/ratingsService.js";
import { getRecommendations } from "../recommendations/engine.js";
import type { RecommendationCandidate } from "../recommendations/types.js";
import { prisma } from "../lib/prisma.js";

const CANDIDATE_LIMIT = 30;

export async function getMyRecommendations(req: Request, res: Response) {
  const claims = req.user!;

  const user = await prisma.user.findUnique({ where: { id: claims.sub } });
  if (!user) {
    const empty: RecommendationsResult = { recommendations: [], isAiGenerated: false };
    res.json(empty);
    return;
  }

  // "Connected" orgs (already volunteered/donated/earned a badge with, or
  // signed up for an opportunity) are excluded from candidates — the point
  // of this feature is surfacing charities the member hasn't found yet,
  // not resurfacing ones they already engage with. Their cause areas still
  // feed the rule-based fallback as an implicit interest signal, though.
  const [hourOrgs, donationOrgs, badgeOrgs, signupOrgs] = await Promise.all([
    prisma.volunteerHour.findMany({
      where: { userId: user.id },
      select: { organizationId: true },
      distinct: ["organizationId"],
    }),
    prisma.donation.findMany({
      where: { userId: user.id },
      select: { organizationId: true },
      distinct: ["organizationId"],
    }),
    prisma.userBadge.findMany({
      where: { userId: user.id },
      select: { organizationId: true },
      distinct: ["organizationId"],
    }),
    prisma.volunteerSignup.findMany({
      where: { userId: user.id },
      select: { opportunity: { select: { organizationId: true } } },
    }),
  ]);

  const connectedOrgIds = new Set<string>([
    ...hourOrgs.map((r) => r.organizationId),
    ...donationOrgs.map((r) => r.organizationId),
    ...badgeOrgs.map((r) => r.organizationId),
    ...signupOrgs.map((r) => r.opportunity.organizationId),
  ]);

  const connectedOrgs =
    connectedOrgIds.size > 0
      ? await prisma.organization.findMany({
          where: { id: { in: [...connectedOrgIds] } },
          select: { causeArea: true },
        })
      : [];
  const connectedOrgCauseAreas = connectedOrgs.map((o) => o.causeArea as string);

  const candidateRows = await prisma.organization.findMany({
    where: {
      isArchived: false,
      ...(connectedOrgIds.size > 0 ? { id: { notIn: [...connectedOrgIds] } } : {}),
    },
    include: { charityRating: true },
    orderBy: { name: "asc" },
    take: CANDIDATE_LIMIT,
  });

  if (candidateRows.length === 0) {
    const empty: RecommendationsResult = { recommendations: [], isAiGenerated: false };
    res.json(empty);
    return;
  }

  const candidates: RecommendationCandidate[] = candidateRows.map((org) => ({
    id: org.id,
    name: org.name,
    causeArea: org.causeArea as string,
    city: org.city,
    state: org.state,
    missionStatement: org.missionStatement,
    verificationStatus: org.verificationStatus as string,
    charityNavigatorStars: org.charityRating?.charityNavigatorStars ?? null,
    guideStarSealLevel: org.charityRating?.guideStarSealLevel ?? null,
  }));

  const { results, isAiGenerated } = await getRecommendations(
    user.firstName,
    user.causeAreaInterests as string[],
    connectedOrgCauseAreas,
    candidates,
  );

  const orgById = new Map(candidateRows.map((org) => [org.id, org]));

  const recommendations = results
    .map((r) => {
      const org = orgById.get(r.organizationId);
      if (!org) return null;
      return {
        organization: toOrganization(org, toCharityRatingDto(org.charityRating)),
        reason: r.reason,
        matchScore: r.matchScore,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  const result: RecommendationsResult = { recommendations, isAiGenerated };
  res.json(result);
}
