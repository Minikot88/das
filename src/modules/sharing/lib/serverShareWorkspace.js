function plainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function copy(value) {
  return JSON.parse(JSON.stringify(value ?? null));
}

function projectForServer(project, chartDataById = {}) {
  const source = plainObject(project);
  const datasets = Array.isArray(source.datasets) ? source.datasets : [];
  const datasetIds = new Set(datasets.map((dataset) => String(dataset?.id || "")).filter(Boolean));
  return {
    id: String(source.id || ""),
    name: String(source.name || "Shared workspace"),
    datasets: datasets.map((dataset) => {
      const item = plainObject(dataset);
      return {
        id: String(item.id || ""),
        name: String(item.name || "Dataset"),
        fields: copy(Array.isArray(item.fields) ? item.fields : []),
        rows: copy(Array.isArray(item.rows) ? item.rows : []),
      };
    }),
    charts: Array.isArray(source.charts) ? source.charts.map((chart) => {
      const item = plainObject(chart);
      const snapshotData = plainObject(chartDataById[String(item.id || "")]);
      return {
        id: String(item.id || ""),
        // Charts that use the editor's built-in/demo dataset are still safe to
        // share from their saved data contract, but must not claim a database
        // dataset that does not belong to this imported project.
        datasetId: item.datasetId && datasetIds.has(String(item.datasetId)) ? String(item.datasetId) : null,
        name: String(item.name || item.title || "Chart"),
        engine: String(item.engine || "echarts"),
        mapping: copy(item.mapping),
        settings: copy(item.settings),
        filters: copy(item.filters),
        config: copy(item.config),
        dataContract: copy(Object.keys(snapshotData).length ? snapshotData : item.dataContract),
      };
    }) : [],
    dashboards: Array.isArray(source.dashboards) ? source.dashboards.map((dashboard) => {
      const item = plainObject(dashboard);
      return {
        id: String(item.id || ""),
        name: String(item.name || "Dashboard"),
        canvasSettings: copy(item.canvasSettings),
        widgets: Array.isArray(item.widgets) ? item.widgets.map((widget, index) => {
          const entry = plainObject(widget);
          return {
            id: String(entry.id || `widget-${index + 1}`),
            chartId: entry.chartId ? String(entry.chartId) : null,
            type: String(entry.kind || entry.type || "chart"),
            layout: copy(entry.layout),
            config: copy(entry.presentation || entry.config),
          };
        }) : [],
      };
    }) : [],
  };
}

/**
 * Produces the intentionally small, secret-free payload the server accepts for
 * a one-time immutable share snapshot. Local shares and connection profiles
 * are never sent to the API.
 */
export function buildServerShareWorkspace(workspace, activeProjectId, activeDashboard, chartDataById = {}) {
  const projects = Array.isArray(workspace?.projects) ? workspace.projects : [];
  const selected = projects.find((project) => project?.id === activeProjectId);
  if (!selected || !activeDashboard?.dashboardId) throw new Error("The active dashboard is unavailable for sharing.");

  const project = projectForServer(selected, chartDataById);
  const dashboardId = String(activeDashboard.dashboardId);
  const dashboardIndex = project.dashboards.findIndex((dashboard) => dashboard.id === dashboardId);
  if (dashboardIndex < 0) throw new Error("The active dashboard is unavailable for sharing.");

  project.dashboards[dashboardIndex] = {
    ...project.dashboards[dashboardIndex],
    name: String(activeDashboard.name || activeDashboard.dashboardName || project.dashboards[dashboardIndex].name),
    canvasSettings: copy(activeDashboard.canvasSettings),
    widgets: (Array.isArray(activeDashboard.widgets) ? activeDashboard.widgets : []).map((widget, index) => ({
      id: String(widget?.id || `widget-${index + 1}`),
      chartId: widget?.chartId || widget?.sourceChartId || widget?.sourceChartConfigId || widget?.config?.sourceChartId
        ? String(widget.chartId || widget.sourceChartId || widget.sourceChartConfigId || widget.config?.sourceChartId)
        : null,
      type: String(widget?.type || "chart"),
      layout: { x: Number(widget?.x || 0), y: Number(widget?.y || 0), w: Number(widget?.w || widget?.width || 4), h: Number(widget?.h || widget?.height || 3), zIndex: Number(widget?.zIndex || index) },
      config: copy(widget?.config),
    })),
  };

  return { schemaVersion: 1, projects: [project] };
}
