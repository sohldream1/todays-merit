import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { CauseArea, CharityRecommendation } from "@todays-merit/shared-types";
import { meApi } from "../api/client";
import { RatingBadges } from "./RatingBadges";
import { Button, cardClasses } from "./ui";

const CAUSE_AREAS: CauseArea[] = [
  "community",
  "faith",
  "youth",
  "health",
  "environment",
  "arts_education",
  "other",
];

export function RecommendationsSection() {
  const [interests, setInterests] = useState<Set<CauseArea>>(new Set());
  const [recommendations, setRecommendations] = useState<CharityRecommendation[]>([]);
  const [isAiGenerated, setIsAiGenerated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  function loadRecommendations() {
    return meApi.recommendations().then((res) => {
      setRecommendations(res.recommendations);
      setIsAiGenerated(res.isAiGenerated);
    });
  }

  useEffect(() => {
    setIsLoading(true);
    Promise.all([meApi.interests(), loadRecommendations()])
      .then(([interestsRes]) => setInterests(new Set(interestsRes.causeAreaInterests)))
      .finally(() => setIsLoading(false));
  }, []);

  function toggleInterest(area: CauseArea) {
    setInterests((prev) => {
      const next = new Set(prev);
      if (next.has(area)) next.delete(area);
      else next.add(area);
      return next;
    });
  }

  async function handleSaveInterests() {
    setIsSaving(true);
    try {
      await meApi.updateInterests({ causeAreaInterests: [...interests] });
      await loadRecommendations();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mt-10">
      <h2 className="text-lg font-semibold text-slate-900">Your interests</h2>
      <p className="mt-1 text-sm text-slate-500">
        Pick a few causes you care about — we'll use them to recommend charities.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {CAUSE_AREAS.map((area) => {
          const active = interests.has(area);
          return (
            <button
              key={area}
              type="button"
              onClick={() => toggleInterest(area)}
              className={`rounded-full border px-3 py-1.5 text-sm capitalize transition-colors ${
                active
                  ? "border-indigo-600 bg-indigo-600 text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
              }`}
            >
              {area.replace("_", " / ")}
            </button>
          );
        })}
      </div>

      <Button onClick={handleSaveInterests} disabled={isSaving} size="sm" className="mt-3">
        {isSaving ? "Saving…" : "Save interests"}
      </Button>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Recommended for you</h2>
        <span className="text-xs text-slate-400">
          {isAiGenerated ? "✨ AI-powered picks" : "Basic matching — add an AI provider key for smarter picks"}
        </span>
      </div>

      {isLoading && <p className="mt-2 text-sm text-slate-500">Loading…</p>}

      {!isLoading && recommendations.length === 0 && (
        <p className="mt-2 text-sm text-slate-500">
          No recommendations yet — pick a few interests above, or check back once more charities join.
        </p>
      )}

      <div className="mt-4 flex flex-col gap-3">
        {recommendations.map((rec) => (
          <Link key={rec.organization.id} to={`/organizations/${rec.organization.id}`} className={cardClasses("block hover:border-indigo-200")}>
            <div className="font-medium text-slate-900">{rec.organization.name}</div>
            <div className="mt-1 text-sm text-slate-500">
              {rec.organization.causeArea.replace("_", " / ")}
              {rec.organization.city ? ` · ${rec.organization.city}${rec.organization.state ? `, ${rec.organization.state}` : ""}` : ""}
            </div>
            <p className="mt-2 text-sm text-slate-600">{rec.reason}</p>
            <RatingBadges rating={rec.organization.rating} />
          </Link>
        ))}
      </div>
    </div>
  );
}
