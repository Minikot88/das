import type { Aggregation, MappingSlot } from "../types";

const measureSlotIds: MappingSlot["id"][] = ["yAxis", "value", "size", "color", "open", "high", "low", "close"];
const numberAggregations: Aggregation[] = ["Sum", "Average", "Min", "Max", "Median", "Count", "Count Distinct", "First", "Last"];
const dimensionAggregations: Aggregation[] = ["None", "Count"];

export function getAggregationOptions(slot: MappingSlot): Aggregation[] {
  if (!measureSlotIds.includes(slot.id)) return dimensionAggregations;
  const firstField = slot.fields[0];
  if (firstField?.isPrimaryKey || firstField?.semanticType === "identifier") return ["Count", "Count Distinct"];
  if (!firstField || firstField.type === "number" || firstField.type === "currency" || firstField.type === "percentage" || firstField.isMeasure) return numberAggregations;
  return ["Count"];
}
