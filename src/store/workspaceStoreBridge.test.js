import { beforeEach, describe, expect, it, vi } from "vitest";
import { createProjectStorageLegacyFixture, createZustandLegacyFixture } from "@domain/workspace/__fixtures__/workspaceFixtures";

function seedLegacyStorage() {
  window.localStorage.setItem("mini-bi-v8-workspace", JSON.stringify(createZustandLegacyFixture()));
  window.localStorage.setItem("mini-bi-projects", JSON.stringify(createProjectStorageLegacyFixture()));
  window.localStorage.setItem("mini-bi-active-project-id", "project-1");
  window.localStorage.setItem("mini-bi-active-dashboard-id", "dashboard-1");
}

describe("Zustand workspace compatibility subscription", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.resetModules();
    seedLegacyStorage();
  });

  it("updates Zustand workspace state after a same-tab repository mutation", async () => {
    const [{ useStore }, projectStorage] = await Promise.all([
      import("@/store/useStore"),
      import("@/services/projectStorage"),
    ]);

    const created = projectStorage.createProject("Repository-created project");

    expect(useStore.getState().activeProjectId).toBe(created.id);
    expect(useStore.getState().projects.some((project) => project.id === created.id)).toBe(true);
    expect(useStore.getState().activeDashboardId).toBe(created.dashboards[0].id);
  });

  it("projects canonical dataset rows into legacy chart replay", async () => {
    const { useStore } = await import("@/store/useStore");

    const chart = useStore.getState().charts.find((item) => item.id === "chart-shared");

    expect(chart.data).toEqual([{ id: "row-1", region: "North" }]);
    expect(chart.rows).toEqual(chart.data);
  });

  it("assigns imported datasets to the active project immediately", async () => {
    const { useStore } = await import("@/store/useStore");

    useStore.getState().importDataset({
      id: "dataset-imported",
      name: "Imported CSV",
      fields: [],
      rows: [],
    });

    expect(useStore.getState().importedDatasets.find((dataset) => dataset.id === "dataset-imported")).toMatchObject({
      projectId: "project-1",
    });
  });

  it("preserves imported field identifiers and semantic metadata across canonical persistence", async () => {
    const [{ useStore }, { workspaceRepository }] = await Promise.all([
      import("@/store/useStore"),
      import("@domain/workspace/workspaceRepository"),
    ]);

    useStore.getState().importDataset({
      id: "dataset-field-identity",
      name: "Semantic fields",
      fields: [{
        id: "field-stable-id",
        name: "revenue_total",
        label: "Revenue total",
        type: "number",
        isMeasure: true,
        aggregation: "sum",
      }],
      rows: [{ revenue_total: 42 }],
    });

    const field = workspaceRepository.getSnapshot().projects[0].datasets
      .find((dataset) => dataset.id === "dataset-field-identity")?.fields[0];
    expect(field).toMatchObject({
      id: "field-stable-id",
      name: "revenue_total",
      isMeasure: true,
      aggregation: "sum",
    });
  });

  it("deletes an imported dataset from canonical state instead of re-merging it", async () => {
    vi.useFakeTimers();
    try {
      const [{ useStore }, { workspaceRepository }] = await Promise.all([
        import("@/store/useStore"),
        import("@domain/workspace/workspaceRepository"),
      ]);
      useStore.getState().importDataset({
        id: "dataset-delete-me",
        name: "Temporary import",
        fields: [],
        rows: [],
      });
      useStore.getState().renameProject("project-1", "Renamed before deletion");

      useStore.getState().deleteImportedDataset("dataset-delete-me");
      await vi.advanceTimersByTimeAsync(500);

      expect(workspaceRepository.getSnapshot().projects[0].datasets.some((dataset) => dataset.id === "dataset-delete-me")).toBe(false);
      expect(workspaceRepository.getSnapshot().projects[0].name).toBe("Renamed before deletion");
      expect(useStore.getState().importedDatasets.some((dataset) => dataset.id === "dataset-delete-me")).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("deletes a chart and its dependent widgets from canonical state", async () => {
    vi.useFakeTimers();
    try {
      const [{ useStore }, { workspaceRepository }] = await Promise.all([
        import("@/store/useStore"),
        import("@domain/workspace/workspaceRepository"),
      ]);

      useStore.getState().deleteChart("chart-shared");
      await vi.advanceTimersByTimeAsync(500);

      const project = workspaceRepository.getSnapshot().projects[0];
      expect(project.charts.some((chart) => chart.id === "chart-shared")).toBe(false);
      expect(project.dashboards.flatMap((dashboard) => dashboard.widgets).some((widget) => widget.chartId === "chart-shared")).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("clears the canonical dashboard instead of re-merging removed widgets", async () => {
    vi.useFakeTimers();
    try {
      const [{ useStore }, { workspaceRepository }] = await Promise.all([
        import("@/store/useStore"),
        import("@domain/workspace/workspaceRepository"),
      ]);

      useStore.getState().clearDashboard("sheet-1", "dashboard-1");
      await vi.advanceTimersByTimeAsync(500);

      const dashboard = workspaceRepository.getSnapshot().projects[0].dashboards.find((item) => item.id === "dashboard-1");
      expect(dashboard.widgets).toEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("deletes a project from canonical state instead of re-merging it", async () => {
    vi.useFakeTimers();
    try {
      const [{ useStore }, { workspaceRepository }] = await Promise.all([
        import("@/store/useStore"),
        import("@domain/workspace/workspaceRepository"),
      ]);
      workspaceRepository.upsertProject({ id: "project-delete-me", name: "Temporary project" });
      expect(useStore.getState().projects.some((project) => project.id === "project-delete-me")).toBe(true);

      useStore.getState().deleteProject("project-delete-me");
      await vi.advanceTimersByTimeAsync(500);

      expect(workspaceRepository.getSnapshot().projects.some((project) => project.id === "project-delete-me")).toBe(false);
      expect(useStore.getState().projects.some((project) => project.id === "project-delete-me")).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("deletes a legacy sheet alias and every dashboard it owns from canonical state", async () => {
    vi.useFakeTimers();
    try {
      const [{ useStore }, { workspaceRepository }] = await Promise.all([
        import("@/store/useStore"),
        import("@domain/workspace/workspaceRepository"),
      ]);
      workspaceRepository.update((workspace) => ({
        ...workspace,
        projects: workspace.projects.map((project) => project.id !== "project-1" ? project : {
          ...project,
          dashboards: [...project.dashboards, {
            ...project.dashboards[0],
            id: "dashboard-sheet-delete",
            name: "Temporary sheet dashboard",
            widgets: [],
            legacySheetId: "sheet-delete",
          }],
          legacySheetAliases: [...project.legacySheetAliases, {
            sheetId: "sheet-delete",
            name: "Temporary sheet",
            dashboardIds: ["dashboard-sheet-delete"],
          }],
        }),
      }));

      useStore.getState().removeSheet("sheet-delete");
      await vi.advanceTimersByTimeAsync(500);

      const project = workspaceRepository.getSnapshot().projects.find((item) => item.id === "project-1");
      expect(project.legacySheetAliases.some((alias) => alias.sheetId === "sheet-delete")).toBe(false);
      expect(project.dashboards.some((dashboard) => dashboard.id === "dashboard-sheet-delete")).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("deletes a dashboard from canonical state instead of re-merging it", async () => {
    vi.useFakeTimers();
    try {
      const [{ useStore }, { workspaceRepository }] = await Promise.all([
        import("@/store/useStore"),
        import("@domain/workspace/workspaceRepository"),
      ]);
      workspaceRepository.update((workspace) => ({
        ...workspace,
        projects: workspace.projects.map((project) => project.id !== "project-1" ? project : {
          ...project,
          dashboards: [...project.dashboards, {
            ...project.dashboards[0],
            id: "dashboard-delete-me",
            name: "Temporary dashboard",
            widgets: [],
          }],
          legacySheetAliases: project.legacySheetAliases.map((alias) => alias.sheetId === "sheet-1"
            ? { ...alias, dashboardIds: [...alias.dashboardIds, "dashboard-delete-me"] }
            : alias),
        }),
      }));

      useStore.getState().removeDashboard("dashboard-delete-me");
      await vi.advanceTimersByTimeAsync(500);

      const project = workspaceRepository.getSnapshot().projects.find((item) => item.id === "project-1");
      expect(project.dashboards.some((dashboard) => dashboard.id === "dashboard-delete-me")).toBe(false);
      expect(project.legacySheetAliases.flatMap((alias) => alias.dashboardIds)).not.toContain("dashboard-delete-me");
    } finally {
      vi.useRealTimers();
    }
  });

  it("deletes a dashboard widget instance from canonical state instead of re-merging it", async () => {
    vi.useFakeTimers();
    try {
      const [{ useStore }, { workspaceRepository }] = await Promise.all([
        import("@/store/useStore"),
        import("@domain/workspace/workspaceRepository"),
      ]);
      const widgetId = workspaceRepository.getSnapshot().projects[0].dashboards[0].widgets[0].id;

      useStore.getState().removeChart("sheet-1", widgetId, "dashboard-1");
      await vi.advanceTimersByTimeAsync(500);

      const dashboard = workspaceRepository.getSnapshot().projects[0].dashboards.find((item) => item.id === "dashboard-1");
      expect(dashboard.widgets.some((widget) => widget.id === widgetId)).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("ignores chart saves without an active project without writing console noise", async () => {
    const { useStore } = await import("@/store/useStore");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const chartsBefore = useStore.getState().charts;
    useStore.setState({ activeProjectId: null });

    useStore.getState().saveChart({ id: "chart-without-context", title: "Ignored" });

    expect(useStore.getState().charts).toEqual(chartsBefore);
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("seeds the empty canonical repository before fresh routes render", async () => {
    window.localStorage.clear();
    vi.resetModules();

    const [{ useStore }, { workspaceRepository }] = await Promise.all([
      import("@/store/useStore"),
      import("@domain/workspace/workspaceRepository"),
    ]);
    const state = useStore.getState();
    const snapshot = workspaceRepository.getSnapshot();

    expect(snapshot.projects.some((project) => project.id === state.activeProjectId)).toBe(true);
    expect(
      snapshot.projects
        .find((project) => project.id === state.activeProjectId)
        ?.dashboards.some((dashboard) => dashboard.id === state.activeDashboardId)
    ).toBe(true);
  });

  it("projects same-tab canonical shares into the readonly resolver", async () => {
    const [{ useStore }, { workspaceRepository }] = await Promise.all([
      import("@/store/useStore"),
      import("@domain/workspace/workspaceRepository"),
    ]);
    workspaceRepository.upsertShare("project-1", {
      id: "share-browser",
      dashboardId: "dashboard-1",
      mode: "local-readonly",
      snapshot: { dashboardId: "dashboard-1", editable: false },
    });

    expect(useStore.getState().resolveShareLink("share-browser")).toMatchObject({
      id: "share-browser",
      projectId: "project-1",
      dashboardId: "dashboard-1",
    });
  });

  it("replays exact imported data through designer chart save dashboard placement and refresh", async () => {
    const [{ useStore }, savedCharts, projectStorage, datasetService, { workspaceRepository: initialRepository }] = await Promise.all([
      import("@/store/useStore"),
      import("@/utils/savedChartsStorage"),
      import("@/services/projectStorage"),
      import("@/components/dashboard-v2/services/datasetService"),
      import("@domain/workspace/workspaceRepository"),
    ]);
    const rows = [
      { region: "North", revenue: 12800000 },
      { region: "South", revenue: 9400000 },
    ];

    useStore.getState().importDataset({
      id: "dataset-replay",
      name: "Revenue import",
      fields: [
        { id: "region", name: "region", label: "Region", type: "text" },
        { id: "revenue", name: "revenue", label: "Revenue", type: "number" },
      ],
      rows,
    });
    expect(datasetService.getDatasetRows("dataset-replay", initialRepository.getSnapshot())).toEqual(rows);
    const chart = savedCharts.upsertSavedChart({
      id: "chart-replay",
      title: "Revenue by region",
      chartType: "bar",
      datasetId: "dataset-replay",
      config: {
        sourceType: "dataset",
        datasetId: "dataset-replay",
        chartType: "bar",
        mappings: [
          { id: "x", fields: [{ id: "region" }] },
          { id: "y", fields: [{ id: "revenue" }] },
        ],
      },
    });
    projectStorage.addWidgetToDashboard("project-1", "dashboard-1", {
      id: "widget-replay",
      type: "chart",
      chartId: chart.id,
      config: { chartId: chart.id },
    });

    vi.resetModules();
    const [{ workspaceRepository }, refreshedProjectStorage, refreshedSavedCharts, refreshedChartContract] = await Promise.all([
      import("@domain/workspace/workspaceRepository"),
      import("@/services/projectStorage"),
      import("@/utils/savedChartsStorage"),
      import("@domain/charts/chartDataContract"),
    ]);
    const refreshedChart = refreshedSavedCharts.getSavedChartById("chart-replay");
    const refreshedDashboard = refreshedProjectStorage.getDashboardById("project-1", "dashboard-1");
    const replay = refreshedChartContract.resolveChartData(workspaceRepository.getSnapshot(), refreshedChart);
    const canonicalWidget = workspaceRepository.getSnapshot().projects[0].dashboards[0].widgets
      .find((widget) => widget.id === "widget-replay");

    expect(refreshedDashboard.widgets).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: "widget-replay",
        sourceChartId: "chart-replay",
      }),
    ]));
    expect(canonicalWidget.chartId).toBe("chart-replay");
    expect(replay).toMatchObject({ status: "ready", datasetId: "dataset-replay", rows });
  });

  it("replays a built-in demo chart through dashboard placement and refresh", async () => {
    const [savedCharts, projectStorage] = await Promise.all([
      import("@/utils/savedChartsStorage"),
      import("@/services/projectStorage"),
    ]);
    const rows = [{ region: "North", revenue: 12800000 }];
    const fields = [
      { id: "region", name: "region", label: "Region", type: "text" },
      { id: "revenue", name: "revenue", label: "Revenue", type: "number" },
    ];
    const chart = savedCharts.upsertSavedChart({
      id: "chart-demo-replay",
      title: "Demo revenue by region",
      chartType: "bar",
      config: {
        sourceType: "demo",
        datasetId: "sales_performance",
        chartType: "bar",
        mappings: [
          { id: "x", fields: [{ id: "region" }] },
          { id: "y", fields: [{ id: "revenue" }] },
        ],
      },
    });
    projectStorage.addWidgetToDashboard("project-1", "dashboard-1", {
      id: "widget-demo-replay",
      type: "chart",
      chartId: chart.id,
      config: { chartId: chart.id },
    });

    vi.resetModules();
    const [{ workspaceRepository }, refreshedProjectStorage, refreshedSavedCharts, refreshedChartContract] = await Promise.all([
      import("@domain/workspace/workspaceRepository"),
      import("@/services/projectStorage"),
      import("@/utils/savedChartsStorage"),
      import("@domain/charts/chartDataContract"),
    ]);
    const refreshedChart = refreshedSavedCharts.getSavedChartById("chart-demo-replay");
    const refreshedDashboard = refreshedProjectStorage.getDashboardById("project-1", "dashboard-1");
    const canonicalWidget = workspaceRepository.getSnapshot().projects[0].dashboards[0].widgets
      .find((widget) => widget.id === "widget-demo-replay");
    const replay = refreshedChartContract.resolveChartData(workspaceRepository.getSnapshot(), refreshedChart, {
      demoResolver: () => ({ rows, fields }),
    });

    expect(refreshedDashboard.widgets).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: "widget-demo-replay",
        sourceChartId: "chart-demo-replay",
      }),
    ]));
    expect(canonicalWidget.chartId).toBe("chart-demo-replay");
    expect(refreshedChart.dataContract).toMatchObject({
      sourceType: "demo",
      datasetId: "sales_performance",
    });
    expect(replay).toMatchObject({
      status: "ready",
      sourceType: "demo",
      datasetId: "sales_performance",
      rows,
    });
  });
});
