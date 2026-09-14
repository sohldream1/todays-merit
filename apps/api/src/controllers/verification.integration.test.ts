import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../app.js";
import { prisma } from "../lib/prisma.js";
import { hashPassword } from "../lib/password.js";
import { extractSessionCookie, uniqueEmail } from "../testUtils.js";

// A dedicated email so this file's platform-admin account is independent of
// any other test file's — .env.test lists both in PLATFORM_ADMIN_EMAILS.
const PLATFORM_ADMIN_EMAIL = "platform.admin.verification@example.com";

describe("nonprofit verification workflow", () => {
  const createdUserIds: string[] = [];
  const createdOrgIds: string[] = [];
  let adminCookie: string;

  beforeAll(async () => {
    const existing = await prisma.user.findUnique({ where: { email: PLATFORM_ADMIN_EMAIL } });
    if (existing) await prisma.user.delete({ where: { id: existing.id } });

    const password = "TestPass123!";
    const admin = await prisma.user.create({
      data: {
        email: PLATFORM_ADMIN_EMAIL,
        passwordHash: await hashPassword(password),
        firstName: "Plat",
        lastName: "Admin",
      },
    });
    createdUserIds.push(admin.id);

    const res = await request(app).post("/api/auth/login").send({ email: PLATFORM_ADMIN_EMAIL, password });
    adminCookie = extractSessionCookie(res);
  });

  afterAll(async () => {
    if (createdOrgIds.length > 0) {
      await prisma.organization.deleteMany({ where: { id: { in: createdOrgIds } } });
    }
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
  });

  async function signupNonprofit(): Promise<{ cookie: string; organizationId: string }> {
    const email = uniqueEmail("nonprofit");
    const res = await request(app)
      .post("/api/auth/signup/nonprofit")
      .send({
        email,
        password: "TestPass123!",
        firstName: "Org",
        lastName: "Owner",
        agreedToTerms: true,
        organization: {
          name: `Test Org ${email}`,
          ein: "12-3456789",
          causeArea: "community",
          city: "Testville",
          state: "TS",
          country: "USA",
        },
      });
    createdUserIds.push(res.body.user.id);
    createdOrgIds.push(res.body.user.organizationId);
    return { cookie: extractSessionCookie(res), organizationId: res.body.user.organizationId as string };
  }

  it("starts unverified and moves to pending on submit", async () => {
    const { cookie, organizationId } = await signupNonprofit();

    const org = await prisma.organization.findUniqueOrThrow({ where: { id: organizationId } });
    expect(org.verificationStatus).toBe("unverified");

    const res = await request(app)
      .post(`/api/organizations/${organizationId}/verification/submit`)
      .set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.organization.verificationStatus).toBe("pending");
  });

  it("can't be reviewed by the org's own admin — only a platform admin", async () => {
    const { cookie, organizationId } = await signupNonprofit();
    await request(app).post(`/api/organizations/${organizationId}/verification/submit`).set("Cookie", cookie);

    const res = await request(app)
      .post(`/api/platform-admin/organizations/${organizationId}/review`)
      .set("Cookie", cookie)
      .send({ decision: "verified" });
    expect(res.status).toBe(403);
  });

  it("requires notes when rejecting", async () => {
    const { cookie, organizationId } = await signupNonprofit();
    await request(app).post(`/api/organizations/${organizationId}/verification/submit`).set("Cookie", cookie);

    const res = await request(app)
      .post(`/api/platform-admin/organizations/${organizationId}/review`)
      .set("Cookie", adminCookie)
      .send({ decision: "rejected" });
    expect(res.status).toBe(400);
  });

  it("rejects with notes, then clears them on resubmission", async () => {
    const { cookie, organizationId } = await signupNonprofit();
    await request(app).post(`/api/organizations/${organizationId}/verification/submit`).set("Cookie", cookie);

    const rejectRes = await request(app)
      .post(`/api/platform-admin/organizations/${organizationId}/review`)
      .set("Cookie", adminCookie)
      .send({ decision: "rejected", notes: "EIN doesn't match records" });
    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.organization.verificationStatus).toBe("rejected");
    expect(rejectRes.body.organization.verificationNotes).toBe("EIN doesn't match records");

    const resubmitRes = await request(app)
      .post(`/api/organizations/${organizationId}/verification/submit`)
      .set("Cookie", cookie);
    expect(resubmitRes.status).toBe(200);
    expect(resubmitRes.body.organization.verificationStatus).toBe("pending");
    expect(resubmitRes.body.organization.verificationNotes).toBeNull();
  });

  it("approves a pending submission", async () => {
    const { cookie, organizationId } = await signupNonprofit();
    await request(app).post(`/api/organizations/${organizationId}/verification/submit`).set("Cookie", cookie);

    const res = await request(app)
      .post(`/api/platform-admin/organizations/${organizationId}/review`)
      .set("Cookie", adminCookie)
      .send({ decision: "verified" });
    expect(res.status).toBe(200);
    expect(res.body.organization.verificationStatus).toBe("verified");
  });

  it("can't review a submission that isn't awaiting review", async () => {
    // Never submitted — still "unverified", not "pending".
    const { organizationId } = await signupNonprofit();

    const res = await request(app)
      .post(`/api/platform-admin/organizations/${organizationId}/review`)
      .set("Cookie", adminCookie)
      .send({ decision: "verified" });
    expect(res.status).toBe(400);
  });
});
