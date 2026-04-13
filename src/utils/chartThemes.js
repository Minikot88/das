import { getChartPalette } from "./chartPalette";

function readCssVar(name, fallback) {
  if (typeof window === "undefined") return fallback;
  const value = window.getComputedStyle(document.body).getPropertyValue(name).trim();
  return value || fallback;
}

function hexToRgb(hex) {
  const normalized = String(hex ?? "").replace("#", "").trim();
  if (normalized.length !== 6) return null;
  const value = Number.parseInt(normalized, 16);
  if (Number.isNaN(value)) return null;
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

export function withOpacity(color, opacity) {
  if (!color) return color;
  if (String(color).startsWith("rgba(")) {
    return color.replace(/rgba\(([^)]+),\s*[\d.]+\)/, `rgba($1, ${opacity})`);
  }
  if (String(color).startsWith("rgb(")) {
    return color.replace("rgb(", "rgba(").replace(")", `, ${opacity})`);
  }
  if (String(color).startsWith("#")) {
    const rgb = hexToRgb(color);
    if (!rgb) return color;
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
  }
  return color;
}

export function darkenColor(color, amount = 0.12) {
  const rgb = hexToRgb(color);
  if (!rgb) return color;
  const factor = Math.max(0, 1 - amount);
  const next = [rgb.r, rgb.g, rgb.b]
    .map((channel) => Math.max(0, Math.min(255, Math.round(channel * factor))))
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("");
  return `#${next}`;
}

export function formatChartValue(value) {
  if (!Number.isFinite(Number(value))) return value ?? "-";
  const numeric = Number(value);
  if (Math.abs(numeric) >= 1000000) return `${(numeric / 1000000).toFixed(1)}M`;
  if (Math.abs(numeric) >= 1000) return `${(numeric / 1000).toFixed(1)}K`;
  return numeric.toLocaleString();
}

export function getChartTheme() {
  return {
    surface: readCssVar("--surface", "#ffffff"),
    text: readCssVar("--text-primary", "#0f172a"),
    textMuted: readCssVar("--text-secondary", "#64748b"),
    textStrong: readCssVar("--text-primary", "#0f172a"),
    axis: readCssVar("--border-strong", "#9fb0c7"),
    axisLabel: readCssVar("--text-secondary", "#64748b"),
    splitLine: readCssVar("--divider", "#dbe5f0"),
    border: readCssVar("--border", "#e3eaf3"),
    pointer: readCssVar("--primary", "#3b82f6"),
    shadowPointer: withOpacity(readCssVar("--primary", "#3b82f6"), 0.14),
    background: "transparent",
  };
}

export function getSeriesPalette(preferredPalette) {
  return getChartPalette(preferredPalette).colors;
}

export function getSeriesColor(type, index = 0, preferredPalette) {
  const palette = getChartPalette(preferredPalette);
  return type === "line" || type === "area" ? palette.colors[index % palette.colors.length] : palette.colors[index % palette.colors.length];
}

export function getGridStyle(overrides = {}) {
  return {
    top: 32,
    left: 16,
    right: 16,
    bottom: 28,
    containLabel: true,
    ...overrides,
  };
}

function createAxisLabelStyle() {
  return {
    color: getChartTheme().axisLabel,
    fontSize: 11,
    margin: 12,
  };
}

export function getAxisStyles({
  chartType = "bar",
  categories = [],
  xName = "",
  yName = "",
  valueFormatter = formatChartValue,
  showSplitLine = true,
} = {}) {
  const theme = getChartTheme();
  const isBarLike = chartType.includes("bar") || chartType === "histogram";

  return {
    xAxis: {
      type: "category",
      data: categories,
      name: xName,
      nameTextStyle: { color: theme.textMuted, padding: [12, 0, 0, 0] },
      boundaryGap: isBarLike,
      axisLine: { show: true, lineStyle: { color: theme.axis, width: 1 } },
      axisTick: { show: false },
      axisLabel: createAxisLabelStyle(),
      splitLine: { show: false },
    },
    yAxis: {
      type: "value",
      name: yName,
      nameTextStyle: { color: theme.textMuted, padding: [0, 0, 8, 0] },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { ...createAxisLabelStyle(), formatter: valueFormatter },
      splitLine: {
        show: showSplitLine,
        lineStyle: { color: theme.splitLine, width: 1, type: "dashed" },
      },
      splitArea: { show: false },
    },
  };
}

function defaultTooltipFormatter(params, valueFormatter) {
  const rows = Array.isArray(params) ? params : [params];
  if (!rows.length) return "";
  const header = rows[0]?.axisValueLabel ?? rows[0]?.name ?? "";
  const lines = rows.map((item) => {
    const marker = item?.marker ? `${item.marker} ` : "";
    const label = item?.seriesName || item?.name || "Value";
    const value = Array.isArray(item?.value) ? item.value[item.value.length - 1] : item?.value;
    return `${marker}${label}: ${valueFormatter(value)}`;
  });
  return [header, ...lines].filter(Boolean).join("<br/>");
}

export function getTooltipStyle({
  chartType = "line",
  trigger = "axis",
  valueFormatter = formatChartValue,
  formatter,
} = {}) {
  const theme = getChartTheme();
  const isBarLike = chartType.includes("bar") || chartType === "histogram";
  return {
    trigger,
    confine: true,
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderWidth: 1,
    textStyle: { color: theme.text, fontSize: 12 },
    padding: [10, 12],
    extraCssText: "border-radius:8px;box-shadow:0 18px 30px -24px rgba(15,23,42,0.18);",
    axisPointer: {
      type: isBarLike ? "shadow" : "line",
      lineStyle: { color: theme.pointer, width: 1, type: "solid" },
      shadowStyle: { color: theme.shadowPointer },
    },
    valueFormatter,
    formatter: formatter ?? ((params) => defaultTooltipFormatter(params, valueFormatter)),
  };
}

export function createBarFill(color) {
  return {
    type: "linear",
    x: 0,
    y: 0,
    x2: 0,
    y2: 1,
    colorStops: [
      { offset: 0, color: withOpacity(color, 0.94) },
      { offset: 1, color: darkenColor(color, 0.03) },
    ],
  };
}

export function createAreaFill(color, topOpacity = 0.22, bottomOpacity = 0.04) {
  return {
    type: "linear",
    x: 0,
    y: 0,
    x2: 0,
    y2: 1,
    colorStops: [
      { offset: 0, color: withOpacity(color, topOpacity) },
      { offset: 1, color: withOpacity(color, bottomOpacity) },
    ],
  };
}
