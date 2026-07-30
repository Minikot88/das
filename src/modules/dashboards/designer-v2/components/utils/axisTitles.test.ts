import { describe, expect, it } from "vitest";
import type { DataField } from "@modules/dashboards/designer-v2/components/types";
import {
  axisTitleFor,
  mappingRecommendationFor,
  preferredAggregationFor,
  resolvedAxisTitle,
} from "@modules/dashboards/designer-v2/components/utils/axisTitles";

function field(overrides: Partial<DataField> = {}): DataField {
  return {
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
    ...overrides,
  };
}

describe("axis titles", () => {
  it.each([
    [field(), "None", "เมือง"],
    [field({ id: "publication_year", name: "publication_year", label: "publication_year", type: "date", semanticType: "year" }), "None", "ปีที่เผยแพร่"],
    [field({ id: "id", name: "id", label: "id", type: "number", isMeasure: true, isDimension: false }), "Count", "จำนวนรายการ"],
    [field({ id: "sales", name: "sales", label: "sales", type: "number", isMeasure: true, isDimension: false }), "Sum", "ยอดขายรวม"],
    [field({ id: "profit", name: "profit", label: "profit", type: "number", isMeasure: true, isDimension: false }), "Average", "กำไรเฉลี่ย"],
  ] as const)("derives an auto title from field and aggregation", (input, aggregation, expected) => {
    expect(axisTitleFor(input, aggregation)).toBe(expected);
  });

  it("uses the field name when API field ids are opaque", () => {
    expect(axisTitleFor(field({ id: "field-city", name: "city", label: "city" }), "None")).toBe("เมือง");
  });

  it("recommends Count for primary-key-like ID fields", () => {
    const identifier = field({ id: "id", name: "id", label: "id", type: "number", isMeasure: true, isDimension: false });
    expect(preferredAggregationFor(identifier)).toBe("Count");
    expect(mappingRecommendationFor(identifier)).toEqual(expect.objectContaining({ slotId: "yAxis", aggregation: "Count" }));
  });

  it("preserves a custom title when the mapped field changes", () => {
    const custom = { titleMode: "custom" as const, customTitle: "จำนวนสถาบัน" };
    expect(resolvedAxisTitle(custom, field(), "None")).toBe("จำนวนสถาบัน");
    expect(resolvedAxisTitle(custom, field({ id: "country", name: "country", label: "ประเทศ" }), "None")).toBe("จำนวนสถาบัน");
  });

  it("returns to the current auto title after reset", () => {
    expect(resolvedAxisTitle({ titleMode: "auto", customTitle: "ชื่อเก่า" }, field(), "None")).toBe("เมือง");
  });

  it("updates an automatic title when aggregation changes", () => {
    const sales = field({ id: "sales", name: "sales", label: "sales", type: "number", isMeasure: true, isDimension: false });
    expect(resolvedAxisTitle({ titleMode: "auto", customTitle: "" }, sales, "Sum")).toBe("ยอดขายรวม");
    expect(resolvedAxisTitle({ titleMode: "auto", customTitle: "" }, sales, "Average")).toBe("ยอดขายเฉลี่ย");
  });

  it.each([
    [field(), "xAxis"],
    [field({ type: "date", semanticType: "date" }), "xAxis"],
    [field({ type: "number", isMeasure: true, isDimension: false }), "yAxis"],
    [field({ type: "boolean", semanticType: "boolean" }), "legend"],
  ] as const)("returns a type-aware mapping recommendation", (input, expected) => {
    expect(mappingRecommendationFor(input).slotId).toBe(expected);
  });
});
