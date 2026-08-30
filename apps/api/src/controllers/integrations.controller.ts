import type { Request, Response } from "express";
import { z } from "zod";
import type { IntegrationProvider, IntegrationSyncRecord, OrgIntegration } from "@todays-merit/shared-types";
import { assertOrgAdmin } from "../lib/authz.js";
import { encryptCredentials } from "../lib/credentialCrypto.js";
import { env } from "../lib/env.js";
import { getConnector, isProviderAvailable } from "../integrations/registry.js";
import { syncAllPendingForOrganization } from "../integrations/syncService.js";
import { ApiError } from "../middleware/errorHandler.js";
import { prisma } from "../lib/prisma.js";

const ALL_PROVIDERS: IntegrationProvider[] = ["salesforce", "raisers_edge_nxt", "gofundme_pro"];

const connectSchema = z.object({
  code: z.string().optional(),
});

function providerParam(req: Request): IntegrationProvider {
  const provider = req.params.provider;
  if (!ALL_PROVIDERS.includes(provider as IntegrationProvider)) {
    throw new ApiError(400, `Unknown provider: ${provider}`);
  }
  return provider as IntegrationProvider;
}

function toOrgIntegration(
  row: {
    id: string;
    organizationId: string;
    provider: string;
    status: string;
    externalOrgLabel: string | null;
    connectedAt: Date | null;
    lastSyncAt: Date | null;
    lastError: string | null;
  },
  isMock: boolean,
  isAvailable: boolean,
): OrgIntegration {
  return {
    id: row.id,
    organizationId: row.organizationId,
    provider: row.provider as IntegrationProvider,
    status: row.status as OrgIntegration["status"],
    isMock,
    isAvailable,
    externalOrgLabel: row.externalOrgLabel,
    connectedAt: row.connectedAt ? row.connectedAt.toISOString() : null,
    lastSyncAt: row.lastSyncAt ? row.lastSyncAt.toISOString() : null,
    lastError: row.lastError,
  };
}

function toSyncRecord(r: {
  id: string;
  entityType: string;
  localId: string;
  externalId: string | null;
  status: string;
  errorMessage: string | null;
  syncedAt: Date | null;
  createdAt: Date;
}): IntegrationSyncRecord {
  return {
    id: r.id,
    entityType: r.entityType as IntegrationSyncRecord["entityType"],
    localId: r.localId,
    externalId: r.externalId,
    status: r.status as IntegrationSyncRecord["status"],
    errorMessage: r.errorMessage,
    syncedAt: r.syncedAt ? r.syncedAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  };
}

export async function listOrganizationIntegrations(req: Request, res: Response) {
  const claims = req.user!;
  const organizationId = req.params.orgId;
  await assertOrgAdmin(claims.sub, organizationId);

  const rows = await prisma.orgIntegration.findMany({ where: { organizationId } });
  const byProvider = new Map(rows.map((r) => [r.provider, r]));

  const integrations: OrgIntegration[] = ALL_PROVIDERS.map((provider) => {
    const available = isProviderAvailable(provider);
    const isMock = available ? getConnector(provider).isMock : true;
    const row = byProvider.get(provider);

    if (row) return toOrgIntegration(row, isMock, available);

    return {
      id: `unconnected:${provider}`,
      organizationId,
      provider,
      status: "disconnected",
      isMock,
      isAvailable: available,
      externalOrgLabel: null,
      connectedAt: null,
      lastSyncAt: null,
      lastError: null,
    };
  });

  res.json({ integrations });
}

export async function connectIntegration(req: Request, res: Response) {
  const claims = req.user!;
  const organizationId = req.params.orgId;
  const provider = providerParam(req);
  await assertOrgAdmin(claims.sub, organizationId);

  if (!isProviderAvailable(provider)) {
    throw new ApiError(501, `${provider} integration is not available yet`);
  }
  const connector = getConnector(provider);
  const input = connectSchema.parse(req.body);

  // Real, redirect-based connections (Salesforce, Raiser's Edge NXT) need a
  // full OAuth round trip: the frontend calls this endpoint once with no
  // code, gets an authorizationUrl to send the browser to, and the
  // provider's redirect lands on the callback route below, which calls this
  // same exchange logic with the resulting code. Server-to-server providers
  // (Classy) skip this entirely — see CrmConnector.requiresRedirect.
  if (!connector.isMock && connector.requiresRedirect && !input.code) {
    const authorizationUrl = connector.getAuthorizationUrl(organizationId);
    res.json({ integration: null, authorizationUrl });
    return;
  }

  const code = connector.isMock ? "mock-code" : (input.code ?? "");
  const { credentials, externalOrgLabel } = await connector.exchangeCodeForCredentials(code);
  const encrypted = encryptCredentials(credentials);

  const row = await prisma.orgIntegration.upsert({
    where: { organizationId_provider: { organizationId, provider } },
    create: {
      organizationId,
      provider,
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

  res.json({ integration: toOrgIntegration(row, connector.isMock, true), authorizationUrl: null });
}

export async function disconnectIntegration(req: Request, res: Response) {
  const claims = req.user!;
  const organizationId = req.params.orgId;
  const provider = providerParam(req);
  await assertOrgAdmin(claims.sub, organizationId);

  const row = await prisma.orgIntegration.findUnique({
    where: { organizationId_provider: { organizationId, provider } },
  });
  if (!row) {
    throw new ApiError(404, "Integration is not connected");
  }

  const updated = await prisma.orgIntegration.update({
    where: { id: row.id },
    data: { status: "disconnected", credentials: null, externalOrgLabel: null, connectedAt: null, lastError: null },
  });

  const available = isProviderAvailable(provider);
  const isMock = available ? getConnector(provider).isMock : true;
  res.json({ integration: toOrgIntegration(updated, isMock, available) });
}

export async function syncIntegrationNow(req: Request, res: Response) {
  const claims = req.user!;
  const organizationId = req.params.orgId;
  const provider = providerParam(req);
  await assertOrgAdmin(claims.sub, organizationId);

  const row = await prisma.orgIntegration.findUnique({
    where: { organizationId_provider: { organizationId, provider } },
  });
  if (!row || row.status !== "connected") {
    throw new ApiError(400, "Integration is not connected");
  }

  await syncAllPendingForOrganization(organizationId);

  const refreshed = await prisma.orgIntegration.findUnique({ where: { id: row.id } });
  const connector = getConnector(provider);
  res.json({ integration: toOrgIntegration(refreshed!, connector.isMock, true) });
}

export async function listIntegrationSyncLogs(req: Request, res: Response) {
  const claims = req.user!;
  const organizationId = req.params.orgId;
  const provider = providerParam(req);
  await assertOrgAdmin(claims.sub, organizationId);

  const row = await prisma.orgIntegration.findUnique({
    where: { organizationId_provider: { organizationId, provider } },
  });
  if (!row) {
    res.json({ syncRecords: [] });
    return;
  }

  const records = await prisma.integrationSyncRecord.findMany({
    where: { orgIntegrationId: row.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  res.json({ syncRecords: records.map(toSyncRecord) });
}

// Hit by the CRM's own redirect after the admin approves access on their
// side — not part of our SPA's routing. `state` carries the organizationId;
// in a production build this should be a signed, single-use token rather
// than a raw id, to prevent a forged callback from linking a connection to
// an org the requester doesn't administer.
export async function oauthCallback(req: Request, res: Response) {
  const provider = providerParam(req);
  const code = typeof req.query.code === "string" ? req.query.code : undefined;
  const organizationId = typeof req.query.state === "string" ? req.query.state : undefined;

  if (!code || !organizationId) {
    throw new ApiError(400, "Missing code or state");
  }

  const connector = getConnector(provider);
  const { credentials, externalOrgLabel } = await connector.exchangeCodeForCredentials(code);
  const encrypted = encryptCredentials(credentials);

  await prisma.orgIntegration.upsert({
    where: { organizationId_provider: { organizationId, provider } },
    create: {
      organizationId,
      provider,
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

  res.redirect(`${env.webOrigin}/dashboard/org/integrations?connected=${provider}`);
}
