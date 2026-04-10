import { normalizeChartConfig } from "./normalizeChartConfig";
import { buildChartOptionByType, createDefaultWidgetName, getChartTypeLabel } from "./builderChartUtils";

export function createBuilderContextForDashboard({
  projectId,
  sheetId,
  dashboardId,
  returnTo = "/dashboard",
  source = "dashboard",
} = {}) {
  if (!projectId || !sheetId || !dashboardId) return null;

  return {
    projectId,
    sheetId,
    dashboardId,
    returnTo,
    source,
  };
}

export function createBuilderReturnState(context, overrides = {}) {
  if (!context?.projectId || !context?.sheetId || !context?.dashboardId) {
    return {
      builderReturn: {
        projectId: null,
        sheetId: null,
        dashboardId: null,
        ...overrides,
      },
    };
  }

  return {
    builderReturn: {
      projectId: context.projectId,
      sheetId: context.sheetId,
      dashboardId: context.dashboardId,
      ...overrides,
    },
  };
}

export function readBuilderReturnState(routeState) {
  const payload = routeState?.builderReturn;
  if (!payload?.projectId || !payload?.sheetId || !payload?.dashboardId) return null;
  return payload;
}

export function toDashboardChartModel(widget) {
  if (!widget) return null;

  const config = normalizeChartConfig(widget.config ?? {});
  const title = widget.name || config.title || config.name || "Chart";

  return {
    ...config,
    id: widget.id,
    chartId: widget.chartId,
    sheetId: widget.sheetId,
    title,
    name: title,
    createdAt: widget.createdAt,
    colorTheme: config.colorTheme,
    dataset: config.dataset,
  };
}

export function resolveDashboardWidgets(layout = [], charts = []) {
  return (layout ?? [])
    .map((item, index) => {
      const savedChart = charts.find((chart) => chart.id === item.chartId);
      if (!savedChart) return null;

      const config = normalizeChartConfig(savedChart.config);
      const fallbackName = `Chart ${index + 1}`;
      const name = item.titleOverride || savedChart.name || config.title || config.name || fallbackName;
      const type = config.chartType || config.type || "bar";

      return {
        id: item.i,
        chartId: savedChart.id,
        name,
        type,
        typeLabel: getChartTypeLabel(type),
        createdAt: savedChart.createdAt,
        metaLabel: savedChart.createdAt
          ? new Date(savedChart.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })
          : String(savedChart.id).slice(-6),
        layout: item,
        config: {
          ...config,
          title: name,
          name,
        },
        echartsOption: buildChartOptionByType(type, {
          rows: savedChart.data ?? [],
          config: {
            ...config,
            title: name,
            name,
          },
        }),
      };
    })
    .filter(Boolean);
}

export function createWidgetFromBuilder({
  chartConfig,
  chartRows,
  context,
  existingCharts = [],
} = {}) {
  const normalizedType = chartConfig?.chartType || "bar";
  const widgetName =
    chartConfig?.name?.trim() || createDefaultWidgetName(normalizedType, existingCharts);
  const title = chartConfig?.title?.trim() || widgetName;

  return {
    name: widgetName,
    type: normalizedType,
    sourceProjectId: context?.projectId,
    createdAt: new Date().toISOString(),
    data: chartRows ?? [],
    echartsOption: buildChartOptionByType(normalizedType, {
      rows: chartRows ?? [],
      config: {
        ...chartConfig,
        name: widgetName,
        title,
      },
    }),
    config: {
      ...chartConfig,
      name: widgetName,
      title,
    },
    layout: {
      w: existingCharts.length ? 6 : 12,
      h: existingCharts.length ? 4 : 5,
      minW: 3,
      minH: 3,
    },
  };
}

export function getDashboardWorkspaceStats(widgets = []) {
  const chartCount = widgets.length;
  const readyChartsCount = widgets.filter((widget) => widget.chartId && widget.type).length;
  const emptyChartsCount = Math.max(chartCount - readyChartsCount, 0);
  const totalWidgetRows = widgets.reduce((sum, widget) => sum + ((widget.layout?.h ?? 0) * 84), 0);
  const coveragePercent = chartCount ? Math.round((readyChartsCount / chartCount) * 100) : 0;

  return {
    chartCount,
    readyChartsCount,
    emptyChartsCount,
    totalWidgetRows,
    coveragePercent,
  };
}
