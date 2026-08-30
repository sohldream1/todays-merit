import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import type {
  Badge,
  OrgIntegration,
  SwagAutoRule,
  SwagOrder,
  SwagProduct,
  SwagRecipientCandidate,
  SwagTriggerType,
  Tier,
} from "@todays-merit/shared-types";
import { ApiClientError, badgesApi, swagApi, tiersApi } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { Button, buttonClasses, Card, EmptyState, Input, Select, StatusBadge } from "../../components/ui";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString();
}

function money(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
}

function orderStatusTone(status: SwagOrder["status"]): "success" | "danger" | "neutral" {
  if (status === "shipped" || status === "delivered") return "success";
  if (status === "failed" || status === "cancelled") return "danger";
  return "neutral";
}

const emptyProductForm = { name: "", description: "", category: "", sizes: "", unitCost: "", currency: "USD" };

export function SwagPage() {
  const { user } = useAuth();
  const organizationId = user?.organizationId ?? null;

  const [integration, setIntegration] = useState<OrgIntegration | null>(null);
  const [products, setProducts] = useState<SwagProduct[]>([]);
  const [recipients, setRecipients] = useState<SwagRecipientCandidate[]>([]);
  const [orders, setOrders] = useState<SwagOrder[]>([]);
  const [rules, setRules] = useState<SwagAutoRule[]>([]);
  const [orgBadges, setOrgBadges] = useState<Badge[]>([]);
  const [platformTiers, setPlatformTiers] = useState<Tier[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [integrationPending, setIntegrationPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showProductForm, setShowProductForm] = useState(false);
  const [productForm, setProductForm] = useState(emptyProductForm);
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  const [sendProductId, setSendProductId] = useState("");
  const [sendRecipientId, setSendRecipientId] = useState("");
  const [sendSize, setSendSize] = useState("");
  const [sendQuantity, setSendQuantity] = useState("1");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const [showRuleForm, setShowRuleForm] = useState(false);
  const [ruleProductId, setRuleProductId] = useState("");
  const [ruleTriggerType, setRuleTriggerType] = useState<Exclude<SwagTriggerType, "manual">>("badge_awarded");
  const [ruleBadgeId, setRuleBadgeId] = useState("");
  const [ruleTierId, setRuleTierId] = useState("");
  const [ruleSize, setRuleSize] = useState("");
  const [ruleQuantity, setRuleQuantity] = useState("1");
  const [isSavingRule, setIsSavingRule] = useState(false);
  const [ruleError, setRuleError] = useState<string | null>(null);

  function load() {
    if (!organizationId) return;
    setIsLoading(true);
    Promise.all([
      swagApi.getIntegration(organizationId),
      swagApi.listProducts(organizationId),
      swagApi.listRecipients(organizationId),
      swagApi.listOrders(organizationId),
      swagApi.listAutoRules(organizationId),
      badgesApi.listForOrganization(organizationId),
      tiersApi.list(),
    ])
      .then(([integrationRes, productsRes, recipientsRes, ordersRes, rulesRes, badgesRes, tiersRes]) => {
        setIntegration(integrationRes.integration);
        setProducts(productsRes.products);
        setRecipients(recipientsRes.recipients);
        setOrders(ordersRes.orders);
        setRules(rulesRes.rules);
        setOrgBadges(badgesRes.badges);
        setPlatformTiers(tiersRes.tiers);
      })
      .finally(() => setIsLoading(false));
  }

  useEffect(load, [organizationId]);

  const selectedSendProduct = products.find((p) => p.id === sendProductId) ?? null;
  const selectedRuleProduct = products.find((p) => p.id === ruleProductId) ?? null;

  async function handleConnect() {
    if (!organizationId) return;
    setIntegrationPending(true);
    setError(null);
    try {
      const { integration } = await swagApi.connectIntegration(organizationId);
      setIntegration(integration);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong");
    } finally {
      setIntegrationPending(false);
    }
  }

  async function handleDisconnect() {
    if (!organizationId) return;
    setIntegrationPending(true);
    try {
      const { integration } = await swagApi.disconnectIntegration(organizationId);
      setIntegration(integration);
    } finally {
      setIntegrationPending(false);
    }
  }

  async function handleImportCatalog() {
    if (!organizationId) return;
    setIntegrationPending(true);
    setError(null);
    try {
      const { products } = await swagApi.importCatalog(organizationId);
      setProducts(products);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong");
    } finally {
      setIntegrationPending(false);
    }
  }

  async function handleCreateProduct(e: FormEvent) {
    e.preventDefault();
    if (!organizationId) return;
    setIsSavingProduct(true);
    setError(null);
    try {
      const { product } = await swagApi.createProduct({
        organizationId,
        name: productForm.name,
        description: productForm.description || undefined,
        category: productForm.category || undefined,
        sizes: productForm.sizes
          ? productForm.sizes.split(",").map((s) => s.trim()).filter(Boolean)
          : undefined,
        unitCost: Number(productForm.unitCost),
        currency: productForm.currency || undefined,
      });
      setProducts((prev) => [product, ...prev]);
      setProductForm(emptyProductForm);
      setShowProductForm(false);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong");
    } finally {
      setIsSavingProduct(false);
    }
  }

  async function handleSendSwag(e: FormEvent) {
    e.preventDefault();
    if (!organizationId || !sendProductId || !sendRecipientId) return;
    setIsSending(true);
    setSendError(null);
    try {
      const { order } = await swagApi.createOrder(organizationId, {
        swagProductId: sendProductId,
        recipientUserId: sendRecipientId,
        size: sendSize || undefined,
        quantity: Number(sendQuantity) || 1,
      });
      setOrders((prev) => [order, ...prev]);
      setSendProductId("");
      setSendRecipientId("");
      setSendSize("");
      setSendQuantity("1");
    } catch (err) {
      setSendError(err instanceof ApiClientError ? err.message : "Something went wrong");
    } finally {
      setIsSending(false);
    }
  }

  async function handleCreateRule(e: FormEvent) {
    e.preventDefault();
    if (!organizationId || !ruleProductId) return;
    setIsSavingRule(true);
    setRuleError(null);
    try {
      const { rule } = await swagApi.createAutoRule(organizationId, {
        swagProductId: ruleProductId,
        triggerType: ruleTriggerType,
        badgeId: ruleTriggerType === "badge_awarded" ? ruleBadgeId : undefined,
        tierId: ruleTriggerType === "tier_reached" ? ruleTierId : undefined,
        size: ruleSize || undefined,
        quantity: Number(ruleQuantity) || 1,
      });
      setRules((prev) => [rule, ...prev]);
      setRuleProductId("");
      setRuleBadgeId("");
      setRuleTierId("");
      setRuleSize("");
      setRuleQuantity("1");
      setShowRuleForm(false);
    } catch (err) {
      setRuleError(err instanceof ApiClientError ? err.message : "Something went wrong");
    } finally {
      setIsSavingRule(false);
    }
  }

  async function handleToggleRule(rule: SwagAutoRule) {
    const { rule: updated } = await swagApi.updateAutoRule(rule.id, { isActive: !rule.isActive });
    setRules((prev) => prev.map((r) => (r.id === rule.id ? updated : r)));
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link to="/dashboard/org" className={buttonClasses("text")}>
        ← Back to dashboard
      </Link>

      <h1 className="mt-4 text-2xl font-semibold text-slate-900">Swag</h1>
      <p className="mt-1 text-sm text-slate-500">
        Send physical thank-you items to volunteers and donors, manually or automatically when they earn a
        badge or tier.
      </p>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {isLoading && <p className="mt-6 text-sm text-slate-500">Loading…</p>}

      {!isLoading && integration && (
        <Card className="mt-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-900">Swag.com</span>
                <StatusBadge tone={integration.status === "connected" ? "success" : "neutral"}>
                  {integration.status}
                </StatusBadge>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Optional fulfillment connection. Without it, sends are recorded here but not actually shipped.
              </p>
              {integration.status === "connected" && integration.isMock && (
                <p className="mt-2 inline-block rounded bg-amber-50 px-2 py-1 text-xs text-amber-700">
                  Mock mode — no real Swag.com account is linked. Orders are simulated (marked "shipped" with a
                  fake tracking number) so the flow can be tested before real API credentials are added.
                </p>
              )}
              {integration.status === "connected" && integration.externalOrgLabel && (
                <p className="mt-2 text-xs text-slate-400">Connected to {integration.externalOrgLabel}</p>
              )}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              {integration.status === "connected" ? (
                <>
                  <Button size="sm" onClick={handleImportCatalog} disabled={integrationPending}>
                    {integrationPending ? "Importing…" : "Import catalog"}
                  </Button>
                  <Button variant="textDanger" onClick={handleDisconnect} disabled={integrationPending}>
                    Disconnect
                  </Button>
                </>
              ) : (
                <Button size="sm" onClick={handleConnect} disabled={integrationPending}>
                  {integrationPending ? "Connecting…" : "Connect"}
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      {!isLoading && (
        <>
          <div className="mt-10 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Catalog</h2>
            <button onClick={() => setShowProductForm((v) => !v)} className={buttonClasses("text")}>
              {showProductForm ? "Cancel" : "Add item"}
            </button>
          </div>

          {showProductForm && (
            <form onSubmit={handleCreateProduct} className="mt-3 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2">
              <Input
                placeholder="Name"
                required
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                className="sm:col-span-2"
              />
              <Input
                placeholder="Description"
                value={productForm.description}
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                className="sm:col-span-2"
              />
              <Input
                placeholder="Category (e.g. apparel)"
                value={productForm.category}
                onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
              />
              <Input
                placeholder="Sizes, comma-separated (optional)"
                value={productForm.sizes}
                onChange={(e) => setProductForm({ ...productForm, sizes: e.target.value })}
              />
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="Unit cost"
                required
                value={productForm.unitCost}
                onChange={(e) => setProductForm({ ...productForm, unitCost: e.target.value })}
              />
              <Input
                placeholder="Currency"
                value={productForm.currency}
                onChange={(e) => setProductForm({ ...productForm, currency: e.target.value.toUpperCase() })}
              />
              <Button type="submit" disabled={isSavingProduct} className="sm:col-span-2">
                {isSavingProduct ? "Saving…" : "Add to catalog"}
              </Button>
            </form>
          )}

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {products.length === 0 && (
              <p className="text-sm text-slate-500 sm:col-span-2">
                No swag items yet. Add one manually, or connect Swag.com and import its catalog.
              </p>
            )}
            {products.map((p) => (
              <Card key={p.id}>
                <div className="font-medium text-slate-900">{p.name}</div>
                <div className="mt-1 text-sm text-slate-500">
                  {money(p.unitCost, p.currency)}
                  {p.sizes.length > 0 ? ` · sizes: ${p.sizes.join(", ")}` : ""}
                </div>
                {p.description && <p className="mt-1 text-sm text-slate-600">{p.description}</p>}
              </Card>
            ))}
          </div>

          <h2 className="mt-10 text-lg font-semibold text-slate-900">Send swag</h2>

          {recipients.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">
              No connected volunteers or donors yet — they'll show up here once someone signs up, logs hours,
              donates, or earns a badge with your org.
            </p>
          ) : (
            <form onSubmit={handleSendSwag} className="mt-3 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-slate-700">Item</span>
                <Select
                  required
                  value={sendProductId}
                  onChange={(e) => {
                    setSendProductId(e.target.value);
                    setSendSize("");
                  }}
                >
                  <option value="">Select item…</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </label>

              <label className="flex flex-col gap-1 text-sm">
                <span className="text-slate-700">Recipient</span>
                <Select required value={sendRecipientId} onChange={(e) => setSendRecipientId(e.target.value)}>
                  <option value="">Select recipient…</option>
                  {recipients.map((r) => (
                    <option key={r.id} value={r.id} disabled={!r.hasAddress}>
                      {r.firstName} {r.lastName} {r.hasAddress ? "" : "(no address on file)"}
                    </option>
                  ))}
                </Select>
              </label>

              {selectedSendProduct && selectedSendProduct.sizes.length > 0 && (
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-slate-700">Size</span>
                  <Select required value={sendSize} onChange={(e) => setSendSize(e.target.value)}>
                    <option value="">Select size…</option>
                    {selectedSendProduct.sizes.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </Select>
                </label>
              )}

              <label className="flex flex-col gap-1 text-sm">
                <span className="text-slate-700">Quantity</span>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={sendQuantity}
                  onChange={(e) => setSendQuantity(e.target.value)}
                  className="w-20"
                />
              </label>

              <Button type="submit" disabled={isSending}>
                {isSending ? "Sending…" : "Send"}
              </Button>
              {sendError && <p className="w-full text-sm text-red-600">{sendError}</p>}
            </form>
          )}

          <div className="mt-10 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Auto-send rules</h2>
            <button onClick={() => setShowRuleForm((v) => !v)} className={buttonClasses("text")}>
              {showRuleForm ? "Cancel" : "New rule"}
            </button>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Automatically ship an item the moment a member earns a badge or reaches a tier — never retroactive.
          </p>

          {showRuleForm && (
            <form onSubmit={handleCreateRule} className="mt-3 flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap gap-3">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-slate-700">Item</span>
                  <Select
                    required
                    value={ruleProductId}
                    onChange={(e) => {
                      setRuleProductId(e.target.value);
                      setRuleSize("");
                    }}
                  >
                    <option value="">Select item…</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                </label>

                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-slate-700">When</span>
                  <Select
                    value={ruleTriggerType}
                    onChange={(e) => setRuleTriggerType(e.target.value as Exclude<SwagTriggerType, "manual">)}
                  >
                    <option value="badge_awarded">A badge is earned</option>
                    <option value="tier_reached">A tier is reached</option>
                  </Select>
                </label>

                {ruleTriggerType === "badge_awarded" ? (
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-slate-700">Badge</span>
                    <Select required value={ruleBadgeId} onChange={(e) => setRuleBadgeId(e.target.value)}>
                      <option value="">Select badge…</option>
                      {orgBadges.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </Select>
                  </label>
                ) : (
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-slate-700">Tier</span>
                    <Select required value={ruleTierId} onChange={(e) => setRuleTierId(e.target.value)}>
                      <option value="">Select tier…</option>
                      {platformTiers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </Select>
                  </label>
                )}

                {selectedRuleProduct && selectedRuleProduct.sizes.length > 0 && (
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-slate-700">Default size</span>
                    <Select required value={ruleSize} onChange={(e) => setRuleSize(e.target.value)}>
                      <option value="">Select size…</option>
                      {selectedRuleProduct.sizes.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </Select>
                  </label>
                )}

                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-slate-700">Quantity</span>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={ruleQuantity}
                    onChange={(e) => setRuleQuantity(e.target.value)}
                    className="w-20"
                  />
                </label>
              </div>

              <Button type="submit" disabled={isSavingRule} className="self-start">
                {isSavingRule ? "Saving…" : "Create rule"}
              </Button>
              {ruleError && <p className="text-sm text-red-600">{ruleError}</p>}
            </form>
          )}

          <div className="mt-4 flex flex-col gap-3">
            {rules.length === 0 && <EmptyState description="No auto-send rules yet." />}
            {rules.map((r) => (
              <Card key={r.id} className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-slate-900">
                    {r.product.name}
                    {r.size ? ` (${r.size})` : ""}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    When {r.triggerType === "badge_awarded" ? `badge "${r.badge?.name}"` : `tier "${r.tier?.name}"`}{" "}
                    is reached
                  </div>
                </div>
                <button onClick={() => handleToggleRule(r)}>
                  <StatusBadge tone={r.isActive ? "success" : "neutral"} size="md">
                    {r.isActive ? "Active" : "Paused"}
                  </StatusBadge>
                </button>
              </Card>
            ))}
          </div>

          <h2 className="mt-10 text-lg font-semibold text-slate-900">Order history</h2>

          <div className="mt-4 overflow-x-auto rounded-md border border-slate-100">
            {orders.length === 0 ? (
              <p className="p-4 text-sm text-slate-500">No swag sent yet.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Item</th>
                    <th className="px-3 py-2">Recipient</th>
                    <th className="px-3 py-2">Trigger</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">When</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} className="border-t border-slate-100">
                      <td className="px-3 py-2">
                        {o.product.name}
                        {o.size ? ` (${o.size})` : ""}
                      </td>
                      <td className="px-3 py-2">
                        {o.recipient.firstName} {o.recipient.lastName}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-500">{o.triggerType.replace("_", " ")}</td>
                      <td className="px-3 py-2">
                        <StatusBadge tone={orderStatusTone(o.status)}>{o.status}</StatusBadge>
                        {o.lastError && <div className="mt-1 text-xs text-red-600">{o.lastError}</div>}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-500">{formatDateTime(o.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
