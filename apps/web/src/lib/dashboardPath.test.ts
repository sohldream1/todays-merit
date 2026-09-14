import { describe, expect, it } from "vitest";
import { dashboardPathForRole } from "./dashboardPath";

describe("dashboardPathForRole", () => {
  it("maps each role to its own dashboard", () => {
    expect(dashboardPathForRole("member")).toBe("/dashboard/member");
    expect(dashboardPathForRole("org_admin")).toBe("/dashboard/org");
    expect(dashboardPathForRole("race_director")).toBe("/dashboard/race-director");
    expect(dashboardPathForRole("platform_admin")).toBe("/dashboard/platform-admin");
  });
});
