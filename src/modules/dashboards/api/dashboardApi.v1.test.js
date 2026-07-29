import { beforeEach, describe, expect, it, vi } from "vitest";

const apiRequest = vi.fn();
vi.mock("@infrastructure/http/client", () => ({
  apiRequest,
  encodeApiPathSegment: encodeURIComponent,
  isMockMode: () => false,
}));
vi.mock("@app/store/useStore", () => ({ useStore: { getState: () => ({}) } }));
vi.mock("@modules/charts/public/api", () => ({ getChartsByDashboardId: vi.fn() }));
vi.mock("@modules/dashboards/lib/dashboardWorkspace", () => ({ resolveDashboardWidgets: vi.fn() }));

describe("dashboard API v1 repository", () => {
  beforeEach(() => apiRequest.mockReset());

  it("persists layout with revision through the widgets endpoint", async () => {
    apiRequest.mockResolvedValue({ id: "dash-1", revision: 4, widgets: [] });
    const { saveDashboardWidgets } = await import("./dashboardApi");
    await saveDashboardWidgets("dash-1", { revision: 3, widgets: [{ id: "widget-1" }] });
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/dashboards/dash-1/widgets", {
      method: "PATCH",
      body: JSON.stringify({ revision: 3, widgets: [{ id: "widget-1" }] }),
    });
  });

  it("does not send an unscoped dashboard request before project bootstrap", async () => {
    const { listDashboards } = await import("./dashboardApi");
    await expect(listDashboards(undefined)).resolves.toEqual([]);
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it("does not request a dashboard before an active dashboard is resolved", async () => {
    const { loadDashboardContext } = await import("./dashboardApi");
    await expect(loadDashboardContext(null)).resolves.toBeNull();
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it.each(["null", "undefined", "  null  "])("does not serialize unresolved dashboard id %s into an API request", async (dashboardId) => {
    const { loadDashboardContext } = await import("./dashboardApi");
    await expect(loadDashboardContext(dashboardId)).resolves.toBeNull();
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it("sends the current revision when updating a dashboard", async () => {
    apiRequest.mockResolvedValue({ id: "dash-1", revision: 3 });
    const { updateDashboard } = await import("./dashboardApi");
    await updateDashboard("dash-1", { revision: 2, name: "Updated" });
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/dashboards/dash-1", {
      method: "PATCH",
      body: JSON.stringify({ revision: 2, name: "Updated" }),
    });
  });

  it("sends the current revision when archiving a dashboard", async () => {
    apiRequest.mockResolvedValue({ success: true });
    const { archiveDashboard } = await import("./dashboardApi");
    await archiveDashboard("dash-1", 7);
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/dashboards/dash-1", {
      method: "DELETE",
      body: JSON.stringify({ revision: 7 }),
    });
  });
});
