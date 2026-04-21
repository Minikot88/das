import { getChartPalette } from "./chartPalette";
import { withOpacity } from "./chartThemes";

const PIE_LIKE_TYPES = new Set(["pie", "donut", "polar-area"]);
const LINE_LIKE_TYPES = new Set(["line", "multi-line", "smooth-line", "step-line", "area", "stacked-line", "stacked-area"]);
const AREA_LIKE_TYPES = new Set(["area", "stacked-area"]);
const BAR_LIKE_TYPES = new Set(["bar", "grouped-bar", "stacked-bar", "horizontal-bar"]);
const SCATTER_LIKE_TYPES = new Set(["scatter", "bubble"]);

function readCssVar(name, fallback) {
  if (typeof window === "undefined" || typeof document === "undefined") return fallback;
  const value = window.getComputedStyle(document.body).getPropertyValue(name).trim();
  return value || fallback;
}

function isFiniteNumber(value) {
  return Number.isFinite(Number(value));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function uniqueColors(colors = []) {
  return Array.from(new Set(colors.filter(Boolean)));
}

function hasExplicitValue(values = []) {
  return values.some((value) => value !== undefined && value !== null && value !== "");
}

function resolveAccentColor(accent, fallback) {
  if (typeof accent === "string" && accent.startsWith("var(") && accent.endsWith(")")) {
    const cssVarName = accent.slice(4, -1).trim();
    return readCssVar(cssVarName, fallback);
  }

  return accent || fallback;
}

function getSeriesColors(preferredTheme = "default", darkMode = false) {
  const palette = getChartPalette(preferredTheme);
  const primary = readCssVar("--primary", darkMode ? "#60a5fa" : "#1d4ed8");

  return uniqueColors([
    primary,
    "#22c7ff",
    "#14b8a6",
    "#8b5cf6",
    "#22c55e",
    "#f59e0b",
    "#fb7185",
    ...palette.colors,
  ]);
}

function getDatasetColor(index, appearance) {
  return appearance.seriesColors[index % appearance.seriesColors.length];
}

function buildArcPalette(count, appearance) {
  return Array.from({ length: Math.max(count, 1) }, (_, index) => getDatasetColor(index, appearance));
}

function createTooltipLabel(chartType, context) {
  const datasetLabel = context.dataset?.label && context.dataset.label !== "Series 1"
    ? context.dataset.label
    : "";
  const labelPrefix = datasetLabel ? `${datasetLabel}: ` : "";

  if (chartType === "scatter") {
    return `${labelPrefix}${formatChartNumber(context.parsed?.x)} x, ${formatChartNumber(context.parsed?.y)} y`;
  }

  if (chartType === "bubble") {
    return `${labelPrefix}${formatChartNumber(context.parsed?.x)} x, ${formatChartNumber(context.parsed?.y)} y, size ${formatChartNumber(context.raw?.r)}`;
  }

  const parsedValue = context.parsed?.y ?? context.parsed?.x ?? context.parsed ?? context.raw;
  const pointLabel = context.label && PIE_LIKE_TYPES.has(chartType) ? `${context.label}: ` : "";
  return `${pointLabel}${labelPrefix}${formatChartNumber(parsedValue)}`;
}

export function formatChartNumber(value, options = {}) {
  if (!isFiniteNumber(value)) return value ?? "-";

  const numeric = Number(value);
  const abs = Math.abs(numeric);
  const formatter = new Intl.NumberFormat(undefined, {
    notation: options.compact === false || abs < 1000 ? "standard" : "compact",
    compactDisplay: "short",
    maximumFractionDigits:
      options.maximumFractionDigits
      ?? (abs >= 100000 ? 0 : abs >= 1000 ? 1 : Number.isInteger(numeric) ? 0 : 2),
  });

  return formatter.format(numeric);
}

export function truncateChartLabel(value, maxLength = 16) {
  const text = String(value ?? "");
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

export function getChartAppearance({
  darkMode = false,
  colorTheme = "default",
  chrome = "default",
  mode = "dashboard",
} = {}) {
  const compact = chrome === "minimal";
  const builderPreview = mode === "builder-preview";
  const primary = readCssVar("--primary", darkMode ? "#60a5fa" : "#1d4ed8");
  const surface = readCssVar("--surface", darkMode ? "#0f1a2b" : "#ffffff");
  const surfaceSecondary = readCssVar("--surface-secondary", darkMode ? "#111f33" : "#f7f9fc");
  const surfaceMuted = readCssVar("--surface-muted", darkMode ? "#111f33" : "#f4f7fb");
  const surfaceStrong = readCssVar("--surface-strong", darkMode ? "#1a2a40" : "#edf3fb");
  const border = readCssVar("--border", darkMode ? "#25364d" : "#dbe5f0");
  const borderStrong = readCssVar("--border-strong", darkMode ? "#35506e" : "#b8c8dc");
  const divider = readCssVar("--divider", darkMode ? "#1c2c43" : "#e6edf5");
  const textPrimary = readCssVar("--text-primary", darkMode ? "#edf4ff" : "#102033");
  const textSecondary = readCssVar("--text-secondary", darkMode ? "#9fb0c5" : "#4f6074");
  const warning = readCssVar("--warning", darkMode ? "#fbbf24" : "#d97706");
  const danger = readCssVar("--danger", darkMode ? "#fb7185" : "#dc2626");
  const seriesColors = getSeriesColors(colorTheme, darkMode);

  return {
    primary,
    seriesColors,
    surface,
    surfaceSecondary,
    surfaceMuted,
    surfaceStrong,
    border,
    borderStrong,
    divider,
    textPrimary,
    textSecondary,
    warning,
    danger,
    axisLabel: textSecondary,
    axisBorder: withOpacity(borderStrong, darkMode ? 0.58 : 0.72),
    grid: withOpacity(borderStrong, darkMode ? 0.14 : 0.16),
    shellBackground: darkMode
      ? "linear-gradient(180deg, rgba(20, 33, 53, 0.96) 0%, rgba(15, 26, 43, 0.92) 100%)"
      : "linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 253, 0.98) 100%)",
    canvasBackground: darkMode
      ? "linear-gradient(180deg, rgba(19, 31, 50, 0.96) 0%, rgba(15, 26, 43, 0.98) 100%)"
      : "linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(246, 249, 253, 0.98) 100%)",
    shellBorder: withOpacity(borderStrong, darkMode ? 0.54 : 0.44),
    shellShadow: darkMode
      ? "0 18px 40px -36px rgba(2, 6, 23, 0.72), inset 0 1px 0 rgba(255,255,255,0.04)"
      : "0 18px 40px -34px rgba(15, 23, 42, 0.18), inset 0 1px 0 rgba(255,255,255,0.9)",
    tooltipBackground: darkMode ? "rgba(15, 23, 42, 0.96)" : "rgba(255, 255, 255, 0.96)",
    tooltipBorder: darkMode ? "rgba(148, 163, 184, 0.18)" : "rgba(148, 163, 184, 0.2)",
    tooltipTitle: darkMode ? "#f8fbff" : "#102033",
    tooltipText: darkMode ? "#d8e4f2" : "#334155",
    noteBackground: darkMode ? "rgba(17, 31, 51, 0.9)" : "rgba(247, 249, 252, 0.96)",
    noteBorder: withOpacity(borderStrong, darkMode ? 0.44 : 0.34),
    noteText: textSecondary,
    emptyBackground: darkMode
      ? "linear-gradient(180deg, rgba(21, 37, 59, 0.96) 0%, rgba(15, 26, 43, 0.96) 100%)"
      : "linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(246, 249, 253, 0.98) 100%)",
    radius: compact ? 10 : 12,
    canvasPaddingTop: builderPreview ? 14 : 12,
    canvasPaddingX: compact ? 12 : 14,
    canvasPaddingBottom: compact ? 10 : 12,
    fontFamily: "Inter, Segoe UI, system-ui, sans-serif",
  };
}

export function styleChartJsData({
  type = "bar",
  data = null,
  config = {},
  darkMode = false,
  mode = "dashboard",
  chrome = "default",
} = {}) {
  if (!data || !Array.isArray(data.datasets)) return data;

  const appearance = getChartAppearance({
    darkMode,
    colorTheme: config.colorTheme ?? config.display?.colorTheme ?? "default",
    chrome,
    mode,
  });
  const labels = Array.isArray(data.labels) ? data.labels : [];
  const datasetCount = data.datasets.length;
  const labelDensity = labels.length;
  const builderPreview = mode === "builder-preview";
  const defaultLineWidth = Number(config.settings?.lineWidth ?? config.chartSettings?.lineWidth ?? 2.5);
  const defaultBarRadius = Number(config.settings?.borderRadius ?? config.chartSettings?.borderRadius ?? 5);

  const datasets = data.datasets.map((dataset, index) => {
    const color = getDatasetColor(index, appearance);
    const nextDataset = { ...dataset };

    if (PIE_LIKE_TYPES.has(type)) {
      const segmentCount = Array.isArray(nextDataset.data) ? nextDataset.data.length : 0;
      const arcColors = buildArcPalette(segmentCount, appearance);
      return {
        ...nextDataset,
        backgroundColor: arcColors.map((entry) => withOpacity(entry, type === "polar-area" ? 0.8 : 0.9)),
        hoverBackgroundColor: arcColors,
        borderColor: appearance.surface,
        hoverBorderColor: appearance.surface,
        borderWidth: 2,
        hoverOffset: 6,
        spacing: type === "donut" ? 2 : 1,
      };
    }

    if (type === "radar") {
      return {
        ...nextDataset,
        borderColor: color,
        backgroundColor: withOpacity(color, 0.16),
        pointBackgroundColor: appearance.surface,
        pointBorderColor: color,
        pointHoverBackgroundColor: color,
        pointHoverBorderColor: appearance.surface,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBorderWidth: 2,
        borderWidth: clamp(defaultLineWidth, 2, 3),
        fill: true,
      };
    }

    if (LINE_LIKE_TYPES.has(type)) {
      const pointRadius = builderPreview
        ? (labelDensity > 10 ? 1.5 : 2.5)
        : (labelDensity > 12 ? 0 : datasetCount > 1 ? 2.5 : 3);

      return {
        ...nextDataset,
        borderColor: color,
        backgroundColor: AREA_LIKE_TYPES.has(type) ? withOpacity(color, darkMode ? 0.2 : 0.16) : withOpacity(color, 0.12),
        pointBackgroundColor: appearance.surface,
        pointBorderColor: color,
        pointHoverBackgroundColor: color,
        pointHoverBorderColor: appearance.surface,
        pointRadius,
        pointHoverRadius: pointRadius === 0 ? 5 : pointRadius + 2,
        pointHitRadius: 12,
        pointBorderWidth: 2,
        borderWidth: clamp(defaultLineWidth, 2, 3.5),
        fill: AREA_LIKE_TYPES.has(type),
      };
    }

    if (SCATTER_LIKE_TYPES.has(type)) {
      return {
        ...nextDataset,
        borderColor: color,
        backgroundColor: withOpacity(color, type === "bubble" ? 0.28 : 0.74),
        hoverBackgroundColor: color,
        hoverBorderColor: color,
        borderWidth: type === "bubble" ? 1.2 : 1.6,
        pointRadius: type === "bubble" ? undefined : 4,
        pointHoverRadius: type === "bubble" ? undefined : 6,
      };
    }

    if (BAR_LIKE_TYPES.has(type)) {
      const useSingleTone = datasetCount === 1;
      return {
        ...nextDataset,
        backgroundColor: useSingleTone ? withOpacity(appearance.primary, 0.88) : withOpacity(color, 0.86),
        hoverBackgroundColor: useSingleTone ? appearance.primary : color,
        borderColor: useSingleTone ? appearance.primary : color,
        hoverBorderColor: useSingleTone ? appearance.primary : color,
        borderRadius: clamp(defaultBarRadius, 3, 8),
        borderSkipped: false,
        borderWidth: 1,
        categoryPercentage: datasetCount > 4 ? 0.64 : 0.72,
        barPercentage: type === "stacked-bar" ? 0.96 : 0.82,
        maxBarThickness: type === "horizontal-bar" ? 20 : 28,
      };
    }

    return {
      ...nextDataset,
      borderColor: color,
      backgroundColor: withOpacity(color, 0.82),
      hoverBackgroundColor: color,
      hoverBorderColor: color,
    };
  });

  return {
    ...data,
    datasets,
  };
}

export function createChartPresentationOptions({
  type = "bar",
  baseOptions = {},
  data = null,
  config = {},
  darkMode = false,
  mode = "dashboard",
  chrome = "default",
} = {}) {
  const appearance = getChartAppearance({
    darkMode,
    colorTheme: config.colorTheme ?? config.display?.colorTheme ?? "default",
    chrome,
    mode,
  });
  const labels = Array.isArray(data?.labels) ? data.labels : [];
  const datasetCount = Array.isArray(data?.datasets) ? data.datasets.length : 0;
  const compact = chrome === "minimal";
  const explicitLegend = hasExplicitValue([
    config.legendVisible,
    config.display?.showLegend,
    config.displayOptions?.showLegend,
  ]);
  const legendDisplay = explicitLegend
    ? (baseOptions.plugins?.legend?.display ?? true)
    : (PIE_LIKE_TYPES.has(type) || type === "radar" || datasetCount > 1);
  const explicitGrid = hasExplicitValue([
    config.showGrid,
    config.display?.showGrid,
    config.displayOptions?.showGrid,
  ]);
  const showGrid = explicitGrid ? (baseOptions.scales?.y?.grid?.display ?? true) : true;
  const categoryAxisKey = baseOptions.indexAxis === "y" ? "y" : "x";
  const valueAxisKey = categoryAxisKey === "x" ? "y" : "x";
  const innerRadiusConfigured = hasExplicitValue([
    config.settings?.innerRadius,
    config.chartSettings?.innerRadius,
  ]);
  const scales = { ...(baseOptions.scales ?? {}) };

  if (scales[categoryAxisKey]) {
    scales[categoryAxisKey] = {
      ...scales[categoryAxisKey],
      grid: {
        ...(scales[categoryAxisKey]?.grid ?? {}),
        display: categoryAxisKey === "x" ? false : showGrid,
        color: appearance.grid,
        drawBorder: false,
        drawTicks: false,
      },
      ticks: {
        ...(scales[categoryAxisKey]?.ticks ?? {}),
        color: appearance.axisLabel,
        padding: 10,
        autoSkip: true,
        maxRotation: 0,
        minRotation: 0,
        maxTicksLimit: labels.length > 12 ? 6 : labels.length > 8 ? 7 : 8,
        callback(value, index) {
          const fallbackLabel = Array.isArray(labels) ? labels[index] : value;
          const label = typeof this.getLabelForValue === "function"
            ? this.getLabelForValue(value)
            : fallbackLabel;
          return truncateChartLabel(label, compact ? 14 : 18);
        },
        font: {
          size: compact ? 10 : 11,
          weight: "500",
          family: appearance.fontFamily,
        },
      },
      border: {
        ...(scales[categoryAxisKey]?.border ?? {}),
        color: appearance.axisBorder,
        display: categoryAxisKey !== "y",
      },
    };
  }

  if (scales[valueAxisKey]) {
    scales[valueAxisKey] = {
      ...scales[valueAxisKey],
      grid: {
        ...(scales[valueAxisKey]?.grid ?? {}),
        display: showGrid,
        color: appearance.grid,
        drawBorder: false,
        drawTicks: false,
      },
      ticks: {
        ...(scales[valueAxisKey]?.ticks ?? {}),
        color: appearance.axisLabel,
        padding: 10,
        maxTicksLimit: compact ? 5 : 6,
        callback(value) {
          return formatChartNumber(value);
        },
        font: {
          size: compact ? 10 : 11,
          weight: "500",
          family: appearance.fontFamily,
        },
      },
      border: {
        ...(scales[valueAxisKey]?.border ?? {}),
        display: false,
      },
    };
  }

  if (type === "radar") {
    scales.r = {
      ...(scales.r ?? {}),
      grid: {
        ...(scales.r?.grid ?? {}),
        color: appearance.grid,
        circular: true,
      },
      angleLines: {
        ...(scales.r?.angleLines ?? {}),
        color: withOpacity(appearance.borderStrong, darkMode ? 0.16 : 0.14),
      },
      pointLabels: {
        ...(scales.r?.pointLabels ?? {}),
        color: appearance.axisLabel,
        font: {
          size: compact ? 10 : 11,
          weight: "600",
          family: appearance.fontFamily,
        },
      },
      ticks: {
        ...(scales.r?.ticks ?? {}),
        color: appearance.axisLabel,
        backdropColor: "transparent",
        maxTicksLimit: 5,
        callback(value) {
          return formatChartNumber(value);
        },
        font: {
          size: 10,
          family: appearance.fontFamily,
        },
      },
    };
  }

  return {
    ...baseOptions,
    animation: {
      ...(baseOptions.animation ?? {}),
      duration: compact ? 260 : 320,
      easing: "easeOutCubic",
    },
    interaction: {
      ...(baseOptions.interaction ?? {}),
      mode: PIE_LIKE_TYPES.has(type) || SCATTER_LIKE_TYPES.has(type) ? "nearest" : "index",
      intersect: SCATTER_LIKE_TYPES.has(type),
    },
    layout: {
      ...(baseOptions.layout ?? {}),
      padding: {
        top: compact ? 12 : 14,
        right: compact ? 14 : 18,
        bottom: compact ? 10 : 12,
        left: compact ? 10 : 12,
      },
    },
    elements: {
      ...(baseOptions.elements ?? {}),
      line: {
        ...(baseOptions.elements?.line ?? {}),
        tension: type === "step-line" ? 0 : Number(config.settings?.curveTension ?? config.chartSettings?.curveTension ?? 0.34),
        capBezierPoints: true,
      },
      point: {
        ...(baseOptions.elements?.point ?? {}),
        hoverBorderWidth: 2,
      },
      bar: {
        ...(baseOptions.elements?.bar ?? {}),
        borderRadius: clamp(Number(config.settings?.borderRadius ?? config.chartSettings?.borderRadius ?? 5), 3, 8),
        borderSkipped: false,
      },
      arc: {
        ...(baseOptions.elements?.arc ?? {}),
        borderWidth: 2,
        borderColor: appearance.surface,
        hoverBorderColor: appearance.surface,
      },
    },
    plugins: {
      ...(baseOptions.plugins ?? {}),
      legend: {
        ...(baseOptions.plugins?.legend ?? {}),
        display: legendDisplay,
        position: config.legendPosition ?? config.display?.legendPosition ?? config.displayOptions?.legendPosition ?? "top",
        align: "start",
        labels: {
          ...(baseOptions.plugins?.legend?.labels ?? {}),
          color: appearance.textSecondary,
          usePointStyle: true,
          pointStyle: LINE_LIKE_TYPES.has(type) || SCATTER_LIKE_TYPES.has(type) ? "circle" : "rectRounded",
          boxWidth: 10,
          boxHeight: 10,
          padding: compact ? 14 : 16,
          font: {
            size: compact ? 10 : 11,
            weight: "600",
            family: appearance.fontFamily,
          },
          generateLabels(chartInstance) {
            const generated = chartInstance.constructor.defaults.plugins.legend.labels.generateLabels(chartInstance);
            return generated.slice(0, PIE_LIKE_TYPES.has(type) ? 8 : 6);
          },
        },
      },
      tooltip: {
        ...(baseOptions.plugins?.tooltip ?? {}),
        enabled: config.showTooltip ?? config.display?.showTooltip ?? config.displayOptions?.showTooltip ?? true,
        backgroundColor: appearance.tooltipBackground,
        titleColor: appearance.tooltipTitle,
        bodyColor: appearance.tooltipText,
        borderColor: appearance.tooltipBorder,
        borderWidth: 1,
        padding: {
          top: 10,
          right: 12,
          bottom: 10,
          left: 12,
        },
        displayColors: true,
        boxPadding: 5,
        cornerRadius: 8,
        caretPadding: 8,
        titleSpacing: 6,
        bodySpacing: 4,
        footerSpacing: 4,
        titleFont: {
          family: appearance.fontFamily,
          size: 12,
          weight: "700",
        },
        bodyFont: {
          family: appearance.fontFamily,
          size: 11,
          weight: "600",
        },
        callbacks: {
          ...(baseOptions.plugins?.tooltip?.callbacks ?? {}),
          title(items) {
            if (!items?.length) return "";
            if (SCATTER_LIKE_TYPES.has(type)) return items[0].dataset?.label ?? "Series";
            return items[0].label ?? "";
          },
          label(context) {
            return createTooltipLabel(type, context);
          },
        },
      },
    },
    scales: Object.keys(scales).length ? scales : undefined,
    cutout: type === "donut" && !innerRadiusConfigured ? "64%" : baseOptions.cutout,
  };
}

export function getChartSurfaceStyle({
  darkMode = false,
  colorTheme = "default",
  chrome = "default",
  mode = "dashboard",
  width = "100%",
  height = "320px",
} = {}) {
  const appearance = getChartAppearance({ darkMode, colorTheme, chrome, mode });

  return {
    position: "relative",
    width,
    height,
    minHeight: 0,
    border: `1px solid ${appearance.shellBorder}`,
    borderRadius: appearance.radius,
    background: appearance.shellBackground,
    boxShadow: appearance.shellShadow,
    overflow: "hidden",
  };
}

export function getChartCanvasShellStyle({
  darkMode = false,
  colorTheme = "default",
  chrome = "default",
  mode = "dashboard",
} = {}) {
  const appearance = getChartAppearance({ darkMode, colorTheme, chrome, mode });

  return {
    height: "100%",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    padding: `${appearance.canvasPaddingTop}px ${appearance.canvasPaddingX}px ${appearance.canvasPaddingBottom}px`,
    background: appearance.canvasBackground,
  };
}

export function getChartPlotAreaStyle() {
  return {
    position: "relative",
    flex: 1,
    minHeight: 0,
  };
}

export function getChartFallbackNoteStyle({
  darkMode = false,
  colorTheme = "default",
  chrome = "default",
  mode = "dashboard",
} = {}) {
  const appearance = getChartAppearance({ darkMode, colorTheme, chrome, mode });

  return {
    display: "inline-flex",
    alignItems: "center",
    alignSelf: "flex-start",
    minHeight: 24,
    maxWidth: "100%",
    padding: "4px 8px",
    border: `1px solid ${appearance.noteBorder}`,
    borderRadius: 6,
    background: appearance.noteBackground,
    color: appearance.noteText,
    fontSize: 10,
    fontWeight: 600,
    lineHeight: 1.4,
    letterSpacing: "0.01em",
    boxShadow: `inset 0 1px 0 ${withOpacity(appearance.surface, 0.68)}`,
  };
}

export function getChartPlaceholderStyles({
  darkMode = false,
  colorTheme = "default",
  chrome = "default",
  mode = "dashboard",
  accent,
} = {}) {
  const appearance = getChartAppearance({ darkMode, colorTheme, chrome, mode });
  const resolvedAccent = resolveAccentColor(accent, appearance.warning);

  return {
    wrapper: {
      height: "100%",
      width: "100%",
      display: "grid",
      placeItems: "center",
      padding: 18,
      background: appearance.emptyBackground,
    },
    card: {
      width: "100%",
      maxWidth: 420,
      display: "grid",
      gap: 10,
      padding: 18,
      border: `1px solid ${withOpacity(resolvedAccent, darkMode ? 0.28 : 0.22)}`,
      borderRadius: appearance.radius,
      background: appearance.emptyBackground,
      boxShadow: appearance.shellShadow,
    },
    eyebrow: {
      display: "inline-flex",
      alignItems: "center",
      width: "fit-content",
      minHeight: 22,
      padding: "0 8px",
      border: `1px solid ${withOpacity(resolvedAccent, darkMode ? 0.3 : 0.2)}`,
      borderRadius: 6,
      background: withOpacity(resolvedAccent, darkMode ? 0.12 : 0.08),
      color: resolvedAccent,
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: "0.04em",
      textTransform: "uppercase",
    },
    title: {
      color: appearance.textPrimary,
      fontSize: 14,
      lineHeight: 1.35,
    },
    message: {
      margin: 0,
      color: appearance.textSecondary,
      fontSize: 12,
      lineHeight: 1.6,
    },
  };
}

export function getChartMetricStyles({
  darkMode = false,
  colorTheme = "default",
  chrome = "default",
  mode = "dashboard",
} = {}) {
  const appearance = getChartAppearance({ darkMode, colorTheme, chrome, mode });

  return {
    wrapper: {
      height: "100%",
      width: "100%",
      display: "grid",
      alignContent: "center",
      justifyItems: "start",
      gap: 10,
      padding: chrome === "minimal" ? 18 : 22,
      background: appearance.canvasBackground,
    },
    kicker: {
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color: appearance.textSecondary,
    },
    value: {
      fontSize: "clamp(28px, 4vw, 44px)",
      lineHeight: 0.96,
      color: appearance.textPrimary,
      letterSpacing: "-0.03em",
    },
    title: {
      fontSize: 12,
      color: appearance.textSecondary,
    },
  };
}

export function getChartTableStyles({
  darkMode = false,
  colorTheme = "default",
  chrome = "default",
  mode = "dashboard",
} = {}) {
  const appearance = getChartAppearance({ darkMode, colorTheme, chrome, mode });

  return {
    wrapper: {
      height: "100%",
      overflow: "auto",
      padding: chrome === "minimal" ? 4 : 6,
      background: appearance.canvasBackground,
    },
    table: {
      width: "100%",
      borderCollapse: "separate",
      borderSpacing: 0,
      fontSize: 12,
    },
    headerCell: {
      position: "sticky",
      top: 0,
      zIndex: 1,
      textAlign: "left",
      padding: "10px 12px",
      borderBottom: `1px solid ${appearance.divider}`,
      background: appearance.surfaceMuted,
      color: appearance.textSecondary,
      fontWeight: 700,
    },
    bodyCell: {
      padding: "10px 12px",
      borderBottom: `1px solid ${withOpacity(appearance.divider, 0.88)}`,
      color: appearance.textPrimary,
      background: "transparent",
    },
  };
}
