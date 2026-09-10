import { env } from "../lib/env.js";
import type { EmailMessage } from "../lib/mailer.js";

type EmailTemplate = Omit<EmailMessage, "to">;

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

export function teamInviteEmail(orgName: string, inviterName: string, token: string): EmailTemplate {
  const url = `${env.webOrigin}/join-org/${token}`;
  return {
    subject: `${inviterName} invited you to join ${orgName} on Today's Merit`,
    text: `${inviterName} invited you to join ${orgName}'s team on Today's Merit.\n\nAccept the invite: ${url}\n\nThis link expires in 7 days.`,
    html: `<p><strong>${escapeHtml(inviterName)}</strong> invited you to join <strong>${escapeHtml(orgName)}</strong>'s team on Today's Merit.</p><p><a href="${url}">Accept the invite</a></p><p>This link expires in 7 days.</p>`,
  };
}
