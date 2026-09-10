import type { Request, Response } from "express";
import { z } from "zod";
import type { AccountRole, AuthUser } from "@todays-merit/shared-types";
import { env } from "../lib/env.js";
import { signSession } from "../lib/jwt.js";
import { ApiError } from "../middleware/errorHandler.js";
import { comparePassword, hashPassword } from "../lib/password.js";
import { prisma } from "../lib/prisma.js";

const signupMemberSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

const signupNonprofitSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  organization: z.object({
    name: z.string().min(1),
    ein: z.string().min(1),
    missionStatement: z.string().optional(),
    websiteUrl: z.string().url().optional(),
    causeArea: z.enum([
      "community",
      "faith",
      "youth",
      "health",
      "environment",
      "arts_education",
      "other",
    ]),
    city: z.string().min(1),
    state: z.string().min(1),
    country: z.string().min(1),
  }),
});

const signupRaceDirectorSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  organizationId: z.string().uuid(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days, matches default JWT_EXPIRES_IN

export function setSessionCookie(res: Response, token: string) {
  res.cookie(env.cookieName, token, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE_MS,
    path: "/",
  });
}

async function resolveRoleAndOrg(
  userId: string,
  email: string,
): Promise<{ role: AccountRole; organizationId: string | null }> {
  // Checked first and takes precedence over any org membership — platform
  // staff reviewing verification submissions isn't org-scoped.
  if (env.platformAdminEmails.includes(email.toLowerCase())) {
    return { role: "platform_admin", organizationId: null };
  }

  const orgAdmin = await prisma.orgAdmin.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

  if (!orgAdmin) {
    return { role: "member", organizationId: null };
  }

  if (orgAdmin.role === "race_director") {
    return { role: "race_director", organizationId: orgAdmin.organizationId };
  }

  return { role: "org_admin", organizationId: orgAdmin.organizationId };
}

export function toAuthUser(
  user: { id: string; email: string; firstName: string; lastName: string; profilePhotoUrl: string | null },
  role: AccountRole,
  organizationId: string | null,
): AuthUser {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    profilePhotoUrl: user.profilePhotoUrl,
    role,
    organizationId,
  };
}

export async function signupMember(req: Request, res: Response) {
  const input = signupMemberSchema.parse(req.body);

  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new ApiError(409, "An account with this email already exists");
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
    },
  });

  const token = signSession({ sub: user.id, email: user.email, role: "member", organizationId: null });
  setSessionCookie(res, token);

  res.status(201).json({ user: toAuthUser(user, "member", null) });
}

export async function signupNonprofit(req: Request, res: Response) {
  const input = signupNonprofitSchema.parse(req.body);

  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new ApiError(409, "An account with this email already exists");
  }

  const passwordHash = await hashPassword(input.password);

  const { user, organization } = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: input.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
      },
    });

    const organization = await tx.organization.create({
      data: {
        name: input.organization.name,
        ein: input.organization.ein,
        missionStatement: input.organization.missionStatement,
        websiteUrl: input.organization.websiteUrl,
        causeArea: input.organization.causeArea,
        city: input.organization.city,
        state: input.organization.state,
        country: input.organization.country,
      },
    });

    await tx.orgAdmin.create({
      data: {
        userId: user.id,
        organizationId: organization.id,
        role: "owner",
      },
    });

    return { user, organization };
  });

  const token = signSession({
    sub: user.id,
    email: user.email,
    role: "org_admin",
    organizationId: organization.id,
  });
  setSessionCookie(res, token);

  res.status(201).json({ user: toAuthUser(user, "org_admin", organization.id) });
}

// Attaches to an existing organization rather than creating one — a
// director represents an org already on the platform, e.g. the person who
// runs its annual 5K, not someone founding a new nonprofit.
export async function signupRaceDirector(req: Request, res: Response) {
  const input = signupRaceDirectorSchema.parse(req.body);

  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new ApiError(409, "An account with this email already exists");
  }

  const organization = await prisma.organization.findFirst({
    where: { id: input.organizationId, isArchived: false },
  });
  if (!organization) {
    throw new ApiError(404, "Organization not found");
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: input.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
      },
    });

    await tx.orgAdmin.create({
      data: {
        userId: user.id,
        organizationId: organization.id,
        role: "race_director",
      },
    });

    return user;
  });

  const token = signSession({
    sub: user.id,
    email: user.email,
    role: "race_director",
    organizationId: organization.id,
  });
  setSessionCookie(res, token);

  res.status(201).json({ user: toAuthUser(user, "race_director", organization.id) });
}

export async function login(req: Request, res: Response) {
  const input = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    throw new ApiError(401, "Invalid email or password");
  }

  const valid = await comparePassword(input.password, user.passwordHash);
  if (!valid) {
    throw new ApiError(401, "Invalid email or password");
  }

  const { role, organizationId } = await resolveRoleAndOrg(user.id, user.email);

  const token = signSession({ sub: user.id, email: user.email, role, organizationId });
  setSessionCookie(res, token);

  res.json({ user: toAuthUser(user, role, organizationId) });
}

export async function logout(_req: Request, res: Response) {
  res.clearCookie(env.cookieName, { path: "/" });
  res.status(204).send();
}

export async function me(req: Request, res: Response) {
  // requireAuth middleware guarantees req.user is set here.
  const claims = req.user!;

  const user = await prisma.user.findUnique({ where: { id: claims.sub } });
  if (!user) {
    throw new ApiError(401, "User no longer exists");
  }

  res.json({ user: toAuthUser(user, claims.role, claims.organizationId) });
}
