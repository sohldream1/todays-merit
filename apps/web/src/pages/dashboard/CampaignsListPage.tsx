import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Campaign, CampaignStatus } from "@todays-merit/shared-types";
import { campaignsApi } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { buttonClasses, Card, EmptyState, StatusBadge } from "../../components/ui";

const STATUS_TONE: Record<CampaignStatus, "neutral" | "success" | "info" | "danger"> = {
  draft: "neutral",
  active: "success",
  completed: "info",
  cancelled: "danger",
};

export function CampaignsListPage() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  function load() {
    if (!user?.organizationId) return;
    setIsLoading(true);
    campaignsApi
      .listForOrganization(user.organizationId)
      .then(({ campaigns }) => setCampaigns(campaigns))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, [user?.organizationId]);

  async function setStatus(campaign: Campaign, status: CampaignStatus) {
    await campaignsApi.update(campaign.id, { status });
    load();
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link to="/dashboard/org" className={buttonClasses("text")}>
        ← Back to dashboard
      </Link>

      <div className="mt-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Campaigns</h1>
        <Link to="/dashboard/org/campaigns/new" className={buttonClasses("primary")}>
          New campaign
        </Link>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {isLoading && <p className="text-sm text-slate-500">Loading…</p>}

        {!isLoading && campaigns.length === 0 && <EmptyState description="No campaigns yet." />}

        {campaigns.map((c) => (
          <Card key={c.id}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-900">{c.title}</span>
                  <StatusBadge tone={STATUS_TONE[c.status]}>{c.status}</StatusBadge>
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  ${c.amountRaised.toLocaleString()} raised of ${c.goalAmount.toLocaleString()} goal
                </div>
              </div>
              <Link to={`/dashboard/org/campaigns/${c.id}/edit`} className={buttonClasses("text")}>
                Edit
              </Link>
            </div>

            <div className="mt-3 flex gap-3 text-sm">
              {c.status === "draft" && (
                <button onClick={() => setStatus(c, "active")} className="font-medium text-green-700 hover:underline">
                  Activate
                </button>
              )}
              {c.status === "active" && (
                <>
                  <button onClick={() => setStatus(c, "completed")} className={buttonClasses("text")}>
                    Mark completed
                  </button>
                  <button onClick={() => setStatus(c, "cancelled")} className={buttonClasses("textDanger")}>
                    Cancel
                  </button>
                </>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
