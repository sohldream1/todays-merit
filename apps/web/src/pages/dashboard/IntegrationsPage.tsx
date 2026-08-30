import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { IntegrationProvider, IntegrationSyncRecord, OrgIntegration } from "@todays-merit/shared-types";
import { ApiClientError, integrationsApi } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { Button, buttonClasses, Card, StatusBadge } from "../../components/ui";

// swag_com is a fulfillment integration managed on the Swag page, not this
// donor-CRM list — included here only because these lookups are typed over
// the full shared IntegrationProvider union.
const PROVIDER_LABELS: Record<IntegrationProvider, string> = {
  salesforce: "Salesforce",
  raisers_edge_nxt: "Raiser's Edge NXT",
  gofundme_pro: "GoFundMe Pro / Classy",
  swag_com: "Swag.com",
};

const PROVIDER_BLURBS: Record<IntegrationProvider, string> = {
  salesforce: "Pushes donors, donations, and volunteer hours to Salesforce as Contacts, Opportunities, and Tasks.",
  raisers_edge_nxt: "Sync with Blackbaud's Raiser's Edge NXT via the SKY API.",
  gofundme_pro: "Sync fundraising campaigns and donations with GoFundMe Pro / Classy.",
  swag_com: "Send physical swag to volunteers and donors via Swag.com.",
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString();
}

function statusTone(status: OrgIntegration["status"]): "success" | "danger" | "neutral" {
  if (status === "connected") return "success";
  if (status === "error") return "danger";
  return "neutral";
}

export function IntegrationsPage() {
  const { user } = useAuth();
  const [integrations, setIntegrations] = useState<OrgIntegration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingProvider, setPendingProvider] = useState<IntegrationProvider | null>(null);
  const [expandedProvider, setExpandedProvider] = useState<IntegrationProvider | null>(null);
  const [syncLogs, setSyncLogs] = useState<IntegrationSyncRecord[]>([]);

  function load() {
    if (!user?.organizationId) return;
    setIsLoading(true);
    integrationsApi
      .listForOrganization(user.organizationId)
      .then(({ integrations }) => setIntegrations(integrations))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, [user?.organizationId]);

  async function handleConnect(provider: IntegrationProvider) {
    if (!user?.organizationId) return;
    setError(null);
    setPendingProvider(provider);
    try {
      const { integration, authorizationUrl } = await integrationsApi.connect(user.organizationId, provider);
      if (authorizationUrl) {
        window.location.href = authorizationUrl;
        return;
      }
      if (integration) {
        setIntegrations((prev) => prev.map((i) => (i.provider === provider ? integration : i)));
      }
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong");
    } finally {
      setPendingProvider(null);
    }
  }

  async function handleDisconnect(provider: IntegrationProvider) {
    if (!user?.organizationId) return;
    setPendingProvider(provider);
    try {
      const { integration } = await integrationsApi.disconnect(user.organizationId, provider);
      setIntegrations((prev) => prev.map((i) => (i.provider === provider ? integration : i)));
      if (expandedProvider === provider) setExpandedProvider(null);
    } finally {
      setPendingProvider(null);
    }
  }

  async function handleSyncNow(provider: IntegrationProvider) {
    if (!user?.organizationId) return;
    setPendingProvider(provider);
    try {
      const { integration } = await integrationsApi.syncNow(user.organizationId, provider);
      setIntegrations((prev) => prev.map((i) => (i.provider === provider ? integration : i)));
      if (expandedProvider === provider) await loadSyncLogs(provider);
    } finally {
      setPendingProvider(null);
    }
  }

  async function loadSyncLogs(provider: IntegrationProvider) {
    if (!user?.organizationId) return;
    const { syncRecords } = await integrationsApi.syncLogs(user.organizationId, provider);
    setSyncLogs(syncRecords);
  }

  async function toggleLogs(provider: IntegrationProvider) {
    if (expandedProvider === provider) {
      setExpandedProvider(null);
      return;
    }
    setExpandedProvider(provider);
    await loadSyncLogs(provider);
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link to="/dashboard/org" className={buttonClasses("text")}>
        ← Back to dashboard
      </Link>

      <h1 className="mt-4 text-2xl font-semibold text-slate-900">Integrations</h1>
      <p className="mt-1 text-sm text-slate-500">
        Push your donors, donations, and volunteer hours to your CRM automatically.
      </p>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 flex flex-col gap-4">
        {isLoading && <p className="text-sm text-slate-500">Loading…</p>}

        {integrations.map((integration) => {
          const available = integration.isAvailable;
          const isPending = pendingProvider === integration.provider;

          return (
            <Card key={integration.provider}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900">{PROVIDER_LABELS[integration.provider]}</span>
                    {available ? (
                      <StatusBadge tone={statusTone(integration.status)}>{integration.status}</StatusBadge>
                    ) : (
                      <StatusBadge tone="neutral">Coming soon</StatusBadge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{PROVIDER_BLURBS[integration.provider]}</p>

                  {integration.status === "connected" && integration.isMock && (
                    <p className="mt-2 inline-block rounded bg-amber-50 px-2 py-1 text-xs text-amber-700">
                      Mock mode — no real {PROVIDER_LABELS[integration.provider]} account is linked. Nothing
                      leaves Today's Merit; sync activity below is simulated so the flow can be tested before
                      real API credentials are added.
                    </p>
                  )}

                  {integration.status === "connected" && integration.externalOrgLabel && (
                    <p className="mt-2 text-xs text-slate-400">Connected to {integration.externalOrgLabel}</p>
                  )}
                  {integration.lastSyncAt && (
                    <p className="mt-1 text-xs text-slate-400">Last synced {formatDateTime(integration.lastSyncAt)}</p>
                  )}
                  {integration.status === "error" && integration.lastError && (
                    <p className="mt-1 text-xs text-red-600">{integration.lastError}</p>
                  )}
                </div>

                <div className="flex shrink-0 flex-col items-end gap-2">
                  {available && integration.status === "connected" ? (
                    <>
                      <Button size="sm" onClick={() => handleSyncNow(integration.provider)} disabled={isPending}>
                        {isPending ? "Syncing…" : "Sync now"}
                      </Button>
                      <Button variant="textDanger" onClick={() => handleDisconnect(integration.provider)} disabled={isPending}>
                        Disconnect
                      </Button>
                    </>
                  ) : available ? (
                    <Button size="sm" onClick={() => handleConnect(integration.provider)} disabled={isPending}>
                      {isPending ? "Connecting…" : "Connect"}
                    </Button>
                  ) : (
                    <Button variant="secondary" size="sm" disabled>
                      Connect
                    </Button>
                  )}
                </div>
              </div>

              {integration.status === "connected" && (
                <button
                  onClick={() => toggleLogs(integration.provider)}
                  className="mt-3 text-xs text-slate-500 hover:underline"
                >
                  {expandedProvider === integration.provider ? "Hide sync activity" : "View sync activity"}
                </button>
              )}

              {expandedProvider === integration.provider && (
                <div className="mt-3 overflow-x-auto rounded-md border border-slate-100">
                  {syncLogs.length === 0 ? (
                    <p className="p-3 text-sm text-slate-500">No sync activity yet.</p>
                  ) : (
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                        <tr>
                          <th className="px-3 py-2">Type</th>
                          <th className="px-3 py-2">Status</th>
                          <th className="px-3 py-2">External ID</th>
                          <th className="px-3 py-2">When</th>
                        </tr>
                      </thead>
                      <tbody>
                        {syncLogs.map((log) => (
                          <tr key={log.id} className="border-t border-slate-100">
                            <td className="px-3 py-2">{log.entityType.replace("_", " ")}</td>
                            <td className="px-3 py-2">
                              <StatusBadge
                                tone={log.status === "synced" ? "success" : log.status === "failed" ? "danger" : "neutral"}
                              >
                                {log.status}
                              </StatusBadge>
                              {log.errorMessage && (
                                <div className="mt-1 text-xs text-red-600">{log.errorMessage}</div>
                              )}
                            </td>
                            <td className="px-3 py-2 font-mono text-xs text-slate-500">{log.externalId ?? "—"}</td>
                            <td className="px-3 py-2 text-xs text-slate-500">
                              {log.syncedAt ? formatDateTime(log.syncedAt) : formatDateTime(log.createdAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
