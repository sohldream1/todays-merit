import { Link, useLocation, useNavigate } from "react-router-dom";
import type { AccountRole } from "@todays-merit/shared-types";
import { Logo } from "./Logo";
import { useAuth } from "../context/AuthContext";

const ROLE_LABELS: Record<AccountRole, string> = {
  member: "Member",
  org_admin: "Nonprofit Admin",
  race_director: "Race Director",
  platform_admin: "Platform Admin",
};

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  const { pathname } = useLocation();
  const isActive = pathname === to || pathname.startsWith(`${to}/`);

  return (
    <Link
      to={to}
      className={`text-sm font-medium transition-colors ${
        isActive ? "text-indigo-600" : "text-slate-600 hover:text-slate-900"
      }`}
    >
      {children}
    </Link>
  );
}

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  return (
    <nav className="sticky top-0 z-10 border-b border-slate-200 bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2">
            <Logo />
            <span className="text-base font-semibold tracking-tight text-slate-900">Today's Merit</span>
          </Link>
          <div className="hidden items-center gap-6 sm:flex">
            <NavLink to="/directory">Directory</NavLink>
            <NavLink to="/opportunities">Opportunities</NavLink>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm">
          {user ? (
            <>
              <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 sm:inline-block">
                {user.firstName} · {ROLE_LABELS[user.role]}
              </span>
              <button
                onClick={handleLogout}
                className="rounded-md border border-slate-300 px-3 py-1.5 font-medium text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login/member" className="font-medium text-slate-600 hover:text-slate-900">
                Member login
              </Link>
              <Link
                to="/login/nonprofit"
                className="rounded-md bg-indigo-600 px-3.5 py-1.5 font-medium text-white transition-colors hover:bg-indigo-500"
              >
                Nonprofit login
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
