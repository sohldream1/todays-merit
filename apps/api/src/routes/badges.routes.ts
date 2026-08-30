import { Router } from "express";
import { awardBadge, createBadge, updateBadge } from "../controllers/badges.controller.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const badgesRouter = Router();

badgesRouter.post("/", requireAuth, requireRole("org_admin"), asyncHandler(createBadge));
badgesRouter.patch("/:id", requireAuth, requireRole("org_admin"), asyncHandler(updateBadge));
badgesRouter.post(
  "/:id/award",
  requireAuth,
  requireRole("org_admin", "race_director"),
  asyncHandler(awardBadge),
);
