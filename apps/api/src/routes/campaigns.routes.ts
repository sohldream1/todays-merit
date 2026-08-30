import { Router } from "express";
import {
  createCampaign,
  getCampaign,
  updateCampaign,
} from "../controllers/campaigns.controller.js";
import { createDonation } from "../controllers/donations.controller.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const campaignsRouter = Router();

campaignsRouter.get("/:id", asyncHandler(getCampaign));
campaignsRouter.post("/", requireAuth, requireRole("org_admin"), asyncHandler(createCampaign));
campaignsRouter.patch("/:id", requireAuth, requireRole("org_admin"), asyncHandler(updateCampaign));
campaignsRouter.post(
  "/:id/donations",
  requireAuth,
  requireRole("member"),
  asyncHandler(createDonation),
);
