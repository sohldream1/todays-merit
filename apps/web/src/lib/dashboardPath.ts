import type { AccountRole } from "@todays-merit/shared-types";

export function dashboardPathForRole(role: AccountRole): string {
  if (role === "org_admin") return "/dashboard/org";
  if (role === "race_director") return "/dashboard/race-director";
  return "/dashboard/member";
}
