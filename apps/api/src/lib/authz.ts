import { ApiError } from "../middleware/errorHandler.js";
import { prisma } from "./prisma.js";

// Checks org membership only — not which OrgAdmin.role the row has, so this
// passes for both full org_admin accounts and scoped-down race_director
// accounts alike. Callers that need to further restrict what a
// race_director can do (they can't touch campaigns, other badges, swag,
// integrations, or the org profile) do that themselves by checking
// req.user!.role, same as the route-level requireRole(...) gate already
// does for entire endpoints.
export async function assertOrgAdmin(userId: string, organizationId: string): Promise<void> {
  const orgAdmin = await prisma.orgAdmin.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
  });

  if (!orgAdmin) {
    throw new ApiError(403, "You don't have access to this organization");
  }
}

// Stricter than assertOrgAdmin — only the org's owner(s) can manage its
// team (invite/remove teammates). Everyone with an "admin" row has the same
// access to everything else; this is the one thing that's owner-only.
export async function assertOrgOwner(userId: string, organizationId: string): Promise<void> {
  const orgAdmin = await prisma.orgAdmin.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
  });

  if (!orgAdmin || orgAdmin.role !== "owner") {
    throw new ApiError(403, "Only an organization owner can manage the team");
  }
}
