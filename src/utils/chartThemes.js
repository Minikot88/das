const ECHARTS_PRIMARY_PALETTE = [
  "#5470C6",
  "#91CC75",
  "#FAC858",
  "#EE6666",
  "#73C0DE",
  "#3BA272",
  "#FC8452",
  "#9A60B4",
  "#EA7CCC",
];

const TECHNICAL_PALETTE = [
  "#2563eb",
  "#0ea5e9",
  "#14b8a6",
  "#8b5cf6",
  "#f59e0b",
  "#ef4444",
];

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
    surface: readCssVar("--bg-surface", "#ffffff"),
    text: readCssVar("--text-base", "#111827"),
    textMuted: readCssVar("--text-muted", "#6b7280"),
    textStrong: readCssVar("--text-strong", "#111827"),
    axis: "#9ca3af",
    axisLabel: "#6b7280",
    splitLine: "#e5e7eb",
    border: "#d1d5db",
    pointer: "#cbd5e1",
    shadowPointer: "rgba(148, 163, 184, 0.10)",
    background: "transparent",
    palettes: {
      echarts: ECHARTS_PRIMARY_PALETTE,
      technical: TECHNICAL_PALETTE,
    },
  };
}

export function getSeriesPalette(preferredPalette) {
  if (Array.isArray(preferredPalette) && preferredPalette.length) return preferredPalette;
  return getChartTheme().palettes.echarts;
}

export function getSeriesColor(type, index = 0, preferredPalette) {
  const palette = getSeriesPalette(preferredPalette);
  if (type === "line" || type === "area") {
    const technicalPalette = getChartTheme().palettes.technical;
    return technicalPalette[index % technicalPalette.length];
  }
  return palette[index % palette.length];
}

export function getGridStyle(overrides = {}) {
  return {
    top: 32,
    left: 20,
    right: 20,
    bottom: 28,
    containLabel: true,
    ...overrides,
  };
}

function createAxisLabelStyle() {
  return {
    color: getChartTheme().axisLabel,
    fontSize: 12,
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
      boundaryGap: isBarLike,
      axisLine: {
        show: true,
        lineStyle: {
          color: theme.axis,
          width: 1,
        },
      },
      axisTick: { show: false },
      axisLabel: createAxisLabelStyle(),
      splitLine: { show: false },
    },
    yAxis: {
      type: "value",
      name: yName,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        ...createAxisLabelStyle(),
        formatter: valueFormatter,
      },
      splitLine: {
        show: showSplitLine,
        lineStyle: {
          color: theme.splitLine,
          width: 1,
          type: "dashed",
        },
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
    backgroundColor: "#ffffff",
    borderColor: theme.border,
    borderWidth: 1,
    textStyle: {
      color: theme.text,
      fontSize: 12,
    },
    padding: [8, 10],
    extraCssText: "border-radius:2px;box-shadow:none;",
    axisPointer: {
      type: isBarLike ? "shadow" : "line",
      lineStyle: {
        color: theme.pointer,
        width: 1,
        type: "solid",
      },
      shadowStyle: {
        color: theme.shadowPointer,
      },
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
      { offset: 0, color: withOpacity(color, 0.92) },
      { offset: 1, color },
    ],
  };
}

export function createAreaFill(color, topOpacity = 0.16, bottomOpacity = 0.03) {
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
