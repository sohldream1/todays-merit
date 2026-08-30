import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { cardClasses } from "../../components/ui";

const SECTIONS = [
  { to: "/dashboard/org/profile", title: "Organization profile", description: "Mission, cause area, location, verification status." },
  { to: "/dashboard/org/opportunities", title: "Volunteer opportunities", description: "Create and manage open opportunities." },
  { to: "/dashboard/org/hours", title: "Volunteer hours", description: "Review and verify logged hours." },
  { to: "/dashboard/org/campaigns", title: "Campaigns", description: "Run fundraising campaigns and track donations." },
  { to: "/dashboard/org/badges", title: "Badges", description: "Set auto-award milestones for volunteers and donors." },
  { to: "/dashboard/org/integrations", title: "Integrations", description: "Sync donors and donations to your CRM." },
  { to: "/dashboard/org/swag", title: "Swag", description: "Send thank-you items, manually or automatically." },
];

export function OrgDashboard() {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-semibold text-slate-900">Welcome, {user?.firstName}</h1>
      <p className="mt-2 text-slate-600">This is your nonprofit admin dashboard.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {SECTIONS.map((s) => (
          <Link
            key={s.to}
            to={s.to}
            className={cardClasses("transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md")}
          >
            <div className="font-medium text-slate-900">{s.title}</div>
            <div className="mt-1 text-sm text-slate-500">{s.description}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
