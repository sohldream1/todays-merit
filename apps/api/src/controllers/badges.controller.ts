import type { Request, Response } from "express";
import { z } from "zod";
import type { AwardBadgeInput, Badge, BadgeRecipientCandidate, MyBadge } from "@todays-merit/shared-types";
import { assertOrgAdmin } from "../lib/authz.js";
import { listConnectedUserIds } from "../lib/connectedUsers.js";
import { triggerSwagForBadgeAward } from "../lib/swagAutomation.js";
import { ApiError } from "../middleware/errorHandler.js";
import { prisma } from "../lib/prisma.js";

const BADGE_TYPES = ["volunteer_milestone", "donation_milestone", "competition", "custom"] as const;
const CRITERIA_TYPES = ["hours", "donation_total", "manual"] as const;

const criteriaSchema = z.object({
  type: z.enum(CRITERIA_TYPES),
  threshold: z.coerce.number().nonnegative().max(1_000_000),
});

const createBadgeSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  iconUrl: z.string().url().optional(),
  badgeType: z.enum(BADGE_TYPES),
  criteria: criteriaSchema,
});

const updateBadgeSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  iconUrl: z.string().url().optional(),
  badgeType: z.enum(BADGE_TYPES).optional(),
  criteria: criteriaSchema.optional(),
});

const awardBadgeSchema = z.object({
  recipientUserId: z.string().uuid(),
});

function toBadge(badge: {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
  badgeType: string;
  criteria: unknown;
  organization: { logoUrl: string | null };
}): Badge {
  return {
    id: badge.id,
    organizationId: badge.organizationId,
    name: badge.name,
    description: badge.description,
    iconUrl: badge.iconUrl,
    badgeType: badge.badgeType as Badge["badgeType"],
    criteria: badge.criteria as Badge["criteria"],
    organizationLogoUrl: badge.organization.logoUrl,
  };
}

const ORG_LOGO_INCLUDE = { organization: { select: { logoUrl: true } } } as const;

export async function listOrganizationBadges(req: Request, res: Response) {
  const badges = await prisma.badge.findMany({
    where: { organizationId: req.params.orgId },
    include: ORG_LOGO_INCLUDE,
  });

  res.json({ badges: badges.map(toBadge) });
}

export async function listMyBadges(req: Request, res: Response) {
  const claims = req.user!;

  const userBadges = await prisma.userBadge.findMany({
    where: { userId: claims.sub },
    orderBy: { awardedAt: "desc" },
    include: { badge: true, organization: true },
  });

  const result: MyBadge[] = userBadges.map((ub) => ({
    id: ub.id,
    awardedAt: ub.awardedAt.toISOString(),
    badge: {
      id: ub.badge.id,
      name: ub.badge.name,
      description: ub.badge.description,
      iconUrl: ub.badge.iconUrl,
      badgeType: ub.badge.badgeType as MyBadge["badge"]["badgeType"],
    },
    organization: { id: ub.organization.id, name: ub.organization.name, logoUrl: ub.organization.logoUrl },
  }));

  res.json({ badges: result });
}

export async function createBadge(req: Request, res: Response) {
  const claims = req.user!;
  const input = createBadgeSchema.parse(req.body);

  await assertOrgAdmin(claims.sub, input.organizationId);

  const badge = await prisma.badge.create({
    data: {
      organizationId: input.organizationId,
      name: input.name,
      description: input.description,
      iconUrl: input.iconUrl,
      badgeType: input.badgeType,
      criteria: input.criteria,
    },
    include: ORG_LOGO_INCLUDE,
  });

  res.status(201).json({ badge: toBadge(badge) });
}

export async function updateBadge(req: Request, res: Response) {
  const claims = req.user!;
  const badgeId = req.params.id;

  const existing = await prisma.badge.findUnique({ where: { id: badgeId } });
  if (!existing) {
    throw new ApiError(404, "Badge not found");
  }

  await assertOrgAdmin(claims.sub, existing.organizationId);

  const input = updateBadgeSchema.parse(req.body);

  const badge = await prisma.badge.update({
    where: { id: badgeId },
    data: input,
    include: ORG_LOGO_INCLUDE,
  });

  res.json({ badge: toBadge(badge) });
}

// Members who've interacted with this org before — the pool an admin picks
// from when manually awarding a badge (competition wins, one-off
// recognition) rather than typing a raw user id.
export async function listBadgeRecipients(req: Request, res: Response) {
  const claims = req.user!;
  const organizationId = req.params.orgId;
  await assertOrgAdmin(claims.sub, organizationId);

  const userIds = await listConnectedUserIds(organizationId);
  if (userIds.length === 0) {
    res.json({ recipients: [] });
    return;
  }

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    orderBy: { firstName: "asc" },
  });

  const recipients: BadgeRecipientCandidate[] = users.map((u) => ({
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
  }));

  res.json({ recipients });
}

// Manual award — the only path for "manual"-criteria badges (competition
// wins, one-off custom recognition) since evaluateOrgBadges never auto-
// awards those, but usable for any badge an admin wants to grant directly.
export async function awardBadge(req: Request, res: Response) {
  const claims = req.user!;
  const badgeId = req.params.id;
  const input: AwardBadgeInput = awardBadgeSchema.parse(req.body);

  const badge = await prisma.badge.findUnique({ where: { id: badgeId } });
  if (!badge) throw new ApiError(404, "Badge not found");
  await assertOrgAdmin(claims.sub, badge.organizationId);

  if (claims.role === "race_director" && badge.badgeType !== "competition") {
    throw new ApiError(403, "Race/Competition Directors can only award competition badges");
  }

  const recipient = await prisma.user.findUnique({ where: { id: input.recipientUserId } });
  if (!recipient) throw new ApiError(404, "Recipient not found");

  const awarded = await prisma.userBadge
    .create({ data: { userId: recipient.id, badgeId: badge.id, organizationId: badge.organizationId } })
    .catch(() => null);

  if (!awarded) {
    throw new ApiError(409, "This member already has this badge");
  }

  await triggerSwagForBadgeAward(recipient.id, badge.organizationId, badge.id).catch(() => undefined);

  res.status(201).json({ awarded: true });
}
