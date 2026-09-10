import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Organization, VerificationStatus } from "@todays-merit/shared-types";
import { ApiClientError, platformAdminApi } from "../../api/client";
import { Button, Card, EmptyState, StatusBadge, Textarea } from "../../components/ui";

const VERIFICATION_TONE: Record<VerificationStatus, "neutral" | "warning" | "success" | "danger"> = {
  unverified: "neutral",
  pending: "warning",
  verified: "success",
  rejected: "danger",
};

const TABS: Array<{ label: string; value: VerificationStatus | "all" }> = [
  { label: "Pending review", value: "pending" },
  { label: "Unverified", value: "unverified" },
  { label: "Verified", value: "verified" },
  { label: "Rejected", value: "rejected" },
  { label: "All", value: "all" },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { timeZone: "UTC" });
}

export function PlatformAdminDashboard() {
  const [tab, setTab] = useState<VerificationStatus | "all">("pending");
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setIsLoading(true);
    setError(null);
    platformAdminApi
      .listOrganizations(tab === "all" ? undefined : tab)
      .then(({ organizations }) => setOrganizations(organizations))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, [tab]);

  async function handleApprove(org: Organization) {
    setPendingId(org.id);
    setError(null);
    try {
      await platformAdminApi.review(org.id, { decision: "verified" });
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong");
    } finally {
      setPendingId(null);
    }
  }

  function startRejecting(orgId: string) {
    setRejectingId(orgId);
    setNotes("");
    setError(null);
  }

  async function handleReject(org: Organization) {
    if (!notes.trim()) {
      setError("Notes are required when rejecting a submission.");
      return;
    }
    setPendingId(org.id);
    setError(null);
    try {
      await platformAdminApi.review(org.id, { decision: "rejected", notes });
      setRejectingId(null);
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-semibold text-slate-900">Nonprofit verification</h1>
      <p className="mt-1 text-sm text-slate-500">
        Review organizations awaiting verification against their EIN and mission. The org admin is
        emailed automatically when you approve or reject.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
              tab === t.value
                ? "border-indigo-600 bg-indigo-600 text-white"
                : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 flex flex-col gap-3">
        {isLoading && <p className="text-sm text-slate-500">Loading…</p>}

        {!isLoading && organizations.length === 0 && <EmptyState description="Nothing here right now." />}

        {organizations.map((org) => (
          <Card key={org.id}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <Link to={`/organizations/${org.id}`} className="font-medium text-slate-900 hover:underline">
                  {org.name}
                </Link>
                <div className="mt-1 text-sm text-slate-500">
                  EIN {org.ein} · {org.causeArea.replace("_", " / ")}
                  {org.city ? ` · ${org.city}${org.state ? `, ${org.state}` : ""}` : ""}
                </div>
                {org.websiteUrl && (
                  <a href={org.websiteUrl} target="_blank" rel="noreferrer" className="text-sm text-indigo-600 hover:underline">
                    {org.websiteUrl}
                  </a>
                )}
                {org.missionStatement && <p className="mt-2 text-sm text-slate-600">{org.missionStatement}</p>}
                {org.verificationNotes && (
                  <div className="mt-2 rounded-md bg-red-50 p-2 text-xs text-red-700">
                    <span className="font-medium">Previous notes: </span>
                    {org.verificationNotes}
                  </div>
                )}
                <div className="mt-2 text-xs text-slate-400">Registered {formatDate(org.createdAt)}</div>
              </div>
              <StatusBadge tone={VERIFICATION_TONE[org.verificationStatus]}>{org.verificationStatus}</StatusBadge>
            </div>

            {org.verificationStatus === "pending" && (
              <div className="mt-3 border-t border-slate-100 pt-3">
                {rejectingId === org.id ? (
                  <div className="flex flex-col gap-2">
                    <Textarea
                      placeholder="What does the org need to fix before resubmitting?"
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                    <div className="flex gap-3">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={pendingId === org.id}
                        onClick={() => handleReject(org)}
                      >
                        {pendingId === org.id ? "Submitting…" : "Confirm rejection"}
                      </Button>
                      <Button variant="text" onClick={() => setRejectingId(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <Button size="sm" disabled={pendingId === org.id} onClick={() => handleApprove(org)}>
                      {pendingId === org.id ? "Approving…" : "Approve"}
                    </Button>
                    <Button variant="textDanger" onClick={() => startRejecting(org.id)}>
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
