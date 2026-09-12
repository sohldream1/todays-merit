import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { Leaderboard } from "@todays-merit/shared-types";
import { ApiClientError, opportunitiesApi } from "../api/client";
import { Card, EmptyState } from "../components/ui";

const MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

export function OpportunityLeaderboardPage() {
  const { id } = useParams<{ id: string }>();
  const [leaderboard, setLeaderboard] = useState<Leaderboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    opportunitiesApi
      .getLeaderboard(id)
      .then(setLeaderboard)
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Something went wrong"))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return <div className="mx-auto max-w-lg px-6 py-12 text-slate-500">Loading…</div>;
  }

  if (error || !leaderboard) {
    return (
      <div className="mx-auto max-w-lg px-6 py-12">
        <p className="text-red-600">{error ?? "Leaderboard not found"}</p>
        <Link to="/opportunities" className="mt-2 inline-block text-sm text-indigo-600 hover:underline">
          ← Back to opportunities
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-12">
      <Link to="/opportunities" className="text-sm text-indigo-600 hover:underline">
        ← Back to opportunities
      </Link>

      <h1 className="mt-4 text-2xl font-semibold text-slate-900">{leaderboard.opportunity.title}</h1>
      <p className="mt-1 text-sm text-slate-500">Ranked by verified volunteer hours logged for this competition.</p>

      <Card className="mt-6">
        {leaderboard.entries.length === 0 ? (
          <EmptyState description="No one's signed up yet — be the first." />
        ) : (
          <div className="flex flex-col divide-y divide-slate-100">
            {leaderboard.entries.map((entry) => (
              <div
                key={entry.user.id}
                className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 shrink-0 text-center text-lg font-semibold text-slate-400">
                    {MEDALS[entry.rank] ?? entry.rank}
                  </span>
                  <span className="font-medium text-slate-900">
                    {entry.user.firstName} {entry.user.lastName}
                  </span>
                </div>
                <span className="text-sm font-medium text-slate-700">
                  {entry.verifiedHours.toLocaleString()} {entry.verifiedHours === 1 ? "hour" : "hours"}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
