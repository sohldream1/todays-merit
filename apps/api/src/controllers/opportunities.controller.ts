import type { Request, Response } from "express";
import { z } from "zod";
import type {
  MySignup,
  OpportunityParticipant,
  OpportunitySearchResult,
  VolunteerOpportunity,
  VolunteerSignup,
} from "@todays-merit/shared-types";
import { assertOrgAdmin } from "../lib/authz.js";
import { refreshRatingInBackground, toCharityRatingDto } from "../ratings/ratingsService.js";
import { ApiError } from "../middleware/errorHandler.js";
import { prisma } from "../lib/prisma.js";

const OPPORTUNITY_STATUSES = ["open", "closed"] as const;
const OPPORTUNITY_CATEGORIES = ["volunteer", "race", "competition"] as const;

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
  status: z.enum(OPPORTUNITY_STATUSES).optional(),
  category: z.enum(OPPORTUNITY_CATEGORIES).optional(),
});

const searchFiltersSchema = z.object({
  q: z.string().min(1).optional(),
  causeArea: z.enum(CAUSE_AREAS).optional(),
  city: z.string().min(1).optional(),
  isRemote: z.coerce.boolean().optional(),
  category: z.enum(OPPORTUNITY_CATEGORIES).optional(),
});

const createOpportunitySchema = z.object({
  organizationId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  location: z.string().optional(),
  isRemote: z.boolean().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  category: z.enum(OPPORTUNITY_CATEGORIES).optional(),
});

const updateOpportunitySchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  isRemote: z.boolean().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  status: z.enum(OPPORTUNITY_STATUSES).optional(),
  category: z.enum(OPPORTUNITY_CATEGORIES).optional(),
});

function toOpportunity(opp: {
  id: string;
  organizationId: string;
  title: string;
  description: string | null;
  location: string | null;
  isRemote: boolean;
  startDate: Date | null;
  endDate: Date | null;
  status: string;
  category: string;
  createdAt: Date;
  updatedAt: Date;
}): VolunteerOpportunity {
  return {
    id: opp.id,
    organizationId: opp.organizationId,
    title: opp.title,
    description: opp.description,
    location: opp.location,
    isRemote: opp.isRemote,
    startDate: opp.startDate ? opp.startDate.toISOString() : null,
    endDate: opp.endDate ? opp.endDate.toISOString() : null,
    status: opp.status as VolunteerOpportunity["status"],
    category: opp.category as VolunteerOpportunity["category"],
    createdAt: opp.createdAt.toISOString(),
    updatedAt: opp.updatedAt.toISOString(),
  };
}

function toSignup(signup: {
  id: string;
  userId: string;
  opportunityId: string;
  status: string;
  createdAt: Date;
}): VolunteerSignup {
  return {
    id: signup.id,
    userId: signup.userId,
    opportunityId: signup.opportunityId,
    status: signup.status as VolunteerSignup["status"],
    createdAt: signup.createdAt.toISOString(),
  };
}

// Global cross-org opportunity search for the member portal — mirrors
// listOrganizations' filter shape (q / causeArea / city) so the two search
// experiences feel consistent, but scoped to the org each opportunity
// belongs to rather than fields on the opportunity itself.
export async function searchOpportunities(req: Request, res: Response) {
  const filters = searchFiltersSchema.parse(req.query);

  const opportunities = await prisma.volunteerOpportunity.findMany({
    where: {
      status: "open",
      ...(filters.isRemote !== undefined ? { isRemote: filters.isRemote } : {}),
      ...(filters.category ? { category: filters.category } : {}),
      organization: {
        isArchived: false,
        ...(filters.causeArea ? { causeArea: filters.causeArea } : {}),
        ...(filters.city ? { city: { contains: filters.city, mode: "insensitive" } } : {}),
      },
      ...(filters.q
        ? {
            OR: [
              { title: { contains: filters.q, mode: "insensitive" } },
              { description: { contains: filters.q, mode: "insensitive" } },
              { organization: { name: { contains: filters.q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: { organization: { include: { charityRating: true } } },
    orderBy: { createdAt: "desc" },
  });

  // Same lazy-populate pattern as listOrganizations — serve cached ratings
  // now, refresh anything missing in the background for next time.
  const seenOrgIds = new Set<string>();
  for (const opp of opportunities) {
    if (!opp.organization.charityRating && !seenOrgIds.has(opp.organization.id)) {
      seenOrgIds.add(opp.organization.id);
      refreshRatingInBackground(opp.organization.id, opp.organization.ein);
    }
  }

  const results: OpportunitySearchResult[] = opportunities.map((opp) => ({
    ...toOpportunity(opp),
    organization: {
      id: opp.organization.id,
      name: opp.organization.name,
      causeArea: opp.organization.causeArea as OpportunitySearchResult["organization"]["causeArea"],
      city: opp.organization.city,
      state: opp.organization.state,
      rating: toCharityRatingDto(opp.organization.charityRating),
    },
  }));

  res.json({ opportunities: results });
}

export async function listOrganizationOpportunities(req: Request, res: Response) {
  const filters = listFiltersSchema.parse(req.query);

  const opportunities = await prisma.volunteerOpportunity.findMany({
    where: {
      organizationId: req.params.orgId,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.category ? { category: filters.category } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  res.json({ opportunities: opportunities.map(toOpportunity) });
}

export async function getOpportunity(req: Request, res: Response) {
  const opportunity = await prisma.volunteerOpportunity.findUnique({
    where: { id: req.params.id },
  });

  if (!opportunity) {
    throw new ApiError(404, "Opportunity not found");
  }

  res.json({ opportunity: toOpportunity(opportunity) });
}

export async function createOpportunity(req: Request, res: Response) {
  const claims = req.user!;
  const input = createOpportunitySchema.parse(req.body);

  await assertOrgAdmin(claims.sub, input.organizationId);

  // Directors are scoped to races/competitions — they have no business
  // creating a volunteer-category opportunity, and "no category given"
  // would silently default to volunteer, so require it explicitly.
  if (claims.role === "race_director" && (!input.category || input.category === "volunteer")) {
    throw new ApiError(400, "Race/Competition Directors can only create races or competitions");
  }

  const opportunity = await prisma.volunteerOpportunity.create({
    data: input,
  });

  res.status(201).json({ opportunity: toOpportunity(opportunity) });
}

export async function updateOpportunity(req: Request, res: Response) {
  const claims = req.user!;
  const opportunityId = req.params.id;

  const existing = await prisma.volunteerOpportunity.findUnique({
    where: { id: opportunityId },
  });
  if (!existing) {
    throw new ApiError(404, "Opportunity not found");
  }

  await assertOrgAdmin(claims.sub, existing.organizationId);

  if (claims.role === "race_director" && existing.category === "volunteer") {
    throw new ApiError(403, "Race/Competition Directors can't manage volunteer opportunities");
  }

  const input = updateOpportunitySchema.parse(req.body);

  if (claims.role === "race_director" && input.category === "volunteer") {
    throw new ApiError(400, "Race/Competition Directors can only manage races or competitions");
  }

  const opportunity = await prisma.volunteerOpportunity.update({
    where: { id: opportunityId },
    data: input,
  });

  res.json({ opportunity: toOpportunity(opportunity) });
}

// Who's signed up for one opportunity — org admins can see this for
// anything at their org; directors only for its races/competitions.
export async function listOpportunitySignups(req: Request, res: Response) {
  const claims = req.user!;
  const opportunityId = req.params.id;

  const opportunity = await prisma.volunteerOpportunity.findUnique({
    where: { id: opportunityId },
  });
  if (!opportunity) {
    throw new ApiError(404, "Opportunity not found");
  }

  await assertOrgAdmin(claims.sub, opportunity.organizationId);

  if (claims.role === "race_director" && opportunity.category === "volunteer") {
    throw new ApiError(403, "Race/Competition Directors can't view volunteer opportunity signups");
  }

  const signups = await prisma.volunteerSignup.findMany({
    where: { opportunityId, status: { not: "cancelled" } },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
  });

  const result: OpportunityParticipant[] = signups.map((s) => ({
    ...toSignup(s),
    user: s.user,
  }));

  res.json({ participants: result });
}

export async function signUpForOpportunity(req: Request, res: Response) {
  const claims = req.user!;
  const opportunityId = req.params.id;

  const opportunity = await prisma.volunteerOpportunity.findUnique({
    where: { id: opportunityId },
  });
  if (!opportunity || opportunity.status !== "open") {
    throw new ApiError(404, "Opportunity not found or no longer open");
  }

  const signup = await prisma.volunteerSignup.upsert({
    where: { userId_opportunityId: { userId: claims.sub, opportunityId } },
    create: { userId: claims.sub, opportunityId, status: "signed_up" },
    update: { status: "signed_up" },
  });

  res.status(201).json({ signup: toSignup(signup) });
}

export async function cancelSignup(req: Request, res: Response) {
  const claims = req.user!;
  const opportunityId = req.params.id;

  const existing = await prisma.volunteerSignup.findUnique({
    where: { userId_opportunityId: { userId: claims.sub, opportunityId } },
  });
  if (!existing) {
    throw new ApiError(404, "Signup not found");
  }

  const signup = await prisma.volunteerSignup.update({
    where: { userId_opportunityId: { userId: claims.sub, opportunityId } },
    data: { status: "cancelled" },
  });

  res.json({ signup: toSignup(signup) });
}

export async function listMySignups(req: Request, res: Response) {
  const claims = req.user!;

  const signups = await prisma.volunteerSignup.findMany({
    where: { userId: claims.sub, status: { not: "cancelled" } },
    orderBy: { createdAt: "desc" },
    include: {
      opportunity: {
        include: { organization: true },
      },
    },
  });

  const result: MySignup[] = signups.map((s) => ({
    ...toSignup(s),
    opportunity: {
      id: s.opportunity.id,
      title: s.opportunity.title,
      startDate: s.opportunity.startDate ? s.opportunity.startDate.toISOString() : null,
      endDate: s.opportunity.endDate ? s.opportunity.endDate.toISOString() : null,
      organization: {
        id: s.opportunity.organization.id,
        name: s.opportunity.organization.name,
      },
    },
  }));

  res.json({ signups: result });
}
