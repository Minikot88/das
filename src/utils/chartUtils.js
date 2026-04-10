import { getChartPalette } from "./chartPalette";

export const TYPE_COLOR = {
  string: "#52c41a",
  number: "#1677ff",
  date: "#fa8c16",
  boolean: "#722ed1",
};

export const TYPE_BADGE = {
  string: "STR",
  number: "NUM",
  date: "DATE",
  boolean: "BOOL",
};

export function detectFieldType(name) {
  if (/date|time|year|month|period|cover|quarter/i.test(name)) return "date";
  if (/count|value|amount|total|sum|avg|num|price|score|rate|revenue|units|salary|impact|sessions|pageviews|bounce|size|cost|target|headcount|attrition|x_value|y_value|benchmark/i.test(name)) return "number";
  return "string";
}

export const COLOR_THEMES = {
  default: { label: "Default" },
  cool: { label: "Cool" },
  warm: { label: "Warm" },
  executive: { label: "Executive" },
  blue: { label: "น้ำเงิน" },
  green: { label: "เขียว" },
  echarts: { label: "ECharts Classic" },
  "echarts-classic": { label: "ECharts Classic" },
};

export function getColorPalette(theme = "default") {
  return getChartPalette(theme);
}

export function makeGradient(start, end, direction = "270deg") {
  return `l(${direction}) 0:${end} 1:${start}`;
}

function baseConfig(data, overrides = {}) {
  return {
    data,
    animation: { appear: { animation: "fade-in", duration: 400 } },
    autoFit: true,
    padding: "auto",
    theme: "classic",
    tooltip: { shared: true, showCrosshairs: true, showMarkers: true },
    interaction: { tooltip: { render: (e, { items }) => items } },
    ...overrides,
  };
}

function axisConfig(chart) {
  return {
    x: {
      label: { style: { fontSize: 11 }, autoRotate: true },
      title: chart.xLabel || null,
    },
    y: {
      label: { style: { fontSize: 11 } },
      grid: chart.showGrid !== false,
      title: chart.yLabel || null,
    },
  };
}

function legendConfig(chart) {
  if (chart.legendVisible === false) return false;
  return { position: "bottom", layout: "horizontal" };
}

const builders = {
  line: (chart, data, palette) => baseConfig(data, {
    encode: { x: chart.xField, y: chart.yField },
    style: { stroke: palette.single, lineWidth: 2 },
    smooth: chart.smooth !== false,
    axis: axisConfig(chart),
    legend: legendConfig(chart),
    tooltip: { shared: true },
  }),
  area: (chart, data, palette) => baseConfig(data, {
    encode: { x: chart.xField, y: chart.yField },
    style: { fill: `l(270) 0:rgba(37,99,235,0.06) 1:${palette.single}`, stroke: palette.single, lineWidth: 2 },
    smooth: chart.smooth !== false,
    axis: axisConfig(chart),
    legend: legendConfig(chart),
  }),
  bar: (chart, data, palette) => baseConfig(data, {
    encode: { x: chart.xField, y: chart.yField, color: chart.groupField },
    style: { fill: palette.single, minWidth: 8, radiusTopLeft: 4, radiusTopRight: 4 },
    axis: axisConfig(chart),
    legend: legendConfig(chart),
    scale: chart.groupField ? { color: { range: palette.colors } } : {},
  }),
  heatmap: null,
};

export function buildChartConfig(chart, data, theme = "default") {
  const palette = getColorPalette(theme ?? chart.colorTheme ?? "default");
  const builder = builders[chart.type];
  if (!builder) return null;
  return builder(chart, data, palette);
}

export function suggestChartType(xType, yType) {
  if (xType === "date" && yType === "number") return "line";
  if (xType === "string" && yType === "number") return "bar";
  if (xType === "number" && yType === "number") return "scatter";
  if (xType === "string" && yType === "string") return "heatmap";
  if (xType === "string" && !yType) return "pie";
  return "bar";
}

export const DRILLDOWN_SUPPORTED_TYPES = new Set([
  "line", "multi-line", "area", "stacked-area", "step-line", "bar", "horizontal-bar", "grouped-bar",
  "stacked-bar", "pie", "donut", "rose", "scatter", "bubble", "heatmap", "radar", "funnel",
  "treemap", "sunburst", "waterfall",
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
  return drilldown.filters.map((filter) => `${filter.field}: ${toDisplayValue(filter.value)}`).join(" / ");
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
      filters.push({ field: payload.rowField, value: payload.rowValue, label: `${payload.rowField}: ${toDisplayValue(payload.rowValue)}` });
    }
    if (payload.columnField && payload.columnValue !== undefined && payload.columnField !== payload.rowField) {
      filters.push({ field: payload.columnField, value: payload.columnValue, label: `${payload.columnField}: ${toDisplayValue(payload.columnValue)}` });
    }
  } else {
    if (xField && payloadData[xField] !== undefined) {
      filters.push({ field: xField, value: payloadData[xField], label: `${xField}: ${toDisplayValue(payloadData[xField])}` });
    }
    if (groupField && payloadData[groupField] !== undefined && !filters.some((filter) => filter.field === groupField)) {
      filters.push({ field: groupField, value: payloadData[groupField], label: `${groupField}: ${toDisplayValue(payloadData[groupField])}` });
    }
  }
  if (!filters.length) return null;
  return { filters, label: describeDrilldown({ filters }) };
}
