export function getBuilderContext(routeState, fallbackContext) {
  return routeState?.builderContext ?? fallbackContext ?? null;
}

export function validateBuilderContext(context, projects = []) {
  if (!context?.projectId || !context?.sheetId || !context?.dashboardId) {
    return { isValid: false, project: null, sheet: null, dashboard: null };
  }

  const project = projects.find((item) => item.id === context.projectId) ?? null;
  const sheet = project?.sheets.find((item) => item.id === context.sheetId) ?? null;
  const dashboard = sheet?.dashboards.find((item) => item.id === context.dashboardId) ?? null;

  return {
    isValid: Boolean(project && sheet && dashboard),
    project,
    sheet,
    dashboard,
  };
}

export function getTargetDashboard(context, projects = []) {
  const validation = validateBuilderContext(context, projects);
  return validation.isValid ? validation.dashboard : null;
}

export {
  buildAreaChartOption,
  buildBarChartOption,
  buildChartOptionByType,
  buildLineChartOption,
  createChartFromTemplate,
  createDefaultWidgetName,
  getChartTemplates,
  getChartTypeLabel,
} from "./chartFactory";
