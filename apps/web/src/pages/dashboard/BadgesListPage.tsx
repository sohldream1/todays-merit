import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Badge, BadgeRecipientCandidate } from "@todays-merit/shared-types";
import { ApiClientError, badgesApi } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { MeritBadge } from "../../components/MeritBadge";
import { Button, buttonClasses, Card, EmptyState, Select } from "../../components/ui";
import { dashboardPathForRole } from "../../lib/dashboardPath";

function criteriaLabel(badge: Badge): string {
  if (badge.criteria.type === "hours") return `${badge.criteria.threshold} verified hours`;
  if (badge.criteria.type === "donation_total") return `$${badge.criteria.threshold.toLocaleString()} donated`;
  return "Manually awarded";
}

export function BadgesListPage() {
  const { user } = useAuth();
  const isDirector = user?.role === "race_director";
  const [badges, setBadges] = useState<Badge[]>([]);
  const [recipients, setRecipients] = useState<BadgeRecipientCandidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [awardingFor, setAwardingFor] = useState<string | null>(null);
  const [selectedRecipientId, setSelectedRecipientId] = useState("");
  const [isAwarding, setIsAwarding] = useState(false);
  const [awardError, setAwardError] = useState<string | null>(null);
  const [awardSuccessId, setAwardSuccessId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.organizationId) return;
    setIsLoading(true);
    Promise.all([badgesApi.listForOrganization(user.organizationId), badgesApi.listRecipients(user.organizationId)])
      .then(([badgesRes, recipientsRes]) => {
        setBadges(badgesRes.badges);
        setRecipients(recipientsRes.recipients);
      })
      .finally(() => setIsLoading(false));
  }, [user?.organizationId]);

  function startAwarding(badgeId: string) {
    setAwardingFor(badgeId);
    setSelectedRecipientId("");
    setAwardError(null);
    setAwardSuccessId(null);
  }

  async function handleAward(badgeId: string) {
    if (!selectedRecipientId) return;
    setIsAwarding(true);
    setAwardError(null);
    try {
      await badgesApi.award(badgeId, { recipientUserId: selectedRecipientId });
      setAwardingFor(null);
      setAwardSuccessId(badgeId);
    } catch (err) {
      setAwardError(err instanceof ApiClientError ? err.message : "Something went wrong");
    } finally {
      setIsAwarding(false);
    }
  }

  const visibleBadges = isDirector ? badges.filter((b) => b.badgeType === "competition") : badges;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link to={user ? dashboardPathForRole(user.role) : "/"} className={buttonClasses("text")}>
        ← Back to dashboard
      </Link>

      <div className="mt-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">{isDirector ? "Award badges" : "Badges"}</h1>
        {!isDirector && (
          <Link to="/dashboard/org/badges/new" className={buttonClasses("primary")}>
            New badge
          </Link>
        )}
      </div>
      <p className="mt-1 text-sm text-slate-500">
        {isDirector
          ? "Award competition badges to winners — styled with your organization's logo and a Today's Merit hallmark."
          : "Every badge is automatically styled with your organization's logo, plus a Today's Merit hallmark showing it was earned on the platform."}
      </p>

      <div className="mt-6 flex flex-col gap-3">
        {isLoading && <p className="text-sm text-slate-500">Loading…</p>}

        {!isLoading && visibleBadges.length === 0 && (
          <EmptyState
            description={
              isDirector
                ? "No competition badges yet — ask an org admin to create one."
                : "No badges yet. Badges are awarded automatically once a member crosses the threshold you set, or manually for competitions and one-off recognition."
            }
          />
        )}

        {visibleBadges.map((b) => (
          <Card key={b.id}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <MeritBadge
                  name={b.name}
                  badgeType={b.badgeType}
                  iconUrl={b.iconUrl}
                  organizationLogoUrl={b.organizationLogoUrl}
                  size="sm"
                />
                <div>
                  <div className="font-medium text-slate-900">{b.name}</div>
                  <div className="mt-1 text-sm text-slate-500">
                    {criteriaLabel(b)} · {b.badgeType.replace("_", " ")}
                  </div>
                  {b.description && <p className="mt-1 text-sm text-slate-600">{b.description}</p>}
                </div>
              </div>
              {!isDirector && (
                <Link to={`/dashboard/org/badges/${b.id}/edit`} className={buttonClasses("text")}>
                  Edit
                </Link>
              )}
            </div>

            {recipients.length > 0 && (
              <div className="mt-3 border-t border-slate-100 pt-3">
                {awardingFor === b.id ? (
                  <div className="flex flex-wrap items-end gap-3">
                    <Select
                      value={selectedRecipientId}
                      onChange={(e) => setSelectedRecipientId(e.target.value)}
                      className="text-sm"
                    >
                      <option value="">Select recipient…</option>
                      {recipients.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.firstName} {r.lastName}
                        </option>
                      ))}
                    </Select>
                    <Button size="sm" disabled={!selectedRecipientId || isAwarding} onClick={() => handleAward(b.id)}>
                      {isAwarding ? "Awarding…" : "Award"}
                    </Button>
                    <Button variant="text" onClick={() => setAwardingFor(null)}>
                      Cancel
                    </Button>
                    {awardError && <p className="w-full text-sm text-red-600">{awardError}</p>}
                  </div>
                ) : (
                  <button onClick={() => startAwarding(b.id)} className="text-sm font-medium text-indigo-600 hover:underline">
                    Award to a member
                  </button>
                )}
                {awardSuccessId === b.id && awardingFor !== b.id && (
                  <p className="mt-1 text-sm text-green-600">Badge awarded.</p>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
