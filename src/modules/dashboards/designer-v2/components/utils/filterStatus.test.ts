import { describe, expect, it } from "vitest";
import { countActiveFilters } from "@modules/dashboards/designer-v2/components/utils/filterStatus";

describe("active filter count", () => {
  it("counts only filters that actually constrain Preview rows", () => {
    expect(countActiveFilters({
      city: { type: "text", values: ["Bangkok"] },
      emptyText: { type: "text", values: [] },
      year: { type: "number", min: 2020, max: "" },
      emptyRange: { type: "number", min: "", max: "" },
      date: { type: "date", start: "", end: "2026-07-30" },
    })).toBe(3);
  });
});
