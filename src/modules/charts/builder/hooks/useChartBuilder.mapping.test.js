import { describe, expect, it } from "vitest";
import { suggestVisualMapping } from "@modules/charts/builder/hooks/useChartBuilder";

const template = {
  roles: [
    { key: "x", accepts: ["category", "date"], multiple: false },
    { key: "y", accepts: ["number"], multiple: false },
  ],
};

describe("suggestVisualMapping", () => {
  it("maps a text or date field to X and a numeric field to Y", () => {
    expect(suggestVisualMapping(template, { fields: [
      { name: "publication_year", type: "date" },
      { name: "cited_by_count", type: "number" },
    ] })).toEqual({ x: "publication_year", y: "cited_by_count" });
  });

  it("preserves a valid user field mapping", () => {
    expect(suggestVisualMapping(template, { fields: [
      { name: "journal", type: "string" },
      { name: "article_count", type: "number" },
    ] }, { x: "journal", y: "article_count" })).toEqual({ x: "journal", y: "article_count" });
  });
});
