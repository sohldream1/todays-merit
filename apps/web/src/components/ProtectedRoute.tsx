import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import type { AccountRole } from "@todays-merit/shared-types";
import { useAuth } from "../context/AuthContext";

export function ProtectedRoute({
  children,
  allowedRoles,
  redirectTo = "/login/member",
}: {
  children: ReactNode;
  allowedRoles?: AccountRole[];
  redirectTo?: string;
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center text-slate-500">Loading…</div>;
  }

  if (!user) {
    return <Navigate to={redirectTo} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
