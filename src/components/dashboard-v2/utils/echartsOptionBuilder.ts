import type { EChartsOption } from "echarts/types/dist/shared";
import type { ChartConfig, ChartType, TransformedChartData, ValidationResult } from "../types";
import { chartPalettes, enterpriseChartTheme, formatValue } from "./chartFormatters";

type ChartTheme = {
  palette?: string[];
};

type ChartVisualTheme = typeof enterpriseChartTheme;

type BuilderInput = {
  chartType: ChartType | null;
  transformedData: TransformedChartData;
  fieldMappings: ChartConfig["mappings"];
  chartSettings: ChartConfig["settings"];
  chartTheme?: ChartTheme;
  validationResult: ValidationResult;
};

type OptionObject = Record<string, unknown>;
type SeriesObject = Record<string, unknown>;

const chartFontFamily = "IBM Plex Sans Thai";
const animationEasing = {
  ease: "cubicOut",
  "ease-in": "cubicIn",
  "ease-out": "cubicOut",
  "ease-in-out": "cubicInOut",
} as const;

const darkChartTheme: ChartVisualTheme = {
  axisLabel: "#D1D5DB",
  axisLine: "#333333",
  gridLine: "rgba(255,255,255,.1)",
  title: "#F9FAFB",
  mutedText: "#9CA3AF",
  panel: "#111111",
  tooltipDark: "#111111",
  tooltipLight: "#181818",
  positive: enterpriseChartTheme.positive,
  negative: enterpriseChartTheme.negative,
};

function isDarkAppTheme() {
  if (typeof document === "undefined") return false;
  return document.documentElement.dataset.theme === "dark" || document.body.classList.contains("dark");
}

function isDarkHexColor(value?: string) {
  if (!value || !value.startsWith("#")) return false;
  const normalized = value.length === 4
    ? `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`
    : value;
  if (!/^#[0-9a-f]{6}$/i.test(normalized)) return false;
  const red = Number.parseInt(normalized.slice(1, 3), 16) / 255;
  const green = Number.parseInt(normalized.slice(3, 5), 16) / 255;
  const blue = Number.parseInt(normalized.slice(5, 7), 16) / 255;
  const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  return luminance < 0.28;
}

function isLightHexColor(value?: string) {
  if (!value || !value.startsWith("#")) return false;
  const normalized = value.length === 4
    ? `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`
    : value;
  if (!/^#[0-9a-f]{6}$/i.test(normalized)) return false;
  const red = Number.parseInt(normalized.slice(1, 3), 16) / 255;
  const green = Number.parseInt(normalized.slice(3, 5), 16) / 255;
  const blue = Number.parseInt(normalized.slice(5, 7), 16) / 255;
  const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  return luminance > 0.72;
}

function isDarkChartMode(settings: ChartConfig["settings"]) {
  const preset = settings.general.themePreset ?? "";
  return isDarkAppTheme() || settings.tooltip.theme === "dark" || preset.includes("dark") || isDarkHexColor(settings.general.backgroundColor);
}

function chartVisualTheme(settings: ChartConfig["settings"]) {
  return isDarkChartMode(settings) ? darkChartTheme : enterpriseChartTheme;
}

function chartBackground(settings: ChartConfig["settings"]) {
  if (isDarkChartMode(settings) && isLightHexColor(settings.general.backgroundColor)) return darkChartTheme.panel;
  return settings.general.backgroundColor;
}

function readableLabelColor(settings: ChartConfig["settings"]) {
  if (!isDarkChartMode(settings)) return settings.labels.color;
  return isDarkHexColor(settings.labels.color) ? darkChartTheme.title : settings.labels.color;
}

function palette(settings: ChartConfig["settings"], chartTheme?: ChartTheme) {
  return chartTheme?.palette?.length ? chartTheme.palette : settings.colors.seriesColors.length ? settings.colors.seriesColors : chartPalettes[settings.colors.palette];
}

function opacity(settings: ChartConfig["settings"]) {
  return Math.max(0.05, Math.min(1, settings.colors.opacity / 100));
}

function lineType(settings: ChartConfig["settings"]) {
  if (settings.grid.lineType === "dotted") return "dotted";
  if (settings.grid.lineType === "dashed") return "dashed";
  return "solid";
}

function titleOption(settings: ChartConfig["settings"]): OptionObject | undefined {
  if (!settings.general.showTitle && !settings.general.showSubtitle) return undefined;
  const theme = chartVisualTheme(settings);
  return {
    text: settings.general.showTitle ? settings.general.title : "",
    subtext: settings.general.showSubtitle ? settings.general.subtitle : "",
    left: 0,
    top: 0,
    textStyle: {
      color: theme.title,
      fontSize: 14,
      fontWeight: 500,
      lineHeight: 19,
      fontFamily: chartFontFamily,
    },
    subtextStyle: {
      color: theme.mutedText,
      fontSize: 11,
      lineHeight: 16,
      fontFamily: chartFontFamily,
    },
  };
}

export function buildCartesianGridOption(settings: ChartConfig["settings"]): OptionObject {
  const top = settings.general.showTitle || settings.general.showSubtitle ? 48 : 16;
  return {
    top,
    left: 50,
    right: 18,
    bottom: settings.legend.showLegend && settings.legend.position === "bottom" ? 50 : 32,
    outerBoundsMode: "same",
    outerBoundsContain: "axisLabel",
  };
}

function legendOption(settings: ChartConfig["settings"]): OptionObject | undefined {
  if (!settings.legend.showLegend) return undefined;
  const theme = chartVisualTheme(settings);
  const horizontal = settings.legend.position === "top" || settings.legend.position === "bottom";
  return {
    show: true,
    type: "scroll",
    orient: horizontal ? "horizontal" : "vertical",
    top: settings.legend.position === "top" ? 24 : settings.legend.position === "bottom" ? undefined : "middle",
    bottom: settings.legend.position === "bottom" ? 8 : undefined,
    left: settings.legend.position === "left" ? 0 : settings.legend.align === "start" ? 0 : settings.legend.align === "end" ? undefined : "center",
    right: settings.legend.position === "right" ? 0 : settings.legend.align === "end" ? 0 : undefined,
    textStyle: {
      color: theme.mutedText,
      fontSize: settings.legend.fontSize,
      lineHeight: Math.round(settings.legend.fontSize * 1.35),
      fontFamily: chartFontFamily,
      fontWeight: 400,
    },
    itemWidth: 10,
    itemHeight: 8,
  };
}

function tooltipOption(settings: ChartConfig["settings"]): OptionObject | undefined {
  if (!settings.tooltip.enabled) return undefined;
  const dark = isDarkChartMode(settings);
  const theme = chartVisualTheme(settings);
  return {
    show: true,
    trigger: "axis",
    backgroundColor: dark ? theme.tooltipDark : theme.tooltipLight,
    borderColor: dark ? "#333333" : "#E2E8F0",
    borderWidth: 1,
    borderRadius: settings.tooltip.borderRadius,
    padding: [7, 9],
    textStyle: {
      color: dark ? "#F8FAFC" : "#0F172A",
      fontSize: 11,
      lineHeight: 16,
      fontFamily: chartFontFamily,
      fontWeight: 400,
    },
  };
}

function baseOption(input: BuilderInput): EChartsOption {
  const settings = input.chartSettings;
  const theme = chartVisualTheme(settings);
  return {
    backgroundColor: chartBackground(settings),
    color: palette(settings, input.chartTheme),
    title: titleOption(settings),
    legend: legendOption(settings),
    tooltip: tooltipOption(settings),
    animation: settings.animation.enabled,
    animationDuration: settings.animation.duration,
    animationEasing: animationEasing[settings.animation.easing],
    textStyle: {
      fontFamily: chartFontFamily,
      color: theme.title,
      fontWeight: 400,
    },
  };
}

function valueAxis(settings: ChartConfig["settings"], name?: string): OptionObject {
  const theme = chartVisualTheme(settings);
  return {
    type: "value",
    show: settings.axis.showYAxis,
    name: settings.axis.showAxisLabels ? name ?? settings.axis.yAxisLabel : "",
    nameTextStyle: { color: theme.mutedText, fontSize: 11, lineHeight: 16, fontFamily: chartFontFamily, fontWeight: 400 },
    axisLabel: {
      color: theme.mutedText,
      fontSize: 11,
      lineHeight: 16,
      fontFamily: chartFontFamily,
      fontWeight: 400,
      formatter: (value: number) => formatValue(value, settings.axis.numberFormat),
    },
    axisLine: { lineStyle: { color: theme.axisLine } },
    splitLine: {
      show: settings.grid.showGrid,
      lineStyle: {
        color: settings.grid.color || theme.gridLine,
        opacity: settings.grid.opacity / 100,
        type: lineType(settings),
      },
    },
  };
}

function categoryAxis(settings: ChartConfig["settings"], categories: string[], name?: string): OptionObject {
  const theme = chartVisualTheme(settings);
  return {
    type: "category",
    data: categories,
    show: settings.axis.showXAxis,
    name: settings.axis.showAxisLabels ? name ?? settings.axis.xAxisLabel : "",
    nameTextStyle: { color: theme.mutedText, fontSize: 11, lineHeight: 16, fontFamily: chartFontFamily, fontWeight: 400 },
    axisLabel: {
      color: theme.mutedText,
      fontSize: 11,
      lineHeight: 16,
      fontFamily: chartFontFamily,
      fontWeight: 400,
      rotate: settings.axis.rotateXLabels,
    },
    axisLine: { lineStyle: { color: theme.axisLine } },
    axisTick: { show: false },
    splitLine: {
      show: false,
      lineStyle: {
        color: settings.grid.color || theme.gridLine,
        opacity: settings.grid.opacity / 100,
        type: lineType(settings),
      },
    },
  };
}

function labelOption(settings: ChartConfig["settings"]) {
  return {
    show: settings.labels.showDataLabels,
    position: settings.labels.position === "outside" ? "top" : settings.labels.position,
    color: readableLabelColor(settings),
    fontSize: settings.labels.fontSize,
    lineHeight: Math.round(settings.labels.fontSize * 1.35),
    fontFamily: chartFontFamily,
    fontWeight: 400,
    formatter: (params: { value?: unknown }) => {
      const value = Array.isArray(params.value) ? params.value[1] : params.value;
      return typeof value === "number" ? formatValue(value, settings.axis.numberFormat) : String(value ?? "");
    },
  };
}

function seriesData(data: TransformedChartData, key: string) {
  return data.rows.map((row) => Number(row[key] ?? 0));
}

function categories(data: TransformedChartData) {
  return data.rows.map((row) => String(row.name));
}

function compactSeriesKeys(data: TransformedChartData) {
  return data.seriesKeys.length ? data.seriesKeys : data.yField ? [data.yField.id] : [];
}

function buildCartesianOption(input: BuilderInput, chartKind: "bar" | "line" | "area" | "combo" | "waterfall", horizontal = false, stacked = false): EChartsOption {
  const option = baseOption(input);
  const data = input.transformedData;
  const settings = input.chartSettings;
  const keys = compactSeriesKeys(data);
  const names = categories(data);
  const colors = palette(settings, input.chartTheme);
  const series: SeriesObject[] = [];

  if (chartKind === "waterfall") {
    const theme = chartVisualTheme(settings);
    series.push({
      name: "ฐาน",
      type: "bar",
      stack: "waterfall",
      itemStyle: { borderColor: "transparent", color: "transparent" },
      emphasis: { itemStyle: { borderColor: "transparent", color: "transparent" } },
      data: data.waterfallRows.map((row) => row.start),
    });
    series.push({
      name: data.yField?.name ?? "ค่า",
      type: "bar",
      stack: "waterfall",
      label: labelOption(settings),
      itemStyle: {
        color: (params: { dataIndex: number }) => data.waterfallRows[params.dataIndex]?.positive ? theme.positive : theme.negative,
      },
      data: data.waterfallRows.map((row) => row.value),
    });
  } else {
    keys.forEach((key, index) => {
      const lineLike = chartKind === "line" || chartKind === "area" || (chartKind === "combo" && index % 2 === 1);
      series.push({
        name: data.seriesLabels[key] ?? key,
        type: lineLike ? "line" : "bar",
        stack: stacked ? "total" : undefined,
        smooth: lineLike,
        symbolSize: lineLike ? 6 : undefined,
        areaStyle: chartKind === "area" ? { opacity: 0.16 } : undefined,
        barMaxWidth: 34,
        itemStyle: {
          color: colors[index % colors.length],
          opacity: opacity(settings),
          borderRadius: lineLike ? undefined : [settings.general.radius, settings.general.radius, 0, 0],
        },
        lineStyle: { width: 2 },
        label: labelOption(settings),
        data: seriesData(data, key),
      });
    });
  }

  return {
    ...option,
    grid: buildCartesianGridOption(settings),
    xAxis: horizontal ? valueAxis(settings, data.yField?.name) : categoryAxis(settings, names, data.xField?.name),
    yAxis: horizontal ? categoryAxis(settings, names, data.xField?.name) : valueAxis(settings, data.yField?.name),
    series,
  };
}

function buildBarOption(input: BuilderInput): EChartsOption {
  return buildCartesianOption(input, "bar", false, input.chartType === "stacked-bar");
}

function buildHorizontalBarOption(input: BuilderInput): EChartsOption {
  return buildCartesianOption(input, "bar", true, false);
}

function buildLineOption(input: BuilderInput): EChartsOption {
  return buildCartesianOption(input, "line", false, false);
}

function buildAreaOption(input: BuilderInput): EChartsOption {
  return buildCartesianOption(input, "area", false, input.chartType === "stacked-area");
}

function buildComboOption(input: BuilderInput): EChartsOption {
  return buildCartesianOption(input, "combo", false, false);
}

function buildPieOption(input: BuilderInput, donut = false): EChartsOption {
  const option = baseOption(input);
  const settings = input.chartSettings;
  return {
    ...option,
    tooltip: input.chartSettings.tooltip.enabled ? { ...tooltipOption(settings), trigger: "item" } : undefined,
    legend: legendOption(settings),
    series: [
      {
        name: input.transformedData.yField?.name ?? "ค่า",
        type: "pie",
        radius: donut ? ["48%", "72%"] : ["0%", "72%"],
        center: ["50%", "54%"],
        itemStyle: {
          borderColor: settings.colors.borderColor,
          borderWidth: 1,
          opacity: opacity(settings),
        },
        label: labelOption(settings),
        data: input.transformedData.pieRows.map((row) => ({ name: row.name, value: row.value })),
      },
    ],
  };
}

function buildScatterOption(input: BuilderInput, bubble = false): EChartsOption {
  const option = baseOption(input);
  const settings = input.chartSettings;
  const data = input.transformedData;
  const xField = data.xField;
  const yField = data.yField;
  const sizeField = input.fieldMappings.find((slot) => slot.id === "size")?.fields[0];
  const values = data.rows.map((row) => [Number(row[xField?.id ?? ""] ?? 0), Number(row[yField?.id ?? ""] ?? 0), Number(row[sizeField?.id ?? ""] ?? 8), row.name]);
  const maxSize = Math.max(...values.map((row) => Number(row[2])), 1);

  return {
    ...option,
    grid: buildCartesianGridOption(settings),
    xAxis: valueAxis(settings, xField?.name),
    yAxis: valueAxis(settings, yField?.name),
    series: [
      {
        name: yField?.name ?? "ค่า",
        type: "scatter",
        data: values,
        symbolSize: bubble ? (value: unknown) => {
          const list = Array.isArray(value) ? value : [];
          return 8 + (Number(list[2] ?? 0) / maxSize) * 30;
        } : 9,
        itemStyle: { opacity: opacity(settings) },
        label: labelOption(settings),
      },
    ],
  };
}

function buildRadarOption(input: BuilderInput): EChartsOption {
  const option = baseOption(input);
  const settings = input.chartSettings;
  const theme = chartVisualTheme(settings);
  const rows = input.transformedData.pieRows.slice(0, 8);
  const max = Math.max(...rows.map((row) => row.value), 1);
  return {
    ...option,
    tooltip: tooltipOption(settings),
    radar: {
      radius: "64%",
      indicator: rows.map((row) => ({ name: row.name, max: max * 1.12 })),
      axisName: { color: theme.mutedText, fontSize: 11, lineHeight: 16, fontFamily: chartFontFamily, fontWeight: 400 },
      splitLine: { lineStyle: { color: theme.gridLine } },
      splitArea: { areaStyle: { color: isDarkChartMode(settings) ? ["#111111", "#181818"] : ["#FFFFFF", "#F8FAFC"] } },
    },
    series: [
      {
        type: "radar",
        name: input.transformedData.yField?.name ?? "ค่า",
        areaStyle: { opacity: 0.12 },
        data: [{ value: rows.map((row) => row.value), name: input.transformedData.yField?.name ?? "ค่า" }],
      },
    ],
  };
}

function buildGaugeOption(input: BuilderInput): EChartsOption {
  const option = baseOption(input);
  const settings = input.chartSettings;
  const theme = chartVisualTheme(settings);
  return {
    ...option,
    series: [
      {
        type: "gauge",
        min: 0,
        max: 100,
        progress: { show: true, roundCap: true, width: 12 },
        axisLine: { lineStyle: { width: 12, color: [[1, isDarkChartMode(settings) ? "#333333" : "#E2E8F0"]] } },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        pointer: { show: input.chartType !== "progress-ring" },
        detail: {
          valueAnimation: settings.animation.enabled,
          formatter: "{value}%",
          fontSize: 24,
          fontWeight: 500,
          lineHeight: 32,
          fontFamily: chartFontFamily,
          color: theme.title,
        },
        data: [{ value: Number(input.transformedData.gaugePercent.toFixed(1)), name: input.transformedData.kpiLabel }],
      },
    ],
  };
}

function buildFunnelOption(input: BuilderInput): EChartsOption {
  const option = baseOption(input);
  return {
    ...option,
    tooltip: input.chartSettings.tooltip.enabled ? { ...tooltipOption(input.chartSettings), trigger: "item" } : undefined,
    series: [
      {
        type: "funnel",
        top: input.chartSettings.general.showTitle ? 56 : 16,
        bottom: 16,
        left: "10%",
        width: "80%",
        minSize: "20%",
        maxSize: "100%",
        sort: "descending",
        gap: 2,
        label: labelOption(input.chartSettings),
        data: input.transformedData.funnelRows,
      },
    ],
  };
}

function buildTreemapOption(input: BuilderInput): EChartsOption {
  const option = baseOption(input);
  return {
    ...option,
    tooltip: input.chartSettings.tooltip.enabled ? { ...tooltipOption(input.chartSettings), trigger: "item" } : undefined,
    series: [
      {
        type: "treemap",
        roam: false,
        breadcrumb: { show: false },
        nodeClick: false,
        label: { show: true, fontSize: 11, lineHeight: 15, fontFamily: chartFontFamily, fontWeight: 400 },
        itemStyle: { borderColor: "#FFFFFF", borderWidth: 2, gapWidth: 2 },
        data: input.transformedData.treemapRows.map((row) => ({ name: row.name, value: row.size })),
      },
    ],
  };
}

function buildHeatmapOption(input: BuilderInput): EChartsOption {
  const option = baseOption(input);
  const settings = input.chartSettings;
  const theme = chartVisualTheme(settings);
  const xs = Array.from(new Set(input.transformedData.heatmapRows.map((row) => row.x)));
  const ys = Array.from(new Set(input.transformedData.heatmapRows.map((row) => row.y)));
  const max = Math.max(...input.transformedData.heatmapRows.map((row) => row.value), 1);
  return {
    ...option,
    grid: buildCartesianGridOption(settings),
    xAxis: categoryAxis(settings, xs, input.transformedData.xField?.name),
    yAxis: categoryAxis(settings, ys, input.transformedData.legendField?.name),
    visualMap: {
      min: 0,
      max,
      calculable: true,
      orient: "horizontal",
      left: "center",
      bottom: 4,
      inRange: { color: ["#EAF2FF", "#2563EB"] },
      textStyle: { fontFamily: chartFontFamily, fontWeight: 400, fontSize: 10, lineHeight: 14, color: theme.mutedText },
    },
    series: [
      {
        type: "heatmap",
        data: input.transformedData.heatmapRows.map((row) => [xs.indexOf(row.x), ys.indexOf(row.y), row.value]),
        label: labelOption(settings),
        emphasis: { itemStyle: { borderColor: "#94A3B8", borderWidth: 1 } },
      },
    ],
  };
}

function buildSunburstOption(input: BuilderInput): EChartsOption {
  const option = baseOption(input);
  return {
    ...option,
    tooltip: input.chartSettings.tooltip.enabled ? { ...tooltipOption(input.chartSettings), trigger: "item" } : undefined,
    series: [
      {
        type: "sunburst",
        radius: [0, "82%"],
        sort: "desc",
        emphasis: { focus: "ancestor" },
        label: { fontSize: 10, lineHeight: 14, rotate: "radial", fontFamily: chartFontFamily, fontWeight: 400 },
        data: input.transformedData.sunburstRows,
      },
    ],
  };
}

function buildSankeyOption(input: BuilderInput): EChartsOption {
  const option = baseOption(input);
  const theme = chartVisualTheme(input.chartSettings);
  return {
    ...option,
    tooltip: input.chartSettings.tooltip.enabled ? { ...tooltipOption(input.chartSettings), trigger: "item" } : undefined,
    series: [
      {
        type: "sankey",
        left: 8,
        right: 24,
        top: input.chartSettings.general.showTitle ? 56 : 12,
        bottom: 12,
        nodeWidth: 12,
        nodeGap: 8,
        emphasis: { focus: "adjacency" },
        lineStyle: { color: "gradient", curveness: 0.5, opacity: 0.28 },
        label: { color: theme.title, fontSize: 11, lineHeight: 15, fontFamily: chartFontFamily, fontWeight: 400 },
        data: input.transformedData.sankeyNodes,
        links: input.transformedData.sankeyLinks,
      },
    ],
  };
}

function buildCandlestickOption(input: BuilderInput): EChartsOption {
  const option = baseOption(input);
  const settings = input.chartSettings;
  const theme = chartVisualTheme(settings);
  return {
    ...option,
    grid: buildCartesianGridOption(settings),
    xAxis: categoryAxis(settings, input.transformedData.candlestickRows.map((row) => row.name), input.transformedData.xField?.name),
    yAxis: valueAxis(settings, "OHLC"),
    dataZoom: [{ type: "inside" }, { type: "slider", height: 18, bottom: 4 }],
    series: [
      {
        type: "candlestick",
        name: "OHLC",
        data: input.transformedData.candlestickRows.map((row) => row.values),
        itemStyle: {
          color: theme.positive,
          color0: theme.negative,
          borderColor: theme.positive,
          borderColor0: theme.negative,
        },
      },
    ],
  };
}

function buildBoxplotOption(input: BuilderInput): EChartsOption {
  const option = baseOption(input);
  const settings = input.chartSettings;
  return {
    ...option,
    grid: buildCartesianGridOption(settings),
    xAxis: categoryAxis(settings, input.transformedData.boxplotRows.map((row) => row.name), input.transformedData.xField?.name),
    yAxis: valueAxis(settings, input.transformedData.yField?.name),
    series: [
      {
        type: "boxplot",
        name: input.transformedData.yField?.name ?? "ค่า",
        data: input.transformedData.boxplotRows.map((row) => row.values),
        itemStyle: { borderColor: "#2563EB" },
      },
    ],
  };
}

function buildWaterfallOption(input: BuilderInput): EChartsOption {
  return buildCartesianOption(input, "waterfall", false, true);
}

function buildCalendarOption(input: BuilderInput): EChartsOption {
  const option = baseOption(input);
  const settings = input.chartSettings;
  const theme = chartVisualTheme(settings);
  const values = input.transformedData.calendarRows;
  const years = Array.from(new Set(values.map((row) => row[0].slice(0, 4)))).sort();
  const range = years.length ? [values[0]?.[0], values[values.length - 1]?.[0]] : [new Date().toISOString().slice(0, 10), new Date().toISOString().slice(0, 10)];
  const max = Math.max(...values.map((row) => row[1]), 1);
  return {
    ...option,
    visualMap: {
      min: 0,
      max,
      type: "piecewise",
      orient: "horizontal",
      left: "center",
      bottom: 2,
      inRange: { color: ["#EAF2FF", "#2563EB"] },
      textStyle: { fontFamily: chartFontFamily, fontWeight: 400, fontSize: 10, lineHeight: 14, color: theme.mutedText },
    },
    calendar: {
      top: input.chartSettings.general.showTitle ? 58 : 22,
      left: 28,
      right: 28,
      bottom: 40,
      range,
      cellSize: ["auto", 13],
      splitLine: { lineStyle: { color: isDarkChartMode(settings) ? "#333333" : "#E2E8F0", width: 1 } },
      itemStyle: { borderWidth: 0.5, borderColor: isDarkChartMode(settings) ? "#252525" : "#F1F5F9" },
      yearLabel: { show: true, color: theme.mutedText, fontSize: 11, lineHeight: 15, fontFamily: chartFontFamily, fontWeight: 400 },
      dayLabel: { color: theme.mutedText, fontSize: 10, lineHeight: 14, fontFamily: chartFontFamily, fontWeight: 400 },
      monthLabel: { color: theme.mutedText, fontSize: 10, lineHeight: 14, fontFamily: chartFontFamily, fontWeight: 400 },
    },
    series: [{ type: "heatmap", coordinateSystem: "calendar", data: values }],
  };
}

function buildGraphOption(input: BuilderInput): EChartsOption {
  const option = baseOption(input);
  return {
    ...option,
    tooltip: input.chartSettings.tooltip.enabled ? { ...tooltipOption(input.chartSettings), trigger: "item" } : undefined,
    series: [
      {
        type: "graph",
        layout: "force",
        roam: true,
        force: { repulsion: 120, edgeLength: 70 },
        label: { show: true, fontSize: 10, lineHeight: 14, fontFamily: chartFontFamily, fontWeight: 400 },
        edgeSymbol: ["none", "arrow"],
        edgeSymbolSize: 5,
        data: input.transformedData.graphNodes,
        links: input.transformedData.graphLinks,
        lineStyle: { color: "#94A3B8", opacity: 0.55 },
      },
    ],
  };
}

function buildParallelOption(input: BuilderInput): EChartsOption {
  const option = baseOption(input);
  const theme = chartVisualTheme(input.chartSettings);
  return {
    ...option,
    parallelAxis: input.transformedData.parallelDimensions.map((name, index) => ({
      dim: index,
      name,
      nameTextStyle: { color: theme.mutedText, fontSize: 11, lineHeight: 15, fontFamily: chartFontFamily, fontWeight: 400 },
      axisLabel: { color: theme.mutedText, fontSize: 10, lineHeight: 14, fontFamily: chartFontFamily, fontWeight: 400 },
    })),
    parallel: { left: 44, right: 24, top: input.chartSettings.general.showTitle ? 58 : 20, bottom: 24 },
    series: [
      {
        type: "parallel",
        lineStyle: { width: 1, opacity: 0.24 },
        data: input.transformedData.parallelRows,
      },
    ],
  };
}

export function buildEChartsOption(input: BuilderInput): EChartsOption {
  if (!input.validationResult.valid) {
    return baseOption(input);
  }

  if (input.chartType === "horizontal-bar") return buildHorizontalBarOption(input);
  if (input.chartType === "line" || input.chartType === "multi-line" || input.chartType === "time-series-line" || input.chartType === "sparkline" || input.chartType === "kpi-trend") return buildLineOption(input);
  if (input.chartType === "area" || input.chartType === "stacked-area") return buildAreaOption(input);
  if (input.chartType === "combo-bar-line") return buildComboOption(input);
  if (input.chartType === "pie") return buildPieOption(input);
  if (input.chartType === "donut") return buildPieOption(input, true);
  if (input.chartType === "scatter" || input.chartType === "correlation-scatter") return buildScatterOption(input);
  if (input.chartType === "bubble") return buildScatterOption(input, true);
  if (input.chartType === "radar") return buildRadarOption(input);
  if (input.chartType === "gauge" || input.chartType === "progress-ring") return buildGaugeOption(input);
  if (input.chartType === "funnel") return buildFunnelOption(input);
  if (input.chartType === "treemap") return buildTreemapOption(input);
  if (input.chartType === "heatmap") return buildHeatmapOption(input);
  if (input.chartType === "sunburst") return buildSunburstOption(input);
  if (input.chartType === "sankey") return buildSankeyOption(input);
  if (input.chartType === "candlestick") return buildCandlestickOption(input);
  if (input.chartType === "boxplot") return buildBoxplotOption(input);
  if (input.chartType === "waterfall") return buildWaterfallOption(input);
  if (input.chartType === "calendar-heatmap") return buildCalendarOption(input);
  if (input.chartType === "graph-network") return buildGraphOption(input);
  if (input.chartType === "parallel-coordinates") return buildParallelOption(input);
  return buildBarOption(input);
}
