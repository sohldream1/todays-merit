import type { ReactNode } from "react";

type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "purple";

type Size = "sm" | "md";

const TONE: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-600",
  success: "bg-green-100 text-green-700",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-red-100 text-red-700",
  info: "bg-indigo-100 text-indigo-700",
  // Matches MeritBadge's competition ring color for a consistent "this is a
  // competition" visual language across the app.
  purple: "bg-purple-100 text-purple-700",
};

const SIZE: Record<Size, string> = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-3 py-1 text-sm",
};

export function StatusBadge({
  tone = "neutral",
  size = "sm",
  children,
  className = "",
}: {
  tone?: Tone;
  size?: Size;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={`whitespace-nowrap rounded-full font-medium ${SIZE[size]} ${TONE[tone]} ${className}`}>
      {children}
    </span>
  );
}
