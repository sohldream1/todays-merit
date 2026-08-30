import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import type {
  MyBadge,
  MyDonation,
  MySignup,
  MySwagOrder,
  MyTierStatus,
  MyVolunteerHour,
} from "@todays-merit/shared-types";
import { ApiClientError, meApi, volunteerHoursApi } from "../../api/client";
import { MeritBadge } from "../../components/MeritBadge";
import { RecommendationsSection } from "../../components/RecommendationsSection";
import { ShippingAddressCard } from "../../components/ShippingAddressCard";
import { Button, Card, EmptyState, Input, StatusBadge } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { timeZone: "UTC" });
}

function formatDateRange(start: string | null, end: string | null): string {
  if (!start) return "Ongoing";
  if (!end) return `Starts ${formatDate(start)} · ongoing`;
  return `${formatDate(start)} – ${formatDate(end)}`;
}

function todayDateInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

export function MemberDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [signups, setSignups] = useState<MySignup[]>([]);
  const [hours, setHours] = useState<MyVolunteerHour[]>([]);
  const [donations, setDonations] = useState<MyDonation[]>([]);
  const [badges, setBadges] = useState<MyBadge[]>([]);
  const [swagOrders, setSwagOrders] = useState<MySwagOrder[]>([]);
  const [tierStatus, setTierStatus] = useState<MyTierStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loggingFor, setLoggingFor] = useState<string | null>(null);
  const [hoursValue, setHoursValue] = useState("");
  const [dateValue, setDateValue] = useState(todayDateInputValue());
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function load() {
    setIsLoading(true);
    Promise.all([meApi.signups(), meApi.hours(), meApi.donations(), meApi.badges(), meApi.tier(), meApi.swag()])
      .then(([signupsRes, hoursRes, donationsRes, badgesRes, tierRes, swagRes]) => {
        setSignups(signupsRes.signups);
        setHours(hoursRes.hours);
        setDonations(donationsRes.donations);
        setBadges(badgesRes.badges);
        setTierStatus(tierRes);
        setSwagOrders(swagRes.orders);
      })
      .finally(() => setIsLoading(false));
  }

  useEffect(load, []);

  function startLogging(opportunityId: string) {
    setLoggingFor(opportunityId);
    setHoursValue("");
    setDateValue(todayDateInputValue());
    setError(null);
  }

  async function handleLogHours(e: FormEvent) {
    e.preventDefault();
    if (!loggingFor) return;
    setError(null);
    setIsSaving(true);
    try {
      await volunteerHoursApi.log({
        opportunityId: loggingFor,
        hours: Number(hoursValue),
        dateOfService: dateValue,
      });
      setLoggingFor(null);
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong");
    } finally {
      setIsSaving(false);
    }
  }

  function handleSearchSubmit(e: FormEvent) {
    e.preventDefault();
    navigate(searchQuery ? `/directory?q=${encodeURIComponent(searchQuery)}` : "/directory");
  }

  const totalHours = hours.reduce((sum, h) => sum + h.hours, 0);
  const totalDonated = donations.reduce((sum, d) => sum + d.amount, 0);

  const connectedOrgs = new Map<string, string>();
  for (const s of signups) connectedOrgs.set(s.opportunity.organization.id, s.opportunity.organization.name);
  for (const h of hours) connectedOrgs.set(h.organization.id, h.organization.name);
  for (const d of donations) connectedOrgs.set(d.organization.id, d.organization.name);
  for (const b of badges) connectedOrgs.set(b.organization.id, b.organization.name);

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-semibold text-slate-900">Welcome, {user?.firstName}</h1>

      <form onSubmit={handleSearchSubmit} className="mt-4 flex gap-2">
        <Input
          type="text"
          placeholder="Search charities by name or keyword…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1"
        />
        <Button type="submit">Search</Button>
      </form>
      <Link to="/opportunities" className="mt-2 inline-block text-sm text-indigo-600 hover:underline">
        Looking for something to do? Browse volunteer opportunities →
      </Link>

      {tierStatus && (
        <Card className="mt-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-400">Current tier</div>
              <div className="text-lg font-semibold text-slate-900">
                {tierStatus.currentTier?.name ?? "Unranked"}
              </div>
            </div>
            <div className="text-sm text-slate-500">{tierStatus.totalHours} verified hours</div>
          </div>

          {tierStatus.nextTier && (
            <>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-indigo-600"
                  style={{
                    width: `${Math.min(100, Math.round((tierStatus.totalHours / tierStatus.nextTier.criteria.threshold) * 100))}%`,
                  }}
                />
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {Math.max(0, tierStatus.nextTier.criteria.threshold - tierStatus.totalHours)} more hours to{" "}
                {tierStatus.nextTier.name}
              </div>
            </>
          )}
        </Card>
      )}

      <ShippingAddressCard />

      <RecommendationsSection />

      {connectedOrgs.size > 0 && (
        <>
          <h2 className="mt-10 text-lg font-semibold text-slate-900">Organizations you're connected to</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {[...connectedOrgs.entries()].map(([orgId, name]) => (
              <Link
                key={orgId}
                to={`/organizations/${orgId}`}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:border-slate-300"
              >
                {name}
              </Link>
            ))}
          </div>
        </>
      )}

      <h2 className="mt-10 text-lg font-semibold text-slate-900">Your volunteering</h2>

      {isLoading && <p className="mt-2 text-sm text-slate-500">Loading…</p>}

      {!isLoading && signups.length === 0 && (
        <EmptyState
          description="You haven't signed up for anything yet."
          action={
            <Link to="/opportunities" className="text-sm font-medium text-indigo-600 hover:underline">
              Browse opportunities →
            </Link>
          }
        />
      )}

      <div className="mt-4 flex flex-col gap-3">
        {signups.map((signup) => (
          <Card key={signup.id}>
            <div className="font-medium text-slate-900">{signup.opportunity.title}</div>
            <div className="mt-1 text-sm text-slate-500">
              {signup.opportunity.organization.name} ·{" "}
              {formatDateRange(signup.opportunity.startDate, signup.opportunity.endDate)}
            </div>
            <div className="mt-1 text-xs uppercase tracking-wide text-slate-400">
              {signup.status.replace("_", " ")}
            </div>

            {loggingFor === signup.opportunity.id ? (
              <form onSubmit={handleLogHours} className="mt-3 flex flex-wrap items-end gap-3">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-slate-700">Hours</span>
                  <Input
                    type="number"
                    step="0.25"
                    min="0.25"
                    max="999"
                    required
                    value={hoursValue}
                    onChange={(e) => setHoursValue(e.target.value)}
                    className="w-24"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-slate-700">Date</span>
                  <Input type="date" required value={dateValue} onChange={(e) => setDateValue(e.target.value)} />
                </label>
                <Button type="submit" size="sm" disabled={isSaving}>
                  {isSaving ? "Saving…" : "Submit"}
                </Button>
                <Button type="button" variant="text" onClick={() => setLoggingFor(null)}>
                  Cancel
                </Button>
                {error && <p className="w-full text-sm text-red-600">{error}</p>}
              </form>
            ) : (
              <button
                onClick={() => startLogging(signup.opportunity.id)}
                className="mt-3 text-sm font-medium text-indigo-600 hover:underline"
              >
                Log hours
              </button>
            )}
          </Card>
        ))}
      </div>

      <div className="mt-10 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Your logged hours</h2>
        {hours.length > 0 && <span className="text-sm text-slate-500">{totalHours} hours total</span>}
      </div>

      {!isLoading && hours.length === 0 && <EmptyState description="No hours logged yet." />}

      <div className="mt-4 flex flex-col gap-3">
        {hours.map((h) => (
          <Card key={h.id} className="flex items-center justify-between">
            <div>
              <div className="font-medium text-slate-900">
                {h.hours} hours {h.opportunity ? `· ${h.opportunity.title}` : ""}
              </div>
              <div className="mt-1 text-sm text-slate-500">
                {h.organization.name} · {formatDate(h.dateOfService)}
              </div>
            </div>
            <StatusBadge tone={h.verificationStatus === "verified_by_org" ? "success" : "neutral"}>
              {h.verificationStatus === "verified_by_org" ? "Verified" : "Self-reported"}
            </StatusBadge>
          </Card>
        ))}
      </div>

      <div className="mt-10 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Your donations</h2>
        {donations.length > 0 && (
          <span className="text-sm text-slate-500">${totalDonated.toLocaleString()} total</span>
        )}
      </div>

      {!isLoading && donations.length === 0 && <EmptyState description="No donations yet." />}

      <div className="mt-4 flex flex-col gap-3">
        {donations.map((d) => (
          <Card key={d.id}>
            <div className="font-medium text-slate-900">${d.amount.toLocaleString()}</div>
            <div className="mt-1 text-sm text-slate-500">
              {d.organization.name}
              {d.campaign ? ` · ${d.campaign.title}` : ""} · {formatDate(d.donatedAt)}
            </div>
          </Card>
        ))}
      </div>

      <h2 className="mt-10 text-lg font-semibold text-slate-900">Your badges</h2>

      {!isLoading && badges.length === 0 && (
        <EmptyState description="No badges yet — they're awarded automatically as your verified hours and donations add up." />
      )}

      <div className="mt-4 flex flex-wrap gap-6">
        {badges.map((b) => (
          <div key={b.id} className="flex w-28 flex-col items-center text-center">
            <MeritBadge
              name={b.badge.name}
              badgeType={b.badge.badgeType}
              iconUrl={b.badge.iconUrl}
              organizationLogoUrl={b.organization.logoUrl}
              size="lg"
            />
            <div className="mt-1 text-xs text-slate-500">
              {b.organization.name} · {formatDate(b.awardedAt)}
            </div>
          </div>
        ))}
      </div>

      <h2 className="mt-10 text-lg font-semibold text-slate-900">Swag you've received</h2>

      {!isLoading && swagOrders.length === 0 && (
        <EmptyState description="No swag yet — organizations can send you items after you volunteer or donate." />
      )}

      <div className="mt-4 flex flex-col gap-3">
        {swagOrders.map((o) => (
          <Card key={o.id} className="flex items-center justify-between">
            <div>
              <div className="font-medium text-slate-900">
                {o.product.name}
                {o.size ? ` (${o.size})` : ""}
              </div>
              <div className="mt-1 text-sm text-slate-500">
                From {o.organization.name} · {formatDate(o.createdAt)}
              </div>
              {o.trackingNumber && (
                <div className="mt-1 text-xs text-slate-400">Tracking: {o.trackingNumber}</div>
              )}
            </div>
            <StatusBadge
              tone={
                o.status === "shipped" || o.status === "delivered"
                  ? "success"
                  : o.status === "failed"
                    ? "danger"
                    : "neutral"
              }
            >
              {o.status.replace("_", " ")}
            </StatusBadge>
          </Card>
        ))}
      </div>
    </div>
  );
}
