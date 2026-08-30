import type { SyncEntityType } from "@todays-merit/shared-types";
import { decryptCredentials } from "../lib/credentialCrypto.js";
import { prisma } from "../lib/prisma.js";
import { getConnector, isProviderAvailable } from "./registry.js";
import type { ConnectorPushResult, CrmConnector } from "./types.js";

async function getSyncedExternalId(
  orgIntegrationId: string,
  entityType: SyncEntityType,
  localId: string,
): Promise<string | null> {
  const record = await prisma.integrationSyncRecord.findUnique({
    where: { orgIntegrationId_entityType_localId: { orgIntegrationId, entityType, localId } },
  });
  return record?.status === "synced" ? record.externalId : null;
}

async function syncToConnectedIntegrations(
  organizationId: string,
  entityType: SyncEntityType,
  localId: string,
  push: (connector: CrmConnector, credentials: unknown, orgIntegrationId: string) => Promise<ConnectorPushResult>,
): Promise<void> {
  const integrations = await prisma.orgIntegration.findMany({
    where: { organizationId, status: "connected" },
  });

  for (const integration of integrations) {
    if (!isProviderAvailable(integration.provider) || !integration.credentials) continue;
    const connector = getConnector(integration.provider);

    const syncRecord = await prisma.integrationSyncRecord.upsert({
      where: {
        orgIntegrationId_entityType_localId: {
          orgIntegrationId: integration.id,
          entityType,
          localId,
        },
      },
      create: { orgIntegrationId: integration.id, entityType, localId, status: "pending" },
      update: { status: "pending", errorMessage: null },
    });

    try {
      const credentials = decryptCredentials(integration.credentials);
      const result = await push(connector, credentials, integration.id);
      await prisma.integrationSyncRecord.update({
        where: { id: syncRecord.id },
        data: { status: "synced", externalId: result.externalId, syncedAt: new Date(), errorMessage: null },
      });
      await prisma.orgIntegration.update({
        where: { id: integration.id },
        data: { lastSyncAt: new Date(), lastError: null },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown sync error";
      await prisma.integrationSyncRecord.update({
        where: { id: syncRecord.id },
        data: { status: "failed", errorMessage: message },
      });
      await prisma.orgIntegration.update({
        where: { id: integration.id },
        data: { lastError: message },
      });
    }
  }
}

export async function syncDonorForOrg(organizationId: string, userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  await syncToConnectedIntegrations(organizationId, "donor", userId, (connector, credentials) =>
    connector.pushDonor(credentials, {
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    }),
  );
}

export async function syncDonationById(donationId: string): Promise<void> {
  const donation = await prisma.donation.findUnique({
    where: { id: donationId },
    include: { user: true, campaign: true },
  });
  if (!donation) return;

  await syncDonorForOrg(donation.organizationId, donation.userId);

  await syncToConnectedIntegrations(
    donation.organizationId,
    "donation",
    donationId,
    async (connector, credentials, orgIntegrationId) => {
      const donorExternalId = await getSyncedExternalId(orgIntegrationId, "donor", donation.userId);
      return connector.pushDonation(credentials, {
        donationId: donation.id,
        amount: Number(donation.amount),
        donatedAt: donation.donatedAt.toISOString(),
        donorEmail: donation.user.email,
        donorFirstName: donation.user.firstName,
        donorLastName: donation.user.lastName,
        donorExternalId,
        campaignTitle: donation.campaign?.title ?? null,
      });
    },
  );
}

export async function syncVolunteerHourById(hourId: string): Promise<void> {
  const hour = await prisma.volunteerHour.findUnique({
    where: { id: hourId },
    include: { user: true, opportunity: true },
  });
  if (!hour) return;

  await syncDonorForOrg(hour.organizationId, hour.userId);

  await syncToConnectedIntegrations(
    hour.organizationId,
    "volunteer_hour",
    hourId,
    async (connector, credentials, orgIntegrationId) => {
      const volunteerExternalId = await getSyncedExternalId(orgIntegrationId, "donor", hour.userId);
      return connector.pushVolunteerHour(credentials, {
        hourId: hour.id,
        hours: Number(hour.hours),
        dateOfService: hour.dateOfService.toISOString(),
        volunteerEmail: hour.user.email,
        volunteerFirstName: hour.user.firstName,
        volunteerLastName: hour.user.lastName,
        volunteerExternalId,
        opportunityTitle: hour.opportunity?.title ?? null,
      });
    },
  );
}

// Manual "sync now" — re-pushes every completed donation and verified hour
// for the org, so a freshly connected integration backfills existing data
// (auto-sync hooks only cover events going forward from connection time).
export async function syncAllPendingForOrganization(organizationId: string): Promise<void> {
  const [donations, hours] = await Promise.all([
    prisma.donation.findMany({ where: { organizationId, paymentStatus: "completed" } }),
    prisma.volunteerHour.findMany({ where: { organizationId, verificationStatus: "verified_by_org" } }),
  ]);

  for (const donation of donations) await syncDonationById(donation.id);
  for (const hour of hours) await syncVolunteerHourById(hour.id);
}
