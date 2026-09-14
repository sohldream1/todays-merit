import rateLimit from "express-rate-limit";

// Keyed by IP (express-rate-limit's default) — if this is ever deployed
// behind a reverse proxy/load balancer, `app.set("trust proxy", ...)` needs
// to be configured too, or every request will appear to come from the
// proxy's own IP and share one limit.

// The integration test suite drives the real Express app over HTTP from a
// single process/IP and easily exceeds these limits within one run (that's
// the point of the limiters). The limiting behavior itself is covered by a
// live manual check, not by the automated suite, so it's skipped in the
// test environment rather than tuned around — a fake limit here would be
// testing the fake limit, not the real one.
const isTestEnv = process.env.NODE_ENV === "test";

// Only failed attempts count against the limit (skipSuccessfulRequests) —
// this is meant to slow down password guessing, not penalize someone who
// just logs in a lot.
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skip: () => isTestEnv,
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
  skip: () => isTestEnv,
  message: { error: "Too many accounts created from this location. Try again later." },
});
