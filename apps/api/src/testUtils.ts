// Shared helpers for the integration test suite. Not itself a test file
// (no *.test.ts suffix), so Vitest won't try to run it as one.
import { randomUUID } from "node:crypto";
import type { Response } from "supertest";

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${randomUUID()}@example.com`;
}

export function extractSessionCookie(res: Response): string {
  const setCookie = res.headers["set-cookie"] as unknown as string[] | string | undefined;
  const raw = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  if (!raw) {
    throw new Error("Response did not include a Set-Cookie header");
  }
  return raw.split(";")[0];
}
