/**
 * chartUtils.js
 * Color palettes, field type detection, and Ant Design Charts config builders.
 * Each chart type gets its own config builder for clean separation.
 *
 * EXTENSION: Pass theme/locale from user settings; add gradient stops per brand.
 * EXTENSION: Add plugin color themes here.
 */

// ─── Field type systems ──────────────────────────────────────────
export const TYPE_COLOR = {
  string:  "#52c41a",
  number:  "#1677ff",
  date:    "#fa8c16",
  boolean: "#722ed1",
};

export const TYPE_BADGE = {
  string:  "STR",
  number:  "NUM",
  date:    "DATE",
  boolean: "BOOL",
};

/** Guess field type from name heuristics. */
export function detectFieldType(name) {
  if (/date|time|year|month|period|cover|quarter/i.test(name)) return "date";
  if (/count|value|amount|total|sum|avg|num|price|score|rate|revenue|units|salary|impact|sessions|pageviews|bounce|size|cost|target|headcount|attrition|x_value|y_value|benchmark/i.test(name)) return "number";
  return "string";
}

// ─── Color Palettes ──────────────────────────────────────────────
export const COLOR_THEMES = {
  default: {
    label:    "Default",
    colors:   ["#1677ff","#36cfc9","#73d13d","#ffc53d","#ff7a45","#9254de","#f759ab","#40a9ff"],
    single:   "#1677ff",
    gradient: ["rgba(22,119,255,0.8)","rgba(22,119,255,0.05)"],
  },
  blue: {
    label:    "Blue",
    colors:   ["#2563eb", "#3b82f6", "#60a5fa", "#93c5fd", "#1d4ed8", "#0ea5e9", "#0284c7", "#38bdf8"],
    single:   "#2563eb",
    gradient: ["rgba(37,99,235,0.8)", "rgba(37,99,235,0.05)"],
  },
  green: {
    label:    "Green",
    colors:   ["#15803d", "#16a34a", "#22c55e", "#4ade80", "#65a30d", "#0f766e", "#14b8a6", "#84cc16"],
    single:   "#16a34a",
    gradient: ["rgba(22,163,74,0.8)", "rgba(22,163,74,0.05)"],
  },
  vibrant: {
    label:    "Vibrant",
    colors:   ["#ff4d4f","#ff7a00","#ffd600","#00c42b","#00b0f4","#6200ea","#d500f9","#00bcd4"],
    single:   "#ff4d4f",
    gradient: ["rgba(255,77,79,0.8)","rgba(255,77,79,0.05)"],
  },
  pastel: {
    label:    "Pastel",
    colors:   ["#aec6cf","#ffb347","#b0e57c","#ff6961","#b39ddb","#80deea","#f48fb1","#ffe082"],
    single:   "#aec6cf",
    gradient: ["rgba(174,198,207,0.8)","rgba(174,198,207,0.05)"],
  },
  dark: {
    label:    "Dark",
    colors:   ["#4fc3f7","#81c784","#ffb74d","#e57373","#ce93d8","#80cbc4","#fff176","#f48fb1"],
    single:   "#4fc3f7",
    gradient: ["rgba(79,195,247,0.8)","rgba(79,195,247,0.05)"],
  },
  ocean: {
    label:    "Ocean",
    colors:   ["#005f73","#0a9396","#94d2bd","#e9d8a6","#ee9b00","#ca6702","#bb3e03","#ae2012"],
    single:   "#0a9396",
    gradient: ["rgba(10,147,150,0.8)","rgba(10,147,150,0.05)"],
  },
  warm: {
    label:    "Warm",
    colors:   ["#e63946","#f4845f","#f4a261","#e9c46a","#2a9d8f","#264653","#e76f51","#d4a373"],
    single:   "#e63946",
    gradient: ["rgba(230,57,70,0.8)","rgba(230,57,70,0.05)"],
  },
  echarts: {
    label:    "ECharts Classic",
    colors:   ["#5470C6", "#91CC75", "#FAC858", "#EE6666", "#73C0DE", "#3BA272", "#FC8452", "#9A60B4"],
    single:   "#5470C6",
    gradient: ["rgba(84,112,198,0.8)", "rgba(84,112,198,0.05)"],
  },
};

export function getColorPalette(theme = "default") {
  return COLOR_THEMES[theme] ?? COLOR_THEMES.default;
}

/** Generate a gradient CSS string between two hex/rgba colors */
export function makeGradient(start, end, direction = "270deg") {
  return `l(${direction}) 0:${end} 1:${start}`;
}

// ─── Shared base config ──────────────────────────────────────────
function baseConfig(data, overrides = {}) {
  return {
    data,
    animation: { appear: { animation: "fade-in", duration: 400 } },
    autoFit:   true,
    padding:   "auto",
    theme:     "classic",
    tooltip:   { shared: true, showCrosshairs: true, showMarkers: true },
    interaction: { tooltip: { render: (e, { items }) => items } }, // Basic generic interaction
    ...overrides,
  };
}

// ─── Axis + Legend helpers ────────────────────────────────────────
function axisConfig(chart) {
  return {
    x: {
      label: { style: { fontSize:11 }, autoRotate:true },
      title: chart.xLabel || null,
    },
    y: {
      label: { style: { fontSize:11 } },
      grid:  chart.showGrid !== false,
      title: chart.yLabel  || null,
    },
  };
}

function legendConfig(chart) {
  if (chart.legendVisible === false) return false;
  return { position:"bottom", layout:"horizontal" };
}

// ─── Per-chart config builders ───────────────────────────────────
const builders = {
  line: (chart, data, palette) => baseConfig(data, {
    encode:  { x: chart.xField, y: chart.yField },
    style:   { stroke: palette.single, lineWidth: 2 },
    smooth:  chart.smooth !== false,
    axis:    axisConfig(chart),
    legend:  legendConfig(chart),
    tooltip: { shared: true },
  }),

  area: (chart, data, palette) => baseConfig(data, {
    encode:  { x: chart.xField, y: chart.yField },
    style:   { fill:`l(270) 0:${palette.gradient[1]} 1:${palette.gradient[0]}`, stroke: palette.single, lineWidth:2 },
    smooth:  chart.smooth !== false,
    axis:    axisConfig(chart),
    legend:  legendConfig(chart),
  }),

  bar: (chart, data, palette) => baseConfig(data, {
    encode:  { x: chart.xField, y: chart.yField, color: chart.groupField },
    style:   { fill: palette.single, minWidth:8, radiusTopLeft: 4, radiusTopRight: 4 },
    axis:    axisConfig(chart),
    legend:  legendConfig(chart),
    scale:   chart.groupField ? { color:{ range: palette.colors } } : {},
  }),

  stacked_bar: (chart, data, palette) => baseConfig(data, {
    encode:    { x: chart.xField, y: chart.yField, color: chart.groupField ?? chart.xField },
    transform: [{ type:"stackY" }],
    style:     { minWidth:8 },
    scale:     { color:{ range: palette.colors } },
    axis:      axisConfig(chart),
    legend:    legendConfig(chart),
  }),

  pie: (chart, data, palette) => ({
    data,
    encode:    { value: chart.yField, color: chart.xField },
    scale:     { color:{ range: palette.colors } },
    legend:    legendConfig(chart),
    tooltip:   { title: chart.xField, items: [chart.yField] },
    autoFit:   true,
    label:     { text:(d) => `${d[chart.xField]}: ${d[chart.yField]}`, position:"outside", style:{ fontSize:11 } },
    animation: { appear:{ animation:"fade-in", duration:400 } },
  }),

  donut: (chart, data, palette) => ({
    data,
    encode:      { value: chart.yField, color: chart.xField },
    scale:       { color:{ range: palette.colors } },
    legend:      legendConfig(chart),
    tooltip:     true,
    autoFit:     true,
    innerRadius: 0.5,
    label:       { text:(d) => d[chart.xField], position:"inside", style:{ fontSize:10, fill:"#fff" } },
    animation:   { appear:{ animation:"fade-in", duration:400 } },
    style:       { stroke:"var(--bg-surface)", lineWidth:2 },
  }),

  scatter: (chart, data, palette) => baseConfig(data, {
    encode:  { x: chart.xField, y: chart.yField, color: chart.groupField },
    style:   { fill: palette.single, r:6, fillOpacity:0.7, stroke: "#fff", lineWidth: 1 },
    scale:   chart.groupField ? { color:{ range: palette.colors } } : {},
    axis:    axisConfig(chart),
    legend:  legendConfig(chart),
  }),

  heatmap: null, // Custom HTML renderer
};

/**
 * Build the full Ant Design G2 v5 config for a given chart + data.
 * Returns null for custom-rendered chart types.
 */
export function buildChartConfig(chart, data, theme = "default") {
  const palette = getColorPalette(theme ?? chart.colorTheme ?? "default");
  const builder = builders[chart.type];
  if (!builder) return null;
  return builder(chart, data, palette);
}

/** Suggest a chart type based on field types (simple wrapper for chartSuggestion.js). */
export function suggestChartType(xType, yType) {
  if (xType === "date"   && yType === "number") return "line";
  if (xType === "string" && yType === "number") return "bar";
  if (xType === "number" && yType === "number") return "scatter";
  if (xType === "string" && yType === "string") return "heatmap";
  if (xType === "string" && !yType)             return "pie";
  return "bar";
}

export const DRILLDOWN_SUPPORTED_TYPES = new Set([
  "line",
  "multi-line",
  "area",
  "stacked-area",
  "step-line",
  "bar",
  "horizontal-bar",
  "grouped-bar",
  "stacked-bar",
  "pie",
  "donut",
  "rose",
  "scatter",
  "bubble",
  "heatmap",
  "radar",
  "funnel",
  "treemap",
  "sunburst",
  "waterfall",
]);

function toDisplayValue(value) {
  if (value === null || value === undefined || value === "") return "Unknown";
  return String(value);
}

export function canChartDrilldown(chart = {}) {
  return DRILLDOWN_SUPPORTED_TYPES.has(chart?.chartType ?? chart?.type);
}

export function describeDrilldown(drilldown) {
  if (!drilldown?.filters?.length) return "Detailed rows";

  return drilldown.filters
    .map((filter) => `${filter.field}: ${toDisplayValue(filter.value)}`)
    .join(" / ");
}

export function buildChartDrilldown(chart = {}, payload = {}) {
  const chartType = chart.chartType ?? chart.type;
  const xField = chart.x ?? chart.xField;
  const groupField = chart.groupBy ?? chart.groupField;

  if (!canChartDrilldown({ chartType })) return null;

  const filters = [];
  const payloadData = payload?.payload ?? payload?.datum ?? payload ?? {};

  if (chartType === "heatmap") {
    if (payload.rowField && payload.rowValue !== undefined) {
      filters.push({
        field: payload.rowField,
        value: payload.rowValue,
        label: `${payload.rowField}: ${toDisplayValue(payload.rowValue)}`,
      });
    }

    if (
      payload.columnField &&
      payload.columnValue !== undefined &&
      payload.columnField !== payload.rowField
    ) {
      filters.push({
        field: payload.columnField,
        value: payload.columnValue,
        label: `${payload.columnField}: ${toDisplayValue(payload.columnValue)}`,
      });
    }
  } else {
    if (xField && payloadData[xField] !== undefined) {
      filters.push({
        field: xField,
        value: payloadData[xField],
        label: `${xField}: ${toDisplayValue(payloadData[xField])}`,
      });
    }

    if (
      groupField &&
      payloadData[groupField] !== undefined &&
      !filters.some((filter) => filter.field === groupField)
    ) {
      filters.push({
        field: groupField,
        value: payloadData[groupField],
        label: `${groupField}: ${toDisplayValue(payloadData[groupField])}`,
      });
    }
  }

  if (!filters.length) return null;

  return {
    filters,
    label: describeDrilldown({ filters }),
  };
}
