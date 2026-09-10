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
import { loginRateLimiter, signupRateLimiter } from "../middleware/rateLimit.js";

export const authRouter = Router();

authRouter.post("/signup/member", signupRateLimiter, asyncHandler(signupMember));
authRouter.post("/signup/nonprofit", signupRateLimiter, asyncHandler(signupNonprofit));
authRouter.post("/signup/race-director", signupRateLimiter, asyncHandler(signupRaceDirector));
authRouter.post("/login", loginRateLimiter, asyncHandler(login));
authRouter.post("/logout", asyncHandler(logout));
authRouter.get("/me", requireAuth, asyncHandler(me));
