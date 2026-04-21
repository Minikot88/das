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

function toNumberOr(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
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

