import { describe, expect, it } from "vitest";
import { createDefaultConfig } from "@modules/dashboards/designer-v2/components/mockData";
import type { DataField } from "@modules/dashboards/designer-v2/components/types";
import {
  validateAggregationForField,
  validateChartConfig,
  validateFieldForSlot,
} from "@modules/dashboards/designer-v2/components/utils/chartValidation";

const city: DataField = {
  id: "city",
  name: "city",
  label: "city",
  type: "text",
  semanticType: "category",
  table: "scopus.sc_affiliations",
  description: "",
  sampleValues: [],
  isMeasure: false,
  isDimension: true,
  defaultAggregation: "None",
};

const id: DataField = {
  ...city,
  id: "id",
  name: "id",
  label: "id",
  type: "number",
  semanticType: "quantity",
  isMeasure: true,
  isDimension: false,
  defaultAggregation: "Count",
};

describe("mapping validation guidance", () => {
  it("rejects Sum for a text field with field, table, type and slot context", () => {
    const result = validateAggregationForField(city, "Sum", "yAxis");
    expect(result.valid).toBe(false);
    expect(result.message).toContain("`city`");
    expect(result.message).toContain("scopus.sc_affiliations");
    expect(result.message).toContain("ข้อความ");
    expect(result.message).toContain("Y Axis");
    expect(result.message).toContain("Sum");
  });

  it("recommends Count instead of Sum for an ID field", () => {
    const result = validateAggregationForField(id, "Sum", "yAxis");
    expect(result.valid).toBe(false);
    expect(result.message).toContain("Primary Key/ID");
    expect(result.message).toContain("Count");
  });

  it("allows a text primary key in countable Y and Value slots", () => {
    const textId = { ...city, id: "id", name: "id", label: "id", isPrimaryKey: true, defaultAggregation: "Count" as const };
    expect(validateFieldForSlot("yAxis", textId, "bar")).toBe(true);
    expect(validateFieldForSlot("value", textId, "pie")).toBe(true);
  });

  it.each(["pie", "donut"] as const)("describes axisless chart requirements as Category and Value for %s", (chartType) => {
    const config = createDefaultConfig();
    config.chartType = chartType;
    config.mappings = config.mappings.map((slot) => ({ ...slot, fields: [] }));
    const result = validateChartConfig(config);
    expect(result.valid).toBe(false);
    expect(result.requirements.join(" ")).toContain("Category");
    expect(result.requirements.join(" ")).toContain("Value");
    expect(result.requirements.join(" ")).not.toContain("Axis");
  });
});
