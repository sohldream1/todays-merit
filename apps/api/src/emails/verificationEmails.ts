import { env } from "../lib/env.js";
import type { EmailMessage } from "../lib/mailer.js";

// Templates return everything except `to` — the caller (notifications.ts)
// fills that in per recipient so one submission/decision can fan out to
// multiple org admins (or platform admins) from a single rendered message.
type EmailTemplate = Omit<EmailMessage, "to">;

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

export function verificationSubmittedEmail(orgName: string): EmailTemplate {
  const url = `${env.webOrigin}/dashboard/platform-admin`;
  return {
    subject: `New verification submission: ${orgName}`,
    text: `${orgName} has submitted for nonprofit verification and is awaiting review.\n\nReview it: ${url}`,
    html: `<p><strong>${escapeHtml(orgName)}</strong> has submitted for nonprofit verification and is awaiting review.</p><p><a href="${url}">Review it</a></p>`,
  };
}

export function verificationApprovedEmail(orgName: string, organizationId: string): EmailTemplate {
  const url = `${env.webOrigin}/organizations/${organizationId}`;
  return {
    subject: `${orgName} is now verified on Today's Merit`,
    text: `Good news — ${orgName} has been verified by the Today's Merit team and now shows a "Verified" badge across the platform.\n\nView your public profile: ${url}`,
    html: `<p>Good news — <strong>${escapeHtml(orgName)}</strong> has been verified by the Today's Merit team and now shows a "Verified" badge across the platform.</p><p><a href="${url}">View your public profile</a></p>`,
  };
}

export function verificationRejectedEmail(orgName: string, notes: string): EmailTemplate {
  const url = `${env.webOrigin}/dashboard/org/profile`;
  return {
    subject: `Action needed: verification update for ${orgName}`,
    text: `Your verification submission for ${orgName} needs another look before it can be approved.\n\nReviewer notes:\n${notes}\n\nUpdate your profile and resubmit: ${url}`,
    html: `<p>Your verification submission for <strong>${escapeHtml(orgName)}</strong> needs another look before it can be approved.</p><p><strong>Reviewer notes:</strong><br>${escapeHtml(notes).replace(/\n/g, "<br>")}</p><p><a href="${url}">Update your profile and resubmit</a></p>`,
  };
}
