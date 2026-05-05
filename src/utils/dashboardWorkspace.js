function formatChartTypeLabel(value = "chart") {
  return String(value)
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function createChartRows(chart = {}) {
  return Array.isArray(chart.rows)
    ? chart.rows
    : Array.isArray(chart.data)
      ? chart.data
      : Array.isArray(chart.config?.rows)
        ? chart.config.rows
        : Array.isArray(chart.config?.queryResult?.rows)
          ? chart.config.queryResult.rows
          : [];
}

function createMetaLabel(createdAt, fallbackId) {
  if (!createdAt) return String(fallbackId ?? "").slice(-6);

  return new Date(createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

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
  return {
    builderReturn: {
      projectId: context?.projectId ?? null,
      sheetId: context?.sheetId ?? null,
      dashboardId: context?.dashboardId ?? null,
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

  const rows = createChartRows(widget);
  const title = widget.title || widget.name || widget.config?.options?.plugins?.title?.text || "Chart";

  return {
    ...widget,
    title,
    name: title,
    rows,
    data: rows,
    engine: widget.engine ?? "chartjs",
    type: widget.type ?? widget.config?.type ?? "bar",
    config: {
      ...(widget.config ?? {}),
      rows,
    },
  };
}

export function resolveDashboardWidgets(layout = [], charts = []) {
  return (layout ?? [])
    .map((item, index) => {
      const savedChart = charts.find((chart) => chart.id === item.chartId);
      if (!savedChart) return null;

      const rows = createChartRows(savedChart);
      const title = item.titleOverride || savedChart.title || savedChart.name || `Chart ${index + 1}`;
      const type = savedChart.type ?? savedChart.config?.type ?? "bar";

      return {
        id: item.i,
        chartId: savedChart.id,
        name: title,
        title,
        type,
        typeLabel: formatChartTypeLabel(savedChart.variant ?? savedChart.templateId ?? type),
        createdAt: savedChart.createdAt,
        metaLabel: createMetaLabel(savedChart.createdAt, savedChart.id),
        layout: item,
        rows,
        data: rows,
        engine: savedChart.engine ?? "chartjs",
        templateId: savedChart.templateId ?? null,
        family: savedChart.family ?? null,
        variant: savedChart.variant ?? null,
        mapping: savedChart.mapping ?? {},
        settings: savedChart.settings ?? {},
        dataset: savedChart.dataset ?? savedChart.datasetId ?? null,
        config: {
          ...(savedChart.config ?? {}),
          rows,
        },
      };
    })
    .filter(Boolean);
}

export function findDashboardContextById(projects = [], charts = [], dashboardId = null) {
  if (!dashboardId) return null;

  for (const project of projects ?? []) {
    for (const sheet of project?.sheets ?? []) {
      for (const dashboard of sheet?.dashboards ?? []) {
        if (dashboard?.id !== dashboardId) continue;

        return {
          project,
          sheet,
          dashboard,
          widgets: resolveDashboardWidgets(dashboard.layout ?? [], charts),
        };
      }
    }
  }

  return null;
}

export function createWidgetFromBuilder({
  savedChart,
  existingCharts = [],
} = {}) {
  if (!savedChart) return null;

  return {
    ...savedChart,
    layout: savedChart.layout ?? {
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
