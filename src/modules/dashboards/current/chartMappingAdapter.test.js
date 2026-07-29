import { describe, expect, it } from "vitest";
import {
  normalizeDashboardChartFields,
  toDashboardMappingSlots,
} from "./chartMappingAdapter";

const apiFields = [
  { name: "month", dataType: "text" },
  { name: "revenue", dataType: "decimal" },
];

describe("dashboard chart mapping compatibility", () => {
  it("converts classic bar mappings into the V2 renderer slots", () => {
    const fields = normalizeDashboardChartFields(apiFields);
    const slots = toDashboardMappingSlots({
      chartType: "bar",
      x: "month",
      y: "revenue",
      aggregation: "sum",
    }, fields);

    expect(slots.find((slot) => slot.id === "xAxis")?.fields[0]).toMatchObject({
      id: "month",
      type: "text",
      isDimension: true,
    });
    expect(slots.find((slot) => slot.id === "yAxis")).toMatchObject({
      aggregation: "Sum",
      fields: [expect.objectContaining({ id: "revenue", type: "number", isMeasure: true })],
    });
  });

  it("maps pie and donut category/value fields", () => {
    const fields = normalizeDashboardChartFields(apiFields);

    for (const chartType of ["pie", "donut"]) {
      const slots = toDashboardMappingSlots({
        chartType,
        mappings: { category: "month", value: "revenue" },
      }, fields);

      expect(slots.find((slot) => slot.id === "category")?.fields[0]?.id).toBe("month");
      expect(slots.find((slot) => slot.id === "value")?.fields[0]?.id).toBe("revenue");
    }
  });

  it("maps Chart.js label/value fields for a persisted donut", () => {
    const fields = normalizeDashboardChartFields([
      { name: "year", dataType: "integer" },
      { name: "cited_by_count", dataType: "integer" },
    ]);
    const slots = toDashboardMappingSlots({
      chartType: "donut",
      mappings: { label: "year", value: "cited_by_count" },
    }, fields);

    expect(slots.find((slot) => slot.id === "category")?.fields[0]?.id).toBe("year");
    expect(slots.find((slot) => slot.id === "value")?.fields[0]?.id).toBe("cited_by_count");
  });

  it("preserves native V2 mapping slots", () => {
    const fields = normalizeDashboardChartFields(apiFields);
    const native = [{
      id: "xAxis",
      label: "X Axis",
      helper: "",
      fields: [fields[0]],
      aggregation: "None",
    }];

    expect(toDashboardMappingSlots({ chartType: "bar", mappings: native }, fields)).toBe(native);
  });
});
