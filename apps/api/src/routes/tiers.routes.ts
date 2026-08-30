import { Router } from "express";
import { listPlatformTiers } from "../controllers/tiers.controller.js";
import { asyncHandler } from "../lib/asyncHandler.js";

export const tiersRouter = Router();

tiersRouter.get("/", asyncHandler(listPlatformTiers));
