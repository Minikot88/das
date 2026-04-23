import { getChartPalette, mixColors, shadeColor, tintColor } from "./chartPalette";
import { darkenColor, withOpacity } from "./chartThemes";

const PIE_LIKE_TYPES = new Set(["pie", "donut", "doughnut", "polar-area", "gauge"]);
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

function resolveDatasetType(type = "bar") {
  const normalized = String(type ?? "bar").trim().toLowerCase();
  if (normalized === "doughnut") return "donut";
  return normalized;
}

function isPieLikeType(type) {
  return PIE_LIKE_TYPES.has(resolveDatasetType(type));
}

function isLineLikeType(type) {
  return LINE_LIKE_TYPES.has(resolveDatasetType(type)) || resolveDatasetType(type) === "line";
}

function isAreaLikeType(type) {
  return AREA_LIKE_TYPES.has(resolveDatasetType(type));
}

function isBarLikeType(type) {
  return BAR_LIKE_TYPES.has(resolveDatasetType(type)) || resolveDatasetType(type) === "bar";
}

function isScatterLikeType(type) {
  return SCATTER_LIKE_TYPES.has(resolveDatasetType(type));
}

function buildGradientEndColor(color, appearance, darkMode, opacity) {
  const mixed = mixColors(color, appearance.surface, darkMode ? 0.28 : 0.42);
  return withOpacity(mixed, opacity);
}

function buildBarBackground(color, appearance, darkMode, direction = "vertical") {
  if (!appearance.barGradient) {
    return withOpacity(color, appearance.barOpacity ?? 0.92);
  }

  return createChartGradient({
    color,
    startOpacity: appearance.barOpacity ?? 0.92,
    endOpacity: appearance.barBottomOpacity ?? 0.76,
    direction,
    endColor: buildGradientEndColor(
      color,
      appearance,
      darkMode,
      appearance.barBottomOpacity ?? 0.76
    ),
  });
}

function buildAreaBackground(color, appearance, darkMode) {
  if (!appearance.areaGradient) {
    return withOpacity(color, appearance.areaTopOpacity ?? 0.18);
  }

  return createChartGradient({
    color,
    startOpacity: appearance.areaTopOpacity ?? 0.18,
    endOpacity: appearance.areaBottomOpacity ?? 0.04,
    direction: "vertical",
    endColor: buildGradientEndColor(
      color,
      appearance,
      darkMode,
      appearance.areaBottomOpacity ?? 0.04
    ),
  });
}

function createChartGradient({
  color,
  startOpacity = 1,
  endOpacity = 0.2,
  direction = "vertical",
  endColor,
}) {
  return (context) => {
    const chart = context?.chart;
    const chartArea = chart?.chartArea;
    const ctx = chart?.ctx;

    if (!chartArea || !ctx) {
      return withOpacity(color, startOpacity);
    }

    const gradient = direction === "horizontal"
      ? ctx.createLinearGradient(chartArea.left, 0, chartArea.right, 0)
      : ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);

    gradient.addColorStop(0, withOpacity(color, startOpacity));
    gradient.addColorStop(1, endColor ?? withOpacity(color, endOpacity));

    return gradient;
  };
}

function resolveSurfaceMode(palette, darkMode) {
  if (palette.surfaceMode === "dark") return true;
  if (palette.surfaceMode === "light") return false;
  return darkMode;
}

function buildSurfaceColor(baseSurface, accent, strength, alpha = 1) {
  return withOpacity(mixColors(baseSurface, accent, strength), alpha);
}

function buildBorderColor(base, accent, strength, opacity) {
  return withOpacity(mixColors(base, accent, strength), opacity);
}

function getSeriesColors(preferredTheme = "default", darkMode = false) {
  const palette = getChartPalette(preferredTheme);
  const fallbackPrimary = readCssVar("--primary", darkMode ? "#60a5fa" : "#1d4ed8");

  return uniqueColors([
    palette.single ?? fallbackPrimary,
    ...palette.colors,
    tintColor(palette.single ?? fallbackPrimary, darkMode ? 0.22 : 0.14),
    shadeColor(palette.single ?? fallbackPrimary, darkMode ? 0.06 : 0.12),
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
  const palette = getChartPalette(colorTheme);
  const compact = chrome === "minimal";
  const builderPreview = mode === "builder-preview";
  const useDarkSurface = resolveSurfaceMode(palette, darkMode);
  const primary = palette.single ?? readCssVar("--primary", darkMode ? "#60a5fa" : "#1d4ed8");
  const tint = palette.tint ?? tintColor(primary, 0.18);
  const baseSurface = useDarkSurface ? "#0b1220" : "#ffffff";
  const baseSurfaceSecondary = useDarkSurface ? "#111b2d" : "#f6f9fc";
  const baseSurfaceMuted = useDarkSurface ? "#101b2b" : "#f1f5f9";
  const baseSurfaceStrong = useDarkSurface ? "#182538" : "#e9eff7";
  const surface = buildSurfaceColor(
    baseSurface,
    tint,
    useDarkSurface ? palette.surfaceTintStrengthDark : palette.surfaceTintStrengthLight,
    useDarkSurface ? palette.surfaceAlphaDark : palette.surfaceAlphaLight
  );
  const surfaceSecondary = buildSurfaceColor(
    baseSurfaceSecondary,
    tint,
    useDarkSurface ? palette.surfaceTintStrengthDark + 0.04 : palette.surfaceTintStrengthLight + 0.04,
    useDarkSurface ? palette.surfaceAlphaDark : palette.surfaceAlphaLight
  );
  const surfaceMuted = buildSurfaceColor(
    baseSurfaceMuted,
    tint,
    useDarkSurface ? palette.surfaceTintStrengthDark + 0.03 : palette.surfaceTintStrengthLight + 0.02,
    useDarkSurface ? palette.surfaceAlphaDark : palette.surfaceAlphaLight
  );
  const surfaceStrong = buildSurfaceColor(
    baseSurfaceStrong,
    palette.accent ?? primary,
    useDarkSurface ? palette.surfaceTintStrengthDark + 0.06 : palette.surfaceTintStrengthLight + 0.06,
    useDarkSurface ? palette.surfaceAlphaDark : palette.surfaceAlphaLight
  );
  const border = buildBorderColor(
    useDarkSurface ? "#324255" : "#c7d3e1",
    tint,
    useDarkSurface ? palette.borderTintStrengthDark : palette.borderTintStrengthLight,
    useDarkSurface ? 0.68 : 0.7
  );
  const borderStrong = buildBorderColor(
    useDarkSurface ? "#47586d" : "#9db2c8",
    palette.accent ?? primary,
    useDarkSurface ? palette.borderTintStrengthDark + 0.04 : palette.borderTintStrengthLight + 0.04,
    useDarkSurface ? 0.78 : 0.76
  );
  const divider = buildBorderColor(
    useDarkSurface ? "#24364b" : "#dbe5ef",
    tint,
    useDarkSurface ? palette.gridTintStrengthDark : palette.gridTintStrengthLight,
    useDarkSurface ? 0.52 : 0.62
  );
  const textPrimary = useDarkSurface
    ? mixColors("#eef4ff", palette.accent ?? primary, 0.08)
    : mixColors("#102033", palette.accent ?? primary, 0.06);
  const textSecondary = useDarkSurface
    ? mixColors("#aebdd0", tint, 0.16)
    : mixColors("#526274", tint, 0.14);
  const warning = readCssVar("--warning", useDarkSurface ? "#fbbf24" : "#d97706");
  const danger = readCssVar("--danger", useDarkSurface ? "#fb7185" : "#dc2626");
  const seriesColors = getSeriesColors(colorTheme, useDarkSurface);
  const tooltipDark = palette.tooltipMode === "dark" || (palette.tooltipMode === "auto" && useDarkSurface);
  const minimalChrome = compact;

  return {
    themeKey: palette.key,
    themeLabel: palette.label,
    usesDarkSurface: useDarkSurface,
    primary,
    accent: palette.accent ?? primary,
    tint,
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
    axisBorder: withOpacity(
      buildBorderColor(useDarkSurface ? "#5b7189" : "#90a6bd", palette.accent ?? primary, 0.2, 1),
      useDarkSurface ? 0.5 : 0.46
    ),
    grid: withOpacity(
      buildBorderColor(useDarkSurface ? "#58708b" : "#9eb4cb", tint, useDarkSurface ? palette.gridTintStrengthDark : palette.gridTintStrengthLight, 1),
      useDarkSurface ? 0.24 : 0.2
    ),
    shellBackground: minimalChrome
      ? "transparent"
      : `linear-gradient(180deg, ${surface} 0%, ${surfaceSecondary} 100%)`,
    canvasBackground: minimalChrome
      ? "transparent"
      : `linear-gradient(180deg, ${surfaceSecondary} 0%, ${surfaceMuted} 100%)`,
    shellBorder: minimalChrome ? "transparent" : withOpacity(borderStrong, useDarkSurface ? 0.28 : 0.22),
    shellShadow: minimalChrome
      ? "none"
      : useDarkSurface
        ? "0 16px 34px -28px rgba(2, 6, 23, 0.82), inset 0 1px 0 rgba(255,255,255,0.03)"
        : "0 16px 28px -26px rgba(15, 23, 42, 0.12), inset 0 1px 0 rgba(255,255,255,0.72)",
    tooltipBackground: tooltipDark
      ? buildSurfaceColor("#0d1727", palette.accent ?? primary, 0.16, 0.98)
      : buildSurfaceColor("#ffffff", tint, 0.06, 0.98),
    tooltipBorder: tooltipDark
      ? withOpacity(buildBorderColor("#61758f", palette.accent ?? primary, 0.22, 1), 0.46)
      : withOpacity(buildBorderColor("#889cb3", tint, 0.18, 1), 0.34),
    tooltipTitle: tooltipDark ? "#f8fbff" : textPrimary,
    tooltipText: tooltipDark ? mixColors("#d6e2f0", tint, 0.12) : mixColors("#334155", tint, 0.1),
    noteBackground: useDarkSurface ? withOpacity(surfaceSecondary, 0.92) : withOpacity(surfaceMuted, 0.98),
    noteBorder: withOpacity(borderStrong, useDarkSurface ? 0.3 : 0.22),
    noteText: textSecondary,
    emptyBackground: `linear-gradient(180deg, ${surface} 0%, ${surfaceSecondary} 100%)`,
    barGradient: palette.barGradient,
    areaGradient: palette.areaGradient,
    gradientAxis: palette.gradientAxis,
    barOpacity: palette.barOpacity,
    barBottomOpacity: palette.barBottomOpacity,
    areaTopOpacity: palette.areaTopOpacity,
    areaBottomOpacity: palette.areaBottomOpacity,
    arcOpacity: palette.arcOpacity,
    scatterOpacity: palette.scatterOpacity,
    bubbleOpacity: palette.bubbleOpacity,
    pointFillOpacity: palette.pointFillOpacity,
    pieSpacing: palette.pieSpacing,
    pieHoverOffset: palette.pieHoverOffset,
    radius: compact ? 6 : 10,
    canvasPaddingTop: builderPreview ? 4 : compact ? 3 : 6,
    canvasPaddingX: builderPreview ? 6 : compact ? 4 : 8,
    canvasPaddingBottom: compact ? 3 : 6,
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
  const defaultLineWidth = Number(config.settings?.lineWidth ?? config.chartSettings?.lineWidth ?? 2.8);
  const defaultBarRadius = Number(config.settings?.borderRadius ?? config.chartSettings?.borderRadius ?? 0);

  const datasets = data.datasets.map((dataset, index) => {
    const color = getDatasetColor(index, appearance);
    const nextDataset = { ...dataset };
    const datasetType = resolveDatasetType(nextDataset.type ?? type);

    if (datasetType === "gauge") {
      const trackColor = withOpacity(appearance.surfaceStrong, darkMode ? 0.72 : 0.88);
      const existingTrackColor = Array.isArray(nextDataset.backgroundColor)
        ? nextDataset.backgroundColor[1]
        : null;
      const primaryColor = color;

      return {
        ...nextDataset,
        backgroundColor: [
          withOpacity(primaryColor, appearance.arcOpacity ?? 0.92),
          existingTrackColor ?? trackColor,
        ],
        hoverBackgroundColor: [
          primaryColor,
          existingTrackColor ?? trackColor,
        ],
        borderColor: [appearance.surface, appearance.surface],
        hoverBorderColor: [appearance.surface, appearance.surface],
        borderWidth: 0,
        hoverOffset: 0,
        spacing: 0,
      };
    }

    if (isPieLikeType(datasetType)) {
      const segmentCount = Array.isArray(nextDataset.data) ? nextDataset.data.length : 0;
      const arcColors = buildArcPalette(segmentCount, appearance);
      return {
        ...nextDataset,
        backgroundColor: arcColors.map((entry) =>
          withOpacity(entry, datasetType === "polar-area" ? Math.max(0.78, appearance.arcOpacity - 0.06) : appearance.arcOpacity ?? 0.9)
        ),
        hoverBackgroundColor: arcColors.map((entry) => tintColor(entry, darkMode ? 0.06 : 0.02)),
        borderColor: appearance.surface,
        hoverBorderColor: appearance.surface,
        borderWidth: darkMode ? 1.25 : 1.1,
        hoverOffset: datasetType === "donut" ? appearance.pieHoverOffset ?? 2 : Math.max(1, (appearance.pieHoverOffset ?? 2) - 1),
        spacing: datasetType === "donut" ? appearance.pieSpacing ?? 1 : Math.max(0, (appearance.pieSpacing ?? 1) - 1),
      };
    }

    if (datasetType === "radar") {
      return {
        ...nextDataset,
        borderColor: color,
        backgroundColor: buildAreaBackground(color, appearance, darkMode),
        pointBackgroundColor: withOpacity(color, appearance.pointFillOpacity ?? 1),
        pointBorderColor: color,
        pointHoverBackgroundColor: color,
        pointHoverBorderColor: appearance.surface,
        pointRadius: 2,
        pointHoverRadius: 3.8,
        pointBorderWidth: 1.25,
        borderWidth: clamp(defaultLineWidth, 2.4, 3.4),
        fill: true,
      };
    }

    if (isLineLikeType(datasetType)) {
      const pointRadius = builderPreview
        ? (labelDensity > 10 ? 0 : 1.5)
        : (labelDensity > 14 ? 0 : datasetCount > 1 ? 1.5 : 2);
      const areaLike = isAreaLikeType(datasetType);

      return {
        ...nextDataset,
        borderColor: color,
        backgroundColor: areaLike
          ? buildAreaBackground(color, appearance, darkMode)
          : withOpacity(color, darkMode ? 0.12 : 0.08),
        pointBackgroundColor: appearance.surface,
        pointBorderColor: color,
        pointHoverBackgroundColor: color,
        pointHoverBorderColor: appearance.surface,
        pointRadius,
        pointHoverRadius: pointRadius === 0 ? 4 : pointRadius + 1.75,
        pointHitRadius: 9,
        pointBorderWidth: 1.25,
        borderWidth: clamp(defaultLineWidth, 2.5, 3.5),
        fill: areaLike,
      };
    }

    if (isScatterLikeType(datasetType)) {
      return {
        ...nextDataset,
        borderColor: color,
        backgroundColor: withOpacity(
          color,
          datasetType === "bubble"
            ? appearance.bubbleOpacity ?? 0.36
            : appearance.scatterOpacity ?? 0.72
        ),
        hoverBackgroundColor: color,
        hoverBorderColor: color,
        borderWidth: datasetType === "bubble" ? 1.1 : 1.2,
        pointRadius: datasetType === "bubble" ? undefined : 4,
        pointHoverRadius: datasetType === "bubble" ? undefined : 5.6,
      };
    }

    if (isBarLikeType(datasetType)) {
      const useSingleTone = datasetCount === 1;
      const sparseCategories = labelDensity <= 2;
      const fewCategories = labelDensity <= 4;
      const horizontalBar = datasetType === "horizontal-bar";
      const baseColor = useSingleTone ? appearance.primary : color;

      return {
        ...nextDataset,
        backgroundColor: buildBarBackground(
          baseColor,
          appearance,
          darkMode,
          horizontalBar ? "horizontal" : appearance.gradientAxis ?? "vertical"
        ),
        hoverBackgroundColor: baseColor,
        borderColor: shadeColor(baseColor, darkMode ? 0.08 : 0.12),
        hoverBorderColor: baseColor,
        borderRadius: clamp(defaultBarRadius, 0, 2),
        borderSkipped: false,
        borderWidth: 1.05,
        categoryPercentage: datasetType === "stacked-bar"
          ? (sparseCategories ? 0.74 : fewCategories ? 0.8 : 0.88)
          : sparseCategories
            ? 0.72
            : fewCategories
              ? 0.78
              : datasetCount > 4
                ? 0.84
                : 0.86,
        barPercentage: datasetType === "stacked-bar"
          ? 0.98
          : sparseCategories
            ? 0.9
            : datasetCount > 3
              ? 0.86
              : 0.88,
        maxBarThickness: horizontalBar
          ? (sparseCategories ? 38 : fewCategories ? 34 : 30)
          : (sparseCategories ? 54 : fewCategories ? 46 : 36),
        minBarLength: 2,
        inflateAmount: 0.32,
      };
    }

    return {
      ...nextDataset,
      borderColor: color,
      backgroundColor: withOpacity(color, appearance.barOpacity ?? 0.78),
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
        tension: type === "step-line" ? 0 : Number(config.settings?.curveTension ?? config.chartSettings?.curveTension ?? 0.18),
        capBezierPoints: true,
      },
      point: {
        ...(baseOptions.elements?.point ?? {}),
        hoverBorderWidth: 2,
      },
      bar: {
        ...(baseOptions.elements?.bar ?? {}),
        borderRadius: clamp(Number(config.settings?.borderRadius ?? config.chartSettings?.borderRadius ?? 0), 0, 2),
        borderSkipped: false,
      },
      arc: {
        ...(baseOptions.elements?.arc ?? {}),
        borderWidth: 1.25,
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
          pointStyle: LINE_LIKE_TYPES.has(type) || SCATTER_LIKE_TYPES.has(type) ? "circle" : "rect",
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
        cornerRadius: 6,
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
    border: chrome === "minimal" ? "1px solid transparent" : `1px solid ${appearance.shellBorder}`,
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
    gap: 4,
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
    minHeight: 22,
    maxWidth: "100%",
    padding: "3px 8px",
    border: `1px solid ${appearance.noteBorder}`,
    borderRadius: 6,
    background: appearance.noteBackground,
    color: appearance.noteText,
    fontSize: 10,
    fontWeight: 600,
    lineHeight: 1.4,
    letterSpacing: "0.01em",
    boxShadow: "none",
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
      padding: 16,
      background: appearance.emptyBackground,
    },
    card: {
      width: "100%",
      maxWidth: 380,
      display: "grid",
      gap: 8,
      padding: 16,
      border: `1px solid ${withOpacity(resolvedAccent, darkMode ? 0.28 : 0.22)}`,
      borderRadius: Math.max(appearance.radius - 1, 6),
      background: darkMode ? withOpacity(appearance.surfaceSecondary, 0.92) : appearance.surface,
      boxShadow: appearance.shellShadow,
    },
    eyebrow: {
      display: "inline-flex",
      alignItems: "center",
      width: "fit-content",
      minHeight: 22,
      padding: "0 8px",
      border: `1px solid ${withOpacity(resolvedAccent, darkMode ? 0.3 : 0.2)}`,
      borderRadius: 4,
      background: withOpacity(resolvedAccent, darkMode ? 0.12 : 0.08),
      color: resolvedAccent,
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: "0.04em",
      textTransform: "uppercase",
    },
    title: {
      color: appearance.textPrimary,
      fontSize: 13,
      lineHeight: 1.35,
    },
    message: {
      margin: 0,
      color: appearance.textSecondary,
      fontSize: 11,
      lineHeight: 1.55,
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
      gap: 8,
      padding: chrome === "minimal" ? 16 : 18,
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
      fontSize: "clamp(28px, 4vw, 42px)",
      lineHeight: 0.94,
      color: appearance.textPrimary,
      letterSpacing: "-0.04em",
    },
    title: {
      fontSize: 11,
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
      padding: chrome === "minimal" ? 2 : 4,
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
      padding: "7px 9px",
      borderBottom: `1px solid ${appearance.divider}`,
      background: appearance.surfaceMuted,
      color: appearance.textSecondary,
      fontWeight: 700,
    },
    bodyCell: {
      padding: "7px 9px",
      borderBottom: `1px solid ${withOpacity(appearance.divider, 0.88)}`,
      color: appearance.textPrimary,
      background: "transparent",
    },
  };
}
