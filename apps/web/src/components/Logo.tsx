export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#3646dd" />
      <path
        d="M16 7.5l2.47 5.01 5.53.8-4 3.9.94 5.5L16 20.15l-4.94 2.56.94-5.5-4-3.9 5.53-.8L16 7.5z"
        fill="white"
      />
    </svg>
  );
}
