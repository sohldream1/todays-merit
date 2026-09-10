import { Router } from "express";
import { acceptInvite, getInviteByToken } from "../controllers/teamInvites.controller.js";
import { asyncHandler } from "../lib/asyncHandler.js";

// Public — no requireAuth. The recipient doesn't have an account until they
// accept, so there's nothing to authenticate against beforehand.
export const teamInvitesRouter = Router();

teamInvitesRouter.get("/:token", asyncHandler(getInviteByToken));
teamInvitesRouter.post("/:token/accept", asyncHandler(acceptInvite));
