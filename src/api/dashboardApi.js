import { apiRequest, isMockMode } from "./client";
import { useStore } from "../store/useStore";
import { getChartsByDashboardId } from "./chartApi";
import { resolveDashboardWidgets } from "../utils/dashboardWorkspace";

function getDashboardContext(state, dashboardId, context = {}) {
  const scopedProject = state.projects.find((project) => project.id === context.projectId) ?? null;
  const scopedSheet = scopedProject?.sheets?.find((sheet) => sheet.id === context.sheetId) ?? null;
  const scopedDashboard = scopedSheet?.dashboards?.find((item) => item.id === dashboardId) ?? null;

  if (scopedProject && scopedSheet && scopedDashboard) {
    return { project: scopedProject, sheet: scopedSheet, dashboard: scopedDashboard };
  }

  for (const project of state.projects) {
    for (const sheet of project.sheets ?? []) {
      const dashboard = sheet.dashboards?.find((item) => item.id === dashboardId);
      if (dashboard) {
        return { project, sheet, dashboard };
      }
    }
  }
  return null;
}

export async function getDashboardCharts(dashboardId, context = {}) {
  if (isMockMode()) {
    const state = useStore.getState();
    const scopedContext = getDashboardContext(state, dashboardId, context);
    if (!scopedContext) return [];
    const scopedCharts = state.charts.filter(
      (chart) => (chart.projectId ?? chart.sourceProjectId ?? scopedContext.project.id) === scopedContext.project.id
    );
    return resolveDashboardWidgets(scopedContext.dashboard.layout ?? [], scopedCharts);
  }

  return getChartsByDashboardId(dashboardId, context);
}

export async function addSavedChartToDashboard({ chartId, projectId, sheetId, dashboardId }) {
  if (isMockMode()) {
    const state = useStore.getState();
    if (projectId) state.setActiveProject(projectId);
    if (sheetId) state.setActiveSheet(sheetId);
    if (dashboardId) state.setActiveDashboard(dashboardId);
    const before = getDashboardContext(useStore.getState(), dashboardId ?? useStore.getState().activeDashboardId, {
      projectId,
      sheetId,
    });
    const beforeCount = before?.dashboard?.layout?.length ?? 0;
    state.addChartToDashboard(chartId);
    const after = getDashboardContext(useStore.getState(), dashboardId ?? useStore.getState().activeDashboardId, {
      projectId,
      sheetId,
    });
    const layoutItem = after?.dashboard?.layout?.[beforeCount] ?? after?.dashboard?.layout?.at(-1) ?? null;
    return { layoutItem };
  }

  return apiRequest(`/api/dashboards/${dashboardId}/charts`, {
    method: "POST",
    body: JSON.stringify({ chartId }),
  });
}

export async function loadDashboardContext(dashboardId, context = {}) {
  if (isMockMode()) {
    return getDashboardContext(useStore.getState(), dashboardId, context);
  }

  return apiRequest(`/api/dashboards/${dashboardId}`);
}
