import type { Prisma } from "@prisma/client";
import type { BadgeCriteria } from "@todays-merit/shared-types";
import { prisma } from "./prisma.js";
import { triggerSwagForBadgeAward, triggerSwagForTierAward } from "./swagAutomation.js";

function toJson(criteria: BadgeCriteria): Prisma.InputJsonValue {
  return criteria as unknown as Prisma.InputJsonValue;
}

// Default platform-wide tier ladder (organizationId: null), based on total
// verified volunteer hours across all organizations. Seeded once on server
// startup if no platform tiers exist yet.
const DEFAULT_PLATFORM_TIERS: { name: string; rankOrder: number; criteria: BadgeCriteria }[] = [
  { name: "Newcomer", rankOrder: 0, criteria: { type: "hours", threshold: 0 } },
  { name: "Bronze", rankOrder: 1, criteria: { type: "hours", threshold: 10 } },
  { name: "Silver", rankOrder: 2, criteria: { type: "hours", threshold: 25 } },
  { name: "Gold", rankOrder: 3, criteria: { type: "hours", threshold: 50 } },
  { name: "Platinum", rankOrder: 4, criteria: { type: "hours", threshold: 100 } },
];

export async function ensurePlatformTiers(): Promise<void> {
  const count = await prisma.tier.count({ where: { organizationId: null } });
  if (count > 0) return;

  await prisma.tier.createMany({
    data: DEFAULT_PLATFORM_TIERS.map((tier) => ({
      organizationId: null,
      name: tier.name,
      rankOrder: tier.rankOrder,
      criteria: toJson(tier.criteria),
    })),
  });
}

function parseCriteria(raw: unknown): BadgeCriteria | null {
  if (
    typeof raw === "object" &&
    raw !== null &&
    "type" in raw &&
    "threshold" in raw &&
    (raw as { type: unknown }).type &&
    typeof (raw as { threshold: unknown }).threshold === "number"
  ) {
    return raw as BadgeCriteria;
  }
  return null;
}

// Awards any badges for this org whose threshold the user has now crossed.
// Safe to call after any event that could move a user past a threshold
// (hour verification, a completed donation) — already-awarded badges are
// skipped via the unique (userId, badgeId) constraint.
export async function evaluateOrgBadges(userId: string, organizationId: string): Promise<void> {
  const [badges, existingAwards] = await Promise.all([
    prisma.badge.findMany({ where: { organizationId } }),
    prisma.userBadge.findMany({ where: { userId, organizationId }, select: { badgeId: true } }),
  ]);

  const awardedBadgeIds = new Set(existingAwards.map((a) => a.badgeId));
  const pending = badges.filter((b) => !awardedBadgeIds.has(b.id));
  if (pending.length === 0) return;

  const needsHours = pending.some((b) => parseCriteria(b.criteria)?.type === "hours");
  const needsDonations = pending.some((b) => parseCriteria(b.criteria)?.type === "donation_total");

  const [hoursAgg, donationsAgg] = await Promise.all([
    needsHours
      ? prisma.volunteerHour.aggregate({
          where: { userId, organizationId, verificationStatus: "verified_by_org" },
          _sum: { hours: true },
        })
      : null,
    needsDonations
      ? prisma.donation.aggregate({
          where: { userId, organizationId, paymentStatus: "completed" },
          _sum: { amount: true },
        })
      : null,
  ]);

  const totalHours = Number(hoursAgg?._sum.hours ?? 0);
  const totalDonated = Number(donationsAgg?._sum.amount ?? 0);

  for (const badge of pending) {
    const criteria = parseCriteria(badge.criteria);
    // "manual" badges (competition wins, one-off recognition) are never
    // auto-awarded — only the explicit award endpoint grants those.
    if (!criteria || criteria.type === "manual") continue;

    const total = criteria.type === "hours" ? totalHours : totalDonated;
    if (total < criteria.threshold) continue;

    const awarded = await prisma.userBadge
      .create({ data: { userId, badgeId: badge.id, organizationId } })
      .catch(() => null); // already awarded concurrently — ignore

    if (awarded) {
      await triggerSwagForBadgeAward(userId, organizationId, badge.id).catch(() => undefined);
    }
  }
}

// Awards any platform tiers (based on total verified hours across all orgs)
// the user has now crossed. Call after any hour gets verified.
export async function evaluateTiers(userId: string): Promise<void> {
  const [tiers, existing, hoursAgg] = await Promise.all([
    prisma.tier.findMany({ where: { organizationId: null }, orderBy: { rankOrder: "asc" } }),
    prisma.userTier.findMany({ where: { userId, organizationId: null }, select: { tierId: true } }),
    prisma.volunteerHour.aggregate({
      where: { userId, verificationStatus: "verified_by_org" },
      _sum: { hours: true },
    }),
  ]);

  const achievedTierIds = new Set(existing.map((t) => t.tierId));
  const totalHours = Number(hoursAgg._sum.hours ?? 0);

  for (const tier of tiers) {
    if (achievedTierIds.has(tier.id)) continue;
    const criteria = parseCriteria(tier.criteria);
    if (!criteria || criteria.type !== "hours" || totalHours < criteria.threshold) continue;

    const achieved = await prisma.userTier
      .create({ data: { userId, organizationId: null, tierId: tier.id } })
      .catch(() => null);

    if (achieved) {
      await triggerSwagForTierAward(userId, tier.id).catch(() => undefined);
    }
  }
}
