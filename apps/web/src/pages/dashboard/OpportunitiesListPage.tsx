import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { OpportunityCategory, VolunteerOpportunity } from "@todays-merit/shared-types";
import { opportunitiesApi } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { buttonClasses, Card, EmptyState, StatusBadge } from "../../components/ui";
import { dashboardPathForRole } from "../../lib/dashboardPath";

const CATEGORY_LABELS: Record<OpportunityCategory, string> = {
  volunteer: "Volunteering",
  race: "Race",
  competition: "Competition",
};

const CATEGORY_TONE: Record<OpportunityCategory, "neutral" | "warning" | "purple"> = {
  volunteer: "neutral",
  race: "warning",
  competition: "purple",
};

const FILTERS: Array<{ label: string; value: OpportunityCategory | "all" }> = [
  { label: "All", value: "all" },
  { label: "Volunteering", value: "volunteer" },
  { label: "Races", value: "race" },
  { label: "Competitions", value: "competition" },
];

export function OpportunitiesListPage() {
  const { user } = useAuth();
  const isDirector = user?.role === "race_director";
  const [opportunities, setOpportunities] = useState<VolunteerOpportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<OpportunityCategory | "all">("all");

  function load() {
    if (!user?.organizationId) return;
    setIsLoading(true);
    opportunitiesApi
      .listForOrganization(user.organizationId)
      .then(({ opportunities }) => setOpportunities(opportunities))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, [user?.organizationId]);

  async function toggleStatus(opp: VolunteerOpportunity) {
    await opportunitiesApi.update(opp.id, { status: opp.status === "open" ? "closed" : "open" });
    load();
  }

  // Directors don't manage volunteer-category opportunities — hide them
  // entirely rather than show a filter/edit link that would just 403.
  const visible = isDirector ? opportunities.filter((o) => o.category !== "volunteer") : opportunities;
  const filters = isDirector ? FILTERS.filter((f) => f.value !== "volunteer") : FILTERS;

  const filtered = useMemo(
    () => (categoryFilter === "all" ? visible : visible.filter((o) => o.category === categoryFilter)),
    [visible, categoryFilter],
  );

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link to={user ? dashboardPathForRole(user.role) : "/"} className={buttonClasses("text")}>
        ← Back to dashboard
      </Link>

      <div className="mt-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">{isDirector ? "Races & competitions" : "Opportunities"}</h1>
        <Link to="/dashboard/org/opportunities/new" className={buttonClasses("primary")}>
          New opportunity
        </Link>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        {isDirector
          ? "The races and competitions you're directing for this organization."
          : "Volunteer positions, races, and competitions members can find and join."}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setCategoryFilter(f.value)}
            className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
              categoryFilter === f.value
                ? "border-indigo-600 bg-indigo-600 text-white"
                : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {isLoading && <p className="text-sm text-slate-500">Loading…</p>}

        {!isLoading && filtered.length === 0 && (
          <EmptyState description={categoryFilter === "all" ? "No opportunities yet." : "None in this category yet."} />
        )}

        {filtered.map((opp) => (
          <Card key={opp.id} className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-900">{opp.title}</span>
                <StatusBadge tone={CATEGORY_TONE[opp.category]}>{CATEGORY_LABELS[opp.category]}</StatusBadge>
                <StatusBadge tone={opp.status === "open" ? "success" : "neutral"}>{opp.status}</StatusBadge>
              </div>
              <div className="mt-1 text-sm text-slate-500">
                {opp.location ?? (opp.isRemote ? "Remote" : "")}
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <Link to={`/dashboard/org/opportunities/${opp.id}/signups`} className={buttonClasses("text")}>
                Participants
              </Link>
              {opp.category === "competition" && (
                <Link to={`/opportunities/${opp.id}/leaderboard`} className={buttonClasses("text")}>
                  Leaderboard
                </Link>
              )}
              <Link to={`/dashboard/org/opportunities/${opp.id}/edit`} className={buttonClasses("text")}>
                Edit
              </Link>
              <button onClick={() => toggleStatus(opp)} className="font-medium text-slate-600 hover:underline">
                {opp.status === "open" ? "Close" : "Reopen"}
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
