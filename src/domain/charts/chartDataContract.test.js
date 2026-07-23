import { describe, expect, it, vi } from "vitest";
import { createValidWorkspaceFixture } from "@domain/workspace/__fixtures__/workspaceFixtures";
import {
  createChartDataContract,
  normalizeChartDataContract,
  resolveChartData,
  validateChartConfiguration,
} from "@domain/charts/chartDataContract";

function chartFixture(overrides = {}) {
  return {
    id: "chart-1",
    projectId: "project-1",
    datasetId: "dataset-1",
    chartType: "bar",
    config: {
      sourceType: "dataset",
      datasetId: "dataset-1",
      mappings: [{ id: "x", fields: [{ id: "region" }] }],
    },
    dataContract: {
      sourceType: "dataset",
      datasetId: "dataset-1",
      fields: [],
      rows: [],
    },
    ...overrides,
  };
}

describe("chart data contracts", () => {
  it("resolves a project-owned dataset with its exact rows and fields", () => {
    const workspace = createValidWorkspaceFixture();

    const result = resolveChartData(workspace, chartFixture());

    expect(result).toEqual({
      status: "ready",
      sourceType: "dataset",
      datasetId: "dataset-1",
      rows: [{ id: "row-1", region: "North" }],
      fields: [{ id: "region", name: "region", label: "Region", type: "text" }],
      message: "",
    });
  });

  it("returns an explicit unavailable state for a removed dataset", () => {
    const workspace = createValidWorkspaceFixture();
    workspace.projects[0].datasets = [];

    const result = resolveChartData(workspace, chartFixture());

    expect(result).toMatchObject({
      status: "unavailable",
      sourceType: "dataset",
      datasetId: "dataset-1",
      rows: [],
      fields: [],
      message: "Dataset dataset-1 is unavailable for chart chart-1.",
    });
  });

  it("returns an empty state for a valid dataset with no rows", () => {
    const workspace = createValidWorkspaceFixture();
    workspace.projects[0].datasets[0].rows = [];
    workspace.projects[0].datasets[0].rowCount = 0;

    expect(resolveChartData(workspace, chartFixture())).toMatchObject({
      status: "empty",
      rows: [],
      message: "Dataset dataset-1 has no rows.",
    });
  });

  it("replays a persisted local SQL result snapshot", () => {
    const workspace = createValidWorkspaceFixture();
    const chart = chartFixture({
      datasetId: null,
      config: {
        chartType: "bar",
        sourceType: "demo-sql",
        mappings: [{ id: "x", fields: [{ id: "total" }] }],
      },
      dataContract: {
        sourceType: "sql-result",
        datasetId: null,
        fields: [{ id: "total", name: "total", label: "Total", type: "number" }],
        rows: [{ total: 42 }],
        queryText: "select 42 as total",
      },
    });

    expect(resolveChartData(workspace, chart)).toMatchObject({
      status: "ready",
      sourceType: "sql-result",
      rows: [{ total: 42 }],
    });
  });

  it("uses demo data only when the chart explicitly declares a demo source", () => {
    const workspace = createValidWorkspaceFixture();
    const demoResolver = vi.fn(() => ({
      rows: [{ category: "Demo", value: 1 }],
      fields: [{ id: "category", name: "category", label: "Category", type: "text" }],
    }));
    const chart = chartFixture({
      datasetId: null,
      config: {
        chartType: "bar",
        sourceType: "demo",
        mappings: [{ id: "x", fields: [{ id: "category" }] }],
      },
      dataContract: { sourceType: "demo", datasetId: "sales_performance", fields: [], rows: [] },
    });

    const result = resolveChartData(workspace, chart, { demoResolver });

    expect(result.status).toBe("ready");
    expect(result.rows).toEqual([{ category: "Demo", value: 1 }]);
    expect(demoResolver).toHaveBeenCalledWith("sales_performance");
  });

  it("recovers a demo contract that an earlier canonical repair marked unavailable", () => {
    const workspace = createValidWorkspaceFixture();
    const demoResolver = vi.fn(() => ({
      rows: [{ category: "Demo", value: 1 }],
      fields: [{ id: "category", name: "category", label: "Category", type: "text" }],
    }));
    const chart = chartFixture({
      datasetId: null,
      config: {
        chartType: "bar",
        sourceType: "demo",
        datasetId: "sales_performance",
        mappings: [{ id: "x", fields: [{ id: "category" }] }],
      },
      dataContract: {
        sourceType: "unavailable",
        datasetId: null,
        unresolvedDatasetId: "sales_performance",
        fields: [],
        rows: [],
      },
    });

    const result = resolveChartData(workspace, chart, { demoResolver });

    expect(result).toMatchObject({
      status: "ready",
      sourceType: "demo",
      datasetId: "sales_performance",
      rows: [{ category: "Demo", value: 1 }],
    });
    expect(demoResolver).toHaveBeenCalledWith("sales_performance");
  });

  it("never calls the demo resolver for an unknown or unavailable source", () => {
    const workspace = createValidWorkspaceFixture();
    const demoResolver = vi.fn(() => ({ rows: [{ unrelated: true }], fields: [] }));
    const chart = chartFixture({
      datasetId: null,
      dataContract: { sourceType: "unknown", datasetId: null, fields: [], rows: [] },
    });

    const result = resolveChartData(workspace, chart, { demoResolver });

    expect(result.status).toBe("unavailable");
    expect(result.rows).toEqual([]);
    expect(demoResolver).not.toHaveBeenCalled();
  });

  it("preserves an explicit unavailable contract for honest diagnostics", () => {
    const chart = chartFixture({
      datasetId: null,
      dataContract: { sourceType: "unavailable", datasetId: null, fields: [], rows: [] },
    });

    expect(normalizeChartDataContract(chart)).toEqual({
      sourceType: "unavailable",
      datasetId: null,
      fields: [],
      rows: [],
    });
  });

  it("reports mappings that reference missing fields", () => {
    const workspace = createValidWorkspaceFixture();
    const chart = chartFixture();
    chart.config.mappings[0].fields = [{ id: "missing-field" }];
    const data = resolveChartData(workspace, chart);

    expect(validateChartConfiguration(chart, data.fields)).toEqual({
      valid: false,
      errors: ["Chart chart-1 mapping x references missing field missing-field."],
    });
    expect(resolveChartData(workspace, chart)).toMatchObject({
      status: "invalid",
      rows: [],
      message: "Chart chart-1 mapping x references missing field missing-field.",
    });
  });

  it("normalizes legacy saved chart configuration into an explicit contract", () => {
    const chart = chartFixture({
      dataContract: null,
      config: {
        sourceType: "demo-sql",
        datasetId: "sql_result",
        sqlQuery: "select total",
        sqlResultSchema: [{ id: "total", name: "total", label: "Total", type: "number" }],
        sqlResultRows: [{ total: 9 }],
      },
    });

    expect(normalizeChartDataContract(chart)).toEqual({
      sourceType: "sql-result",
      datasetId: null,
      fields: [{ id: "total", name: "total", label: "Total", type: "number" }],
      rows: [{ total: 9 }],
      queryText: "select total",
    });
  });

  it("creates a persisted dataset or snapshot contract from designer state", () => {
    expect(createChartDataContract({
      sourceType: "dataset",
      datasetId: "dataset-1",
      rows: [{ region: "North" }],
      fields: [{ id: "region", name: "region", label: "Region", type: "text" }],
    })).toEqual({
      sourceType: "dataset",
      datasetId: "dataset-1",
      fields: [{ id: "region", name: "region", label: "Region", type: "text" }],
      rows: [],
    });
    expect(createChartDataContract({
      sourceType: "demo-sql",
      datasetId: "sql_result",
      rows: [{ total: 7 }],
      fields: [{ id: "total", name: "total", label: "Total", type: "number" }],
      queryText: "select 7",
    })).toMatchObject({ sourceType: "sql-result", rows: [{ total: 7 }], queryText: "select 7" });
  });
});
