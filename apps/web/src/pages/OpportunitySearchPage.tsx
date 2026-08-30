import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { CauseArea, OpportunityCategory, OpportunitySearchResult } from "@todays-merit/shared-types";
import { meApi, opportunitiesApi } from "../api/client";
import { RatingBadges } from "../components/RatingBadges";
import { Button, Card, Input, Select, StatusBadge } from "../components/ui";
import { useAuth } from "../context/AuthContext";

const CAUSE_AREAS: CauseArea[] = [
  "community",
  "faith",
  "youth",
  "health",
  "environment",
  "arts_education",
  "other",
];

const CATEGORIES: OpportunityCategory[] = ["volunteer", "race", "competition"];

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

export function OpportunitySearchPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [opportunities, setOpportunities] = useState<OpportunitySearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [category, setCategory] = useState<OpportunityCategory | "">(
    (searchParams.get("category") as OpportunityCategory | null) ?? "",
  );
  const [causeArea, setCauseArea] = useState<CauseArea | "">("");
  const [location, setLocation] = useState("");
  const [remoteOnly, setRemoteOnly] = useState(false);

  const [signedUpIds, setSignedUpIds] = useState<Set<string>>(new Set());
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    const timeout = setTimeout(() => {
      opportunitiesApi
        .search({
          q: query || undefined,
          category: category || undefined,
          causeArea: causeArea || undefined,
          city: location || undefined,
          isRemote: remoteOnly || undefined,
        })
        .then(({ opportunities }) => setOpportunities(opportunities))
        .finally(() => setIsLoading(false));
    }, 250);
    return () => clearTimeout(timeout);
  }, [query, category, causeArea, location, remoteOnly]);

  useEffect(() => {
    if (user?.role !== "member") return;
    meApi.signups().then(({ signups }) => setSignedUpIds(new Set(signups.map((s) => s.opportunity.id))));
  }, [user?.role]);

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

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-semibold text-slate-900">Find something to do</h1>
      <p className="mt-1 text-slate-600">
        Search volunteer opportunities, races, and competitions — filter by type, cause area, and location.
      </p>

      <Input
        type="text"
        placeholder="Search by title or keyword…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mt-6 w-full"
      />

      <div className="mt-3 flex flex-wrap items-center gap-4">
        <Select value={category} onChange={(e) => setCategory(e.target.value as OpportunityCategory | "")}>
          <option value="">All types</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </Select>

        <Select value={causeArea} onChange={(e) => setCauseArea(e.target.value as CauseArea | "")}>
          <option value="">All cause areas</option>
          {CAUSE_AREAS.map((area) => (
            <option key={area} value={area}>
              {area.replace("_", " / ")}
            </option>
          ))}
        </Select>

        <Input
          type="text"
          placeholder="Filter by city…"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={remoteOnly}
            onChange={(e) => setRemoteOnly(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          Remote only
        </label>
      </div>

      <div className="mt-6 flex flex-col gap-4">
        {isLoading && <p className="text-sm text-slate-500">Loading…</p>}

        {!isLoading && opportunities.length === 0 && (
          <p className="text-sm text-slate-500">No opportunities match your search.</p>
        )}

        {opportunities.map((opp) => {
          const isSignedUp = signedUpIds.has(opp.id);
          const isPending = pendingId === opp.id;

          return (
            <Card key={opp.id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900">{opp.title}</span>
                    <StatusBadge tone={CATEGORY_TONE[opp.category]}>{CATEGORY_LABELS[opp.category]}</StatusBadge>
                  </div>
                  <Link
                    to={`/organizations/${opp.organization.id}`}
                    className="text-sm text-indigo-600 hover:underline"
                  >
                    {opp.organization.name}
                  </Link>
                  <div className="mt-1 text-sm text-slate-500">
                    {opp.organization.causeArea.replace("_", " / ")}
                    {opp.organization.city
                      ? ` · ${opp.organization.city}${opp.organization.state ? `, ${opp.organization.state}` : ""}`
                      : ""}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    {formatDateRange(opp.startDate, opp.endDate)}
                    {opp.location ? ` · ${opp.location}` : opp.isRemote ? " · Remote" : ""}
                  </div>
                  {opp.description && <p className="mt-2 text-sm text-slate-600">{opp.description}</p>}
                  <RatingBadges rating={opp.organization.rating} />
                </div>

                <div className="shrink-0">
                  {!user && (
                    <Link to="/login/member" className="text-sm text-indigo-600 hover:underline">
                      Log in to sign up
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
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
