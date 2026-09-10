import { env } from "./env.js";

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface SendEmailResult {
  mock: boolean;
  id?: string;
}

// Real transactional email via Resend (https://resend.com) — a single API
// key and a plain REST endpoint, no SMTP setup, in keeping with every other
// integration in this codebase (Salesforce, Classy, Swag.com, …) talking
// straight `fetch` rather than pulling in a provider SDK. When
// RESEND_API_KEY isn't configured, the message is logged to the console
// instead of sent, so anything that emails people (right now: nonprofit
// verification notifications) works out of the box with no mail provider
// set up.
export async function sendEmail(message: EmailMessage): Promise<SendEmailResult> {
  if (!env.email.apiKey) {
    console.log(`[mock email] to=${message.to} subject="${message.subject}"\n${message.text}\n`);
    return { mock: true };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.email.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.email.from,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    }),
  });

  if (!res.ok) {
    throw new Error(`Resend send failed: ${res.status} ${await res.text()}`);
  }

  const body = (await res.json()) as { id: string };
  return { mock: false, id: body.id };
}
