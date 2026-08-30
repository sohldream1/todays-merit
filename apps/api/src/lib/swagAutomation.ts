import { hasCompleteAddress, submitSwagOrder } from "../controllers/swag.controller.js";
import { prisma } from "./prisma.js";

// Called only right after a badge/tier award actually happens (never
// retroactively re-evaluated for members who crossed the threshold before
// the rule existed) — mirrors how badge/tier awarding itself works.
async function sendAutoSwag(rule: { id: string; organizationId: string; swagProductId: string; size: string | null; quantity: number }, userId: string): Promise<void> {
  const recipient = await prisma.user.findUnique({ where: { id: userId } });
  if (!recipient || !hasCompleteAddress(recipient)) return; // no address on file yet — nothing to ship to

  const order = await prisma.swagOrder.create({
    data: {
      organizationId: rule.organizationId,
      swagProductId: rule.swagProductId,
      recipientUserId: userId,
      size: rule.size,
      quantity: rule.quantity,
      triggerType: "badge_awarded",
      triggerRuleId: rule.id,
      shipToName: recipient.shippingName!,
      shipToAddressLine1: recipient.shippingAddressLine1!,
      shipToAddressLine2: recipient.shippingAddressLine2,
      shipToCity: recipient.shippingCity!,
      shipToState: recipient.shippingState,
      shipToPostalCode: recipient.shippingPostalCode!,
      shipToCountry: recipient.shippingCountry!,
    },
  });

  await submitSwagOrder(order.id);
}

export async function triggerSwagForBadgeAward(userId: string, organizationId: string, badgeId: string): Promise<void> {
  const rules = await prisma.swagAutoRule.findMany({
    where: { organizationId, badgeId, triggerType: "badge_awarded", isActive: true },
  });

  for (const rule of rules) {
    await sendAutoSwag(rule, userId).catch(() => undefined);
  }
}

// Tiers are platform-wide, so a rule tied to a tier can belong to any org
// that chose to reward it — not scoped to the org that triggered evaluation.
export async function triggerSwagForTierAward(userId: string, tierId: string): Promise<void> {
  const rules = await prisma.swagAutoRule.findMany({
    where: { tierId, triggerType: "tier_reached", isActive: true },
  });

  for (const rule of rules) {
    await sendAutoSwag(rule, userId).catch(() => undefined);
  }
}
