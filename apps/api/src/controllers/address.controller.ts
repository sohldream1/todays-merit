import type { Request, Response } from "express";
import { z } from "zod";
import type { MyAddress } from "@todays-merit/shared-types";
import { ApiError } from "../middleware/errorHandler.js";
import { prisma } from "../lib/prisma.js";

const updateAddressSchema = z.object({
  shippingName: z.string().min(1).max(200).optional(),
  shippingAddressLine1: z.string().min(1).max(200).optional(),
  shippingAddressLine2: z.string().max(200).optional(),
  shippingCity: z.string().min(1).max(100).optional(),
  shippingState: z.string().max(100).optional(),
  shippingPostalCode: z.string().min(1).max(20).optional(),
  shippingCountry: z.string().min(1).max(100).optional(),
});

function toMyAddress(user: {
  shippingName: string | null;
  shippingAddressLine1: string | null;
  shippingAddressLine2: string | null;
  shippingCity: string | null;
  shippingState: string | null;
  shippingPostalCode: string | null;
  shippingCountry: string | null;
}): MyAddress {
  return {
    shippingName: user.shippingName,
    shippingAddressLine1: user.shippingAddressLine1,
    shippingAddressLine2: user.shippingAddressLine2,
    shippingCity: user.shippingCity,
    shippingState: user.shippingState,
    shippingPostalCode: user.shippingPostalCode,
    shippingCountry: user.shippingCountry,
    isComplete: Boolean(
      user.shippingName && user.shippingAddressLine1 && user.shippingCity && user.shippingPostalCode && user.shippingCountry,
    ),
  };
}

export async function getMyAddress(req: Request, res: Response) {
  const claims = req.user!;

  const user = await prisma.user.findUnique({ where: { id: claims.sub } });
  if (!user) throw new ApiError(404, "User not found");

  res.json(toMyAddress(user));
}

export async function updateMyAddress(req: Request, res: Response) {
  const claims = req.user!;
  const input = updateAddressSchema.parse(req.body);

  const user = await prisma.user.update({ where: { id: claims.sub }, data: input });

  res.json(toMyAddress(user));
}
