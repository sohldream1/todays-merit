import { Router } from "express";
import {
  login,
  logout,
  me,
  signupMember,
  signupNonprofit,
  signupRaceDirector,
} from "../controllers/auth.controller.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";

export const authRouter = Router();

authRouter.post("/signup/member", asyncHandler(signupMember));
authRouter.post("/signup/nonprofit", asyncHandler(signupNonprofit));
authRouter.post("/signup/race-director", asyncHandler(signupRaceDirector));
authRouter.post("/login", asyncHandler(login));
authRouter.post("/logout", asyncHandler(logout));
authRouter.get("/me", requireAuth, asyncHandler(me));
