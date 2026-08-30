import type { CharityRating } from "@todays-merit/shared-types";

// Original circular "beacon" design — a compact at-a-glance rating badge,
// evoking the general idea used across the charity-rating industry (a
// circular score indicator) without copying any specific provider's actual
// trademarked graphic or brand colors.

const STAR_RING_COLORS = ["#94a3b8", "#f59e0b", "#3b82f6", "#3b82f6", "#10b981"]; // 0-4 stars

const SEAL_COLORS: Record<Exclude<CharityRating["guideStarSealLevel"], null>, { ring: string; fill: string }> = {
  platinum: { ring: "#64748b", fill: "#e2e8f0" },
  gold: { ring: "#b45309", fill: "#fde68a" },
  silver: { ring: "#71717a", fill: "#e4e4e7" },
  bronze: { ring: "#9a5b2e", fill: "#fed7aa" },
  none: { ring: "#cbd5e1", fill: "#f8fafc" },
};

function StarBeacon({ stars, score, url }: { stars: number; score: number | null; url: string | null }) {
  const ringColor = STAR_RING_COLORS[Math.max(0, Math.min(4, stars))];
  const content = (
    <div className="flex flex-col items-center" title={score !== null ? `${score}/100 on Charity Navigator` : undefined}>
      <div
        className="flex h-14 w-14 flex-col items-center justify-center rounded-full border-4 bg-white shadow-sm"
        style={{ borderColor: ringColor }}
      >
        <div className="text-[10px] leading-none text-amber-500">{"★".repeat(stars)}{"☆".repeat(4 - stars)}</div>
        {score !== null && <div className="mt-1 text-xs font-semibold text-slate-700">{Math.round(score)}</div>}
      </div>
      <span className="mt-1 text-[10px] text-slate-500">Charity Navigator</span>
    </div>
  );

  if (!url) return content;
  return (
    <a href={url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="hover:opacity-80">
      {content}
    </a>
  );
}

function SealBeacon({ level, url }: { level: Exclude<CharityRating["guideStarSealLevel"], null>; url: string | null }) {
  const colors = SEAL_COLORS[level];
  const content = (
    <div className="flex flex-col items-center">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-full border-4 text-center"
        style={{ borderColor: colors.ring, backgroundColor: colors.fill }}
      >
        <span className="px-1 text-[10px] font-semibold capitalize leading-tight text-slate-700">{level}</span>
      </div>
      <span className="mt-1 text-[10px] text-slate-500">GuideStar</span>
    </div>
  );

  if (!url) return content;
  return (
    <a href={url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="hover:opacity-80">
      {content}
    </a>
  );
}

export function RatingBadges({ rating }: { rating: CharityRating | null }) {
  if (!rating) return null;

  const hasCharityNavigator = rating.charityNavigatorStars !== null;
  const hasGuideStarSeal = rating.guideStarSealLevel && rating.guideStarSealLevel !== "none";

  if (!hasCharityNavigator && !hasGuideStarSeal) return null;

  return (
    <div className="mt-3 flex flex-wrap items-start gap-3">
      {hasCharityNavigator && (
        <StarBeacon
          stars={rating.charityNavigatorStars!}
          score={rating.charityNavigatorScore}
          url={rating.charityNavigatorUrl}
        />
      )}

      {hasGuideStarSeal && <SealBeacon level={rating.guideStarSealLevel!} url={rating.guideStarUrl} />}

      {rating.isMock && (
        <span
          className="self-center text-xs text-slate-400"
          title="Sample rating — not connected to a real Charity Navigator or GuideStar account yet"
        >
          (sample data)
        </span>
      )}
    </div>
  );
}
