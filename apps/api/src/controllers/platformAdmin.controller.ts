import type { Request, Response } from "express";
import { z } from "zod";
import type { ReviewVerificationInput } from "@todays-merit/shared-types";
import { ApiError } from "../middleware/errorHandler.js";
import { prisma } from "../lib/prisma.js";
import { notifyOrgAdmins } from "../lib/notifications.js";
import { verificationApprovedEmail, verificationRejectedEmail } from "../emails/verificationEmails.js";
import { toOrganization } from "./organizations.controller.js";

const VERIFICATION_STATUSES = ["unverified", "pending", "verified", "rejected"] as const;

const listFiltersSchema = z.object({
  status: z.enum(VERIFICATION_STATUSES).optional(),
});

const reviewSchema = z.object({
  decision: z.enum(["verified", "rejected"]),
  notes: z.string().max(2000).optional(),
});

// The review queue — every non-archived org, optionally filtered to one
// verification status. No pagination yet (fine at this scale; see the
// same caveat on listOrganizations).
export async function listOrganizationsForReview(req: Request, res: Response) {
  const filters = listFiltersSchema.parse(req.query);

  const organizations = await prisma.organization.findMany({
    where: {
      isArchived: false,
      ...(filters.status ? { verificationStatus: filters.status } : {}),
    },
    orderBy: { updatedAt: "desc" },
  });

  res.json({ organizations: organizations.map((org) => toOrganization(org)) });
}

// The only path that can move an org to "verified" or "rejected" — org
// admins can request review (submitForVerification) but never decide it
// themselves. Only acts on submissions actually awaiting review, so a
// stale queue tab can't double-decide something another reviewer (or a
// resubmission) already moved on from.
export async function reviewOrganizationVerification(req: Request, res: Response) {
  const organizationId = req.params.id;
  const input: ReviewVerificationInput = reviewSchema.parse(req.body);

  if (input.decision === "rejected" && !input.notes?.trim()) {
    throw new ApiError(400, "Notes are required when rejecting a submission");
  }

  const existing = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!existing) {
    throw new ApiError(404, "Organization not found");
  }
  if (existing.verificationStatus !== "pending") {
    throw new ApiError(400, "This organization isn't awaiting review");
  }

  const organization = await prisma.organization.update({
    where: { id: organizationId },
    data: { verificationStatus: input.decision, verificationNotes: input.notes?.trim() || null },
  });

  const message =
    input.decision === "verified"
      ? verificationApprovedEmail(organization.name, organization.id)
      : verificationRejectedEmail(organization.name, organization.verificationNotes ?? "");
  await notifyOrgAdmins(organization.id, message);

  res.json({ organization: toOrganization(organization) });
}
