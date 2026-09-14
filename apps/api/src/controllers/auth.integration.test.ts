import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../app.js";
import { prisma } from "../lib/prisma.js";
import { hashPassword } from "../lib/password.js";
import { extractSessionCookie, uniqueEmail } from "../testUtils.js";

describe("auth", () => {
  const createdUserIds: string[] = [];

  afterAll(async () => {
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
  });

  it("signs up a member and returns the member role", async () => {
    const email = uniqueEmail("member");
    const res = await request(app)
      .post("/api/auth/signup/member")
      .send({ email, password: "TestPass123!", firstName: "Test", lastName: "Member", agreedToTerms: true });

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ email, role: "member", organizationId: null });
    createdUserIds.push(res.body.user.id);
  });

  it("requires agreeing to terms", async () => {
    const res = await request(app)
      .post("/api/auth/signup/member")
      .send({ email: uniqueEmail("noterms"), password: "TestPass123!", firstName: "No", lastName: "Terms" });

    expect(res.status).toBe(400);
  });

  it("rejects a duplicate signup email with 409", async () => {
    const payload = {
      email: uniqueEmail("dupe"),
      password: "TestPass123!",
      firstName: "Dup",
      lastName: "Licate",
      agreedToTerms: true,
    };

    const first = await request(app).post("/api/auth/signup/member").send(payload);
    createdUserIds.push(first.body.user.id);

    const second = await request(app).post("/api/auth/signup/member").send(payload);
    expect(second.status).toBe(409);
  });

  it("rejects login with the wrong password", async () => {
    const email = uniqueEmail("wrongpw");
    const signup = await request(app)
      .post("/api/auth/signup/member")
      .send({ email, password: "TestPass123!", firstName: "Wrong", lastName: "Pw", agreedToTerms: true });
    createdUserIds.push(signup.body.user.id);

    const res = await request(app).post("/api/auth/login").send({ email, password: "not-the-password" });
    expect(res.status).toBe(401);
  });

  it("logs in with the correct password and sets a session cookie", async () => {
    const email = uniqueEmail("login");
    const signup = await request(app)
      .post("/api/auth/signup/member")
      .send({ email, password: "TestPass123!", firstName: "Log", lastName: "In", agreedToTerms: true });
    createdUserIds.push(signup.body.user.id);

    const res = await request(app).post("/api/auth/login").send({ email, password: "TestPass123!" });
    expect(res.status).toBe(200);
    expect(extractSessionCookie(res)).toMatch(/^tm_session=/);
  });

  it("resolves the platform_admin role for an allow-listed email, even with no org membership", async () => {
    // PLATFORM_ADMIN_EMAILS in .env.test is fixed to this address — the
    // allow-list check must win over the "no OrgAdmin row -> member"
    // fallback that every other email hits.
    const email = "platform.admin.test@example.com";
    const password = "TestPass123!";
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      await prisma.user.delete({ where: { id: existing.id } });
    }
    const user = await prisma.user.create({
      data: { email, passwordHash: await hashPassword(password), firstName: "Platform", lastName: "Admin" },
    });
    createdUserIds.push(user.id);

    const res = await request(app).post("/api/auth/login").send({ email, password });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe("platform_admin");
    expect(res.body.user.organizationId).toBeNull();
  });
});
