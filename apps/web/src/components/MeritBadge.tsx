import type { BadgeType } from "@todays-merit/shared-types";
import { Logo } from "./Logo";

// Visual "medal" for gamification badges — same circular-beacon language as
// RatingBadges (StarBeacon/SealBeacon), but branded per-org: the center
// shows the issuing nonprofit's own logo rather than a generic icon
// whenever they've set one, with a small Today's Merit hallmark pinned in
// the corner as the mark of authenticity (the badge came from this
// platform, not just from the org).

const TYPE_STYLE: Record<BadgeType, { ring: string; iconBg: string; iconColor: string }> = {
  volunteer_milestone: { ring: "#4d63f0", iconBg: "#eef1ff", iconColor: "#3646dd" },
  donation_milestone: { ring: "#d97706", iconBg: "#fef3c7", iconColor: "#b45309" },
  competition: { ring: "#9333ea", iconBg: "#f3e8ff", iconColor: "#7e22ce" },
  custom: { ring: "#64748b", iconBg: "#f1f5f9", iconColor: "#475569" },
};

const SIZE_PX: Record<"sm" | "md" | "lg", number> = { sm: 48, md: 64, lg: 88 };

function TypeIcon({ badgeType, className }: { badgeType: BadgeType; className?: string }) {
  switch (badgeType) {
    case "volunteer_milestone":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3.5 2" />
        </svg>
      );
    case "donation_milestone":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="2">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 21s-7.5-4.6-9.8-9.1C.7 8.6 2.3 5 6 5c2 0 3.3 1 4 2.1C10.7 6 12 5 14 5c3.7 0 5.3 3.6 3.8 6.9C15.5 16.4 12 21 12 21Z"
          />
        </svg>
      );
    case "competition":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0V4Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 5H4a1 1 0 0 0-1 1v1a4 4 0 0 0 4 4M17 5h3a1 1 0 0 1 1 1v1a4 4 0 0 1-4 4" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M12 2.5l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 16.3l-5.4 3.1 1-6.1L3.2 9l6.1-.9L12 2.5z" />
        </svg>
      );
  }
}

export function MeritBadge({
  name,
  badgeType,
  iconUrl,
  organizationLogoUrl,
  size = "md",
}: {
  name: string;
  badgeType: BadgeType;
  iconUrl?: string | null;
  organizationLogoUrl?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const style = TYPE_STYLE[badgeType];
  const px = SIZE_PX[size];
  const imageUrl = organizationLogoUrl || iconUrl || null;

  return (
    <div className="flex flex-col items-center" title={name}>
      <div className="relative" style={{ width: px, height: px }}>
        <div
          className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border-4 bg-white shadow-sm"
          style={{ borderColor: style.ring }}
        >
          {imageUrl ? (
            <img src={imageUrl} alt="" className="h-full w-full object-contain p-2" />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center"
              style={{ backgroundColor: style.iconBg, color: style.iconColor }}
            >
              <TypeIcon badgeType={badgeType} className="h-1/2 w-1/2" />
            </div>
          )}
        </div>
        <div
          className="absolute -bottom-1 -right-1 flex items-center justify-center rounded-full border-2 border-white bg-white shadow"
          style={{ width: px * 0.4, height: px * 0.4 }}
          title="Issued via Today's Merit"
        >
          <Logo className="h-full w-full" />
        </div>
      </div>
      {size !== "sm" && <span className="mt-2 max-w-[8rem] text-center text-xs font-medium text-slate-700">{name}</span>}
    </div>
  );
}
