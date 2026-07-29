const NUMERIC_TYPES = new Set([
  "bigint",
  "decimal",
  "double",
  "float",
  "int",
  "integer",
  "number",
  "numeric",
  "real",
  "smallint",
]);

const DATE_TYPES = new Set(["date", "datetime", "timestamp", "timestamptz"]);

function normalizeFieldType(value) {
  const type = String(value || "text").toLowerCase();
  if (NUMERIC_TYPES.has(type)) return "number";
  if (DATE_TYPES.has(type)) return "date";
  if (type === "bool" || type === "boolean") return "boolean";
  return "text";
}

function titleCaseAggregation(value, fallback = "None") {
  const normalized = String(value || fallback).trim().toLowerCase();
  const names = {
    avg: "Average",
    average: "Average",
    count: "Count",
    "count distinct": "Count Distinct",
    count_distinct: "Count Distinct",
    first: "First",
    last: "Last",
    max: "Max",
    median: "Median",
    min: "Min",
    none: "None",
    sum: "Sum",
  };
  return names[normalized] || fallback;
}

export function normalizeDashboardChartFields(fields = []) {
  return fields.map((field) => {
    const id = String(field?.id || field?.name || field?.field || "");
    const type = normalizeFieldType(field?.type || field?.dataType);
    const isMeasure = typeof field?.isMeasure === "boolean" ? field.isMeasure : type === "number";
    return {
      ...field,
      id,
      name: String(field?.name || field?.label || id),
      label: String(field?.label || field?.name || id),
      type,
      semanticType: field?.semanticType || (type === "date" ? "date" : isMeasure ? "quantity" : "category"),
      table: String(field?.table || ""),
      description: String(field?.description || ""),
      sampleValues: Array.isArray(field?.sampleValues) ? field.sampleValues : [],
      isMeasure,
      isDimension: typeof field?.isDimension === "boolean" ? field.isDimension : !isMeasure,
      defaultAggregation: titleCaseAggregation(field?.defaultAggregation, isMeasure ? "Sum" : "None"),
    };
  }).filter((field) => field.id);
}

function findField(fields, reference) {
  if (reference && typeof reference === "object") {
    reference = reference.id || reference.name || reference.field;
  }
  const key = String(reference || "");
  return fields.find((field) => field.id === key || field.name === key || field.label === key);
}

function slot(id, label, field, aggregation = "None") {
  return {
    id,
    label,
    helper: "",
    fields: field ? [field] : [],
    aggregation,
  };
}

export function toDashboardMappingSlots(config = {}, fields = []) {
  if (Array.isArray(config.mappings)) return config.mappings;

  const mapping = config.mapping && typeof config.mapping === "object"
    ? config.mapping
    : config.mappings && typeof config.mappings === "object"
      ? config.mappings
      : {};
  const chartType = String(config.chartType || config.type || "bar")
    .toLowerCase()
    .replace(/^chart-type-/, "");
  const xField = findField(fields, config.x || mapping.x || mapping.xAxis || mapping.dimension || mapping.category);
  const yField = findField(fields, config.y || mapping.y || mapping.yAxis || mapping.measure || mapping.value);
  const groupField = findField(fields, config.groupBy || mapping.groupBy || mapping.legend || mapping.series);
  const aggregation = titleCaseAggregation(config.aggregation || mapping.aggregation, "Sum");

  if (chartType === "pie" || chartType === "donut") {
    return [
      slot("category", "Category", findField(fields, mapping.category) || xField),
      slot("value", "Value", findField(fields, mapping.value) || yField, aggregation),
      slot("legend", "Legend", groupField),
    ];
  }

  if (chartType === "table") {
    const selected = [xField, yField, groupField].filter(Boolean);
    return [{ id: "columns", label: "Columns", helper: "", fields: selected, aggregation: "None" }];
  }

  return [
    slot("xAxis", "X Axis", xField),
    slot("yAxis", "Y Axis", yField, aggregation),
    slot("legend", "Legend", groupField),
  ];
}
