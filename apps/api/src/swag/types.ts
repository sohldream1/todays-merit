// Deliberately separate from integrations/types.ts's CrmConnector — Swag.com
// is a fulfillment provider (product catalog + physical order shipping), not
// a donor CRM, and forcing it into the same push-donor/donation/hour shape
// would mean fake no-op methods and getting swept into the CRM sync loop in
// integrations/syncService.ts. Kept as its own small, parallel surface.

export interface SwagCatalogProduct {
  externalProductId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  category: string | null;
  sizes: string[];
  unitCost: number;
  currency: string;
}

export interface SwagShipTo {
  name: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string | null;
  postalCode: string;
  country: string;
}

export interface SwagOrderRequest {
  // Our own SwagOrder.id, passed through so a real API call is idempotent
  // if retried.
  localOrderId: string;
  externalProductId: string;
  size: string | null;
  quantity: number;
  shipTo: SwagShipTo;
}

export interface SwagOrderResult {
  externalId: string;
  status: "submitted" | "shipped";
  trackingNumber: string | null;
  trackingUrl: string | null;
}

export interface ExchangedSwagCredentials {
  credentials: unknown;
  externalOrgLabel: string;
}

export interface SwagConnector {
  readonly isMock: boolean;

  connect(): Promise<ExchangedSwagCredentials>;
  listCatalog(credentials: unknown): Promise<SwagCatalogProduct[]>;
  createOrder(credentials: unknown, order: SwagOrderRequest): Promise<SwagOrderResult>;
}
