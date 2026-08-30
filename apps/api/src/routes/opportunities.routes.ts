import { Router } from "express";
import {
  cancelSignup,
  createOpportunity,
  getOpportunity,
  listOpportunitySignups,
  searchOpportunities,
  signUpForOpportunity,
  updateOpportunity,
} from "../controllers/opportunities.controller.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const opportunitiesRouter = Router();

opportunitiesRouter.get("/", asyncHandler(searchOpportunities));
opportunitiesRouter.get("/:id", asyncHandler(getOpportunity));
opportunitiesRouter.post(
  "/",
  requireAuth,
  requireRole("org_admin", "race_director"),
  asyncHandler(createOpportunity),
);
opportunitiesRouter.patch(
  "/:id",
  requireAuth,
  requireRole("org_admin", "race_director"),
  asyncHandler(updateOpportunity),
);
opportunitiesRouter.get(
  "/:id/signups",
  requireAuth,
  requireRole("org_admin", "race_director"),
  asyncHandler(listOpportunitySignups),
);

opportunitiesRouter.post(
  "/:id/signup",
  requireAuth,
  requireRole("member"),
  asyncHandler(signUpForOpportunity),
);
opportunitiesRouter.delete(
  "/:id/signup",
  requireAuth,
  requireRole("member"),
  asyncHandler(cancelSignup),
);
