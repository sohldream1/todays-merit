import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import { z } from "zod";
import type { Donation, MyDonation, OrgDonation } from "@todays-merit/shared-types";
import { assertOrgAdmin } from "../lib/authz.js";
import { evaluateOrgBadges } from "../lib/gamification.js";
import { syncDonationById } from "../integrations/syncService.js";
import { ApiError } from "../middleware/errorHandler.js";
import { prisma } from "../lib/prisma.js";

const createDonationSchema = z.object({
  amount: z.coerce.number().positive().max(1_000_000),
});

function toDonation(donation: {
  id: string;
  userId: string;
  organizationId: string;
  campaignId: string | null;
  amount: unknown;
  donatedAt: Date;
  paymentStatus: string;
  stripePaymentId: string | null;
}): Donation {
  return {
    id: donation.id,
    userId: donation.userId,
    organizationId: donation.organizationId,
    campaignId: donation.campaignId,
    amount: Number(donation.amount),
    donatedAt: donation.donatedAt.toISOString(),
    paymentStatus: donation.paymentStatus as Donation["paymentStatus"],
    stripePaymentId: donation.stripePaymentId,
  };
}

// Stripe isn't wired up yet (per spec: stub/mock in early scaffolding). Every
// donation is recorded as immediately completed with a fake payment id so the
// rest of the app (running totals, donation history) has real data to work
// against once real Stripe checkout replaces this function.
export async function createDonation(req: Request, res: Response) {
  const claims = req.user!;
  const campaignId = req.params.id;
  const input = createDonationSchema.parse(req.body);

  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign || campaign.status !== "active") {
    throw new ApiError(404, "Campaign not found or not accepting donations");
  }

  const [donation] = await prisma.$transaction([
    prisma.donation.create({
      data: {
        userId: claims.sub,
        organizationId: campaign.organizationId,
        campaignId: campaign.id,
        amount: input.amount,
        paymentStatus: "completed",
        stripePaymentId: `mock_${randomUUID()}`,
      },
    }),
    prisma.campaign.update({
      where: { id: campaign.id },
      data: { amountRaised: { increment: input.amount } },
    }),
  ]);

  await evaluateOrgBadges(claims.sub, campaign.organizationId);

  // CRM sync is best-effort: a connector hiccup shouldn't fail the donation
  // itself. Failures land in the sync record for the admin to see/retry.
  await syncDonationById(donation.id).catch((err) =>
    console.error(`CRM sync failed for donation ${donation.id}:`, err),
  );

  res.status(201).json({ donation: toDonation(donation) });
}

export async function listMyDonations(req: Request, res: Response) {
  const claims = req.user!;

  const donations = await prisma.donation.findMany({
    where: { userId: claims.sub },
    orderBy: { donatedAt: "desc" },
    include: { campaign: true, organization: true },
  });

  const result: MyDonation[] = donations.map((d) => ({
    ...toDonation(d),
    campaign: d.campaign ? { id: d.campaign.id, title: d.campaign.title } : null,
    organization: { id: d.organization.id, name: d.organization.name },
  }));

  res.json({ donations: result });
}

export async function listOrganizationDonations(req: Request, res: Response) {
  const claims = req.user!;
  const organizationId = req.params.orgId;

  await assertOrgAdmin(claims.sub, organizationId);

  const donations = await prisma.donation.findMany({
    where: { organizationId },
    orderBy: { donatedAt: "desc" },
    include: { campaign: true, user: true },
  });

  const result: OrgDonation[] = donations.map((d) => ({
    ...toDonation(d),
    campaign: d.campaign ? { id: d.campaign.id, title: d.campaign.title } : null,
    user: { id: d.user.id, firstName: d.user.firstName, lastName: d.user.lastName },
  }));

  res.json({ donations: result });
}
