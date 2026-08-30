import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { OrgVolunteerHour } from "@todays-merit/shared-types";
import { volunteerHoursApi } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { Button, buttonClasses, Card, EmptyState, StatusBadge } from "../../components/ui";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { timeZone: "UTC" });
}

export function HoursListPage() {
  const { user } = useAuth();
  const [hours, setHours] = useState<OrgVolunteerHour[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  function load() {
    if (!user?.organizationId) return;
    setIsLoading(true);
    volunteerHoursApi
      .listForOrganization(user.organizationId)
      .then(({ hours }) => setHours(hours))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, [user?.organizationId]);

  async function markVerified(id: string) {
    await volunteerHoursApi.verify(id, "verified_by_org");
    load();
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link to="/dashboard/org" className={buttonClasses("text")}>
        ← Back to dashboard
      </Link>

      <h1 className="mt-4 text-2xl font-semibold text-slate-900">Volunteer hours</h1>

      <div className="mt-6 flex flex-col gap-3">
        {isLoading && <p className="text-sm text-slate-500">Loading…</p>}

        {!isLoading && hours.length === 0 && <EmptyState description="No hours have been logged yet." />}

        {hours.map((h) => (
          <Card key={h.id} className="flex items-center justify-between">
            <div>
              <div className="font-medium text-slate-900">
                {h.user.firstName} {h.user.lastName} — {h.hours} hours
              </div>
              <div className="mt-1 text-sm text-slate-500">
                {h.opportunity ? h.opportunity.title : "General"} · {formatDate(h.dateOfService)}
              </div>
            </div>

            {h.verificationStatus === "verified_by_org" ? (
              <StatusBadge tone="success">Verified</StatusBadge>
            ) : (
              <Button size="sm" onClick={() => markVerified(h.id)}>
                Mark verified
              </Button>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
