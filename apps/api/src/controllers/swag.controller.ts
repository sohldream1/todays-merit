import type { Request, Response } from "express";
import { z } from "zod";
import type {
  CreateSwagAutoRuleInput,
  CreateSwagOrderInput,
  CreateSwagProductInput,
  MySwagOrder,
  OrgIntegration,
  SwagAutoRule,
  SwagOrder,
  SwagProduct,
  SwagRecipientCandidate,
  UpdateSwagAutoRuleInput,
  UpdateSwagProductInput,
} from "@todays-merit/shared-types";
import { assertOrgAdmin } from "../lib/authz.js";
import { listConnectedUserIds } from "../lib/connectedUsers.js";
import { encryptCredentials, decryptCredentials } from "../lib/credentialCrypto.js";
import { getSwagConnector } from "../swag/registry.js";
import { ApiError } from "../middleware/errorHandler.js";
import { prisma } from "../lib/prisma.js";

const createProductSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  category: z.string().optional(),
  sizes: z.array(z.string().min(1)).max(12).optional(),
  unitCost: z.coerce.number().nonnegative().max(100_000),
  currency: z.string().length(3).optional(),
});

const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  category: z.string().optional(),
  sizes: z.array(z.string().min(1)).max(12).optional(),
  unitCost: z.coerce.number().nonnegative().max(100_000).optional(),
  currency: z.string().length(3).optional(),
  isArchived: z.boolean().optional(),
});

const createOrderSchema = z.object({
  swagProductId: z.string().uuid(),
  recipientUserId: z.string().uuid(),
  size: z.string().min(1).optional(),
  quantity: z.coerce.number().int().min(1).max(10).optional(),
});

const createRuleSchema = z.object({
  swagProductId: z.string().uuid(),
  triggerType: z.enum(["badge_awarded", "tier_reached"]),
  badgeId: z.string().uuid().optional(),
  tierId: z.string().uuid().optional(),
  size: z.string().min(1).optional(),
  quantity: z.coerce.number().int().min(1).max(10).optional(),
});

const updateRuleSchema = z.object({
  size: z.string().min(1).optional(),
  quantity: z.coerce.number().int().min(1).max(10).optional(),
  isActive: z.boolean().optional(),
});

function toSwagProduct(p: {
  id: string;
  organizationId: string;
  externalProductId: string | null;
  name: string;
  description: string | null;
  imageUrl: string | null;
  category: string | null;
  sizes: string[];
  unitCost: unknown;
  currency: string;
  isArchived: boolean;
  createdAt: Date;
}): SwagProduct {
  return {
    id: p.id,
    organizationId: p.organizationId,
    externalProductId: p.externalProductId,
    name: p.name,
    description: p.description,
    imageUrl: p.imageUrl,
    category: p.category,
    sizes: p.sizes,
    unitCost: Number(p.unitCost),
    currency: p.currency,
    isArchived: p.isArchived,
    createdAt: p.createdAt.toISOString(),
  };
}

function toSwagOrder(o: {
  id: string;
  size: string | null;
  quantity: number;
  status: string;
  triggerType: string;
  shipToName: string;
  shipToAddressLine1: string;
  shipToAddressLine2: string | null;
  shipToCity: string;
  shipToState: string | null;
  shipToPostalCode: string;
  shipToCountry: string;
  externalOrderId: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  lastError: string | null;
  createdAt: Date;
  swagProduct: { id: string; name: string; imageUrl: string | null };
  recipient: { id: string; firstName: string; lastName: string; email: string };
}): SwagOrder {
  return {
    id: o.id,
    size: o.size,
    quantity: o.quantity,
    status: o.status as SwagOrder["status"],
    triggerType: o.triggerType as SwagOrder["triggerType"],
    shipTo: {
      name: o.shipToName,
      addressLine1: o.shipToAddressLine1,
      addressLine2: o.shipToAddressLine2,
      city: o.shipToCity,
      state: o.shipToState,
      postalCode: o.shipToPostalCode,
      country: o.shipToCountry,
    },
    externalOrderId: o.externalOrderId,
    trackingNumber: o.trackingNumber,
    trackingUrl: o.trackingUrl,
    lastError: o.lastError,
    createdAt: o.createdAt.toISOString(),
    product: o.swagProduct,
    recipient: o.recipient,
  };
}

function toSwagAutoRule(r: {
  id: string;
  triggerType: string;
  size: string | null;
  quantity: number;
  isActive: boolean;
  swagProduct: { id: string; name: string };
  badge: { id: string; name: string } | null;
  tier: { id: string; name: string } | null;
}): SwagAutoRule {
  return {
    id: r.id,
    triggerType: r.triggerType as SwagAutoRule["triggerType"],
    size: r.size,
    quantity: r.quantity,
    isActive: r.isActive,
    product: r.swagProduct,
    badge: r.badge,
    tier: r.tier,
  };
}

function hasCompleteAddress(user: {
  shippingName: string | null;
  shippingAddressLine1: string | null;
  shippingCity: string | null;
  shippingPostalCode: string | null;
  shippingCountry: string | null;
}): boolean {
  return Boolean(
    user.shippingName && user.shippingAddressLine1 && user.shippingCity && user.shippingPostalCode && user.shippingCountry,
  );
}

// ---------- Catalog ----------

export async function listSwagProducts(req: Request, res: Response) {
  const claims = req.user!;
  const organizationId = req.params.orgId;
  await assertOrgAdmin(claims.sub, organizationId);

  const products = await prisma.swagProduct.findMany({
    where: { organizationId, isArchived: false },
    orderBy: { createdAt: "desc" },
  });

  res.json({ products: products.map(toSwagProduct) });
}

export async function createSwagProduct(req: Request, res: Response) {
  const claims = req.user!;
  const input: CreateSwagProductInput = createProductSchema.parse(req.body);
  await assertOrgAdmin(claims.sub, input.organizationId);

  const product = await prisma.swagProduct.create({
    data: {
      organizationId: input.organizationId,
      name: input.name,
      description: input.description,
      imageUrl: input.imageUrl,
      category: input.category,
      sizes: input.sizes ?? [],
      unitCost: input.unitCost,
      currency: input.currency ?? "USD",
    },
  });

  res.status(201).json({ product: toSwagProduct(product) });
}

export async function updateSwagProduct(req: Request, res: Response) {
  const claims = req.user!;
  const productId = req.params.id;

  const existing = await prisma.swagProduct.findUnique({ where: { id: productId } });
  if (!existing) throw new ApiError(404, "Swag item not found");
  await assertOrgAdmin(claims.sub, existing.organizationId);

  const input: UpdateSwagProductInput = updateProductSchema.parse(req.body);

  const product = await prisma.swagProduct.update({ where: { id: productId }, data: input });
  res.json({ product: toSwagProduct(product) });
}

// ---------- Swag.com connection + catalog import ----------

function toIntegrationDto(row: {
  id: string;
  organizationId: string;
  status: string;
  externalOrgLabel: string | null;
  connectedAt: Date | null;
  lastSyncAt: Date | null;
  lastError: string | null;
} | null, organizationId: string, isMock: boolean): OrgIntegration {
  if (!row) {
    return {
      id: `unconnected:swag_com`,
      organizationId,
      provider: "swag_com",
      status: "disconnected",
      isMock,
      isAvailable: true,
      externalOrgLabel: null,
      connectedAt: null,
      lastSyncAt: null,
      lastError: null,
    };
  }
  return {
    id: row.id,
    organizationId: row.organizationId,
    provider: "swag_com",
    status: row.status as OrgIntegration["status"],
    isMock,
    isAvailable: true,
    externalOrgLabel: row.externalOrgLabel,
    connectedAt: row.connectedAt ? row.connectedAt.toISOString() : null,
    lastSyncAt: row.lastSyncAt ? row.lastSyncAt.toISOString() : null,
    lastError: row.lastError,
  };
}

export async function getSwagIntegration(req: Request, res: Response) {
  const claims = req.user!;
  const organizationId = req.params.orgId;
  await assertOrgAdmin(claims.sub, organizationId);

  const row = await prisma.orgIntegration.findUnique({
    where: { organizationId_provider: { organizationId, provider: "swag_com" } },
  });
  const connector = getSwagConnector();
  res.json({ integration: toIntegrationDto(row, organizationId, connector.isMock) });
}

export async function connectSwagIntegration(req: Request, res: Response) {
  const claims = req.user!;
  const organizationId = req.params.orgId;
  await assertOrgAdmin(claims.sub, organizationId);

  const connector = getSwagConnector();
  const { credentials, externalOrgLabel } = await connector.connect();
  const encrypted = encryptCredentials(credentials);

  const row = await prisma.orgIntegration.upsert({
    where: { organizationId_provider: { organizationId, provider: "swag_com" } },
    create: {
      organizationId,
      provider: "swag_com",
      status: "connected",
      credentials: encrypted,
      externalOrgLabel,
      connectedAt: new Date(),
    },
    update: {
      status: "connected",
      credentials: encrypted,
      externalOrgLabel,
      connectedAt: new Date(),
      lastError: null,
    },
  });

  res.json({ integration: toIntegrationDto(row, organizationId, connector.isMock) });
}

export async function disconnectSwagIntegration(req: Request, res: Response) {
  const claims = req.user!;
  const organizationId = req.params.orgId;
  await assertOrgAdmin(claims.sub, organizationId);

  const row = await prisma.orgIntegration.findUnique({
    where: { organizationId_provider: { organizationId, provider: "swag_com" } },
  });
  if (!row) throw new ApiError(404, "Swag.com is not connected");

  const updated = await prisma.orgIntegration.update({
    where: { id: row.id },
    data: { status: "disconnected", credentials: null, externalOrgLabel: null, connectedAt: null, lastError: null },
  });

  const connector = getSwagConnector();
  res.json({ integration: toIntegrationDto(updated, organizationId, connector.isMock) });
}

export async function importSwagCatalog(req: Request, res: Response) {
  const claims = req.user!;
  const organizationId = req.params.orgId;
  await assertOrgAdmin(claims.sub, organizationId);

  const row = await prisma.orgIntegration.findUnique({
    where: { organizationId_provider: { organizationId, provider: "swag_com" } },
  });
  if (!row || row.status !== "connected" || !row.credentials) {
    throw new ApiError(400, "Connect Swag.com before importing its catalog");
  }

  const connector = getSwagConnector();
  const credentials = decryptCredentials(row.credentials);
  const catalog = await connector.listCatalog(credentials);

  const products = await Promise.all(
    catalog.map((item) =>
      prisma.swagProduct.upsert({
        where: {
          organizationId_externalProductId: { organizationId, externalProductId: item.externalProductId },
        },
        create: {
          organizationId,
          externalProductId: item.externalProductId,
          name: item.name,
          description: item.description,
          imageUrl: item.imageUrl,
          category: item.category,
          sizes: item.sizes,
          unitCost: item.unitCost,
          currency: item.currency,
        },
        update: {
          name: item.name,
          description: item.description,
          imageUrl: item.imageUrl,
          category: item.category,
          sizes: item.sizes,
          unitCost: item.unitCost,
          currency: item.currency,
          isArchived: false,
        },
      }),
    ),
  );

  await prisma.orgIntegration.update({ where: { id: row.id }, data: { lastSyncAt: new Date(), lastError: null } });

  res.json({ products: products.map(toSwagProduct) });
}

// ---------- Recipients ----------

export async function listSwagRecipients(req: Request, res: Response) {
  const claims = req.user!;
  const organizationId = req.params.orgId;
  await assertOrgAdmin(claims.sub, organizationId);

  const userIds = await listConnectedUserIds(organizationId);

  if (userIds.length === 0) {
    res.json({ recipients: [] });
    return;
  }

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    orderBy: { firstName: "asc" },
  });

  const recipients: SwagRecipientCandidate[] = users.map((u) => ({
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    hasAddress: hasCompleteAddress(u),
  }));

  res.json({ recipients });
}

// ---------- Orders ----------

async function submitSwagOrder(orderId: string): Promise<void> {
  const order = await prisma.swagOrder.findUnique({ where: { id: orderId }, include: { swagProduct: true } });
  if (!order) return;

  const integration = await prisma.orgIntegration.findUnique({
    where: { organizationId_provider: { organizationId: order.organizationId, provider: "swag_com" } },
  });
  if (!integration || integration.status !== "connected" || !integration.credentials) {
    // No fulfillment connection — the order record stands as an in-house
    // log of intent until an admin connects Swag.com.
    return;
  }

  const connector = getSwagConnector();
  try {
    const credentials = decryptCredentials(integration.credentials);
    const result = await connector.createOrder(credentials, {
      localOrderId: order.id,
      externalProductId: order.swagProduct.externalProductId ?? order.swagProduct.id,
      size: order.size,
      quantity: order.quantity,
      shipTo: {
        name: order.shipToName,
        addressLine1: order.shipToAddressLine1,
        addressLine2: order.shipToAddressLine2,
        city: order.shipToCity,
        state: order.shipToState,
        postalCode: order.shipToPostalCode,
        country: order.shipToCountry,
      },
    });

    await prisma.swagOrder.update({
      where: { id: order.id },
      data: {
        status: result.status,
        externalOrderId: result.externalId,
        trackingNumber: result.trackingNumber,
        trackingUrl: result.trackingUrl,
        submittedAt: new Date(),
        shippedAt: result.status === "shipped" ? new Date() : null,
        lastError: null,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown Swag.com error";
    await prisma.swagOrder.update({ where: { id: order.id }, data: { status: "failed", lastError: message } });
  }
}

export async function listSwagOrders(req: Request, res: Response) {
  const claims = req.user!;
  const organizationId = req.params.orgId;
  await assertOrgAdmin(claims.sub, organizationId);

  const orders = await prisma.swagOrder.findMany({
    where: { organizationId },
    include: {
      swagProduct: { select: { id: true, name: true, imageUrl: true } },
      recipient: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  res.json({ orders: orders.map(toSwagOrder) });
}

export async function createSwagOrder(req: Request, res: Response) {
  const claims = req.user!;
  const organizationId = req.params.orgId;
  await assertOrgAdmin(claims.sub, organizationId);

  const input: CreateSwagOrderInput = createOrderSchema.parse(req.body);

  const product = await prisma.swagProduct.findFirst({
    where: { id: input.swagProductId, organizationId, isArchived: false },
  });
  if (!product) throw new ApiError(404, "Swag item not found");

  if (input.size && product.sizes.length > 0 && !product.sizes.includes(input.size)) {
    throw new ApiError(400, `Invalid size — choose one of: ${product.sizes.join(", ")}`);
  }
  if (!input.size && product.sizes.length > 0) {
    throw new ApiError(400, "This item requires a size");
  }

  const recipient = await prisma.user.findUnique({ where: { id: input.recipientUserId } });
  if (!recipient) throw new ApiError(404, "Recipient not found");
  if (!hasCompleteAddress(recipient)) {
    throw new ApiError(400, "This member hasn't set a shipping address yet");
  }

  const order = await prisma.swagOrder.create({
    data: {
      organizationId,
      swagProductId: product.id,
      recipientUserId: recipient.id,
      size: product.sizes.length > 0 ? input.size! : null,
      quantity: input.quantity ?? 1,
      triggerType: "manual",
      requestedByUserId: claims.sub,
      shipToName: recipient.shippingName!,
      shipToAddressLine1: recipient.shippingAddressLine1!,
      shipToAddressLine2: recipient.shippingAddressLine2,
      shipToCity: recipient.shippingCity!,
      shipToState: recipient.shippingState,
      shipToPostalCode: recipient.shippingPostalCode!,
      shipToCountry: recipient.shippingCountry!,
    },
    include: {
      swagProduct: { select: { id: true, name: true, imageUrl: true } },
      recipient: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });

  await submitSwagOrder(order.id);

  const refreshed = await prisma.swagOrder.findUnique({
    where: { id: order.id },
    include: {
      swagProduct: { select: { id: true, name: true, imageUrl: true } },
      recipient: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });

  res.status(201).json({ order: toSwagOrder(refreshed!) });
}

export async function listMySwag(req: Request, res: Response) {
  const claims = req.user!;

  const orders = await prisma.swagOrder.findMany({
    where: { recipientUserId: claims.sub },
    include: {
      swagProduct: { select: { id: true, name: true, imageUrl: true } },
      recipient: { select: { id: true, firstName: true, lastName: true, email: true } },
      organization: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const result: MySwagOrder[] = orders.map((o) => ({
    ...toSwagOrder(o),
    organization: { id: o.organization.id, name: o.organization.name },
  }));

  res.json({ orders: result });
}

// ---------- Auto-rules ----------

export async function listSwagAutoRules(req: Request, res: Response) {
  const claims = req.user!;
  const organizationId = req.params.orgId;
  await assertOrgAdmin(claims.sub, organizationId);

  const rules = await prisma.swagAutoRule.findMany({
    where: { organizationId },
    include: {
      swagProduct: { select: { id: true, name: true } },
      badge: { select: { id: true, name: true } },
      tier: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  res.json({ rules: rules.map(toSwagAutoRule) });
}

export async function createSwagAutoRule(req: Request, res: Response) {
  const claims = req.user!;
  const organizationId = req.params.orgId;
  await assertOrgAdmin(claims.sub, organizationId);

  const input: CreateSwagAutoRuleInput = createRuleSchema.parse(req.body);

  if (input.triggerType === "badge_awarded" && !input.badgeId) {
    throw new ApiError(400, "badgeId is required for a badge_awarded rule");
  }
  if (input.triggerType === "tier_reached" && !input.tierId) {
    throw new ApiError(400, "tierId is required for a tier_reached rule");
  }

  const product = await prisma.swagProduct.findFirst({
    where: { id: input.swagProductId, organizationId, isArchived: false },
  });
  if (!product) throw new ApiError(404, "Swag item not found");

  if (product.sizes.length > 0 && !input.size) {
    throw new ApiError(400, "This item requires a default size for auto-send");
  }
  if (input.size && product.sizes.length > 0 && !product.sizes.includes(input.size)) {
    throw new ApiError(400, `Invalid size — choose one of: ${product.sizes.join(", ")}`);
  }

  if (input.badgeId) {
    const badge = await prisma.badge.findFirst({ where: { id: input.badgeId, organizationId } });
    if (!badge) throw new ApiError(404, "Badge not found");
  }
  if (input.tierId) {
    const tier = await prisma.tier.findFirst({ where: { id: input.tierId, organizationId: null } });
    if (!tier) throw new ApiError(404, "Tier not found");
  }

  const rule = await prisma.swagAutoRule.create({
    data: {
      organizationId,
      swagProductId: product.id,
      triggerType: input.triggerType,
      badgeId: input.badgeId,
      tierId: input.tierId,
      size: product.sizes.length > 0 ? input.size! : null,
      quantity: input.quantity ?? 1,
    },
    include: {
      swagProduct: { select: { id: true, name: true } },
      badge: { select: { id: true, name: true } },
      tier: { select: { id: true, name: true } },
    },
  });

  res.status(201).json({ rule: toSwagAutoRule(rule) });
}

export async function updateSwagAutoRule(req: Request, res: Response) {
  const claims = req.user!;
  const ruleId = req.params.id;

  const existing = await prisma.swagAutoRule.findUnique({ where: { id: ruleId } });
  if (!existing) throw new ApiError(404, "Rule not found");
  await assertOrgAdmin(claims.sub, existing.organizationId);

  const input: UpdateSwagAutoRuleInput = updateRuleSchema.parse(req.body);

  const rule = await prisma.swagAutoRule.update({
    where: { id: ruleId },
    data: input,
    include: {
      swagProduct: { select: { id: true, name: true } },
      badge: { select: { id: true, name: true } },
      tier: { select: { id: true, name: true } },
    },
  });

  res.json({ rule: toSwagAutoRule(rule) });
}

export { submitSwagOrder, hasCompleteAddress };
