import { getChartMeta, resolveChartRuntimeType } from "./chartCatalog";

const CHART_TYPE_ALIASES = {
  stacked_bar: "stacked-bar",
  grouped_bar: "grouped-bar",
  horizontal_bar: "horizontal-bar",
  multi_line: "multi-line",
  stacked_area: "stacked-area",
  step_line: "step-line",
  progress_ring: "progress-ring",
  pivot_table: "pivot-table",
};

function normalizeChartType(value) {
  if (!value) return "bar";
  return CHART_TYPE_ALIASES[value] ?? value;
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function toNumberOr(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizePadding(value, fallback = 24) {
  if (typeof value === "number") {
    return { top: value, right: value, bottom: value, left: value };
  }

  if (isObject(value)) {
    return {
      top: toNumberOr(value.top, typeof fallback === "number" ? fallback : fallback.top ?? 24),
      right: toNumberOr(value.right, typeof fallback === "number" ? fallback : fallback.right ?? 24),
      bottom: toNumberOr(value.bottom, typeof fallback === "number" ? fallback : fallback.bottom ?? 24),
      left: toNumberOr(value.left, typeof fallback === "number" ? fallback : fallback.left ?? 24),
    };
  }

  if (typeof fallback === "number") {
    return { top: fallback, right: fallback, bottom: fallback, left: fallback };
  }

  return {
    top: fallback.top ?? 24,
    right: fallback.right ?? 24,
    bottom: fallback.bottom ?? 24,
    left: fallback.left ?? 24,
  };
}

function normalizeFont(value, fallback = {}) {
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

function normalizeDisplay(config = {}) {
  const nested = config.display ?? config.displayOptions ?? {};

  return {
    colorTheme: nested.colorTheme ?? config.colorTheme ?? "default",
    showLegend: nested.showLegend ?? nested.legendVisible ?? config.legendVisible ?? true,
    legendPosition: nested.legendPosition ?? "bottom",
    showTooltip: nested.showTooltip ?? true,
    showGrid: nested.showGrid ?? config.showGrid ?? true,
    showAxis: nested.showAxis ?? true,
    showLabels: nested.showLabels ?? config.showLabels ?? false,
    backgroundOpacity: toNumberOr(nested.backgroundOpacity, 0),
    padding: toNumberOr(nested.padding, 24),
  };
}

function normalizeLabels(config = {}, fallbackName = "") {
  const nested = config.labels ?? config.labelSettings ?? {};

  return {
    name: nested.name ?? config.name ?? fallbackName,
    title: nested.title ?? config.title ?? "",
    subtitle: nested.subtitle ?? config.subtitle ?? config.subtitleText ?? "",
    xLabel: nested.xLabel ?? config.xLabel ?? "",
    yLabel: nested.yLabel ?? config.yLabel ?? "",
    valueFormat: nested.valueFormat ?? config.valueFormat ?? "default",
    emptyStateLabel: nested.emptyStateLabel ?? config.emptyStateLabel ?? "No rows available",
  };
}

function normalizeSettings(config = {}, chartType) {
  const nested = config.settings ?? config.chartSettings ?? {};

  return {
    smooth: nested.smooth ?? config.smooth ?? false,
    area: nested.area ?? false,
    stack: nested.stack ?? false,
    step: nested.step ?? false,
    showSymbol: nested.showSymbol ?? true,
    connectNulls: nested.connectNulls ?? false,
    lineWidth: toNumberOr(nested.lineWidth, 3),
    curveTension: toNumberOr(nested.curveTension, 0.35),
    horizontal: nested.horizontal ?? chartType === "horizontal-bar",
    borderRadius: toNumberOr(nested.borderRadius, 6),
    barWidth: toNumberOr(nested.barWidth, 34),
    sort: nested.sort ?? "none",
    barGap: toNumberOr(nested.barGap, 24),
    groupGap: toNumberOr(nested.groupGap, 30),
    donut: nested.donut ?? chartType === "donut",
    rose: nested.rose ?? chartType === "rose",
    innerRadius: toNumberOr(nested.innerRadius, 48),
    outerRadius: toNumberOr(nested.outerRadius, 72),
    labelPosition: nested.labelPosition ?? "outside",
    showPercent: nested.showPercent ?? false,
    symbolSize: toNumberOr(nested.symbolSize, 14),
    bubbleMode: nested.bubbleMode ?? chartType === "bubble",
    opacity: toNumberOr(nested.opacity, 0.72),
    regression: nested.regression ?? false,
    min: toNumberOr(nested.min, 0),
    max: toNumberOr(nested.max, 100),
    progress: nested.progress ?? true,
    splitNumber: toNumberOr(nested.splitNumber, 5),
    startAngle: toNumberOr(nested.startAngle, 210),
    endAngle: toNumberOr(nested.endAngle, -30),
    showPointer: nested.showPointer ?? true,
    showProgressRing: nested.showProgressRing ?? chartType === "progress-ring",
    detailFormatter: nested.detailFormatter ?? "value",
    cellGap: toNumberOr(nested.cellGap, 1),
    visualMin: nested.visualMin ?? "auto",
    visualMax: nested.visualMax ?? "auto",
    colorScaleMode: nested.colorScaleMode ?? "sequential",
    leafDepth: toNumberOr(nested.leafDepth, 1),
    showParentLabels: nested.showParentLabels ?? true,
    breadcrumb: nested.breadcrumb ?? false,
    gapWidth: toNumberOr(nested.gapWidth, 2),
    radiusInner: toNumberOr(nested.radiusInner, 18),
    radiusOuter: toNumberOr(nested.radiusOuter, 84),
    labelRotate: nested.labelRotate ?? "radial",
    nodeClick: nested.nodeClick ?? "rootToNode",
    orientation: nested.orientation ?? "LR",
    radial: nested.radial ?? false,
    expandDepth: toNumberOr(nested.expandDepth, 2),
    edgeShape: nested.edgeShape ?? "curve",
    nodeAlign: nested.nodeAlign ?? "justify",
    nodeWidth: toNumberOr(nested.nodeWidth, 18),
    nodeGap: toNumberOr(nested.nodeGap, 12),
    curveness: toNumberOr(nested.curveness, 0.5),
    sortDirection: nested.sortDirection ?? "descending",
    gap: toNumberOr(nested.gap, 2),
    shape: nested.shape ?? "polygon",
    radius: toNumberOr(nested.radius, 62),
    areaFill: nested.areaFill ?? true,
    showDataZoom: nested.showDataZoom ?? false,
    bullMode: nested.bullMode ?? "default",
    bearMode: nested.bearMode ?? "default",
    showOutliers: nested.showOutliers ?? false,
    boxWidth: toNumberOr(nested.boxWidth, 50),
    axisExpand: nested.axisExpand ?? false,
    lineOpacity: toNumberOr(nested.lineOpacity, 0.35),
    cellSize: toNumberOr(nested.cellSize, 18),
    layout: nested.layout ?? "horizontal",
    rangeMode: nested.rangeMode ?? "auto",
    boundaryGap: nested.boundaryGap ?? true,
    showSeriesLabels: nested.showSeriesLabels ?? false,
  };
}

function normalizeConfiguration(config = {}, chartType, settings) {
  const chartJs = config.chartJs ?? {};
  const nested = chartJs.configuration ?? config.configuration ?? {};

  return {
    type: normalizeChartType(nested.type ?? chartType),
    labels: Array.isArray(nested.labels) ? nested.labels : null,
    datasets: nested.datasets ?? null,
    datasetDefaults: isObject(nested.datasetDefaults) ? nested.datasetDefaults : {},
    parsing: nested.parsing ?? config.parsing,
    normalized: nested.normalized ?? true,
    indexAxis: nested.indexAxis ?? (settings.horizontal ? "y" : "x"),
    scales: nested.scales ?? config.scales ?? {},
    plugins: nested.plugins ?? config.plugins ?? {},
    responsive: nested.responsive ?? true,
    maintainAspectRatio: nested.maintainAspectRatio ?? false,
    spanGaps: nested.spanGaps ?? settings.connectNulls ?? false,
    clip: nested.clip ?? config.clip,
    stacked: nested.stacked ?? settings.stack ?? false,
    fill: nested.fill ?? settings.area ?? false,
    order: nested.order ?? config.order,
    hiddenSeries: ensureArray(nested.hiddenSeries ?? config.hiddenSeries),
    segment: nested.segment ?? config.segment,
  };
}

function normalizeAnimations(config = {}, chartType) {
  const chartJs = config.chartJs ?? {};
  const nested = chartJs.animations ?? config.animations ?? {};
  const pieLike = ["pie", "donut", "rose", "gauge", "progress-ring"].includes(chartType);

  return {
    duration: toNumberOr(nested.duration, 320),
    easing: nested.easing ?? "easeOutCubic",
    delay: toNumberOr(nested.delay, 0),
    loop: nested.loop ?? false,
    animateScale: nested.animateScale ?? pieLike,
    animateRotate: nested.animateRotate ?? pieLike,
    transitions: nested.transitions ?? {},
  };
}

function normalizeCanvas(config = {}) {
  const chartJs = config.chartJs ?? {};
  const nested = chartJs.canvas ?? config.canvas ?? {};

  return {
    backgroundColor: nested.backgroundColor ?? nested.color ?? null,
    transparent: nested.transparent ?? false,
    solidBackground: nested.solidBackground ?? false,
  };
}

function normalizeDecimation(config = {}) {
  const chartJs = config.chartJs ?? {};
  const nested = chartJs.decimation ?? config.decimation ?? {};

  return {
    enabled: nested.enabled ?? "auto",
    algorithm: nested.algorithm ?? "lttb",
    threshold: toNumberOr(nested.threshold, 240),
    samples: toNumberOr(nested.samples, 96),
  };
}

function normalizeDevicePixelRatioSettings(config = {}) {
  const chartJs = config.chartJs ?? {};
  const nested = chartJs.devicePixelRatioSettings ?? config.devicePixelRatioSettings ?? config.devicePixelRatio;

  if (typeof nested === "number") {
    return {
      mode: "fixed",
      value: nested,
      max: 4,
    };
  }

  if (!isObject(nested)) {
    return {
      mode: "auto",
      value: null,
      max: 4,
    };
  }

  return {
    mode: nested.mode ?? "auto",
    value: nested.value ?? null,
    max: toNumberOr(nested.max, 4),
  };
}

function normalizeElements(config = {}, settings = {}) {
  const chartJs = config.chartJs ?? {};
  const nested = chartJs.elements ?? config.elements ?? {};
  const line = nested.line ?? {};
  const point = nested.point ?? {};
  const bar = nested.bar ?? {};
  const arc = nested.arc ?? {};

  return {
    line: {
      tension: line.tension ?? settings.curveTension ?? 0.34,
      borderWidth: toNumberOr(line.borderWidth, settings.lineWidth ?? 3),
      fill: line.fill ?? settings.area ?? false,
      stepped: line.stepped ?? settings.step ?? false,
      spanGaps: line.spanGaps ?? settings.connectNulls ?? false,
      clip: line.clip,
      segment: line.segment ?? null,
    },
    point: {
      radius: toNumberOr(point.radius, settings.showSymbol === false ? 0 : 3),
      hoverRadius: toNumberOr(point.hoverRadius, 5),
      hitRadius: toNumberOr(point.hitRadius, 12),
      borderWidth: toNumberOr(point.borderWidth, 2),
      hoverBorderWidth: toNumberOr(point.hoverBorderWidth, 2),
      pointStyle: point.pointStyle ?? "circle",
    },
    bar: {
      borderRadius: toNumberOr(bar.borderRadius, settings.borderRadius ?? 6),
      borderSkipped: bar.borderSkipped ?? false,
      barThickness: bar.barThickness,
      maxBarThickness: bar.maxBarThickness,
    },
    arc: {
      borderWidth: toNumberOr(arc.borderWidth, 2),
      borderColor: arc.borderColor ?? null,
      spacing: arc.spacing,
      offset: arc.offset,
      hoverBorderWidth: toNumberOr(arc.hoverBorderWidth, 2),
    },
  };
}

function normalizeInteractions(config = {}) {
  const chartJs = config.chartJs ?? {};
  const nested = chartJs.interactions ?? config.interactions ?? config.interaction ?? {};

  return {
    mode: nested.mode,
    intersect: nested.intersect,
    axis: nested.axis,
    includeInvisible: nested.includeInvisible ?? false,
    hoverMode: nested.hoverMode,
    hoverIntersect: nested.hoverIntersect,
    onClick: nested.onClick,
    onHover: nested.onHover,
  };
}

function normalizeLayoutOptions(config = {}, display = {}) {
  const chartJs = config.chartJs ?? {};
  const nested = chartJs.layoutOptions ?? config.layoutOptions ?? {};

  return {
    autoPadding: nested.autoPadding ?? true,
    padding: normalizePadding(nested.padding ?? display.padding ?? 24, display.padding ?? 24),
    chartArea: nested.chartArea ?? {},
  };
}

function normalizeLegend(config = {}, display = {}) {
  const chartJs = config.chartJs ?? {};
  const nested = chartJs.legend ?? config.legend ?? {};
  const labels = nested.labels ?? {};

  return {
    display: nested.display ?? display.showLegend ?? true,
    position: nested.position ?? display.legendPosition ?? "bottom",
    align: nested.align ?? "start",
    reverse: nested.reverse ?? false,
    maxHeight: nested.maxHeight,
    maxWidth: nested.maxWidth,
    fullSize: nested.fullSize,
    onClick: nested.onClick,
    filter: nested.filter,
    sort: nested.sort,
    labels: {
      color: labels.color ?? null,
      boxWidth: toNumberOr(labels.boxWidth, 10),
      boxHeight: toNumberOr(labels.boxHeight, 10),
      usePointStyle: labels.usePointStyle ?? true,
      padding: toNumberOr(labels.padding, 14),
      pointStyle: labels.pointStyle,
      font: normalizeFont(labels.font, { size: 11, weight: "600" }),
    },
  };
}

function normalizeLocaleOptions(config = {}) {
  const chartJs = config.chartJs ?? {};
  const nested = chartJs.localeOptions ?? config.localeOptions ?? {};
  const explicitLocale = typeof config.locale === "string" ? config.locale : nested.locale;

  return {
    locale: explicitLocale ?? "th",
    currency: nested.currency ?? config.currency ?? null,
    dateStyle: nested.dateStyle ?? "medium",
    timeStyle: nested.timeStyle,
    compactNumbers: nested.compactNumbers ?? false,
    percentScale: nested.percentScale ?? "auto",
  };
}

function normalizeResponsiveOptions(config = {}, configuration = {}) {
  const chartJs = config.chartJs ?? {};
  const nested = chartJs.responsiveOptions ?? config.responsiveOptions ?? {};

  return {
    responsive: nested.responsive ?? configuration.responsive ?? true,
    maintainAspectRatio: nested.maintainAspectRatio ?? configuration.maintainAspectRatio ?? false,
    resizeDelay: toNumberOr(nested.resizeDelay, 60),
    aspectRatio: nested.aspectRatio,
  };
}

function normalizeTitleOptions(config = {}, labels = {}) {
  const chartJs = config.chartJs ?? {};
  const nested = chartJs.titleOptions ?? config.titleOptions ?? {};

  return {
    display: nested.display ?? config.showTitle ?? false,
    text: nested.text ?? labels.title ?? config.title ?? "",
    align: nested.align ?? "start",
    color: nested.color ?? null,
    padding: normalizePadding(nested.padding, { top: 0, right: 0, bottom: 8, left: 0 }),
    font: normalizeFont(nested.font, { size: 13, weight: "700" }),
  };
}

function normalizeSubtitleOptions(config = {}, labels = {}) {
  const chartJs = config.chartJs ?? {};
  const nested = chartJs.subtitleOptions ?? config.subtitleOptions ?? {};

  return {
    display: nested.display ?? config.showSubtitle ?? false,
    text: nested.text ?? labels.subtitle ?? config.subtitle ?? "",
    align: nested.align ?? "start",
    color: nested.color ?? null,
    padding: normalizePadding(nested.padding, { top: 0, right: 0, bottom: 8, left: 0 }),
    font: normalizeFont(nested.font, { size: 11, weight: "600" }),
  };
}

function normalizeTooltip(config = {}, display = {}) {
  const chartJs = config.chartJs ?? {};
  const nested = chartJs.tooltip ?? config.tooltip ?? {};

  return {
    enabled: nested.enabled ?? display.showTooltip ?? true,
    mode: nested.mode,
    intersect: nested.intersect,
    axis: nested.axis,
    includeInvisible: nested.includeInvisible ?? false,
    position: nested.position ?? "average",
    backgroundColor: nested.backgroundColor ?? null,
    titleColor: nested.titleColor ?? null,
    bodyColor: nested.bodyColor ?? null,
    footerColor: nested.footerColor ?? null,
    borderColor: nested.borderColor ?? null,
    borderWidth: toNumberOr(nested.borderWidth, 1),
    displayColors: nested.displayColors ?? true,
    usePointStyle: nested.usePointStyle ?? true,
    cornerRadius: toNumberOr(nested.cornerRadius, 8),
    boxPadding: toNumberOr(nested.boxPadding, 5),
    caretPadding: toNumberOr(nested.caretPadding, 8),
    titleSpacing: toNumberOr(nested.titleSpacing, 6),
    bodySpacing: toNumberOr(nested.bodySpacing, 4),
    footerSpacing: toNumberOr(nested.footerSpacing, 4),
    padding: normalizePadding(nested.padding, 12),
    titleFont: normalizeFont(nested.titleFont, { size: 12, weight: "700" }),
    bodyFont: normalizeFont(nested.bodyFont, { size: 11, weight: "600" }),
    footerFont: normalizeFont(nested.footerFont, { size: 10, weight: "600" }),
    itemSort: nested.itemSort,
    filter: nested.filter,
    callbacks: nested.callbacks ?? {},
  };
}

/**
 * Normalizes chart configs at the boundary between builder/store/renderer.
 * Canonical shape:
 *   { family, variant, chartType, type, source, mappings, settings, display, labels, meta }
 *
 * Legacy aliases are still emitted so existing saved localStorage state and
 * active UI consumers continue to work while the app converges on one shape.
 */
export function normalizeChartConfig(config = {}) {
  const chartType = normalizeChartType(config.chartType ?? config.chartTypeId ?? config.variant ?? config.type);
  // Meta is resolved once here. The catalog layer stays pure and no longer
  // imports config normalization, which breaks the old recursion path.
  const chartMeta = getChartMeta(chartType);
  const selectedChartBaseType =
    config.selectedChartBaseType ??
    config.meta?.selectedChartBaseType ??
    chartMeta.chartId ??
    resolveChartRuntimeType(chartType);
  const runtimeType = normalizeChartType(
    config.type ??
    config.renderType ??
    chartMeta.renderType ??
    selectedChartBaseType
  );
  const dataset = config.dataset ?? config.source?.dataset ?? config.source?.table ?? config.table ?? null;
  const x = config.x ?? config.mappings?.x ?? config.xField ?? null;
  const y = config.y ?? config.mappings?.y ?? config.yField ?? null;
  const groupBy = config.groupBy ?? config.mappings?.groupBy ?? config.groupField ?? null;
  const sizeField = config.sizeField ?? config.mappings?.sizeField ?? config.size ?? config.sizeBy ?? null;
  const aggregate = config.aggregate ?? config.mappings?.aggregate ?? config.aggregation ?? "sum";
  const family = config.family ?? config.selectedChartFamily ?? config.familyId ?? chartMeta.selectorFamilyId ?? chartMeta.family ?? null;
  const variant = config.variant ?? config.selectedChartVariant ?? config.variantId ?? (chartType !== runtimeType ? chartType : null);
  const display = normalizeDisplay(config);
  const labels = normalizeLabels(config, config.name ?? chartMeta.name ?? "Chart");
  const settings = normalizeSettings(config, chartType);
  const configuration = normalizeConfiguration(config, chartType, settings);
  const animations = normalizeAnimations(config, chartType);
  const canvas = normalizeCanvas(config);
  const decimation = normalizeDecimation(config);
  const devicePixelRatioSettings = normalizeDevicePixelRatioSettings(config);
  const elements = normalizeElements(config, settings);
  const interactions = normalizeInteractions(config);
  const layoutOptions = normalizeLayoutOptions(config, display);
  const legend = normalizeLegend(config, display);
  const localeOptions = normalizeLocaleOptions(config);
  const responsiveOptions = normalizeResponsiveOptions(config, configuration);
  const titleOptions = normalizeTitleOptions(config, labels);
  const subtitleOptions = normalizeSubtitleOptions(config, labels);
  const tooltip = normalizeTooltip(config, display);
  const chartPreset = config.chartJs?.preset ?? config.chartPreset ?? config.preset ?? null;
  const source = {
    db: config.selectedDb ?? config.source?.db ?? null,
    table: config.selectedTable ?? config.source?.table ?? dataset,
    dataset,
    queryMode: config.queryMode ?? config.source?.queryMode ?? "visual",
    generatedSql: config.generatedSql ?? config.source?.generatedSql ?? "",
    customSql: config.customSql ?? config.source?.customSql ?? "",
    lastExecutedSql: config.lastExecutedSql ?? config.source?.lastExecutedSql ?? "",
  };
  const mappings = {
    x,
    y,
    groupBy,
    sizeField,
    aggregate,
    xType: config.xType ?? config.mappings?.xType ?? null,
    yType: config.yType ?? config.mappings?.yType ?? null,
    sizeType: config.sizeType ?? config.mappings?.sizeType ?? null,
    roleMapping: config.roleMapping ?? config.mappings?.roleMapping ?? {},
  };
  const meta = {
    ...(config.meta ?? {}),
    supportLevel: config.meta?.supportLevel ?? config.supportLevel ?? chartMeta.supportLevel ?? "supported",
    family,
    variant,
    chartType,
    runtimeType,
    selectedChartBaseType,
    updatedAt: config.meta?.updatedAt ?? config.updatedAt ?? null,
    createdAt: config.meta?.createdAt ?? config.createdAt ?? null,
  };

  const normalized = {
    ...config,
    family,
    variant,
    source,
    mappings,
    settings,
    display,
    labels,
    configuration,
    animations,
    canvas,
    decimation,
    devicePixelRatioSettings,
    elements,
    interactions,
    layoutOptions,
    legend,
    localeOptions,
    responsiveOptions,
    titleOptions,
    subtitleOptions,
    tooltip,
    chartJs: {
      renderer: "chartjs",
      preset: chartPreset,
      configuration,
      animations,
      canvas,
      decimation,
      devicePixelRatioSettings,
      elements,
      interactions,
      layoutOptions,
      legend,
      localeOptions,
      responsiveOptions,
      titleOptions,
      subtitleOptions,
      tooltip,
    },
    meta,
    dataset,
    x,
    y,
    groupBy,
    sizeField,
    aggregate,
    chartType,
    type: runtimeType,
    name: labels.name,
    title: labels.title,
    subtitle: labels.subtitle,
    colorTheme: display.colorTheme,
    legendVisible: display.showLegend,
    showTooltip: display.showTooltip,
    showGrid: display.showGrid,
    showAxis: display.showAxis,
    showLabels: display.showLabels,
    backgroundOpacity: display.backgroundOpacity,
    padding: display.padding,
    smooth: settings.smooth,
    xLabel: labels.xLabel,
    yLabel: labels.yLabel,
    valueFormat: labels.valueFormat,
    emptyStateLabel: labels.emptyStateLabel,
    sizeLabel: config.sizeLabel ?? "",
    queryMode: source.queryMode,
    generatedSql: source.generatedSql,
    customSql: source.customSql,
    lastExecutedSql: source.lastExecutedSql,
    queryResult: config.queryResult ?? null,
    queryError: config.queryError ?? "",
    queryStatus: config.queryStatus ?? "idle",
    isDirtySql: config.isDirtySql ?? false,
    lastRunAt: config.lastRunAt ?? "",
    xType: mappings.xType,
    yType: mappings.yType,
    sizeType: mappings.sizeType,
    roleMapping: mappings.roleMapping,
    locale: localeOptions.locale,
    renderer: "chartjs",
    chartPreset,
  };

  return {
    ...normalized,
    table: normalized.table ?? dataset,
    xField: normalized.xField ?? x,
    yField: normalized.yField ?? y,
    groupField: normalized.groupField ?? groupBy,
    aggregation: normalized.aggregation ?? aggregate,
    size: normalized.size ?? sizeField,
    sizeBy: normalized.sizeBy ?? sizeField,
    subtitleText: normalized.subtitleText ?? normalized.subtitle ?? "",
    selectedChartFamily: normalized.selectedChartFamily ?? family,
    selectedChartVariant: normalized.selectedChartVariant ?? variant,
    displayOptions: normalized.displayOptions ?? display,
    chartSettings: normalized.chartSettings ?? settings,
    labelSettings: normalized.labelSettings ?? labels,
  };
}

