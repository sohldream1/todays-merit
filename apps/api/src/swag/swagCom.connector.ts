import { randomUUID } from "node:crypto";
import { env } from "../lib/env.js";
import type {
  ExchangedSwagCredentials,
  SwagCatalogProduct,
  SwagConnector,
  SwagOrderRequest,
  SwagOrderResult,
} from "./types.js";

interface SwagComCredentials {
  apiKey: string;
  mock?: boolean;
}

const API_BASE = env.swagCom.apiUrl;

const MOCK_CATALOG: SwagCatalogProduct[] = [
  {
    externalProductId: "swagcom_mock_tee",
    name: "Classic Logo T-Shirt",
    description: "Soft cotton tee with your org's logo, one color print.",
    imageUrl: null,
    category: "apparel",
    sizes: ["S", "M", "L", "XL", "XXL"],
    unitCost: 14.5,
    currency: "USD",
  },
  {
    externalProductId: "swagcom_mock_mug",
    name: "Ceramic Coffee Mug",
    description: "11oz ceramic mug, full-color wrap print.",
    imageUrl: null,
    category: "drinkware",
    sizes: [],
    unitCost: 9.0,
    currency: "USD",
  },
  {
    externalProductId: "swagcom_mock_totebag",
    name: "Canvas Tote Bag",
    description: "Heavy canvas tote, single-color print.",
    imageUrl: null,
    category: "bags",
    sizes: [],
    unitCost: 11.75,
    currency: "USD",
  },
  {
    externalProductId: "swagcom_mock_hoodie",
    name: "Pullover Hoodie",
    description: "Fleece-lined hoodie with embroidered logo.",
    imageUrl: null,
    category: "apparel",
    sizes: ["S", "M", "L", "XL", "XXL"],
    unitCost: 32.0,
    currency: "USD",
  },
  {
    externalProductId: "swagcom_mock_waterbottle",
    name: "Stainless Steel Water Bottle",
    description: "20oz insulated bottle, laser-etched logo.",
    imageUrl: null,
    category: "drinkware",
    sizes: [],
    unitCost: 18.25,
    currency: "USD",
  },
];

// Real Swag.com integration, server-wide credentials like the Classy
// connector (a single deployment-wide app, not per-org OAuth) — activates
// automatically when SWAG_COM_API_KEY isn't configured. The real-mode
// endpoints below follow Swag.com's general REST conventions but haven't
// been run against the live API; confirm paths/payload shapes against
// Swag.com's developer docs before enabling.
export class SwagComConnector implements SwagConnector {
  get isMock(): boolean {
    return !env.swagCom.apiKey;
  }

  async connect(): Promise<ExchangedSwagCredentials> {
    if (this.isMock) {
      const credentials: SwagComCredentials = { apiKey: `mock_${randomUUID()}`, mock: true };
      return { credentials, externalOrgLabel: "Mock Swag.com Store (no real connection)" };
    }

    const res = await fetch(`${API_BASE}/account`, {
      headers: { Authorization: `Bearer ${env.swagCom.apiKey}` },
    });
    if (!res.ok) {
      throw new Error(`Swag.com account check failed: ${res.status} ${await res.text()}`);
    }
    const account = (await res.json()) as { store_name?: string };

    const credentials: SwagComCredentials = { apiKey: env.swagCom.apiKey! };
    return { credentials, externalOrgLabel: account.store_name ?? "Swag.com Store" };
  }

  async listCatalog(credentials: unknown): Promise<SwagCatalogProduct[]> {
    const creds = credentials as SwagComCredentials;
    if (creds.mock) return MOCK_CATALOG;

    const res = await fetch(`${API_BASE}/products`, {
      headers: { Authorization: `Bearer ${creds.apiKey}` },
    });
    if (!res.ok) {
      throw new Error(`Swag.com catalog fetch failed: ${res.status} ${await res.text()}`);
    }
    const body = (await res.json()) as {
      products: Array<{
        id: string;
        name: string;
        description: string | null;
        image_url: string | null;
        category: string | null;
        sizes: string[];
        unit_cost: number;
        currency: string;
      }>;
    };

    return body.products.map((p) => ({
      externalProductId: p.id,
      name: p.name,
      description: p.description,
      imageUrl: p.image_url,
      category: p.category,
      sizes: p.sizes ?? [],
      unitCost: p.unit_cost,
      currency: p.currency,
    }));
  }

  async createOrder(credentials: unknown, order: SwagOrderRequest): Promise<SwagOrderResult> {
    const creds = credentials as SwagComCredentials;
    if (creds.mock) {
      return {
        externalId: `swagcom_mock_order_${randomUUID()}`,
        status: "shipped",
        trackingNumber: `MOCK${randomUUID().slice(0, 8).toUpperCase()}`,
        trackingUrl: null,
      };
    }

    const res = await fetch(`${API_BASE}/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${creds.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        idempotency_key: order.localOrderId,
        product_id: order.externalProductId,
        size: order.size,
        quantity: order.quantity,
        ship_to: {
          name: order.shipTo.name,
          address_line1: order.shipTo.addressLine1,
          address_line2: order.shipTo.addressLine2,
          city: order.shipTo.city,
          state: order.shipTo.state,
          postal_code: order.shipTo.postalCode,
          country: order.shipTo.country,
        },
      }),
    });
    if (!res.ok) {
      throw new Error(`Swag.com order failed: ${res.status} ${await res.text()}`);
    }
    const body = (await res.json()) as {
      id: string;
      status: string;
      tracking_number: string | null;
      tracking_url: string | null;
    };

    return {
      externalId: body.id,
      status: body.status === "shipped" ? "shipped" : "submitted",
      trackingNumber: body.tracking_number,
      trackingUrl: body.tracking_url,
    };
  }
}
