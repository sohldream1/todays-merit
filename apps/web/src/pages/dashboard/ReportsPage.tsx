import { useState } from "react";
import { Link } from "react-router-dom";
import type { OrgDonation, OrgSignup, OrgVolunteerHour } from "@todays-merit/shared-types";
import { ApiClientError, campaignsApi, opportunitiesApi, volunteerHoursApi } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { Button, buttonClasses, Card } from "../../components/ui";
import { buildCsv, csvDate, downloadCsv } from "../../lib/csv";

interface ReportDef {
  key: string;
  title: string;
  description: string;
  run: (organizationId: string) => Promise<void>;
}

async function exportDonations(organizationId: string) {
  const { donations } = await campaignsApi.listDonationsForOrganization(organizationId);
  const csv = buildCsv<OrgDonation>(donations, [
    { header: "Date", value: (d) => csvDate(d.donatedAt) },
    { header: "Donor name", value: (d) => `${d.user.firstName} ${d.user.lastName}` },
    { header: "Amount", value: (d) => d.amount },
    { header: "Campaign", value: (d) => d.campaign?.title ?? "" },
    { header: "Payment status", value: (d) => d.paymentStatus },
  ]);
  downloadCsv(`donations-${csvDate(new Date().toISOString())}.csv`, csv);
}

async function exportHours(organizationId: string) {
  const { hours } = await volunteerHoursApi.listForOrganization(organizationId);
  const csv = buildCsv<OrgVolunteerHour>(hours, [
    { header: "Date of service", value: (h) => csvDate(h.dateOfService) },
    { header: "Volunteer name", value: (h) => `${h.user.firstName} ${h.user.lastName}` },
    { header: "Opportunity", value: (h) => h.opportunity?.title ?? "" },
    { header: "Hours", value: (h) => h.hours },
    { header: "Verification status", value: (h) => h.verificationStatus },
  ]);
  downloadCsv(`volunteer-hours-${csvDate(new Date().toISOString())}.csv`, csv);
}

async function exportSignups(organizationId: string) {
  const { signups } = await opportunitiesApi.listForOrganizationSignups(organizationId);
  const csv = buildCsv<OrgSignup>(signups, [
    { header: "Signup date", value: (s) => csvDate(s.createdAt) },
    { header: "Name", value: (s) => `${s.user.firstName} ${s.user.lastName}` },
    { header: "Email", value: (s) => s.user.email },
    { header: "Opportunity", value: (s) => s.opportunity.title },
    { header: "Category", value: (s) => s.opportunity.category },
    { header: "Status", value: (s) => s.status },
  ]);
  downloadCsv(`participants-${csvDate(new Date().toISOString())}.csv`, csv);
}

// Donor email isn't included in the donations export deliberately — donors
// aren't shown their email to other donors elsewhere in the product either,
// and OrgDonation only carries id/firstName/lastName for the user, not
// email, to match. Name + amount + campaign is what most orgs need for
// their own books; add email here (and to OrgDonation) if that changes.
const REPORTS: ReportDef[] = [
  {
    key: "donations",
    title: "Donations",
    description: "Every donation to your organization, across all campaigns.",
    run: exportDonations,
  },
  {
    key: "hours",
    title: "Volunteer hours",
    description: "Every logged hour, self-reported and org-verified alike.",
    run: exportHours,
  },
  {
    key: "signups",
    title: "Participants",
    description: "Everyone who signed up for an opportunity, race, or competition.",
    run: exportSignups,
  },
];

export function ReportsPage() {
  const { user } = useAuth();
  const [runningKey, setRunningKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleExport(report: ReportDef) {
    if (!user?.organizationId) return;
    setError(null);
    setRunningKey(report.key);
    try {
      await report.run(user.organizationId);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong");
    } finally {
      setRunningKey(null);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-12">
      <Link to="/dashboard/org" className={buttonClasses("text")}>
        ← Back to dashboard
      </Link>

      <h1 className="mt-4 text-2xl font-semibold text-slate-900">Reports</h1>
      <p className="mt-1 text-sm text-slate-500">
        Download CSV exports of your organization's activity for your own records.
      </p>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 flex flex-col gap-4">
        {REPORTS.map((report) => (
          <Card key={report.key} className="flex items-center justify-between gap-4">
            <div>
              <div className="font-medium text-slate-900">{report.title}</div>
              <div className="mt-1 text-sm text-slate-500">{report.description}</div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleExport(report)}
              disabled={runningKey === report.key}
            >
              {runningKey === report.key ? "Exporting…" : "Export CSV"}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
