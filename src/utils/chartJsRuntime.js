import { getChartAppearance, styleChartJsData, truncateChartLabel } from "./chartTheme";
import { withOpacity } from "./chartThemes";

const PIE_LIKE_MODES = new Set(["pie", "doughnut", "gauge", "polar-area"]);
const LINE_LIKE_MODES = new Set(["line", "multi-line", "step-line", "area", "stacked-line", "stacked-area"]);
const BAR_LIKE_MODES = new Set(["bar", "grouped-bar", "stacked-bar", "horizontal-bar"]);
const SCATTER_LIKE_MODES = new Set(["scatter", "bubble"]);
const RADAR_LIKE_MODES = new Set(["radar"]);
const DEFAULT_PRESET_KEY = "compactDashboard";
const LOCALE_ALIASES = {
  th: "th-TH",
  en: "en-US",
};

export const CHART_CONTEXT_PRESETS = {
  dashboard: {
    animation: {
      duration: 280,
      easing: "easeOutCubic",
      activeDuration: 100,
      resizeDuration: 120,
    },
    layout: {
      padding: { top: 4, right: 6, bottom: 4, left: 2 },
      autoPadding: true,
      maxLabelLength: 14,
    },
    legend: {
      forceVisible: false,
      labels: { boxWidth: 10, boxHeight: 8, padding: 8, usePointStyle: true },
    },
    responsive: {
      maintainAspectRatio: false,
      resizeDelay: 60,
    },
    tooltip: {
      displayColors: true,
      cornerRadius: 4,
      padding: 8,
    },
    canvas: {
      solidBackground: false,
    },
    decimation: {
      enabled: "auto",
      algorithm: "lttb",
      threshold: 240,
      samples: 96,
    },
  },
  compactDashboard: {
    animation: {
      duration: 280,
      easing: "easeOutCubic",
      activeDuration: 100,
      resizeDuration: 120,
    },
    layout: {
      padding: { top: 4, right: 6, bottom: 4, left: 2 },
      autoPadding: true,
      maxLabelLength: 14,
    },
    legend: {
      forceVisible: false,
      labels: { boxWidth: 10, boxHeight: 8, padding: 8, usePointStyle: true },
    },
    responsive: {
      maintainAspectRatio: false,
      resizeDelay: 60,
    },
    tooltip: {
      displayColors: true,
      cornerRadius: 4,
      padding: 8,
    },
    canvas: {
      solidBackground: false,
    },
    decimation: {
      enabled: "auto",
      algorithm: "lttb",
      threshold: 240,
      samples: 96,
    },
  },
  builderPreview: {
    animation: {
      duration: 190,
      easing: "easeOutQuart",
      activeDuration: 80,
      resizeDuration: 100,
    },
    layout: {
      padding: { top: 5, right: 7, bottom: 4, left: 4 },
      autoPadding: true,
      maxLabelLength: 14,
    },
    legend: {
      forceVisible: true,
      labels: { boxWidth: 10, boxHeight: 8, padding: 9, usePointStyle: true },
    },
    responsive: {
      maintainAspectRatio: false,
      resizeDelay: 20,
    },
    tooltip: {
      displayColors: true,
      cornerRadius: 4,
      padding: 8,
    },
    canvas: {
      solidBackground: false,
    },
    decimation: {
      enabled: "auto",
      algorithm: "lttb",
      threshold: 320,
      samples: 72,
    },
  },
  strongPreview: {
    animation: {
      duration: 190,
      easing: "easeOutQuart",
      activeDuration: 80,
      resizeDuration: 100,
    },
    layout: {
      padding: { top: 5, right: 7, bottom: 4, left: 4 },
      autoPadding: true,
      maxLabelLength: 14,
    },
    legend: {
      forceVisible: true,
      labels: { boxWidth: 10, boxHeight: 8, padding: 9, usePointStyle: true },
    },
    responsive: {
      maintainAspectRatio: false,
      resizeDelay: 20,
    },
    tooltip: {
      displayColors: true,
      cornerRadius: 4,
      padding: 8,
    },
    canvas: {
      solidBackground: false,
    },
    decimation: {
      enabled: "auto",
      algorithm: "lttb",
      threshold: 320,
      samples: 72,
    },
  },
  boldBar: {
    animation: {
      duration: 260,
      easing: "easeOutCubic",
      activeDuration: 90,
      resizeDuration: 110,
    },
    layout: {
      padding: { top: 3, right: 5, bottom: 3, left: 1 },
      autoPadding: true,
      maxLabelLength: 13,
    },
    legend: {
      forceVisible: false,
      labels: { boxWidth: 10, boxHeight: 8, padding: 8, usePointStyle: true },
    },
    responsive: {
      maintainAspectRatio: false,
      resizeDelay: 40,
    },
    tooltip: {
      displayColors: true,
      cornerRadius: 4,
      padding: 8,
    },
    canvas: {
      solidBackground: false,
    },
    decimation: {
      enabled: "auto",
      algorithm: "lttb",
      threshold: 240,
      samples: 96,
    },
  },
  compactWidget: {
    animation: {
      duration: 220,
      easing: "easeOutCubic",
      activeDuration: 90,
      resizeDuration: 100,
    },
    layout: {
      padding: { top: 3, right: 5, bottom: 3, left: 1 },
      autoPadding: true,
      maxLabelLength: 12,
    },
    legend: {
      forceVisible: false,
      labels: { boxWidth: 9, boxHeight: 7, padding: 7, usePointStyle: true },
    },
    responsive: {
      maintainAspectRatio: false,
      resizeDelay: 40,
    },
    tooltip: {
      displayColors: true,
      cornerRadius: 4,
      padding: 7,
    },
    canvas: {
      solidBackground: false,
    },
    decimation: {
      enabled: "auto",
      algorithm: "lttb",
      threshold: 180,
      samples: 60,
    },
  },
  detailView: {
    animation: {
      duration: 300,
      easing: "easeOutCubic",
      activeDuration: 100,
      resizeDuration: 120,
    },
    layout: {
      padding: { top: 6, right: 8, bottom: 5, left: 5 },
      autoPadding: true,
      maxLabelLength: 16,
    },
    legend: {
      forceVisible: true,
      labels: { boxWidth: 10, boxHeight: 8, padding: 9, usePointStyle: true },
    },
    responsive: {
      maintainAspectRatio: false,
      resizeDelay: 60,
    },
    tooltip: {
      displayColors: true,
      cornerRadius: 4,
      padding: 8,
    },
    canvas: {
      solidBackground: false,
    },
    decimation: {
      enabled: "auto",
      algorithm: "lttb",
      threshold: 280,
      samples: 96,
    },
  },
  exportStatic: {
    animation: {
      duration: 0,
      easing: "linear",
      activeDuration: 0,
      resizeDuration: 0,
    },
    layout: {
      padding: { top: 6, right: 10, bottom: 6, left: 6 },
      autoPadding: true,
      maxLabelLength: 16,
    },
    legend: {
      forceVisible: true,
      labels: { boxWidth: 10, boxHeight: 8, padding: 9, usePointStyle: true },
    },
    responsive: {
      maintainAspectRatio: false,
      resizeDelay: 0,
    },
    tooltip: {
      displayColors: true,
      cornerRadius: 4,
      padding: 8,
    },
    canvas: {
      solidBackground: true,
    },
    decimation: {
      enabled: "auto",
      algorithm: "lttb",
      threshold: 360,
      samples: 120,
    },
  },
};

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isFiniteNumber(value) {
  return Number.isFinite(Number(value));
}

function toNumberOr(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function deepMerge(...sources) {
  return sources.reduce((accumulator, source) => {
    if (!isObject(source)) return accumulator;

    Object.entries(source).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        accumulator[key] = [...value];
        return;
      }

      if (isObject(value)) {
        accumulator[key] = deepMerge(isObject(accumulator[key]) ? accumulator[key] : {}, value);
        return;
      }

      if (value !== undefined) {
        accumulator[key] = value;
      }
    });

    return accumulator;
  }, {});
}

function resolveBoxPadding(value, fallback) {
  if (typeof value === "number") {
    return { top: value, right: value, bottom: value, left: value };
  }

  if (isObject(value)) {
    return {
      top: toNumberOr(value.top, fallback.top),
      right: toNumberOr(value.right, fallback.right),
      bottom: toNumberOr(value.bottom, fallback.bottom),
      left: toNumberOr(value.left, fallback.left),
    };
  }

  return { ...fallback };
}

function resolveFont(value, fallback) {
  if (!isObject(value)) return { ...fallback };

  return {
    ...fallback,
    size: toNumberOr(value.size, fallback.size),
    weight: value.weight ?? fallback.weight,
    family: value.family ?? fallback.family,
    style: value.style ?? fallback.style,
    lineHeight: value.lineHeight ?? fallback.lineHeight,
  };
}

function resolveDatasetOverride(configuration, dataset, index) {
  const datasetConfig = configuration?.datasets;
  if (Array.isArray(datasetConfig)) return datasetConfig[index] ?? {};
  if (!isObject(datasetConfig)) return {};

  return datasetConfig[dataset.label] ?? datasetConfig[String(index)] ?? {};
}

function resolveChartDisplayLocale(value = "th") {
  if (!value) return LOCALE_ALIASES.th;
  return LOCALE_ALIASES[value] ?? value;
}

function resolveDefaultCurrency(locale) {
  if (locale.startsWith("th")) return "THB";
  return "USD";
}

function isDateLikeValue(value) {
  if (value instanceof Date) return true;
  if (typeof value !== "string") return false;
  return /^\d{4}(-\d{2})?(-\d{2})?(?:[T ][\d:.+-Z]+)?$/.test(value);
}

function safeDateValue(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizePercentValue(value, percentScale = "auto") {
  if (!isFiniteNumber(value)) return value;
  const numeric = Number(value);
  if (percentScale === "fraction") return numeric;
  if (percentScale === "whole") return numeric / 100;
  return Math.abs(numeric) > 1 ? numeric / 100 : numeric;
}

export function formatChartDisplayValue(value, options = {}) {
  const locale = resolveChartDisplayLocale(options.locale ?? "th");
  const valueFormat = options.valueFormat ?? "default";
  const localeOptions = options.localeOptions ?? {};
  const compact = options.compact ?? localeOptions.compactNumbers ?? valueFormat === "compact";
  const currency = options.currency ?? localeOptions.currency ?? resolveDefaultCurrency(locale);
  const maximumFractionDigits = options.maximumFractionDigits;
  const minimumFractionDigits = options.minimumFractionDigits;

  if (value === null || value === undefined || value === "") return "-";

  if (isDateLikeValue(value)) {
    const date = safeDateValue(value);
    if (!date) return String(value);

    return new Intl.DateTimeFormat(locale, {
      dateStyle: localeOptions.dateStyle ?? options.dateStyle ?? "medium",
      timeStyle: localeOptions.timeStyle ?? options.timeStyle,
    }).format(date);
  }

  if (!isFiniteNumber(value)) return String(value);

  const numeric = Number(value);
  if (valueFormat === "currency") {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: maximumFractionDigits ?? 2,
      minimumFractionDigits: minimumFractionDigits ?? 0,
    }).format(numeric);
  }

  if (valueFormat === "percent") {
    return new Intl.NumberFormat(locale, {
      style: "percent",
      maximumFractionDigits: maximumFractionDigits ?? 1,
      minimumFractionDigits: minimumFractionDigits ?? 0,
    }).format(normalizePercentValue(numeric, localeOptions.percentScale ?? options.percentScale ?? "auto"));
  }

  return new Intl.NumberFormat(locale, {
    notation: compact ? "compact" : "standard",
    compactDisplay: "short",
    maximumFractionDigits:
      maximumFractionDigits
      ?? (compact ? 1 : Math.abs(numeric) >= 1000 ? 1 : Number.isInteger(numeric) ? 0 : 2),
    minimumFractionDigits,
  }).format(numeric);
}

function formatCategoryTick(value, options = {}) {
  if (value === null || value === undefined || value === "") return "";
  const formatted = formatChartDisplayValue(value, {
    locale: options.locale,
    localeOptions: options.localeOptions,
    dateStyle: options.dateStyle ?? "medium",
    timeStyle: options.timeStyle,
  });
  return truncateChartLabel(formatted, options.maxLength ?? 18);
}

function sumDatasetValues(dataset = {}) {
  return ensureArray(dataset.data)
    .map((item) => {
      if (isObject(item)) {
        if (isFiniteNumber(item.value)) return Number(item.value);
        if (isFiniteNumber(item.y)) return Number(item.y);
        if (isFiniteNumber(item.r)) return Number(item.r);
        return 0;
      }
      return isFiniteNumber(item) ? Number(item) : 0;
    })
    .reduce((sum, value) => sum + value, 0);
}

function getExplicitPresetKey(config = {}) {
  return config.chartJs?.preset ?? config.chartPreset ?? config.preset ?? null;
}

export function resolveChartRuntimePreset({ config = {}, mode = "dashboard", chrome = "default" } = {}) {
  const explicitPreset = getExplicitPresetKey(config);
  if (explicitPreset && CHART_CONTEXT_PRESETS[explicitPreset]) return explicitPreset;
  if (mode === "builder-preview") return "strongPreview";
  if (mode === "readonly") return "detailView";
  if (chrome === "minimal") return "compactWidget";
  return DEFAULT_PRESET_KEY;
}

function getPresetConfig(presetKey) {
  return CHART_CONTEXT_PRESETS[presetKey] ?? CHART_CONTEXT_PRESETS[DEFAULT_PRESET_KEY];
}

function resolveLocaleConfig(config = {}, locale = "th") {
  const localeOptions = config.chartJs?.localeOptions ?? config.localeOptions ?? {};
  const resolvedLocale = resolveChartDisplayLocale(localeOptions.locale ?? locale);

  return {
    ...localeOptions,
    locale: resolvedLocale,
    currency: localeOptions.currency ?? resolveDefaultCurrency(resolvedLocale),
    dateStyle: localeOptions.dateStyle ?? "medium",
    timeStyle: localeOptions.timeStyle,
    compactNumbers: localeOptions.compactNumbers ?? false,
    percentScale: localeOptions.percentScale ?? "auto",
  };
}

function resolveDevicePixelRatio(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return clamp(value, 1, 4);
  }

  if (!isObject(value)) return undefined;

  if (value.mode === "auto") return undefined;
  return isFiniteNumber(value.value) ? clamp(Number(value.value), 1, toNumberOr(value.max, 4)) : undefined;
}

function buildCanvasBackgroundColor({ config = {}, appearance, presetKey }) {
  const canvasConfig = config.chartJs?.canvas ?? config.canvas ?? {};
  const backgroundColor = canvasConfig.backgroundColor ?? canvasConfig.color ?? null;
  const transparent = canvasConfig.transparent ?? false;
  if (transparent && !backgroundColor) return undefined;
  if (typeof backgroundColor === "string" && backgroundColor && !backgroundColor.includes("gradient")) {
    return backgroundColor;
  }

  const opacity = toNumberOr(config.display?.backgroundOpacity, 0);
  if (opacity > 0) return withOpacity(appearance.surface, clamp(opacity, 0.08, 1));
  if (presetKey === "exportStatic" || canvasConfig.solidBackground === true) return appearance.surface;
  return undefined;
}

const canvasBackgroundPlugin = {
  id: "appCanvasBackground",
  beforeDraw(chart, _args, options) {
    if (!options?.color) return;
    const { ctx, canvas } = chart;
    ctx.save();
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = options.color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  },
};

export const CHART_JS_SYSTEM_PLUGINS = [canvasBackgroundPlugin];

function buildHiddenSeriesSet(configuration = {}) {
  return new Set(
    ensureArray(configuration.hiddenSeries).map((item) => String(item))
  );
}

function applyConfiguredData({
  data,
  config = {},
  support,
  darkMode = false,
  theme = "default",
  mode = "dashboard",
  chrome = "default",
} = {}) {
  if (!data || !Array.isArray(data.datasets)) return data;

  const configuration = config.chartJs?.configuration ?? config.configuration ?? {};
  const elements = config.chartJs?.elements ?? config.elements ?? {};
  const appearance = getChartAppearance({
    darkMode,
    colorTheme: theme ?? config.colorTheme ?? config.display?.colorTheme ?? "default",
    chrome,
    mode,
  });
  const styled = styleChartJsData({
    type: support.mode ?? config.chartType ?? "bar",
    data,
    config,
    darkMode,
    mode,
    chrome,
  });
  const hiddenSeries = buildHiddenSeriesSet(configuration);
  const defaultStack = configuration.stacked ? "stack-0" : undefined;

  return {
    ...styled,
    labels: Array.isArray(configuration.labels) ? configuration.labels : styled.labels,
    datasets: styled.datasets.map((dataset, index) => {
      const datasetOverride = resolveDatasetOverride(configuration, dataset, index);
      const mergedDataset = deepMerge(
        dataset,
        isObject(configuration.datasetDefaults) ? configuration.datasetDefaults : {},
        datasetOverride
      );

      if (hiddenSeries.has(String(index)) || (dataset.label && hiddenSeries.has(String(dataset.label)))) {
        mergedDataset.hidden = true;
      }

      if (configuration.order !== undefined) {
        mergedDataset.order = Array.isArray(configuration.order)
          ? configuration.order[index] ?? mergedDataset.order
          : isObject(configuration.order)
            ? configuration.order[dataset.label] ?? configuration.order[String(index)] ?? mergedDataset.order
            : configuration.order;
      }

      if (configuration.clip !== undefined) mergedDataset.clip = configuration.clip;
      if (configuration.parsing !== undefined) mergedDataset.parsing = configuration.parsing;
      if (configuration.normalized !== undefined) mergedDataset.normalized = configuration.normalized;
      if (LINE_LIKE_MODES.has(support.mode) && configuration.spanGaps !== undefined) mergedDataset.spanGaps = configuration.spanGaps;
      if (LINE_LIKE_MODES.has(support.mode) && configuration.fill !== undefined) mergedDataset.fill = configuration.fill;
      if (LINE_LIKE_MODES.has(support.mode) && configuration.segment !== undefined) mergedDataset.segment = configuration.segment;
      if (defaultStack) mergedDataset.stack = mergedDataset.stack ?? defaultStack;

      if (elements.point?.pointStyle !== undefined) mergedDataset.pointStyle = elements.point.pointStyle;
      if (elements.point?.hitRadius !== undefined) mergedDataset.hitRadius = elements.point.hitRadius;
      if (elements.point?.hoverBorderWidth !== undefined) mergedDataset.hoverBorderWidth = elements.point.hoverBorderWidth;

      if (elements.bar?.barThickness !== undefined) mergedDataset.barThickness = elements.bar.barThickness;
      if (elements.bar?.maxBarThickness !== undefined) mergedDataset.maxBarThickness = elements.bar.maxBarThickness;
      if (elements.bar?.borderSkipped !== undefined) mergedDataset.borderSkipped = elements.bar.borderSkipped;
      if (elements.bar?.borderRadius !== undefined) mergedDataset.borderRadius = elements.bar.borderRadius;

      if (elements.arc?.offset !== undefined) mergedDataset.offset = elements.arc.offset;
      if (elements.arc?.spacing !== undefined) mergedDataset.spacing = elements.arc.spacing;
      if (elements.arc?.borderWidth !== undefined) mergedDataset.borderWidth = elements.arc.borderWidth;
      if (elements.arc?.borderColor !== undefined) mergedDataset.borderColor = elements.arc.borderColor;

      if (support.mode === "gauge" && !mergedDataset.backgroundColor) {
        mergedDataset.backgroundColor = [appearance.primary, withOpacity(appearance.primary, 0.12)];
      }

      return mergedDataset;
    }),
  };
}

function buildTooltipLabel({
  type,
  context,
  data,
  formatValue,
  localeConfig,
  valueFormat,
  showPercent = false,
}) {
  const datasetLabel = context.dataset?.label && context.dataset.label !== "Series 1"
    ? `${context.dataset.label}: `
    : "";

  if (SCATTER_LIKE_MODES.has(type)) {
    const xValue = formatValue(context.parsed?.x, { valueFormat });
    const yValue = formatValue(context.parsed?.y, { valueFormat });
    if (type === "bubble") {
      const rValue = formatValue(context.raw?.r, { localeOptions: localeConfig });
      return `${datasetLabel}${xValue} x, ${yValue} y, size ${rValue}`;
    }
    return `${datasetLabel}${xValue} x, ${yValue} y`;
  }

  const parsedValue = context.parsed?.y ?? context.parsed?.x ?? context.parsed ?? context.raw;
  const valueLabel = formatValue(parsedValue, { valueFormat });
  if (!PIE_LIKE_MODES.has(type)) {
    return `${datasetLabel}${valueLabel}`;
  }

  if (!showPercent) {
    return `${context.label ? `${context.label}: ` : ""}${valueLabel}`;
  }

  const dataset = data?.datasets?.[context.datasetIndex] ?? null;
  const total = dataset ? sumDatasetValues(dataset) : 0;
  const percentValue = total > 0 ? Number(parsedValue) / total : 0;
  const percentLabel = formatValue(percentValue, {
    valueFormat: "percent",
    localeOptions: localeConfig,
  });

  return `${context.label ? `${context.label}: ` : ""}${valueLabel} (${percentLabel})`;
}

function buildTooltipOptions({
  type,
  support,
  data,
  config,
  appearance,
  preset,
  localeConfig,
  formatValue,
} = {}) {
  const tooltipConfig = config.chartJs?.tooltip ?? config.tooltip ?? {};
  const titleFont = resolveFont(tooltipConfig.titleFont, {
    family: appearance.fontFamily,
    size: 11,
    weight: "700",
  });
  const bodyFont = resolveFont(tooltipConfig.bodyFont, {
    family: appearance.fontFamily,
    size: 10,
    weight: "600",
  });
  const footerFont = resolveFont(tooltipConfig.footerFont, {
    family: appearance.fontFamily,
    size: 10,
    weight: "600",
  });
  const valueFormat = config.labels?.valueFormat ?? "default";
  const userCallbacks = tooltipConfig.callbacks ?? {};

  return {
    enabled: tooltipConfig.enabled ?? config.display?.showTooltip ?? true,
    mode: tooltipConfig.mode ?? config.interactions?.mode ?? (PIE_LIKE_MODES.has(support.mode) || SCATTER_LIKE_MODES.has(support.mode) ? "nearest" : "index"),
    intersect: tooltipConfig.intersect ?? config.interactions?.intersect ?? SCATTER_LIKE_MODES.has(support.mode),
    axis: tooltipConfig.axis ?? config.interactions?.axis,
    includeInvisible: tooltipConfig.includeInvisible ?? config.interactions?.includeInvisible ?? false,
    position: tooltipConfig.position ?? "average",
    backgroundColor: tooltipConfig.backgroundColor ?? appearance.tooltipBackground,
    titleColor: tooltipConfig.titleColor ?? appearance.tooltipTitle,
    bodyColor: tooltipConfig.bodyColor ?? appearance.tooltipText,
    footerColor: tooltipConfig.footerColor ?? appearance.tooltipText,
    borderColor: tooltipConfig.borderColor ?? appearance.tooltipBorder,
    borderWidth: toNumberOr(tooltipConfig.borderWidth, 1),
    displayColors: tooltipConfig.displayColors ?? preset.tooltip.displayColors,
    usePointStyle: tooltipConfig.usePointStyle ?? true,
    cornerRadius: toNumberOr(tooltipConfig.cornerRadius, preset.tooltip.cornerRadius),
    boxPadding: toNumberOr(tooltipConfig.boxPadding, 3),
    boxWidth: toNumberOr(tooltipConfig.boxWidth, 7),
    boxHeight: toNumberOr(tooltipConfig.boxHeight, 7),
    caretPadding: toNumberOr(tooltipConfig.caretPadding, 5),
    titleSpacing: toNumberOr(tooltipConfig.titleSpacing, 4),
    titleMarginBottom: toNumberOr(tooltipConfig.titleMarginBottom, 1),
    bodySpacing: toNumberOr(tooltipConfig.bodySpacing, 2),
    footerSpacing: toNumberOr(tooltipConfig.footerSpacing, 2),
    footerMarginTop: toNumberOr(tooltipConfig.footerMarginTop, 3),
    padding: resolveBoxPadding(tooltipConfig.padding, {
      top: preset.tooltip.padding,
      right: preset.tooltip.padding,
      bottom: preset.tooltip.padding,
      left: preset.tooltip.padding,
    }),
    multiKeyBackground: tooltipConfig.multiKeyBackground ?? appearance.surfaceStrong,
    titleFont,
    bodyFont,
    footerFont,
    itemSort: tooltipConfig.itemSort,
    filter: tooltipConfig.filter,
    callbacks: {
      title(items) {
        if (typeof userCallbacks.title === "function") return userCallbacks.title(items);
        if (!items?.length) return "";
        if (SCATTER_LIKE_MODES.has(support.mode)) return items[0].dataset?.label ?? "Series";
        return items[0].label ?? "";
      },
      label(context) {
        if (typeof userCallbacks.label === "function") return userCallbacks.label(context);
        return buildTooltipLabel({
          type: support.mode ?? type,
          context,
          data,
          formatValue,
          localeConfig,
          valueFormat,
          showPercent: config.settings?.showPercent ?? false,
        });
      },
      afterLabel(context) {
        if (typeof userCallbacks.afterLabel === "function") return userCallbacks.afterLabel(context);
        return undefined;
      },
      footer(items) {
        if (typeof userCallbacks.footer === "function") return userCallbacks.footer(items);
        return undefined;
      },
      labelColor(context) {
        if (typeof userCallbacks.labelColor === "function") return userCallbacks.labelColor(context);
        return undefined;
      },
    },
  };
}

function buildLegendOptions({
  support,
  data,
  config,
  appearance,
  preset,
} = {}) {
  const legendConfig = config.chartJs?.legend ?? config.legend ?? {};
  const datasetCount = Array.isArray(data?.datasets) ? data.datasets.length : 0;
  const defaultDisplay = PIE_LIKE_MODES.has(support.mode) || RADAR_LIKE_MODES.has(support.mode) || datasetCount > 1 || preset.legend.forceVisible;
  const labels = legendConfig.labels ?? {};

  return {
    display: legendConfig.display ?? config.display?.showLegend ?? defaultDisplay,
    position: legendConfig.position ?? config.display?.legendPosition ?? "bottom",
    align: legendConfig.align ?? "start",
    reverse: legendConfig.reverse ?? false,
    maxHeight: legendConfig.maxHeight,
    maxWidth: legendConfig.maxWidth,
    fullSize: legendConfig.fullSize,
    onClick: legendConfig.onClick,
    labels: {
      color: labels.color ?? appearance.textSecondary,
      usePointStyle: labels.usePointStyle ?? preset.legend.labels.usePointStyle,
      pointStyle: labels.pointStyle ?? (LINE_LIKE_MODES.has(support.mode) || SCATTER_LIKE_MODES.has(support.mode) ? "circle" : "rect"),
      boxWidth: toNumberOr(labels.boxWidth, preset.legend.labels.boxWidth),
      boxHeight: toNumberOr(labels.boxHeight, preset.legend.labels.boxHeight),
      pointStyleWidth: toNumberOr(labels.pointStyleWidth, preset.legend.labels.boxWidth),
      padding: toNumberOr(labels.padding, preset.legend.labels.padding),
      useBorderRadius: labels.useBorderRadius ?? false,
      borderRadius: toNumberOr(labels.borderRadius, 0),
      filter: legendConfig.filter,
      sort: legendConfig.sort,
      font: resolveFont(labels.font, {
        family: appearance.fontFamily,
        size: 10,
        weight: "600",
      }),
    },
  };
}

function resolveTitleText(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return value ? String(value) : "";
}

function buildTitleOptions(config = {}, appearance) {
  const titleConfig = config.chartJs?.titleOptions ?? config.titleOptions ?? {};
  const titleText = resolveTitleText(titleConfig.text ?? config.labels?.title ?? config.title ?? "");
  return {
    display: titleConfig.display ?? false,
    text: titleText,
    align: titleConfig.align ?? "start",
    color: titleConfig.color ?? appearance.textPrimary,
    padding: resolveBoxPadding(titleConfig.padding, { top: 0, right: 0, bottom: 4, left: 0 }),
    font: resolveFont(titleConfig.font, {
      family: appearance.fontFamily,
      size: 11,
      weight: "700",
    }),
  };
}

function buildSubtitleOptions(config = {}, appearance) {
  const subtitleConfig = config.chartJs?.subtitleOptions ?? config.subtitleOptions ?? {};
  const subtitleText = resolveTitleText(subtitleConfig.text ?? config.labels?.subtitle ?? config.subtitle ?? "");
  return {
    display: subtitleConfig.display ?? false,
    text: subtitleText,
    align: subtitleConfig.align ?? "start",
    color: subtitleConfig.color ?? appearance.textSecondary,
    padding: resolveBoxPadding(subtitleConfig.padding, { top: 0, right: 0, bottom: 4, left: 0 }),
    font: resolveFont(subtitleConfig.font, {
      family: appearance.fontFamily,
      size: 10,
      weight: "600",
    }),
  };
}

function buildElementOptions({ support, config = {}, appearance } = {}) {
  const elements = config.chartJs?.elements ?? config.elements ?? {};

  return {
    line: {
      tension: elements.line?.tension ?? config.settings?.curveTension ?? 0.12,
      borderWidth: toNumberOr(elements.line?.borderWidth, config.settings?.lineWidth ?? 2.9),
      stepped: elements.line?.stepped ?? config.settings?.step ?? false,
      fill: elements.line?.fill ?? config.settings?.area ?? false,
      spanGaps: elements.line?.spanGaps ?? config.settings?.connectNulls ?? false,
      clip: elements.line?.clip,
      segment: elements.line?.segment ?? config.configuration?.segment,
      capBezierPoints: true,
    },
    point: {
      radius: toNumberOr(elements.point?.radius, config.settings?.showSymbol === false ? 0 : 1.5),
      hoverRadius: toNumberOr(elements.point?.hoverRadius, 3.75),
      hitRadius: toNumberOr(elements.point?.hitRadius, 8),
      borderWidth: toNumberOr(elements.point?.borderWidth, 1.25),
      hoverBorderWidth: toNumberOr(elements.point?.hoverBorderWidth, 1.25),
      pointStyle: elements.point?.pointStyle ?? "circle",
    },
    bar: {
      borderRadius: toNumberOr(elements.bar?.borderRadius, config.settings?.borderRadius ?? 0),
      borderSkipped: elements.bar?.borderSkipped ?? false,
      barThickness: isFiniteNumber(elements.bar?.barThickness) ? Number(elements.bar.barThickness) : undefined,
      maxBarThickness: isFiniteNumber(elements.bar?.maxBarThickness)
        ? Number(elements.bar.maxBarThickness)
        : support.mode === "horizontal-bar"
          ? 30
          : 36,
    },
    arc: {
      borderWidth: toNumberOr(elements.arc?.borderWidth, 1.25),
      borderColor: elements.arc?.borderColor ?? appearance.surface,
      spacing: isFiniteNumber(elements.arc?.spacing)
        ? Number(elements.arc.spacing)
        : support.mode === "doughnut"
          ? 2
          : PIE_LIKE_MODES.has(support.mode)
            ? 1
            : undefined,
      offset: isFiniteNumber(elements.arc?.offset) ? Number(elements.arc.offset) : 0,
      hoverBorderWidth: toNumberOr(elements.arc?.hoverBorderWidth, 1.25),
    },
  };
}

function buildScaleOptions({
  support,
  data,
  config,
  appearance,
  localeConfig,
  formatValue,
  preset,
} = {}) {
  const showAxis = config.display?.showAxis ?? true;
  const showGrid = config.display?.showGrid ?? true;
  const xLabel = config.labels?.xLabel ?? "";
  const yLabel = config.labels?.yLabel ?? "";
  const labels = Array.isArray(data?.labels) ? data.labels : [];
  const barLike = BAR_LIKE_MODES.has(support.mode);
  const sparseBarCategories = barLike && labels.length <= 2;
  const categoryAxisKey = config.configuration?.indexAxis === "y" ? "y" : "x";
  const valueAxisKey = categoryAxisKey === "x" ? "y" : "x";
  const maxLabelLength = preset.layout.maxLabelLength;

  if (PIE_LIKE_MODES.has(support.mode)) return undefined;

  if (support.mode === "radar") {
    return {
      r: {
        grid: {
          color: appearance.grid,
          circular: true,
        },
        angleLines: {
          color: withOpacity(appearance.borderStrong, 0.16),
        },
        pointLabels: {
          color: appearance.axisLabel,
          font: {
            family: appearance.fontFamily,
            size: 10,
            weight: "600",
          },
        },
        ticks: {
          color: appearance.axisLabel,
          backdropColor: "transparent",
          maxTicksLimit: 4,
          callback(value) {
            return formatValue(value);
          },
          font: {
            family: appearance.fontFamily,
            size: 10,
            weight: "600",
          },
        },
      },
    };
  }

  if (SCATTER_LIKE_MODES.has(support.mode)) {
    return {
      x: {
        type: "linear",
        title: {
          display: Boolean(xLabel) && showAxis,
          text: xLabel,
          color: appearance.textSecondary,
          font: {
            family: appearance.fontFamily,
            size: 10,
            weight: "600",
          },
        },
        grid: {
          display: showGrid,
          color: appearance.grid,
          drawBorder: false,
          drawTicks: false,
        },
        ticks: {
          color: appearance.axisLabel,
          padding: 6,
          callback(value) {
            return formatValue(value);
          },
          font: {
            family: appearance.fontFamily,
            size: 10,
            weight: "600",
          },
        },
        border: {
          color: appearance.axisBorder,
        },
      },
      y: {
        type: "linear",
        title: {
          display: Boolean(yLabel) && showAxis,
          text: yLabel,
          color: appearance.textSecondary,
          font: {
            family: appearance.fontFamily,
            size: 10,
            weight: "600",
          },
        },
        grid: {
          display: showGrid,
          color: appearance.grid,
          drawBorder: false,
          drawTicks: false,
        },
        ticks: {
          color: appearance.axisLabel,
          padding: 6,
          callback(value) {
            return formatValue(value);
          },
          font: {
            family: appearance.fontFamily,
            size: 10,
            weight: "600",
          },
        },
        border: {
          display: false,
        },
        beginAtZero: true,
      },
    };
  }

  return {
    [categoryAxisKey]: {
      stacked: config.configuration?.stacked ?? config.settings?.stack ?? false,
      display: showAxis,
      offset: barLike ? true : undefined,
      bounds: barLike ? "ticks" : undefined,
      title: {
        display: Boolean(xLabel) && showAxis && categoryAxisKey === "x",
        text: xLabel,
        color: appearance.textSecondary,
        font: {
          family: appearance.fontFamily,
          size: 10,
          weight: "600",
        },
      },
      grid: {
        display: categoryAxisKey === "y" ? showGrid : false,
        color: appearance.grid,
        drawBorder: false,
        drawTicks: false,
        offset: barLike ? true : undefined,
      },
      ticks: {
        display: showAxis,
        color: appearance.axisLabel,
        padding: sparseBarCategories ? 6 : 5,
        autoSkip: true,
        maxRotation: 0,
        minRotation: 0,
        maxTicksLimit: labels.length > 18 ? 5 : labels.length > 10 ? 6 : 7,
        callback(value, index) {
          const fallbackLabel = labels[index] ?? value;
          const label = typeof this.getLabelForValue === "function" ? this.getLabelForValue(value) : fallbackLabel;
          return formatCategoryTick(label, {
            locale: localeConfig.locale,
            localeOptions: localeConfig,
            maxLength: maxLabelLength,
          });
        },
        font: {
          family: appearance.fontFamily,
          size: 10,
          weight: "600",
        },
      },
      border: {
        color: appearance.axisBorder,
        display: categoryAxisKey !== "y" && showAxis,
      },
    },
    [valueAxisKey]: {
      stacked: config.configuration?.stacked ?? config.settings?.stack ?? false,
      display: showAxis,
      beginAtZero: true,
      grace: barLike ? "4%" : undefined,
      title: {
        display: Boolean(yLabel) && showAxis,
        text: yLabel,
        color: appearance.textSecondary,
        font: {
          family: appearance.fontFamily,
          size: 10,
          weight: "600",
        },
      },
      grid: {
        display: showGrid,
        color: appearance.grid,
        drawBorder: false,
        drawTicks: false,
      },
      ticks: {
        display: showAxis,
        color: appearance.axisLabel,
        padding: 5,
        maxTicksLimit: 6,
        callback(value) {
          return formatValue(value);
        },
        font: {
          family: appearance.fontFamily,
          size: 10,
          weight: "600",
        },
      },
      border: {
        display: false,
      },
    },
  };
}

function buildAnimationOptions({
  support,
  config,
  preset,
} = {}) {
  const animationConfig = config.chartJs?.animations ?? config.animations ?? {};
  const pieLike = PIE_LIKE_MODES.has(support.mode);

  return {
    duration: toNumberOr(animationConfig.duration, preset.animation.duration),
    easing: animationConfig.easing ?? preset.animation.easing,
    delay: toNumberOr(animationConfig.delay, 0),
    loop: animationConfig.loop ?? false,
    animateScale: animationConfig.animateScale ?? pieLike,
    animateRotate: animationConfig.animateRotate ?? pieLike,
  };
}

function buildInteractionOptions({
  support,
  config,
} = {}) {
  const interactionConfig = config.chartJs?.interactions ?? config.interactions ?? {};
  const defaultMode = PIE_LIKE_MODES.has(support.mode) || SCATTER_LIKE_MODES.has(support.mode) ? "nearest" : "index";

  return {
    mode: interactionConfig.mode ?? defaultMode,
    intersect: interactionConfig.intersect ?? SCATTER_LIKE_MODES.has(support.mode),
    axis: interactionConfig.axis,
    includeInvisible: interactionConfig.includeInvisible ?? false,
  };
}

function buildDecimationOptions({
  support,
  data,
  config,
  preset,
} = {}) {
  const decimationConfig = config.chartJs?.decimation ?? config.decimation ?? {};
  const totalPoints = ensureArray(data?.datasets).reduce((sum, dataset) => sum + ensureArray(dataset.data).length, 0);
  const isLineLike = support.chartJsType === "line";
  const threshold = toNumberOr(decimationConfig.threshold, preset.decimation.threshold);
  const enabledSetting = decimationConfig.enabled ?? preset.decimation.enabled;
  const enabled = enabledSetting === "auto"
    ? isLineLike && totalPoints >= threshold
    : Boolean(enabledSetting && isLineLike);

  return {
    enabled,
    algorithm: decimationConfig.algorithm ?? preset.decimation.algorithm,
    samples: toNumberOr(decimationConfig.samples, preset.decimation.samples),
    threshold,
  };
}

export function buildChartJsOptionFactory({
  type = "bar",
  support,
  data = null,
  config = {},
  theme = "default",
  darkMode = false,
  locale = "th",
  mode = "dashboard",
  chrome = "default",
} = {}) {
  const resolvedTheme = theme ?? config.colorTheme ?? config.display?.colorTheme ?? "default";
  const appearance = getChartAppearance({
    darkMode,
    colorTheme: resolvedTheme,
    chrome,
    mode,
  });
  const presetKey = resolveChartRuntimePreset({ config, mode, chrome });
  const explicitPresetKey = getExplicitPresetKey(config);
  const preset = deepMerge(
    {},
    getPresetConfig(presetKey),
    !explicitPresetKey && BAR_LIKE_MODES.has(support.mode) ? getPresetConfig("boldBar") : {}
  );
  const labelCount = Array.isArray(data?.labels) ? data.labels.length : 0;
  const sparseBarCategories = BAR_LIKE_MODES.has(support.mode) && labelCount <= 2;
  const fewBarCategories = BAR_LIKE_MODES.has(support.mode) && labelCount > 2 && labelCount <= 4;
  const localeConfig = resolveLocaleConfig(config, locale);
  const formatValue = (value, overrides = {}) =>
    formatChartDisplayValue(value, {
      locale: localeConfig.locale,
      localeOptions: localeConfig,
      valueFormat: overrides.valueFormat ?? config.labels?.valueFormat ?? "default",
      currency: overrides.currency ?? localeConfig.currency,
      compact: overrides.compact,
      maximumFractionDigits: overrides.maximumFractionDigits,
      minimumFractionDigits: overrides.minimumFractionDigits,
      dateStyle: overrides.dateStyle,
      timeStyle: overrides.timeStyle,
      percentScale: overrides.percentScale,
    });
  const animation = buildAnimationOptions({ support, config, preset });
  const interaction = buildInteractionOptions({ support, config });
  const responsive = config.chartJs?.responsiveOptions ?? config.responsiveOptions ?? {};
  const layoutOptions = config.chartJs?.layoutOptions ?? config.layoutOptions ?? {};
  const resolvedLayoutPadding = resolveBoxPadding(layoutOptions.padding, preset.layout.padding);
  const balancedLayoutPadding = BAR_LIKE_MODES.has(support.mode)
    ? {
        top: resolvedLayoutPadding.top,
        right: Math.max(resolvedLayoutPadding.right, sparseBarCategories ? 18 : fewBarCategories ? 14 : 8),
        bottom: resolvedLayoutPadding.bottom,
        left: Math.max(resolvedLayoutPadding.left, sparseBarCategories ? 18 : fewBarCategories ? 14 : 8),
      }
    : resolvedLayoutPadding;
  const canvasBackgroundColor = buildCanvasBackgroundColor({
    config,
    appearance,
    presetKey,
  });
  const titleOptions = buildTitleOptions(config, appearance);
  const subtitleOptions = buildSubtitleOptions(config, appearance);
  const baseOptions = {
    responsive: responsive.responsive ?? config.configuration?.responsive ?? true,
    maintainAspectRatio: responsive.maintainAspectRatio ?? config.configuration?.maintainAspectRatio ?? preset.responsive.maintainAspectRatio,
    resizeDelay: toNumberOr(responsive.resizeDelay, preset.responsive.resizeDelay),
    aspectRatio: isFiniteNumber(responsive.aspectRatio) ? Number(responsive.aspectRatio) : undefined,
    devicePixelRatio: resolveDevicePixelRatio(config.chartJs?.devicePixelRatioSettings ?? config.devicePixelRatioSettings ?? config.devicePixelRatio),
    locale: localeConfig.locale,
    normalized: config.configuration?.normalized ?? true,
    parsing: config.configuration?.parsing,
    indexAxis: config.configuration?.indexAxis ?? (support.mode === "horizontal-bar" ? "y" : "x"),
    spanGaps: config.configuration?.spanGaps ?? config.settings?.connectNulls ?? false,
    clip: config.configuration?.clip,
    animation,
    transitions: {
      active: {
        animation: {
          duration: toNumberOr(config.animations?.transitions?.active?.duration, preset.animation.activeDuration),
          easing: config.animations?.transitions?.active?.easing ?? animation.easing,
        },
      },
      resize: {
        animation: {
          duration: toNumberOr(config.animations?.transitions?.resize?.duration, preset.animation.resizeDuration),
          easing: config.animations?.transitions?.resize?.easing ?? animation.easing,
        },
      },
    },
    interaction,
    hover: {
      mode: config.interactions?.hoverMode ?? interaction.mode,
      intersect: config.interactions?.hoverIntersect ?? interaction.intersect,
    },
    layout: {
      autoPadding: layoutOptions.autoPadding ?? preset.layout.autoPadding,
      padding: balancedLayoutPadding,
    },
    elements: buildElementOptions({ support, config, appearance }),
    plugins: {
      appCanvasBackground: {
        color: canvasBackgroundColor,
      },
      legend: buildLegendOptions({ support, data, config, appearance, preset }),
      tooltip: buildTooltipOptions({
        type,
        support,
        data,
        config,
        appearance,
        preset,
        localeConfig,
        formatValue,
      }),
      title: titleOptions,
      subtitle: subtitleOptions,
      decimation: buildDecimationOptions({
        support,
        data,
        config,
        preset,
      }),
    },
    scales: buildScaleOptions({
      support,
      data,
      config,
      appearance,
      localeConfig,
      formatValue,
      preset,
    }),
    cutout: support.mode === "gauge"
      ? "72%"
      : support.mode === "doughnut"
        ? `${toNumberOr(config.settings?.innerRadius, 48)}%`
        : undefined,
    rotation: support.mode === "gauge" ? -90 : undefined,
    circumference: support.mode === "gauge" ? 180 : undefined,
    onHover: typeof config.interactions?.onHover === "function" ? config.interactions.onHover : undefined,
  };

  return {
    options: deepMerge(
      baseOptions,
      { scales: config.configuration?.scales ?? {} },
      { plugins: config.configuration?.plugins ?? {} }
    ),
    meta: {
      presetKey,
      locale: localeConfig.locale,
      appearance,
      formatValue,
    },
  };
}

export function buildChartJsRuntime({
  type = "bar",
  support,
  adapterResult,
  config = {},
  theme = "default",
  darkMode = false,
  locale = "th",
  mode = "dashboard",
  chrome = "default",
} = {}) {
  const resolvedTheme = theme ?? config.colorTheme ?? config.display?.colorTheme ?? "default";
  const data = adapterResult?.data
    ? applyConfiguredData({
        data: adapterResult.data,
        config,
        support,
        darkMode,
        theme: resolvedTheme,
        mode,
        chrome,
      })
    : adapterResult?.data;
  const optionResult = buildChartJsOptionFactory({
    type,
    support,
    data,
    config,
    theme: resolvedTheme,
    darkMode,
    locale,
    mode,
    chrome,
  });

  return {
    data,
    options: optionResult.options,
    meta: optionResult.meta,
  };
}
