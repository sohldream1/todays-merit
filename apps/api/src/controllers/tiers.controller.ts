import type { Request, Response } from "express";
import type { MyTierStatus, Tier } from "@todays-merit/shared-types";
import { prisma } from "../lib/prisma.js";

function toTier(tier: {
  id: string;
  organizationId: string | null;
  name: string;
  rankOrder: number;
  criteria: unknown;
}): Tier {
  return {
    id: tier.id,
    organizationId: tier.organizationId,
    name: tier.name,
    rankOrder: tier.rankOrder,
    criteria: tier.criteria as Tier["criteria"],
  };
}

// Platform tiers are visible to anyone who needs to reference one (e.g. an
// org admin picking a tier to attach a swag auto-rule to) — there's nothing
// sensitive in a tier's name/rank/threshold.
export async function listPlatformTiers(_req: Request, res: Response) {
  const tiers = await prisma.tier.findMany({ where: { organizationId: null }, orderBy: { rankOrder: "asc" } });
  res.json({ tiers: tiers.map(toTier) });
}

export async function getMyTierStatus(req: Request, res: Response) {
  const claims = req.user!;

  const [tiers, achieved, hoursAgg] = await Promise.all([
    prisma.tier.findMany({ where: { organizationId: null }, orderBy: { rankOrder: "asc" } }),
    prisma.userTier.findMany({
      where: { userId: claims.sub, organizationId: null },
      select: { tierId: true },
    }),
    prisma.volunteerHour.aggregate({
      where: { userId: claims.sub, verificationStatus: "verified_by_org" },
      _sum: { hours: true },
    }),
  ]);

  const totalHours = Number(hoursAgg._sum.hours ?? 0);
  const achievedTierIds = new Set(achieved.map((a) => a.tierId));

  // tiers is sorted ascending by rank, so the last achieved match is the highest rank.
  let currentTier: Tier | null = null;
  for (const tier of tiers) {
    if (achievedTierIds.has(tier.id)) currentTier = toTier(tier);
  }

  const nextTier = tiers.find((t) => !currentTier || t.rankOrder > currentTier.rankOrder) ?? null;

  const result: MyTierStatus = {
    currentTier,
    nextTier: nextTier ? toTier(nextTier) : null,
    totalHours,
    tiers: tiers.map(toTier),
  };

  res.json(result);
}
