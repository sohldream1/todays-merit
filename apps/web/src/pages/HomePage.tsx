import { Link, Navigate } from "react-router-dom";
import { Logo } from "../components/Logo";
import { useAuth } from "../context/AuthContext";
import { dashboardPathForRole } from "../lib/dashboardPath";

export function HomePage() {
  const { user, isLoading } = useAuth();

  if (!isLoading && user) {
    return <Navigate to={dashboardPathForRole(user.role)} replace />;
  }

  return (
    <div className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[32rem] bg-gradient-to-b from-indigo-50 via-indigo-50/40 to-transparent"
        aria-hidden="true"
      />

      <div className="mx-auto flex max-w-3xl flex-col items-center gap-8 px-6 py-24 text-center">
        <Logo className="h-14 w-14" />

        <div className="flex flex-col gap-4">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">Today's Merit</h1>
          <p className="mx-auto max-w-xl text-lg text-slate-600">
            Connecting nonprofits with volunteers and donors through a gamified recognition system.
          </p>
        </div>

        <div className="grid w-full max-w-md gap-4 sm:grid-cols-2">
          <Link
            to="/signup/member"
            className="group rounded-lg border border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 21a8 8 0 0 1 16 0" />
              </svg>
            </div>
            <div className="mt-3 font-medium text-slate-900">I'm an individual</div>
            <div className="mt-0.5 text-sm text-slate-500">Volunteer, donate, earn badges</div>
          </Link>
          <Link
            to="/signup/nonprofit"
            className="group rounded-lg border border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M6 21V7l6-4 6 4v14M9 21v-6h6v6M9 11h.01M9 15h.01M15 11h.01M15 15h.01" />
              </svg>
            </div>
            <div className="mt-3 font-medium text-slate-900">I'm a nonprofit</div>
            <div className="mt-0.5 text-sm text-slate-500">Manage your org and volunteers</div>
          </Link>
        </div>

        <div className="flex flex-col items-center gap-1">
          <Link to="/directory" className="text-sm font-medium text-indigo-600 hover:underline">
            Browse the nonprofit directory →
          </Link>
          <Link to="/signup/race-director" className="text-sm text-slate-500 hover:underline">
            Run a race or competition? Sign up as a Director →
          </Link>
        </div>
      </div>
    </div>
  );
}
