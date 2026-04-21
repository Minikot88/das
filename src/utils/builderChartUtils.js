import { getChartMeta, resolveChartRuntimeType } from "./chartCatalog";
import { getChartRequirements } from "./chartRequirements";
import { getLineAreaMappingMode } from "./builderMappingUtils";

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function hasRenderableValue(value) {
  return value !== null && value !== undefined && value !== "";
}

function isFiniteNumber(value) {
  return Number.isFinite(Number(value));
}

function getMappedFieldNames(roleMapping = {}, roleKey) {
  return ensureArray(roleMapping[roleKey]).map((field) => field?.name).filter(Boolean);
}

function getRoleValue(row, roleMapping, roleKey) {
  const fieldName = getMappedFieldNames(roleMapping, roleKey)[0];
  return fieldName ? row?.[fieldName] : undefined;
}

function getRoleValues(row, roleMapping, roleKey) {
  return getMappedFieldNames(roleMapping, roleKey).map((fieldName) => row?.[fieldName]);
}

function hasAnyRoleValue(row, roleMapping, roleKey) {
  return getRoleValues(row, roleMapping, roleKey).some(hasRenderableValue);
}

function hasAnyNumericRoleValue(row, roleMapping, roleKey) {
  return getRoleValues(row, roleMapping, roleKey).some(isFiniteNumber);
}

function getLineAreaPreviewReason(chartId, roleMapping = {}, rows = []) {
  const mode = getLineAreaMappingMode(chartId, roleMapping);
  if (mode.blockers.length) return mode.blockers[0].message;

  if (mode.mode === "multi-measure") {
    const hasUsableMeasure = ensureArray(rows).some((row) => hasAnyNumericRoleValue(row, roleMapping, "ys"));
    if (!hasUsableMeasure) {
      return "Rows exist, but the selected Y Measures do not contain usable numeric values for this chart.";
    }
  }

  if (mode.mode === "grouped-series") {
    const hasUsableValue = ensureArray(rows).some((row) => hasAnyNumericRoleValue(row, roleMapping, "y"));
    if (!hasUsableValue) {
      return "Rows exist, but the selected Y Axis field does not contain usable numeric values for this chart.";
    }
  }

  return "Rows exist, but the mapped fields do not contain usable values for this line or area chart.";
}

function countUsableRows(chartId, roleMapping = {}, rows = []) {
  const runtimeType = resolveChartRuntimeType(chartId);
  const lineAreaMode = getLineAreaMappingMode(chartId, roleMapping);

  if (lineAreaMode.blockers.length) return 0;

  return ensureArray(rows).filter((row) => {
    switch (runtimeType) {
      case "line":
      case "multi-line":
      case "smooth-line":
      case "step-line":
      case "area":
      case "stacked-line":
      case "stacked-area":
      case "bar":
      case "grouped-bar":
      case "stacked-bar":
      case "horizontal-bar":
      case "waterfall":
      case "bar-racing":
      case "pictorial-bar":
      case "pie":
      case "donut":
      case "rose":
      case "radar":
      case "funnel":
      case "histogram":
      case "table":
      case "pivot-table":
        if (["line", "multi-line", "smooth-line", "step-line", "area", "stacked-line", "stacked-area"].includes(runtimeType)) {
          const hasDomain = hasAnyRoleValue(row, roleMapping, "x")
            || hasAnyRoleValue(row, roleMapping, "category")
            || hasAnyRoleValue(row, roleMapping, "time")
            || hasAnyRoleValue(row, roleMapping, "date");
          if (!hasDomain) return false;
          if (lineAreaMode.mode === "multi-measure") {
            return hasAnyNumericRoleValue(row, roleMapping, "ys");
          }
          return hasAnyNumericRoleValue(row, roleMapping, "y");
        }
        return (
          (hasAnyRoleValue(row, roleMapping, "x")
            || hasAnyRoleValue(row, roleMapping, "category")
            || hasAnyRoleValue(row, roleMapping, "time")
            || hasAnyRoleValue(row, roleMapping, "date")
            || hasAnyRoleValue(row, roleMapping, "row")
            || hasAnyRoleValue(row, roleMapping, "column"))
          && (hasAnyNumericRoleValue(row, roleMapping, "y")
            || hasAnyNumericRoleValue(row, roleMapping, "value")
            || hasAnyNumericRoleValue(row, roleMapping, "values")
            || hasAnyNumericRoleValue(row, roleMapping, "ys"))
        );
      case "scatter":
      case "effect-scatter":
        return isFiniteNumber(getRoleValue(row, roleMapping, "x")) && isFiniteNumber(getRoleValue(row, roleMapping, "y"));
      case "bubble":
        return isFiniteNumber(getRoleValue(row, roleMapping, "x"))
          && isFiniteNumber(getRoleValue(row, roleMapping, "y"))
          && isFiniteNumber(getRoleValue(row, roleMapping, "size"));
      case "heatmap":
      case "matrix":
        return hasAnyRoleValue(row, roleMapping, "column")
          && hasAnyRoleValue(row, roleMapping, "row")
          && hasAnyNumericRoleValue(row, roleMapping, "value");
      case "treemap":
      case "sunburst":
        return hasAnyRoleValue(row, roleMapping, "hierarchy") && hasAnyNumericRoleValue(row, roleMapping, "value");
      case "tree":
        return hasAnyRoleValue(row, roleMapping, "hierarchy");
      case "sankey":
        return hasAnyRoleValue(row, roleMapping, "source")
          && hasAnyRoleValue(row, roleMapping, "target")
          && hasAnyNumericRoleValue(row, roleMapping, "value");
      case "theme-river":
        return hasAnyRoleValue(row, roleMapping, "time")
          && hasAnyRoleValue(row, roleMapping, "series")
          && hasAnyNumericRoleValue(row, roleMapping, "value");
      case "calendar":
        return hasAnyRoleValue(row, roleMapping, "date") && hasAnyNumericRoleValue(row, roleMapping, "value");
      case "lines":
        return hasAnyRoleValue(row, roleMapping, "geoFrom") && hasAnyRoleValue(row, roleMapping, "geoTo");
      case "graph":
        return hasAnyRoleValue(row, roleMapping, "source") && hasAnyRoleValue(row, roleMapping, "target");
      case "boxplot": {
        const hasQuartiles = ["min", "q1", "median", "q3", "max"].every((roleKey) => hasAnyNumericRoleValue(row, roleMapping, roleKey));
        return (hasAnyRoleValue(row, roleMapping, "category") || !getMappedFieldNames(roleMapping, "category").length)
          && (hasAnyNumericRoleValue(row, roleMapping, "value") || hasQuartiles);
      }
      case "parallel": {
        const numericCount = getRoleValues(row, roleMapping, "dimensions").filter(isFiniteNumber).length;
        return numericCount >= 2;
      }
      case "candlestick":
        return hasAnyRoleValue(row, roleMapping, "time")
          && isFiniteNumber(getRoleValue(row, roleMapping, "open"))
          && isFiniteNumber(getRoleValue(row, roleMapping, "close"))
          && isFiniteNumber(getRoleValue(row, roleMapping, "low"))
          && isFiniteNumber(getRoleValue(row, roleMapping, "high"));
      case "gauge":
      case "progress-ring":
      case "kpi":
        return hasAnyNumericRoleValue(row, roleMapping, "progress") || hasAnyNumericRoleValue(row, roleMapping, "value");
      case "map":
        return hasAnyRoleValue(row, roleMapping, "region") && hasAnyNumericRoleValue(row, roleMapping, "value");
      case "custom":
        return Object.values(roleMapping).some((fields) =>
          ensureArray(fields).some((field) => hasRenderableValue(row?.[field?.name]))
        );
      default:
        return Object.values(roleMapping).some((fields) =>
          ensureArray(fields).some((field) => hasRenderableValue(row?.[field?.name]))
        );
    }
  }).length;
}

function getEmptyReason(chartId) {
  const runtimeType = resolveChartRuntimeType(chartId);
  const reasonByType = {
    scatter: "Rows exist, but the mapped X and Y fields do not contain usable numeric values.",
    "effect-scatter": "Rows exist, but the mapped X and Y fields do not contain usable numeric values.",
    bubble: "Rows exist, but the mapped X, Y, and Size fields do not contain usable numeric values.",
    heatmap: "Rows exist, but the mapped row, column, and value fields do not form a usable heatmap.",
    matrix: "Rows exist, but the mapped row, column, and value fields do not form a usable matrix.",
    treemap: "Rows exist, but the mapped hierarchy and value fields do not contain usable hierarchy data.",
    sunburst: "Rows exist, but the mapped hierarchy and value fields do not contain usable hierarchy data.",
    tree: "Rows exist, but the mapped hierarchy fields do not contain usable hierarchy values.",
    sankey: "Rows exist, but the mapped source, target, and value fields do not form usable links.",
    graph: "Rows exist, but the mapped source and target fields do not form usable relationships.",
    parallel: "Rows exist, but fewer than two mapped numeric dimensions contain usable values.",
    candlestick: "Rows exist, but the mapped time/open/high/low/close fields are incomplete.",
    gauge: "Rows exist, but the mapped value field does not contain a usable metric.",
    "progress-ring": "Rows exist, but the mapped progress field does not contain a usable metric.",
    map: "Rows exist, but the mapped region and value fields do not contain usable map values.",
  };

  return reasonByType[runtimeType] ?? "Rows exist, but the mapped fields do not contain usable values for this chart.";
}

function getFieldTypeFromRows(rows = [], fieldName) {
  if (!fieldName) return null;

  for (const row of ensureArray(rows)) {
    const value = row?.[fieldName];
    if (!hasRenderableValue(value)) continue;
    if (isFiniteNumber(value)) return "number";
    if (typeof value === "boolean") return "boolean";
    if (typeof value === "string" && /^\d{4}(-\d{2})?(-\d{2})?/.test(value)) return "date";
    return "string";
  }

  return null;
}

function getFieldRef(tableFields = [], rows = [], fieldName) {
  if (!fieldName) return null;
  const fromSchema = ensureArray(tableFields).find((field) => field?.name === fieldName);
  return {
    name: fieldName,
    type: fromSchema?.type ?? getFieldTypeFromRows(rows, fieldName) ?? null,
  };
}

function getMappedFieldRefs(roleMapping = {}, roleKeys = [], tableFields = [], rows = []) {
  return roleKeys
    .flatMap((roleKey) => ensureArray(roleMapping?.[roleKey]))
    .map((field) => {
      if (!field?.name) return null;
      return getFieldRef(tableFields, rows, field.name);
    })
    .filter(Boolean);
}

function uniqueFieldRefs(fields = []) {
  const seen = new Set();
  return fields.filter((field) => {
    if (!field?.name || seen.has(field.name)) return false;
    seen.add(field.name);
    return true;
  });
}

function isCategoryLikeField(field) {
  return Boolean(field) && field.type !== "number";
}

function isNumericField(field) {
  return Boolean(field) && field.type === "number";
}

function getAvailableFieldRefs(rows = [], tableFields = []) {
  const schemaFields = ensureArray(tableFields)
    .filter((field) => field?.name)
    .map((field) => ({
      name: field.name,
      type: field.type ?? getFieldTypeFromRows(rows, field.name) ?? null,
    }));
  const rowFields = uniqueFieldRefs(
    ensureArray(rows).flatMap((row) =>
      Object.keys(row ?? {}).map((fieldName) => getFieldRef(tableFields, rows, fieldName))
    )
  );

  return uniqueFieldRefs([...schemaFields, ...rowFields]);
}

function isTimeLikeField(field) {
  if (!field?.name) return false;
  if (field.type === "date") return true;
  return /(^|_|-)(date|time|day|week|month|quarter|year)(_|-|$)/i.test(field.name);
}

function pickFirstField(fields = [], predicate = () => true, excludeNames = []) {
  const excluded = new Set(excludeNames.filter(Boolean));
  return fields.find((field) => field?.name && !excluded.has(field.name) && predicate(field)) ?? null;
}

const LINE_PREVIEW_TYPES = new Set([
  "line",
  "multi-line",
  "smooth-line",
  "step-line",
  "area",
  "stacked-line",
  "stacked-area",
]);

const BAR_PREVIEW_TYPES = new Set([
  "bar",
  "grouped-bar",
  "stacked-bar",
  "horizontal-bar",
  "waterfall",
  "bar-racing",
  "pictorial-bar",
  "histogram",
  "funnel",
  "radar",
  "pie",
  "donut",
  "rose",
  "gauge",
  "progress-ring",
  "table",
  "pivot-table",
  "treemap",
  "sunburst",
  "tree",
  "sankey",
  "graph",
  "parallel",
  "calendar",
  "theme-river",
  "map",
  "lines",
  "custom",
]);

const DIRECT_PREVIEW_RENDER_TYPES = new Set([
  "bar",
  "grouped-bar",
  "stacked-bar",
  "horizontal-bar",
  "line",
  "multi-line",
  "smooth-line",
  "step-line",
  "area",
  "stacked-line",
  "stacked-area",
  "pie",
  "donut",
  "rose",
  "radar",
  "scatter",
  "effect-scatter",
  "bubble",
  "gauge",
  "progress-ring",
  "kpi",
  "table",
  "pivot-table",
]);

function getChartPreviewRuntimeType(chartId) {
  const chartMeta = getChartMeta(chartId);
  return chartMeta?.renderType ?? chartMeta?.chartId ?? resolveChartRuntimeType(chartId);
}

function getPreviewSourceType(chartId) {
  const chartMeta = getChartMeta(chartId);
  return chartMeta?.chartId ?? chartId;
}

function getPreviewFallbackLabel(chartType) {
  const labels = {
    line: "basic line",
    "multi-line": "multi-line",
    bar: "bar",
    "grouped-bar": "grouped bar",
    scatter: "scatter",
  };

  return labels[chartType] ?? getChartMeta(chartType)?.name?.toLowerCase() ?? chartType;
}

function hasSeriesPreviewShape(roleMapping = {}, inferredFields = {}) {
  return Boolean(inferredFields.seriesField)
    || getMappedFieldNames(roleMapping, "series").length > 0
    || getMappedFieldNames(roleMapping, "group").length > 0
    || getMappedFieldNames(roleMapping, "detail").length > 0
    || getMappedFieldNames(roleMapping, "values").length > 1
    || getMappedFieldNames(roleMapping, "ys").length > 1;
}

export function inferPreviewFields(rows = [], tableFields = [], roleMapping = {}) {
  const safeRows = ensureArray(rows);
  const availableFields = getAvailableFieldRefs(safeRows, tableFields);
  const mappedDomainFields = getMappedFieldRefs(roleMapping, ["x", "category", "time", "date", "hierarchy", "source", "label", "row", "column"], tableFields, safeRows);
  const mappedValueFields = getMappedFieldRefs(roleMapping, ["y", "value", "values", "ys", "progress", "targetValue"], tableFields, safeRows);
  const mappedSeriesFields = getMappedFieldRefs(roleMapping, ["series", "detail", "target", "group"], tableFields, safeRows);
  const mappedSizeFields = getMappedFieldRefs(roleMapping, ["size"], tableFields, safeRows);

  const categoryLikeFields = availableFields.filter(isCategoryLikeField);
  const numericFields = availableFields.filter(isNumericField);

  const categoryField =
    pickFirstField(mappedDomainFields, () => true) ??
    pickFirstField(categoryLikeFields, () => true) ??
    pickFirstField(availableFields, () => true);

  const valueField =
    pickFirstField(mappedValueFields, isNumericField) ??
    pickFirstField(numericFields, () => true, [categoryField?.name]);

  const secondaryNumericField = pickFirstField(
    numericFields,
    () => true,
    [categoryField?.name, valueField?.name]
  );

  const seriesField =
    pickFirstField(mappedSeriesFields, isCategoryLikeField, [categoryField?.name]) ??
    pickFirstField(categoryLikeFields, () => true, [categoryField?.name]);

  const sizeField =
    pickFirstField(mappedSizeFields, isNumericField, [valueField?.name]) ??
    secondaryNumericField;

  return {
    categoryField,
    xField: categoryField ?? pickFirstField(availableFields, () => true),
    yField: valueField,
    valueField,
    seriesField,
    sizeField,
    numericXField: pickFirstField(numericFields, () => true),
    numericYField: pickFirstField(numericFields, () => true, [numericFields[0]?.name]),
  };
}

export function getPreviewFallbackType(chartId, inferredFields = {}, options = {}) {
  const runtimeType = options.runtimeType ?? getChartPreviewRuntimeType(chartId);
  const roleMapping = options.roleMapping ?? {};
  const hasSeries = options.hasSeries ?? hasSeriesPreviewShape(roleMapping, inferredFields);
  const defaultIsTimeDomain =
    isTimeLikeField(inferredFields.xField ?? inferredFields.categoryField)
    || getMappedFieldNames(roleMapping, "time").length > 0
    || getMappedFieldNames(roleMapping, "date").length > 0;
  const isTimeDomain = options.isTimeDomain ?? defaultIsTimeDomain;
  const defaultPrefersLineFallback =
    runtimeType === "lines"
    || getPreviewSourceType(chartId) === "map-lines";
  const prefersLineFallback = options.prefersLineFallback ?? defaultPrefersLineFallback;

  if (inferredFields.numericXField && inferredFields.numericYField && (!inferredFields.categoryField || runtimeType === "lines")) {
    return "scatter";
  }

  if (LINE_PREVIEW_TYPES.has(runtimeType) && inferredFields.xField && inferredFields.yField) {
    return hasSeries ? "multi-line" : "line";
  }

  if ((runtimeType === "scatter" || runtimeType === "effect-scatter") && inferredFields.numericXField && inferredFields.numericYField) {
    return "scatter";
  }

  if (runtimeType === "bubble" && inferredFields.numericXField && inferredFields.numericYField) {
    return "scatter";
  }

  if ((prefersLineFallback || isTimeDomain) && inferredFields.xField && inferredFields.yField) {
    return hasSeries ? "multi-line" : "line";
  }

  if (hasSeries && inferredFields.categoryField && inferredFields.valueField) {
    return prefersLineFallback ? "multi-line" : "grouped-bar";
  }

  if (BAR_PREVIEW_TYPES.has(runtimeType) && inferredFields.categoryField && inferredFields.valueField) {
    return "bar";
  }

  if (inferredFields.categoryField && inferredFields.valueField) {
    return prefersLineFallback || isTimeDomain ? "line" : "bar";
  }

  if (inferredFields.numericXField && inferredFields.numericYField) {
    return "scatter";
  }

  return null;
}

function createFallbackRoleMapping(fallbackType, inferredFields = {}) {
  const mapping = {};

  if (fallbackType === "line" || fallbackType === "multi-line") {
    mapping.x = inferredFields.xField ? [inferredFields.xField] : [];
    mapping.y = inferredFields.yField ? [inferredFields.yField] : [];
    mapping.ys = [];
    mapping.series = inferredFields.seriesField ? [inferredFields.seriesField] : [];
    return mapping;
  }

  if (fallbackType === "scatter") {
    mapping.x = inferredFields.numericXField ? [inferredFields.numericXField] : [];
    mapping.y = inferredFields.numericYField ? [inferredFields.numericYField] : [];
    mapping.size = inferredFields.sizeField ? [inferredFields.sizeField] : [];
    mapping.series = inferredFields.seriesField ? [inferredFields.seriesField] : [];
    return mapping;
  }

  mapping.category = inferredFields.categoryField ? [inferredFields.categoryField] : [];
  mapping.value = inferredFields.valueField ? [inferredFields.valueField] : [];
  mapping.values = [];
  mapping.series = inferredFields.seriesField ? [inferredFields.seriesField] : [];
  return mapping;
}

export function normalizePreviewChartType(inputType, rows = [], config = {}) {
  const roleMapping = config.roleMapping ?? config.mappings?.roleMapping ?? {};
  const tableFields = config.tableFields ?? [];
  const runtimeType = getChartPreviewRuntimeType(inputType);
  const sourceType = getPreviewSourceType(inputType);
  const inferredFields = inferPreviewFields(rows, tableFields, roleMapping);
  const hasSeries = hasSeriesPreviewShape(roleMapping, inferredFields);
  const isTimeDomain = isTimeLikeField(inferredFields.xField ?? inferredFields.categoryField)
    || getMappedFieldNames(roleMapping, "time").length > 0
    || getMappedFieldNames(roleMapping, "date").length > 0;

  if (DIRECT_PREVIEW_RENDER_TYPES.has(runtimeType)) {
    return {
      useFallback: false,
      chartType: runtimeType,
      runtimeType,
      sourceType,
      inferredFields,
      hasSeries,
      isTimeDomain,
      message: "",
    };
  }

  const fallbackType = getPreviewFallbackType(inputType, inferredFields, {
    runtimeType,
    roleMapping,
    hasSeries,
    isTimeDomain,
    prefersLineFallback: runtimeType === "lines" || sourceType === "map-lines",
  });

  if (!fallbackType) {
    return {
      useFallback: false,
      chartType: runtimeType,
      runtimeType,
      sourceType,
      inferredFields,
      hasSeries,
      isTimeDomain,
      message: "",
    };
  }

  return {
    useFallback: fallbackType !== runtimeType,
    chartType: fallbackType,
    runtimeType,
    sourceType,
    inferredFields,
    hasSeries,
    isTimeDomain,
    message: `Preview fallback applied: ${sourceType} -> ${getPreviewFallbackLabel(fallbackType)}.`,
  };
}

export function canRenderBasicPreview(rows = [], inferredFields = {}, chartId = "bar", options = {}) {
  const fallbackType = getPreviewFallbackType(chartId, inferredFields, options);
  if (!fallbackType) return false;

  const assessment = evaluatePreviewRows(
    fallbackType,
    createFallbackRoleMapping(fallbackType, inferredFields),
    rows
  );

  return assessment.canRender;
}

export function buildPreviewFallback({
  chartId,
  roleMapping = {},
  rows = [],
  tableFields = [],
} = {}) {
  const safeRows = ensureArray(rows);
  const currentAssessment = evaluatePreviewRows(chartId, roleMapping, safeRows);
  const previewTypeNormalization = normalizePreviewChartType(chartId, safeRows, {
    roleMapping,
    tableFields,
  });
  const inferredFields = previewTypeNormalization.inferredFields;
  const mappedValueField = getMappedFieldRefs(
    roleMapping,
    ["value", "y", "values", "ys", "progress"],
    tableFields,
    safeRows
  )[0] ?? null;

  if (!safeRows.length && !previewTypeNormalization.useFallback) {
    return {
      useFallback: false,
      currentAssessment,
      inferredFields,
      chartType: chartId,
      roleMapping,
      xField: inferredFields.xField?.name ?? null,
      yField: inferredFields.yField?.name ?? null,
      groupField: inferredFields.seriesField?.name ?? null,
      sizeField: inferredFields.sizeField?.name ?? null,
      message: "",
    };
  }

  const fallbackType = previewTypeNormalization.useFallback
    ? previewTypeNormalization.chartType
    : currentAssessment.canRender
      ? null
      : getPreviewFallbackType(chartId, inferredFields, {
          runtimeType: previewTypeNormalization.runtimeType,
          roleMapping,
          hasSeries: previewTypeNormalization.hasSeries,
          isTimeDomain: previewTypeNormalization.isTimeDomain,
          prefersLineFallback:
            previewTypeNormalization.runtimeType === "lines"
            || previewTypeNormalization.sourceType === "map-lines",
        });

  if (!fallbackType) {
    return {
      useFallback: false,
      currentAssessment,
      inferredFields,
      chartType: chartId,
      roleMapping,
      xField: inferredFields.xField?.name ?? null,
      yField: inferredFields.yField?.name ?? null,
      groupField: inferredFields.seriesField?.name ?? null,
      sizeField: inferredFields.sizeField?.name ?? null,
      message: "",
    };
  }

  const fallbackRoleMapping = createFallbackRoleMapping(fallbackType, inferredFields);
  const fallbackAssessment = evaluatePreviewRows(fallbackType, fallbackRoleMapping, safeRows);

  if (!fallbackAssessment.canRender) {
    return {
      useFallback: false,
      currentAssessment,
      inferredFields,
      chartType: chartId,
      roleMapping,
      xField: inferredFields.xField?.name ?? null,
      yField: inferredFields.yField?.name ?? null,
      groupField: inferredFields.seriesField?.name ?? null,
      sizeField: inferredFields.sizeField?.name ?? null,
      message: "",
    };
  }

  const fallbackMeta = getChartMeta(fallbackType);
  const fallbackMessage = previewTypeNormalization.useFallback
    ? previewTypeNormalization.message
    : mappedValueField && mappedValueField.type !== "number" && inferredFields.valueField?.name
      ? `Preview fallback applied: using numeric field "${inferredFields.valueField.name}" instead of "${mappedValueField.name}".`
      : `Preview fallback applied: ${previewTypeNormalization.sourceType} -> ${getPreviewFallbackLabel(fallbackMeta.id)}.`;

  return {
    useFallback: true,
    chartType: fallbackType,
    roleMapping: fallbackRoleMapping,
    currentAssessment,
    fallbackAssessment,
    inferredFields,
    xField:
      (fallbackType === "scatter" ? inferredFields.numericXField?.name : inferredFields.xField?.name)
      ?? null,
    yField:
      (fallbackType === "scatter" ? inferredFields.numericYField?.name : inferredFields.yField?.name)
      ?? null,
    groupField: inferredFields.seriesField?.name ?? null,
    sizeField: inferredFields.sizeField?.name ?? null,
    message: fallbackMessage,
  };
}

export function evaluatePreviewRows(chartId, roleMapping = {}, rows = []) {
  const safeRows = ensureArray(rows);
  const lineAreaMode = getLineAreaMappingMode(chartId, roleMapping);
  const usableRowCount = countUsableRows(chartId, roleMapping, safeRows);
  const emptyReason = lineAreaMode.blockers.length
    ? lineAreaMode.blockers[0].message
    : ["line", "multi-line", "smooth-line", "step-line", "area", "stacked-line", "stacked-area"].includes(resolveChartRuntimeType(chartId))
      ? getLineAreaPreviewReason(chartId, roleMapping, safeRows)
      : safeRows.length
        ? getEmptyReason(chartId)
        : "No rows returned for this chart.";

  return {
    rowCount: safeRows.length,
    usableRowCount,
    hasRows: safeRows.length > 0,
    canRender: usableRowCount > 0,
    emptyReason,
  };
}

export function getPreviewReadiness({
  chartId,
  chartMeta,
  roleMapping = {},
  validation = null,
  selectedTable = null,
  rows = [],
} = {}) {
  const blockers = [...(validation?.blockers ?? [])];
  const cautions = [...(validation?.cautions ?? [])];
  const requirements = getChartRequirements(chartId);
  const rowAssessment = evaluatePreviewRows(chartId, roleMapping, rows);

  if (!selectedTable) {
    blockers.unshift({
      level: "error",
      code: "missing-table",
      title: "Select a table",
      message: "Choose a data source before previewing this chart.",
      action: "Pick a table from the data explorer.",
    });
  }

  requirements.required.forEach((role) => {
    const mappedCount = getMappedFieldNames(roleMapping, role.key).length;
    if (mappedCount < role.min && !blockers.some((item) => item.code === `missing-${role.key}`)) {
      blockers.push({
        level: "error",
        code: `missing-${role.key}`,
        title: `${role.label} is required`,
        message: `${chartMeta?.name ?? "This chart"} needs ${role.label.toLowerCase()} before it can render.`,
        action: role.emptyHint,
      });
    }
  });

  if ((chartMeta?.previewSupported ?? true) === false) {
    cautions.push({
      level: "warning",
      code: "preview-unavailable",
      title: "Preview not available",
      message: chartMeta?.disabledReason || "This chart needs additional runtime setup before preview can render.",
      action: "Finish the required setup or switch to a preview-ready chart.",
    });
  }

  const canAttemptPreview = blockers.length === 0 && (chartMeta?.previewSupported ?? true) !== false;
  const shouldRender = canAttemptPreview && (!rowAssessment.hasRows || rowAssessment.canRender);
  const message = !selectedTable
    ? "Select a table."
    : blockers[0]?.title
      ?? (rowAssessment.hasRows && !rowAssessment.canRender ? rowAssessment.emptyReason : "Ready to preview.");

  return {
    blockers,
    cautions,
    canAttemptPreview,
    shouldRender,
    rowAssessment,
    message,
  };
}

export function getBuilderContext(routeState, fallbackContext) {
  return routeState?.builderContext ?? fallbackContext ?? null;
}

export function validateBuilderContext(context, projects = []) {
  if (!context?.projectId || !context?.sheetId || !context?.dashboardId) {
    return { isValid: false, project: null, sheet: null, dashboard: null };
  }

  const project = projects.find((item) => item.id === context.projectId) ?? null;
  const sheet = project?.sheets.find((item) => item.id === context.sheetId) ?? null;
  const dashboard = sheet?.dashboards.find((item) => item.id === context.dashboardId) ?? null;

  return {
    isValid: Boolean(project && sheet && dashboard),
    project,
    sheet,
    dashboard,
  };
}

export function getTargetDashboard(context, projects = []) {
  const validation = validateBuilderContext(context, projects);
  return validation.isValid ? validation.dashboard : null;
}

export { buildChartOptionByType } from "./buildEChartOption";
export {
  createChartFromTemplate,
  createDefaultWidgetName,
  getChartTemplates,
  getChartTypeLabel,
} from "./chartFactory";
