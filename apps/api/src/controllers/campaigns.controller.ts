import type { Request, Response } from "express";
import { z } from "zod";
import type { Campaign } from "@todays-merit/shared-types";
import { assertOrgAdmin } from "../lib/authz.js";
import { ApiError } from "../middleware/errorHandler.js";
import { prisma } from "../lib/prisma.js";

const CAMPAIGN_STATUSES = ["draft", "active", "completed", "cancelled"] as const;

const listFiltersSchema = z.object({
  status: z.enum(CAMPAIGN_STATUSES).optional(),
});

const createCampaignSchema = z.object({
  organizationId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  goalAmount: z.coerce.number().positive().max(100_000_000),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

const updateCampaignSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  goalAmount: z.coerce.number().positive().max(100_000_000).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  status: z.enum(CAMPAIGN_STATUSES).optional(),
});

function toCampaign(campaign: {
  id: string;
  organizationId: string;
  title: string;
  description: string | null;
  goalAmount: unknown;
  amountRaised: unknown;
  startDate: Date | null;
  endDate: Date | null;
  status: string;
}): Campaign {
  return {
    id: campaign.id,
    organizationId: campaign.organizationId,
    title: campaign.title,
    description: campaign.description,
    goalAmount: Number(campaign.goalAmount),
    amountRaised: Number(campaign.amountRaised),
    startDate: campaign.startDate ? campaign.startDate.toISOString() : null,
    endDate: campaign.endDate ? campaign.endDate.toISOString() : null,
    status: campaign.status as Campaign["status"],
  };
}

export async function listOrganizationCampaigns(req: Request, res: Response) {
  const filters = listFiltersSchema.parse(req.query);

  const campaigns = await prisma.campaign.findMany({
    where: {
      organizationId: req.params.orgId,
      ...(filters.status ? { status: filters.status } : {}),
    },
  });

  res.json({ campaigns: campaigns.map(toCampaign) });
}

export async function getCampaign(req: Request, res: Response) {
  const campaign = await prisma.campaign.findUnique({ where: { id: req.params.id } });

  if (!campaign) {
    throw new ApiError(404, "Campaign not found");
  }

  res.json({ campaign: toCampaign(campaign) });
}

export async function createCampaign(req: Request, res: Response) {
  const claims = req.user!;
  const input = createCampaignSchema.parse(req.body);

  await assertOrgAdmin(claims.sub, input.organizationId);

  const campaign = await prisma.campaign.create({ data: input });

  res.status(201).json({ campaign: toCampaign(campaign) });
}

export async function updateCampaign(req: Request, res: Response) {
  const claims = req.user!;
  const campaignId = req.params.id;

  const existing = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!existing) {
    throw new ApiError(404, "Campaign not found");
  }

  await assertOrgAdmin(claims.sub, existing.organizationId);

  const input = updateCampaignSchema.parse(req.body);

  const campaign = await prisma.campaign.update({
    where: { id: campaignId },
    data: input,
  });

  res.json({ campaign: toCampaign(campaign) });
}
