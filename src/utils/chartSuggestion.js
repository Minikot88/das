/**
 * chartSuggestion.js
 * Smart chart type auto-suggestion engine.
 * Maps field type combinations → best chart type + reasoning.
 *
 * EXTENSION: Enhance with ML-based suggestion model
 */
import { normalizeChartConfig } from "./normalizeChartConfig";

/** All supported chart types with metadata */
export const CHART_TYPES = [
  { id: "line",        label: "Line",         icon: "📈", group: "Trend"       },
  { id: "area",        label: "Area",         icon: "📉", group: "Trend"       },
  { id: "bar",         label: "Bar",          icon: "📊", group: "Comparison"  },
  { id: "stacked-bar", label: "Stacked Bar",  icon: "📦", group: "Comparison"  },
  { id: "pie",         label: "Pie",          icon: "🥧", group: "Proportion"  },
  { id: "donut",       label: "Donut",        icon: "🍩", group: "Proportion"  },
  { id: "scatter",     label: "Scatter",      icon: "✦",  group: "Correlation" },
  { id: "heatmap",     label: "Heatmap",      icon: "🟥", group: "Distribution"},
  { id: "kpi",         label: "KPI",          icon: "💎", group: "Metric"      },
];

export const CHART_TYPE_MAP = Object.fromEntries(CHART_TYPES.map((c) => [c.id, c]));

/** Chart types that don't require a Y field */
export const SINGLE_FIELD_CHARTS = new Set(["kpi"]);

/** Chart types that need X + Y */
export const DUAL_FIELD_CHARTS = new Set([
  "line","area","bar","stacked-bar","pie","donut","scatter","heatmap"
]);

/**
 * Suggest the best chart type given field type combination.
 * @param {string|null} xType  - "date" | "string" | "number" | null
 * @param {string|null} yType  - "date" | "string" | "number" | null
 * @param {boolean} hasGroup   - has a group-by field
 * @returns {{ suggested: string, alternatives: string[], reason: string }}
 */
export function suggestChartType(xType, yType, hasGroup = false) {
  // Single metric
  if (xType === "number" && !yType) {
    return { suggested: "kpi", alternatives: ["bar", "pie"], reason: "Single numeric metric" };
  }

  // time + number → line/area (trend)
  if (xType === "date" && yType === "number") {
    return {
      suggested: hasGroup ? "area" : "line",
      alternatives: ["area", "bar"],
      reason: "Date × Number → Line chart (time series trend)",
    };
  }

  // string + number → bar (comparison)
  if (xType === "string" && yType === "number") {
    return {
      suggested: hasGroup ? "stacked-bar" : "bar",
      alternatives: ["pie", "donut"],
      reason: "Category × Number → Bar chart (comparison)",
    };
  }

  // number + number → scatter (correlation)
  if (xType === "number" && yType === "number") {
    return {
      suggested: "scatter",
      alternatives: ["line", "heatmap"],
      reason: "Number × Number → Scatter plot (correlation)",
    };
  }

  // string + string → heatmap
  if (xType === "string" && yType === "string") {
    return {
      suggested: "heatmap",
      alternatives: ["bar"],
      reason: "Category × Category → Heatmap",
    };
  }

  // default fallback
  return { suggested: "bar", alternatives: ["line", "pie"], reason: "Default suggestion" };
}

/**
 * Validate chart configuration before rendering.
 * @returns {{ valid: boolean, warnings: string[] }}
 */
export function validateChartConfig(config) {
  const chart = normalizeChartConfig(config);
  const type = chart.chartType;
  const xField = chart.x;
  const yField = chart.y;
  const xType = chart.xType;
  const yType = chart.yType;
  const errors = [];
  const warnings = [];

  if (!type) errors.push("Select a chart type");

  if (!xField) errors.push("Select an X Axis field");
  if (!SINGLE_FIELD_CHARTS.has(type) && !yField) errors.push("Select a Y Axis field");

  if (type === "scatter") {
    if (xType && xType !== "number") errors.push("Scatter X axis should be numeric");
    if (yType && yType !== "number") errors.push("Scatter Y axis should be numeric");
  }

  if (type === "pie" || type === "donut") {
    if (xType === "number" && yType === "number")
      warnings.push("Pie/Donut charts work best with a category (X) and a number (Y)");
  }

  if ((type === "line" || type === "area") && xField && xType && xType !== "date") {
    warnings.push("Line chart works best with a time-based X axis");
  }

  if ((type === "bar" || type === "stacked-bar") && xField && xType === "number") {
    warnings.push("Bar charts are easier to scan with a category or date on the X axis");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: [...errors, ...warnings],
  };
}
