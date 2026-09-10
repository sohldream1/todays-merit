import { Router } from "express";
import {
  listOrganizationsForReview,
  reviewOrganizationVerification,
} from "../controllers/platformAdmin.controller.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const platformAdminRouter = Router();

platformAdminRouter.get(
  "/organizations",
  requireAuth,
  requireRole("platform_admin"),
  asyncHandler(listOrganizationsForReview),
);
platformAdminRouter.post(
  "/organizations/:id/review",
  requireAuth,
  requireRole("platform_admin"),
  asyncHandler(reviewOrganizationVerification),
);
