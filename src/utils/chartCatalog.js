import { normalizeChartConfig } from "./normalizeChartConfig";

const FIELD_TYPE_GROUPS = {
  category: ["string", "date", "boolean"],
  metric: ["number"],
  time: ["date"],
  hierarchy: ["string", "date"],
  any: [],
};

export const FIELD_ROLES = {
  category: { label: "Category", acceptedTypes: FIELD_TYPE_GROUPS.category, description: "Categorical bucket or label." },
  series: { label: "Series", acceptedTypes: FIELD_TYPE_GROUPS.category, description: "Breaks a chart into multiple groups." },
  value: { label: "Value", acceptedTypes: FIELD_TYPE_GROUPS.metric, description: "Primary numeric measure." },
  value2: { label: "Value 2", acceptedTypes: FIELD_TYPE_GROUPS.metric, description: "Secondary numeric measure." },
  value3: { label: "Value 3", acceptedTypes: FIELD_TYPE_GROUPS.metric, description: "Tertiary numeric measure." },
  x: { label: "X", acceptedTypes: [...FIELD_TYPE_GROUPS.metric, ...FIELD_TYPE_GROUPS.category], description: "Horizontal axis field." },
  y: { label: "Y", acceptedTypes: FIELD_TYPE_GROUPS.metric, description: "Vertical axis field." },
  size: { label: "Size", acceptedTypes: FIELD_TYPE_GROUPS.metric, description: "Bubble or node size metric." },
  time: { label: "Time", acceptedTypes: FIELD_TYPE_GROUPS.time, description: "Date or time field." },
  row: { label: "Row", acceptedTypes: FIELD_TYPE_GROUPS.category, description: "Matrix row grouping." },
  column: { label: "Column", acceptedTypes: FIELD_TYPE_GROUPS.category, description: "Matrix column grouping." },
  hierarchy: { label: "Hierarchy", acceptedTypes: FIELD_TYPE_GROUPS.hierarchy, description: "Parent-child grouping field." },
  label: { label: "Label", acceptedTypes: FIELD_TYPE_GROUPS.category, description: "Display label." },
  target: { label: "Target", acceptedTypes: FIELD_TYPE_GROUPS.category, description: "Destination node." },
  source: { label: "Source", acceptedTypes: FIELD_TYPE_GROUPS.category, description: "Origin node." },
  open: { label: "Open", acceptedTypes: FIELD_TYPE_GROUPS.metric, description: "Financial open value." },
  high: { label: "High", acceptedTypes: FIELD_TYPE_GROUPS.metric, description: "Financial high value." },
  low: { label: "Low", acceptedTypes: FIELD_TYPE_GROUPS.metric, description: "Financial low value." },
  close: { label: "Close", acceptedTypes: FIELD_TYPE_GROUPS.metric, description: "Financial close value." },
  progress: { label: "Progress", acceptedTypes: FIELD_TYPE_GROUPS.metric, description: "Progress or target attainment metric." },
  detail: { label: "Detail", acceptedTypes: FIELD_TYPE_GROUPS.any, description: "Supporting text or detail field." },
  tooltip: { label: "Tooltip", acceptedTypes: FIELD_TYPE_GROUPS.any, description: "Extra contextual field." },
};

const CHART_CATEGORIES = [
  { id: "recommended", label: "Recommended", description: "Best fits for the current mapping." },
  { id: "comparison", label: "Comparison", description: "Compare values across categories or series." },
  { id: "trend", label: "Trend", description: "Show change across time or ordered sequences." },
  { id: "distribution", label: "Distribution", description: "Understand spread, density, and outliers." },
  { id: "composition", label: "Composition", description: "Explain part-to-whole breakdowns." },
  { id: "relationship", label: "Relationship", description: "Explore correlation and multivariate patterns." },
  { id: "hierarchy", label: "Hierarchy", description: "Roll up values through parent-child structures." },
  { id: "matrix", label: "Matrix", description: "Analyze values across rows and columns." },
  { id: "summary", label: "Summary", description: "Highlight a single number or progress state." },
  { id: "table", label: "Table", description: "Inspect values in rows and columns." },
  { id: "advanced", label: "Advanced", description: "Specialized or experimental chart types." },
];

function slot({
  key,
  label,
  role,
  required = false,
  helper,
  description,
  candidateKeys = [],
  acceptedTypes = [],
}) {
  return {
    key,
    label,
    role,
    required,
    helper,
    description,
    candidateKeys,
    acceptedTypes,
  };
}

const CHART_CATALOG = [
  {
    id: "bar",
    name: "Bar",
    shortName: "BAR",
    category: "comparison",
    description: "Compare one metric across categories.",
    renderType: "bar",
    supported: true,
    previewSupported: true,
    badges: ["Popular"],
    slots: [
      slot({ key: "x", label: "Category", role: "dimension", required: true, helper: "Pick a category or date field.", description: "Creates each bar bucket.", candidateKeys: ["x", "group"], acceptedTypes: FIELD_TYPE_GROUPS.category }),
      slot({ key: "y", label: "Value", role: "metric", required: true, helper: "Pick a numeric measure.", description: "Controls bar height.", candidateKeys: ["y", "size", "x"], acceptedTypes: FIELD_TYPE_GROUPS.metric }),
      slot({ key: "group", label: "Series", role: "series", helper: "Optional series breakdown.", description: "Splits bars into multiple series.", candidateKeys: ["group", "x"], acceptedTypes: FIELD_TYPE_GROUPS.category }),
    ],
  },
  {
    id: "grouped-bar",
    name: "Grouped Bar",
    shortName: "GB",
    category: "comparison",
    description: "Compare multiple series side by side.",
    renderType: "grouped-bar",
    supported: true,
    previewSupported: true,
    badges: ["Recommended"],
    slots: [
      slot({ key: "x", label: "Category", role: "dimension", required: true, helper: "Pick the main category.", description: "Creates each comparison group.", candidateKeys: ["x", "group"], acceptedTypes: FIELD_TYPE_GROUPS.category }),
      slot({ key: "y", label: "Value", role: "metric", required: true, helper: "Pick a numeric measure.", description: "Controls each bar value.", candidateKeys: ["y", "size"], acceptedTypes: FIELD_TYPE_GROUPS.metric }),
      slot({ key: "group", label: "Series", role: "series", required: true, helper: "Pick the field to split by.", description: "Adds the grouped comparison.", candidateKeys: ["group", "x"], acceptedTypes: FIELD_TYPE_GROUPS.category }),
    ],
  },
  {
    id: "stacked-bar",
    name: "Stacked Bar",
    shortName: "SB",
    category: "comparison",
    description: "Compare totals with composition inside each bar.",
    renderType: "stacked-bar",
    supported: true,
    previewSupported: true,
    badges: ["Popular"],
    slots: [
      slot({ key: "x", label: "Category", role: "dimension", required: true, helper: "Pick the main category.", description: "Creates each stack.", candidateKeys: ["x", "group"], acceptedTypes: FIELD_TYPE_GROUPS.category }),
      slot({ key: "y", label: "Value", role: "metric", required: true, helper: "Pick a numeric measure.", description: "Controls segment size.", candidateKeys: ["y", "size"], acceptedTypes: FIELD_TYPE_GROUPS.metric }),
      slot({ key: "group", label: "Stack By", role: "series", required: true, helper: "Pick the breakdown field.", description: "Creates stacked segments.", candidateKeys: ["group", "x"], acceptedTypes: FIELD_TYPE_GROUPS.category }),
    ],
  },
  {
    id: "horizontal-bar",
    name: "Horizontal Bar",
    shortName: "HB",
    category: "comparison",
    description: "Bar chart optimized for long category labels.",
    renderType: "horizontal-bar",
    supported: true,
    previewSupported: true,
    badges: ["New"],
    slots: [
      slot({ key: "x", label: "Category", role: "dimension", required: true, helper: "Pick a category field.", description: "Renders as rows on the Y axis.", candidateKeys: ["x", "group"], acceptedTypes: FIELD_TYPE_GROUPS.category }),
      slot({ key: "y", label: "Value", role: "metric", required: true, helper: "Pick a numeric measure.", description: "Controls bar length.", candidateKeys: ["y", "size"], acceptedTypes: FIELD_TYPE_GROUPS.metric }),
      slot({ key: "group", label: "Series", role: "series", helper: "Optional series breakdown.", description: "Adds a secondary split.", candidateKeys: ["group"], acceptedTypes: FIELD_TYPE_GROUPS.category }),
    ],
  },
  {
    id: "line",
    name: "Line",
    shortName: "LN",
    category: "trend",
    description: "Track direction and movement across a sequence.",
    renderType: "line",
    supported: true,
    previewSupported: true,
    badges: ["Popular"],
    slots: [
      slot({ key: "x", label: "Sequence", role: "dimension", required: true, helper: "Pick a date or ordered field.", description: "Defines the order of the line.", candidateKeys: ["x", "group"], acceptedTypes: FIELD_TYPE_GROUPS.category }),
      slot({ key: "y", label: "Value", role: "metric", required: true, helper: "Pick a numeric measure.", description: "Controls line height.", candidateKeys: ["y", "size"], acceptedTypes: FIELD_TYPE_GROUPS.metric }),
      slot({ key: "group", label: "Series", role: "series", helper: "Optional series breakdown.", description: "Splits the line into multiple series.", candidateKeys: ["group", "x"], acceptedTypes: FIELD_TYPE_GROUPS.category }),
    ],
  },
  {
    id: "multi-line",
    name: "Multi Line",
    shortName: "ML",
    category: "trend",
    description: "Compare multiple trend lines on one plot.",
    renderType: "line",
    supported: true,
    previewSupported: true,
    badges: ["Recommended"],
    slots: [
      slot({ key: "x", label: "Sequence", role: "dimension", required: true, helper: "Pick a date or ordered field.", description: "Defines the timeline or sequence.", candidateKeys: ["x"], acceptedTypes: FIELD_TYPE_GROUPS.category }),
      slot({ key: "y", label: "Value", role: "metric", required: true, helper: "Pick a numeric measure.", description: "Controls line values.", candidateKeys: ["y"], acceptedTypes: FIELD_TYPE_GROUPS.metric }),
      slot({ key: "group", label: "Series", role: "series", required: true, helper: "Pick the field to compare.", description: "Creates multiple lines.", candidateKeys: ["group"], acceptedTypes: FIELD_TYPE_GROUPS.category }),
    ],
  },
  {
    id: "area",
    name: "Area",
    shortName: "AR",
    category: "trend",
    description: "Show trend with volume emphasis.",
    renderType: "area",
    supported: true,
    previewSupported: true,
    slots: [
      slot({ key: "x", label: "Sequence", role: "dimension", required: true, helper: "Pick a date or ordered field.", description: "Defines the order of the area chart.", candidateKeys: ["x"], acceptedTypes: FIELD_TYPE_GROUPS.category }),
      slot({ key: "y", label: "Value", role: "metric", required: true, helper: "Pick a numeric measure.", description: "Controls the filled area.", candidateKeys: ["y"], acceptedTypes: FIELD_TYPE_GROUPS.metric }),
      slot({ key: "group", label: "Series", role: "series", helper: "Optional series breakdown.", description: "Creates multiple areas.", candidateKeys: ["group"], acceptedTypes: FIELD_TYPE_GROUPS.category }),
    ],
  },
  {
    id: "stacked-area",
    name: "Stacked Area",
    shortName: "SA",
    category: "trend",
    description: "Track total change and part contribution together.",
    renderType: "stacked-area",
    supported: true,
    previewSupported: true,
    badges: ["Recommended"],
    slots: [
      slot({ key: "x", label: "Sequence", role: "dimension", required: true, helper: "Pick a date or ordered field.", description: "Defines the shared sequence.", candidateKeys: ["x"], acceptedTypes: FIELD_TYPE_GROUPS.category }),
      slot({ key: "y", label: "Value", role: "metric", required: true, helper: "Pick a numeric measure.", description: "Controls the stacked height.", candidateKeys: ["y"], acceptedTypes: FIELD_TYPE_GROUPS.metric }),
      slot({ key: "group", label: "Series", role: "series", required: true, helper: "Pick the split field.", description: "Creates the stacked bands.", candidateKeys: ["group"], acceptedTypes: FIELD_TYPE_GROUPS.category }),
    ],
  },
  {
    id: "step-line",
    name: "Step Line",
    shortName: "ST",
    category: "trend",
    description: "Show discrete jumps between points.",
    renderType: "step-line",
    supported: true,
    previewSupported: true,
    slots: [
      slot({ key: "x", label: "Sequence", role: "dimension", required: true, helper: "Pick a date or ordered field.", description: "Defines each step.", candidateKeys: ["x"], acceptedTypes: FIELD_TYPE_GROUPS.category }),
      slot({ key: "y", label: "Value", role: "metric", required: true, helper: "Pick a numeric measure.", description: "Controls step height.", candidateKeys: ["y"], acceptedTypes: FIELD_TYPE_GROUPS.metric }),
      slot({ key: "group", label: "Series", role: "series", helper: "Optional series breakdown.", description: "Creates multiple step lines.", candidateKeys: ["group"], acceptedTypes: FIELD_TYPE_GROUPS.category }),
    ],
  },
  {
    id: "histogram",
    name: "Histogram",
    shortName: "HG",
    category: "matrix",
    description: "Bin one numeric field to reveal spread.",
    renderType: "histogram",
    supported: true,
    previewSupported: true,
    slots: [
      slot({ key: "x", label: "Value Field", role: "metric", required: true, helper: "Pick one numeric field.", description: "Values will be grouped into bins.", candidateKeys: ["x", "y", "size"], acceptedTypes: FIELD_TYPE_GROUPS.metric }),
    ],
  },
  {
    id: "boxplot",
    name: "Boxplot",
    shortName: "BX",
    category: "distribution",
    description: "Summarize median, quartiles, and outliers.",
    renderType: "boxplot",
    supported: false,
    previewSupported: false,
    disabledReason: "Boxplot preview is not implemented in the current builder pipeline yet.",
    experimental: true,
    slots: [
      slot({ key: "x", label: "Category", role: "dimension", helper: "Pick a grouping field.", description: "Creates one box per category.", candidateKeys: ["x"], acceptedTypes: FIELD_TYPE_GROUPS.category }),
      slot({ key: "y", label: "Value Field", role: "metric", required: true, helper: "Pick a numeric field.", description: "Values are used to compute quartiles.", candidateKeys: ["y", "x"], acceptedTypes: FIELD_TYPE_GROUPS.metric }),
    ],
  },
  {
    id: "violin",
    name: "Violin",
    shortName: "VL",
    category: "distribution",
    description: "Density-style distribution view.",
    renderType: "violin",
    supported: false,
    previewSupported: false,
    disabledReason: "Violin approximation is not wired into preview rendering yet.",
    experimental: true,
    slots: [
      slot({ key: "x", label: "Category", role: "dimension", helper: "Pick a grouping field.", description: "Creates one density shape per category.", candidateKeys: ["x"], acceptedTypes: FIELD_TYPE_GROUPS.category }),
      slot({ key: "y", label: "Value Field", role: "metric", required: true, helper: "Pick a numeric field.", description: "Values are used for the density curve.", candidateKeys: ["y"], acceptedTypes: FIELD_TYPE_GROUPS.metric }),
    ],
  },
  {
    id: "scatter",
    name: "Scatter",
    shortName: "SC",
    category: "relationship",
    description: "Compare two numeric measures.",
    renderType: "scatter",
    supported: true,
    previewSupported: true,
    badges: ["Popular"],
    slots: [
      slot({ key: "x", label: "X Measure", role: "metric", required: true, helper: "Pick a numeric X field.", description: "Controls the horizontal position.", candidateKeys: ["x", "y", "size"], acceptedTypes: FIELD_TYPE_GROUPS.metric }),
      slot({ key: "y", label: "Y Measure", role: "metric", required: true, helper: "Pick a numeric Y field.", description: "Controls the vertical position.", candidateKeys: ["y", "x", "size"], acceptedTypes: FIELD_TYPE_GROUPS.metric }),
      slot({ key: "group", label: "Series", role: "series", helper: "Optional grouping field.", description: "Colors points by segment.", candidateKeys: ["group"], acceptedTypes: FIELD_TYPE_GROUPS.category }),
    ],
  },
  {
    id: "bubble",
    name: "Bubble",
    shortName: "BB",
    category: "relationship",
    description: "Scatter plot with a third metric as size.",
    renderType: "bubble",
    supported: true,
    previewSupported: true,
    slots: [
      slot({ key: "x", label: "X Measure", role: "metric", required: true, helper: "Pick a numeric X field.", description: "Controls the horizontal position.", candidateKeys: ["x", "y", "size"], acceptedTypes: FIELD_TYPE_GROUPS.metric }),
      slot({ key: "y", label: "Y Measure", role: "metric", required: true, helper: "Pick a numeric Y field.", description: "Controls the vertical position.", candidateKeys: ["y", "x", "size"], acceptedTypes: FIELD_TYPE_GROUPS.metric }),
      slot({ key: "size", label: "Bubble Size", role: "metric", required: true, helper: "Pick a third numeric field.", description: "Controls bubble size.", candidateKeys: ["size", "y", "x"], acceptedTypes: FIELD_TYPE_GROUPS.metric }),
      slot({ key: "group", label: "Series", role: "series", helper: "Optional grouping field.", description: "Colors points by segment.", candidateKeys: ["group"], acceptedTypes: FIELD_TYPE_GROUPS.category }),
    ],
  },
  {
    id: "radar",
    name: "Radar",
    shortName: "RD",
    category: "relationship",
    description: "Compare profiles across several axes.",
    renderType: "radar",
    supported: true,
    previewSupported: true,
    slots: [
      slot({ key: "x", label: "Axis", role: "dimension", required: true, helper: "Pick the axis/category field.", description: "Creates the radar spokes.", candidateKeys: ["x"], acceptedTypes: FIELD_TYPE_GROUPS.category }),
      slot({ key: "y", label: "Value", role: "metric", required: true, helper: "Pick a numeric measure.", description: "Controls each spoke value.", candidateKeys: ["y"], acceptedTypes: FIELD_TYPE_GROUPS.metric }),
      slot({ key: "group", label: "Series", role: "series", helper: "Optional comparison field.", description: "Creates multiple radar shapes.", candidateKeys: ["group"], acceptedTypes: FIELD_TYPE_GROUPS.category }),
    ],
  },
  {
    id: "graph",
    name: "Network Graph",
    shortName: "NW",
    category: "relationship",
    description: "Explore node-link relationships.",
    renderType: "graph",
    supported: false,
    previewSupported: false,
    disabledReason: "Network graph needs link-style source/target data that the builder does not map yet.",
    experimental: true,
    slots: [
      slot({ key: "x", label: "Source", role: "dimension", required: true, helper: "Pick a source node field.", description: "Defines the origin node.", candidateKeys: ["x"], acceptedTypes: FIELD_TYPE_GROUPS.category }),
      slot({ key: "group", label: "Target", role: "dimension", required: true, helper: "Pick a target node field.", description: "Defines the target node.", candidateKeys: ["group"], acceptedTypes: FIELD_TYPE_GROUPS.category }),
      slot({ key: "y", label: "Weight", role: "metric", helper: "Optional edge weight.", description: "Controls link strength.", candidateKeys: ["y"], acceptedTypes: FIELD_TYPE_GROUPS.metric }),
    ],
  },
  {
    id: "parallel",
    name: "Parallel Coordinates",
    shortName: "PC",
    category: "relationship",
    description: "Compare many numeric measures at once.",
    renderType: "parallel",
    supported: false,
    previewSupported: false,
    disabledReason: "Parallel coordinates need multi-metric mapping that is not exposed in the current builder.",
    experimental: true,
    slots: [
      slot({ key: "x", label: "Dimension", role: "dimension", helper: "Pick a dimension field.", description: "Identifies each row.", candidateKeys: ["x"], acceptedTypes: FIELD_TYPE_GROUPS.category }),
      slot({ key: "y", label: "Metric", role: "metric", required: true, helper: "Pick at least one metric.", description: "Additional numeric metrics are required.", candidateKeys: ["y"], acceptedTypes: FIELD_TYPE_GROUPS.metric }),
    ],
  },
  {
    id: "pie",
    name: "Pie",
    shortName: "PI",
    category: "composition",
    description: "Show part-to-whole share.",
    renderType: "pie",
    supported: true,
    previewSupported: true,
    slots: [
      slot({ key: "x", label: "Category", role: "dimension", required: true, helper: "Pick the slice label field.", description: "Creates each slice.", candidateKeys: ["x", "group"], acceptedTypes: FIELD_TYPE_GROUPS.category }),
      slot({ key: "y", label: "Value", role: "metric", required: true, helper: "Pick a numeric measure.", description: "Controls slice size.", candidateKeys: ["y", "size"], acceptedTypes: FIELD_TYPE_GROUPS.metric }),
    ],
  },
  {
    id: "donut",
    name: "Donut",
    shortName: "DN",
    category: "composition",
    description: "Pie chart with central focus space.",
    renderType: "donut",
    supported: true,
    previewSupported: true,
    badges: ["Popular"],
    slots: [
      slot({ key: "x", label: "Category", role: "dimension", required: true, helper: "Pick the slice label field.", description: "Creates each ring segment.", candidateKeys: ["x", "group"], acceptedTypes: FIELD_TYPE_GROUPS.category }),
      slot({ key: "y", label: "Value", role: "metric", required: true, helper: "Pick a numeric measure.", description: "Controls segment size.", candidateKeys: ["y", "size"], acceptedTypes: FIELD_TYPE_GROUPS.metric }),
    ],
  },
  {
    id: "rose",
    name: "Rose",
    shortName: "RS",
    category: "composition",
    description: "Nightingale rose chart for ranked proportions.",
    renderType: "rose",
    supported: true,
    previewSupported: true,
    experimental: true,
    slots: [
      slot({ key: "x", label: "Category", role: "dimension", required: true, helper: "Pick the slice label field.", description: "Creates each petal.", candidateKeys: ["x"], acceptedTypes: FIELD_TYPE_GROUPS.category }),
      slot({ key: "y", label: "Value", role: "metric", required: true, helper: "Pick a numeric measure.", description: "Controls petal radius.", candidateKeys: ["y"], acceptedTypes: FIELD_TYPE_GROUPS.metric }),
    ],
  },
  {
    id: "funnel",
    name: "Funnel",
    shortName: "FN",
    category: "composition",
    description: "Show stage drop-off across a process.",
    renderType: "funnel",
    supported: true,
    previewSupported: true,
    slots: [
      slot({ key: "x", label: "Stage", role: "dimension", required: true, helper: "Pick the stage field.", description: "Defines each funnel step.", candidateKeys: ["x"], acceptedTypes: FIELD_TYPE_GROUPS.category }),
      slot({ key: "y", label: "Value", role: "metric", required: true, helper: "Pick a numeric measure.", description: "Controls stage volume.", candidateKeys: ["y"], acceptedTypes: FIELD_TYPE_GROUPS.metric }),
    ],
  },
  {
    id: "heatmap",
    name: "Heatmap",
    shortName: "HM",
    category: "distribution",
    description: "Compare intensity across rows and columns.",
    renderType: "heatmap",
    supported: true,
    previewSupported: true,
    slots: [
      slot({ key: "x", label: "Columns", role: "dimension", required: true, helper: "Pick the column grouping field.", description: "Creates heatmap columns.", candidateKeys: ["x"], acceptedTypes: FIELD_TYPE_GROUPS.category }),
      slot({ key: "group", label: "Rows", role: "dimension", required: true, helper: "Pick the row grouping field.", description: "Creates heatmap rows.", candidateKeys: ["group"], acceptedTypes: FIELD_TYPE_GROUPS.category }),
      slot({ key: "y", label: "Cell Value", role: "metric", required: true, helper: "Pick a numeric measure.", description: "Controls color intensity.", candidateKeys: ["y"], acceptedTypes: FIELD_TYPE_GROUPS.metric }),
    ],
  },
  {
    id: "calendar-heatmap",
    name: "Calendar Heatmap",
    shortName: "CH",
    category: "distribution",
    description: "Map one value across calendar dates.",
    renderType: "calendar-heatmap",
    supported: false,
    previewSupported: false,
    disabledReason: "Calendar heatmap needs date-specific layout support that is not implemented yet.",
    experimental: true,
    slots: [
      slot({ key: "x", label: "Date", role: "time", required: true, helper: "Pick a date field.", description: "Defines the calendar day.", candidateKeys: ["x"], acceptedTypes: FIELD_TYPE_GROUPS.time }),
      slot({ key: "y", label: "Value", role: "metric", required: true, helper: "Pick a numeric measure.", description: "Controls cell intensity.", candidateKeys: ["y"], acceptedTypes: FIELD_TYPE_GROUPS.metric }),
    ],
  },
  {
    id: "treemap",
    name: "Treemap",
    shortName: "TM",
    category: "hierarchy",
    description: "Roll up values through grouped rectangles.",
    renderType: "treemap",
    supported: true,
    previewSupported: true,
    badges: ["New"],
    slots: [
      slot({ key: "group", label: "Parent", role: "hierarchy", helper: "Pick a parent grouping field.", description: "Creates the top-level node.", candidateKeys: ["group", "x"], acceptedTypes: FIELD_TYPE_GROUPS.hierarchy }),
      slot({ key: "x", label: "Child", role: "hierarchy", required: true, helper: "Pick a child category field.", description: "Creates the leaf node.", candidateKeys: ["x", "group"], acceptedTypes: FIELD_TYPE_GROUPS.hierarchy }),
      slot({ key: "y", label: "Value", role: "metric", required: true, helper: "Pick a numeric measure.", description: "Controls rectangle size.", candidateKeys: ["y"], acceptedTypes: FIELD_TYPE_GROUPS.metric }),
    ],
  },
  {
    id: "sunburst",
    name: "Sunburst",
    shortName: "SU",
    category: "hierarchy",
    description: "Hierarchy displayed as concentric rings.",
    renderType: "sunburst",
    supported: true,
    previewSupported: true,
    experimental: true,
    slots: [
      slot({ key: "group", label: "Parent", role: "hierarchy", helper: "Pick a parent grouping field.", description: "Creates the inner ring.", candidateKeys: ["group", "x"], acceptedTypes: FIELD_TYPE_GROUPS.hierarchy }),
      slot({ key: "x", label: "Child", role: "hierarchy", required: true, helper: "Pick a child category field.", description: "Creates the outer ring.", candidateKeys: ["x", "group"], acceptedTypes: FIELD_TYPE_GROUPS.hierarchy }),
      slot({ key: "y", label: "Value", role: "metric", required: true, helper: "Pick a numeric measure.", description: "Controls segment size.", candidateKeys: ["y"], acceptedTypes: FIELD_TYPE_GROUPS.metric }),
    ],
  },
  {
    id: "map",
    name: "Map",
    shortName: "MP",
    category: "advanced",
    description: "Geographic view for location-based analysis.",
    renderType: "map",
    supported: false,
    previewSupported: false,
    disabledReason: "Map previews are disabled until geo data and map assets are wired in.",
    slots: [
      slot({ key: "x", label: "Region", role: "dimension", required: true, helper: "Pick a location field.", description: "Defines each geography.", candidateKeys: ["x"], acceptedTypes: FIELD_TYPE_GROUPS.category }),
      slot({ key: "y", label: "Value", role: "metric", required: true, helper: "Pick a numeric measure.", description: "Controls the region intensity.", candidateKeys: ["y"], acceptedTypes: FIELD_TYPE_GROUPS.metric }),
    ],
  },
  {
    id: "kpi",
    name: "KPI",
    shortName: "KP",
    category: "summary",
    description: "Highlight one headline number.",
    renderType: "kpi",
    supported: true,
    previewSupported: true,
    badges: ["Popular"],
    slots: [
      slot({ key: "y", label: "Metric", role: "metric", required: true, helper: "Pick a numeric measure.", description: "Creates the headline value.", candidateKeys: ["y", "x", "size"], acceptedTypes: FIELD_TYPE_GROUPS.metric }),
    ],
  },
  {
    id: "gauge",
    name: "Gauge",
    shortName: "GG",
    category: "summary",
    description: "Show one metric in a progress-style gauge.",
    renderType: "gauge",
    supported: true,
    previewSupported: true,
    slots: [
      slot({ key: "y", label: "Metric", role: "metric", required: true, helper: "Pick a numeric measure.", description: "Creates the gauge value.", candidateKeys: ["y", "x", "size"], acceptedTypes: FIELD_TYPE_GROUPS.metric }),
    ],
  },
  {
    id: "progress-ring",
    name: "Progress Ring",
    shortName: "PR",
    category: "summary",
    description: "Compact ring KPI for one numeric value.",
    renderType: "progress-ring",
    supported: true,
    previewSupported: true,
    experimental: true,
    slots: [
      slot({ key: "y", label: "Metric", role: "metric", required: true, helper: "Pick a numeric measure.", description: "Creates the ring value.", candidateKeys: ["y", "x", "size"], acceptedTypes: FIELD_TYPE_GROUPS.metric }),
    ],
  },
  {
    id: "table",
    name: "Table",
    shortName: "TB",
    category: "matrix",
    description: "Inspect grouped values in rows and columns.",
    renderType: "table",
    supported: true,
    previewSupported: true,
    badges: ["Popular"],
    slots: [
      slot({ key: "x", label: "Primary Column", role: "dimension", required: true, helper: "Pick the main row label field.", description: "Creates the first column.", candidateKeys: ["x", "group", "y"], acceptedTypes: FIELD_TYPE_GROUPS.any }),
      slot({ key: "group", label: "Secondary Column", role: "dimension", helper: "Optional supporting column.", description: "Adds more detail per row.", candidateKeys: ["group", "x"], acceptedTypes: FIELD_TYPE_GROUPS.any }),
      slot({ key: "y", label: "Measure", role: "metric", helper: "Optional numeric summary field.", description: "Adds a summarized metric column.", candidateKeys: ["y", "size"], acceptedTypes: FIELD_TYPE_GROUPS.metric }),
    ],
  },
  {
    id: "pivot-table",
    name: "Pivot Table",
    shortName: "PT",
    category: "table",
    description: "Cross-tab style summary table.",
    renderType: "table",
    supported: true,
    previewSupported: true,
    experimental: true,
    slots: [
      slot({ key: "x", label: "Rows", role: "dimension", required: true, helper: "Pick a row grouping field.", description: "Creates each row group.", candidateKeys: ["x"], acceptedTypes: FIELD_TYPE_GROUPS.category }),
      slot({ key: "group", label: "Columns", role: "dimension", required: true, helper: "Pick a column grouping field.", description: "Creates the pivoted columns.", candidateKeys: ["group"], acceptedTypes: FIELD_TYPE_GROUPS.category }),
      slot({ key: "y", label: "Value", role: "metric", required: true, helper: "Pick a numeric measure.", description: "Controls each pivot cell value.", candidateKeys: ["y"], acceptedTypes: FIELD_TYPE_GROUPS.metric }),
    ],
  },
  {
    id: "candlestick",
    name: "Candlestick",
    shortName: "CS",
    category: "advanced",
    description: "OHLC financial price movement chart.",
    renderType: "candlestick",
    supported: false,
    previewSupported: false,
    disabledReason: "Candlestick needs open/high/low/close field mapping, which the builder does not expose yet.",
    slots: [
      slot({ key: "x", label: "Time", role: "time", required: true, helper: "Pick the time field.", description: "Defines each candle.", candidateKeys: ["x"], acceptedTypes: FIELD_TYPE_GROUPS.time }),
      slot({ key: "y", label: "OHLC", role: "metric", required: true, helper: "Requires open/high/low/close inputs.", description: "Financial fields are not available in the current builder.", candidateKeys: ["y"], acceptedTypes: FIELD_TYPE_GROUPS.metric }),
    ],
  },
  {
    id: "waterfall",
    name: "Waterfall",
    shortName: "WF",
    category: "advanced",
    description: "Show running contribution toward a final total.",
    renderType: "waterfall",
    supported: true,
    previewSupported: true,
    experimental: true,
    slots: [
      slot({ key: "x", label: "Step", role: "dimension", required: true, helper: "Pick the stage/category field.", description: "Creates each running step.", candidateKeys: ["x"], acceptedTypes: FIELD_TYPE_GROUPS.category }),
      slot({ key: "y", label: "Value", role: "metric", required: true, helper: "Pick a numeric measure.", description: "Controls each contribution amount.", candidateKeys: ["y"], acceptedTypes: FIELD_TYPE_GROUPS.metric }),
    ],
  },
  {
    id: "sankey",
    name: "Sankey",
    shortName: "SK",
    category: "advanced",
    description: "Show flow between stages or nodes.",
    renderType: "sankey",
    supported: false,
    previewSupported: false,
    disabledReason: "Sankey needs source-target flow mapping that is not available in the current builder.",
    experimental: true,
    slots: [
      slot({ key: "x", label: "Source", role: "dimension", required: true, helper: "Pick a source field.", description: "Defines the origin node.", candidateKeys: ["x"], acceptedTypes: FIELD_TYPE_GROUPS.category }),
      slot({ key: "group", label: "Target", role: "dimension", required: true, helper: "Pick a target field.", description: "Defines the destination node.", candidateKeys: ["group"], acceptedTypes: FIELD_TYPE_GROUPS.category }),
      slot({ key: "y", label: "Flow", role: "metric", required: true, helper: "Pick a numeric flow measure.", description: "Controls link width.", candidateKeys: ["y"], acceptedTypes: FIELD_TYPE_GROUPS.metric }),
    ],
  },
  {
    id: "theme-river",
    name: "Theme River",
    shortName: "TR",
    category: "advanced",
    description: "Layered stream graph for changing composition.",
    renderType: "theme-river",
    supported: false,
    previewSupported: false,
    disabledReason: "Theme river is hidden until the builder supports dense time-series preparation.",
    experimental: true,
    hidden: true,
    slots: [
      slot({ key: "x", label: "Time", role: "time", required: true, helper: "Pick a date field.", description: "Defines each time point.", candidateKeys: ["x"], acceptedTypes: FIELD_TYPE_GROUPS.time }),
      slot({ key: "group", label: "Series", role: "series", required: true, helper: "Pick a grouping field.", description: "Creates each stream.", candidateKeys: ["group"], acceptedTypes: FIELD_TYPE_GROUPS.category }),
      slot({ key: "y", label: "Value", role: "metric", required: true, helper: "Pick a numeric measure.", description: "Controls stream thickness.", candidateKeys: ["y"], acceptedTypes: FIELD_TYPE_GROUPS.metric }),
    ],
  },
];

const CHART_MAP = Object.fromEntries(CHART_CATALOG.map((chart) => [chart.id, chart]));

function createFieldMap(tableFields = []) {
  return new Map((tableFields ?? []).map((field) => [field.name, field.type]));
}

function isTypeCompatible(type, acceptedTypes = []) {
  if (!acceptedTypes?.length) return true;
  if (!type) return true;
  return acceptedTypes.includes(type);
}

function getFieldNameForSlot(config, slotKey) {
  switch (slotKey) {
    case "x":
      return config.x;
    case "y":
      return config.y;
    case "group":
      return config.groupBy;
    case "size":
      return config.sizeField;
    default:
      return null;
  }
}

function setSlotValue(nextState, slotKey, fieldName, fieldType) {
  if (slotKey === "x") {
    nextState.x = fieldName ?? null;
    nextState.xType = fieldType ?? null;
  }

  if (slotKey === "y") {
    nextState.y = fieldName ?? null;
    nextState.yType = fieldType ?? null;
  }

  if (slotKey === "group") {
    nextState.groupBy = fieldName ?? null;
  }

  if (slotKey === "size") {
    nextState.sizeField = fieldName ?? null;
    nextState.sizeType = fieldType ?? null;
  }
}

function getFieldTypeForSlot(config, slotKey, fieldMap) {
  const fieldName = getFieldNameForSlot(config, slotKey);
  if (!fieldName) return null;

  if (slotKey === "x") return config.xType ?? fieldMap.get(fieldName) ?? null;
  if (slotKey === "y") return config.yType ?? fieldMap.get(fieldName) ?? null;
  if (slotKey === "size") return config.sizeType ?? fieldMap.get(fieldName) ?? null;
  return fieldMap.get(fieldName) ?? null;
}

function buildFieldCandidates(config, fieldMap) {
  const normalized = normalizeChartConfig(config);
  return {
    x: { field: normalized.x, type: getFieldTypeForSlot(normalized, "x", fieldMap) },
    y: { field: normalized.y, type: getFieldTypeForSlot(normalized, "y", fieldMap) },
    group: { field: normalized.groupBy, type: getFieldTypeForSlot(normalized, "group", fieldMap) },
    size: { field: normalized.sizeField, type: getFieldTypeForSlot(normalized, "size", fieldMap) },
  };
}

function createDefaultsForType(type) {
  switch (type) {
    case "line":
    case "multi-line":
    case "area":
    case "stacked-area":
    case "step-line":
      return { smooth: false, showGrid: true, legendVisible: true };
    case "pie":
    case "donut":
    case "rose":
    case "progress-ring":
      return { showGrid: false, legendVisible: true };
    case "kpi":
    case "gauge":
      return { showGrid: false, legendVisible: false };
    default:
      return { smooth: false, showGrid: true, legendVisible: true };
  }
}

function createIssue(level, code, title, message, action) {
  return { level, code, title, message, action };
}

function roleForSlot(chartId, slotConfig) {
  const roleMap = {
    bar: { x: "category", y: "value", group: "series" },
    "grouped-bar": { x: "category", y: "value", group: "series" },
    "stacked-bar": { x: "category", y: "value", group: "series" },
    "horizontal-bar": { x: "category", y: "value", group: "series" },
    line: { x: "time", y: "value", group: "series" },
    "multi-line": { x: "time", y: "value", group: "series" },
    area: { x: "time", y: "value", group: "series" },
    "stacked-area": { x: "time", y: "value", group: "series" },
    "step-line": { x: "time", y: "value", group: "series" },
    histogram: { x: "value" },
    boxplot: { x: "category", y: "value" },
    violin: { x: "category", y: "value" },
    scatter: { x: "x", y: "y", group: "series" },
    bubble: { x: "x", y: "y", size: "size", group: "series" },
    pie: { x: "category", y: "value" },
    donut: { x: "category", y: "value" },
    rose: { x: "category", y: "value" },
    funnel: { x: "category", y: "value" },
    radar: { x: "category", y: "value", group: "series" },
    parallel: { x: "category", y: "value" },
    graph: { x: "source", group: "target", y: "value" },
    treemap: { group: "hierarchy", x: "hierarchy", y: "value" },
    sunburst: { group: "hierarchy", x: "hierarchy", y: "value" },
    heatmap: { x: "column", group: "row", y: "value" },
    "calendar-heatmap": { x: "time", y: "value" },
    kpi: { y: "value" },
    gauge: { y: "value" },
    "progress-ring": { y: "progress" },
    table: { x: "category", group: "detail", y: "value" },
    "pivot-table": { x: "row", group: "column", y: "value" },
    candlestick: { x: "time", y: "open" },
    waterfall: { x: "category", y: "value" },
    sankey: { x: "source", group: "target", y: "value" },
    "theme-river": { x: "time", group: "series", y: "value" },
  };

  return roleMap[chartId]?.[slotConfig.key] ?? slotConfig.role ?? slotConfig.key;
}

function buildFieldDefinition(chartId, slotConfig) {
  const roleKey = roleForSlot(chartId, slotConfig);
  return {
    key: slotConfig.key,
    role: roleKey,
    roleLabel: FIELD_ROLES[roleKey]?.label ?? slotConfig.label,
    label: slotConfig.label,
    required: Boolean(slotConfig.required),
    min: slotConfig.required ? 1 : 0,
    max: 1,
    acceptedTypes: slotConfig.acceptedTypes,
    helper: slotConfig.helper,
    description: slotConfig.description,
  };
}

function buildAllowedFieldTypes(chartMeta) {
  return chartMeta.slots.reduce((acc, slotConfig) => {
    const roleKey = roleForSlot(chartMeta.id, slotConfig);
    acc[roleKey] = slotConfig.acceptedTypes?.length
      ? slotConfig.acceptedTypes
      : FIELD_ROLES[roleKey]?.acceptedTypes ?? [];
    return acc;
  }, {});
}

function buildCompatibilityTags(chartMeta) {
  const tags = new Set([chartMeta.category, chartMeta.renderType, chartMeta.outputKind]);
  chartMeta.requiredFields.forEach((field) => tags.add(field.role));
  if (chartMeta.experimental) tags.add("experimental");
  if (!chartMeta.supported) tags.add("unsupported");
  return Array.from(tags);
}

function normalizeChartMeta(rawChart) {
  const requiredFields = rawChart.slots.filter((slotConfig) => slotConfig.required).map((slotConfig) => buildFieldDefinition(rawChart.id, slotConfig));
  const optionalFields = rawChart.slots.filter((slotConfig) => !slotConfig.required).map((slotConfig) => buildFieldDefinition(rawChart.id, slotConfig));

  return {
    ...rawChart,
    type: rawChart.renderType,
    subtype: rawChart.id === rawChart.renderType ? "basic" : rawChart.id.replace(`${rawChart.renderType}-`, ""),
    icon: rawChart.shortName,
    outputKind: "echarts",
    requiredFields,
    optionalFields,
    allowedFieldTypes: buildAllowedFieldTypes(rawChart),
    minFields: requiredFields.length,
    maxFields: rawChart.slots.length || null,
    defaultConfig: createDefaultsForType(rawChart.id),
    compatibilityTags: [],
  };
}

export function getBuilderChartCatalog({ includeHidden = false } = {}) {
  return (includeHidden ? [...CHART_CATALOG] : CHART_CATALOG.filter((chart) => !chart.hidden)).map((chart) => {
    const normalized = normalizeChartMeta(chart);
    return { ...normalized, compatibilityTags: buildCompatibilityTags(normalized) };
  });
}

export function getChartCategories() {
  return CHART_CATEGORIES.filter((category) =>
    category.id === "recommended" || getBuilderChartCatalog().some((chart) => chart.category === category.id)
  );
}

export function getChartsByCategory(category) {
  return getBuilderChartCatalog().filter((chart) => chart.category === category);
}

export function getChartMeta(type) {
  const normalized = normalizeChartMeta(CHART_MAP[type] ?? CHART_MAP.bar);
  return { ...normalized, compatibilityTags: buildCompatibilityTags(normalized) };
}

export function getSupportedCharts() {
  return getBuilderChartCatalog().filter((chart) => chart.supported);
}

export function getChartTypeLabel(type) {
  return getChartMeta(type).name;
}

export function getRequiredFieldsForType(type) {
  return getChartMeta(type).slots.filter((slotConfig) => slotConfig.required);
}

export function getOptionalFieldsForType(type) {
  return getChartMeta(type).slots.filter((slotConfig) => !slotConfig.required);
}

export function getCompatibleFieldMapping(type) {
  return getChartMeta(type).slots.map((slotConfig) => ({
    key: slotConfig.key,
    label: slotConfig.label,
    role: slotConfig.role,
    required: slotConfig.required,
    acceptedTypes: slotConfig.acceptedTypes,
  }));
}

export function getDefaultConfigForType(type, prevConfig = {}) {
  return {
    ...normalizeChartConfig(prevConfig),
    chartType: type,
    ...createDefaultsForType(type),
  };
}

export function normalizeBuilderConfigForType(type, prevConfig = {}, tableFields = []) {
  const previous = normalizeChartConfig(prevConfig);
  const chartMeta = getChartMeta(type);
  const fieldMap = createFieldMap(tableFields);
  const defaults = getDefaultConfigForType(type, previous);
  const candidates = buildFieldCandidates(previous, fieldMap);
  const nextState = {
    ...defaults,
    chartType: type,
    x: null,
    y: null,
    groupBy: null,
    sizeField: null,
    xType: null,
    yType: null,
    sizeType: null,
  };
  const usedFields = new Set();

  chartMeta.slots.forEach((slotConfig) => {
    const orderedCandidates = [
      candidates[slotConfig.key],
      ...slotConfig.candidateKeys.map((candidateKey) => candidates[candidateKey]).filter(Boolean),
    ];

    const matched = orderedCandidates.find((candidate) => {
      if (!candidate?.field || usedFields.has(candidate.field)) return false;
      return isTypeCompatible(candidate.type, slotConfig.acceptedTypes);
    });

    if (!matched?.field) return;

    usedFields.add(matched.field);
    setSlotValue(nextState, slotConfig.key, matched.field, matched.type ?? fieldMap.get(matched.field));
  });

  if (type === "bubble" && !nextState.sizeField && nextState.y) {
    nextState.sizeField = nextState.y;
    nextState.sizeType = nextState.yType;
  }

  if (["kpi", "gauge", "progress-ring"].includes(type)) {
    nextState.x = null;
    nextState.groupBy = null;
    nextState.sizeField = null;
    nextState.xType = null;
    nextState.sizeType = null;
  }

  if (["treemap", "sunburst"].includes(type)) {
    nextState.sizeField = null;
    nextState.sizeType = null;
  }

  return normalizeChartConfig(nextState);
}

export function validateChartConfigForBuilder(type, config = {}, tableFields = []) {
  const normalized = normalizeChartConfig({ ...config, chartType: type });
  const chartMeta = getChartMeta(type);
  const fieldMap = createFieldMap(tableFields);
  const blockers = [];
  const cautions = [];

  if (!chartMeta.supported) {
    blockers.push(
      createIssue(
        "error",
        "unsupported-chart",
        `${chartMeta.name} is not available yet`,
        chartMeta.disabledReason || "This chart type is not ready in the current builder.",
        "Choose a supported chart type or keep working with the current one."
      )
    );
  }

  chartMeta.slots.forEach((slotConfig) => {
    const fieldName = getFieldNameForSlot(normalized, slotConfig.key);
    const fieldType = getFieldTypeForSlot(normalized, slotConfig.key, fieldMap);

    if (!fieldName && slotConfig.required) {
      blockers.push(
        createIssue(
          "error",
          `missing-${slotConfig.key}`,
          `${slotConfig.label} is required`,
          `${chartMeta.name} needs ${slotConfig.label.toLowerCase()} before it can render correctly.`,
          slotConfig.helper
        )
      );
      return;
    }

    if (fieldName && !isTypeCompatible(fieldType, slotConfig.acceptedTypes)) {
      blockers.push(
        createIssue(
          "error",
          `invalid-${slotConfig.key}-type`,
          `${slotConfig.label} has the wrong field type`,
          `${chartMeta.name} expects ${slotConfig.acceptedTypes.join(" or ")} for ${slotConfig.label.toLowerCase()}.`,
          `Replace ${slotConfig.label.toLowerCase()} with a compatible field.`
        )
      );
    }
  });

  if (["line", "multi-line", "area", "stacked-area", "step-line"].includes(type) && normalized.x && normalized.xType && normalized.xType !== "date") {
    cautions.push(
      createIssue(
        "warning",
        "trend-non-time",
        `${chartMeta.name} works best with time or ordered data`,
        "This chart will still render, but date fields usually make trend analysis clearer.",
        "Use a date field on Sequence, or switch to a comparison chart for categorical data."
      )
    );
  }

  if (["pie", "donut", "rose", "funnel"].includes(type) && normalized.groupBy) {
    cautions.push(
      createIssue(
        "warning",
        "unused-series",
        "Series mapping is not used here",
        `${chartMeta.name} currently ignores the series mapping in Builder preview.`,
        "You can clear the extra field, or switch to a grouped comparison chart if you need series."
      )
    );
  }

  if (["treemap", "sunburst"].includes(type) && !normalized.groupBy) {
    cautions.push(
      createIssue(
        "warning",
        "single-level-hierarchy",
        `${chartMeta.name} is richer with a parent field`,
        "This will render as a single-level hierarchy until you map a parent grouping field.",
        "Add a parent field to create a deeper hierarchy."
      )
    );
  }

  if (["grouped-bar", "multi-line", "stacked-area", "pivot-table"].includes(type) && !normalized.groupBy) {
    blockers.push(
      createIssue(
        "error",
        "missing-series",
        `${chartMeta.name} needs a series field`,
        `${chartMeta.name} is designed to compare at least two series or pivoted groups.`,
        "Map a series/group field or switch to a single-series chart."
      )
    );
  }

  if (type === "bubble" && !normalized.sizeField) {
    blockers.push(
      createIssue(
        "error",
        "missing-size",
        "Bubble Size is required",
        "Bubble charts need a third numeric field for bubble size.",
        "Map a numeric field into Bubble Size or switch back to Scatter."
      )
    );
  }

  return {
    valid: blockers.length === 0,
    blockers,
    cautions,
    definition: {
      family: CHART_CATEGORIES.find((category) => category.id === chartMeta.category)?.label ?? "Chart",
      title: chartMeta.name,
      description: chartMeta.description,
    },
    meta: chartMeta,
  };
}

export function validateChartConfig(config = {}, tableFields = []) {
  const normalized = normalizeChartConfig(config);
  return validateChartConfigForBuilder(normalized.chartType, normalized, tableFields);
}

export function getRecommendedCharts(builderState = {}, tableFields = []) {
  const normalized = normalizeChartConfig(builderState);
  const fieldMap = createFieldMap(tableFields);
  const xType = normalized.xType ?? fieldMap.get(normalized.x);
  const yType = normalized.yType ?? fieldMap.get(normalized.y);
  const sizeType = normalized.sizeType ?? fieldMap.get(normalized.sizeField);
  const hasSeries = Boolean(normalized.groupBy);
  const recommendations = [];

  if (xType === "date" && yType === "number") {
    recommendations.push("line", "area", "step-line");
    if (hasSeries) recommendations.push("multi-line", "stacked-area");
  } else if (xType === "number" && yType === "number") {
    recommendations.push("scatter", "bubble");
  } else if (xType && yType === "number") {
    recommendations.push("bar", "horizontal-bar", "line");
    if (hasSeries) recommendations.push("grouped-bar", "stacked-bar", "multi-line", "radar");
    if (xType !== "date") recommendations.push("pie", "donut", "rose");
  } else if (!normalized.x && yType === "number") {
    recommendations.push("kpi", "gauge", "progress-ring");
  } else if (xType === "number" && !normalized.y) {
    recommendations.push("histogram", "kpi");
  } else if (normalized.x && normalized.groupBy && yType === "number") {
    recommendations.push("heatmap", "treemap", "sunburst", "pivot-table");
  } else if (normalized.x && !normalized.y) {
    recommendations.push("table", "bar");
  } else {
    recommendations.push("bar", "table", "line");
  }

  if (normalized.chartType) {
    recommendations.unshift(normalized.chartType);
  }

  if (sizeType === "number" && xType === "number" && yType === "number") {
    recommendations.unshift("bubble");
  }

  return Array.from(
    new Set(
      recommendations
        .map((type) => getChartMeta(type))
        .filter((chart) => chart && !chart.hidden)
        .map((chart) => chart.id)
    )
  ).map((type) => getChartMeta(type));
}

const PREVIEW_SAMPLE_BY_TYPE = {
  bar: {
    rows: [
      { category: "North", value: 128 },
      { category: "South", value: 92 },
      { category: "West", value: 154 },
      { category: "East", value: 111 },
    ],
    config: { x: "category", y: "value", title: "Regional sales" },
  },
  "grouped-bar": {
    rows: [
      { category: "Q1", series: "Plan", value: 80 },
      { category: "Q1", series: "Actual", value: 92 },
      { category: "Q2", series: "Plan", value: 96 },
      { category: "Q2", series: "Actual", value: 105 },
      { category: "Q3", series: "Plan", value: 101 },
      { category: "Q3", series: "Actual", value: 118 },
    ],
    config: { x: "category", y: "value", groupBy: "series", title: "Plan vs actual" },
  },
  "stacked-bar": {
    rows: [
      { category: "North", series: "A", value: 40 },
      { category: "North", series: "B", value: 26 },
      { category: "South", series: "A", value: 30 },
      { category: "South", series: "B", value: 44 },
      { category: "West", series: "A", value: 38 },
      { category: "West", series: "B", value: 22 },
    ],
    config: { x: "category", y: "value", groupBy: "series", title: "Contribution mix" },
  },
  "horizontal-bar": {
    rows: [
      { category: "Enterprise", value: 224 },
      { category: "Mid market", value: 176 },
      { category: "SMB", value: 128 },
    ],
    config: { x: "category", y: "value", title: "Segment pipeline" },
  },
  line: {
    rows: [
      { period: "Jan", value: 42 },
      { period: "Feb", value: 55 },
      { period: "Mar", value: 51 },
      { period: "Apr", value: 68 },
      { period: "May", value: 73 },
    ],
    config: { x: "period", y: "value", xLabel: "Month", yLabel: "Revenue" },
  },
  "multi-line": {
    rows: [
      { period: "Jan", series: "North", value: 20 },
      { period: "Jan", series: "South", value: 14 },
      { period: "Feb", series: "North", value: 26 },
      { period: "Feb", series: "South", value: 18 },
      { period: "Mar", series: "North", value: 32 },
      { period: "Mar", series: "South", value: 24 },
    ],
    config: { x: "period", y: "value", groupBy: "series" },
  },
  area: {
    rows: [
      { period: "Mon", value: 120 },
      { period: "Tue", value: 138 },
      { period: "Wed", value: 132 },
      { period: "Thu", value: 148 },
      { period: "Fri", value: 162 },
    ],
    config: { x: "period", y: "value" },
  },
  "stacked-area": {
    rows: [
      { period: "W1", series: "Ads", value: 28 },
      { period: "W1", series: "Organic", value: 18 },
      { period: "W2", series: "Ads", value: 34 },
      { period: "W2", series: "Organic", value: 22 },
      { period: "W3", series: "Ads", value: 38 },
      { period: "W3", series: "Organic", value: 26 },
    ],
    config: { x: "period", y: "value", groupBy: "series" },
  },
  "step-line": {
    rows: [
      { period: "1", value: 14 },
      { period: "2", value: 14 },
      { period: "3", value: 28 },
      { period: "4", value: 28 },
      { period: "5", value: 44 },
    ],
    config: { x: "period", y: "value" },
  },
  histogram: {
    rows: [
      { range: "0-10", count: 2 },
      { range: "10-20", count: 5 },
      { range: "20-30", count: 8 },
      { range: "30-40", count: 6 },
    ],
    config: { x: "range", y: "count", title: "Distribution" },
  },
  pie: {
    rows: [
      { category: "A", value: 42 },
      { category: "B", value: 28 },
      { category: "C", value: 18 },
      { category: "D", value: 12 },
    ],
    config: { x: "category", y: "value" },
  },
  donut: {
    rows: [
      { category: "Direct", value: 52 },
      { category: "Partner", value: 27 },
      { category: "Online", value: 21 },
    ],
    config: { x: "category", y: "value" },
  },
  rose: {
    rows: [
      { category: "Alpha", value: 16 },
      { category: "Beta", value: 24 },
      { category: "Gamma", value: 36 },
      { category: "Delta", value: 18 },
    ],
    config: { x: "category", y: "value" },
  },
  scatter: {
    rows: [
      { x: 12, y: 28 },
      { x: 18, y: 34 },
      { x: 25, y: 26 },
      { x: 32, y: 42 },
      { x: 41, y: 48 },
    ],
    config: { x: "x", y: "y", xLabel: "Spend", yLabel: "Revenue" },
  },
  bubble: {
    rows: [
      { x: 18, y: 22, size: 16 },
      { x: 22, y: 32, size: 24 },
      { x: 30, y: 28, size: 18 },
      { x: 38, y: 46, size: 32 },
    ],
    config: { x: "x", y: "y", sizeField: "size" },
  },
  radar: {
    rows: [
      { axis: "Quality", value: 82 },
      { axis: "Speed", value: 74 },
      { axis: "Cost", value: 65 },
      { axis: "Scale", value: 88 },
    ],
    config: { x: "axis", y: "value" },
  },
  gauge: {
    rows: [{ actual: 68, max: 100 }],
    config: { y: "actual", title: "Attainment" },
  },
  "progress-ring": {
    rows: [{ actual: 72, max: 100 }],
    config: { y: "actual", title: "Completion" },
  },
  funnel: {
    rows: [
      { stage: "Visit", value: 100 },
      { stage: "Lead", value: 72 },
      { stage: "Demo", value: 44 },
      { stage: "Won", value: 18 },
    ],
    config: { x: "stage", y: "value" },
  },
  treemap: {
    rows: [
      { category: "North", group: "Enterprise", value: 22 },
      { category: "South", group: "Enterprise", value: 18 },
      { category: "North", group: "SMB", value: 12 },
      { category: "South", group: "SMB", value: 10 },
    ],
    config: { x: "category", y: "value", groupBy: "group" },
  },
  sunburst: {
    rows: [
      { category: "Hardware", group: "Revenue", value: 54 },
      { category: "Software", group: "Revenue", value: 36 },
      { category: "Services", group: "Revenue", value: 24 },
    ],
    config: { x: "category", y: "value", groupBy: "group" },
  },
  waterfall: {
    rows: [
      { stage: "Start", value: 100 },
      { stage: "Upsell", value: 26 },
      { stage: "Churn", value: -18 },
      { stage: "Expansion", value: 21 },
    ],
    config: { x: "stage", y: "value" },
  },
};

export function getChartPreviewSeed(chartId) {
  const sample = PREVIEW_SAMPLE_BY_TYPE[chartId] ?? PREVIEW_SAMPLE_BY_TYPE.bar;
  return {
    rows: sample.rows,
    config: normalizeChartConfig({
      chartType: chartId,
      title: "",
      subtitle: "",
      colorTheme: "default",
      legendVisible: true,
      showGrid: true,
      showLabels: false,
      smooth: false,
      xLabel: "",
      yLabel: "",
      ...sample.config,
    }),
  };
}

export function switchBuilderChartType(nextType, currentConfig = {}, tableFields = []) {
  const nextConfig = normalizeBuilderConfigForType(nextType, currentConfig, tableFields);
  return {
    nextConfig,
    validation: validateChartConfigForBuilder(nextType, nextConfig, tableFields),
    meta: getChartMeta(nextType),
  };
}

export function preserveCompatibleFields(nextType, currentConfig = {}, tableFields = []) {
  return normalizeBuilderConfigForType(nextType, currentConfig, tableFields);
}

export function normalizeMappingForChartType(nextType, currentConfig = {}, tableFields = []) {
  return normalizeBuilderConfigForType(nextType, currentConfig, tableFields);
}
