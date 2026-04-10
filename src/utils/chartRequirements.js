import { CHART_SELECTOR_FAMILIES } from "./chartFamilies";

const TYPE_LABELS = {
  string: "Text",
  number: "Number",
  date: "Date",
  boolean: "Boolean",
};

const CATEGORY_TYPES = ["string", "date", "boolean", "number"];
const NUMERIC_TYPES = ["number", "string"];
const TIME_TYPES = ["date", "string"];
const ANY_TYPES = [];
const GEO_TYPES = ["string", "number"];

function createRoleDefinition(
  key,
  {
    label,
    description,
    emptyHint,
    acceptedTypes = ANY_TYPES,
    preserveFrom = [],
    slotBindings = [],
  } = {}
) {
  return {
    key,
    label,
    description,
    emptyHint,
    acceptedTypes,
    acceptedTypeLabel: acceptedTypes.length
      ? acceptedTypes.map((type) => TYPE_LABELS[type] ?? type).join(" / ")
      : "Any",
    preserveFrom: preserveFrom.length ? preserveFrom : [key],
    slotBindings,
  };
}

export const FIELD_ROLES = {
  category: createRoleDefinition("category", {
    label: "Category",
    description: "Primary dimension or label.",
    emptyHint: "Add a category field",
    acceptedTypes: CATEGORY_TYPES,
    preserveFrom: ["category", "x", "time", "date", "label", "row", "column", "hierarchy"],
    slotBindings: ["x"],
  }),
  value: createRoleDefinition("value", {
    label: "Value",
    description: "Primary numeric measure.",
    emptyHint: "Add a numeric value field",
    acceptedTypes: NUMERIC_TYPES,
    preserveFrom: ["value", "values", "y", "ys", "size", "progress", "targetValue", "open", "close", "low", "high"],
    slotBindings: ["y"],
  }),
  values: createRoleDefinition("values", {
    label: "Values",
    description: "Multiple numeric measures.",
    emptyHint: "Add one or more numeric value fields",
    acceptedTypes: NUMERIC_TYPES,
    preserveFrom: ["values", "value", "ys", "dimensions", "y"],
    slotBindings: ["y"],
  }),
  series: createRoleDefinition("series", {
    label: "Series",
    description: "Breakdown or comparison field.",
    emptyHint: "Add a series field",
    acceptedTypes: CATEGORY_TYPES,
    preserveFrom: ["series", "group", "category", "label", "detail", "target"],
    slotBindings: ["group"],
  }),
  x: createRoleDefinition("x", {
    label: "X Axis",
    description: "Horizontal numeric, time, or categorical field.",
    emptyHint: "Add an X field",
    acceptedTypes: [...NUMERIC_TYPES, ...CATEGORY_TYPES],
    preserveFrom: ["x", "category", "time", "date"],
    slotBindings: ["x"],
  }),
  y: createRoleDefinition("y", {
    label: "Y Axis",
    description: "Vertical numeric field.",
    emptyHint: "Add a Y field",
    acceptedTypes: NUMERIC_TYPES,
    preserveFrom: ["y", "value", "values", "ys", "size"],
    slotBindings: ["y"],
  }),
  ys: createRoleDefinition("ys", {
    label: "Y Measures",
    description: "Multiple Y-axis measures.",
    emptyHint: "Add one or more Y fields",
    acceptedTypes: NUMERIC_TYPES,
    preserveFrom: ["ys", "values", "value", "y", "dimensions"],
    slotBindings: ["y"],
  }),
  size: createRoleDefinition("size", {
    label: "Size",
    description: "Bubble or mark size metric.",
    emptyHint: "Add a size field",
    acceptedTypes: NUMERIC_TYPES,
    preserveFrom: ["size", "value", "y"],
    slotBindings: ["size"],
  }),
  time: createRoleDefinition("time", {
    label: "Time",
    description: "Date or ordered time field.",
    emptyHint: "Add a time field",
    acceptedTypes: TIME_TYPES,
    preserveFrom: ["time", "date", "x", "category"],
    slotBindings: ["x"],
  }),
  date: createRoleDefinition("date", {
    label: "Date",
    description: "Calendar or date field.",
    emptyHint: "Add a date field",
    acceptedTypes: TIME_TYPES,
    preserveFrom: ["date", "time", "x", "category"],
    slotBindings: ["x"],
  }),
  hierarchy: createRoleDefinition("hierarchy", {
    label: "Hierarchy",
    description: "One or more hierarchy levels.",
    emptyHint: "Add one or more hierarchy fields",
    acceptedTypes: CATEGORY_TYPES,
    preserveFrom: ["hierarchy", "category", "series", "row", "column", "label"],
    slotBindings: ["x", "group"],
  }),
  source: createRoleDefinition("source", {
    label: "Source",
    description: "Origin node or location.",
    emptyHint: "Add a source field",
    acceptedTypes: CATEGORY_TYPES,
    preserveFrom: ["source", "category", "x", "row", "node"],
    slotBindings: ["x"],
  }),
  target: createRoleDefinition("target", {
    label: "Target",
    description: "Destination node or location.",
    emptyHint: "Add a target field",
    acceptedTypes: CATEGORY_TYPES,
    preserveFrom: ["target", "series", "group", "column", "category", "edge"],
    slotBindings: ["group"],
  }),
  region: createRoleDefinition("region", {
    label: "Region",
    description: "Map region or location key field.",
    emptyHint: "Add a region field",
    acceptedTypes: GEO_TYPES,
    preserveFrom: ["region", "geo", "category", "label", "x"],
    slotBindings: ["x"],
  }),
  label: createRoleDefinition("label", {
    label: "Label",
    description: "Display label for marks or nodes.",
    emptyHint: "Add a label field",
    acceptedTypes: CATEGORY_TYPES,
    preserveFrom: ["label", "category", "detail", "series"],
  }),
  detail: createRoleDefinition("detail", {
    label: "Detail",
    description: "Additional detail field.",
    emptyHint: "Add a detail field",
    acceptedTypes: ANY_TYPES,
    preserveFrom: ["detail", "category", "series", "label"],
  }),
  targetValue: createRoleDefinition("targetValue", {
    label: "Target",
    description: "Optional target or maximum value.",
    emptyHint: "Add a target value field",
    acceptedTypes: NUMERIC_TYPES,
    preserveFrom: ["targetValue", "progress", "value", "max"],
  }),
  open: createRoleDefinition("open", {
    label: "Open",
    description: "Open value for OHLC data.",
    emptyHint: "Add an open field",
    acceptedTypes: NUMERIC_TYPES,
    preserveFrom: ["open", "value", "y"],
  }),
  close: createRoleDefinition("close", {
    label: "Close",
    description: "Close value for OHLC data.",
    emptyHint: "Add a close field",
    acceptedTypes: NUMERIC_TYPES,
    preserveFrom: ["close", "value", "y"],
  }),
  low: createRoleDefinition("low", {
    label: "Low",
    description: "Low value for OHLC data.",
    emptyHint: "Add a low field",
    acceptedTypes: NUMERIC_TYPES,
    preserveFrom: ["low", "min", "value", "y"],
  }),
  high: createRoleDefinition("high", {
    label: "High",
    description: "High value for OHLC data.",
    emptyHint: "Add a high field",
    acceptedTypes: NUMERIC_TYPES,
    preserveFrom: ["high", "max", "value", "y"],
  }),
  min: createRoleDefinition("min", {
    label: "Min",
    description: "Minimum value.",
    emptyHint: "Add a min field",
    acceptedTypes: NUMERIC_TYPES,
    preserveFrom: ["min", "low", "value", "y"],
  }),
  q1: createRoleDefinition("q1", {
    label: "Q1",
    description: "First quartile value.",
    emptyHint: "Add a Q1 field",
    acceptedTypes: NUMERIC_TYPES,
    preserveFrom: ["q1", "value", "y"],
  }),
  median: createRoleDefinition("median", {
    label: "Median",
    description: "Median or Q2 value.",
    emptyHint: "Add a median field",
    acceptedTypes: NUMERIC_TYPES,
    preserveFrom: ["median", "value", "y"],
  }),
  q3: createRoleDefinition("q3", {
    label: "Q3",
    description: "Third quartile value.",
    emptyHint: "Add a Q3 field",
    acceptedTypes: NUMERIC_TYPES,
    preserveFrom: ["q3", "value", "y"],
  }),
  max: createRoleDefinition("max", {
    label: "Max",
    description: "Maximum value.",
    emptyHint: "Add a max field",
    acceptedTypes: NUMERIC_TYPES,
    preserveFrom: ["max", "high", "targetValue", "value", "y"],
  }),
  nodes: createRoleDefinition("nodes", {
    label: "Nodes",
    description: "Node id or grouping fields.",
    emptyHint: "Add node fields",
    acceptedTypes: CATEGORY_TYPES,
    preserveFrom: ["nodes", "node", "source", "target", "label"],
  }),
  edges: createRoleDefinition("edges", {
    label: "Edges",
    description: "Edge or relationship fields.",
    emptyHint: "Add edge fields",
    acceptedTypes: CATEGORY_TYPES,
    preserveFrom: ["edges", "edge", "source", "target", "series"],
  }),
  dimensions: createRoleDefinition("dimensions", {
    label: "Dimensions",
    description: "Multiple numeric dimensions.",
    emptyHint: "Add two or more numeric dimensions",
    acceptedTypes: NUMERIC_TYPES,
    preserveFrom: ["dimensions", "values", "ys", "value", "x", "y", "size"],
  }),
  custom: createRoleDefinition("custom", {
    label: "Custom Input",
    description: "Advanced raw input for custom series.",
    emptyHint: "Add raw fields for the custom series",
    acceptedTypes: ANY_TYPES,
    preserveFrom: ["custom", "detail", "category", "value", "values", "dimensions"],
  }),
  progress: createRoleDefinition("progress", {
    label: "Progress",
    description: "Progress value for KPI / ring charts.",
    emptyHint: "Add a progress field",
    acceptedTypes: NUMERIC_TYPES,
    preserveFrom: ["progress", "targetValue", "value", "y"],
    slotBindings: ["y"],
  }),
  row: createRoleDefinition("row", {
    label: "Row",
    description: "Heatmap or matrix row field.",
    emptyHint: "Add a row field",
    acceptedTypes: CATEGORY_TYPES,
    preserveFrom: ["row", "category", "series", "hierarchy"],
    slotBindings: ["group"],
  }),
  column: createRoleDefinition("column", {
    label: "Column",
    description: "Heatmap or matrix column field.",
    emptyHint: "Add a column field",
    acceptedTypes: CATEGORY_TYPES,
    preserveFrom: ["column", "category", "x", "hierarchy"],
    slotBindings: ["x"],
  }),
  geo: createRoleDefinition("geo", {
    label: "Geo",
    description: "Region or map key field.",
    emptyHint: "Add a region field",
    acceptedTypes: GEO_TYPES,
    preserveFrom: ["geo", "region", "category", "label", "x"],
    slotBindings: ["x"],
  }),
  geoFrom: createRoleDefinition("geoFrom", {
    label: "Geo From",
    description: "Start geography field.",
    emptyHint: "Add a from-region field",
    acceptedTypes: GEO_TYPES,
    preserveFrom: ["geoFrom", "source", "x"],
    slotBindings: ["x"],
  }),
  geoTo: createRoleDefinition("geoTo", {
    label: "Geo To",
    description: "End geography field.",
    emptyHint: "Add a to-region field",
    acceptedTypes: GEO_TYPES,
    preserveFrom: ["geoTo", "target", "group"],
    slotBindings: ["group"],
  }),
};

function role(key, overrides = {}) {
  const base = FIELD_ROLES[key] ?? createRoleDefinition(key, { label: key, emptyHint: `Add ${key}` });
  const min = overrides.min ?? (overrides.required ? 1 : 0);
  const max = overrides.max ?? 1;
  const acceptedTypes = overrides.acceptedTypes ?? base.acceptedTypes;

  return {
    ...base,
    ...overrides,
    key,
    min,
    max,
    required: Boolean(overrides.required),
    acceptedTypes,
    acceptedTypeLabel: acceptedTypes.length
      ? acceptedTypes.map((type) => TYPE_LABELS[type] ?? type).join(" / ")
      : "Any",
    preserveFrom: overrides.preserveFrom ?? base.preserveFrom,
    slotBindings: overrides.slotBindings ?? base.slotBindings ?? [],
  };
}

function chartRequirements(id, roles, notes = []) {
  const required = roles.filter((item) => item.required);
  return {
    chartId: id,
    roles,
    roleKeys: roles.map((item) => item.key),
    required,
    optional: roles.filter((item) => !item.required),
    multiFieldRoles: roles.filter((item) => (item.max ?? 1) > 1 || item.max == null).map((item) => item.key),
    autoMapOrder: roles
      .slice()
      .sort((left, right) => {
        if (left.required !== right.required) return left.required ? -1 : 1;
        return (right.min ?? 0) - (left.min ?? 0);
      })
      .map((item) => item.key),
    requiredFields: required.map((item) => ({
      key: item.key,
      role: item.key,
      label: item.label,
      roleLabel: item.label,
      acceptedTypes: item.acceptedTypes,
      min: item.min,
      max: item.max,
    })),
    optionalFields: roles
      .filter((item) => !item.required)
      .map((item) => ({
        key: item.key,
        role: item.key,
        label: item.label,
        roleLabel: item.label,
        acceptedTypes: item.acceptedTypes,
        min: item.min,
        max: item.max,
      })),
    allowedFieldTypes: Object.fromEntries(roles.map((item) => [item.key, item.acceptedTypes])),
    minFields: required.reduce((sum, item) => sum + item.min, 0),
    maxFields: roles.reduce((sum, item) => sum + (item.max ?? 0), 0),
    minimumRoleCount: required.length,
    notes,
  };
}

export const CHART_REQUIREMENTS = {
  bar: chartRequirements("bar", [
    role("category", { required: true }),
    role("value", { required: true }),
    role("values", { min: 0, max: 4 }),
    role("series"),
  ]),
  "grouped-bar": chartRequirements("grouped-bar", [
    role("category", { required: true }),
    role("value", { required: true }),
    role("values", { min: 0, max: 4 }),
    role("series"),
  ], ["Grouped bar supports either category + value + series or category + multiple value fields."]),
  "stacked-bar": chartRequirements("stacked-bar", [
    role("category", { required: true }),
    role("value", { required: true }),
    role("values", { min: 0, max: 4 }),
    role("series"),
  ], ["Stacked bar supports category + value + series and can also use multiple measures as stacked bands."]),
  "horizontal-bar": chartRequirements("horizontal-bar", [
    role("category", { required: true }),
    role("value", { required: true }),
    role("values", { min: 0, max: 4 }),
    role("series"),
  ]),
  waterfall: chartRequirements("waterfall", [
    role("category", { required: true }),
    role("value", { required: true }),
  ]),
  "bar-racing": chartRequirements("bar-racing", [
    role("category", { required: true }),
    role("value", { required: true }),
    role("time", { required: true, slotBindings: ["group"] }),
  ], ["Bar racing works best with a time field and a single metric per frame."]),
  "pictorial-bar": chartRequirements("pictorial-bar", [
    role("category", { required: true }),
    role("value", { required: true }),
    role("series"),
  ]),
  line: chartRequirements("line", [
    role("x", { required: true }),
    role("y", { required: true }),
    role("ys", { min: 0, max: 5 }),
    role("series"),
  ]),
  "multi-line": chartRequirements("multi-line", [
    role("x", { required: true }),
    role("y", { required: true }),
    role("ys", { min: 0, max: 5 }),
    role("series"),
  ], ["Multi line supports either X + Y + series or X + multiple Y fields."]),
  "smooth-line": chartRequirements("smooth-line", [
    role("x", { required: true }),
    role("y", { required: true }),
    role("ys", { min: 0, max: 5 }),
    role("series"),
  ]),
  "step-line": chartRequirements("step-line", [
    role("x", { required: true }),
    role("y", { required: true }),
    role("ys", { min: 0, max: 5 }),
    role("series"),
  ]),
  area: chartRequirements("area", [
    role("x", { required: true }),
    role("y", { required: true }),
    role("ys", { min: 0, max: 5 }),
    role("series"),
  ]),
  "stacked-line": chartRequirements("stacked-line", [
    role("x", { required: true }),
    role("y", { required: true }),
    role("ys", { min: 0, max: 5 }),
    role("series"),
  ], ["Stacked line preserves grouped or multi-measure mappings and previews with a safe grouped-line fallback."]),
  "stacked-area": chartRequirements("stacked-area", [
    role("x", { required: true }),
    role("y", { required: true }),
    role("ys", { min: 0, max: 5 }),
    role("series"),
  ]),
  pie: chartRequirements("pie", [
    role("category", { required: true }),
    role("value", { required: true }),
    role("label"),
  ]),
  donut: chartRequirements("donut", [
    role("category", { required: true }),
    role("value", { required: true }),
    role("label"),
  ]),
  rose: chartRequirements("rose", [
    role("category", { required: true }),
    role("value", { required: true }),
    role("label"),
  ]),
  scatter: chartRequirements("scatter", [
    role("x", { required: true, acceptedTypes: NUMERIC_TYPES, slotBindings: ["x"] }),
    role("y", { required: true }),
    role("size"),
    role("series"),
    role("label"),
  ]),
  "effect-scatter": chartRequirements("effect-scatter", [
    role("x", { required: true, acceptedTypes: NUMERIC_TYPES, slotBindings: ["x"] }),
    role("y", { required: true }),
    role("size"),
    role("series"),
    role("label"),
  ]),
  bubble: chartRequirements("bubble", [
    role("x", { required: true, acceptedTypes: NUMERIC_TYPES, slotBindings: ["x"] }),
    role("y", { required: true }),
    role("size", { required: true }),
    role("series"),
    role("label"),
  ]),
  radar: chartRequirements("radar", [
    role("category", { required: true, label: "Indicator" }),
    role("value", { required: true }),
    role("series"),
    role("values", { min: 0, max: 4 }),
  ]),
  heatmap: chartRequirements("heatmap", [
    role("column", { required: true }),
    role("row", { required: true }),
    role("value", { required: true }),
    role("series"),
  ]),
  matrix: chartRequirements("matrix", [
    role("column", { required: true }),
    role("row", { required: true }),
    role("value", { required: true }),
    role("series"),
    role("label"),
  ]),
  tree: chartRequirements("tree", [
    role("hierarchy", { required: true, min: 1, max: 4 }),
    role("value"),
    role("label"),
  ]),
  treemap: chartRequirements("treemap", [
    role("hierarchy", { required: true, min: 1, max: 4 }),
    role("value", { required: true }),
    role("label"),
  ]),
  sunburst: chartRequirements("sunburst", [
    role("hierarchy", { required: true, min: 1, max: 4 }),
    role("value", { required: true }),
    role("label"),
  ]),
  sankey: chartRequirements("sankey", [
    role("source", { required: true }),
    role("target", { required: true }),
    role("value", { required: true }),
    role("label"),
  ]),
  "theme-river": chartRequirements("theme-river", [
    role("time", { required: true }),
    role("series", { required: true, label: "Category" }),
    role("value", { required: true }),
  ]),
  calendar: chartRequirements("calendar", [
    role("date", { required: true }),
    role("value", { required: true }),
    role("series"),
    role("label"),
  ]),
  lines: chartRequirements("lines", [
    role("geoFrom", { required: true }),
    role("geoTo", { required: true }),
    role("value"),
    role("series"),
  ], ["Geo lines preview is preserved with a safe path-style fallback when a geo layer is unavailable."]),
  graph: chartRequirements("graph", [
    role("source", { required: true }),
    role("target", { required: true }),
    role("value"),
    role("series"),
    role("size"),
    role("label"),
    role("nodes", { min: 0, max: 3 }),
    role("edges", { min: 0, max: 3 }),
  ]),
  boxplot: chartRequirements("boxplot", [
    role("category", { required: true }),
    role("value", { required: true, label: "Raw Value" }),
    role("min"),
    role("q1"),
    role("median"),
    role("q3"),
    role("max"),
  ], ["Boxplot can use one raw value field or optional precomputed min/Q1/median/Q3/max columns when available."]),
  parallel: chartRequirements("parallel", [
    role("dimensions", { required: true, min: 2, max: 8 }),
    role("series"),
  ]),
  candlestick: chartRequirements("candlestick", [
    role("time", { required: true }),
    role("open", { required: true }),
    role("close", { required: true }),
    role("low", { required: true }),
    role("high", { required: true }),
  ], ["Candlestick preview requires raw row fields for OHLC data."]),
  gauge: chartRequirements("gauge", [
    role("value", { required: true }),
    role("detail"),
    role("label"),
    role("targetValue"),
  ]),
  "progress-ring": chartRequirements("progress-ring", [
    role("progress", { required: true }),
    role("detail"),
    role("label"),
    role("targetValue"),
  ]),
  funnel: chartRequirements("funnel", [
    role("category", { required: true }),
    role("value", { required: true }),
    role("label"),
  ]),
  map: chartRequirements("map", [
    role("region", { required: true }),
    role("value", { required: true }),
    role("label"),
  ], ["Map preview needs a registered map or geoJSON in the runtime."]),
  custom: chartRequirements("custom", [
    role("custom", { required: true, min: 1, max: 6 }),
    role("value"),
    role("detail"),
    role("label"),
  ], ["Custom series are mapped safely, but advanced variants still rely on custom runtime logic."]),
  histogram: chartRequirements("histogram", [
    role("value", { required: true, label: "Value Field", slotBindings: ["x"] }),
  ]),
  kpi: chartRequirements("kpi", [
    role("value", { required: true }),
    role("detail"),
    role("label"),
    role("targetValue"),
  ]),
  table: chartRequirements("table", [
    role("category"),
    role("detail", { min: 0, max: 4 }),
    role("value"),
    role("values", { min: 0, max: 6 }),
  ]),
  "pivot-table": chartRequirements("pivot-table", [
    role("row", { required: true }),
    role("column", { required: true }),
    role("value", { required: true }),
    role("values", { min: 0, max: 4 }),
  ]),
};

function aliasRequirements(id, baseId, notes = []) {
  const base = CHART_REQUIREMENTS[baseId];
  return chartRequirements(
    id,
    base.roles.map((item) => ({ ...item })),
    [...(base.notes ?? []), ...notes]
  );
}

function unique(items = []) {
  return Array.from(new Set(items.filter(Boolean)));
}

function createVariantRequirements(variant) {
  const baseId = variant.chartId;
  const base = CHART_REQUIREMENTS[baseId] ?? CHART_REQUIREMENTS.bar;
  const requiredSet = new Set(variant.requiredRoles ?? []);
  const optionalSet = new Set(variant.optionalRoles ?? []);
  const orderedRoleKeys = unique([
    ...(variant.requiredRoles ?? []),
    ...(variant.optionalRoles ?? []),
    ...base.roles.map((item) => item.key),
  ]);

  const roles = orderedRoleKeys.map((roleKey) => {
    const baseRole = base.roles.find((item) => item.key === roleKey) ?? FIELD_ROLES[roleKey];
    const required = requiredSet.has(roleKey) || (!requiredSet.size && (baseRole?.required ?? false));

    return role(roleKey, {
      ...(baseRole ?? {}),
      required,
      min: required ? Math.max(baseRole?.min ?? 1, 1) : 0,
      max: baseRole?.max,
      label: baseRole?.label,
      description: baseRole?.description,
      emptyHint: baseRole?.emptyHint,
      acceptedTypes: baseRole?.acceptedTypes,
      preserveFrom: baseRole?.preserveFrom,
      slotBindings: baseRole?.slotBindings,
    });
  });

  return chartRequirements(
    variant.id,
    roles,
    unique([
      ...(base.notes ?? []),
      variant.supportLevel === "metadata-ready"
        ? `${variant.label} is metadata-ready and will safely fall back to ${baseId}.`
        : null,
      variant.supportLevel === "partial"
        ? `${variant.label} renders through the ${baseId} strategy with limited customization.`
        : null,
    ])
  );
}

[
  ["styled-bar", "bar"],
  ["background-bar", "bar"],
  ["negative-bar", "bar"],
  ["sorted-bar", "bar"],
  ["mixed-line-bar", "grouped-bar"],
  ["half-donut", "donut"],
  ["nested-pie", "donut"],
  ["special-label-pie", "pie"],
  ["scrollable-pie", "pie"],
  ["geo-scatter", "scatter"],
  ["calendar-scatter", "scatter"],
  ["large-scatter", "scatter"],
  ["simple-gauge", "gauge"],
  ["speed-gauge", "gauge"],
  ["ring-gauge", "progress-ring"],
  ["stage-gauge", "gauge"],
  ["barometer-gauge", "gauge"],
  ["vertical-sankey", "sankey"],
  ["gradient-sankey", "sankey"],
  ["dependency-graph", "graph"],
  ["force-graph", "graph"],
  ["geo-graph", "graph"],
  ["radial-tree", "tree"],
  ["left-right-tree", "tree"],
  ["basic-treemap", "treemap"],
  ["gradient-treemap", "treemap"],
  ["rounded-sunburst", "sunburst"],
  ["calendar-heatmap", "calendar"],
  ["correlation-matrix", "matrix"],
  ["confusion-matrix", "matrix"],
  ["chord", "graph"],
  ["dataset-bar", "bar"],
  ["dataset-line", "line"],
  ["dataset-pie", "pie"],
  ["datazoom-line", "line"],
  ["datazoom-bar", "bar"],
  ["graphic-line", "line"],
  ["graphic-bar", "bar"],
  ["rich-text-pie", "pie"],
  ["rich-text-donut", "donut"],
  ["map-lines", "lines"],
  ["ohlc", "candlestick"],
  ["candlestick-large", "candlestick"],
].forEach(([id, baseId]) => {
  CHART_REQUIREMENTS[id] = aliasRequirements(id, baseId);
});

CHART_REQUIREMENTS["geo-map"] = aliasRequirements("geo-map", "map");
CHART_REQUIREMENTS["dataset-matrix"] = chartRequirements("dataset-matrix", [
  role("column", { required: true }),
  role("row", { required: true }),
  role("value", { required: true }),
  role("label"),
], ["Dataset matrix keeps matrix-style mapping while surfacing dataset-oriented presets."]);
CHART_REQUIREMENTS["custom-gantt"] = chartRequirements("custom-gantt", [
  role("category", { required: true }),
  role("time", { required: true, label: "Start" }),
  role("target", { required: true, label: "End" }),
  role("value"),
  role("detail"),
], ["Custom gantt is mapped safely and previews through a timeline-style fallback."]);
CHART_REQUIREMENTS["rich-text-kpi"] = chartRequirements("rich-text-kpi", [
  role("value", { required: true }),
  role("detail"),
  role("label"),
  role("targetValue"),
], ["Rich text KPI uses the same saveable metric mapping with enhanced label metadata."]);
CHART_REQUIREMENTS["dataset-pivot"] = aliasRequirements("dataset-pivot", "pivot-table");

[
  "globe-3d",
  "bar-3d",
  "scatter-3d",
  "surface-3d",
  "map-3d",
  "lines-3d",
  "scatter-gl",
  "lines-gl",
  "flow-gl",
  "graph-gl",
].forEach((id) => {
  CHART_REQUIREMENTS[id] = chartRequirements(id, [
    role("x"),
    role("y"),
    role("value"),
    role("series"),
    role("region"),
  ], ["This family is cataloged for future runtime support and preserves compatible mappings safely."]);
});

CHART_SELECTOR_FAMILIES.forEach((family) => {
  (family.variants ?? []).forEach((variant) => {
    if (CHART_REQUIREMENTS[variant.id]) return;
    CHART_REQUIREMENTS[variant.id] = createVariantRequirements(variant);
  });
});

const DEFAULT_REQUIREMENTS = CHART_REQUIREMENTS.bar;

export function getChartRequirements(chartId) {
  return CHART_REQUIREMENTS[chartId] ?? DEFAULT_REQUIREMENTS;
}

export function getFieldRole(roleKey) {
  return FIELD_ROLES[roleKey] ?? null;
}

export function listChartRequirements() {
  return Object.values(CHART_REQUIREMENTS);
}
