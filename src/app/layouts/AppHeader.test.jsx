import { describe, expect, it } from "vitest";
import { chartDesignerRibbonItems, resolveChartDesignerNavigation } from "./appHeaderNavigation";

describe("resolveChartDesignerNavigation", () => {
  it("disables chart actions that would otherwise open demo or editable SQL controls", () => {
    const items = chartDesignerRibbonItems;
    expect(items.find((item) => item.label === "Templates")).toMatchObject({ disabled: true });
    expect(items.find((item) => item.label === "SQL")).toMatchObject({
      disabled: true,
      title: expect.stringContaining("อ่านอย่างเดียว"),
    });
    expect(items.find((item) => item.label === "Presets")?.disabled).not.toBe(true);
  });
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
