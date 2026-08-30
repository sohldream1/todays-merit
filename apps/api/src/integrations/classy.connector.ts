import { randomUUID } from "node:crypto";
import { env } from "../lib/env.js";
import type {
  ConnectorPushResult,
  CrmConnector,
  DonationPayload,
  DonorPayload,
  ExchangedCredentials,
  VolunteerHourPayload,
} from "./types.js";

interface ClassyCredentials {
  accessToken: string;
  expiresAt: string;
  mock?: boolean;
}

const API_BASE = "https://api.classy.org/2.0";

// Real Classy (GoFundMe Pro) API integration, with the same mock-mode
// pattern as the other connectors: it activates automatically when
// GOFUNDME_CLASSY_CLIENT_ID/SECRET/ORGANIZATION_ID aren't configured.
//
// Classy's actual shape differs from Salesforce/Raiser's Edge NXT in two
// real ways, not just naming:
//   1. Auth is server-to-server (OAuth2 client_credentials) — no admin
//      consent redirect, so requiresRedirect is false and
//      exchangeCodeForCredentials ignores its `code` argument entirely.
//   2. Classy is normally the payment processor itself; organizations query
//      donations FROM Classy rather than push arbitrary ones INTO it. The
//      one place external systems legitimately write donations is Classy's
//      "offline" transaction support (cash/check gifts collected outside
//      Classy's checkout), which is what pushDonation targets below.
export class ClassyConnector implements CrmConnector {
  readonly provider = "gofundme_pro" as const;
  readonly requiresRedirect = false;

  get isMock(): boolean {
    return !env.classy.clientId || !env.classy.clientSecret || !env.classy.organizationId;
  }

  getAuthorizationUrl(_state: string): string {
    // Never called in practice — connectIntegration skips straight to
    // exchangeCodeForCredentials for connectors where requiresRedirect is
    // false. Implemented only to satisfy the CrmConnector interface.
    return "";
  }

  async exchangeCodeForCredentials(_code: string): Promise<ExchangedCredentials> {
    if (this.isMock) {
      const credentials: ClassyCredentials = {
        accessToken: `mock_access_${randomUUID()}`,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        mock: true,
      };
      return { credentials, externalOrgLabel: "Mock Classy Organization (no real connection)" };
    }

    const params = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: env.classy.clientId!,
      client_secret: env.classy.clientSecret!,
    });

    const res = await fetch("https://api.classy.org/oauth2/auth", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!res.ok) {
      throw new Error(`Classy token exchange failed: ${res.status} ${await res.text()}`);
    }

    const body = (await res.json()) as { access_token: string; expires_in: number };

    const credentials: ClassyCredentials = {
      accessToken: body.access_token,
      expiresAt: new Date(Date.now() + body.expires_in * 1000).toISOString(),
    };

    return { credentials, externalOrgLabel: `Classy Organization ${env.classy.organizationId}` };
  }

  async pushDonor(credentials: unknown, donor: DonorPayload): Promise<ConnectorPushResult> {
    const creds = credentials as ClassyCredentials;
    if (creds.mock) {
      return { externalId: `classy_mock_supporter_${randomUUID()}` };
    }

    const res = await this.apiRequest(
      creds,
      "POST",
      `/organizations/${env.classy.organizationId}/supporters`,
      { first_name: donor.firstName, last_name: donor.lastName, email_address: donor.email },
    );
    return { externalId: String(res.id) };
  }

  async pushDonation(credentials: unknown, donation: DonationPayload): Promise<ConnectorPushResult> {
    const creds = credentials as ClassyCredentials;
    if (creds.mock) {
      return { externalId: `classy_mock_transaction_${randomUUID()}` };
    }
    if (!env.classy.defaultCampaignId) {
      throw new Error(
        "GOFUNDME_CLASSY_DEFAULT_CAMPAIGN_ID is not set — Classy donations are campaign-scoped and this " +
          "scaffold doesn't yet map Today's Merit campaigns to Classy campaign ids individually",
      );
    }

    const res = await this.apiRequest(
      creds,
      "POST",
      `/campaigns/${env.classy.defaultCampaignId}/transactions`,
      {
        type: "Offline",
        status: "success",
        total_gross_amount: donation.amount,
        purchased_at: donation.donatedAt,
        member: { supporter_id: donation.donorExternalId },
      },
    );
    return { externalId: String(res.id) };
  }

  async pushVolunteerHour(credentials: unknown, _hour: VolunteerHourPayload): Promise<ConnectorPushResult> {
    const creds = credentials as ClassyCredentials;
    if (creds.mock) {
      // Classy has no volunteer-hours concept at all — this mock id exists
      // purely so the rest of the app (sync records, admin UI) has
      // something to display, matching the other connectors' mock shape.
      return { externalId: `classy_mock_unsupported_${randomUUID()}` };
    }

    throw new Error("Classy is a fundraising platform and has no concept of volunteer hours to sync");
  }

  private async apiRequest(
    creds: ClassyCredentials,
    method: string,
    path: string,
    body: Record<string, unknown>,
  ): Promise<{ id: string | number }> {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${creds.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`Classy API request failed: ${res.status} ${await res.text()}`);
    }

    return res.json() as Promise<{ id: string | number }>;
  }
}
