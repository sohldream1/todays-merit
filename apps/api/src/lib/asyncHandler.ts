import type { NextFunction, Request, Response } from "express";

// Express 4 doesn't await handlers automatically, so wrap async controllers
// to forward rejected promises (e.g. Zod/Prisma errors) to errorHandler.
export function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}
