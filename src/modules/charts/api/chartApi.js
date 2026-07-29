import { apiRequest, encodeApiPathSegment, isMockMode } from "@infrastructure/http/client";
import { mockData, mockRows } from "@infrastructure/mock/mockData";
import { mockSchema } from "@modules/charts/data/mockSchema";
import {
  chartJsTemplates,
  getChartJsTemplateById,
  getChartTypes as getTemplateChartTypes,
} from "@modules/charts/lib/chartTemplates";
import {
  getChartValidationMessage,
  validateChartMapping as validateChartMappingInternal,
} from "@modules/charts/lib/chartCompatibility";
import { createChartConfig as createChartConfigInternal } from "@modules/charts/lib/chartFactory";
import {
  executeMockSql,
  generateVisualSql as generateVisualSqlInternal,
} from "@modules/charts/lib/mockSqlEngine";
import { createEntityId } from "@shared/lib/id";
import { useStore } from "@app/store/useStore";
import { loadDefaultProjectDataset } from "@modules/datasets/public/api";

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

export async function getDataset(projectId) {
  if (isMockMode()) return mockData;
  return loadDefaultProjectDataset(projectId);
}

export async function getDatasetSchema(projectId) {
  if (isMockMode()) return mockSchema;
  const dataset = await loadDefaultProjectDataset(projectId);
  return dataset
    ? { datasetId: dataset.id, name: dataset.name, fields: dataset.fields ?? [] }
    : { datasetId: null, name: "", fields: [] };
}

export async function getChartTypes() {
  if (isMockMode()) return getTemplateChartTypes();
  return apiRequest("/api/v1/chart-types");
}

export async function getChartTemplates() {
  if (isMockMode()) return chartJsTemplates;
  const templates = await apiRequest("/api/v1/chart-templates");
  // Chart templates are product capabilities, not business/demo data. Keep
  // the bundled registry available when an installation has not seeded the
  // optional chart_templates catalog yet.
  return Array.isArray(templates) && templates.length ? templates : chartJsTemplates;
}

export async function getChartTemplateById(id) {
  if (isMockMode()) return getChartJsTemplateById(id);
  return apiRequest(`/api/v1/chart-templates/${encodeApiPathSegment(id)}`);
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

  const result = validateChartMappingInternal({
    ...payload,
    schema: payload.schema ?? { fields: [] },
    rows: payload.rows ?? [],
  });
  return { ...result, message: getChartValidationMessage(result) };
}

export async function createChartConfig(payload) {
  if (isMockMode()) {
    return createChartConfigInternal({
      ...payload,
      rows: payload.rows ?? mockRows,
      schema: payload.schema ?? mockSchema,
    });
  }

  return createChartConfigInternal({
    ...payload,
    rows: payload.rows ?? [],
    schema: payload.schema ?? { fields: [] },
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

  const template = getChartJsTemplateById(payload?.templateId);
  return generateVisualSqlInternal({
    template,
    mapping: payload?.mapping,
    settings: payload?.settings,
    dataset: payload?.dataset,
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

  return apiRequest("/api/v1/dataset/query", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getCharts(projectId) {
  if (isMockMode()) {
    const charts = useStore.getState().charts;
    return projectId ? charts.filter((chart) => (chart.projectId ?? chart.sourceProjectId) === projectId) : charts;
  }

  // Charts are project-scoped in production.  Do not issue an unscoped
  // request while the active project is still being resolved.
  if (!projectId) return [];
  return apiRequest(`/api/v1/charts?projectId=${encodeURIComponent(projectId)}`);
}

export async function getChartById(id) {
  if (isMockMode()) {
    return useStore.getState().charts.find((chart) => chart.id === id) ?? null;
  }

  return apiRequest(`/api/v1/charts/${encodeApiPathSegment(id)}`);
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

  return apiRequest(`/api/v1/dashboards/${encodeApiPathSegment(dashboardId)}/charts`);
}

export async function createChart(payload) {
  if (isMockMode()) {
    const beforeCount = useStore.getState().charts.length;
    const chart = createSavedChartRecord(payload);
    useStore.getState().saveChart(chart);
    return useStore.getState().charts[beforeCount] ?? chart;
  }

  return apiRequest("/api/v1/charts", {
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

  return apiRequest(`/api/v1/charts/${encodeApiPathSegment(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteChart(id) {
  if (isMockMode()) {
    const state = useStore.getState();
    state.deleteChart(id);
    return { success: true };
  }

  return apiRequest(`/api/v1/charts/${encodeApiPathSegment(id)}`, {
    method: "DELETE",
  });
}
