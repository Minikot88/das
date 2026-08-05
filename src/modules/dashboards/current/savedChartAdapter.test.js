import { describe, expect, it, vi } from "vitest";
import { buildSavedChartConfigInput, chartLibraryAfterAdd, savedChartSourceDiffers } from "./savedChartAdapter";

describe("buildSavedChartConfigInput", () => {
  it("keeps server-backed charts after adding one to the canvas", () => {
    const charts = [{ id: "chart-api", title: "Server chart" }];
    const readLocalCharts = vi.fn(() => []);

    expect(chartLibraryAfterAdd(false, charts, readLocalCharts)).toBe(charts);
    expect(readLocalCharts).not.toHaveBeenCalled();
  });

  it("adapts a persisted Chart.js donut to the live dashboard contract", () => {
    const config = buildSavedChartConfigInput({
      chartType: "doughnut",
      datasetId: "dataset-scopus",
      mapping: { label: "year", value: "cited_by_count", measures: [] },
      settings: { title: "Scopus cited-by" },
      config: {
        type: "doughnut",
        data: { labels: ["2026"], datasets: [{ data: [0] }] },
      },
      dataContract: {
        sourceType: "dataset",
        datasetId: "dataset-scopus",
        rows: [],
        fields: [],
      },
    });

    expect(config).toMatchObject({
      chartType: "donut",
      sourceType: "dataset",
      datasetId: "dataset-scopus",
      mapping: { label: "year", value: "cited_by_count", measures: [] },
      mappings: { label: "year", value: "cited_by_count", measures: [] },
    });
    expect(config.data.labels).toEqual(["2026"]);
  });

  it("rejects a stale demo snapshot when the saved chart points at Scopus", () => {
    expect(savedChartSourceDiffers(
      { sourceType: "demo", datasetId: "sales_performance" },
      { sourceType: "dataset", datasetId: "dataset-scopus" },
    )).toBe(true);
    expect(savedChartSourceDiffers(
      { sourceType: "dataset", datasetId: "dataset-scopus" },
      { sourceType: "dataset", datasetId: "dataset-scopus" },
    )).toBe(false);
  });
});
