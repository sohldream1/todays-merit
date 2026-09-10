import { prisma } from "./prisma.js";
import { env } from "./env.js";
import { sendEmail, type EmailMessage } from "./mailer.js";

type EmailTemplate = Omit<EmailMessage, "to">;

// Fire-and-log: a mail provider outage or misconfiguration never blocks the
// action that triggered it (a verification submission or decision) — the
// database is the source of truth for the workflow, email is a best-effort
// notification layered on top of it.
async function safeSend(to: string, message: EmailTemplate): Promise<void> {
  try {
    await sendEmail({ ...message, to });
  } catch (err) {
    console.error(`Failed to send email to ${to}:`, err);
  }
}

// For one-off recipients that aren't (yet) a User row — e.g. a team invite
// sent to someone who hasn't accepted and created an account.
export async function notifyEmail(to: string, message: EmailTemplate): Promise<void> {
  await safeSend(to, message);
}

export async function notifyOrgAdmins(organizationId: string, message: EmailTemplate): Promise<void> {
  const admins = await prisma.orgAdmin.findMany({
    where: { organizationId },
    include: { user: { select: { email: true } } },
  });
  await Promise.all(admins.map((admin) => safeSend(admin.user.email, message)));
}

export async function notifyPlatformAdmins(message: EmailTemplate): Promise<void> {
  await Promise.all(env.platformAdminEmails.map((email) => safeSend(email, message)));
}
