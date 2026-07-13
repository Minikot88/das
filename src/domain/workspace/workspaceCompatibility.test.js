import { describe, expect, it } from "vitest";
import {
  mergeProjectStorageProjects,
  mergeZustandWorkspaceSnapshot,
  toProjectStorageProjects,
  toZustandWorkspaceSnapshot,
} from "./workspaceCompatibility";
import { createValidWorkspaceFixture, fixedClock } from "./__fixtures__/workspaceFixtures";

describe("workspace compatibility projections", () => {
  function createTwoProjectWorkspace() {
    const workspace = createValidWorkspaceFixture();
    const second = structuredClone(workspace.projects[0]);
    second.id = "project-2";
    second.name = "Second workspace";
    second.datasets.forEach((dataset) => {
      dataset.id = "dataset-2";
      dataset.projectId = "project-2";
    });
    second.charts.forEach((chart) => {
      chart.id = "chart-2";
      chart.projectId = "project-2";
      chart.datasetId = "dataset-2";
      if (chart.dataContract) chart.dataContract.datasetId = "dataset-2";
    });
    second.dashboards.forEach((dashboard) => {
      dashboard.id = "dashboard-2";
      dashboard.projectId = "project-2";
      dashboard.widgets.forEach((widget) => {
        widget.id = "widget-2";
        widget.projectId = "project-2";
        widget.dashboardId = "dashboard-2";
        widget.chartId = "chart-2";
      });
    });
    second.shares.forEach((share) => {
      share.id = "share-2";
      share.projectId = "project-2";
      share.dashboardId = "dashboard-2";
    });
    second.legacySheetAliases = [{ sheetId: "sheet-2", name: "Second sheet", dashboardIds: ["dashboard-2"] }];
    workspace.projects.push(second);
    return workspace;
  }

  it("projects the canonical graph into the current projectStorage shape", () => {
    const workspace = createValidWorkspaceFixture();

    const projects = toProjectStorageProjects(workspace);

    expect(projects).toHaveLength(1);
    expect(projects[0]).toMatchObject({
      id: "project-1",
      name: "Sales workspace",
      datasets: [{ id: "dataset-1", projectId: "project-1" }],
      charts: [{ id: "chart-1", projectId: "project-1" }],
      dashboards: [{ id: "dashboard-1", projectId: "project-1" }],
    });
    expect(projects[0].dashboards[0].widgets[0]).toMatchObject({
      id: "widget-1",
      dashboardId: "dashboard-1",
      type: "chart",
      sourceChartId: "chart-1",
      x: 0,
      y: 0,
      w: 6,
      h: 4,
    });
  });

  it("projects Sheet aliases and workspace entities into the legacy Zustand shape", () => {
    const workspace = createValidWorkspaceFixture();

    const projection = toZustandWorkspaceSnapshot(workspace, {
      user: { id: "demo-user" },
      isAuthenticated: true,
      ui: { rightSidebarOpen: false },
    });

    expect(projection).toMatchObject({
      activeProjectId: "project-1",
      activeSheetId: "sheet-1",
      activeDashboardId: "dashboard-1",
      theme: "system",
      locale: "th",
      user: { id: "demo-user" },
      isAuthenticated: true,
    });
    expect(projection.projects[0].sheets[0]).toMatchObject({
      id: "sheet-1",
      activeDashboardId: "dashboard-1",
    });
    expect(projection.projects[0].sheets[0].dashboards[0].charts[0]).toMatchObject({
      instanceId: "widget-1",
      chartId: "chart-1",
    });
    expect(projection.projects[0].sheets[0].dashboards[0].layout[0]).toMatchObject({
      i: "widget-1",
      chartId: "chart-1",
    });
    expect(projection.importedDatasets[0]).toMatchObject({ id: "dataset-1", projectId: "project-1" });
    expect(projection.shareLinks["share-1"]).toMatchObject({ id: "share-1", mode: "dashboard-readonly" });
  });

  it("merges legacy Zustand edits without removing current-only canonical entities", () => {
    const workspace = createValidWorkspaceFixture();
    workspace.projects[0].datasets.push({
      ...structuredClone(workspace.projects[0].datasets[0]),
      id: "dataset-current-only",
      name: "Current-only dataset",
    });
    const zustand = toZustandWorkspaceSnapshot(workspace);
    zustand.projects[0].name = "Renamed in legacy route";
    zustand.importedDatasets = zustand.importedDatasets.filter((dataset) => dataset.id !== "dataset-current-only");
    zustand.importedDatasets[0].rows = [{ id: "row-2", region: "South" }];
    zustand.appSettings.theme = "dark";

    const merged = mergeZustandWorkspaceSnapshot(workspace, zustand, { clock: fixedClock });

    expect(merged.projects[0].name).toBe("Renamed in legacy route");
    expect(merged.projects[0].datasets.map((dataset) => dataset.id)).toEqual(["dataset-1", "dataset-current-only"]);
    expect(merged.projects[0].datasets[0].rows).toEqual([{ id: "row-2", region: "South" }]);
    expect(merged.settings.theme).toBe("dark");
  });

  it("keeps authentication and UI state outside the canonical document", () => {
    const workspace = createValidWorkspaceFixture();
    const projection = toZustandWorkspaceSnapshot(workspace, {
      user: { id: "demo-user", token: "SYNTHETIC_TOKEN_SENTINEL" },
      isAuthenticated: true,
      sidebarCollapsed: true,
    });

    const merged = mergeZustandWorkspaceSnapshot(workspace, projection, { clock: fixedClock });
    const serialized = JSON.stringify(merged);

    expect(serialized).not.toContain("demo-user");
    expect(serialized).not.toContain("SYNTHETIC_TOKEN_SENTINEL");
    expect(merged).not.toHaveProperty("isAuthenticated");
    expect(merged).not.toHaveProperty("sidebarCollapsed");
  });

  it("merges current projectStorage edits without dropping canonical dataset rows", () => {
    const workspace = createValidWorkspaceFixture();
    const projects = toProjectStorageProjects(workspace);
    projects[0].name = "Renamed in current canvas";
    projects[0].dashboards[0].widgets[0].x = 9;

    const merged = mergeProjectStorageProjects(workspace, projects, { clock: fixedClock });

    expect(merged.projects[0].name).toBe("Renamed in current canvas");
    expect(merged.projects[0].datasets[0].rows).toEqual([{ id: "row-1", region: "North" }]);
    expect(merged.projects[0].dashboards[0].widgets[0].layout.x).toBe(9);
  });

  it("persists an intentional empty dataset instead of restoring old rows and fields", () => {
    const workspace = createValidWorkspaceFixture();
    const projects = toProjectStorageProjects(workspace);
    projects[0].datasets[0].fields = [];
    projects[0].datasets[0].rows = [];
    projects[0].datasets[0].rowCount = 0;
    projects[0].datasets[0].columnCount = 0;

    const merged = mergeProjectStorageProjects(workspace, projects, { clock: fixedClock });
    const dataset = merged.projects[0].datasets[0];

    expect(dataset.fields).toEqual([]);
    expect(dataset.rows).toEqual([]);
    expect(dataset.rowCount).toBe(0);
    expect(dataset.columnCount).toBe(0);
  });

  it("round-trips multiple projects without cloning global entities into the active project", () => {
    const workspace = createTwoProjectWorkspace();
    const projection = toZustandWorkspaceSnapshot(workspace);

    const merged = mergeZustandWorkspaceSnapshot(workspace, projection, { clock: fixedClock });
    const first = merged.projects.find((project) => project.id === "project-1");
    const second = merged.projects.find((project) => project.id === "project-2");

    expect(first.datasets.map((dataset) => dataset.id)).toEqual(["dataset-1"]);
    expect(first.charts.map((chart) => chart.id)).toEqual(["chart-1"]);
    expect(first.shares.map((share) => share.id)).toEqual(["share-1"]);
    expect(second.datasets.map((dataset) => dataset.id)).toEqual(["dataset-2"]);
    expect(second.charts.map((chart) => chart.id)).toEqual(["chart-2"]);
    expect(second.shares.map((share) => share.id)).toEqual(["share-2"]);
  });
});
