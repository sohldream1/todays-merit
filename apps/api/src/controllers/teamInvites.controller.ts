import type { Request, Response } from "express";
import { z } from "zod";
import type { OrgInviteDetails } from "@todays-merit/shared-types";
import { setSessionCookie, toAuthUser } from "./auth.controller.js";
import { signSession } from "../lib/jwt.js";
import { hashPassword } from "../lib/password.js";
import { ApiError } from "../middleware/errorHandler.js";
import { prisma } from "../lib/prisma.js";

const acceptSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  password: z.string().min(8),
});

async function findLiveInvite(token: string) {
  const invite = await prisma.orgInvite.findUnique({
    where: { token },
    include: { organization: { select: { name: true } } },
  });

  if (!invite) {
    throw new ApiError(404, "Invite not found");
  }
  if (invite.acceptedAt) {
    throw new ApiError(410, "This invite has already been used");
  }
  if (invite.expiresAt < new Date()) {
    throw new ApiError(410, "This invite has expired — ask the organization to send a new one");
  }

  return invite;
}

// Public — the recipient doesn't have an account yet, so there's nothing to
// authenticate against until they accept.
export async function getInviteByToken(req: Request, res: Response) {
  const invite = await findLiveInvite(req.params.token);

  const details: OrgInviteDetails = { organizationName: invite.organization.name, email: invite.email };
  res.json(details);
}

export async function acceptInvite(req: Request, res: Response) {
  const input = acceptSchema.parse(req.body);
  const invite = await findLiveInvite(req.params.token);

  const existingUser = await prisma.user.findUnique({ where: { email: invite.email } });
  if (existingUser) {
    throw new ApiError(
      409,
      "An account with this email already exists — log in with it, then ask an owner to add that account instead",
    );
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: invite.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
      },
    });

    // Always "admin" — see the OrgInvite model comment for why there's no
    // role picker on invites today.
    await tx.orgAdmin.create({
      data: { userId: user.id, organizationId: invite.organizationId, role: "admin" },
    });

    await tx.orgInvite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } });

    return user;
  });

  const token = signSession({
    sub: user.id,
    email: user.email,
    role: "org_admin",
    organizationId: invite.organizationId,
  });
  setSessionCookie(res, token);

  res.status(201).json({ user: toAuthUser(user, "org_admin", invite.organizationId) });
}
