import { normalizeChartConfig } from "./normalizeChartConfig";

export const CHART_TYPES = [
  { id: "line", label: "Line", icon: "Line", group: "Trend" },
  { id: "area", label: "Area", icon: "Area", group: "Trend" },
  { id: "bar", label: "Bar", icon: "Bar", group: "Comparison" },
  { id: "stacked-bar", label: "Stacked", icon: "Stack", group: "Comparison" },
  { id: "grouped-bar", label: "Grouped", icon: "Group", group: "Comparison" },
  { id: "pie", label: "Pie", icon: "Pie", group: "Proportion" },
  { id: "donut", label: "Donut", icon: "Donut", group: "Proportion" },
  { id: "scatter", label: "Scatter", icon: "Scatter", group: "Correlation" },
  { id: "bubble", label: "Bubble", icon: "Bubble", group: "Correlation" },
  { id: "heatmap", label: "Heatmap", icon: "Heatmap", group: "Distribution" },
  { id: "histogram", label: "Histogram", icon: "Hist", group: "Distribution" },
  { id: "radar", label: "Radar", icon: "Radar", group: "Comparison" },
  { id: "gauge", label: "Gauge", icon: "Gauge", group: "Metric" },
  { id: "funnel", label: "Funnel", icon: "Funnel", group: "Flow" },
  { id: "table", label: "Table", icon: "Table", group: "Tabular" },
  { id: "kpi", label: "KPI", icon: "KPI", group: "Metric" },
];

export const CHART_TYPE_MAP = Object.fromEntries(CHART_TYPES.map((chart) => [chart.id, chart]));
export const SINGLE_FIELD_CHARTS = new Set(["kpi", "gauge", "histogram"]);

const ALL_AGGS = ["sum", "count", "avg", "min", "max"];
const PRIMARY_AGGS = ["sum", "count"];

function createSlot({ key, label, badge, helper, description, required = false, preferredTypes = [] }) {
  return { key, label, badge, helper, description, required, preferredTypes };
}

export const CHART_DEFINITIONS = {
  line: {
    family: "Trend",
    title: "Time-series line",
    description: "Best for directional changes over time or sequence.",
    supportsAggregation: true,
    aggregationOptions: ALL_AGGS,
    slots: [
      createSlot({ key: "x", label: "X Axis", badge: "Dimension", helper: "Map a date or ordered dimension", description: "Defines the sequence or timeline", required: true, preferredTypes: ["date", "string"] }),
      createSlot({ key: "y", label: "Y Axis", badge: "Measure", helper: "Map the metric to plot", description: "Numeric values for the line", required: true, preferredTypes: ["number"] }),
      createSlot({ key: "group", label: "Series", badge: "Optional", helper: "Split the trend into multiple lines", description: "Adds a series breakdown", preferredTypes: ["string"] }),
    ],
  },
  area: {
    family: "Trend",
    title: "Area trend",
    description: "Shows change over time with volume emphasis.",
    supportsAggregation: true,
    aggregationOptions: ALL_AGGS,
    slots: [
      createSlot({ key: "x", label: "X Axis", badge: "Dimension", helper: "Map a date or ordered dimension", description: "Defines the sequence or timeline", required: true, preferredTypes: ["date", "string"] }),
      createSlot({ key: "y", label: "Y Axis", badge: "Measure", helper: "Map the metric to fill", description: "Numeric values for the area", required: true, preferredTypes: ["number"] }),
      createSlot({ key: "group", label: "Series", badge: "Optional", helper: "Split the area into multiple bands", description: "Adds a series breakdown", preferredTypes: ["string"] }),
    ],
  },
  bar: {
    family: "Comparison",
    title: "Category comparison",
    description: "Compare one measure across categories.",
    supportsAggregation: true,
    aggregationOptions: ALL_AGGS,
    slots: [
      createSlot({ key: "x", label: "Category", badge: "Dimension", helper: "Map the grouping dimension", description: "Defines each bar bucket", required: true, preferredTypes: ["string", "date"] }),
      createSlot({ key: "y", label: "Value", badge: "Measure", helper: "Map the value to compare", description: "Numeric values for each bar", required: true, preferredTypes: ["number"] }),
      createSlot({ key: "group", label: "Series", badge: "Optional", helper: "Split bars into multiple series", description: "Adds a grouped comparison", preferredTypes: ["string"] }),
    ],
  },
  "stacked-bar": {
    family: "Comparison",
    title: "Stacked comparison",
    description: "Compare totals while showing composition within each category.",
    supportsAggregation: true,
    aggregationOptions: ALL_AGGS,
    slots: [
      createSlot({ key: "x", label: "Category", badge: "Dimension", helper: "Map the primary category", description: "Defines each stack", required: true, preferredTypes: ["string", "date"] }),
      createSlot({ key: "y", label: "Value", badge: "Measure", helper: "Map the value to stack", description: "Numeric value for each segment", required: true, preferredTypes: ["number"] }),
      createSlot({ key: "group", label: "Stack By", badge: "Series", helper: "Map the breakdown field", description: "Creates stacked segments", required: true, preferredTypes: ["string"] }),
    ],
  },
  "grouped-bar": {
    family: "Comparison",
    title: "Grouped comparison",
    description: "Compare category values side by side across series.",
    supportsAggregation: true,
    aggregationOptions: ALL_AGGS,
    slots: [
      createSlot({ key: "x", label: "Category", badge: "Dimension", helper: "Map the primary category", description: "Defines each grouped cluster", required: true, preferredTypes: ["string", "date"] }),
      createSlot({ key: "y", label: "Value", badge: "Measure", helper: "Map the value to compare", description: "Numeric value for each bar", required: true, preferredTypes: ["number"] }),
      createSlot({ key: "group", label: "Group By", badge: "Series", helper: "Map the series breakdown", description: "Creates side-by-side bars", required: true, preferredTypes: ["string"] }),
    ],
  },
  pie: {
    family: "Proportion",
    title: "Part-to-whole pie",
    description: "Show share of total across categories.",
    supportsAggregation: true,
    aggregationOptions: PRIMARY_AGGS,
    slots: [
      createSlot({ key: "x", label: "Slice", badge: "Category", helper: "Map the category for each slice", description: "Defines each pie segment", required: true, preferredTypes: ["string"] }),
      createSlot({ key: "y", label: "Value", badge: "Measure", helper: "Map the slice value", description: "Numeric value per category", required: true, preferredTypes: ["number"] }),
    ],
  },
  donut: {
    family: "Proportion",
    title: "Part-to-whole donut",
    description: "Show share of total with a cleaner central focus.",
    supportsAggregation: true,
    aggregationOptions: PRIMARY_AGGS,
    slots: [
      createSlot({ key: "x", label: "Slice", badge: "Category", helper: "Map the category for each slice", description: "Defines each donut segment", required: true, preferredTypes: ["string"] }),
      createSlot({ key: "y", label: "Value", badge: "Measure", helper: "Map the slice value", description: "Numeric value per category", required: true, preferredTypes: ["number"] }),
    ],
  },
  scatter: {
    family: "Correlation",
    title: "Scatter analysis",
    description: "Reveal correlation, clusters, and outliers between two measures.",
    supportsAggregation: false,
    aggregationOptions: [],
    slots: [
      createSlot({ key: "x", label: "X Measure", badge: "Numeric", helper: "Map the horizontal measure", description: "Numeric values on the X axis", required: true, preferredTypes: ["number"] }),
      createSlot({ key: "y", label: "Y Measure", badge: "Numeric", helper: "Map the vertical measure", description: "Numeric values on the Y axis", required: true, preferredTypes: ["number"] }),
    ],
  },
  bubble: {
    family: "Correlation",
    title: "Bubble analysis",
    description: "Add a third numeric metric using bubble size.",
    supportsAggregation: false,
    aggregationOptions: [],
    slots: [
      createSlot({ key: "x", label: "X Measure", badge: "Numeric", helper: "Map the horizontal measure", description: "Numeric values on the X axis", required: true, preferredTypes: ["number"] }),
      createSlot({ key: "y", label: "Y Measure", badge: "Numeric", helper: "Map the vertical measure", description: "Numeric values on the Y axis", required: true, preferredTypes: ["number"] }),
      createSlot({ key: "size", label: "Bubble Size", badge: "Numeric", helper: "Map the size metric", description: "Controls bubble radius", required: true, preferredTypes: ["number"] }),
    ],
  },
  heatmap: {
    family: "Distribution",
    title: "Heatmap matrix",
    description: "Compare intensity across two dimensions and one numeric metric.",
    supportsAggregation: true,
    aggregationOptions: ALL_AGGS,
    slots: [
      createSlot({ key: "x", label: "Columns", badge: "Dimension", helper: "Map the horizontal grouping", description: "Defines heatmap columns", required: true, preferredTypes: ["string", "date"] }),
      createSlot({ key: "group", label: "Rows", badge: "Dimension", helper: "Map the vertical grouping", description: "Defines heatmap rows", required: true, preferredTypes: ["string"] }),
      createSlot({ key: "y", label: "Cell Value", badge: "Measure", helper: "Map the metric for color intensity", description: "Numeric value used for shading", required: true, preferredTypes: ["number"] }),
    ],
  },
  histogram: {
    family: "Distribution",
    title: "Histogram",
    description: "Understand the spread of a single numeric field.",
    supportsAggregation: false,
    aggregationOptions: [],
    slots: [
      createSlot({ key: "x", label: "Value Field", badge: "Numeric", helper: "Map the numeric field to bin", description: "Each row becomes part of the distribution", required: true, preferredTypes: ["number"] }),
    ],
  },
  radar: {
    family: "Comparison",
    title: "Radar profile",
    description: "Compare a set of measures or segments across categories.",
    supportsAggregation: true,
    aggregationOptions: ALL_AGGS,
    slots: [
      createSlot({ key: "x", label: "Axis", badge: "Dimension", helper: "Map the axis category", description: "Defines each radar spoke", required: true, preferredTypes: ["string"] }),
      createSlot({ key: "y", label: "Value", badge: "Measure", helper: "Map the numeric metric", description: "Numeric value for each spoke", required: true, preferredTypes: ["number"] }),
      createSlot({ key: "group", label: "Series", badge: "Optional", helper: "Map the comparison series", description: "Compare multiple profiles", preferredTypes: ["string"] }),
    ],
  },
  gauge: {
    family: "Metric",
    title: "Gauge",
    description: "Highlight one numeric metric in a progress-style visual.",
    supportsAggregation: true,
    aggregationOptions: ALL_AGGS,
    slots: [
      createSlot({ key: "y", label: "Metric", badge: "Numeric", helper: "Map the primary metric", description: "Numeric value shown in the gauge", required: true, preferredTypes: ["number"] }),
    ],
  },
  funnel: {
    family: "Flow",
    title: "Funnel",
    description: "Show drop-off across ordered stages.",
    supportsAggregation: true,
    aggregationOptions: ALL_AGGS,
    slots: [
      createSlot({ key: "x", label: "Stage", badge: "Dimension", helper: "Map the funnel stage", description: "Defines each funnel step", required: true, preferredTypes: ["string"] }),
      createSlot({ key: "y", label: "Value", badge: "Measure", helper: "Map the stage metric", description: "Numeric value per step", required: true, preferredTypes: ["number"] }),
    ],
  },
  table: {
    family: "Tabular",
    title: "Summary table",
    description: "Inspect grouped results in a tabular layout.",
    supportsAggregation: true,
    aggregationOptions: ALL_AGGS,
    slots: [
      createSlot({ key: "x", label: "Primary Column", badge: "Dimension", helper: "Map the main row grouping", description: "Defines the first table column", required: true, preferredTypes: ["string", "date"] }),
      createSlot({ key: "y", label: "Measure", badge: "Optional", helper: "Map the summary value", description: "Adds an aggregated value column", preferredTypes: ["number"] }),
      createSlot({ key: "group", label: "Secondary Column", badge: "Optional", helper: "Add a second grouping column", description: "Adds extra detail to each row", preferredTypes: ["string"] }),
    ],
  },
  kpi: {
    family: "Metric",
    title: "KPI card",
    description: "Emphasize one headline metric.",
    supportsAggregation: true,
    aggregationOptions: ALL_AGGS,
    slots: [
      createSlot({ key: "y", label: "Metric", badge: "Numeric", helper: "Map the primary metric", description: "Numeric value shown in the KPI card", required: true, preferredTypes: ["number"] }),
    ],
  },
};

function createSuggestion({ suggested, alternatives = [], reason, summary, confidence = "medium" }) {
  return {
    suggested,
    alternatives: alternatives.filter((option, index) => option && option !== suggested && alternatives.indexOf(option) === index),
    reason,
    summary,
    confidence,
  };
}

function createValidationIssue({ level = "warning", code, title, message, action }) {
  return { level, code, title, message, action };
}

export function getChartDefinition(type) {
  return CHART_DEFINITIONS[type] ?? CHART_DEFINITIONS.bar;
}

export function getChartSlots(type) {
  return getChartDefinition(type).slots;
}

export function getChartAggregationOptions(type, activeAggregation = "sum") {
  const definition = getChartDefinition(type);
  if (!definition.supportsAggregation) return [];
  const options = definition.aggregationOptions?.length ? definition.aggregationOptions : ALL_AGGS;
  return options.includes(activeAggregation) ? options : [...options, activeAggregation];
}

export function getChartMappedCount(chart) {
  const normalized = normalizeChartConfig(chart);
  const values = { x: normalized.x, y: normalized.y, group: normalized.groupBy, size: normalized.sizeField };
  return getChartSlots(normalized.chartType).filter((slot) => Boolean(values[slot.key])).length;
}

export function suggestChartType(xType, yType, hasGroup = false) {
  if (xType === "number" && !yType) {
    return createSuggestion({
      suggested: "histogram",
      alternatives: ["kpi", "gauge"],
      reason: "Single numeric field",
      summary: "Best for understanding the spread and distribution of one measure.",
      confidence: "medium",
    });
  }

  if (xType === "date" && yType === "number") {
    return createSuggestion({
      suggested: hasGroup ? "area" : "line",
      alternatives: ["area", "bar", "radar"],
      reason: "Date x Number -> trend analysis",
      summary: "Best for showing how a metric changes over time.",
      confidence: "high",
    });
  }

  if (xType === "string" && yType === "number") {
    return createSuggestion({
      suggested: hasGroup ? "stacked-bar" : "bar",
      alternatives: hasGroup ? ["grouped-bar", "pie"] : ["pie", "donut"],
      reason: "Category x Number -> comparison analysis",
      summary: "Best for comparing values across categories.",
      confidence: "high",
    });
  }

  if (xType === "number" && yType === "number") {
    return createSuggestion({
      suggested: "scatter",
      alternatives: ["bubble", "heatmap"],
      reason: "Number x Number -> correlation analysis",
      summary: "Best for spotting relationships, clusters, and outliers between two measures.",
      confidence: "high",
    });
  }

  if (xType === "string" && yType === "string") {
    return createSuggestion({
      suggested: "table",
      alternatives: ["heatmap", "bar"],
      reason: "Category x Category -> cross-section view",
      summary: "Best for reviewing grouped intersections before choosing a more specific visual.",
      confidence: "medium",
    });
  }

  return createSuggestion({
    suggested: "bar",
    alternatives: ["line", "table"],
    reason: "Default suggestion",
    summary: "A safe starting point for mixed or partially configured fields.",
    confidence: "low",
  });
}

export function validateChartConfig(config) {
  const chart = normalizeChartConfig(config);
  const type = chart.chartType;
  const xField = chart.x;
  const yField = chart.y;
  const xType = chart.xType;
  const yType = chart.yType;
  const groupField = chart.groupBy;
  const sizeField = chart.sizeField;
  const sizeType = chart.sizeType;
  const definition = getChartDefinition(type);
  const errors = [];
  const warnings = [];
  const issues = [];

  if (!type) {
    const issue = createValidationIssue({
      level: "error",
      code: "missing-chart-type",
      title: "Choose a chart type",
      message: "Pick a visual before saving so the Builder knows how to render this analysis.",
      action: "Select a chart from the chart gallery before saving.",
    });
    errors.push(issue.title);
    issues.push(issue);
  }

  for (const slot of definition.slots) {
    const value = { x: xField, y: yField, group: groupField, size: sizeField }[slot.key];
    if (!slot.required || value) continue;

    const issue = createValidationIssue({
      level: "error",
      code: `missing-${slot.key}`,
      title: `${slot.label} is required`,
      message: `${definition.title} needs ${slot.label.toLowerCase()} to render correctly.`,
      action: slot.helper,
    });
    errors.push(issue.title);
    issues.push(issue);
  }

  if ((type === "scatter" || type === "bubble") && xType && xType !== "number") {
    const issue = createValidationIssue({
      level: "error",
      code: `${type}-x-not-numeric`,
      title: `${type === "bubble" ? "Bubble" : "Scatter"} X measure must be numeric`,
      message: "Correlation charts compare numeric measures, so the X mapping must be numeric.",
      action: "Replace the X mapping with a numeric field or switch to a category-based chart.",
    });
    errors.push(issue.title);
    issues.push(issue);
  }

  if ((type === "scatter" || type === "bubble") && yType && yType !== "number") {
    const issue = createValidationIssue({
      level: "error",
      code: `${type}-y-not-numeric`,
      title: `${type === "bubble" ? "Bubble" : "Scatter"} Y measure must be numeric`,
      message: "Correlation charts need a numeric metric on the Y axis.",
      action: "Use a numeric field for Y or choose a comparison chart instead.",
    });
    errors.push(issue.title);
    issues.push(issue);
  }

  if (type === "bubble" && sizeType && sizeType !== "number") {
    const issue = createValidationIssue({
      level: "error",
      code: "bubble-size-not-numeric",
      title: "Bubble size must be numeric",
      message: "Bubble size represents a third quantitative metric and must be numeric.",
      action: "Map a numeric field into Bubble Size or switch back to Scatter.",
    });
    errors.push(issue.title);
    issues.push(issue);
  }

  if ((type === "line" || type === "area") && xField && xType && xType !== "date") {
    const issue = createValidationIssue({
      level: "warning",
      code: `${type}-x-not-date`,
      title: `${definition.title} works best with time on X`,
      message: "This setup will still render, but time or ordered sequence fields make trend charts easier to read.",
      action: "Use a date field on X for trends, or switch to Bar for categorical comparisons.",
    });
    warnings.push(issue.title);
    issues.push(issue);
  }

  if ((type === "pie" || type === "donut") && xType === "number") {
    const issue = createValidationIssue({
      level: "warning",
      code: `${type}-numeric-category`,
      title: `${definition.title} needs a clear category`,
      message: "Using a numeric field as the slice label makes proportions harder to interpret.",
      action: "Use a category field for slices, or switch to Scatter for numeric comparisons.",
    });
    warnings.push(issue.title);
    issues.push(issue);
  }

  if (type === "heatmap" && yType && yType !== "number") {
    const issue = createValidationIssue({
      level: "error",
      code: "heatmap-value-not-numeric",
      title: "Heatmap cell value must be numeric",
      message: "Heatmaps shade each cell using a numeric metric.",
      action: "Use a numeric measure for Cell Value and map rows/columns as dimensions.",
    });
    errors.push(issue.title);
    issues.push(issue);
  }

  if ((type === "gauge" || type === "kpi") && yType && yType !== "number") {
    const issue = createValidationIssue({
      level: "warning",
      code: `${type}-metric-not-numeric`,
      title: `${definition.title} needs a numeric metric`,
      message: "This visual is designed around one numeric measure.",
      action: "Use a numeric field or switch to Table if you want a categorical summary.",
    });
    warnings.push(issue.title);
    issues.push(issue);
  }

  if (type === "histogram" && xType && xType !== "number") {
    const issue = createValidationIssue({
      level: "error",
      code: "histogram-field-not-numeric",
      title: "Histogram value field must be numeric",
      message: "Histograms bin one numeric field into ranges.",
      action: "Map a numeric field into Value Field or switch to a categorical chart.",
    });
    errors.push(issue.title);
    issues.push(issue);
  }

  if ((type === "stacked-bar" || type === "grouped-bar") && !groupField) {
    const issue = createValidationIssue({
      level: "warning",
      code: `${type}-missing-series`,
      title: `${definition.title} is stronger with a series breakdown`,
      message: "The chart will render with one series, but it is intended for comparing category splits.",
      action: "Add a series field or use a standard Bar chart for a simpler comparison.",
    });
    warnings.push(issue.title);
    issues.push(issue);
  }

  if (type === "radar" && !groupField) {
    const issue = createValidationIssue({
      level: "warning",
      code: "radar-single-series",
      title: "Radar is most useful when comparing series",
      message: "A single radar series is valid, but comparisons usually make this chart more informative.",
      action: "Add a series field, or switch to Bar if you want a straightforward single-series view.",
    });
    warnings.push(issue.title);
    issues.push(issue);
  }

  if (type === "table" && !yField && !groupField) {
    const issue = createValidationIssue({
      level: "warning",
      code: "table-minimal",
      title: "Table currently shows a light summary",
      message: "With only one mapped field, the Builder will create a grouped summary table rather than a raw detail grid.",
      action: "Add a measure or secondary column for a richer tabular summary.",
    });
    warnings.push(issue.title);
    issues.push(issue);
  }

  const blockers = issues.filter((issue) => issue.level === "error");
  const cautions = issues.filter((issue) => issue.level === "warning");

  return {
    valid: blockers.length === 0,
    errors,
    warnings: [...errors, ...warnings],
    issues,
    blockers,
    cautions,
    definition,
  };
}

