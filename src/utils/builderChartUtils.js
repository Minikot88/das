import { resolveChartRuntimeType } from "./chartCatalog";
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
