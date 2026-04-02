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

/**
 * Normalizes chart configs at the boundary between builder/store/renderer.
 * Canonical shape:
 *   dataset, x, y, groupBy, sizeField, aggregate, chartType
 *
 * Legacy aliases are still emitted so existing saved localStorage state and
 * active UI consumers continue to work while the app converges on one shape.
 */
export function normalizeChartConfig(config = {}) {
  const chartType = normalizeChartType(config.chartType ?? config.type);
  const dataset = config.dataset ?? config.table ?? null;
  const x = config.x ?? config.xField ?? null;
  const y = config.y ?? config.yField ?? null;
  const groupBy = config.groupBy ?? config.groupField ?? null;
  const sizeField = config.sizeField ?? config.size ?? config.sizeBy ?? null;
  const aggregate = config.aggregate ?? config.aggregation ?? "sum";

  const normalized = {
    ...config,
    dataset,
    x,
    y,
    groupBy,
    sizeField,
    aggregate,
    chartType,
    name: config.name ?? "",
    title: config.title ?? "",
    subtitle: config.subtitle ?? "",
    colorTheme: config.colorTheme ?? "default",
    legendVisible: config.legendVisible ?? true,
    showGrid: config.showGrid ?? true,
    showLabels: config.showLabels ?? false,
    smooth: config.smooth ?? false,
    xLabel: config.xLabel ?? "",
    yLabel: config.yLabel ?? "",
    sizeLabel: config.sizeLabel ?? "",
    queryMode: config.queryMode ?? "visual",
    generatedSql: config.generatedSql ?? "",
    customSql: config.customSql ?? "",
    lastExecutedSql: config.lastExecutedSql ?? "",
    queryResult: config.queryResult ?? null,
    queryError: config.queryError ?? "",
    queryStatus: config.queryStatus ?? "idle",
    isDirtySql: config.isDirtySql ?? false,
    lastRunAt: config.lastRunAt ?? "",
    xType: config.xType ?? null,
    yType: config.yType ?? null,
    sizeType: config.sizeType ?? null,
    roleMapping: config.roleMapping ?? {},
  };

  return {
    ...normalized,
    table: normalized.table ?? dataset,
    xField: normalized.xField ?? x,
    yField: normalized.yField ?? y,
    groupField: normalized.groupField ?? groupBy,
    aggregation: normalized.aggregation ?? aggregate,
    type: normalized.type ?? chartType,
    size: normalized.size ?? sizeField,
    sizeBy: normalized.sizeBy ?? sizeField,
    subtitleText: normalized.subtitleText ?? normalized.subtitle ?? "",
  };
}

