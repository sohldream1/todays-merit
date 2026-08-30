import type { IntegrationProvider } from "@todays-merit/shared-types";
import { ApiError } from "../middleware/errorHandler.js";
import { ClassyConnector } from "./classy.connector.js";
import { RaisersEdgeConnector } from "./raisersEdge.connector.js";
import { SalesforceConnector } from "./salesforce.connector.js";
import type { CrmConnector } from "./types.js";

const connectors: Partial<Record<IntegrationProvider, CrmConnector>> = {
  salesforce: new SalesforceConnector(),
  raisers_edge_nxt: new RaisersEdgeConnector(),
  gofundme_pro: new ClassyConnector(),
};

export function getConnector(provider: IntegrationProvider): CrmConnector {
  const connector = connectors[provider];
  if (!connector) {
    throw new ApiError(501, `${provider} integration is not available yet`);
  }
  return connector;
}

export function isProviderAvailable(provider: IntegrationProvider): boolean {
  return provider in connectors;
}
