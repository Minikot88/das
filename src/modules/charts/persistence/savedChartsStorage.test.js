import { beforeEach, describe, expect, it, vi } from "vitest";
import { createProjectStorageLegacyFixture, createZustandLegacyFixture } from "@domain/workspace/__fixtures__/workspaceFixtures";

function seedLegacyStorage() {
  window.localStorage.setItem("mini-bi-v8-workspace", JSON.stringify(createZustandLegacyFixture()));
  window.localStorage.setItem("mini-bi-projects", JSON.stringify(createProjectStorageLegacyFixture()));
  window.localStorage.setItem("mini-bi-active-project-id", "project-1");
  window.localStorage.setItem("mini-bi-active-dashboard-id", "dashboard-1");
}

describe("saved chart canonical data contracts", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.resetModules();
    seedLegacyStorage();
  });

  it("persists a project-owned dataset contract", async () => {
    const savedCharts = await import("@modules/charts/persistence/savedChartsStorage");

    const saved = savedCharts.upsertSavedChart({
      id: "chart-dataset-contract",
      title: "Imported revenue",
      chartType: "bar",
      datasetId: "dataset-shared",
      config: {
        sourceType: "dataset",
        datasetId: "dataset-shared",
        chartType: "bar",
        mappings: [{ id: "x", fields: [{ id: "region" }] }],
      },
    });

    expect(saved).toMatchObject({
      id: "chart-dataset-contract",
      projectId: "project-1",
      datasetId: "dataset-shared",
      dataContract: {
        sourceType: "dataset",
        datasetId: "dataset-shared",
        rows: [],
      },
    });
    expect(savedCharts.getSavedChartById(saved.id)?.dataContract).toMatchObject({ sourceType: "dataset" });
  });

  it("persists SQL result rows as a local replay snapshot", async () => {
    const savedCharts = await import("@modules/charts/persistence/savedChartsStorage");

    const saved = savedCharts.upsertSavedChart({
      id: "chart-sql-contract",
      title: "SQL total",
      chartType: "bar",
      config: {
        sourceType: "demo-sql",
        datasetId: "sql_result",
        chartType: "bar",
        sqlQuery: "select 9 as total",
        sqlResultSchema: [{ id: "total", name: "total", label: "Total", type: "number" }],
        sqlResultRows: [{ total: 9 }],
      },
    });

    expect(saved.dataContract).toEqual({
      sourceType: "sql-result",
      datasetId: null,
      fields: [{ id: "total", name: "total", label: "Total", type: "number" }],
      rows: [{ total: 9 }],
      queryText: "select 9 as total",
    });
  });

  it("preserves every SQL snapshot row and legitimate reserved-looking column name", async () => {
    const savedCharts = await import("@modules/charts/persistence/savedChartsStorage");
    const rows = Array.from({ length: 5_001 }, (_, index) => ({
      rows: index,
      option: `value-${index}`,
    }));

    const saved = savedCharts.upsertSavedChart({
      id: "chart-large-sql-contract",
      title: "Large SQL snapshot",
      chartType: "table",
      dataContract: {
        sourceType: "sql-result",
        datasetId: null,
        fields: [
          { id: "rows", name: "rows", label: "Rows", type: "number" },
          { id: "option", name: "option", label: "Option", type: "text" },
        ],
        rows,
        queryText: "select rows, option from synthetic_source",
      },
      config: { sourceType: "demo-sql", chartType: "table" },
    });

    expect(saved.dataContract.rows).toHaveLength(5_001);
    expect(saved.dataContract.rows[5_000]).toEqual({ rows: 5_000, option: "value-5000" });
    expect(savedCharts.getSavedChartById(saved.id).dataContract.rows).toEqual(rows);
  });

  it("preserves the source data contract when creating a duplicate", async () => {
    const savedCharts = await import("@modules/charts/persistence/savedChartsStorage");
    const dataContract = {
      sourceType: "sql-result",
      datasetId: null,
      fields: [{ id: "total", name: "total", label: "Total", type: "number" }],
      rows: [{ total: 42 }],
      queryText: "select 42 as total",
    };

    const duplicate = savedCharts.createSavedChartFromConfig(
      { sourceType: "demo-sql", chartType: "bar", sqlQuery: "select 42 as total" },
      { forceNew: true, title: "SQL total copy", dataContract },
    );

    expect(duplicate.dataContract).toEqual(dataContract);
    expect(savedCharts.getSavedChartById(duplicate.id).dataContract).toEqual(dataContract);
  });
});
