import { describe, expect, it } from "vitest";
import { normalizeServerShareWidgets } from "@modules/sharing/lib/serverShareSnapshot";

describe("normalizeServerShareWidgets", () => {
  it("flattens an API chart snapshot without rendering a dataset object as text", () => {
    const [widget] = normalizeServerShareWidgets([{
      id: "widget-1",
      type: "chart",
      chart: {
        id: "chart-1",
        name: "Monthly sales",
        chartType: "bar",
        engine: "echarts",
        datasetId: null,
        mappingJson: { x: "month", y: "sales" },
        settingsJson: { showLegend: true },
        configJson: { chartType: "bar", mappings: [{ id: "xAxis", fields: [{ id: "month" }] }], dataset: { datasetId: "sales", sourceType: "demo" } },
        dataContractJson: { datasetId: "sales", sourceType: "demo", fields: [{ id: "month", name: "Month" }], rows: [{ month: "Jan", sales: 10 }] },
      },
    }]);

    expect(widget).toMatchObject({
      title: "Monthly sales",
      type: "bar",
      dataset: "sales",
      mapping: { x: "month", y: "sales" },
      fields: [{ id: "month", name: "Month" }],
      config: { chartType: "bar", mappings: [{ id: "xAxis", fields: [{ id: "month" }] }] },
      rows: [{ month: "Jan", sales: 10 }],
    });
    expect(typeof widget.dataset).toBe("string");
  });
});
