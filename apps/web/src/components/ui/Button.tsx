import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "text" | "textDanger";
type ButtonSize = "sm" | "md";

const VARIANT: Record<ButtonVariant, string> = {
  primary: "rounded-md bg-indigo-600 text-white hover:bg-indigo-500",
  secondary: "rounded-md border border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-50",
  text: "text-indigo-600 hover:underline",
  textDanger: "text-red-600 hover:underline",
};

const SIZE: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

// Also exported standalone so react-router <Link>s that are styled as
// buttons/text-actions (very common in this app — "Back to dashboard",
// "Log in to sign up", etc.) can share the exact same treatment without
// rendering an actual <button>.
export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md", className = ""): string {
  const isTextVariant = variant === "text" || variant === "textDanger";
  const sizing = isTextVariant ? "text-sm" : SIZE[size];
  return `whitespace-nowrap font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none ${sizing} ${VARIANT[variant]} ${className}`;
}

// Covers every button treatment used across the app: solid primary actions,
// outlined secondary actions, and plain text-link actions (edit/cancel/
// disconnect) — the three patterns that were previously copy-pasted as raw
// className strings on every page.
export function Button({ variant = "primary", size = "md", className = "", ...props }: ButtonProps) {
  return <button className={buttonClasses(variant, size, className)} {...props} />;
}
