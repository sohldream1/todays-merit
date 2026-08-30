import type { SessionClaims } from "../lib/jwt.js";

declare global {
  namespace Express {
    interface Request {
      user?: SessionClaims;
    }
  }
}

export {};
