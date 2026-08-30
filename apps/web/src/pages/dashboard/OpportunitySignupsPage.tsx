import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { OpportunityParticipant, VolunteerOpportunity } from "@todays-merit/shared-types";
import { opportunitiesApi } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { Card, EmptyState, StatusBadge } from "../../components/ui";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { timeZone: "UTC" });
}

export function OpportunitySignupsPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [opportunity, setOpportunity] = useState<VolunteerOpportunity | null>(null);
  const [participants, setParticipants] = useState<OpportunityParticipant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    Promise.all([opportunitiesApi.get(id), opportunitiesApi.listSignups(id)])
      .then(([oppRes, signupsRes]) => {
        setOpportunity(oppRes.opportunity);
        setParticipants(signupsRes.participants);
      })
      .catch(() => setError("You don't have access to this opportunity's signups."))
      .finally(() => setIsLoading(false));
  }, [id]);

  const backTo = "/dashboard/org/opportunities";

  if (isLoading) {
    return <div className="mx-auto max-w-2xl px-6 py-12 text-slate-500">Loading…</div>;
  }

  if (error || !opportunity) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-12">
        <p className="text-red-600">{error ?? "Opportunity not found"}</p>
        <Link to={backTo} className="mt-2 inline-block text-sm text-indigo-600 hover:underline">
          ← Back
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <Link to={backTo} className="text-sm text-indigo-600 hover:underline">
        ← Back to {user?.role === "race_director" ? "races & competitions" : "opportunities"}
      </Link>

      <h1 className="mt-4 text-2xl font-semibold text-slate-900">{opportunity.title}</h1>
      <p className="mt-1 text-sm text-slate-500">
        {participants.length} {participants.length === 1 ? "person" : "people"} signed up
      </p>

      <div className="mt-6 flex flex-col gap-3">
        {participants.length === 0 && <EmptyState description="No one has signed up yet." />}

        {participants.map((p) => (
          <Card key={p.id} className="flex items-center justify-between">
            <div>
              <div className="font-medium text-slate-900">
                {p.user.firstName} {p.user.lastName}
              </div>
              <div className="mt-1 text-sm text-slate-500">{p.user.email}</div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <StatusBadge tone={p.status === "completed" ? "success" : "neutral"}>
                {p.status.replace("_", " ")}
              </StatusBadge>
              <span className="text-xs text-slate-400">Signed up {formatDate(p.createdAt)}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
