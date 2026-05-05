import { apiRequest, isMockMode } from "./client";
import { mockData, mockRows } from "../data/mockData";
import { mockSchema } from "../data/mockSchema";
import {
  chartJsTemplates,
  getChartJsTemplateById,
  getChartTypes as getTemplateChartTypes,
} from "../utils/chartTemplates";
import {
  getChartValidationMessage,
  validateChartMapping as validateChartMappingInternal,
} from "../utils/chartCompatibility";
import { createChartConfig as createChartConfigInternal } from "../utils/chartFactory";
import {
  executeMockSql,
  generateVisualSql as generateVisualSqlInternal,
} from "../utils/mockSqlEngine";
import { createEntityId } from "../utils/id";
import { useStore } from "../store/useStore";

function getActiveStoreContext() {
  const state = useStore.getState();
  return {
    projectId: state.activeProjectId,
    sheetId: state.activeSheetId,
    dashboardId: state.activeDashboardId,
  };
}

function createSavedChartRecord(payload = {}) {
  const template = getChartJsTemplateById(payload.templateId);
  const timestamp = new Date().toISOString();
  const chartId = payload.id ?? createEntityId("chart");
  const settings = {
    ...template.defaultSettings,
    ...payload.settings,
  };
  const mapping = {
    ...template.defaultMapping,
    ...payload.mapping,
  };
  const rows = Array.isArray(payload.rows) && payload.rows.length
    ? payload.rows
    : Array.isArray(payload.queryResult?.rows) && payload.queryResult.rows.length
      ? payload.queryResult.rows
      : mockRows;
  const config = payload.config ?? createChartConfigInternal({
    templateId: template.id,
    rows,
    schema: payload.querySchema ?? payload.schema ?? mockSchema,
    mapping,
    settings,
  });
  const storeContext = getActiveStoreContext();

  return {
    id: chartId,
    name: payload.name?.trim() || payload.title?.trim() || template.name,
    title: payload.title?.trim() || payload.name?.trim() || template.name,
    engine: "chartjs",
    templateId: template.id,
    type: template.type,
    family: template.family,
    variant: template.variant,
    mapping,
    settings,
    config: {
      ...config,
      queryMode: payload.queryMode ?? "visual",
      generatedSql: payload.generatedSql ?? "",
      customSql: payload.customSql ?? "",
      lastExecutedSql: payload.lastExecutedSql ?? "",
      queryResult: payload.queryResult ?? config.queryResult ?? null,
    },
    rows,
    data: rows,
    datasetId: mockData.id,
    dataset: mockData.id,
    schema: payload.querySchema ?? payload.schema ?? mockSchema,
    projectId: payload.projectId ?? storeContext.projectId,
    sourceProjectId: payload.projectId ?? storeContext.projectId,
    queryMode: payload.queryMode ?? "visual",
    generatedSql: payload.generatedSql ?? "",
    customSql: payload.customSql ?? "",
    lastExecutedSql: payload.lastExecutedSql ?? "",
    queryResult: payload.queryResult ?? null,
    createdAt: payload.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
}

export async function getDataset() {
  if (isMockMode()) return mockData;
  return apiRequest("/api/dataset");
}

export async function getDatasetSchema() {
  if (isMockMode()) return mockSchema;
  return apiRequest("/api/dataset/schema");
}

export async function getChartTypes() {
  if (isMockMode()) return getTemplateChartTypes();
  return apiRequest("/api/chart-types");
}

export async function getChartTemplates() {
  if (isMockMode()) return chartJsTemplates;
  return apiRequest("/api/chart-templates");
}

export async function getChartTemplateById(id) {
  if (isMockMode()) return getChartJsTemplateById(id);
  return apiRequest(`/api/chart-templates/${id}`);
}

export async function validateChartMapping(payload) {
  if (isMockMode()) {
    const result = validateChartMappingInternal({
      ...payload,
      schema: payload.schema ?? mockSchema,
      rows: payload.rows ?? mockRows,
    });
    return {
      ...result,
      message: getChartValidationMessage(result),
    };
  }

  return apiRequest("/api/charts/validate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createChartConfig(payload) {
  if (isMockMode()) {
    return createChartConfigInternal({
      ...payload,
      rows: payload.rows ?? mockRows,
      schema: payload.schema ?? mockSchema,
    });
  }

  return apiRequest("/api/charts/config", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function generateVisualSql(payload) {
  if (isMockMode()) {
    const template = getChartJsTemplateById(payload?.templateId);
    return generateVisualSqlInternal({
      template,
      mapping: payload?.mapping,
      settings: payload?.settings,
      dataset: payload?.dataset ?? mockData,
    });
  }

  return apiRequest("/api/charts/sql-preview", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function runDatasetSql(payload) {
  if (isMockMode()) {
    return executeMockSql({
      sql: payload?.sql,
      rows: payload?.rows ?? mockRows,
      schema: payload?.schema ?? mockSchema,
      dataset: payload?.dataset ?? mockData,
    });
  }

  return apiRequest("/api/dataset/query", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getCharts() {
  if (isMockMode()) {
    return useStore.getState().charts;
  }

  return apiRequest("/api/charts");
}

export async function getChartById(id) {
  if (isMockMode()) {
    return useStore.getState().charts.find((chart) => chart.id === id) ?? null;
  }

  return apiRequest(`/api/charts/${id}`);
}

export async function getChartsByDashboardId(dashboardId, context = {}) {
  if (isMockMode()) {
    const state = useStore.getState();
    const projectId = context.projectId ?? state.activeProjectId;
    const sheetId = context.sheetId ?? state.activeSheetId;
    const project = state.projects.find((item) => item.id === projectId) ?? null;
    const scopedSheet = project?.sheets?.find((item) => item.id === sheetId) ?? null;
    const scopedDashboard = scopedSheet?.dashboards?.find((item) => item.id === dashboardId) ?? null;

    if (scopedDashboard) {
      return (scopedDashboard.layout ?? [])
        .map((item) => state.charts.find(
          (chart) =>
            chart.id === item.chartId &&
            (chart.projectId ?? chart.sourceProjectId ?? projectId) === projectId
        ))
        .filter(Boolean);
    }

    for (const projectItem of state.projects) {
      for (const sheetItem of projectItem.sheets ?? []) {
        const dashboard = sheetItem.dashboards?.find((item) => item.id === dashboardId);
        if (!dashboard) continue;

        return (dashboard.layout ?? [])
          .map((item) => state.charts.find(
            (chart) =>
              chart.id === item.chartId &&
              (chart.projectId ?? chart.sourceProjectId ?? projectItem.id) === projectItem.id
          ))
          .filter(Boolean);
      }
    }
    return [];
  }

  return apiRequest(`/api/dashboards/${dashboardId}/charts`);
}

export async function createChart(payload) {
  if (isMockMode()) {
    const beforeCount = useStore.getState().charts.length;
    const chart = createSavedChartRecord(payload);
    useStore.getState().saveChart(chart);
    return useStore.getState().charts[beforeCount] ?? chart;
  }

  return apiRequest("/api/charts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateChart(id, payload) {
  if (isMockMode()) {
    const state = useStore.getState();
    const existingChart = state.charts.find((chart) => chart.id === id);
    if (!existingChart) throw new Error("Chart not found.");

    const nextChart = createSavedChartRecord({
      ...existingChart,
      ...payload,
      id,
      createdAt: existingChart.createdAt,
    });
    state.updateChart(id, nextChart);
    return nextChart;
  }

  return apiRequest(`/api/charts/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteChart(id) {
  if (isMockMode()) {
    const state = useStore.getState();
    const nextCharts = state.charts.filter((chart) => chart.id !== id);
    useStore.setState({ charts: nextCharts });
    return { success: true };
  }

  return apiRequest(`/api/charts/${id}`, {
    method: "DELETE",
  });
}
