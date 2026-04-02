import { normalizeChartConfig } from "../../utils/normalizeChartConfig";

export const SLOT_KEY_MAP = {
  x: ["xField", "xType"],
  y: ["yField", "yType"],
  group: ["groupField", null],
  size: ["sizeField", "sizeType"],
};

export function getSlotValue(builderState, slotKey) {
  switch (slotKey) {
    case "x":
      return { field: builderState.xField, type: builderState.xType };
    case "y":
      return { field: builderState.yField, type: builderState.yType };
    case "group":
      return { field: builderState.groupField, type: null };
    case "size":
      return { field: builderState.sizeField, type: builderState.sizeType };
    default:
      return { field: null, type: null };
  }
}

export function clearBuilderMappings() {
  return {
    xField: null,
    xType: null,
    yField: null,
    yType: null,
    groupField: null,
    sizeField: null,
    sizeType: null,
    roleMapping: {},
  };
}

export function createBuilderQueryInput(builderState) {
  return {
    dataset: builderState.selectedTable,
    x: builderState.xField,
    y: builderState.yField,
    groupBy: builderState.groupField,
    sizeField: builderState.sizeField,
    aggregate: builderState.aggregation,
    chartType: builderState.chartType,
  };
}

export function hasPreviewableFields(chartSlots, builderState) {
  return chartSlots.some((slot) => getSlotValue(builderState, slot.key).field);
}

export function findFieldInSchema(schema, fieldName) {
  for (const [db, tables] of Object.entries(schema)) {
    for (const [tbl, info] of Object.entries(tables)) {
      const field = info.fields.find((item) => item.name === fieldName);
      if (field) {
        return { db, tbl, field };
      }
    }
  }
  return null;
}

export function resolveFieldMeta({ fieldName, explicitType = null, tableFields = [], schema }) {
  if (!fieldName) return null;

  return tableFields.find((item) => item.name === fieldName)
    ?? (explicitType ? { name: fieldName, type: explicitType } : null)
    ?? findFieldInSchema(schema, fieldName)?.field
    ?? null;
}

export function createSlotAssignments({ builderState, chartSlots, tableFields, schema }) {
  return chartSlots.map((slot) => {
    const current = getSlotValue(builderState, slot.key);
    const meta = resolveFieldMeta({
      fieldName: current.field,
      explicitType: current.type,
      tableFields,
      schema,
    });

    return {
      ...slot,
      field: current.field,
      fieldType: current.type ?? meta?.type ?? null,
      meta,
    };
  });
}

export function createValidationSummary(chartValidation, selectedTable) {
  const blockers = [...(chartValidation.blockers ?? [])];
  const cautions = [...(chartValidation.cautions ?? [])];

  if (!selectedTable) {
    blockers.unshift({
      level: "error",
      code: "missing-table",
      title: "Select a table",
      message: "Choose a data source table before saving so the chart has a dataset to query.",
      action: "Pick a table from the data explorer, then map the required fields.",
    });
  }

  let nextStep = "Ready to save.";
  if (blockers.length) {
    nextStep = blockers[0].action ?? blockers[0].message;
  } else if (cautions.length) {
    nextStep = cautions[0].action ?? cautions[0].message;
  }

  return { blockers, cautions, nextStep };
}

export function createReadinessLabel({ saveSuccess, canAddChart, cautionCount }) {
  if (saveSuccess) return "Saved";
  if (!canAddChart) return "Needs mapping";
  return cautionCount ? "Ready with guidance" : "Ready";
}

export function createBuilderSaveConfig({ builderState, selectedTable, activeChartMeta }) {
  return normalizeChartConfig({
    ...createBuilderQueryInput(builderState),
    xType: builderState.xType,
    yType: builderState.yType,
    sizeType: builderState.sizeType,
    roleMapping: builderState.roleMapping ?? {},
    name:
      builderState.name.trim()
      || builderState.title.trim()
      || `${selectedTable} ${activeChartMeta?.label ?? "Chart"}`,
    title:
      builderState.title.trim()
      || `${activeChartMeta?.label ?? "Chart"} from ${selectedTable}`,
    subtitle: builderState.subtitle?.trim?.() ?? "",
    colorTheme: builderState.colorTheme ?? "default",
    legendVisible: builderState.legendVisible,
    showGrid: builderState.showGrid,
    showLabels: builderState.showLabels,
    smooth: builderState.smooth,
    xLabel: builderState.xLabel ?? "",
    yLabel: builderState.yLabel ?? "",
    queryMode: builderState.queryMode ?? "visual",
    generatedSql: builderState.generatedSql ?? "",
    customSql: builderState.customSql ?? "",
    lastExecutedSql: builderState.lastExecutedSql ?? "",
    queryResult: builderState.queryResult ?? null,
    queryError: builderState.queryError ?? "",
    queryStatus: builderState.queryStatus ?? "idle",
    isDirtySql: builderState.isDirtySql ?? false,
    lastRunAt: builderState.lastRunAt ?? "",
  });
}
