export function selectProjects(snapshot) {
  return Array.isArray(snapshot?.projects) ? snapshot.projects : [];
}

export function selectProjectById(snapshot, projectId) {
  return selectProjects(snapshot).find((project) => project.id === projectId) ?? null;
}

export function selectActiveProject(snapshot) {
  return selectProjectById(snapshot, snapshot?.active?.projectId) ?? selectProjects(snapshot)[0] ?? null;
}

export function selectProjectDashboards(snapshot, projectId = snapshot?.active?.projectId) {
  const project = selectProjectById(snapshot, projectId);
  return Array.isArray(project?.dashboards) ? project.dashboards : [];
}

export function selectActiveDashboard(snapshot) {
  return selectProjectDashboards(snapshot).find((dashboard) => dashboard.id === snapshot?.active?.dashboardId)
    ?? selectProjectDashboards(snapshot)[0]
    ?? null;
}

export function selectProjectDatasets(snapshot, projectId = snapshot?.active?.projectId) {
  const project = selectProjectById(snapshot, projectId);
  return Array.isArray(project?.datasets) ? project.datasets : [];
}

export function selectProjectCharts(snapshot, projectId = snapshot?.active?.projectId) {
  const project = selectProjectById(snapshot, projectId);
  return Array.isArray(project?.charts) ? project.charts : [];
}

export function selectShareById(snapshot, shareId) {
  for (const project of selectProjects(snapshot)) {
    const share = project.shares?.find((item) => item.id === shareId);
    if (share) return share;
  }
  return null;
}

export function selectLegacySheetAlias(snapshot, sheetId) {
  for (const project of selectProjects(snapshot)) {
    const alias = project.legacySheetAliases?.find((item) => item.sheetId === sheetId);
    if (alias) return { projectId: project.id, ...alias };
  }
  return null;
}
