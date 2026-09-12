import { Router } from "express";
import { giveDonationKudos, removeDonationKudos } from "../controllers/donations.controller.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";

// Donation creation lives under /campaigns/:id/donations (campaigns.routes.ts)
// and listing under /organizations/:orgId/donations and /me/donations — this
// router only exists for the top-level /donations/:id/kudos actions.
export const donationsRouter = Router();

donationsRouter.post("/:id/kudos", requireAuth, asyncHandler(giveDonationKudos));
donationsRouter.delete("/:id/kudos", requireAuth, asyncHandler(removeDonationKudos));
