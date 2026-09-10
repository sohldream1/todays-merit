import { randomBytes } from "node:crypto";
import type { Request, Response } from "express";
import { z } from "zod";
import type { TeamInvite, TeamMember, TeamOverview } from "@todays-merit/shared-types";
import { assertOrgAdmin, assertOrgOwner } from "../lib/authz.js";
import { teamInviteEmail } from "../emails/teamEmails.js";
import { notifyEmail } from "../lib/notifications.js";
import { ApiError } from "../middleware/errorHandler.js";
import { prisma } from "../lib/prisma.js";

const inviteSchema = z.object({
  email: z.string().email(),
});

const INVITE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days, matches the session cookie lifetime

function toTeamMember(orgAdmin: {
  id: string;
  role: string;
  createdAt: Date;
  user: { id: string; firstName: string; lastName: string; email: string };
}): TeamMember {
  return {
    id: orgAdmin.id,
    role: orgAdmin.role as TeamMember["role"],
    joinedAt: orgAdmin.createdAt.toISOString(),
    user: orgAdmin.user,
  };
}

function toTeamInvite(invite: { id: string; email: string; createdAt: Date; expiresAt: Date }): TeamInvite {
  return {
    id: invite.id,
    email: invite.email,
    createdAt: invite.createdAt.toISOString(),
    expiresAt: invite.expiresAt.toISOString(),
  };
}

export async function getTeamOverview(req: Request, res: Response) {
  const claims = req.user!;
  const organizationId = req.params.orgId;

  await assertOrgAdmin(claims.sub, organizationId);

  const [orgAdmins, invites] = await Promise.all([
    prisma.orgAdmin.findMany({
      where: { organizationId, role: { not: "race_director" } },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
    }),
    prisma.orgInvite.findMany({
      where: { organizationId, acceptedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const self = orgAdmins.find((a) => a.userId === claims.sub);

  const result: TeamOverview = {
    members: orgAdmins.map(toTeamMember),
    invites: invites.map(toTeamInvite),
    // self is always found here — assertOrgAdmin above already confirmed
    // this user has an OrgAdmin row for this org, and the role filter above
    // only excludes race_director, which requireRole("org_admin") at the
    // route level already rules out for the caller.
    currentUserRole: (self?.role ?? "admin") as TeamOverview["currentUserRole"],
  };

  res.json(result);
}

export async function inviteTeammate(req: Request, res: Response) {
  const claims = req.user!;
  const organizationId = req.params.orgId;
  const input = inviteSchema.parse(req.body);

  await assertOrgOwner(claims.sub, organizationId);

  const existingUser = await prisma.user.findUnique({ where: { email: input.email } });
  if (existingUser) {
    throw new ApiError(409, "An account with this email already exists");
  }

  const existingInvite = await prisma.orgInvite.findFirst({
    where: { organizationId, email: input.email, acceptedAt: null, expiresAt: { gt: new Date() } },
  });
  if (existingInvite) {
    throw new ApiError(409, "This email already has a pending invite");
  }

  const [organization, inviter] = await Promise.all([
    prisma.organization.findUniqueOrThrow({ where: { id: organizationId } }),
    prisma.user.findUniqueOrThrow({ where: { id: claims.sub } }),
  ]);

  const invite = await prisma.orgInvite.create({
    data: {
      organizationId,
      email: input.email,
      token: randomBytes(32).toString("hex"),
      invitedByUserId: claims.sub,
      expiresAt: new Date(Date.now() + INVITE_EXPIRY_MS),
    },
  });

  await notifyEmail(
    input.email,
    teamInviteEmail(organization.name, `${inviter.firstName} ${inviter.lastName}`, invite.token),
  );

  res.status(201).json({ invite: toTeamInvite(invite) });
}

export async function revokeInvite(req: Request, res: Response) {
  const claims = req.user!;
  const organizationId = req.params.orgId;

  await assertOrgOwner(claims.sub, organizationId);

  const invite = await prisma.orgInvite.findFirst({ where: { id: req.params.inviteId, organizationId } });
  if (!invite) {
    throw new ApiError(404, "Invite not found");
  }

  await prisma.orgInvite.delete({ where: { id: invite.id } });

  res.status(204).send();
}

export async function removeTeammate(req: Request, res: Response) {
  const claims = req.user!;
  const organizationId = req.params.orgId;

  await assertOrgOwner(claims.sub, organizationId);

  const member = await prisma.orgAdmin.findFirst({ where: { id: req.params.orgAdminId, organizationId } });
  if (!member) {
    throw new ApiError(404, "Team member not found");
  }
  if (member.role === "owner") {
    throw new ApiError(400, "The organization's owner can't be removed from the team");
  }

  await prisma.orgAdmin.delete({ where: { id: member.id } });

  res.status(204).send();
}
