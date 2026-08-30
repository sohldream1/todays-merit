import { Router } from "express";
import { listMySignups } from "../controllers/opportunities.controller.js";
import { listMyHours } from "../controllers/volunteerHours.controller.js";
import { listMyDonations } from "../controllers/donations.controller.js";
import { listMyBadges } from "../controllers/badges.controller.js";
import { getMyTierStatus } from "../controllers/tiers.controller.js";
import { getMyInterests, updateMyInterests } from "../controllers/interests.controller.js";
import { getMyRecommendations } from "../controllers/recommendations.controller.js";
import { getMyAddress, updateMyAddress } from "../controllers/address.controller.js";
import { listMySwag } from "../controllers/swag.controller.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const meRouter = Router();

meRouter.get("/signups", requireAuth, requireRole("member"), asyncHandler(listMySignups));
meRouter.get("/hours", requireAuth, requireRole("member"), asyncHandler(listMyHours));
meRouter.get("/donations", requireAuth, requireRole("member"), asyncHandler(listMyDonations));
meRouter.get("/badges", requireAuth, requireRole("member"), asyncHandler(listMyBadges));
meRouter.get("/tier", requireAuth, requireRole("member"), asyncHandler(getMyTierStatus));
meRouter.get("/interests", requireAuth, requireRole("member"), asyncHandler(getMyInterests));
meRouter.patch("/interests", requireAuth, requireRole("member"), asyncHandler(updateMyInterests));
meRouter.get("/recommendations", requireAuth, requireRole("member"), asyncHandler(getMyRecommendations));
meRouter.get("/address", requireAuth, requireRole("member"), asyncHandler(getMyAddress));
meRouter.patch("/address", requireAuth, requireRole("member"), asyncHandler(updateMyAddress));
meRouter.get("/swag", requireAuth, requireRole("member"), asyncHandler(listMySwag));
