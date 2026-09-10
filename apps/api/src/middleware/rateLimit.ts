import rateLimit from "express-rate-limit";

// Keyed by IP (express-rate-limit's default) — if this is ever deployed
// behind a reverse proxy/load balancer, `app.set("trust proxy", ...)` needs
// to be configured too, or every request will appear to come from the
// proxy's own IP and share one limit.

// Only failed attempts count against the limit (skipSuccessfulRequests) —
// this is meant to slow down password guessing, not penalize someone who
// just logs in a lot.
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: "Too many login attempts. Wait a few minutes and try again." },
});

// Shared across all three signup routes (member/nonprofit/race-director) —
// applied once per IP rather than per-endpoint, so switching signup forms
// doesn't reset the count.
export const signupRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many accounts created from this location. Try again later." },
});
