import type { ReactNode } from "react";

// Replaces the plain "No X yet." gray text scattered across every list in
// the app with a consistent, slightly more inviting treatment — still
// minimal (a dashed box, not an illustration) to match the clean/trustworthy
// direction rather than adding a different icon per empty state.
export function EmptyState({ description, action }: { description: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/60 px-6 py-8 text-center">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="mx-auto h-8 w-8 text-slate-300"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5 12 3l9 4.5M3 7.5v9L12 21m-9-4.5L12 12m0 9 9-4.5v-9M12 12l9-4.5M12 12v9" />
      </svg>
      <p className="mt-3 text-sm text-slate-500">{description}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
