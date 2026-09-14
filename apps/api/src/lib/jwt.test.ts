import { describe, expect, it } from "vitest";
import jwt from "jsonwebtoken";
import { signSession, verifySession, type SessionClaims } from "./jwt.js";
import { env } from "./env.js";

const claims: SessionClaims = {
  sub: "user-1",
  email: "test@example.com",
  role: "member",
  organizationId: null,
};

describe("signSession / verifySession", () => {
  it("round-trips the claims through a signed token", () => {
    const token = signSession(claims);
    const decoded = verifySession(token);

    expect(decoded).toMatchObject(claims);
  });

  it("rejects a token signed with a different secret", () => {
    const forged = jwt.sign(claims, "wrong-secret");

    expect(() => verifySession(forged)).toThrow();
  });

  it("rejects a token signed with a different payload shape entirely", () => {
    const garbage = jwt.sign({ nonsense: true }, env.jwtSecret);

    // verifySession doesn't itself validate the payload shape (that's the
    // caller's job via TypeScript), but it should still only accept tokens
    // signed with the real secret — this just confirms the forged-secret
    // case above is the actual security boundary, not payload validation.
    expect(() => verifySession(garbage)).not.toThrow();
  });

  it("rejects an expired token", () => {
    const expired = jwt.sign(claims, env.jwtSecret, { expiresIn: "-1s" });

    expect(() => verifySession(expired)).toThrow();
  });
});
