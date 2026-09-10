import { Router } from "express";
import { acceptInvite, getInviteByToken } from "../controllers/teamInvites.controller.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { signupRateLimiter } from "../middleware/rateLimit.js";

// Public — no requireAuth. The recipient doesn't have an account until they
// accept, so there's nothing to authenticate against beforehand.
export const teamInvitesRouter = Router();

teamInvitesRouter.get("/:token", asyncHandler(getInviteByToken));
// Creates an account, same as the other signup routes, so it shares their
// rate limiter rather than its own separate bucket.
teamInvitesRouter.post("/:token/accept", signupRateLimiter, asyncHandler(acceptInvite));
