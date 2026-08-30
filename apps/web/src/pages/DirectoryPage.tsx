import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { CauseArea, Organization } from "@todays-merit/shared-types";
import { organizationsApi } from "../api/client";
import { RatingBadges } from "../components/RatingBadges";
import { cardClasses, Input, Select, StatusBadge } from "../components/ui";

const CAUSE_AREAS: CauseArea[] = [
  "community",
  "faith",
  "youth",
  "health",
  "environment",
  "arts_education",
  "other",
];

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

export function DirectoryPage() {
  const [searchParams] = useSearchParams();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [causeArea, setCauseArea] = useState<CauseArea | "">("");
  const [location, setLocation] = useState("");

  useEffect(() => {
    setIsLoading(true);
    const timeout = setTimeout(() => {
      organizationsApi
        .list({
          q: query || undefined,
          causeArea: causeArea || undefined,
          city: location || undefined,
        })
        .then(({ organizations }) => setOrganizations(organizations))
        .finally(() => setIsLoading(false));
    }, 250);
    return () => clearTimeout(timeout);
  }, [query, causeArea, location]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-semibold text-slate-900">Find a charity</h1>
      <p className="mt-1 text-slate-600">Search by name or keyword, filter by cause area and location.</p>

      <Input
        type="text"
        placeholder="Search by name or keyword…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mt-6 w-full"
      />

      <div className="mt-3 flex flex-wrap gap-4">
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
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {isLoading && <p className="text-sm text-slate-500">Loading…</p>}

        {!isLoading && organizations.length === 0 && (
          <p className="text-sm text-slate-500">No organizations match your search.</p>
        )}

        {organizations.map((org) => (
          <Link
            key={org.id}
            to={`/organizations/${org.id}`}
            className={cardClasses("transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md")}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="font-medium text-slate-900">{org.name}</div>
              <StatusBadge tone={VERIFICATION_TONE[org.verificationStatus]}>
                {VERIFICATION_LABELS[org.verificationStatus]}
              </StatusBadge>
            </div>
            <div className="mt-1 text-sm text-slate-500">
              {org.causeArea.replace("_", " / ")}
              {org.city ? ` · ${org.city}${org.state ? `, ${org.state}` : ""}` : ""}
            </div>
            {org.missionStatement && (
              <p className="mt-2 line-clamp-2 text-sm text-slate-600">{org.missionStatement}</p>
            )}
            <RatingBadges rating={org.rating} />
          </Link>
        ))}
      </div>
    </div>
  );
}
