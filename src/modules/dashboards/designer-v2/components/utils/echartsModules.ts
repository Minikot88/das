import { BarChart, LineChart, PieChart, ScatterChart } from "echarts/charts";
import { DataZoomComponent, DatasetComponent, GridComponent, LegendComponent, TitleComponent, TooltipComponent, TransformComponent, VisualMapComponent } from "echarts/components";
import * as echarts from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import type { ChartType } from "@modules/dashboards/designer-v2/components/types";

echarts.use([
  BarChart,
  LineChart,
  PieChart,
  ScatterChart,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  TitleComponent,
  DatasetComponent,
  TransformComponent,
  VisualMapComponent,
  DataZoomComponent,
  CanvasRenderer,
]);

const BASE_CHART_TYPES = new Set<ChartType | null>([
  null,
  "bar",
  "stacked-bar",
  "horizontal-bar",
  "line",
  "multi-line",
  "time-series-line",
  "sparkline",
  "kpi-trend",
  "area",
  "stacked-area",
  "combo-bar-line",
  "pie",
  "donut",
  "scatter",
  "correlation-scatter",
  "bubble",
  "waterfall",
]);

const loadedChartTypes = new Set<ChartType | null>(BASE_CHART_TYPES);
const pendingChartModules = new Map<ChartType, Promise<void>>();

const CHART_MODULE_LOADERS: Partial<Record<ChartType, () => Promise<unknown>>> = {
  radar: () => import("echarts/lib/chart/radar.js"),
  gauge: () => import("echarts/lib/chart/gauge.js"),
  "progress-ring": () => import("echarts/lib/chart/gauge.js"),
  funnel: () => import("echarts/lib/chart/funnel.js"),
  treemap: () => import("echarts/lib/chart/treemap.js"),
  heatmap: () => Promise.all([
    import("echarts/lib/chart/heatmap.js"),
  ]),
  "calendar-heatmap": () => Promise.all([
    import("echarts/lib/chart/heatmap.js"),
    import("echarts/lib/component/calendar.js"),
  ]),
  sunburst: () => import("echarts/lib/chart/sunburst.js"),
  sankey: () => import("echarts/lib/chart/sankey.js"),
  candlestick: () => import("echarts/lib/chart/candlestick.js"),
  boxplot: () => import("echarts/lib/chart/boxplot.js"),
  "graph-network": () => import("echarts/lib/chart/graph.js"),
  "parallel-coordinates": () => import("echarts/lib/chart/parallel.js"),
};

export function isEChartsChartModuleReady(chartType: ChartType | null) {
  return loadedChartTypes.has(chartType) || !CHART_MODULE_LOADERS[chartType as ChartType];
}

export function ensureEChartsChartModule(chartType: ChartType | null): Promise<void> {
  if (isEChartsChartModuleReady(chartType) || !chartType) return Promise.resolve();
  const existing = pendingChartModules.get(chartType);
  if (existing) return existing;
  const loader = CHART_MODULE_LOADERS[chartType];
  if (!loader) return Promise.resolve();

  const pending = loader().then(() => {
    loadedChartTypes.add(chartType);
    pendingChartModules.delete(chartType);
  }).catch((error) => {
    pendingChartModules.delete(chartType);
    throw error;
  });
  pendingChartModules.set(chartType, pending);
  return pending;
}

export { echarts };
