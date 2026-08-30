import type { HTMLAttributes } from "react";

export const CARD_BASE = "rounded-lg border border-slate-200 bg-white p-4 shadow-sm";

// Exported as a plain class string too, for the many places a "card" is
// actually a react-router <Link> (search results, directory listings) or
// needs extra classes like hover-lift that can't go through a prop.
export function cardClasses(className = ""): string {
  return `${CARD_BASE} ${className}`;
}

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cardClasses(className)} {...props} />;
}
