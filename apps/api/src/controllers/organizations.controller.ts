import type { Request, Response } from "express";
import { z } from "zod";
import type { ActivityFeed, ActivityFeedItem, Organization } from "@todays-merit/shared-types";
import { assertOrgAdmin } from "../lib/authz.js";
import { getOrRefreshRating, refreshRatingInBackground, toCharityRatingDto } from "../ratings/ratingsService.js";
import { ApiError } from "../middleware/errorHandler.js";
import { prisma } from "../lib/prisma.js";
import { notifyPlatformAdmins } from "../lib/notifications.js";
import { verificationSubmittedEmail } from "../emails/verificationEmails.js";

const CAUSE_AREAS = [
  "community",
  "faith",
  "youth",
  "health",
  "environment",
  "arts_education",
  "other",
] as const;

const listFiltersSchema = z.object({
  q: z.string().min(1).optional(),
  causeArea: z.enum(CAUSE_AREAS).optional(),
  city: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
  country: z.string().min(1).optional(),
});

// Deliberately no verificationStatus field here — an org can no longer set
// its own verification status. It moves to "pending" via
// submitForVerification below, and only a platform admin can move it to
// "verified"/"rejected" (see platformAdmin.controller.ts).
const updateOrganizationSchema = z.object({
  name: z.string().min(1).optional(),
  missionStatement: z.string().optional(),
  websiteUrl: z.string().url().optional(),
  logoUrl: z.string().url().optional(),
  causeArea: z.enum(CAUSE_AREAS).optional(),
  city: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
  country: z.string().min(1).optional(),
});

export function toOrganization(
  org: {
    id: string;
    name: string;
    ein: string;
    missionStatement: string | null;
    websiteUrl: string | null;
    logoUrl: string | null;
    causeArea: string;
    city: string | null;
    state: string | null;
    country: string | null;
    verificationStatus: string;
    verificationNotes: string | null;
    subscriptionTier: string;
    createdAt: Date;
    updatedAt: Date;
  },
  rating: Organization["rating"] = null,
): Organization {
  return {
    id: org.id,
    name: org.name,
    ein: org.ein,
    missionStatement: org.missionStatement,
    websiteUrl: org.websiteUrl,
    logoUrl: org.logoUrl,
    causeArea: org.causeArea as Organization["causeArea"],
    city: org.city,
    state: org.state,
    country: org.country,
    verificationStatus: org.verificationStatus as Organization["verificationStatus"],
    verificationNotes: org.verificationNotes,
    subscriptionTier: org.subscriptionTier as Organization["subscriptionTier"],
    rating,
    createdAt: org.createdAt.toISOString(),
    updatedAt: org.updatedAt.toISOString(),
  };
}

export async function listOrganizations(req: Request, res: Response) {
  const filters = listFiltersSchema.parse(req.query);

  const organizations = await prisma.organization.findMany({
    where: {
      isArchived: false,
      ...(filters.q
        ? {
            OR: [
              { name: { contains: filters.q, mode: "insensitive" } },
              { missionStatement: { contains: filters.q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(filters.causeArea ? { causeArea: filters.causeArea } : {}),
      ...(filters.city ? { city: { contains: filters.city, mode: "insensitive" } } : {}),
      ...(filters.state ? { state: { contains: filters.state, mode: "insensitive" } } : {}),
      ...(filters.country ? { country: { contains: filters.country, mode: "insensitive" } } : {}),
    },
    include: { charityRating: true },
    orderBy: { name: "asc" },
  });

  // Ratings aren't fetched live per result (too slow for a list of many
  // orgs) — serve whatever's cached now and kick off a background refresh
  // for anything missing/stale so the next request has fresher data.
  for (const org of organizations) {
    if (!org.charityRating) {
      refreshRatingInBackground(org.id, org.ein);
    }
  }

  res.json({
    organizations: organizations.map((org) => toOrganization(org, toCharityRatingDto(org.charityRating))),
  });
}

export async function getOrganization(req: Request, res: Response) {
  const organization = await prisma.organization.findFirst({
    where: { id: req.params.id, isArchived: false },
  });

  if (!organization) {
    throw new ApiError(404, "Organization not found");
  }

  const ratingRow = await getOrRefreshRating(organization.id, organization.ein);

  res.json({ organization: toOrganization(organization, toCharityRatingDto(ratingRow)) });
}

export async function updateOrganization(req: Request, res: Response) {
  const claims = req.user!;
  const organizationId = req.params.id;

  await assertOrgAdmin(claims.sub, organizationId);

  const input = updateOrganizationSchema.parse(req.body);

  const organization = await prisma.organization.update({
    where: { id: organizationId },
    data: input,
  });

  res.json({ organization: toOrganization(organization) });
}

// Moves an org from unverified/rejected into the review queue. Resubmitting
// after a rejection clears the old notes — they'd otherwise read as stale
// once the org has (presumably) addressed whatever the reviewer flagged.
export async function submitForVerification(req: Request, res: Response) {
  const claims = req.user!;
  const organizationId = req.params.id;

  await assertOrgAdmin(claims.sub, organizationId);

  const existing = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!existing) {
    throw new ApiError(404, "Organization not found");
  }
  if (existing.verificationStatus !== "unverified" && existing.verificationStatus !== "rejected") {
    throw new ApiError(400, "This organization is already verified or awaiting review");
  }

  const organization = await prisma.organization.update({
    where: { id: organizationId },
    data: { verificationStatus: "pending", verificationNotes: null },
  });

  await notifyPlatformAdmins(verificationSubmittedEmail(organization.name));

  res.json({ organization: toOrganization(organization) });
}

const FEED_ITEMS_PER_TYPE = 30;

// A merged, time-ordered view over VolunteerHour and Donation — not a table
// of its own. Requires login (so it's a "members' wall," not a public
// firehose of who-gave-what) but isn't restricted to this org's own admins
// or participants; anyone with an account can see any org's feed, same as
// anyone can already view an org's public profile page.
//
// Self-reported hours are included alongside verified ones (labeled, not
// hidden) — they're already low-stakes since only verified hours count
// toward badges/tiers (see gamification.ts). Donation amounts are
// deliberately left out; see the ActivityFeedItem comment in shared-types.
export async function getOrganizationFeed(req: Request, res: Response) {
  const organizationId = req.params.orgId;
  const viewerId = req.user?.sub;

  const [hours, donations] = await Promise.all([
    prisma.volunteerHour.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: FEED_ITEMS_PER_TYPE,
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        opportunity: { select: { title: true } },
      },
    }),
    prisma.donation.findMany({
      where: { organizationId, paymentStatus: "completed" },
      orderBy: { donatedAt: "desc" },
      take: FEED_ITEMS_PER_TYPE,
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        campaign: { select: { title: true } },
      },
    }),
  ]);

  const hourIds = hours.map((h) => h.id);
  const donationIds = donations.map((d) => d.id);

  const [hourKudosCounts, donationKudosCounts, myHourKudos, myDonationKudos] = await Promise.all([
    prisma.kudos.groupBy({ by: ["volunteerHourId"], where: { volunteerHourId: { in: hourIds } }, _count: true }),
    prisma.kudos.groupBy({ by: ["donationId"], where: { donationId: { in: donationIds } }, _count: true }),
    viewerId
      ? prisma.kudos.findMany({ where: { userId: viewerId, volunteerHourId: { in: hourIds } } })
      : Promise.resolve([]),
    viewerId
      ? prisma.kudos.findMany({ where: { userId: viewerId, donationId: { in: donationIds } } })
      : Promise.resolve([]),
  ]);

  const hourKudosMap = new Map(hourKudosCounts.map((c) => [c.volunteerHourId, c._count]));
  const donationKudosMap = new Map(donationKudosCounts.map((c) => [c.donationId, c._count]));
  const myHourKudosSet = new Set(myHourKudos.map((k) => k.volunteerHourId));
  const myDonationKudosSet = new Set(myDonationKudos.map((k) => k.donationId));

  const hourItems: ActivityFeedItem[] = hours.map((h) => ({
    id: h.id,
    type: "volunteer_hours",
    occurredAt: h.createdAt.toISOString(),
    user: h.user,
    hours: Number(h.hours),
    verificationStatus: h.verificationStatus as ActivityFeedItem["verificationStatus"],
    opportunityTitle: h.opportunity?.title ?? null,
    kudosCount: hourKudosMap.get(h.id) ?? 0,
    hasGivenKudos: myHourKudosSet.has(h.id),
  }));

  const donationItems: ActivityFeedItem[] = donations.map((d) => ({
    id: d.id,
    type: "donation",
    occurredAt: d.donatedAt.toISOString(),
    user: d.user,
    campaignTitle: d.campaign?.title ?? null,
    kudosCount: donationKudosMap.get(d.id) ?? 0,
    hasGivenKudos: myDonationKudosSet.has(d.id),
  }));

  const items = [...hourItems, ...donationItems]
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, FEED_ITEMS_PER_TYPE);

  const result: ActivityFeed = { items };
  res.json(result);
}
