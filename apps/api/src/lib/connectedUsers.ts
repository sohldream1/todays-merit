import { prisma } from "./prisma.js";

// A member is "connected" to an org once they've signed up for one of its
// opportunities, logged hours, donated, or earned a badge with it — used
// wherever an admin needs to pick a real person rather than type a raw id
// (swag recipients, manual badge awards).
export async function listConnectedUserIds(organizationId: string): Promise<string[]> {
  const [hourUsers, donationUsers, badgeUsers, signupUsers] = await Promise.all([
    prisma.volunteerHour.findMany({ where: { organizationId }, select: { userId: true }, distinct: ["userId"] }),
    prisma.donation.findMany({ where: { organizationId }, select: { userId: true }, distinct: ["userId"] }),
    prisma.userBadge.findMany({ where: { organizationId }, select: { userId: true }, distinct: ["userId"] }),
    prisma.volunteerSignup.findMany({
      where: { opportunity: { organizationId } },
      select: { userId: true },
      distinct: ["userId"],
    }),
  ]);

  const userIds = new Set<string>([
    ...hourUsers.map((r) => r.userId),
    ...donationUsers.map((r) => r.userId),
    ...badgeUsers.map((r) => r.userId),
    ...signupUsers.map((r) => r.userId),
  ]);

  return [...userIds];
}
