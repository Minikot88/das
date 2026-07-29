export function resolveChartDesignerNavigation({
  route,
  pathname,
  mockMode,
  activeProjectId,
  activeDashboardId,
  storedProjectId,
  storedDashboardId,
}) {
  if (route !== "/dashboard-v2" || pathname !== "/dashboard") return route;
  const projectId = mockMode ? storedProjectId : activeProjectId;
  const dashboardId = mockMode ? storedDashboardId : activeDashboardId;
  const search = new URLSearchParams({
    from: "dashboard",
    mode: "create",
  });
  if (projectId) search.set("projectId", projectId);
  if (dashboardId) search.set("dashboardId", dashboardId);
  return `/dashboard-v2?${search.toString()}`;
}
