import type { FilterValue } from "@modules/dashboards/designer-v2/components/types";

export function isActiveFilter(filter: FilterValue) {
  if ("values" in filter) return filter.values.length > 0;
  if ("min" in filter) return filter.min !== "" || filter.max !== "";
  return filter.start !== "" || filter.end !== "";
}

export function countActiveFilters(filters: Record<string, FilterValue>) {
  return Object.values(filters).filter(isActiveFilter).length;
}
