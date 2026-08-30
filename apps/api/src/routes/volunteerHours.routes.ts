import { Router } from "express";
import { logHours, verifyHours } from "../controllers/volunteerHours.controller.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const volunteerHoursRouter = Router();

volunteerHoursRouter.post("/", requireAuth, requireRole("member"), asyncHandler(logHours));
volunteerHoursRouter.patch("/:id", requireAuth, requireRole("org_admin"), asyncHandler(verifyHours));
