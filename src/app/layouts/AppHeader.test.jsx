import { describe, expect, it } from "vitest";
import { resolveChartDesignerNavigation } from "./appHeaderNavigation";

describe("resolveChartDesignerNavigation", () => {
  it("uses API-backed project and dashboard context in production", () => {
    expect(resolveChartDesignerNavigation({
      route: "/dashboard-v2",
      pathname: "/dashboard",
      mockMode: false,
      activeProjectId: "project-api",
      activeDashboardId: "dashboard-api",
      storedProjectId: "project-1",
      storedDashboardId: "dash-1",
    })).toBe(
      "/dashboard-v2?from=dashboard&mode=create&projectId=project-api&dashboardId=dashboard-api",
    );
  });

  it("retains legacy workspace context only in explicit mock mode", () => {
    expect(resolveChartDesignerNavigation({
      route: "/dashboard-v2",
      pathname: "/dashboard",
      mockMode: true,
      activeProjectId: "project-api",
      activeDashboardId: "dashboard-api",
      storedProjectId: "project-mock",
      storedDashboardId: "dashboard-mock",
    })).toBe(
      "/dashboard-v2?from=dashboard&mode=create&projectId=project-mock&dashboardId=dashboard-mock",
    );
  });

  it("does not modify navigation outside the dashboard-to-designer flow", () => {
    expect(resolveChartDesignerNavigation({
      route: "/dashboard-v2",
      pathname: "/datasets",
      mockMode: false,
      activeProjectId: "project-api",
      activeDashboardId: "dashboard-api",
    })).toBe("/dashboard-v2");
  });
});
