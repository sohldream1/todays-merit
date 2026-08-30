import { SwagComConnector } from "./swagCom.connector.js";
import type { SwagConnector } from "./types.js";

// Only one fulfillment provider today, but kept as a getter (rather than a
// bare export) to match the CRM registry's shape in integrations/registry.ts.
const connector: SwagConnector = new SwagComConnector();

export function getSwagConnector(): SwagConnector {
  return connector;
}
