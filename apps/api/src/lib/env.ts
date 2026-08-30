import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  cookieName: process.env.COOKIE_NAME ?? "tm_session",
  port: Number(process.env.PORT ?? 4000),
  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
  isProduction: process.env.NODE_ENV === "production",

  integrationsEncryptionKey: required("INTEGRATIONS_ENCRYPTION_KEY"),

  // Real Salesforce Connected App credentials. When absent, the Salesforce
  // connector runs in mock mode (no live API calls).
  salesforce: {
    clientId: process.env.SALESFORCE_CLIENT_ID || null,
    clientSecret: process.env.SALESFORCE_CLIENT_SECRET || null,
    redirectUri: process.env.SALESFORCE_REDIRECT_URI || null,
  },

  // Real Blackbaud SKY API app credentials (Raiser's Edge NXT). The
  // subscription key is issued per developer application, not per connected
  // org, so — like client id/secret — it lives here rather than in each
  // org's stored credentials. When any of these are absent, the connector
  // runs in mock mode (no live API calls).
  raisersEdge: {
    clientId: process.env.BLACKBAUD_CLIENT_ID || null,
    clientSecret: process.env.BLACKBAUD_CLIENT_SECRET || null,
    subscriptionKey: process.env.BLACKBAUD_SUBSCRIPTION_KEY || null,
    redirectUri: process.env.BLACKBAUD_REDIRECT_URI || null,
  },

  // Real Classy (GoFundMe Pro) API app credentials. Classy authenticates
  // server-to-server via OAuth2 client_credentials — no per-admin consent
  // redirect — so there's no redirectUri here, and organizationId identifies
  // which Classy org this deployment's app credentials talk to (Classy apps
  // are typically provisioned per organization, not multi-tenant). When any
  // of these are absent, the connector runs in mock mode.
  classy: {
    clientId: process.env.GOFUNDME_CLASSY_CLIENT_ID || null,
    clientSecret: process.env.GOFUNDME_CLASSY_CLIENT_SECRET || null,
    organizationId: process.env.GOFUNDME_CLASSY_ORGANIZATION_ID || null,
    // Until per-campaign Classy id mapping exists, donations sync to this
    // one campaign. Not required for mock mode.
    defaultCampaignId: process.env.GOFUNDME_CLASSY_DEFAULT_CAMPAIGN_ID || null,
  },

  // Real Charity Navigator API key. When absent, ratings are simulated
  // (deterministically, from the org's EIN, so they stay stable across
  // lookups rather than re-randomizing on every call).
  charityNavigator: {
    apiKey: process.env.CHARITY_NAVIGATOR_API_KEY || null,
    // GraphQL endpoint per Charity Navigator's current developer docs —
    // confirm against https://developer.charitynavigator.org/ before
    // enabling real mode, API surface has changed over the product's
    // history and this scaffold hasn't been run against it live.
    apiUrl: process.env.CHARITY_NAVIGATOR_API_URL || "https://data.charitynavigator.org/graphql",
  },

  // Real Candid (GuideStar) API credentials — the Premier API is what
  // exposes Seal of Transparency level by EIN. When absent, ratings are
  // simulated. Confirm base URL/header name against
  // https://developer.candid.org/ before enabling real mode.
  guideStar: {
    apiKey: process.env.CANDID_API_KEY || null,
    apiUrl: process.env.CANDID_API_URL || "https://api.candid.org/premier/v3",
  },

  // Real Swag.com API credentials, server-wide like Classy's (a single
  // deployment-wide app, not per-org OAuth). When absent, the swag
  // fulfillment connector runs in mock mode: catalog import returns a
  // canned sample catalog and every order comes back "shipped" instantly
  // with a fake tracking number. Confirm base URL/auth header against
  // Swag.com's own developer docs before enabling real mode.
  swagCom: {
    apiKey: process.env.SWAG_COM_API_KEY || null,
    apiUrl: process.env.SWAG_COM_API_URL || "https://api.swag.com/v1",
  },

  // Real Anthropic API key for AI-generated charity recommendations. This
  // is the user's own key for their own Anthropic account/billing — never
  // assume ambient access just because this app happens to be built with
  // Claude Code. When absent, recommendations fall back to a transparent
  // rule-based match on cause area and rating instead of failing.
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || null,
    model: process.env.ANTHROPIC_RECOMMENDATIONS_MODEL || "claude-haiku-4-5-20251001",
  },
};
