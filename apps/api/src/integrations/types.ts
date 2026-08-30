import type { IntegrationProvider } from "@todays-merit/shared-types";

export interface DonorPayload {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface DonationPayload {
  donationId: string;
  amount: number;
  donatedAt: string;
  donorEmail: string;
  donorFirstName: string;
  donorLastName: string;
  // The CRM's own id for this donor, from the donor sync that always runs
  // immediately before a donation/hour sync (see syncService.ts). Null only
  // if that prior sync failed — connectors should treat that as a hard
  // error rather than guessing at a donor to attach the record to.
  donorExternalId: string | null;
  campaignTitle: string | null;
}

export interface VolunteerHourPayload {
  hourId: string;
  hours: number;
  dateOfService: string;
  volunteerEmail: string;
  volunteerFirstName: string;
  volunteerLastName: string;
  volunteerExternalId: string | null;
  opportunityTitle: string | null;
}

export interface ConnectorPushResult {
  externalId: string;
}

export interface ExchangedCredentials {
  credentials: unknown;
  externalOrgLabel: string;
}

// Common surface every CRM integration implements. Push methods take the
// already-decrypted credentials for the org's connection (the caller owns
// encryption/decryption via lib/credentialCrypto.ts) and return the CRM's
// record id so we can store it on the sync record.
export interface CrmConnector {
  readonly provider: IntegrationProvider;
  readonly isMock: boolean;

  // True for user-consent OAuth flows (Salesforce, Raiser's Edge NXT) where
  // connecting means sending the browser to the provider and back. False
  // for server-to-server auth (Classy's client_credentials grant) where the
  // whole exchange happens in one request with no redirect — for those,
  // getAuthorizationUrl is never called and exchangeCodeForCredentials
  // ignores its `code` argument.
  readonly requiresRedirect: boolean;

  getAuthorizationUrl(state: string): string;
  exchangeCodeForCredentials(code: string): Promise<ExchangedCredentials>;

  pushDonor(credentials: unknown, donor: DonorPayload): Promise<ConnectorPushResult>;
  pushDonation(credentials: unknown, donation: DonationPayload): Promise<ConnectorPushResult>;
  pushVolunteerHour(credentials: unknown, hour: VolunteerHourPayload): Promise<ConnectorPushResult>;
}
