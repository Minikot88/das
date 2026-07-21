import { cloneWorkspace, normalizeWorkspaceDocument, validateWorkspaceDocument } from "@domain/workspace/workspaceSchema";
import { createMigrationCandidate } from "@domain/workspace/workspaceMigrations";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function projectSheetAliases(project) {
  if (asArray(project.legacySheetAliases).length) return project.legacySheetAliases;
  return [{
    sheetId: `sheet-${project.id}`,
    name: "Sheet 1",
    dashboardIds: project.dashboards.map((dashboard) => dashboard.id),
  }];
}

function toLegacyDashboard(dashboard) {
  return {
    id: dashboard.id,
    name: dashboard.name,
    charts: dashboard.widgets.map((widget) => ({
      id: widget.id,
      instanceId: widget.id,
      chartId: widget.chartId,
      type: widget.kind,
      presentation: cloneWorkspace(widget.presentation),
      chartSnapshot: cloneWorkspace(widget.chartSnapshot),
      assetRef: widget.assetRef,
      createdAt: widget.createdAt,
      updatedAt: widget.updatedAt,
    })),
    layout: dashboard.widgets.map((widget) => ({
      i: widget.id,
      chartId: widget.chartId,
      ...cloneWorkspace(widget.layout),
    })),
    canvasSize: cloneWorkspace(dashboard.canvasSettings),
    createdAt: dashboard.createdAt,
    updatedAt: dashboard.updatedAt,
  };
}

function mergeById(existing, incoming, mergeItem = (_existing, next) => next) {
  const result = existing.map((item) => cloneWorkspace(item));
  const indexes = new Map(result.map((item, index) => [item.id, index]));
  incoming.forEach((item) => {
    const index = indexes.get(item.id);
    if (typeof index === "number") {
      result[index] = mergeItem(result[index], cloneWorkspace(item));
    } else {
      indexes.set(item.id, result.length);
      result.push(cloneWorkspace(item));
    }
  });
  return result;
}

function mergeProject(existing, incoming, clock) {
  const dashboards = mergeById(existing.dashboards, incoming.dashboards, (current, next) => ({
    ...current,
    ...next,
    widgets: mergeById(current.widgets, next.widgets),
  }));
  return {
    ...existing,
    name: incoming.name || existing.name,
    datasets: mergeById(existing.datasets, incoming.datasets, (current, next) => ({
      ...current,
      ...next,
      fields: Array.isArray(next.fields) ? next.fields : current.fields,
      rows: Array.isArray(next.rows) ? next.rows : current.rows,
      rowCount: Array.isArray(next.rows) ? next.rows.length : current.rowCount,
      columnCount: Array.isArray(next.fields) ? next.fields.length : current.columnCount,
    })),
    charts: mergeById(existing.charts, incoming.charts),
    dashboards,
    shares: mergeById(existing.shares, incoming.shares),
    connectionProfiles: existing.connectionProfiles,
    legacySheetAliases: incoming.legacySheetAliases.length
      ? cloneWorkspace(incoming.legacySheetAliases)
      : existing.legacySheetAliases,
    updatedAt: clock(),
  };
}

export function toProjectStorageProjects(workspace) {
  return asArray(workspace?.projects).map((project) => ({
    id: project.id,
    name: project.name,
    datasets: project.datasets.map((dataset) => cloneWorkspace(dataset)),
    charts: project.charts.map((chart) => ({
      ...cloneWorkspace(chart),
      fieldMappings: cloneWorkspace(chart.config?.fieldMappings ?? chart.config?.mappings ?? []),
      settings: cloneWorkspace(chart.config?.settings ?? {}),
      filters: cloneWorkspace(chart.config?.filters ?? {}),
      datasetInfo: {
        sourceType: chart.dataContract?.sourceType ?? (chart.datasetId ? "dataset" : "unknown"),
        datasetId: chart.datasetId,
      },
      source: "canonical-workspace",
    })),
    dashboards: project.dashboards.map((dashboard) => ({
      id: dashboard.id,
      projectId: project.id,
      name: dashboard.name,
      dashboardName: dashboard.name,
      widgets: dashboard.widgets.map((widget) => ({
        id: widget.id,
        dashboardId: dashboard.id,
        projectId: project.id,
        type: widget.kind,
        title: widget.presentation?.title ?? widget.kind,
        sourceChartId: widget.chartId ?? undefined,
        sourceChartConfigId: widget.chartId ?? undefined,
        x: widget.layout.x,
        y: widget.layout.y,
        w: widget.layout.w,
        h: widget.layout.h,
        zIndex: widget.layout.zIndex,
        visible: widget.presentation?.visible !== false,
        background: widget.presentation?.background ?? "#FFFFFF",
        borderColor: widget.presentation?.borderColor ?? "#E6EAF0",
        radius: widget.presentation?.radius ?? 6,
        config: cloneWorkspace(widget.presentation ?? {}),
        chartConfigSnapshot: cloneWorkspace(widget.chartSnapshot),
        assetRef: widget.assetRef,
        createdAt: widget.createdAt,
        updatedAt: widget.updatedAt,
      })),
      canvasSettings: cloneWorkspace(dashboard.canvasSettings),
      theme: dashboard.canvasSettings?.theme === "dark" ? "dark" : "light",
      createdAt: dashboard.createdAt,
      updatedAt: dashboard.updatedAt,
    })),
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  }));
}

export function toZustandWorkspaceSnapshot(workspace, uiState = {}) {
  const projects = asArray(workspace?.projects);
  const activeProject = projects.find((project) => project.id === workspace?.active?.projectId) ?? projects[0] ?? null;
  const aliases = activeProject ? projectSheetAliases(activeProject) : [];
  const activeSheet = aliases.find((alias) => alias.dashboardIds.includes(workspace?.active?.dashboardId)) ?? aliases[0] ?? null;
  const shareLinks = {};
  projects.forEach((project) => {
    project.shares.forEach((share) => {
      shareLinks[share.id] = {
        ...cloneWorkspace(share),
        sheetId: share.legacySheetId,
        mode: share.dashboardId ? "dashboard-readonly" : "readonly",
      };
    });
  });

  return {
    ...cloneWorkspace(uiState),
    version: 8,
    projects: projects.map((project) => ({
      id: project.id,
      name: project.name,
      sheets: projectSheetAliases(project).map((alias) => {
        const dashboards = alias.dashboardIds
          .map((dashboardId) => project.dashboards.find((dashboard) => dashboard.id === dashboardId))
          .filter(Boolean)
          .map(toLegacyDashboard);
        return {
          id: alias.sheetId,
          name: alias.name,
          dashboards,
          activeDashboardId: dashboards.some((dashboard) => dashboard.id === workspace?.active?.dashboardId)
            ? workspace.active.dashboardId
            : dashboards[0]?.id ?? null,
        };
      }),
    })),
    activeProjectId: activeProject?.id ?? null,
    activeSheetId: activeSheet?.sheetId ?? null,
    activeDashboardId: workspace?.active?.dashboardId ?? null,
    charts: projects.flatMap((project) => project.charts.map((chart) => cloneWorkspace(chart))),
    importedDatasets: projects.flatMap((project) => project.datasets.map((dataset) => cloneWorkspace(dataset))),
    shareLinks,
    appSettings: cloneWorkspace(workspace?.settings ?? {}),
    theme: workspace?.settings?.theme ?? "system",
    locale: workspace?.settings?.locale ?? "th",
  };
}

export function mergeZustandWorkspaceSnapshot(workspace, zustandSnapshot, { clock = () => new Date().toISOString() } = {}) {
  const projected = createMigrationCandidate({
    rawByKey: {
      "mini-bi-v8-workspace": JSON.stringify(zustandSnapshot ?? {}),
      "mini-bi-active-project-id": zustandSnapshot?.activeProjectId ?? null,
      "mini-bi-active-dashboard-id": zustandSnapshot?.activeDashboardId ?? null,
    },
  }, { clock }).document;

  const merged = cloneWorkspace(workspace);
  merged.projects = mergeById(merged.projects, projected.projects, (current, incoming) =>
    mergeProject(current, incoming, clock)
  );
  if (merged.projects.some((project) => project.id === projected.active.projectId)) {
    merged.active.projectId = projected.active.projectId;
    const project = merged.projects.find((item) => item.id === projected.active.projectId);
    merged.active.dashboardId = project?.dashboards.some((dashboard) => dashboard.id === projected.active.dashboardId)
      ? projected.active.dashboardId
      : project?.dashboards[0]?.id ?? null;
  }
  merged.settings = cloneWorkspace(projected.settings);
  merged.updatedAt = clock();
  const normalized = normalizeWorkspaceDocument(merged, { clock });
  const validation = validateWorkspaceDocument(normalized);
  if (!validation.valid) {
    throw new Error(`Zustand compatibility merge failed: ${validation.errors.join("; ")}`);
  }
  return normalized;
}

export function mergeProjectStorageProjects(workspace, projects, { clock = () => new Date().toISOString() } = {}) {
  const projected = createMigrationCandidate({
    rawByKey: {
      "mini-bi-projects": JSON.stringify(asArray(projects)),
      "mini-bi-active-project-id": workspace?.active?.projectId ?? null,
      "mini-bi-active-dashboard-id": workspace?.active?.dashboardId ?? null,
    },
  }, { clock }).document;
  const merged = cloneWorkspace(workspace);
  merged.projects = mergeById(merged.projects, projected.projects, (current, incoming) =>
    mergeProject(current, incoming, clock)
  );
  merged.updatedAt = clock();
  const normalized = normalizeWorkspaceDocument(merged, { clock });
  const validation = validateWorkspaceDocument(normalized);
  if (!validation.valid) {
    throw new Error(`projectStorage compatibility merge failed: ${validation.errors.join("; ")}`);
  }
  return normalized;
}
