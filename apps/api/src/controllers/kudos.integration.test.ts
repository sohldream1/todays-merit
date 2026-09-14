import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../app.js";
import { prisma } from "../lib/prisma.js";
import { extractSessionCookie, uniqueEmail } from "../testUtils.js";

describe("kudos", () => {
  const createdUserIds: string[] = [];
  let organizationId: string;
  let opportunityId: string;
  let campaignId: string;
  let ownerCookie: string;
  let giverCookie: string;
  let hourId: string;
  let donationId: string;

  beforeAll(async () => {
    const orgEmail = uniqueEmail("kudos-org");
    const orgSignup = await request(app)
      .post("/api/auth/signup/nonprofit")
      .send({
        email: orgEmail,
        password: "TestPass123!",
        firstName: "Org",
        lastName: "Admin",
        agreedToTerms: true,
        organization: {
          name: `Kudos Test Org ${orgEmail}`,
          ein: "12-3456789",
          causeArea: "community",
          city: "Testville",
          state: "TS",
          country: "USA",
        },
      });
    createdUserIds.push(orgSignup.body.user.id);
    organizationId = orgSignup.body.user.organizationId;
    const orgAdminCookie = extractSessionCookie(orgSignup);

    const oppRes = await request(app)
      .post("/api/opportunities")
      .set("Cookie", orgAdminCookie)
      .send({ organizationId, title: "Kudos Test Opportunity" });
    opportunityId = oppRes.body.opportunity.id;

    const campaignRes = await request(app)
      .post("/api/campaigns")
      .set("Cookie", orgAdminCookie)
      .send({ organizationId, title: "Kudos Test Campaign", goalAmount: 1000 });
    campaignId = campaignRes.body.campaign.id;
    await request(app)
      .patch(`/api/campaigns/${campaignId}`)
      .set("Cookie", orgAdminCookie)
      .send({ status: "active" });

    // The "owner" of the activity — logs an hour and donates.
    const ownerEmail = uniqueEmail("kudos-owner");
    const ownerSignup = await request(app)
      .post("/api/auth/signup/member")
      .send({ email: ownerEmail, password: "TestPass123!", firstName: "Owner", lastName: "Person", agreedToTerms: true });
    createdUserIds.push(ownerSignup.body.user.id);
    ownerCookie = extractSessionCookie(ownerSignup);

    await request(app).post(`/api/opportunities/${opportunityId}/signup`).set("Cookie", ownerCookie);
    const hourRes = await request(app)
      .post("/api/volunteer-hours")
      .set("Cookie", ownerCookie)
      .send({ opportunityId, hours: 2, dateOfService: "2026-01-01" });
    hourId = hourRes.body.hour.id;

    const donationRes = await request(app)
      .post(`/api/campaigns/${campaignId}/donations`)
      .set("Cookie", ownerCookie)
      .send({ amount: 25 });
    donationId = donationRes.body.donation.id;

    // A different member — gives kudos on the owner's activity.
    const giverEmail = uniqueEmail("kudos-giver");
    const giverSignup = await request(app)
      .post("/api/auth/signup/member")
      .send({ email: giverEmail, password: "TestPass123!", firstName: "Giver", lastName: "Person", agreedToTerms: true });
    createdUserIds.push(giverSignup.body.user.id);
    giverCookie = extractSessionCookie(giverSignup);
  });

  afterAll(async () => {
    // Deletion order matters: several relations to Organization are
    // onDelete: Restrict (opportunities, hours, donations, campaigns), so
    // those have to go before the org itself — kudos cascade-delete with
    // their hour/donation automatically.
    await prisma.volunteerHour.deleteMany({ where: { organizationId } });
    await prisma.donation.deleteMany({ where: { organizationId } });
    await prisma.volunteerSignup.deleteMany({ where: { opportunityId } });
    await prisma.campaign.deleteMany({ where: { organizationId } });
    await prisma.volunteerOpportunity.deleteMany({ where: { organizationId } });
    await prisma.organization.delete({ where: { id: organizationId } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  });

  it("lets another member give kudos on a volunteer hour", async () => {
    const res = await request(app).post(`/api/volunteer-hours/${hourId}/kudos`).set("Cookie", giverCookie);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ kudosCount: 1, hasGivenKudos: true });
  });

  it("is idempotent — giving kudos twice doesn't double the count", async () => {
    await request(app).post(`/api/volunteer-hours/${hourId}/kudos`).set("Cookie", giverCookie);
    const res = await request(app).post(`/api/volunteer-hours/${hourId}/kudos`).set("Cookie", giverCookie);
    expect(res.body).toEqual({ kudosCount: 1, hasGivenKudos: true });
  });

  it("blocks giving kudos on your own volunteer hour", async () => {
    const res = await request(app).post(`/api/volunteer-hours/${hourId}/kudos`).set("Cookie", ownerCookie);
    expect(res.status).toBe(400);
  });

  it("removes kudos and is idempotent when removed twice", async () => {
    await request(app).post(`/api/volunteer-hours/${hourId}/kudos`).set("Cookie", giverCookie);

    const first = await request(app).delete(`/api/volunteer-hours/${hourId}/kudos`).set("Cookie", giverCookie);
    expect(first.body).toEqual({ kudosCount: 0, hasGivenKudos: false });

    const second = await request(app).delete(`/api/volunteer-hours/${hourId}/kudos`).set("Cookie", giverCookie);
    expect(second.status).toBe(200);
    expect(second.body).toEqual({ kudosCount: 0, hasGivenKudos: false });
  });

  it("supports kudos on a donation the same way", async () => {
    const give = await request(app).post(`/api/donations/${donationId}/kudos`).set("Cookie", giverCookie);
    expect(give.body).toEqual({ kudosCount: 1, hasGivenKudos: true });

    const blocked = await request(app).post(`/api/donations/${donationId}/kudos`).set("Cookie", ownerCookie);
    expect(blocked.status).toBe(400);

    const remove = await request(app).delete(`/api/donations/${donationId}/kudos`).set("Cookie", giverCookie);
    expect(remove.body).toEqual({ kudosCount: 0, hasGivenKudos: false });
  });

  it("includes the activity in the org feed with the right kudos state", async () => {
    await request(app).post(`/api/volunteer-hours/${hourId}/kudos`).set("Cookie", giverCookie);

    const res = await request(app).get(`/api/organizations/${organizationId}/feed`).set("Cookie", giverCookie);
    expect(res.status).toBe(200);

    const hourItem = res.body.items.find(
      (i: { type: string; id: string }) => i.type === "volunteer_hours" && i.id === hourId,
    );
    expect(hourItem).toMatchObject({ kudosCount: 1, hasGivenKudos: true, hours: 2 });

    const donationItem = res.body.items.find(
      (i: { type: string; id: string }) => i.type === "donation" && i.id === donationId,
    );
    expect(donationItem).toBeDefined();
    expect(donationItem.amount).toBeUndefined(); // amounts are deliberately never included in the feed
  });

  it("requires login to view the feed", async () => {
    const res = await request(app).get(`/api/organizations/${organizationId}/feed`);
    expect(res.status).toBe(401);
  });
});
