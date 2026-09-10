import { Router } from "express";
import {
  getOrganization,
  listOrganizations,
  submitForVerification,
  updateOrganization,
} from "../controllers/organizations.controller.js";
import {
  listOrganizationOpportunities,
  listOrganizationSignups,
} from "../controllers/opportunities.controller.js";
import { listOrganizationHours } from "../controllers/volunteerHours.controller.js";
import { listOrganizationCampaigns } from "../controllers/campaigns.controller.js";
import { listOrganizationDonations } from "../controllers/donations.controller.js";
import { listBadgeRecipients, listOrganizationBadges } from "../controllers/badges.controller.js";
import {
  connectIntegration,
  disconnectIntegration,
  listIntegrationSyncLogs,
  listOrganizationIntegrations,
  syncIntegrationNow,
} from "../controllers/integrations.controller.js";
import {
  connectSwagIntegration,
  createSwagAutoRule,
  createSwagOrder,
  disconnectSwagIntegration,
  getSwagIntegration,
  importSwagCatalog,
  listSwagAutoRules,
  listSwagOrders,
  listSwagProducts,
  listSwagRecipients,
} from "../controllers/swag.controller.js";
import {
  getTeamOverview,
  inviteTeammate,
  removeTeammate,
  revokeInvite,
} from "../controllers/team.controller.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const organizationsRouter = Router();

organizationsRouter.get("/", asyncHandler(listOrganizations));
organizationsRouter.get("/:id", asyncHandler(getOrganization));
organizationsRouter.patch(
  "/:id",
  requireAuth,
  requireRole("org_admin"),
  asyncHandler(updateOrganization),
);
organizationsRouter.post(
  "/:id/verification/submit",
  requireAuth,
  requireRole("org_admin"),
  asyncHandler(submitForVerification),
);
organizationsRouter.get("/:orgId/opportunities", asyncHandler(listOrganizationOpportunities));
organizationsRouter.get(
  "/:orgId/signups",
  requireAuth,
  requireRole("org_admin", "race_director"),
  asyncHandler(listOrganizationSignups),
);
organizationsRouter.get(
  "/:orgId/volunteer-hours",
  requireAuth,
  requireRole("org_admin"),
  asyncHandler(listOrganizationHours),
);
organizationsRouter.get("/:orgId/campaigns", asyncHandler(listOrganizationCampaigns));
organizationsRouter.get(
  "/:orgId/donations",
  requireAuth,
  requireRole("org_admin"),
  asyncHandler(listOrganizationDonations),
);
organizationsRouter.get("/:orgId/badges", asyncHandler(listOrganizationBadges));
organizationsRouter.get(
  "/:orgId/badges/recipients",
  requireAuth,
  requireRole("org_admin", "race_director"),
  asyncHandler(listBadgeRecipients),
);

organizationsRouter.get(
  "/:orgId/integrations",
  requireAuth,
  requireRole("org_admin"),
  asyncHandler(listOrganizationIntegrations),
);
organizationsRouter.post(
  "/:orgId/integrations/:provider/connect",
  requireAuth,
  requireRole("org_admin"),
  asyncHandler(connectIntegration),
);
organizationsRouter.delete(
  "/:orgId/integrations/:provider",
  requireAuth,
  requireRole("org_admin"),
  asyncHandler(disconnectIntegration),
);
organizationsRouter.post(
  "/:orgId/integrations/:provider/sync",
  requireAuth,
  requireRole("org_admin"),
  asyncHandler(syncIntegrationNow),
);
organizationsRouter.get(
  "/:orgId/integrations/:provider/sync-logs",
  requireAuth,
  requireRole("org_admin"),
  asyncHandler(listIntegrationSyncLogs),
);

organizationsRouter.get(
  "/:orgId/swag/products",
  requireAuth,
  requireRole("org_admin"),
  asyncHandler(listSwagProducts),
);
organizationsRouter.get(
  "/:orgId/swag/recipients",
  requireAuth,
  requireRole("org_admin"),
  asyncHandler(listSwagRecipients),
);
organizationsRouter.get(
  "/:orgId/swag/orders",
  requireAuth,
  requireRole("org_admin"),
  asyncHandler(listSwagOrders),
);
organizationsRouter.post(
  "/:orgId/swag/orders",
  requireAuth,
  requireRole("org_admin"),
  asyncHandler(createSwagOrder),
);
organizationsRouter.get(
  "/:orgId/swag/auto-rules",
  requireAuth,
  requireRole("org_admin"),
  asyncHandler(listSwagAutoRules),
);
organizationsRouter.post(
  "/:orgId/swag/auto-rules",
  requireAuth,
  requireRole("org_admin"),
  asyncHandler(createSwagAutoRule),
);
organizationsRouter.get(
  "/:orgId/swag/integration",
  requireAuth,
  requireRole("org_admin"),
  asyncHandler(getSwagIntegration),
);
organizationsRouter.post(
  "/:orgId/swag/integration/connect",
  requireAuth,
  requireRole("org_admin"),
  asyncHandler(connectSwagIntegration),
);
organizationsRouter.delete(
  "/:orgId/swag/integration",
  requireAuth,
  requireRole("org_admin"),
  asyncHandler(disconnectSwagIntegration),
);
organizationsRouter.post(
  "/:orgId/swag/integration/import",
  requireAuth,
  requireRole("org_admin"),
  asyncHandler(importSwagCatalog),
);

organizationsRouter.get(
  "/:orgId/team",
  requireAuth,
  requireRole("org_admin"),
  asyncHandler(getTeamOverview),
);
organizationsRouter.post(
  "/:orgId/team/invites",
  requireAuth,
  requireRole("org_admin"),
  asyncHandler(inviteTeammate),
);
organizationsRouter.delete(
  "/:orgId/team/invites/:inviteId",
  requireAuth,
  requireRole("org_admin"),
  asyncHandler(revokeInvite),
);
organizationsRouter.delete(
  "/:orgId/team/members/:orgAdminId",
  requireAuth,
  requireRole("org_admin"),
  asyncHandler(removeTeammate),
);
