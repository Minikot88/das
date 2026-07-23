import type { Aggregation, DataField } from "@modules/dashboards/designer-v2/components/types";

export type DataRecord = Record<string, string | number | boolean | undefined>;

export function toNumber(value: string | number | boolean | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "boolean") return value ? 1 : 0;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function toText(value: string | number | boolean | undefined) {
  if (value === undefined || value === null) return "";
  return String(value);
}

export function isNumericField(field?: DataField) {
  return Boolean(field && (field.type === "number" || field.type === "currency" || field.type === "percentage" || field.isMeasure));
}

export function aggregateValues(values: Array<string | number | boolean | undefined>, aggregation: Aggregation = "Sum") {
  const presentValues = values.filter((value) => value !== undefined && value !== "");

  if (aggregation === "None") return presentValues.length ? toNumber(presentValues[0]) : 0;
  if (aggregation === "Count") return presentValues.length;
  if (aggregation === "Count Distinct") return new Set(presentValues.map(toText)).size;
  if (aggregation === "First") return presentValues.length ? toNumber(presentValues[0]) : 0;
  if (aggregation === "Last") return presentValues.length ? toNumber(presentValues[presentValues.length - 1]) : 0;

  const numericValues = presentValues.map(toNumber).filter((value) => Number.isFinite(value));
  if (!numericValues.length) return 0;

  if (aggregation === "Average") {
    return numericValues.reduce((total, value) => total + value, 0) / numericValues.length;
  }
  if (aggregation === "Min") return Math.min(...numericValues);
  if (aggregation === "Max") return Math.max(...numericValues);
  if (aggregation === "Median") {
    const sorted = [...numericValues].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  return numericValues.reduce((total, value) => total + value, 0);
}

export function aggregateRows(rows: DataRecord[], field: DataField | undefined, aggregation: Aggregation = "Sum") {
  if (!field) return 0;
  return aggregateValues(rows.map((row) => row[field.id]), aggregation);
}

export function groupByRows<T extends DataRecord>(rows: T[], field: DataField | undefined) {
  const grouped = new Map<string, T[]>();
  rows.forEach((row) => {
    const key = field ? toText(row[field.id]) || "ไม่ระบุ" : "ทั้งหมด";
    const bucket = grouped.get(key) ?? [];
    bucket.push(row);
    grouped.set(key, bucket);
  });
  return grouped;
}

export function uniqueFields(fields: Array<DataField | undefined>) {
  const seen = new Set<string>();
  return fields.filter((field): field is DataField => {
    if (!field || seen.has(field.id)) return false;
    seen.add(field.id);
    return true;
  });
}
