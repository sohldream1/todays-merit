import type { Request, Response } from "express";
import { z } from "zod";
import type { MyVolunteerHour, OrgVolunteerHour, VolunteerHour } from "@todays-merit/shared-types";
import { assertOrgAdmin } from "../lib/authz.js";
import { evaluateOrgBadges, evaluateTiers } from "../lib/gamification.js";
import { giveKudos, removeKudos } from "../lib/kudos.js";
import { syncVolunteerHourById } from "../integrations/syncService.js";
import { ApiError } from "../middleware/errorHandler.js";
import { prisma } from "../lib/prisma.js";

const VERIFICATION_STATUSES = ["self_reported", "verified_by_org"] as const;

const logHoursSchema = z.object({
  opportunityId: z.string().uuid(),
  hours: z.coerce.number().positive().max(999),
  dateOfService: z.coerce.date(),
});

const verifyHoursSchema = z.object({
  verificationStatus: z.enum(VERIFICATION_STATUSES),
});

function toVolunteerHour(hour: {
  id: string;
  userId: string;
  organizationId: string;
  opportunityId: string | null;
  hours: unknown;
  dateOfService: Date;
  verificationStatus: string;
  createdAt: Date;
}): VolunteerHour {
  return {
    id: hour.id,
    userId: hour.userId,
    organizationId: hour.organizationId,
    opportunityId: hour.opportunityId,
    hours: Number(hour.hours),
    dateOfService: hour.dateOfService.toISOString(),
    verificationStatus: hour.verificationStatus as VolunteerHour["verificationStatus"],
    createdAt: hour.createdAt.toISOString(),
  };
}

export async function logHours(req: Request, res: Response) {
  const claims = req.user!;
  const input = logHoursSchema.parse(req.body);

  const signup = await prisma.volunteerSignup.findUnique({
    where: { userId_opportunityId: { userId: claims.sub, opportunityId: input.opportunityId } },
  });
  if (!signup || signup.status === "cancelled") {
    throw new ApiError(403, "You can only log hours against an opportunity you signed up for");
  }

  const opportunity = await prisma.volunteerOpportunity.findUnique({
    where: { id: input.opportunityId },
  });
  if (!opportunity) {
    throw new ApiError(404, "Opportunity not found");
  }

  const hour = await prisma.volunteerHour.create({
    data: {
      userId: claims.sub,
      organizationId: opportunity.organizationId,
      opportunityId: opportunity.id,
      hours: input.hours,
      dateOfService: input.dateOfService,
    },
  });

  res.status(201).json({ hour: toVolunteerHour(hour) });
}

export async function listMyHours(req: Request, res: Response) {
  const claims = req.user!;

  const hours = await prisma.volunteerHour.findMany({
    where: { userId: claims.sub },
    orderBy: { dateOfService: "desc" },
    include: { opportunity: true, organization: true },
  });

  const result: MyVolunteerHour[] = hours.map((h) => ({
    ...toVolunteerHour(h),
    opportunity: h.opportunity ? { id: h.opportunity.id, title: h.opportunity.title } : null,
    organization: { id: h.organization.id, name: h.organization.name },
  }));

  res.json({ hours: result });
}

export async function listOrganizationHours(req: Request, res: Response) {
  const claims = req.user!;
  const organizationId = req.params.orgId;

  await assertOrgAdmin(claims.sub, organizationId);

  const hours = await prisma.volunteerHour.findMany({
    where: { organizationId },
    orderBy: { dateOfService: "desc" },
    include: { opportunity: true, user: true },
  });

  const result: OrgVolunteerHour[] = hours.map((h) => ({
    ...toVolunteerHour(h),
    opportunity: h.opportunity ? { id: h.opportunity.id, title: h.opportunity.title } : null,
    user: { id: h.user.id, firstName: h.user.firstName, lastName: h.user.lastName },
  }));

  res.json({ hours: result });
}

export async function verifyHours(req: Request, res: Response) {
  const claims = req.user!;
  const hourId = req.params.id;

  const existing = await prisma.volunteerHour.findUnique({ where: { id: hourId } });
  if (!existing) {
    throw new ApiError(404, "Hour log not found");
  }

  await assertOrgAdmin(claims.sub, existing.organizationId);

  const input = verifyHoursSchema.parse(req.body);

  const hour = await prisma.volunteerHour.update({
    where: { id: hourId },
    data: { verificationStatus: input.verificationStatus },
  });

  if (input.verificationStatus === "verified_by_org") {
    await evaluateOrgBadges(hour.userId, hour.organizationId);
    await evaluateTiers(hour.userId);
    await syncVolunteerHourById(hour.id).catch((err) =>
      console.error(`CRM sync failed for volunteer hour ${hour.id}:`, err),
    );
  }

  res.json({ hour: toVolunteerHour(hour) });
}

export async function giveHourKudos(req: Request, res: Response) {
  const claims = req.user!;
  const hour = await prisma.volunteerHour.findUnique({ where: { id: req.params.id } });
  if (!hour) {
    throw new ApiError(404, "Hour log not found");
  }
  if (hour.userId === claims.sub) {
    throw new ApiError(400, "You can't give kudos on your own activity");
  }

  res.json(await giveKudos(claims.sub, { volunteerHourId: hour.id }));
}

export async function removeHourKudos(req: Request, res: Response) {
  const claims = req.user!;
  res.json(await removeKudos(claims.sub, { volunteerHourId: req.params.id }));
}
