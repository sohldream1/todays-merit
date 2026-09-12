// Shared enums and DTOs used by both apps/web and apps/api.
// Keep these in sync with apps/api/prisma/schema.prisma.

// "race_director" is scoped down: manages only race/competition-category
// opportunities for one org and awards "competition" badges — not the org
// profile, campaigns, other badges, swag, or integrations.
export type AccountRole = "member" | "org_admin" | "platform_admin" | "race_director";

export type CauseArea =
  | "community"
  | "faith"
  | "youth"
  | "health"
  | "environment"
  | "arts_education"
  | "other";

export type VerificationStatus = "unverified" | "pending" | "verified" | "rejected";

export type SubscriptionTier = "starter" | "growth" | "professional" | "enterprise";

export type OrgAdminRole = "owner" | "admin" | "editor" | "race_director";

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profilePhotoUrl: string | null;
  role: AccountRole;
  organizationId: string | null;
}

export interface SignupMemberInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  // Must be true — enforced server-side too. See TermsPage/PrivacyPage.
  agreedToTerms: boolean;
}

export interface SignupNonprofitInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  agreedToTerms: boolean;
  organization: {
    name: string;
    ein: string;
    missionStatement?: string;
    websiteUrl?: string;
    causeArea: CauseArea;
    city: string;
    state: string;
    country: string;
  };
}

// Unlike nonprofit signup, this attaches to an EXISTING organization rather
// than creating a new one — a director represents an org that's already on
// the platform.
export interface SignupRaceDirectorInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationId: string;
  agreedToTerms: boolean;
}

export interface LoginInput {
  email: string;
  password: string;
}

export type GuideStarSealLevel = "platinum" | "gold" | "silver" | "bronze" | "none";

export interface CharityRating {
  charityNavigatorStars: number | null;
  charityNavigatorScore: number | null;
  charityNavigatorUrl: string | null;
  guideStarSealLevel: GuideStarSealLevel | null;
  guideStarUrl: string | null;
  // True if either rating was filled in without a real API key configured
  // (i.e. simulated) — the UI should label these clearly, same as the CRM
  // integrations' mock-mode banners.
  isMock: boolean;
}

export interface Organization {
  id: string;
  name: string;
  ein: string;
  missionStatement: string | null;
  websiteUrl: string | null;
  logoUrl: string | null;
  causeArea: CauseArea;
  city: string | null;
  state: string | null;
  country: string | null;
  verificationStatus: VerificationStatus;
  // Set by a platform admin on rejection (what to fix before resubmitting);
  // cleared automatically when the org resubmits for review.
  verificationNotes: string | null;
  subscriptionTier: SubscriptionTier;
  rating: CharityRating | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationFilters {
  q?: string;
  causeArea?: CauseArea;
  city?: string;
  state?: string;
  country?: string;
}

// No verificationStatus here — an org can never set its own status. See
// SubmitVerificationInput / ReviewVerificationInput for the real workflow.
export interface UpdateOrganizationInput {
  name?: string;
  missionStatement?: string;
  websiteUrl?: string;
  logoUrl?: string;
  causeArea?: CauseArea;
  city?: string;
  state?: string;
  country?: string;
}

export type VerificationDecision = "verified" | "rejected";

export interface ReviewVerificationInput {
  decision: VerificationDecision;
  // Required when rejecting (what the org needs to fix); optional context
  // when approving.
  notes?: string;
}

// A teammate already on the org's account. Excludes race_director rows —
// those come from the separate race-director signup flow, not the team
// invite flow, and aren't managed from the team page.
export interface TeamMember {
  id: string;
  role: Exclude<OrgAdminRole, "race_director">;
  joinedAt: string;
  user: { id: string; firstName: string; lastName: string; email: string };
}

// A pending invite that hasn't been accepted yet.
export interface TeamInvite {
  id: string;
  email: string;
  createdAt: string;
  expiresAt: string;
}

export interface TeamOverview {
  members: TeamMember[];
  invites: TeamInvite[];
  // The current viewer's own role in this org — only "owner" can invite or
  // remove teammates; the UI uses this to show/hide those controls.
  currentUserRole: Exclude<OrgAdminRole, "race_director">;
}

export interface InviteTeammateInput {
  email: string;
}

// What the accept-invite page shows before the recipient has created an
// account — deliberately minimal (no organization details beyond the name).
export interface OrgInviteDetails {
  organizationName: string;
  email: string;
}

export interface AcceptOrgInviteInput {
  firstName: string;
  lastName: string;
  password: string;
  agreedToTerms: boolean;
}

export type OpportunityStatus = "open" | "closed";

// "volunteer" is the default/original kind (an open-ended position at an
// org); "race" and "competition" reuse the exact same fields — location
// doubles as a course/venue, startDate/endDate as race day or a challenge
// window — rather than carrying their own dedicated schema.
export type OpportunityCategory = "volunteer" | "race" | "competition";

export type SignupStatus = "signed_up" | "confirmed" | "completed" | "cancelled";

export interface VolunteerOpportunity {
  id: string;
  organizationId: string;
  title: string;
  description: string | null;
  location: string | null;
  isRemote: boolean;
  startDate: string | null;
  endDate: string | null;
  status: OpportunityStatus;
  category: OpportunityCategory;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOpportunityInput {
  organizationId: string;
  title: string;
  description?: string;
  location?: string;
  isRemote?: boolean;
  startDate?: string;
  endDate?: string;
  category?: OpportunityCategory;
}

export interface UpdateOpportunityInput {
  title?: string;
  description?: string;
  location?: string;
  isRemote?: boolean;
  startDate?: string;
  endDate?: string;
  status?: OpportunityStatus;
  category?: OpportunityCategory;
}

// One row of a competition's standings — ranked by verified hours only
// (self-reported hours aren't counted, since they're unverified and the
// whole point of a competition is a trustworthy "who's winning"). Ties
// share a rank, sports-style (1, 2, 2, 4), rather than breaking arbitrarily.
export interface LeaderboardEntry {
  rank: number;
  user: { id: string; firstName: string; lastName: string };
  verifiedHours: number;
}

export interface Leaderboard {
  opportunity: { id: string; title: string };
  entries: LeaderboardEntry[];
}

export interface VolunteerSignup {
  id: string;
  userId: string;
  opportunityId: string;
  status: SignupStatus;
  createdAt: string;
}

export interface MySignup extends VolunteerSignup {
  opportunity: {
    id: string;
    title: string;
    startDate: string | null;
    endDate: string | null;
    organization: {
      id: string;
      name: string;
    };
  };
}

// The org-admin/race-director view of "who signed up" for one opportunity.
export interface OpportunityParticipant extends VolunteerSignup {
  user: { id: string; firstName: string; lastName: string; email: string };
}

// Every signup across the org, for reporting — includes which opportunity
// it was for and (unlike OpportunityParticipant) cancelled signups too.
export interface OrgSignup extends VolunteerSignup {
  opportunity: { id: string; title: string; category: OpportunityCategory };
  user: { id: string; firstName: string; lastName: string; email: string };
}

export type HourVerificationStatus = "self_reported" | "verified_by_org";

export interface VolunteerHour {
  id: string;
  userId: string;
  organizationId: string;
  opportunityId: string | null;
  hours: number;
  dateOfService: string;
  verificationStatus: HourVerificationStatus;
  createdAt: string;
}

export interface LogHoursInput {
  opportunityId: string;
  hours: number;
  dateOfService: string;
}

export interface MyVolunteerHour extends VolunteerHour {
  opportunity: { id: string; title: string } | null;
  organization: { id: string; name: string };
}

export interface OrgVolunteerHour extends VolunteerHour {
  opportunity: { id: string; title: string } | null;
  user: { id: string; firstName: string; lastName: string };
}

export interface OpportunitySearchFilters {
  q?: string;
  causeArea?: CauseArea;
  city?: string;
  isRemote?: boolean;
  category?: OpportunityCategory;
}

export interface OpportunitySearchResult extends VolunteerOpportunity {
  organization: {
    id: string;
    name: string;
    causeArea: CauseArea;
    city: string | null;
    state: string | null;
    rating: CharityRating | null;
  };
}

export type CampaignStatus = "draft" | "active" | "completed" | "cancelled";

export type PaymentStatus = "pending" | "completed" | "refunded";

export interface Campaign {
  id: string;
  organizationId: string;
  title: string;
  description: string | null;
  goalAmount: number;
  amountRaised: number;
  startDate: string | null;
  endDate: string | null;
  status: CampaignStatus;
}

export interface CreateCampaignInput {
  organizationId: string;
  title: string;
  description?: string;
  goalAmount: number;
  startDate?: string;
  endDate?: string;
}

export interface UpdateCampaignInput {
  title?: string;
  description?: string;
  goalAmount?: number;
  startDate?: string;
  endDate?: string;
  status?: CampaignStatus;
}

export interface Donation {
  id: string;
  userId: string;
  organizationId: string;
  campaignId: string | null;
  amount: number;
  donatedAt: string;
  paymentStatus: PaymentStatus;
  stripePaymentId: string | null;
}

export interface CreateDonationInput {
  amount: number;
}

export interface MyDonation extends Donation {
  campaign: { id: string; title: string } | null;
  organization: { id: string; name: string };
}

export interface OrgDonation extends Donation {
  campaign: { id: string; title: string } | null;
  user: { id: string; firstName: string; lastName: string };
}

export type BadgeType = "volunteer_milestone" | "donation_milestone" | "competition" | "custom";

// "manual" means no automatic threshold — the badge is only ever awarded by
// an org admin explicitly picking a recipient (competition wins, one-off
// recognition). evaluateOrgBadges skips these entirely.
export type BadgeCriteriaType = "hours" | "donation_total" | "manual";

export interface BadgeCriteria {
  type: BadgeCriteriaType;
  threshold: number;
}

export interface Badge {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
  badgeType: BadgeType;
  criteria: BadgeCriteria;
  // The owning org's own logo, so the badge medal can be rendered branded
  // with it — included here rather than requiring a separate org fetch.
  organizationLogoUrl: string | null;
}

export interface CreateBadgeInput {
  organizationId: string;
  name: string;
  description?: string;
  iconUrl?: string;
  badgeType: BadgeType;
  criteria: BadgeCriteria;
}

export interface UpdateBadgeInput {
  name?: string;
  description?: string;
  iconUrl?: string;
  badgeType?: BadgeType;
  criteria?: BadgeCriteria;
}

export interface BadgeRecipientCandidate {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface AwardBadgeInput {
  recipientUserId: string;
}

export interface MyBadge {
  id: string;
  awardedAt: string;
  badge: { id: string; name: string; description: string | null; iconUrl: string | null; badgeType: BadgeType };
  organization: { id: string; name: string; logoUrl: string | null };
}

export interface Tier {
  id: string;
  organizationId: string | null;
  name: string;
  rankOrder: number;
  criteria: BadgeCriteria;
}

export interface MyTierStatus {
  currentTier: Tier | null;
  nextTier: Tier | null;
  totalHours: number;
  tiers: Tier[];
}

export type IntegrationProvider = "salesforce" | "raisers_edge_nxt" | "gofundme_pro" | "swag_com";

export type IntegrationStatus = "disconnected" | "connected" | "error";

export type SyncEntityType = "donor" | "donation" | "volunteer_hour";

export type SyncStatus = "pending" | "synced" | "failed";

export interface OrgIntegration {
  id: string;
  organizationId: string;
  provider: IntegrationProvider;
  status: IntegrationStatus;
  // True when this connection is running against mocked API responses
  // rather than a real CRM (no client credentials configured server-side).
  isMock: boolean;
  // False when this provider has no connector implementation yet
  // (e.g. Raiser's Edge NXT, GoFundMe Pro — connect/sync are disabled).
  isAvailable: boolean;
  externalOrgLabel: string | null;
  connectedAt: string | null;
  lastSyncAt: string | null;
  lastError: string | null;
}

export interface IntegrationSyncRecord {
  id: string;
  entityType: SyncEntityType;
  localId: string;
  externalId: string | null;
  status: SyncStatus;
  errorMessage: string | null;
  syncedAt: string | null;
  createdAt: string;
}

export interface MyInterests {
  causeAreaInterests: CauseArea[];
}

export interface UpdateInterestsInput {
  causeAreaInterests: CauseArea[];
}

export interface CharityRecommendation {
  organization: Organization;
  reason: string;
  matchScore: number;
}

export interface RecommendationsResult {
  recommendations: CharityRecommendation[];
  // True only when a real LLM call produced these — false for the
  // rule-based fallback used when no AI provider key is configured.
  isAiGenerated: boolean;
}

export interface MyAddress {
  shippingName: string | null;
  shippingAddressLine1: string | null;
  shippingAddressLine2: string | null;
  shippingCity: string | null;
  shippingState: string | null;
  shippingPostalCode: string | null;
  shippingCountry: string | null;
  // True once every field required to ship something (name, line1, city,
  // postal code, country) is filled in.
  isComplete: boolean;
}

export interface UpdateAddressInput {
  shippingName?: string;
  shippingAddressLine1?: string;
  shippingAddressLine2?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingPostalCode?: string;
  shippingCountry?: string;
}

export type SwagOrderStatus = "pending" | "submitted" | "shipped" | "delivered" | "failed" | "cancelled";

// Rules only ever use badge_awarded/tier_reached — "manual" is not a valid
// rule trigger, enforced at the application layer.
export type SwagTriggerType = "manual" | "badge_awarded" | "tier_reached";

export interface SwagProduct {
  id: string;
  organizationId: string;
  externalProductId: string | null;
  name: string;
  description: string | null;
  imageUrl: string | null;
  category: string | null;
  sizes: string[];
  unitCost: number;
  currency: string;
  isArchived: boolean;
  createdAt: string;
}

export interface CreateSwagProductInput {
  organizationId: string;
  name: string;
  description?: string;
  imageUrl?: string;
  category?: string;
  sizes?: string[];
  unitCost: number;
  currency?: string;
}

export interface UpdateSwagProductInput {
  name?: string;
  description?: string;
  imageUrl?: string;
  category?: string;
  sizes?: string[];
  unitCost?: number;
  currency?: string;
  isArchived?: boolean;
}

export interface SwagOrder {
  id: string;
  size: string | null;
  quantity: number;
  status: SwagOrderStatus;
  triggerType: SwagTriggerType;
  shipTo: {
    name: string;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string | null;
    postalCode: string;
    country: string;
  };
  externalOrderId: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  lastError: string | null;
  createdAt: string;
  product: { id: string; name: string; imageUrl: string | null };
  recipient: { id: string; firstName: string; lastName: string; email: string };
}

export interface MySwagOrder extends SwagOrder {
  organization: { id: string; name: string };
}

export interface CreateSwagOrderInput {
  swagProductId: string;
  recipientUserId: string;
  size?: string;
  quantity?: number;
}

export interface SwagRecipientCandidate {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  hasAddress: boolean;
}

export interface SwagAutoRule {
  id: string;
  triggerType: Exclude<SwagTriggerType, "manual">;
  size: string | null;
  quantity: number;
  isActive: boolean;
  product: { id: string; name: string };
  badge: { id: string; name: string } | null;
  tier: { id: string; name: string } | null;
}

export interface CreateSwagAutoRuleInput {
  swagProductId: string;
  triggerType: Exclude<SwagTriggerType, "manual">;
  badgeId?: string;
  tierId?: string;
  size?: string;
  quantity?: number;
}

export interface UpdateSwagAutoRuleInput {
  size?: string;
  quantity?: number;
  isActive?: boolean;
}
