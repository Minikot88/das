import { describe, expect, it } from "vitest";
import { buildServerShareWorkspace } from "./serverShareWorkspace";

describe("buildServerShareWorkspace", () => {
  const workspace = {
    projects: [{
      id: "project-local",
      name: "Local project",
      datasets: [],
      charts: [{ id: "chart-local", name: "Sales", datasetId: "sales_performance", config: { chartType: "bar" }, dataContract: { rows: [{ month: "Jan", sales: 10 }], fields: [] } }],
      dashboards: [{ id: "dashboard-local", name: "Old", canvasSettings: {}, widgets: [] }],
      shares: [{ id: "local-token", token: "never-send" }],
      connectionProfiles: [{ id: "private-connection" }],
    }],
  };

  it("sends only the active dashboard and excludes local share or connection material", () => {
    const payload = buildServerShareWorkspace(workspace, "project-local", {
      dashboardId: "dashboard-local",
      name: "Current dashboard",
      canvasSettings: { width: 960 },
      widgets: [{ id: "widget-local", chartId: "chart-local", type: "chart", x: 2, y: 3, w: 10, h: 7, config: { title: "Sales" } }],
    });

    expect(payload).toEqual(expect.objectContaining({ schemaVersion: 1 }));
    expect(payload.projects[0]).not.toHaveProperty("shares");
    expect(payload.projects[0]).not.toHaveProperty("connectionProfiles");
    expect(payload.projects[0].dashboards[0]).toMatchObject({ id: "dashboard-local", name: "Current dashboard" });
    expect(payload.projects[0].dashboards[0].widgets[0]).toMatchObject({ chartId: "chart-local", layout: { x: 2, y: 3, w: 10, h: 7 } });
    expect(payload.projects[0].charts[0]).toMatchObject({ datasetId: null, dataContract: { rows: [{ month: "Jan", sales: 10 }] } });
  });

  it("refuses to export an absent active dashboard", () => {
    expect(() => buildServerShareWorkspace(workspace, "project-local", { dashboardId: "missing" })).toThrow(/active dashboard/i);
  });

  it("uses the chart data resolved by the editor for a public snapshot", () => {
    const payload = buildServerShareWorkspace(workspace, "project-local", {
      dashboardId: "dashboard-local",
    }, {
      "chart-local": { sourceType: "snapshot", datasetId: null, fields: [{ id: "month" }], rows: [{ month: "Feb", sales: 20 }] },
    });

    expect(payload.projects[0].charts[0].dataContract).toMatchObject({
      sourceType: "snapshot",
      rows: [{ month: "Feb", sales: 20 }],
    });
  });

  it("preserves the editor's source-chart reference for dashboard widgets", () => {
    const payload = buildServerShareWorkspace(workspace, "project-local", {
      dashboardId: "dashboard-local",
      widgets: [{ id: "widget-source", sourceChartId: "chart-local", type: "chart", x: 0, y: 0, w: 10, h: 7 }],
    });

    expect(payload.projects[0].dashboards[0].widgets[0].chartId).toBe("chart-local");
  });
});
