import { describe, expect, it } from "vitest";
import {
  applyDashboardFiltersToWidget,
  getInteractionChips,
  getNextDrilldownStep,
  resolveInteractionPoint,
} from "./dashboardFilters";

const rows = [
  { id: 1, date: "2026-01-01", year: "2026", category: "Technology", subcategory: "Phones", region: "North", sales: 120 },
  { id: 2, date: "2026-01-02", year: "2026", category: "Furniture", subcategory: "Chairs", region: "South", sales: 80 },
  { id: 3, date: "2025-12-31", year: "2025", category: "Technology", subcategory: "Laptops", region: "North", sales: 90 },
];

describe("dashboard filter utilities", () => {
  it("applies global filters and cross filtering to widget rows", () => {
    const widget = { id: "w1", rows, mapping: { x: "category" } };
    const result = applyDashboardFiltersToWidget(
      widget,
      { dateRange: "All dates", department: "Technology", region: "North", year: "2026" },
      { crossFilter: { field: "subcategory", value: "Phones" }, drilldown: { path: [] } }
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].sales).toBe(120);
    expect(result.filterMeta.filteredRowCount).toBe(1);
  });

  it("resolves chart data points and drilldown chips", () => {
    const point = resolveInteractionPoint({ rows, mapping: { x: "category" } }, { label: "Technology" });
    expect(point).toEqual({ field: "category", value: "Technology" });
    expect(getNextDrilldownStep([], point)).toEqual(point);
    expect(getInteractionChips({ crossFilter: point, drilldown: { path: [point] } })).toHaveLength(2);
  });
});
