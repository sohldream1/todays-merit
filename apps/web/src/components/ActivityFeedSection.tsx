import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { ActivityFeedItem } from "@todays-merit/shared-types";
import { ApiClientError, kudosApi, organizationsApi } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Card, EmptyState, StatusBadge } from "./ui";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { timeZone: "UTC" });
}

function describeItem(item: ActivityFeedItem): string {
  if (item.type === "volunteer_hours") {
    const hoursLabel = `${item.hours} ${item.hours === 1 ? "hour" : "hours"}`;
    return item.opportunityTitle
      ? `logged ${hoursLabel} volunteering with ${item.opportunityTitle}`
      : `logged ${hoursLabel} volunteering`;
  }
  return item.campaignTitle ? `donated to ${item.campaignTitle}` : "made a donation";
}

// Shown on an org's public page. Requires login (it's a members' wall, not
// a public firehose of who-gave-what) but any account can view it, same as
// anyone can already view the org profile itself.
export function ActivityFeedSection({ organizationId }: { organizationId: string }) {
  const { user } = useAuth();
  const [items, setItems] = useState<ActivityFeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    organizationsApi
      .getFeed(organizationId)
      .then((feed) => setItems(feed.items))
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Something went wrong"))
      .finally(() => setIsLoading(false));
  }, [organizationId, user]);

  async function toggleKudos(item: ActivityFeedItem) {
    const key = `${item.type}-${item.id}`;
    setBusyKey(key);
    try {
      const action =
        item.type === "volunteer_hours"
          ? item.hasGivenKudos
            ? kudosApi.removeOnHour
            : kudosApi.giveOnHour
          : item.hasGivenKudos
            ? kudosApi.removeOnDonation
            : kudosApi.giveOnDonation;
      const result = await action(item.id);
      setItems((prev) => prev.map((i) => (i.type === item.type && i.id === item.id ? { ...i, ...result } : i)));
    } catch {
      // Best-effort — leave the button as it was if the request fails.
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="mt-10">
      <h2 className="text-lg font-semibold text-slate-900">Activity</h2>
      <p className="mt-1 text-sm text-slate-500">Recent volunteering and giving at this organization.</p>

      {!user && (
        <p className="mt-4 text-sm text-slate-500">
          <Link to="/login/member" className="text-indigo-600 hover:underline">
            Log in
          </Link>{" "}
          to see recent activity and give kudos.
        </p>
      )}

      {user && isLoading && <p className="mt-4 text-sm text-slate-500">Loading…</p>}
      {user && error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {user && !isLoading && !error && items.length === 0 && (
        <div className="mt-4">
          <EmptyState description="No activity yet — be the first to volunteer or donate." />
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3">
        {items.map((item) => {
          const key = `${item.type}-${item.id}`;
          const isOwn = item.user.id === user?.id;

          return (
            <Card key={key} className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm text-slate-700">
                  <span className="font-medium text-slate-900">
                    {item.user.firstName} {item.user.lastName}
                  </span>{" "}
                  {describeItem(item)}
                  {item.type === "volunteer_hours" && (
                    <StatusBadge
                      tone={item.verificationStatus === "verified_by_org" ? "success" : "neutral"}
                      className="ml-2"
                    >
                      {item.verificationStatus === "verified_by_org" ? "Verified" : "Self-reported"}
                    </StatusBadge>
                  )}
                </div>
                <div className="mt-1 text-xs text-slate-400">{formatDate(item.occurredAt)}</div>
              </div>

              {!isOwn && (
                <button
                  type="button"
                  onClick={() => toggleKudos(item)}
                  disabled={busyKey === key}
                  aria-pressed={item.hasGivenKudos}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors disabled:opacity-50 ${
                    item.hasGivenKudos
                      ? "border-indigo-600 bg-indigo-50 text-indigo-600"
                      : "border-slate-300 text-slate-600 hover:border-slate-400"
                  }`}
                >
                  <span aria-hidden="true">👏</span>
                  {item.kudosCount > 0 && <span>{item.kudosCount}</span>}
                </button>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
