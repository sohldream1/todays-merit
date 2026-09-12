import type { KudosResult } from "@todays-merit/shared-types";
import { prisma } from "./prisma.js";

// Shared by the volunteer-hour and donation kudos endpoints — the only
// difference between the two is which foreign key column is set on the
// Kudos row, so the give/remove/count logic itself is identical.
type KudosTarget = { volunteerHourId: string } | { donationId: string };

export async function giveKudos(userId: string, target: KudosTarget): Promise<KudosResult> {
  await prisma.kudos.upsert({
    where: {
      // The compound unique name Prisma generates depends on which key is
      // present — TypeScript can't narrow this from a union, so this cast
      // is safe precisely because `target` always has exactly one field.
      ...("volunteerHourId" in target
        ? { userId_volunteerHourId: { userId, volunteerHourId: target.volunteerHourId } }
        : { userId_donationId: { userId, donationId: target.donationId } }),
    } as never,
    create: { userId, ...target },
    update: {},
  });

  return countKudos(target, userId);
}

export async function removeKudos(userId: string, target: KudosTarget): Promise<KudosResult> {
  await prisma.kudos.deleteMany({ where: { userId, ...target } });
  return countKudos(target, userId);
}

export async function countKudos(target: KudosTarget, viewerUserId?: string): Promise<KudosResult> {
  const [kudosCount, mine] = await Promise.all([
    prisma.kudos.count({ where: target }),
    viewerUserId ? prisma.kudos.findFirst({ where: { userId: viewerUserId, ...target } }) : null,
  ]);
  return { kudosCount, hasGivenKudos: !!mine };
}
