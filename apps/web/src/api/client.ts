import type {
  AuthUser,
  AwardBadgeInput,
  Badge,
  BadgeRecipientCandidate,
  Campaign,
  CreateBadgeInput,
  CreateCampaignInput,
  CreateDonationInput,
  CreateOpportunityInput,
  CreateSwagAutoRuleInput,
  CreateSwagOrderInput,
  CreateSwagProductInput,
  Donation,
  HourVerificationStatus,
  IntegrationProvider,
  IntegrationSyncRecord,
  LoginInput,
  LogHoursInput,
  MyAddress,
  MyBadge,
  MyDonation,
  MyInterests,
  MySignup,
  MySwagOrder,
  MyTierStatus,
  MyVolunteerHour,
  Organization,
  OrganizationFilters,
  OpportunityParticipant,
  OpportunitySearchFilters,
  OpportunitySearchResult,
  OrgDonation,
  OrgIntegration,
  OrgVolunteerHour,
  RecommendationsResult,
  SignupMemberInput,
  SignupNonprofitInput,
  SignupRaceDirectorInput,
  SwagAutoRule,
  SwagOrder,
  SwagProduct,
  SwagRecipientCandidate,
  Tier,
  UpdateAddressInput,
  UpdateBadgeInput,
  UpdateCampaignInput,
  UpdateInterestsInput,
  UpdateOpportunityInput,
  UpdateOrganizationInput,
  UpdateSwagAutoRuleInput,
  UpdateSwagProductInput,
  VolunteerHour,
  VolunteerOpportunity,
  VolunteerSignup,
} from "@todays-merit/shared-types";

const API_BASE = "/api";

class ApiClientError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiClientError(res.status, body.error ?? "Request failed");
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

export const authApi = {
  signupMember: (input: SignupMemberInput) =>
    request<{ user: AuthUser }>("/auth/signup/member", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  signupNonprofit: (input: SignupNonprofitInput) =>
    request<{ user: AuthUser }>("/auth/signup/nonprofit", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  signupRaceDirector: (input: SignupRaceDirectorInput) =>
    request<{ user: AuthUser }>("/auth/signup/race-director", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  login: (input: LoginInput) =>
    request<{ user: AuthUser }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  logout: () => request<void>("/auth/logout", { method: "POST" }),

  me: () => request<{ user: AuthUser }>("/auth/me"),
};

export const organizationsApi = {
  list: (filters: OrganizationFilters = {}) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value) params.set(key, value);
    }
    const qs = params.toString();
    return request<{ organizations: Organization[] }>(`/organizations${qs ? `?${qs}` : ""}`);
  },

  get: (id: string) => request<{ organization: Organization }>(`/organizations/${id}`),

  update: (id: string, input: UpdateOrganizationInput) =>
    request<{ organization: Organization }>(`/organizations/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
};

export const opportunitiesApi = {
  search: (filters: OpportunitySearchFilters = {}) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== "") params.set(key, String(value));
    }
    const qs = params.toString();
    return request<{ opportunities: OpportunitySearchResult[] }>(`/opportunities${qs ? `?${qs}` : ""}`);
  },

  listForOrganization: (organizationId: string, status?: "open" | "closed") => {
    const qs = status ? `?status=${status}` : "";
    return request<{ opportunities: VolunteerOpportunity[] }>(
      `/organizations/${organizationId}/opportunities${qs}`,
    );
  },

  get: (id: string) => request<{ opportunity: VolunteerOpportunity }>(`/opportunities/${id}`),

  create: (input: CreateOpportunityInput) =>
    request<{ opportunity: VolunteerOpportunity }>("/opportunities", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  update: (id: string, input: UpdateOpportunityInput) =>
    request<{ opportunity: VolunteerOpportunity }>(`/opportunities/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),

  signUp: (id: string) =>
    request<{ signup: VolunteerSignup }>(`/opportunities/${id}/signup`, { method: "POST" }),

  cancelSignup: (id: string) =>
    request<{ signup: VolunteerSignup }>(`/opportunities/${id}/signup`, { method: "DELETE" }),

  listSignups: (id: string) =>
    request<{ participants: OpportunityParticipant[] }>(`/opportunities/${id}/signups`),
};

export const volunteerHoursApi = {
  log: (input: LogHoursInput) =>
    request<{ hour: VolunteerHour }>("/volunteer-hours", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  listForOrganization: (organizationId: string) =>
    request<{ hours: OrgVolunteerHour[] }>(`/organizations/${organizationId}/volunteer-hours`),

  verify: (id: string, verificationStatus: HourVerificationStatus) =>
    request<{ hour: VolunteerHour }>(`/volunteer-hours/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ verificationStatus }),
    }),
};

export const campaignsApi = {
  listForOrganization: (organizationId: string, status?: Campaign["status"]) => {
    const qs = status ? `?status=${status}` : "";
    return request<{ campaigns: Campaign[] }>(`/organizations/${organizationId}/campaigns${qs}`);
  },

  get: (id: string) => request<{ campaign: Campaign }>(`/campaigns/${id}`),

  create: (input: CreateCampaignInput) =>
    request<{ campaign: Campaign }>("/campaigns", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  update: (id: string, input: UpdateCampaignInput) =>
    request<{ campaign: Campaign }>(`/campaigns/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),

  donate: (id: string, input: CreateDonationInput) =>
    request<{ donation: Donation }>(`/campaigns/${id}/donations`, {
      method: "POST",
      body: JSON.stringify(input),
    }),

  listDonationsForOrganization: (organizationId: string) =>
    request<{ donations: OrgDonation[] }>(`/organizations/${organizationId}/donations`),
};

export const badgesApi = {
  listForOrganization: (organizationId: string) =>
    request<{ badges: Badge[] }>(`/organizations/${organizationId}/badges`),

  create: (input: CreateBadgeInput) =>
    request<{ badge: Badge }>("/badges", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  update: (id: string, input: UpdateBadgeInput) =>
    request<{ badge: Badge }>(`/badges/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),

  listRecipients: (organizationId: string) =>
    request<{ recipients: BadgeRecipientCandidate[] }>(`/organizations/${organizationId}/badges/recipients`),

  award: (id: string, input: AwardBadgeInput) =>
    request<{ awarded: boolean }>(`/badges/${id}/award`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
};

export const integrationsApi = {
  listForOrganization: (organizationId: string) =>
    request<{ integrations: OrgIntegration[] }>(`/organizations/${organizationId}/integrations`),

  connect: (organizationId: string, provider: IntegrationProvider, code?: string) =>
    request<{ integration: OrgIntegration | null; authorizationUrl: string | null }>(
      `/organizations/${organizationId}/integrations/${provider}/connect`,
      { method: "POST", body: JSON.stringify({ code }) },
    ),

  disconnect: (organizationId: string, provider: IntegrationProvider) =>
    request<{ integration: OrgIntegration }>(`/organizations/${organizationId}/integrations/${provider}`, {
      method: "DELETE",
    }),

  syncNow: (organizationId: string, provider: IntegrationProvider) =>
    request<{ integration: OrgIntegration }>(
      `/organizations/${organizationId}/integrations/${provider}/sync`,
      { method: "POST" },
    ),

  syncLogs: (organizationId: string, provider: IntegrationProvider) =>
    request<{ syncRecords: IntegrationSyncRecord[] }>(
      `/organizations/${organizationId}/integrations/${provider}/sync-logs`,
    ),
};

export const meApi = {
  signups: () => request<{ signups: MySignup[] }>("/me/signups"),
  hours: () => request<{ hours: MyVolunteerHour[] }>("/me/hours"),
  donations: () => request<{ donations: MyDonation[] }>("/me/donations"),
  badges: () => request<{ badges: MyBadge[] }>("/me/badges"),
  tier: () => request<MyTierStatus>("/me/tier"),
  interests: () => request<MyInterests>("/me/interests"),
  updateInterests: (input: UpdateInterestsInput) =>
    request<MyInterests>("/me/interests", { method: "PATCH", body: JSON.stringify(input) }),
  recommendations: () => request<RecommendationsResult>("/me/recommendations"),
  address: () => request<MyAddress>("/me/address"),
  updateAddress: (input: UpdateAddressInput) =>
    request<MyAddress>("/me/address", { method: "PATCH", body: JSON.stringify(input) }),
  swag: () => request<{ orders: MySwagOrder[] }>("/me/swag"),
};

export const tiersApi = {
  list: () => request<{ tiers: Tier[] }>("/tiers"),
};

export const swagApi = {
  listProducts: (organizationId: string) =>
    request<{ products: SwagProduct[] }>(`/organizations/${organizationId}/swag/products`),

  createProduct: (input: CreateSwagProductInput) =>
    request<{ product: SwagProduct }>("/swag/products", { method: "POST", body: JSON.stringify(input) }),

  updateProduct: (id: string, input: UpdateSwagProductInput) =>
    request<{ product: SwagProduct }>(`/swag/products/${id}`, { method: "PATCH", body: JSON.stringify(input) }),

  listRecipients: (organizationId: string) =>
    request<{ recipients: SwagRecipientCandidate[] }>(`/organizations/${organizationId}/swag/recipients`),

  listOrders: (organizationId: string) =>
    request<{ orders: SwagOrder[] }>(`/organizations/${organizationId}/swag/orders`),

  createOrder: (organizationId: string, input: CreateSwagOrderInput) =>
    request<{ order: SwagOrder }>(`/organizations/${organizationId}/swag/orders`, {
      method: "POST",
      body: JSON.stringify(input),
    }),

  listAutoRules: (organizationId: string) =>
    request<{ rules: SwagAutoRule[] }>(`/organizations/${organizationId}/swag/auto-rules`),

  createAutoRule: (organizationId: string, input: CreateSwagAutoRuleInput) =>
    request<{ rule: SwagAutoRule }>(`/organizations/${organizationId}/swag/auto-rules`, {
      method: "POST",
      body: JSON.stringify(input),
    }),

  updateAutoRule: (id: string, input: UpdateSwagAutoRuleInput) =>
    request<{ rule: SwagAutoRule }>(`/swag/auto-rules/${id}`, { method: "PATCH", body: JSON.stringify(input) }),

  getIntegration: (organizationId: string) =>
    request<{ integration: OrgIntegration }>(`/organizations/${organizationId}/swag/integration`),

  connectIntegration: (organizationId: string) =>
    request<{ integration: OrgIntegration }>(`/organizations/${organizationId}/swag/integration/connect`, {
      method: "POST",
    }),

  disconnectIntegration: (organizationId: string) =>
    request<{ integration: OrgIntegration }>(`/organizations/${organizationId}/swag/integration`, {
      method: "DELETE",
    }),

  importCatalog: (organizationId: string) =>
    request<{ products: SwagProduct[] }>(`/organizations/${organizationId}/swag/integration/import`, {
      method: "POST",
    }),
};

export { ApiClientError };
