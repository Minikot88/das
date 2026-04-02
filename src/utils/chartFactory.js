import { normalizeChartConfig } from "./normalizeChartConfig";
import { getChartTemplateById, getChartTemplates } from "./chartTemplates";
import {
  createAreaFill,
  createBarFill,
  darkenColor,
  formatChartValue,
  getAxisStyles,
  getChartTheme,
  getGridStyle,
  getSeriesColor,
  getSeriesPalette,
  getTooltipStyle,
  withOpacity,
} from "./chartThemes";

const CHART_TYPE_LABELS = {
  bar: "Bar Chart",
  "horizontal-bar": "Horizontal Bar Chart",
  line: "Line Chart",
  "multi-line": "Multi Line Chart",
  area: "Area Chart",
  "stacked-area": "Stacked Area Chart",
  "step-line": "Step Line Chart",
  "grouped-bar": "Grouped Bar Chart",
  "stacked-bar": "Stacked Bar Chart",
  pie: "Pie Chart",
  donut: "Donut Chart",
  rose: "Rose Chart",
  scatter: "Scatter Chart",
  bubble: "Bubble Chart",
  heatmap: "Heatmap",
  histogram: "Histogram",
  radar: "Radar Chart",
  gauge: "Gauge",
  "progress-ring": "Progress Ring",
  funnel: "Funnel Chart",
  treemap: "Treemap",
  sunburst: "Sunburst",
  table: "Table",
  kpi: "KPI",
  waterfall: "Waterfall Chart",
};

function mergeChartOption(baseOption, overrides = {}) {
  const nextOption = { ...baseOption, ...overrides };

  if (baseOption.tooltip || overrides.tooltip) {
    nextOption.tooltip = {
      ...(baseOption.tooltip ?? {}),
      ...(overrides.tooltip ?? {}),
    };
  }

  if (baseOption.grid || overrides.grid) {
    nextOption.grid = {
      ...(baseOption.grid ?? {}),
      ...(overrides.grid ?? {}),
    };
  }

  if (baseOption.xAxis || overrides.xAxis) {
    nextOption.xAxis = {
      ...(baseOption.xAxis ?? {}),
      ...(overrides.xAxis ?? {}),
    };
  }

  if (baseOption.yAxis || overrides.yAxis) {
    nextOption.yAxis = {
      ...(baseOption.yAxis ?? {}),
      ...(overrides.yAxis ?? {}),
    };
  }

  if (baseOption.legend || overrides.legend) {
    nextOption.legend = {
      ...(baseOption.legend ?? {}),
      ...(overrides.legend ?? {}),
    };
  }

  return nextOption;
}

function createEmptyChartOption(title) {
  return {
    animation: false,
    title: {
      text: title || "No data",
      left: "center",
      top: "middle",
      textStyle: {
        color: "#6b7280",
        fontSize: 13,
        fontWeight: 500,
      },
    },
  };
}

function groupRowsByCategory(rows = [], xKey, yKey) {
  if (!rows.length || !xKey || !yKey) return [];

  return rows.map((row, index) => ({
    key: String(row[xKey] ?? `Item ${index + 1}`),
    value: Number(row[yKey] ?? 0),
  }));
}

function groupRowsBySeries(rows = [], xKey, yKey, groupKey) {
  const categorySet = new Set();
  const seriesMap = new Map();

  rows.forEach((row) => {
    const category = String(row[xKey] ?? "Unknown");
    const seriesName = String(row[groupKey] ?? "Series");
    const value = Number(row[yKey] ?? 0);
    categorySet.add(category);
    if (!seriesMap.has(seriesName)) {
      seriesMap.set(seriesName, new Map());
    }
    seriesMap.get(seriesName).set(category, value);
  });

  const categories = Array.from(categorySet);
  const series = Array.from(seriesMap.entries()).map(([seriesName, values]) => ({
    name: seriesName,
    data: categories.map((category) => values.get(category) ?? 0),
  }));

  return { categories, series };
}

export function getBaseChartOption({
  chartType = "bar",
  categories = [],
  palette,
  xName = "",
  yName = "",
  valueFormatter = formatChartValue,
  gridOverrides,
  tooltipOverrides,
  axisOverrides,
  legend,
} = {}) {
  const chartTheme = getChartTheme();
  const paletteColors = getSeriesPalette(palette);
  const axis = getAxisStyles({
    chartType,
    categories,
    xName,
    yName,
    valueFormatter,
  });

  return mergeChartOption(
    {
      backgroundColor: chartTheme.background,
      animationDuration: 500,
      animationEasing: "cubicOut",
      color: paletteColors,
      textStyle: {
        color: chartTheme.text,
        fontFamily: "IBM Plex Sans, Segoe UI, sans-serif",
      },
      grid: getGridStyle(gridOverrides),
      tooltip: getTooltipStyle({
        chartType,
        valueFormatter,
        ...(tooltipOverrides ?? {}),
      }),
      xAxis: axis.xAxis,
      yAxis: axis.yAxis,
      legend,
    },
    {
      xAxis: axisOverrides?.xAxis,
      yAxis: axisOverrides?.yAxis,
    }
  );
}

function createBarSeries(values, color, extra = {}) {
  return {
    type: "bar",
    barWidth: "45%",
    data: values,
    itemStyle: {
      color: createBarFill(color),
      borderRadius: [0, 0, 0, 0],
    },
    emphasis: {
      focus: "series",
      itemStyle: {
        color: darkenColor(color, 0.08),
        borderRadius: [0, 0, 0, 0],
      },
    },
    ...extra,
  };
}

function createLineSeries(values, color, options = {}) {
  return {
    type: "line",
    smooth: options.smooth ?? false,
    symbol: options.symbol ?? "circle",
    symbolSize: options.symbolSize ?? 7,
    showSymbol: options.showSymbol ?? true,
    data: values,
    lineStyle: {
      color,
      width: options.lineWidth ?? 3,
    },
    itemStyle: {
      color,
      borderColor: getChartTheme().surface,
      borderWidth: 2,
    },
    emphasis: {
      focus: "series",
      lineStyle: {
        width: (options.lineWidth ?? 3) + 0.5,
      },
      scale: true,
    },
    ...options.extra,
  };
}

export function buildBarChartOption(rows, config, overrides = {}) {
  const categories = groupRowsByCategory(rows, config.x, config.y);
  if (!categories.length) return createEmptyChartOption(config.title || config.name);

  const color = getSeriesColor("bar", 0, config.palette);
  const baseOption = getBaseChartOption({
    chartType: "bar",
    categories: categories.map((item) => item.key),
    palette: config.palette,
    xName: config.xLabel,
    yName: config.yLabel,
  });

  return mergeChartOption(baseOption, {
    ...overrides,
    series: [
      createBarSeries(categories.map((item) => item.value), color, {
        ...overrides.series?.[0],
      }),
    ],
  });
}

export function buildLineChartOption(rows, config, overrides = {}) {
  const categories = groupRowsByCategory(rows, config.x, config.y);
  if (!categories.length) return createEmptyChartOption(config.title || config.name);

  const color = getSeriesColor("line", 0, config.palette);
  const baseOption = getBaseChartOption({
    chartType: "line",
    categories: categories.map((item) => item.key),
    palette: config.palette,
    xName: config.xLabel,
    yName: config.yLabel,
  });

  return mergeChartOption(baseOption, {
    ...overrides,
    series: [
      createLineSeries(
        categories.map((item) => item.value),
        color,
        {
          smooth: config.smooth ?? false,
        }
      ),
    ],
  });
}

export function buildAreaChartOption(rows, config, overrides = {}) {
  const categories = groupRowsByCategory(rows, config.x, config.y);
  if (!categories.length) return createEmptyChartOption(config.title || config.name);

  const color = getSeriesColor("area", 0, config.palette);
  const baseOption = getBaseChartOption({
    chartType: "area",
    categories: categories.map((item) => item.key),
    palette: config.palette,
    xName: config.xLabel,
    yName: config.yLabel,
  });

  return mergeChartOption(baseOption, {
    ...overrides,
    series: [
      createLineSeries(
        categories.map((item) => item.value),
        color,
        {
          smooth: config.smooth ?? false,
          extra: {
            areaStyle: {
              color: createAreaFill(color, 0.16, 0.04),
            },
          },
        }
      ),
    ],
  });
}

function buildGroupedLikeOption(rows, config, stacked = false, overrides = {}) {
  const grouped = groupRowsBySeries(rows, config.x, config.y, config.groupBy);
  if (!grouped.categories.length) return createEmptyChartOption(config.title || config.name);

  const baseOption = getBaseChartOption({
    chartType: stacked ? "stacked-bar" : "grouped-bar",
    categories: grouped.categories,
    palette: config.palette,
    xName: config.xLabel,
    yName: config.yLabel,
    legend: {
      top: 0,
      right: 0,
      itemWidth: 10,
      itemHeight: 10,
      icon: "rect",
      textStyle: {
        color: "#6b7280",
        fontSize: 11,
      },
    },
    gridOverrides: { top: 36 },
  });

  return mergeChartOption(baseOption, {
    ...overrides,
    series: grouped.series.map((seriesItem, index) =>
      createBarSeries(seriesItem.data, getSeriesColor("bar", index, config.palette), {
        name: seriesItem.name,
        stack: stacked ? "total" : undefined,
        barMaxWidth: 26,
      })
    ),
  });
}

function buildPieLikeOption(rows, config, donut = false, overrides = {}) {
  const categories = groupRowsByCategory(rows, config.x, config.y);
  if (!categories.length) return createEmptyChartOption(config.title || config.name);

  return {
    backgroundColor: "transparent",
    animationDuration: 500,
    animationEasing: "cubicOut",
    color: getSeriesPalette(config.palette),
    tooltip: getTooltipStyle({
      chartType: donut ? "donut" : "pie",
      trigger: "item",
      formatter: (params) => `${params.name}<br/>${formatChartValue(params.value)}`,
    }),
    legend: {
      bottom: 0,
      left: "center",
      itemWidth: 10,
      itemHeight: 10,
      icon: "rect",
      textStyle: {
        color: "#6b7280",
        fontSize: 11,
      },
    },
    series: [
      {
        type: "pie",
        radius: donut ? ["50%", "72%"] : ["0%", "72%"],
        center: ["50%", "48%"],
        itemStyle: {
          borderColor: "#ffffff",
          borderWidth: 1,
        },
        label: {
          color: "#6b7280",
          fontSize: 11,
        },
        emphasis: {
          scale: false,
          itemStyle: {
            borderColor: "#ffffff",
            borderWidth: 1,
          },
        },
        data: categories.map((item) => ({ name: item.key, value: item.value })),
      },
    ],
    ...overrides,
  };
}

function buildScatterChartOption(rows, config, overrides = {}) {
  if (!rows.length) return createEmptyChartOption(config.title || config.name);

  const chartTheme = getChartTheme();
  const color = getSeriesColor("line", 0, config.palette);

  return {
    backgroundColor: "transparent",
    animationDuration: 500,
    animationEasing: "cubicOut",
    color: getSeriesPalette(config.palette),
    grid: getGridStyle(),
    tooltip: getTooltipStyle({
      chartType: "scatter",
      trigger: "item",
      formatter: (params) => {
        const [xValue, yValue] = params.value ?? [];
        return `${config.x || "X"}: ${formatChartValue(xValue)}<br/>${config.y || "Y"}: ${formatChartValue(yValue)}`;
      },
    }),
    xAxis: {
      type: "value",
      axisLine: {
        show: true,
        lineStyle: {
          color: "#9ca3af",
          width: 1,
        },
      },
      axisTick: { show: false },
      axisLabel: { color: "#6b7280", fontSize: 12, margin: 12 },
      splitLine: {
        show: true,
        lineStyle: {
          color: "#e5e7eb",
          type: "dashed",
        },
      },
    },
    yAxis: {
      type: "value",
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: "#6b7280",
        fontSize: 12,
        margin: 12,
        formatter: formatChartValue,
      },
      splitLine: {
        show: true,
        lineStyle: {
          color: "#e5e7eb",
          type: "dashed",
        },
      },
    },
    series: [
      {
        type: "scatter",
        symbolSize: 16,
        itemStyle: {
          color: withOpacity(color, 0.78),
          borderColor: chartTheme.surface,
          borderWidth: 1,
        },
        emphasis: {
          focus: "series",
          itemStyle: {
            color,
          },
        },
        data: rows.map((row) => [Number(row[config.x] ?? 0), Number(row[config.y] ?? 0)]),
      },
    ],
    ...overrides,
  };
}

export function buildChartOptionByType(type, payload = {}, overrides = {}) {
  const config = normalizeChartConfig(payload.config ?? {});
  const rows = Array.isArray(payload.rows) ? payload.rows : [];

  switch (type) {
    case "multi-line":
    case "line":
      return buildLineChartOption(rows, config, overrides);
    case "step-line":
      return buildLineChartOption(rows, config, {
        ...overrides,
        series: [{ step: "middle" }],
      });
    case "stacked-area":
    case "area":
      return buildAreaChartOption(rows, config, overrides);
    case "grouped-bar":
      return buildGroupedLikeOption(rows, config, false, overrides);
    case "stacked-bar":
      return buildGroupedLikeOption(rows, config, true, overrides);
    case "horizontal-bar":
      return buildBarChartOption(rows, config, overrides);
    case "pie":
      return buildPieLikeOption(rows, config, false, overrides);
    case "donut":
      return buildPieLikeOption(rows, config, true, overrides);
    case "rose":
      return buildPieLikeOption(rows, config, false, {
        ...overrides,
        series: [{ roseType: "radius" }],
      });
    case "bubble":
    case "scatter":
      return buildScatterChartOption(rows, config, overrides);
    case "bar":
      return buildBarChartOption(rows, config, overrides);
    default:
      return createEmptyChartOption(config.title || config.name || getChartTypeLabel(type));
  }
}

export function getChartTypeLabel(chartType) {
  return CHART_TYPE_LABELS[chartType] ?? `${String(chartType ?? "chart").replace(/-/g, " ")} Chart`;
}

export function createDefaultWidgetName(chartType, existingCharts = []) {
  const label = getChartTypeLabel(chartType).replace(/\s+Chart$/i, " Chart");
  const matchingCount = existingCharts.filter(
    (chart) => normalizeChartConfig(chart.config).chartType === chartType
  ).length;
  return `${label} ${matchingCount + 1}`;
}

export function createChartFromTemplate(templateId, overrides = {}) {
  const template = getChartTemplateById(templateId);
  return {
    ...template,
    ...overrides,
    type: overrides.type ?? template.type,
    defaultSize: overrides.defaultSize ?? template.defaultSize,
    palette: overrides.palette ?? template.palette,
  };
}

export { getAxisStyles, getGridStyle, getSeriesColor, getTooltipStyle };
export { getChartTemplates, getChartTemplateById };
