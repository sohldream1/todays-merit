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

interface SalesforceCredentials {
  accessToken: string;
  refreshToken: string;
  instanceUrl: string;
  mock?: boolean;
}

const API_VERSION = "v60.0";

// Real Salesforce Connected App OAuth + REST API integration, with a mock
// mode that activates automatically when SALESFORCE_CLIENT_ID isn't
// configured. Mock mode never makes a network call — every push just
// fabricates a plausible Salesforce-style id so the rest of the app (sync
// records, admin UI) has real data to work against. Swapping to live
// Salesforce later is just setting the three SALESFORCE_* env vars; no
// application code changes needed.
export class SalesforceConnector implements CrmConnector {
  readonly provider = "salesforce" as const;
  readonly requiresRedirect = true;

  get isMock(): boolean {
    return !env.salesforce.clientId || !env.salesforce.clientSecret || !env.salesforce.redirectUri;
  }

  getAuthorizationUrl(state: string): string {
    if (this.isMock) {
      // Never actually navigated to — the mock "connect" flow short-circuits
      // before redirecting. Returned for API shape parity with live mode.
      return `/mock-oauth/salesforce?state=${encodeURIComponent(state)}`;
    }

    const params = new URLSearchParams({
      response_type: "code",
      client_id: env.salesforce.clientId!,
      redirect_uri: env.salesforce.redirectUri!,
      scope: "api refresh_token offline_access",
      state,
    });
    return `https://login.salesforce.com/services/oauth2/authorize?${params.toString()}`;
  }

  async exchangeCodeForCredentials(code: string): Promise<ExchangedCredentials> {
    if (this.isMock) {
      const credentials: SalesforceCredentials = {
        accessToken: `mock_access_${randomUUID()}`,
        refreshToken: `mock_refresh_${randomUUID()}`,
        instanceUrl: "https://mock-instance.my.salesforce.com",
        mock: true,
      };
      return { credentials, externalOrgLabel: "Mock Salesforce Org (no real connection)" };
    }

    const params = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: env.salesforce.clientId!,
      client_secret: env.salesforce.clientSecret!,
      redirect_uri: env.salesforce.redirectUri!,
    });

    const res = await fetch("https://login.salesforce.com/services/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!res.ok) {
      throw new Error(`Salesforce token exchange failed: ${res.status} ${await res.text()}`);
    }

    const body = (await res.json()) as {
      access_token: string;
      refresh_token: string;
      instance_url: string;
    };

    const credentials: SalesforceCredentials = {
      accessToken: body.access_token,
      refreshToken: body.refresh_token,
      instanceUrl: body.instance_url,
    };

    return { credentials, externalOrgLabel: body.instance_url };
  }

  async pushDonor(credentials: unknown, donor: DonorPayload): Promise<ConnectorPushResult> {
    const creds = credentials as SalesforceCredentials;
    if (creds.mock) {
      return { externalId: `sf_mock_contact_${randomUUID()}` };
    }

    // Upsert by email via Salesforce's external-id-less "find or create"
    // pattern would normally use an External ID field on Contact; kept
    // simple here as a straight create against the standard Contact object.
    const res = await this.restRequest(creds, "POST", "/sobjects/Contact", {
      Email: donor.email,
      FirstName: donor.firstName,
      LastName: donor.lastName,
    });
    return { externalId: res.id };
  }

  async pushDonation(credentials: unknown, donation: DonationPayload): Promise<ConnectorPushResult> {
    const creds = credentials as SalesforceCredentials;
    if (creds.mock) {
      return { externalId: `sf_mock_opportunity_${randomUUID()}` };
    }

    // donation.donorExternalId (the synced Contact id) isn't wired in here:
    // linking a Contact to an Opportunity requires either an AccountId
    // (Opportunity has no ContactId field) or an OpportunityContactRole
    // junction record, and the right shape depends on whether the org uses
    // NPSP households, person accounts, or plain business accounts. Left
    // unset rather than guessing at a data model this scaffold can't know.
    const res = await this.restRequest(creds, "POST", "/sobjects/Opportunity", {
      Name: donation.campaignTitle ?? `Donation from ${donation.donorFirstName} ${donation.donorLastName}`,
      Amount: donation.amount,
      CloseDate: donation.donatedAt.slice(0, 10),
      StageName: "Closed Won",
    });
    return { externalId: res.id };
  }

  async pushVolunteerHour(credentials: unknown, hour: VolunteerHourPayload): Promise<ConnectorPushResult> {
    const creds = credentials as SalesforceCredentials;
    if (creds.mock) {
      return { externalId: `sf_mock_task_${randomUUID()}` };
    }

    // Nonprofit Success Pack tracks volunteer time as a custom object in
    // most orgs; a Task against the Contact is the closest standard-object
    // equivalent without assuming a particular NPSP package version.
    const res = await this.restRequest(creds, "POST", "/sobjects/Task", {
      Subject: hour.opportunityTitle ? `Volunteering: ${hour.opportunityTitle}` : "Volunteering",
      ActivityDate: hour.dateOfService.slice(0, 10),
      Description: `${hour.hours} hours logged by ${hour.volunteerFirstName} ${hour.volunteerLastName}`,
      Status: "Completed",
    });
    return { externalId: res.id };
  }

  private async restRequest(
    creds: SalesforceCredentials,
    method: string,
    path: string,
    body: Record<string, unknown>,
  ): Promise<{ id: string }> {
    const res = await fetch(`${creds.instanceUrl}/services/data/${API_VERSION}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${creds.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`Salesforce API request failed: ${res.status} ${await res.text()}`);
    }

    return res.json() as Promise<{ id: string }>;
  }
}
