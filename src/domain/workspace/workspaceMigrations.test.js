import { describe, expect, it, vi } from "vitest";
import {
  LEGACY_SOURCE_KEYS,
  createMigrationCandidate,
  fingerprintSourceValue,
  readLegacySourceValues,
  validateMigrationCandidate,
} from "@domain/workspace/workspaceMigrations";
import {
  FIXED_TIMESTAMP,
  createProjectStorageLegacyFixture,
  createZustandLegacyFixture,
  fixedClock,
} from "@domain/workspace/__fixtures__/workspaceFixtures";

function createSourceValues(overrides = {}) {
  return {
    rawByKey: {
      "mini-bi-v8-workspace": JSON.stringify(createZustandLegacyFixture()),
      "mini-bi-projects": JSON.stringify(createProjectStorageLegacyFixture()),
      "mini-bi-active-project-id": "project-1",
      "mini-bi-active-dashboard-id": "dashboard-1",
      ...overrides,
    },
  };
}

describe("workspace migrations", () => {
  it("reads only approved source keys without modifying storage", () => {
    const values = new Map([
      ["mini-bi-v8-workspace", "zustand-raw"],
      ["mini-bi-projects", "projects-raw"],
      ["mini-bi-db-connections", "SYNTHETIC_PASSWORD_SENTINEL"],
    ]);
    const storage = {
      getItem: vi.fn((key) => values.get(key) ?? null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };

    const sources = readLegacySourceValues(storage);

    expect(Object.keys(sources.rawByKey)).toEqual(LEGACY_SOURCE_KEYS);
    expect(storage.getItem).not.toHaveBeenCalledWith("mini-bi-db-connections");
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.removeItem).not.toHaveBeenCalled();
  });

  it("migrates a Zustand-only graph with project-owned data and Sheet compatibility", () => {
    const sources = createSourceValues({ "mini-bi-projects": null });

    const candidate = createMigrationCandidate(sources, { clock: fixedClock });
    const project = candidate.document.projects[0];

    expect(candidate.document.active).toEqual({ projectId: "project-1", dashboardId: "dashboard-1" });
    expect(project.datasets[0]).toMatchObject({ id: "dataset-shared", projectId: "project-1", rowCount: 1 });
    expect(project.charts[0]).toMatchObject({ id: "chart-shared", projectId: "project-1", datasetId: "dataset-shared" });
    expect(project.dashboards[0]).toMatchObject({ id: "dashboard-1", projectId: "project-1", legacySheetId: "sheet-1" });
    expect(project.legacySheetAliases).toEqual([
      { sheetId: "sheet-1", name: "Sales sheet", dashboardIds: ["dashboard-1"] },
    ]);
    expect(project.shares[0]).toMatchObject({ id: "share-1", mode: "local-readonly" });
    expect(candidate.document.settings).toMatchObject({ theme: "dark", density: "compact", locale: "th" });
  });

  it("preserves local-share expiry during migration", () => {
    const zustand = createZustandLegacyFixture();
    zustand.shareLinks["share-1"].expiresAt = "2026-07-12T00:00:00.000Z";
    const candidate = createMigrationCandidate(createSourceValues({
      "mini-bi-v8-workspace": JSON.stringify(zustand),
      "mini-bi-projects": null,
    }), { clock: fixedClock });

    expect(candidate.document.projects[0].shares[0].expiresAt).toBe("2026-07-12T00:00:00.000Z");
  });

  it("migrates a projectStorage-only graph and preserves current entities", () => {
    const sources = createSourceValues({ "mini-bi-v8-workspace": null });

    const candidate = createMigrationCandidate(sources, { clock: fixedClock });
    const project = candidate.document.projects[0];

    expect(project.name).toBe("Current workspace");
    expect(project.datasets.map((item) => item.id)).toEqual(["dataset-shared", "dataset-current"]);
    expect(project.charts.map((item) => item.id)).toEqual(["chart-shared", "chart-current"]);
    expect(project.dashboards[0].widgets[0]).toMatchObject({
      id: "widget-shared",
      kind: "text",
      layout: { x: 1, y: 1, w: 4, h: 2, zIndex: 2 },
      presentation: { text: "Current note" },
    });
  });

  it("uses saved-chart, layout, and theme compatibility keys only as missing-data fallbacks", () => {
    const zustand = createZustandLegacyFixture();
    const projectStorage = createProjectStorageLegacyFixture();
    zustand.charts = [];
    zustand.projects[0].sheets[0].dashboards = [];
    projectStorage[0].charts = [];
    projectStorage[0].dashboards = [];
    const sources = createSourceValues({
      "mini-bi-v8-workspace": JSON.stringify(zustand),
      "mini-bi-projects": JSON.stringify(projectStorage),
      "dashboard-v2-saved-charts": JSON.stringify([{
        id: "chart-fallback",
        title: "Recovered chart",
        chartType: "bar",
        config: { chartType: "bar" },
        dataContract: {
          sourceType: "snapshot",
          datasetId: null,
          fields: [{ id: "value", name: "value", label: "Value", type: "number" }],
          rows: [{ value: 42 }],
        },
      }]),
      "dashboard-v2-chart-config": JSON.stringify({ chartId: "draft-must-not-promote", chartType: "line" }),
      "dashboard-canvas-layout-v1": JSON.stringify({
        dashboardId: "dashboard-fallback",
        dashboardName: "Recovered dashboard",
        widgets: [{ id: "widget-fallback", type: "text", config: { text: "Recovered" } }],
      }),
      "mini-bi-theme": "light",
    });

    const candidate = createMigrationCandidate(sources, { clock: fixedClock });
    const project = candidate.document.projects[0];

    expect(project.charts).toHaveLength(1);
    expect(project.charts[0]).toMatchObject({
      id: "chart-fallback",
      projectId: "project-1",
      dataContract: { sourceType: "snapshot", rows: [{ value: 42 }] },
    });
    expect(project.charts.some((chart) => chart.id === "draft-must-not-promote")).toBe(false);
    expect(project.dashboards[0]).toMatchObject({
      id: "dashboard-fallback",
      name: "Recovered dashboard",
      widgets: [{ id: "widget-fallback", projectId: "project-1", dashboardId: "dashboard-fallback" }],
    });
    expect(candidate.document.settings.theme).toBe("light");
  });

  it("does not let fallback compatibility records overwrite primary graph records", () => {
    const sources = createSourceValues({
      "dashboard-v2-saved-charts": JSON.stringify([{ id: "chart-fallback", title: "Fallback only" }]),
      "dashboard-canvas-layout-v1": JSON.stringify({ dashboardId: "dashboard-fallback", widgets: [] }),
      "mini-bi-theme": "light",
    });

    const candidate = createMigrationCandidate(sources, { clock: fixedClock });
    const project = candidate.document.projects[0];

    expect(project.charts.map((chart) => chart.id)).not.toContain("chart-fallback");
    expect(project.dashboards.map((dashboard) => dashboard.id)).not.toContain("dashboard-fallback");
    expect(candidate.document.settings.theme).toBe("light");
  });

  it("merges both sources with field-level precedence and preserves unique entities", () => {
    const candidate = createMigrationCandidate(createSourceValues(), { clock: fixedClock });
    const project = candidate.document.projects[0];

    expect(project.name).toBe("Current workspace");
    expect(project.datasets).toHaveLength(2);
    expect(project.datasets.find((item) => item.id === "dataset-shared")?.rows).toEqual([{ id: "row-1", region: "North" }]);
    expect(project.charts).toHaveLength(2);
    expect(project.charts.find((item) => item.id === "chart-shared")?.config).toMatchObject({ current: true });
    expect(project.shares).toHaveLength(1);
    expect(candidate.report.counts).toMatchObject({ projects: 1, datasets: 2, charts: 2, dashboards: 1, widgets: 2, shares: 1 });
    expect(candidate.document.migration.conflicts.length).toBeGreaterThan(0);
  });

  it("keeps the validated Zustand share snapshot and fills an empty current chart config", () => {
    const zustand = createZustandLegacyFixture();
    zustand.shareLinks["share-1"].expiresAt = "2026-12-31T00:00:00.000Z";
    const current = createProjectStorageLegacyFixture();
    current[0].shares = [{
      id: "share-1",
      projectId: "project-1",
      dashboardId: "dashboard-1",
      snapshot: { title: "Stale current snapshot" },
      expiresAt: null,
    }];
    current[0].charts[0].config = {};
    const candidate = createMigrationCandidate(createSourceValues({
      "mini-bi-v8-workspace": JSON.stringify(zustand),
      "mini-bi-projects": JSON.stringify(current),
    }), { clock: fixedClock });
    const project = candidate.document.projects[0];

    expect(project.shares[0]).toMatchObject({
      snapshot: { title: "Local snapshot" },
      expiresAt: "2026-12-31T00:00:00.000Z",
    });
    expect(project.charts.find((chart) => chart.id === "chart-shared")?.config).toEqual({ legacy: true });
  });

  it("remaps incompatible widget collisions deterministically and rewrites no unrelated references", () => {
    const first = createMigrationCandidate(createSourceValues(), { clock: fixedClock });
    const second = createMigrationCandidate(createSourceValues(), { clock: fixedClock });
    const widgetIds = first.document.projects[0].dashboards[0].widgets.map((widget) => widget.id);

    expect(widgetIds).toEqual(["widget-shared", "widget-shared~zustand"]);
    expect(second.document.projects[0].dashboards[0].widgets.map((widget) => widget.id)).toEqual(widgetIds);
  });

  it("preserves same-source ID collisions with deterministic remapped IDs", () => {
    const projects = createProjectStorageLegacyFixture();
    projects[0].datasets.push({
      ...structuredClone(projects[0].datasets[1]),
      id: "dataset-current~project-storage-2",
      name: "Reserved suffix dataset",
    });
    projects[0].datasets.push({
      ...structuredClone(projects[0].datasets[1]),
      name: "Second colliding dataset",
      rows: [{ value: 2 }],
    });
    projects[0].charts.push({
      ...structuredClone(projects[0].charts[1]),
      title: "Second colliding chart",
    });
    const sources = createSourceValues({
      "mini-bi-v8-workspace": null,
      "mini-bi-projects": JSON.stringify(projects),
    });

    const first = createMigrationCandidate(sources, { clock: fixedClock });
    const second = createMigrationCandidate(sources, { clock: fixedClock });
    const project = first.document.projects[0];

    expect(project.datasets.map((dataset) => dataset.id)).toContain("dataset-current~project-storage-3");
    expect(project.charts.map((chart) => chart.id)).toContain("chart-current~project-storage-2");
    expect(second.document.projects[0].datasets.map((dataset) => dataset.id)).toEqual(
      project.datasets.map((dataset) => dataset.id),
    );
    expect(first.document.migration.conflicts).toEqual(expect.arrayContaining([
      expect.objectContaining({ entityType: "dataset", entityId: "dataset-current", field: "id" }),
      expect.objectContaining({ entityType: "chart", entityId: "chart-current", field: "id" }),
    ]));
    expect(validateMigrationCandidate(first).valid).toBe(true);
  });

  it("rewrites Sheet aliases when duplicate dashboard ids are remapped", () => {
    const zustand = createZustandLegacyFixture();
    zustand.projects[0].sheets.push({
      id: "sheet-2",
      name: "Second sheet",
      dashboards: [{ id: "dashboard-1", name: "Second colliding dashboard", charts: [], layout: [] }],
    });
    const candidate = createMigrationCandidate(createSourceValues({
      "mini-bi-v8-workspace": JSON.stringify(zustand),
      "mini-bi-projects": null,
    }), { clock: fixedClock });
    const project = candidate.document.projects[0];

    expect(project.dashboards.map((dashboard) => dashboard.id)).toEqual(["dashboard-1", "dashboard-1~zustand-2"]);
    expect(project.legacySheetAliases.find((alias) => alias.sheetId === "sheet-1")?.dashboardIds).toEqual(["dashboard-1"]);
    expect(project.legacySheetAliases.find((alias) => alias.sheetId === "sheet-2")?.dashboardIds).toEqual(["dashboard-1~zustand-2"]);
    expect(validateMigrationCandidate(candidate).valid).toBe(true);
  });

  it("allocates a unique suffix for incompatible widget collisions", () => {
    const current = createProjectStorageLegacyFixture();
    current[0].dashboards[0].widgets.push({
      ...structuredClone(current[0].dashboards[0].widgets[0]),
      id: "widget-shared~zustand",
    });
    const candidate = createMigrationCandidate(createSourceValues({
      "mini-bi-projects": JSON.stringify(current),
    }), { clock: fixedClock });
    const widgetIds = candidate.document.projects[0].dashboards[0].widgets.map((widget) => widget.id);

    expect(widgetIds).toEqual(["widget-shared", "widget-shared~zustand", "widget-shared~zustand-2"]);
    expect(new Set(widgetIds).size).toBe(widgetIds.length);
  });

  it("skips malformed parseable source roots instead of inventing synthetic entities", () => {
    const candidate = createMigrationCandidate(createSourceValues({
      "mini-bi-v8-workspace": JSON.stringify([]),
      "mini-bi-projects": JSON.stringify({ projects: [{ name: "Malformed" }] }),
      "mini-bi-active-project-id": null,
      "mini-bi-active-dashboard-id": null,
    }), { clock: fixedClock });

    expect(candidate.document.projects).toEqual([]);
    expect(candidate.document.migration.warnings).toEqual(expect.arrayContaining([
      "mini-bi-v8-workspace has an unsupported root shape and was skipped",
      "mini-bi-projects has an unsupported root shape and was skipped",
    ]));
  });

  it("skips malformed nested legacy records instead of inventing synthetic entities", () => {
    const candidate = createMigrationCandidate(createSourceValues({
      "mini-bi-v8-workspace": JSON.stringify({ projects: [7, null, { datasets: [7] }] }),
      "mini-bi-projects": JSON.stringify([7, null, {
        id: "project-valid",
        name: "Valid shell",
        datasets: [7],
        charts: [7],
        dashboards: [7],
        shares: [7],
      }]),
      "mini-bi-active-project-id": null,
      "mini-bi-active-dashboard-id": null,
    }), { clock: fixedClock });

    expect(candidate.document.projects).toEqual([
      expect.objectContaining({
        id: "project-valid",
        datasets: [],
        charts: [],
        dashboards: [],
        shares: [],
      }),
    ]);
    expect(candidate.document.migration.warnings).toEqual(expect.arrayContaining([
      expect.stringContaining("malformed"),
    ]));
    expect(validateMigrationCandidate(candidate).valid).toBe(true);
  });

  it("keeps corrupted sources as warnings while migrating valid sources", () => {
    const sources = createSourceValues({ "mini-bi-v8-workspace": "{broken-json" });

    const candidate = createMigrationCandidate(sources, { clock: fixedClock });

    expect(candidate.document.projects).toHaveLength(1);
    expect(candidate.document.migration.warnings).toContain("mini-bi-v8-workspace contains invalid JSON and was skipped");
  });

  it("repairs invalid active context deterministically", () => {
    const sources = createSourceValues({
      "mini-bi-active-project-id": "missing-project",
      "mini-bi-active-dashboard-id": "missing-dashboard",
    });

    const candidate = createMigrationCandidate(sources, { clock: fixedClock });

    expect(candidate.document.active).toEqual({ projectId: "project-1", dashboardId: "dashboard-1" });
    expect(candidate.document.migration.warnings).toEqual(expect.arrayContaining([
      "active project missing-project was unavailable; selected project-1",
      "active dashboard missing-dashboard was unavailable; selected dashboard-1",
    ]));
  });

  it("preserves unowned Zustand entities when its active project id is stale", () => {
    const zustand = createZustandLegacyFixture();
    zustand.activeProjectId = "missing-project";
    zustand.importedDatasets[0].projectId = undefined;
    zustand.charts[0].projectId = undefined;
    zustand.shareLinks["share-1"].projectId = undefined;
    const candidate = createMigrationCandidate(createSourceValues({
      "mini-bi-v8-workspace": JSON.stringify(zustand),
      "mini-bi-projects": null,
      "mini-bi-active-project-id": null,
    }), { clock: fixedClock });
    const project = candidate.document.projects[0];

    expect(project.id).toBe("project-1");
    expect(project.datasets.map((item) => item.id)).toContain("dataset-shared");
    expect(project.charts.map((item) => item.id)).toContain("chart-shared");
    expect(project.shares.map((item) => item.id)).toContain("share-1");
    expect(candidate.document.active.projectId).toBe("project-1");
  });

  it("uses valid Zustand active context when standalone active keys are stale", () => {
    const candidate = createMigrationCandidate(createSourceValues({
      "mini-bi-active-project-id": "missing-project",
      "mini-bi-active-dashboard-id": "missing-dashboard",
    }), { clock: fixedClock });

    expect(candidate.document.active).toEqual({ projectId: "project-1", dashboardId: "dashboard-1" });
  });

  it("derives the active dashboard from the active legacy Sheet when explicit dashboard ids are absent", () => {
    const zustand = createZustandLegacyFixture();
    delete zustand.activeDashboardId;
    zustand.activeSheetId = "sheet-2";
    zustand.projects[0].sheets.push({
      id: "sheet-2",
      name: "Second sheet",
      activeDashboardId: "dashboard-2",
      dashboards: [{ id: "dashboard-2", name: "Second dashboard", charts: [], layout: [] }],
    });
    const candidate = createMigrationCandidate(createSourceValues({
      "mini-bi-v8-workspace": JSON.stringify(zustand),
      "mini-bi-projects": null,
      "mini-bi-active-dashboard-id": null,
    }), { clock: fixedClock });

    expect(candidate.document.active.dashboardId).toBe("dashboard-2");
  });

  it("reports missing references rather than substituting demo data", () => {
    const zustand = createZustandLegacyFixture();
    zustand.charts[0].datasetId = "missing-dataset";
    const sources = createSourceValues({
      "mini-bi-v8-workspace": JSON.stringify(zustand),
      "mini-bi-projects": null,
    });

    const candidate = createMigrationCandidate(sources, { clock: fixedClock });
    const chart = candidate.document.projects[0].charts[0];

    expect(chart.datasetId).toBeNull();
    expect(chart.dataContract?.sourceType).toBe("unavailable");
    expect(chart.dataContract?.rows).toEqual([]);
    expect(candidate.document.migration.unresolvedReferences).toContain("chart chart-shared references missing dataset missing-dataset");
  });

  it("retains a dataset link declared only by the chart data contract", () => {
    const zustand = createZustandLegacyFixture();
    delete zustand.charts[0].datasetId;
    zustand.charts[0].dataContract = {
      sourceType: "dataset",
      datasetId: "dataset-shared",
      fields: [{ id: "region", name: "region", label: "Region", type: "text" }],
      rows: [],
    };
    const candidate = createMigrationCandidate(createSourceValues({
      "mini-bi-v8-workspace": JSON.stringify(zustand),
      "mini-bi-projects": null,
    }), { clock: fixedClock });

    expect(candidate.document.projects[0].charts[0]).toMatchObject({
      datasetId: "dataset-shared",
      dataContract: { datasetId: "dataset-shared", sourceType: "dataset" },
    });
  });

  it("preserves real snapshot rows when their former dataset is missing", () => {
    const zustand = createZustandLegacyFixture();
    zustand.charts[0].datasetId = "missing-dataset";
    zustand.charts[0].dataContract = {
      sourceType: "dataset",
      datasetId: "missing-dataset",
      fields: [{ id: "value", name: "value", label: "Value", type: "number" }],
      rows: [{ value: 42 }],
    };
    const candidate = createMigrationCandidate(createSourceValues({
      "mini-bi-v8-workspace": JSON.stringify(zustand),
      "mini-bi-projects": null,
    }), { clock: fixedClock });
    const chart = candidate.document.projects[0].charts[0];

    expect(chart.datasetId).toBeNull();
    expect(chart.dataContract).toMatchObject({
      sourceType: "snapshot",
      datasetId: null,
      unresolvedDatasetId: "missing-dataset",
      rows: [{ value: 42 }],
    });
  });

  it("preserves a share whose dashboard reference is missing and reports it explicitly", () => {
    const zustand = createZustandLegacyFixture();
    zustand.shareLinks["share-1"].dashboardId = "missing-dashboard";
    const sources = createSourceValues({
      "mini-bi-v8-workspace": JSON.stringify(zustand),
      "mini-bi-projects": null,
    });

    const candidate = createMigrationCandidate(sources, { clock: fixedClock });
    const share = candidate.document.projects[0].shares[0];

    expect(share).toMatchObject({
      id: "share-1",
      dashboardId: "missing-dashboard",
      availability: "unavailable",
    });
    expect(candidate.report.counts.shares).toBe(1);
    expect(candidate.document.migration.unresolvedReferences).toContain(
      "share share-1 references missing dashboard missing-dashboard",
    );
    expect(validateMigrationCandidate(candidate).valid).toBe(true);
  });

  it("excludes connection secret sources and sentinel values from the candidate", () => {
    const sources = createSourceValues({
      "mini-bi-db-connections": JSON.stringify([{ password: "SYNTHETIC_PASSWORD_SENTINEL" }]),
    });

    const candidate = createMigrationCandidate(sources, { clock: fixedClock });
    const serialized = JSON.stringify(candidate.document);

    expect(serialized).not.toContain("SYNTHETIC_PASSWORD_SENTINEL");
    expect(serialized).not.toContain("mini-bi-db-connections");
    expect(candidate.document.projects[0].connectionProfiles).toEqual([]);
  });

  it("produces identical serialized output for identical input", () => {
    const sources = createSourceValues();

    const first = createMigrationCandidate(sources, { clock: fixedClock });
    const second = createMigrationCandidate(sources, { clock: fixedClock });

    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    expect(first.document.createdAt).toBe(FIXED_TIMESTAMP);
  });

  it("fingerprints raw source values deterministically without retaining their content", () => {
    expect(fingerprintSourceValue("sensitive-source-content")).toBe(fingerprintSourceValue("sensitive-source-content"));
    expect(fingerprintSourceValue("sensitive-source-content")).not.toContain("sensitive-source-content");
  });

  it("validates candidate counts and reference integrity", () => {
    const candidate = createMigrationCandidate(createSourceValues(), { clock: fixedClock });

    expect(validateMigrationCandidate(candidate)).toEqual({ valid: true, errors: [], warnings: [] });
    expect(candidate.report.before).toEqual({
      zustand: expect.objectContaining({ projects: 1, datasets: 1, charts: 1, dashboards: 1 }),
      projectStorage: expect.objectContaining({ projects: 1, datasets: 2, charts: 2, dashboards: 1 }),
      compatibility: expect.objectContaining({ charts: 0, dashboards: 0 }),
    });
    expect(candidate.report.after).toEqual(candidate.report.counts);
  });
});
