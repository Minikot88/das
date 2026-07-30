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

export const chartDesignerRibbonItems = [
  { label: "Templates", icon: "template", tone: "primary", action: "chart:templates", disabled: true, title: "Templates ยังไม่รองรับ Dataset หลายตาราง" },
  { label: "SQL", icon: "api", action: "chart:sql", disabled: true, title: "SQL Preview เป็นแบบอ่านอย่างเดียวในส่วนตารางที่ใช้" },
  { label: "Presets", icon: "settings", action: "chart:presets" },
];
