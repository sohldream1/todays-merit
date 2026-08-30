import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import type { Badge, Campaign, OpportunityCategory, Organization, VolunteerOpportunity } from "@todays-merit/shared-types";
import { ApiClientError, badgesApi, campaignsApi, meApi, opportunitiesApi, organizationsApi } from "../api/client";
import { MeritBadge } from "../components/MeritBadge";
import { RatingBadges } from "../components/RatingBadges";
import { Button, buttonClasses, Card, Input, StatusBadge } from "../components/ui";
import { useAuth } from "../context/AuthContext";

const VERIFICATION_TONE: Record<Organization["verificationStatus"], "neutral" | "warning" | "success" | "danger"> = {
  unverified: "neutral",
  pending: "warning",
  verified: "success",
  rejected: "danger",
};

const VERIFICATION_LABELS: Record<Organization["verificationStatus"], string> = {
  unverified: "Unverified",
  pending: "Pending review",
  verified: "Verified",
  rejected: "Rejected",
};

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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { timeZone: "UTC" });
}

function formatDateRange(start: string | null, end: string | null): string {
  if (!start) return "Ongoing";
  if (!end) return `Starts ${formatDate(start)} · ongoing`;
  return `${formatDate(start)} – ${formatDate(end)}`;
}

function criteriaLabel(badge: Badge): string {
  if (badge.criteria.type === "hours") return `${badge.criteria.threshold} verified hours`;
  if (badge.criteria.type === "donation_total") return `$${badge.criteria.threshold.toLocaleString()} donated`;
  return "Awarded by the organization";
}

export function OrganizationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [opportunities, setOpportunities] = useState<VolunteerOpportunity[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [signedUpIds, setSignedUpIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const [donatingFor, setDonatingFor] = useState<string | null>(null);
  const [donateAmount, setDonateAmount] = useState("");
  const [donateError, setDonateError] = useState<string | null>(null);
  const [isDonating, setIsDonating] = useState(false);
  const [donateSuccessId, setDonateSuccessId] = useState<string | null>(null);

  function load() {
    if (!id) return;
    setIsLoading(true);
    Promise.all([
      organizationsApi.get(id),
      opportunitiesApi.listForOrganization(id, "open"),
      campaignsApi.listForOrganization(id, "active"),
      badgesApi.listForOrganization(id),
      user?.role === "member" ? meApi.signups() : Promise.resolve({ signups: [] }),
    ])
      .then(([orgRes, oppsRes, campaignsRes, badgesRes, signupsRes]) => {
        setOrganization(orgRes.organization);
        setOpportunities(oppsRes.opportunities);
        setCampaigns(campaignsRes.campaigns);
        setBadges(badgesRes.badges);
        setSignedUpIds(new Set(signupsRes.signups.map((s) => s.opportunity.id)));
      })
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Something went wrong"))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, [id, user?.role]);

  async function handleSignUp(opportunityId: string) {
    setPendingId(opportunityId);
    try {
      await opportunitiesApi.signUp(opportunityId);
      setSignedUpIds((prev) => new Set(prev).add(opportunityId));
    } finally {
      setPendingId(null);
    }
  }

  async function handleCancel(opportunityId: string) {
    setPendingId(opportunityId);
    try {
      await opportunitiesApi.cancelSignup(opportunityId);
      setSignedUpIds((prev) => {
        const next = new Set(prev);
        next.delete(opportunityId);
        return next;
      });
    } finally {
      setPendingId(null);
    }
  }

  function startDonating(campaignId: string) {
    setDonatingFor(campaignId);
    setDonateAmount("");
    setDonateError(null);
    setDonateSuccessId(null);
  }

  async function handleDonate(e: FormEvent) {
    e.preventDefault();
    if (!donatingFor) return;
    setDonateError(null);
    setIsDonating(true);
    try {
      await campaignsApi.donate(donatingFor, { amount: Number(donateAmount) });
      setDonateSuccessId(donatingFor);
      setDonatingFor(null);
      const campaignsForOrg = id ? await campaignsApi.listForOrganization(id, "active") : null;
      if (campaignsForOrg) setCampaigns(campaignsForOrg.campaigns);
    } catch (err) {
      setDonateError(err instanceof ApiClientError ? err.message : "Something went wrong");
    } finally {
      setIsDonating(false);
    }
  }

  if (isLoading) {
    return <div className="mx-auto max-w-2xl px-6 py-12 text-slate-500">Loading…</div>;
  }

  if (error || !organization) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-12">
        <p className="text-red-600">{error ?? "Organization not found"}</p>
        <Link to="/directory" className={buttonClasses("text", "md", "mt-2 inline-block")}>
          Back to directory
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <Link to="/directory" className={buttonClasses("text")}>
        ← Back to directory
      </Link>

      <div className="mt-4 flex items-start justify-between gap-4">
        <h1 className="text-3xl font-semibold text-slate-900">{organization.name}</h1>
        <StatusBadge tone={VERIFICATION_TONE[organization.verificationStatus]} size="md">
          {VERIFICATION_LABELS[organization.verificationStatus]}
        </StatusBadge>
      </div>

      <div className="mt-1 text-slate-500">
        {organization.causeArea.replace("_", " / ")}
        {organization.city ? ` · ${organization.city}${organization.state ? `, ${organization.state}` : ""}` : ""}
      </div>

      <RatingBadges rating={organization.rating} />

      {organization.missionStatement && (
        <p className="mt-6 text-slate-700">{organization.missionStatement}</p>
      )}

      {organization.websiteUrl && (
        <a
          href={organization.websiteUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-block text-indigo-600 hover:underline"
        >
          {organization.websiteUrl}
        </a>
      )}

      <h2 className="mt-10 text-xl font-semibold text-slate-900">Active campaigns</h2>

      {campaigns.length === 0 && <p className="mt-2 text-sm text-slate-500">No active campaigns right now.</p>}

      <div className="mt-4 flex flex-col gap-3">
        {campaigns.map((c) => {
          const pct = Math.min(100, Math.round((c.amountRaised / c.goalAmount) * 100));
          return (
            <Card key={c.id}>
              <div className="font-medium text-slate-900">{c.title}</div>
              {c.description && <p className="mt-1 text-sm text-slate-600">{c.description}</p>}

              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-indigo-600" style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-1 text-sm text-slate-500">
                ${c.amountRaised.toLocaleString()} raised of ${c.goalAmount.toLocaleString()} goal ({pct}%)
              </div>

              <div className="mt-3">
                {!user && (
                  <Link to="/login/member" className="text-sm text-indigo-600 hover:underline">
                    Log in as a member to donate
                  </Link>
                )}

                {user?.role === "member" && donatingFor === c.id && (
                  <form onSubmit={handleDonate} className="flex flex-wrap items-end gap-3">
                    <label className="flex flex-col gap-1 text-sm">
                      <span className="text-slate-700">Amount (USD)</span>
                      <Input
                        type="number"
                        min="1"
                        step="0.01"
                        required
                        value={donateAmount}
                        onChange={(e) => setDonateAmount(e.target.value)}
                        className="w-28"
                      />
                    </label>
                    <Button type="submit" size="sm" disabled={isDonating}>
                      {isDonating ? "Processing…" : "Donate (test)"}
                    </Button>
                    <Button type="button" variant="text" onClick={() => setDonatingFor(null)}>
                      Cancel
                    </Button>
                    {donateError && <p className="w-full text-sm text-red-600">{donateError}</p>}
                  </form>
                )}

                {user?.role === "member" && donatingFor !== c.id && (
                  <Button size="sm" onClick={() => startDonating(c.id)}>
                    Donate
                  </Button>
                )}

                {donateSuccessId === c.id && (
                  <p className="mt-2 text-sm text-green-600">
                    Thanks for your test donation — no real payment was processed.
                  </p>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <h2 className="mt-10 text-xl font-semibold text-slate-900">Opportunities</h2>

      {opportunities.length === 0 && (
        <p className="mt-2 text-sm text-slate-500">No open opportunities right now.</p>
      )}

      <div className="mt-4 flex flex-col gap-3">
        {opportunities.map((opp) => {
          const isSignedUp = signedUpIds.has(opp.id);
          const isPending = pendingId === opp.id;

          return (
            <Card key={opp.id}>
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-900">{opp.title}</span>
                <StatusBadge tone={CATEGORY_TONE[opp.category]}>{CATEGORY_LABELS[opp.category]}</StatusBadge>
              </div>
              <div className="mt-1 text-sm text-slate-500">
                {formatDateRange(opp.startDate, opp.endDate)}
                {opp.location ? ` · ${opp.location}` : opp.isRemote ? " · Remote" : ""}
              </div>
              {opp.description && <p className="mt-2 text-sm text-slate-600">{opp.description}</p>}

              <div className="mt-3">
                {!user && (
                  <Link to="/login/member" className="text-sm text-indigo-600 hover:underline">
                    Log in as a member to sign up
                  </Link>
                )}

                {user?.role === "member" &&
                  (isSignedUp ? (
                    <Button variant="secondary" size="sm" onClick={() => handleCancel(opp.id)} disabled={isPending}>
                      {isPending ? "Cancelling…" : "Cancel signup"}
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => handleSignUp(opp.id)} disabled={isPending}>
                      {isPending ? "Signing up…" : "Sign up"}
                    </Button>
                  ))}
              </div>
            </Card>
          );
        })}
      </div>

      {badges.length > 0 && (
        <>
          <h2 className="mt-10 text-xl font-semibold text-slate-900">Badges</h2>
          <p className="mt-1 text-sm text-slate-500">Earned as you volunteer, give, and take part in competitions.</p>

          <div className="mt-4 flex flex-wrap gap-6">
            {badges.map((b) => (
              <div key={b.id} className="flex w-32 flex-col items-center text-center">
                <MeritBadge
                  name={b.name}
                  badgeType={b.badgeType}
                  iconUrl={b.iconUrl}
                  organizationLogoUrl={organization.logoUrl}
                  size="lg"
                />
                <div className="mt-1 text-xs text-slate-500">{criteriaLabel(b)}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
