import jwt from "jsonwebtoken";
import type { AccountRole } from "@todays-merit/shared-types";
import { env } from "./env.js";

export interface SessionClaims {
  sub: string; // user id
  email: string;
  role: AccountRole;
  organizationId: string | null;
}

export function signSession(claims: SessionClaims): string {
  const options: jwt.SignOptions = { expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"] };
  return jwt.sign(claims, env.jwtSecret, options);
}

export function verifySession(token: string): SessionClaims {
  return jwt.verify(token, env.jwtSecret) as SessionClaims;
}
