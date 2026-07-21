import { beforeEach, describe, expect, it, vi } from "vitest";
import { CANONICAL_WORKSPACE_KEY } from "@domain/workspace/workspaceSchema";
import {
  createProjectStorageLegacyFixture,
  createZustandLegacyFixture,
} from "@domain/workspace/__fixtures__/workspaceFixtures";

function seedLegacyStorage() {
  window.localStorage.setItem("mini-bi-v8-workspace", JSON.stringify(createZustandLegacyFixture()));
  window.localStorage.setItem("mini-bi-projects", JSON.stringify(createProjectStorageLegacyFixture()));
  window.localStorage.setItem("mini-bi-active-project-id", "project-1");
  window.localStorage.setItem("mini-bi-active-dashboard-id", "dashboard-1");
}

describe("projectStorage canonical facade", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.resetModules();
    seedLegacyStorage();
  });

  it("migrates on first read while preserving all legacy source bytes", async () => {
    const before = {
      zustand: window.localStorage.getItem("mini-bi-v8-workspace"),
      projects: window.localStorage.getItem("mini-bi-projects"),
      activeProject: window.localStorage.getItem("mini-bi-active-project-id"),
      activeDashboard: window.localStorage.getItem("mini-bi-active-dashboard-id"),
    };
    const projectStorage = await import("@/services/projectStorage");

    const projects = projectStorage.getProjects();

    expect(projects).toHaveLength(1);
    expect(projects[0].datasets).toHaveLength(2);
    expect(window.localStorage.getItem(CANONICAL_WORKSPACE_KEY)).not.toBeNull();
    expect(window.localStorage.getItem("mini-bi-v8-workspace")).toBe(before.zustand);
    expect(window.localStorage.getItem("mini-bi-projects")).toBe(before.projects);
    expect(window.localStorage.getItem("mini-bi-active-project-id")).toBe(before.activeProject);
    expect(window.localStorage.getItem("mini-bi-active-dashboard-id")).toBe(before.activeDashboard);
  });

  it("creates projects in the canonical repository without rewriting legacy project keys", async () => {
    const legacyProjects = window.localStorage.getItem("mini-bi-projects");
    const legacyActive = window.localStorage.getItem("mini-bi-active-project-id");
    const projectStorage = await import("@/services/projectStorage");
    projectStorage.getProjects();

    const created = projectStorage.createProject("New canonical project");

    expect(created.name).toBe("New canonical project");
    expect(projectStorage.getProjects().some((project) => project.id === created.id)).toBe(true);
    expect(projectStorage.getActiveProject().id).toBe(created.id);
    expect(window.localStorage.getItem("mini-bi-projects")).toBe(legacyProjects);
    expect(window.localStorage.getItem("mini-bi-active-project-id")).toBe(legacyActive);
  });

  it("updates charts and dashboards through canonical project ownership", async () => {
    const projectStorage = await import("@/services/projectStorage");
    const project = projectStorage.getActiveProject();

    const chart = projectStorage.upsertChart(project.id, {
      id: "chart-added",
      datasetId: "dataset-shared",
      name: "Added chart",
      title: "Added chart",
      chartType: "bar",
      config: {},
    });
    const dashboard = projectStorage.upsertDashboard(project.id, {
      ...project.dashboards[0],
      name: "Updated dashboard",
    });

    expect(projectStorage.getChartById(project.id, "chart-added")).toMatchObject({
      id: "chart-added",
      projectId: project.id,
    });
    expect(chart.projectId).toBe(project.id);
    expect(dashboard.name).toBe("Updated dashboard");
    expect(projectStorage.getDashboardById(project.id, dashboard.id)?.name).toBe("Updated dashboard");
  });

  it("switches active context in canonical state without touching compatibility keys", async () => {
    const projectStorage = await import("@/services/projectStorage");
    projectStorage.getProjects();
    const created = projectStorage.createProject("Second project");
    projectStorage.setActiveProject("project-1", "dashboard-1");

    expect(projectStorage.getActiveProject().id).toBe("project-1");
    expect(projectStorage.getActiveDashboard().id).toBe("dashboard-1");
    expect(window.localStorage.getItem("mini-bi-active-project-id")).toBe("project-1");
    expect(created.id).not.toBe("project-1");
  });

  it("persists canonical replacement and deletion semantics for charts, dashboards, and widgets", async () => {
    const projectStorage = await import("@/services/projectStorage");
    const project = projectStorage.getActiveProject();
    const dashboard = project.dashboards[0];
    const addedWidget = projectStorage.addWidgetToDashboard(project.id, dashboard.id, {
      id: "widget-added",
      type: "text",
      x: 2,
      y: 3,
      w: 4,
      h: 2,
      config: { text: "Note" },
    });

    projectStorage.updateWidget(project.id, dashboard.id, addedWidget.id, { x: 7 });
    projectStorage.deleteWidget(project.id, dashboard.id, addedWidget.id);
    projectStorage.replaceCharts(project.id, [project.charts[0]]);

    expect(projectStorage.getDashboardById(project.id, dashboard.id)?.widgets.some((widget) => widget.id === addedWidget.id)).toBe(false);
    expect(projectStorage.getCharts(project.id)).toHaveLength(1);
    expect(projectStorage.getCharts(project.id)[0].id).toBe(project.charts[0].id);
  });

  it("removes dashboard widgets that depend on a deleted saved chart", async () => {
    const projectStorage = await import("@/services/projectStorage");
    const project = projectStorage.getActiveProject();
    const dashboard = project.dashboards[0];
    const chart = projectStorage.upsertChart(project.id, {
      id: "chart-with-widget",
      title: "Chart with widget",
      chartType: "bar",
      config: {},
    });
    projectStorage.addWidgetToDashboard(project.id, dashboard.id, {
      id: "widget-for-chart",
      type: "chart",
      sourceChartId: chart.id,
      sourceChartConfigId: chart.id,
      x: 0,
      y: 0,
      w: 6,
      h: 4,
      config: { sourceChartId: chart.id },
    });

    projectStorage.deleteChart(project.id, chart.id);

    expect(projectStorage.getChartById(project.id, chart.id)).toBeNull();
    expect(
      projectStorage
        .getDashboardById(project.id, dashboard.id)
        ?.widgets.some((widget) => widget.id === "widget-for-chart")
    ).toBe(false);
  });

  it("deletes the active dashboard and selects its replacement atomically", async () => {
    const projectStorage = await import("@/services/projectStorage");
    const project = projectStorage.getActiveProject();
    const activeDashboard = projectStorage.getActiveDashboard();
    const replacement = projectStorage.createDashboard(project.id, "Replacement dashboard");
    projectStorage.setActiveDashboard(activeDashboard.id);

    const nextActive = projectStorage.deleteDashboard(project.id, activeDashboard.id);

    expect(nextActive.id).toBe(replacement.id);
    expect(projectStorage.getActiveDashboard().id).toBe(replacement.id);
    expect(projectStorage.getDashboardById(project.id, activeDashboard.id)).toBeNull();
  });

  it("does not compact or delete legacy migration sources when a compatibility write exceeds quota", async () => {
    const projectStorage = await import("@/services/projectStorage");
    projectStorage.getProjects();
    const sourceKeys = [
      "mini-bi-v8-workspace",
      "mini-bi-projects",
      "mini-bi-active-project-id",
      "mini-bi-active-dashboard-id",
    ];
    const before = Object.fromEntries(sourceKeys.map((key) => [key, window.localStorage.getItem(key)]));
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = vi.fn(function setItemWithTargetedQuota(key, value) {
      if (key === "dashboard-canvas-panel-state") {
        throw new DOMException("Quota exceeded", "QuotaExceededError");
      }
      return originalSetItem.call(this, key, value);
    });
    try {
      expect(projectStorage.safeSetLocalStorage("dashboard-canvas-panel-state", "{}", { removeOnFail: false })).toBe(false);
    } finally {
      Storage.prototype.setItem = originalSetItem;
    }

    expect(Object.fromEntries(sourceKeys.map((key) => [key, window.localStorage.getItem(key)]))).toEqual(before);
  });

  it("keeps complete dataset metadata unchanged during an unrelated dashboard save", async () => {
    const projectStorage = await import("@/services/projectStorage");
    const { workspaceRepository } = await import("@domain/workspace/workspaceRepository");
    const project = projectStorage.getActiveProject();
    const before = structuredClone(workspaceRepository.getSnapshot().projects[0].datasets[0]);

    projectStorage.upsertDashboard(project.id, {
      ...project.dashboards[0],
      name: "Dashboard metadata-only update",
    });

    const after = workspaceRepository.getSnapshot().projects[0].datasets.find((dataset) => dataset.id === before.id);
    expect(after).toEqual(before);
  });

  it("round-trips dashboard theme and widget presentation without resetting them", async () => {
    const projectStorage = await import("@/services/projectStorage");
    const project = projectStorage.getActiveProject();
    const dashboard = project.dashboards[0];

    projectStorage.upsertDashboard(project.id, {
      ...dashboard,
      theme: "dark",
      canvasSettings: { ...dashboard.canvasSettings, theme: "dark" },
      widgets: [{
        id: "widget-presentation",
        type: "text",
        title: "Custom title",
        visible: false,
        background: "#112233",
        borderColor: "#445566",
        radius: 14,
        x: 2,
        y: 3,
        w: 4,
        h: 2,
        config: { text: "Styled note" },
      }],
    });

    const saved = projectStorage.getDashboardById(project.id, dashboard.id);
    expect(saved.theme).toBe("dark");
    expect(saved.widgets[0]).toMatchObject({
      title: "Custom title",
      visible: false,
      background: "#112233",
      borderColor: "#445566",
      radius: 14,
    });
  });
});
