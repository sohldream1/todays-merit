import type { Request, Response } from "express";
import { z } from "zod";
import type { MyInterests } from "@todays-merit/shared-types";
import { ApiError } from "../middleware/errorHandler.js";
import { prisma } from "../lib/prisma.js";

const CAUSE_AREAS = [
  "community",
  "faith",
  "youth",
  "health",
  "environment",
  "arts_education",
  "other",
] as const;

const updateInterestsSchema = z.object({
  causeAreaInterests: z.array(z.enum(CAUSE_AREAS)).max(CAUSE_AREAS.length),
});

export async function getMyInterests(req: Request, res: Response) {
  const claims = req.user!;

  const user = await prisma.user.findUnique({ where: { id: claims.sub } });
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const result: MyInterests = {
    causeAreaInterests: user.causeAreaInterests as MyInterests["causeAreaInterests"],
  };
  res.json(result);
}

export async function updateMyInterests(req: Request, res: Response) {
  const claims = req.user!;
  const input = updateInterestsSchema.parse(req.body);

  const user = await prisma.user.update({
    where: { id: claims.sub },
    data: { causeAreaInterests: input.causeAreaInterests },
  });

  const result: MyInterests = {
    causeAreaInterests: user.causeAreaInterests as MyInterests["causeAreaInterests"],
  };
  res.json(result);
}
