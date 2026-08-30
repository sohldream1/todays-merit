import { Router } from "express";
import { oauthCallback } from "../controllers/integrations.controller.js";
import { asyncHandler } from "../lib/asyncHandler.js";

export const integrationsRouter = Router();

// Hit directly by the CRM provider's redirect, not the SPA — no auth
// middleware here (see the comment on oauthCallback).
integrationsRouter.get("/:provider/callback", asyncHandler(oauthCallback));
