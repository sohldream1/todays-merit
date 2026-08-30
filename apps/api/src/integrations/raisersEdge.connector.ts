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

interface RaisersEdgeCredentials {
  accessToken: string;
  refreshToken: string;
  environmentId?: string;
  mock?: boolean;
}

const API_BASE = "https://api.sky.blackbaud.com";

// Real Blackbaud SKY API (Raiser's Edge NXT) OAuth + REST integration, with
// the same mock-mode pattern as the Salesforce connector: it activates
// automatically when BLACKBAUD_CLIENT_ID/SECRET/SUBSCRIPTION_KEY aren't
// configured, and every push fabricates a plausible Blackbaud-style id
// instead of making a network call. Swapping to live Raiser's Edge NXT later
// is just setting the four BLACKBAUD_* env vars; no application code changes
// needed.
export class RaisersEdgeConnector implements CrmConnector {
  readonly provider = "raisers_edge_nxt" as const;
  readonly requiresRedirect = true;

  get isMock(): boolean {
    return (
      !env.raisersEdge.clientId ||
      !env.raisersEdge.clientSecret ||
      !env.raisersEdge.subscriptionKey ||
      !env.raisersEdge.redirectUri
    );
  }

  getAuthorizationUrl(state: string): string {
    if (this.isMock) {
      // Never actually navigated to — the mock "connect" flow short-circuits
      // before redirecting. Returned for API shape parity with live mode.
      return `/mock-oauth/raisers_edge_nxt?state=${encodeURIComponent(state)}`;
    }

    const params = new URLSearchParams({
      client_id: env.raisersEdge.clientId!,
      response_type: "code",
      redirect_uri: env.raisersEdge.redirectUri!,
      state,
    });
    return `https://app.blackbaud.com/oauth/authorize?${params.toString()}`;
  }

  async exchangeCodeForCredentials(code: string): Promise<ExchangedCredentials> {
    if (this.isMock) {
      const credentials: RaisersEdgeCredentials = {
        accessToken: `mock_access_${randomUUID()}`,
        refreshToken: `mock_refresh_${randomUUID()}`,
        mock: true,
      };
      return { credentials, externalOrgLabel: "Mock Raiser's Edge NXT Environment (no real connection)" };
    }

    // Blackbaud authenticates the token exchange with HTTP Basic auth
    // (client_id:client_secret), unlike Salesforce's form-body credentials.
    const basicAuth = Buffer.from(`${env.raisersEdge.clientId}:${env.raisersEdge.clientSecret}`).toString(
      "base64",
    );
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: env.raisersEdge.redirectUri!,
    });

    const res = await fetch("https://oauth2.sky.blackbaud.com/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!res.ok) {
      throw new Error(`Blackbaud token exchange failed: ${res.status} ${await res.text()}`);
    }

    const body = (await res.json()) as {
      access_token: string;
      refresh_token: string;
      environment_id?: string;
    };

    const credentials: RaisersEdgeCredentials = {
      accessToken: body.access_token,
      refreshToken: body.refresh_token,
      environmentId: body.environment_id,
    };

    return { credentials, externalOrgLabel: body.environment_id ?? "Raiser's Edge NXT" };
  }

  async pushDonor(credentials: unknown, donor: DonorPayload): Promise<ConnectorPushResult> {
    const creds = credentials as RaisersEdgeCredentials;
    if (creds.mock) {
      return { externalId: `re_mock_constituent_${randomUUID()}` };
    }

    // Real usage needs a follow-up POST to /constituent/v1/emailaddresses
    // with the returned constituent_id — the base constituent record itself
    // doesn't carry an email field. Kept out of this scaffold call for
    // brevity, same simplification the Salesforce connector makes.
    const res = await this.apiRequest(creds, "POST", "/constituent/v1/constituents", {
      type: "Individual",
      first: donor.firstName,
      last: donor.lastName,
    });
    return { externalId: res.id };
  }

  async pushDonation(credentials: unknown, donation: DonationPayload): Promise<ConnectorPushResult> {
    const creds = credentials as RaisersEdgeCredentials;
    if (creds.mock) {
      return { externalId: `re_mock_gift_${randomUUID()}` };
    }
    if (!donation.donorExternalId) {
      throw new Error("Cannot push a gift without a synced constituent id for the donor");
    }

    const res = await this.apiRequest(creds, "POST", "/gift/v1/gifts", {
      type: "Donation",
      date: donation.donatedAt.slice(0, 10),
      amount: { value: donation.amount },
      gift_status: "Active",
      constituent_id: donation.donorExternalId,
    });
    return { externalId: res.id };
  }

  async pushVolunteerHour(credentials: unknown, hour: VolunteerHourPayload): Promise<ConnectorPushResult> {
    const creds = credentials as RaisersEdgeCredentials;
    if (creds.mock) {
      return { externalId: `re_mock_action_${randomUUID()}` };
    }
    if (!hour.volunteerExternalId) {
      throw new Error("Cannot push an action without a synced constituent id for the volunteer");
    }

    // Raiser's Edge NXT's base API has no first-class volunteer-hours object
    // (that lives in Blackbaud's separate Volunteer Management product); a
    // constituent Action is the closest generic activity-tracking record.
    const res = await this.apiRequest(creds, "POST", "/constituent/v1/actions", {
      constituent_id: hour.volunteerExternalId,
      category: "Other",
      type: "Volunteer",
      date: hour.dateOfService.slice(0, 10),
      completed: true,
      summary: hour.opportunityTitle
        ? `${hour.hours} hours — ${hour.opportunityTitle}`
        : `${hour.hours} volunteer hours`,
    });
    return { externalId: res.id };
  }

  private async apiRequest(
    creds: RaisersEdgeCredentials,
    method: string,
    path: string,
    body: Record<string, unknown>,
  ): Promise<{ id: string }> {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${creds.accessToken}`,
        "Bb-Api-Subscription-Key": env.raisersEdge.subscriptionKey!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`Blackbaud API request failed: ${res.status} ${await res.text()}`);
    }

    return res.json() as Promise<{ id: string }>;
  }
}
