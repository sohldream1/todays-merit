import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Organization } from "@todays-merit/shared-types";
import { organizationsApi } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { cardClasses } from "../../components/ui";

export function RaceDirectorDashboard() {
  const { user } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);

  useEffect(() => {
    if (!user?.organizationId) return;
    organizationsApi.get(user.organizationId).then(({ organization }) => setOrganization(organization));
  }, [user?.organizationId]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-semibold text-slate-900">Welcome, {user?.firstName}</h1>
      <p className="mt-2 text-slate-600">
        {organization ? (
          <>
            Directing races and competitions for{" "}
            <Link to={`/organizations/${organization.id}`} className="text-indigo-600 hover:underline">
              {organization.name}
            </Link>
            .
          </>
        ) : (
          "This is your Race/Competition Director dashboard."
        )}
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link
          to="/dashboard/org/opportunities"
          className={cardClasses("transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md")}
        >
          <div className="font-medium text-slate-900">Races & competitions</div>
          <div className="mt-1 text-sm text-slate-500">Create, edit, and close your races and competitions.</div>
        </Link>
        <Link
          to="/dashboard/org/badges"
          className={cardClasses("transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md")}
        >
          <div className="font-medium text-slate-900">Award badges</div>
          <div className="mt-1 text-sm text-slate-500">Award competition badges to winners.</div>
        </Link>
      </div>
    </div>
  );
}
