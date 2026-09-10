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

export function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-semibold text-slate-900">Terms of Service</h1>
      <p className="mt-1 text-sm text-slate-500">Last updated August 31, 2026</p>

      <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <strong>Draft template.</strong> This document was written to describe how Today's Merit actually
        works, but it hasn't been reviewed by a lawyer. Have counsel review and approve it before treating
        it as your operative agreement with users.
      </div>

      <P>
        These Terms of Service ("Terms") govern your access to and use of Today's Merit (the "Service"). By
        creating an account or otherwise using the Service, you agree to these Terms. If you don't agree,
        don't use the Service.
      </P>

      <H2>1. What the Service does</H2>
      <P>
        Today's Merit connects volunteers and donors ("Members") with nonprofit organizations ("Organizations").
        It lets Organizations list volunteer opportunities, fundraising campaigns, and races or competitions;
        lets Members sign up, log volunteer hours, donate, and earn badges and recognition; and lets
        Organizations verify their identity with our platform team and manage their own team accounts.
      </P>

      <H2>2. Accounts</H2>
      <P>
        You must provide accurate information when creating an account and keep your password confidential.
        You're responsible for all activity under your account. Today's Merit supports several account
        types — Member, Organization Admin, Race/Competition Director, and Platform Admin — each with
        different capabilities described in the product itself.
      </P>
      <P>
        An Organization account represents that the person creating it is authorized to act on that
        nonprofit's behalf and that the information provided (including its EIN) is accurate.
      </P>

      <H2>3. Nonprofit verification</H2>
      <P>
        A "Verified" badge means a member of our platform team reviewed the Organization's stated EIN and
        mission and didn't find an obvious mismatch. It is not a guarantee of the Organization's legal
        status, financial health, tax-exempt status, or trustworthiness, and Today's Merit is not liable for
        reliance on it. Do your own research before donating.
      </P>

      <H2>4. Donations</H2>
      <P>
        Donations you make through the Service are voluntary contributions directed to the Organization you
        select, less any processing or platform fees disclosed at the time of donation. Today's Merit is not
        a party to the relationship between you and the Organization you donate to, doesn't provide tax
        advice, and doesn't guarantee that any donation is tax-deductible. Refunds, if any, are at the
        discretion of the receiving Organization and applicable payment processor.
      </P>

      <H2>5. Volunteer hours and badges</H2>
      <P>
        Volunteer hours can be self-reported or verified by an Organization; we display which is which.
        Badges, tiers, and other recognition are earned within the Service and don't represent a monetary
        value, a promise of goods or services, or an endorsement of you by any Organization, unless an
        Organization explicitly states otherwise.
      </P>

      <H2>6. Swag and physical rewards</H2>
      <P>
        Some Organizations send physical items ("swag") to Members as thanks for participation. You control
        the shipping address on your profile, and providing one is optional. Fulfillment may be handled by
        an Organization directly or through a third-party vendor; Today's Merit doesn't guarantee delivery
        time, quality, or condition of any physical item.
      </P>

      <H2>7. Acceptable use</H2>
      <P>You agree not to:</P>
      <Ul>
        <li>Impersonate a person or organization, or misrepresent your affiliation with one</li>
        <li>Register a fraudulent Organization or misrepresent its nonprofit status or EIN</li>
        <li>Log volunteer hours, donations, or signups that didn't occur</li>
        <li>Harass, defraud, or attempt to solicit funds outside the Service's intended purpose</li>
        <li>Attempt to bypass account security, rate limits, or access controls</li>
        <li>Use the Service to collect data on other users beyond what it's designed to show you</li>
      </Ul>

      <H2>8. Third-party services</H2>
      <P>
        Organizations may optionally connect the Service to their own third-party tools — for example
        syncing donor and volunteer records to a CRM they use, or fulfilling swag orders through an external
        vendor. When an Organization does this, relevant records are shared with that third party at the
        Organization's direction, subject to that third party's own terms. The Service may also look up
        publicly available charity ratings by an Organization's EIN, and may use an AI provider to help
        generate charity recommendations from your stated interests.
      </P>

      <H2>9. Intellectual property</H2>
      <P>
        Today's Merit and its logo are owned by us. Organizations retain ownership of the content they post
        (mission statements, opportunity descriptions, logos) and grant us a license to display it within
        the Service.
      </P>

      <H2>10. Disclaimers and limitation of liability</H2>
      <P>
        The Service is provided "as is" without warranties of any kind. To the fullest extent permitted by
        law, Today's Merit is not liable for indirect, incidental, or consequential damages arising from
        your use of the Service, including disputes between Members and Organizations, or the accuracy of
        any Organization's stated nonprofit status.
      </P>

      <H2>11. Termination</H2>
      <P>
        You may stop using the Service at any time. We may suspend or terminate an account that violates
        these Terms or that we reasonably believe is fraudulent.
      </P>

      <H2>12. Changes to these Terms</H2>
      <P>
        We may update these Terms as the Service evolves. We'll update the date at the top of this page when
        we do; continued use after a change means you accept the updated Terms.
      </P>

      <H2>13. Governing law</H2>
      <P>
        These Terms are governed by the laws of the jurisdiction in which Today's Merit is organized, without
        regard to conflict-of-law principles.
      </P>

      <H2>14. Contact</H2>
      <P>
        Questions about these Terms can be sent to <span className="font-medium">legal@todaysmerit.example</span>.
      </P>

      <P>
        Related: <Link to="/privacy" className="text-indigo-600 hover:underline">Privacy Policy</Link>
      </P>
    </div>
  );
}
