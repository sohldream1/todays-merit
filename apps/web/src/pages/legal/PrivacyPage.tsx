import { Link } from "react-router-dom";

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-8 text-lg font-semibold text-slate-900">{children}</h2>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-sm leading-relaxed text-slate-600">{children}</p>;
}

function Ul({ children }: { children: React.ReactNode }) {
  return <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-slate-600">{children}</ul>;
}

export function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-semibold text-slate-900">Privacy Policy</h1>
      <p className="mt-1 text-sm text-slate-500">Last updated August 31, 2026</p>

      <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <strong>Draft template.</strong> This document was written to describe what Today's Merit's code
        actually collects and does with it, but it hasn't been reviewed by a lawyer or privacy specialist.
        Have counsel review it, and confirm it against applicable law (e.g. GDPR/CCPA) for your users, before
        treating it as your operative policy.
      </div>

      <P>
        This Privacy Policy explains what information Today's Merit ("we," "us") collects through the
        Service, how we use it, and who we share it with.
      </P>

      <H2>1. Information we collect</H2>
      <P>Directly from you:</P>
      <Ul>
        <li>Account details: name, email address, password (stored as a salted hash, never in plain text)</li>
        <li>Profile details: cause-area interests, profile photo URL, shipping address (optional — only needed to receive physical swag)</li>
        <li>For Organizations: nonprofit name, EIN, mission statement, website, location, and logo</li>
        <li>Content you create: volunteer hours you log, donations you make, opportunities or campaigns you post, messages within invite flows</li>
      </Ul>
      <P>Automatically:</P>
      <Ul>
        <li>
          A single session cookie used to keep you signed in. It's required for the Service to function and
          isn't used for advertising or cross-site tracking.
        </li>
      </Ul>

      <H2>2. How we use it</H2>
      <Ul>
        <li>To operate your account and the features you use (signups, hours, donations, badges, team access)</li>
        <li>To let Organizations see the Members who interact with them (signups, logged hours, donations to their campaigns)</li>
        <li>To review Organization verification submissions</li>
        <li>To send account and workflow emails — e.g. verification decisions, team invites</li>
        <li>To generate charity ratings and, optionally, AI-assisted recommendations (see below)</li>
      </Ul>

      <H2>3. Who we share it with</H2>
      <P>We don't sell your data. We share it in these specific cases:</P>
      <Ul>
        <li>
          <span className="font-medium">The Organizations you interact with</span> — an Organization you sign
          up with, donate to, or log hours for can see that activity and your name/email/shipping address as
          needed to fulfill it.
        </li>
        <li>
          <span className="font-medium">An Organization's own connected tools</span> — if an Organization
          connects a CRM (e.g. Salesforce, Blackbaud, Classy) or swag fulfillment provider, your donor,
          volunteer, or shipping records relevant to that Organization are synced there at the
          Organization's direction. This is between you and that Organization; we don't control that
          third party's use of the data.
        </li>
        <li>
          <span className="font-medium">Charity rating providers</span> — we may look up an Organization's
          public rating (e.g. Charity Navigator, Candid/GuideStar) by its EIN. This doesn't involve your
          personal data.
        </li>
        <li>
          <span className="font-medium">An AI provider</span> — if AI-generated charity recommendations are
          enabled, your stated cause-area interests and available Organization data may be sent to that
          provider to generate suggestions. This feature can be avoided by not using it; a rule-based
          fallback is used otherwise.
        </li>
        <li>
          <span className="font-medium">Legal reasons</span> — if required to comply with law or protect the
          rights, property, or safety of Today's Merit, our users, or the public.
        </li>
      </Ul>

      <H2>4. Data retention</H2>
      <P>
        We keep your information for as long as your account is active. Records tied to an Organization
        (donations, volunteer hours) may be retained by that Organization independent of your account status,
        since they reflect a real-world interaction that already occurred.
      </P>

      <H2>5. Your choices</H2>
      <Ul>
        <li>You can update or remove your profile information, including your shipping address, at any time</li>
        <li>You can choose not to set cause-area interests or use AI recommendations</li>
        <li>You can request account deletion by contacting us</li>
      </Ul>

      <H2>6. Security</H2>
      <P>
        Passwords are hashed, never stored in plain text. Sessions use an httpOnly, secure cookie. CRM
        credentials an Organization connects are encrypted at rest. No system is perfectly secure, and we
        can't guarantee absolute security of information you provide.
      </P>

      <H2>7. Children's privacy</H2>
      <P>
        The Service isn't directed at children under 13, and we don't knowingly collect information from
        them.
      </P>

      <H2>8. Changes to this policy</H2>
      <P>
        We may update this policy as the Service evolves. We'll update the date at the top of this page when
        we do.
      </P>

      <H2>9. Contact</H2>
      <P>
        Questions about this policy, or requests about your data, can be sent to{" "}
        <span className="font-medium">privacy@todaysmerit.example</span>.
      </P>

      <P>
        Related: <Link to="/terms" className="text-indigo-600 hover:underline">Terms of Service</Link>
      </P>
    </div>
  );
}
