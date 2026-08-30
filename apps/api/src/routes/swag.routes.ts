import { Router } from "express";
import {
  createSwagProduct,
  updateSwagAutoRule,
  updateSwagProduct,
} from "../controllers/swag.controller.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const swagRouter = Router();

swagRouter.post("/products", requireAuth, requireRole("org_admin"), asyncHandler(createSwagProduct));
swagRouter.patch("/products/:id", requireAuth, requireRole("org_admin"), asyncHandler(updateSwagProduct));
swagRouter.patch("/auto-rules/:id", requireAuth, requireRole("org_admin"), asyncHandler(updateSwagAutoRule));
