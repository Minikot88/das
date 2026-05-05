
import { create } from "zustand";
import { normalizeChartConfig } from "../utils/normalizeChartConfig";
import { schema } from "../data/mockData";
import {
  clearBuilderDraft,
  loadBuilderDraft,
  loadWorkspaceState,
  queueWorkspaceSave,
  saveBuilderDraft,
} from "../utils/storage";
import {
  createLayoutItem,
  sanitizeLayout,
  tryCreateAdjacentLayoutItem,
} from "../utils/layoutUtils";
import { createCopyName, createEntityId, createTimestampId } from "../utils/id";

const defaultDashboard = (id = "dash-1", name = "Dashboard 1") => ({
  id,
  name,
  charts: [],
  layout: [],
});

const defaultSheet = (id = "sheet-1", name = "Sheet 1", dashboardId = "dash-1", dashboardName = "Dashboard 1") => ({
  id,
  name,
  dashboards: [defaultDashboard(dashboardId, dashboardName)],
  activeDashboardId: dashboardId,
});

const defaultProject = (id = "project-1", name = "My Project", sheetId = "sheet-1", dashboardId = "dash-1") => ({
  id,
  name,
  sheets: [defaultSheet(sheetId, "Sheet 1", dashboardId)],
});

function createProjectSeed(projectId, name) {
  const sheetId = createEntityId("sheet");
  const dashboardId = createEntityId("dash");
  return defaultProject(projectId, name, sheetId, dashboardId);
}

const defaultBuilderState = {
  selectedDb:    null,
  selectedTable: null,
  xField:        null,
  xType:         null,
  yField:        null,
  yType:         null,
  groupField:    null,
  sizeField:     null,
  sizeType:      null,
  roleMapping:   {},
  chartType:     "bar",
  name:          "",
  title:         "",
  subtitle:      "",
  colorTheme:    "default",
  legendVisible: true,
  showGrid:      true,
  showLabels:    false,
  smooth:        false,
  aggregation:   "sum",
  xLabel:        "",
  yLabel:        "",
  sizeLabel:     "",
  queryMode:     "visual",
  generatedSql:  "",
  customSql:     "",
  lastExecutedSql: "",
  queryResult:   null,
  queryError:    "",
  queryStatus:   "idle",
  isDirtySql:    false,
  lastRunAt:     "",
};

const defaultBuilderNavigationContext = null;
const defaultUiState = {
  selectedWidgetIdByDashboard: {},
  rightSidebarOpen: true,
  recentProjectIds: [],
  lastOpenedContextByProject: {},
};

function normalizeFilters(filters = {}) {
  return {
    aggregateType: filters.aggregateType || "sum",
    dateRange: {
      start: filters.dateRange?.start || "",
      end: filters.dateRange?.end || "",
    },
    dateField: filters.dateField || "",
    categoryField: filters.categoryField || "",
    categoryValue: filters.categoryValue || "",
  };
}

const defaultFilters = normalizeFilters();

function loadState() {
  return loadWorkspaceState();
}

function saveState(s) {
  queueWorkspaceSave(s);
}

function migrateState(saved) {
  if (!saved) return null;

  if (saved.projects) return ensureUniqueWorkspaceStructure(saved);

  if (saved.sheets) {
    const sheets = saved.sheets.map((sh) => ({
      id:   sh.id,
      name: sh.name,
      activeDashboardId: `dash-${sh.id}`,
      dashboards: [{
        id:     `dash-${sh.id}`,
        name:   "Dashboard 1",
        charts: sh.charts ?? [],
        layout: sh.layout ?? [],
      }],
    }));

    return ensureUniqueWorkspaceStructure({
      ...saved,
      projects: [{
        id:     "project-1",
        name:   "My Project",
        sheets,
      }],
      activeProjectId:   "project-1",
      activeSheetId:     saved.activeSheetId ?? sheets[0]?.id ?? "sheet-1",
      activeDashboardId: sheets[0]?.activeDashboardId ?? "dash-1",
    });
  }

  return ensureUniqueWorkspaceStructure(saved);
}

function ensureUniqueWorkspaceStructure(saved) {
  if (!saved?.projects?.length) return saved;

  let mutated = false;
  const seenSheetIds = new Set();
  const seenDashboardIds = new Set();
  const sheetIdMapByProject = new Map();
  const dashboardIdMapByProject = new Map();

  const projects = saved.projects.map((project) => {
    const sheetIdMap = new Map();
    const dashboardIdMap = new Map();
    const sheets = (project.sheets ?? []).map((sheet) => {
      let nextSheetId = sheet.id;
      if (!nextSheetId || seenSheetIds.has(nextSheetId)) {
        nextSheetId = createEntityId("sheet");
        mutated = true;
      }
      seenSheetIds.add(nextSheetId);
      if (nextSheetId !== sheet.id) sheetIdMap.set(sheet.id, nextSheetId);

      const dashboards = (sheet.dashboards ?? []).map((dashboard) => {
        let nextDashboardId = dashboard.id;
        if (!nextDashboardId || seenDashboardIds.has(nextDashboardId)) {
          nextDashboardId = createEntityId("dash");
          mutated = true;
        }
        seenDashboardIds.add(nextDashboardId);
        if (nextDashboardId !== dashboard.id) dashboardIdMap.set(dashboard.id, nextDashboardId);
        return {
          ...dashboard,
          id: nextDashboardId,
        };
      });

      const activeDashboardId = dashboardIdMap.get(sheet.activeDashboardId)
        ?? (dashboards.some((dashboard) => dashboard.id === sheet.activeDashboardId) ? sheet.activeDashboardId : dashboards[0]?.id ?? null);

      if (activeDashboardId !== sheet.activeDashboardId) mutated = true;

      return {
        ...sheet,
        id: nextSheetId,
        dashboards,
        activeDashboardId,
      };
    });

    if (sheetIdMap.size) sheetIdMapByProject.set(project.id, sheetIdMap);
    if (dashboardIdMap.size) dashboardIdMapByProject.set(project.id, dashboardIdMap);

    return {
      ...project,
      sheets,
    };
  });

  if (!mutated) return saved;

  const activeProject = projects.find((project) => project.id === saved.activeProjectId) ?? projects[0] ?? null;
  const activeProjectSheetMap = sheetIdMapByProject.get(activeProject?.id);
  const activeProjectDashboardMap = dashboardIdMapByProject.get(activeProject?.id);
  let activeSheetId = activeProjectSheetMap?.get(saved.activeSheetId) ?? saved.activeSheetId ?? activeProject?.sheets?.[0]?.id ?? null;
  if (!activeProject?.sheets?.some((sheet) => sheet.id === activeSheetId)) {
    activeSheetId = activeProject?.sheets?.[0]?.id ?? null;
  }

  const activeSheet = activeProject?.sheets?.find((sheet) => sheet.id === activeSheetId) ?? activeProject?.sheets?.[0] ?? null;
  let activeDashboardId = activeProjectDashboardMap?.get(saved.activeDashboardId)
    ?? saved.activeDashboardId
    ?? activeSheet?.activeDashboardId
    ?? activeSheet?.dashboards?.[0]?.id
    ?? null;
  if (!activeSheet?.dashboards?.some((dashboard) => dashboard.id === activeDashboardId)) {
    activeDashboardId = activeSheet?.activeDashboardId ?? activeSheet?.dashboards?.[0]?.id ?? null;
  }

  const ui = {
    ...(saved.ui ?? {}),
    lastOpenedContextByProject: Object.fromEntries(
      Object.entries(saved.ui?.lastOpenedContextByProject ?? {}).map(([projectId, context]) => {
        const sheetIdMap = sheetIdMapByProject.get(projectId);
        const dashboardIdMap = dashboardIdMapByProject.get(projectId);
        const project = projects.find((item) => item.id === projectId);
        const fallbackSheet = project?.sheets?.[0] ?? null;
        const resolvedSheetId = sheetIdMap?.get(context?.sheetId)
          ?? context?.sheetId
          ?? fallbackSheet?.id
          ?? null;
        const resolvedSheet = project?.sheets?.find((sheet) => sheet.id === resolvedSheetId) ?? fallbackSheet;
        return [
          projectId,
          {
            ...context,
            sheetId: resolvedSheetId,
            dashboardId: dashboardIdMap?.get(context?.dashboardId)
              ?? context?.dashboardId
              ?? resolvedSheet?.activeDashboardId
              ?? resolvedSheet?.dashboards?.[0]?.id
              ?? null,
          },
        ];
      })
    ),
  };

  return {
    ...saved,
    projects,
    activeProjectId: activeProject?.id ?? saved.activeProjectId ?? null,
    activeSheetId,
    activeDashboardId,
    ui,
  };
}

const saved = migrateState(loadState());
const savedBuilderDraft = loadBuilderDraft();

function isChartJsConfig(config) {
  return Boolean(config && typeof config === "object" && Array.isArray(config.data?.datasets));
}

function cloneSerializable(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function buildQueryResult(rows = [], dataset = null, existingQueryResult = null) {
  const columns = Object.keys(rows[0] ?? {});

  if (existingQueryResult) {
    return {
      ...existingQueryResult,
      rows,
      rowCount: existingQueryResult.rowCount ?? rows.length,
      columnCount: existingQueryResult.columnCount ?? columns.length,
      columns: existingQueryResult.columns?.length ? existingQueryResult.columns : columns,
      sourceTable: existingQueryResult.sourceTable ?? dataset ?? null,
    };
  }

  return {
    rows,
    columns,
    fieldMeta: [],
    rowCount: rows.length,
    columnCount: columns.length,
    sourceTable: dataset ?? null,
  };
}

function normalizeStoredChart(chart) {
  if (!chart) return chart;

  const config = isChartJsConfig(chart.config)
    ? {
        ...cloneSerializable(chart.config),
        queryMode: chart.config?.queryMode ?? chart.queryMode ?? "visual",
        generatedSql: chart.config?.generatedSql ?? chart.generatedSql ?? "",
        customSql: chart.config?.customSql ?? chart.customSql ?? "",
        lastExecutedSql: chart.config?.lastExecutedSql ?? chart.lastExecutedSql ?? "",
        rows: Array.isArray(chart.config?.rows) ? chart.config.rows : chart.data ?? chart.rows ?? [],
      }
    : normalizeChartConfig(chart.config ?? chart);
  const storedData = Array.isArray(chart.data)
    ? chart.data
    : Array.isArray(chart.rows)
      ? chart.rows
      : [];
  const fallbackRows = Array.isArray(config.queryResult?.rows)
    ? config.queryResult.rows
    : Array.isArray(config.rows)
      ? config.rows
      : [];
  const resolvedRows = storedData.length > 0 ? storedData : fallbackRows;
  const title = chart.title ?? chart.name ?? config.title ?? config.name ?? "Untitled";
  return {
    ...chart,
    name: title,
    title,
    engine: chart.engine ?? "chartjs",
    data: resolvedRows,
    rows: resolvedRows,
    dataset: chart.dataset ?? chart.datasetId ?? config.dataset ?? null,
    mapping: chart.mapping ?? config.mapping ?? {},
    settings: chart.settings ?? config.settings ?? {},
    queryMode: chart.queryMode ?? config.queryMode ?? "visual",
    generatedSql: chart.generatedSql ?? config.generatedSql ?? "",
    customSql: chart.customSql ?? config.customSql ?? "",
    lastExecutedSql: chart.lastExecutedSql ?? config.lastExecutedSql ?? "",
    queryResult: chart.queryResult ?? config.queryResult ?? null,
    config: {
      ...config,
      queryMode: chart.queryMode ?? config.queryMode ?? "visual",
      generatedSql: chart.generatedSql ?? config.generatedSql ?? "",
      customSql: chart.customSql ?? config.customSql ?? "",
      lastExecutedSql: chart.lastExecutedSql ?? config.lastExecutedSql ?? "",
      rows: resolvedRows,
      queryResult: buildQueryResult(resolvedRows, chart.dataset ?? config.dataset ?? null, config.queryResult ?? null),
    },
  };
}

function inferSelectedDb(dataset) {
  if (!dataset) return null;

  for (const [dbName, tables] of Object.entries(schema)) {
    if (tables?.[dataset]) return dbName;
  }

  return null;
}

function createStoredChartRecord(projectId, chart) {
  const baseConfig = isChartJsConfig(chart.config)
    ? cloneSerializable(chart.config)
    : normalizeChartConfig(chart.config ?? chart);
  const data = Array.isArray(chart.data)
    ? chart.data
    : Array.isArray(chart.rows)
      ? chart.rows
      : Array.isArray(baseConfig?.rows)
        ? baseConfig.rows
        : Array.isArray(baseConfig.queryResult?.rows)
          ? baseConfig.queryResult.rows
          : [];
  const columns = Object.keys(data[0] ?? {});
  const hydratedConfig = isChartJsConfig(baseConfig)
    ? {
        ...baseConfig,
        queryMode: chart.queryMode ?? baseConfig.queryMode ?? "visual",
        generatedSql: chart.generatedSql ?? baseConfig.generatedSql ?? "",
        customSql: chart.customSql ?? baseConfig.customSql ?? "",
        lastExecutedSql: chart.lastExecutedSql ?? baseConfig.lastExecutedSql ?? "",
        rows: data,
        queryResult: buildQueryResult(
          data,
          chart.dataset ?? chart.datasetId ?? baseConfig.dataset ?? null,
          baseConfig.queryResult ?? null
        ),
      }
    : {
        ...baseConfig,
        queryMode: chart.queryMode ?? baseConfig.queryMode ?? "visual",
        generatedSql: chart.generatedSql ?? baseConfig.generatedSql ?? "",
        customSql: chart.customSql ?? baseConfig.customSql ?? "",
        lastExecutedSql: chart.lastExecutedSql ?? baseConfig.lastExecutedSql ?? "",
        queryResult: baseConfig.queryResult
          ? {
              ...baseConfig.queryResult,
              rows: data,
              rowCount: baseConfig.queryResult.rowCount ?? data.length,
              columnCount: baseConfig.queryResult.columnCount ?? columns.length,
              columns: baseConfig.queryResult.columns?.length ? baseConfig.queryResult.columns : columns,
              sourceTable: baseConfig.queryResult.sourceTable ?? baseConfig.dataset ?? null,
            }
          : {
              rows: data,
              columns,
              fieldMeta: [],
              rowCount: data.length,
              columnCount: columns.length,
              sourceTable: baseConfig.dataset ?? null,
            },
      };
  const name = chart.name || chart.title || hydratedConfig.name || hydratedConfig.title || "Untitled";

  return {
    ...chart,
    id: chart.id ?? createTimestampId(),
    name,
    title: chart.title || name,
    data,
    rows: data,
    config: hydratedConfig,
    engine: chart.engine ?? "chartjs",
    templateId: chart.templateId ?? chart.config?.meta?.templateId ?? null,
    type: chart.type ?? chart.chartType ?? hydratedConfig.chartType ?? hydratedConfig.type,
    family: chart.family ?? chart.config?.meta?.family ?? hydratedConfig.family ?? null,
    variant: chart.variant ?? chart.config?.meta?.variant ?? hydratedConfig.variant ?? null,
    mapping: chart.mapping ?? hydratedConfig.mapping ?? {},
    settings: chart.settings ?? hydratedConfig.settings ?? {},
    dataset: chart.dataset ?? chart.datasetId ?? hydratedConfig.dataset ?? null,
    queryMode: chart.queryMode ?? hydratedConfig.queryMode ?? "visual",
    generatedSql: chart.generatedSql ?? hydratedConfig.generatedSql ?? "",
    customSql: chart.customSql ?? hydratedConfig.customSql ?? "",
    lastExecutedSql: chart.lastExecutedSql ?? hydratedConfig.lastExecutedSql ?? "",
    queryResult: chart.queryResult ?? hydratedConfig.queryResult ?? null,
    layout: chart.layout ?? null,
    sourceProjectId: chart.sourceProjectId ?? projectId,
    projectId,
    createdAt: chart.createdAt ?? new Date().toISOString(),
    updatedAt: chart.updatedAt ?? new Date().toISOString(),
  };
}

function sanitizeRenameValue(name, fallback = "") {
  const nextName = String(name ?? "").trim();
  return nextName || fallback;
}

function getProjectById(s, projectId) {
  return s.projects.find((project) => project.id === projectId) ?? null;
}

function getSheetById(project, sheetId) {
  return project?.sheets.find((sheet) => sheet.id === sheetId) ?? null;
}

function getDashboardById(sheet, dashboardId) {
  return sheet?.dashboards.find((dashboard) => dashboard.id === dashboardId) ?? null;
}

function rememberRecentProjectIds(ids = [], projectId) {
  if (!projectId) return ids;
  return [projectId, ...ids.filter((id) => id !== projectId)].slice(0, 6);
}

function buildProjectContextSnapshot(sheetId, dashboardId) {
  return {
    sheetId: sheetId ?? null,
    dashboardId: dashboardId ?? null,
    updatedAt: new Date().toISOString(),
  };
}

function getProjectContextFromUi(ui = {}, projectId, project) {
  const savedContext = ui.lastOpenedContextByProject?.[projectId];
  const savedSheet = project?.sheets.find((sheet) => sheet.id === savedContext?.sheetId);
  const resolvedSheet = savedSheet ?? project?.sheets[0] ?? null;
  const resolvedDashboard =
    resolvedSheet?.dashboards.find((dashboard) => dashboard.id === savedContext?.dashboardId) ??
    resolvedSheet?.dashboards[0] ??
    null;

  return {
    sheetId: resolvedSheet?.id ?? null,
    dashboardId: resolvedDashboard?.id ?? null,
  };
}

function saveBuilderDraftState(draft) {
  if (!draft) {
    clearBuilderDraft();
    return;
  }

  saveBuilderDraft(draft);
}

function getActiveProject(s) {
  return s.projects.find((p) => p.id === s.activeProjectId) ?? s.projects[0];
}

function getActiveSheet(s) {
  const project = getActiveProject(s);
  return project?.sheets.find((sh) => sh.id === s.activeSheetId) ?? project?.sheets[0];
}

function _getActiveDashboard(s) {
  const sheet = getActiveSheet(s);
  return sheet?.dashboards.find((d) => d.id === s.activeDashboardId) ?? sheet?.dashboards[0];
}


export const useStore = create((set, get) => ({

  user:            saved?.user            ?? null,
  isAuthenticated: saved?.isAuthenticated ?? true,

  projects:          saved?.projects          ?? [defaultProject()],
  activeProjectId:   saved?.activeProjectId   ?? "project-1",
  activeSheetId:     saved?.activeSheetId     ?? "sheet-1",
  activeDashboardId: saved?.activeDashboardId ?? "dash-1",

  charts: (saved?.charts ?? []).map(normalizeStoredChart),
  shareLinks: saved?.shareLinks ?? {},

  theme: saved?.theme ?? "light",
  locale: saved?.locale ?? "th",

  filters: normalizeFilters(saved?.filters),
  filterPresets: saved?.filterPresets ?? [],
  ui: {
    ...defaultUiState,
    ...(saved?.ui ?? {}),
    recentProjectIds: saved?.ui?.recentProjectIds?.length
      ? saved.ui.recentProjectIds
      : saved?.activeProjectId
        ? [saved.activeProjectId]
        : [],
  },

  sidebarCollapsed: saved?.sidebarCollapsed ?? false,
  kpiBarVisible:    saved?.kpiBarVisible    ?? true,
  mobileMenuOpen:   false,
  rightPanelOpen:   saved?.ui?.rightSidebarOpen ?? false,

  builderState:      savedBuilderDraft?.draft ?? defaultBuilderState,
  aiInsights:        [],
  isLoadingInsights: false,
  lastChartAddedAt:  null,
  previewChart:      null,
  builderNavigationContext: defaultBuilderNavigationContext,
  builderDraft:      savedBuilderDraft ?? null,

  login: (email, password, name) => set((s) => {
    void password;
    const user = {
      id: `user-${Date.now()}`,
      email,
      name: name?.trim() || email.split("@")[0],
      role: "owner",
      lastLoginAt: new Date().toISOString(),
    };
    saveState({ ...s, user, isAuthenticated: true });
    return { user, isAuthenticated: true };
  }),

  register: (email, password, name) => set((s) => {
    void password;
    const user = {
      id: `user-${Date.now()}`,
      email,
      name: name?.trim() || email.split("@")[0],
      role: "owner",
      createdAt: new Date().toISOString(),
    };
    saveState({ ...s, user, isAuthenticated: true });
    return { user, isAuthenticated: true };
  }),

  logout: () => set((s) => {
    saveState({ ...s, user: null, isAuthenticated: false });
    clearBuilderDraft();
    return { user: null, isAuthenticated: false, aiInsights: [], builderState: defaultBuilderState, builderDraft: null };
  }),

  createProject: (name) => set((s) => {
    const id      = createEntityId("project");
    const project = createProjectSeed(id, name);
    const projects = [...s.projects, project];
    const firstSheet = project.sheets[0];
    const firstDash  = firstSheet.dashboards[0];
    const ui = {
      ...s.ui,
      recentProjectIds: rememberRecentProjectIds(s.ui.recentProjectIds, id),
      lastOpenedContextByProject: {
        ...s.ui.lastOpenedContextByProject,
        [id]: buildProjectContextSnapshot(firstSheet.id, firstDash.id),
      },
    };
    saveState({
      ...s,
      projects,
      activeProjectId: id,
      activeSheetId: firstSheet.id,
      activeDashboardId: firstDash.id,
      ui,
    });
    return {
      projects,
      activeProjectId: id,
      activeSheetId: firstSheet.id,
      activeDashboardId: firstDash.id,
      ui,
    };
  }),

  renameProject: (id, name) => set((s) => {
    const projects = s.projects.map((p) => p.id === id ? { ...p, name } : p);
    saveState({ ...s, projects });
    return { projects };
  }),

  setActiveProject: (id) => set((s) => {
    const project = s.projects.find((p) => p.id === id);
    if (!project) return {};
    const context = getProjectContextFromUi(s.ui, id, project);
    const ui = {
      ...s.ui,
      recentProjectIds: rememberRecentProjectIds(s.ui.recentProjectIds, id),
      lastOpenedContextByProject: {
        ...s.ui.lastOpenedContextByProject,
        [id]: buildProjectContextSnapshot(context.sheetId, context.dashboardId),
      },
    };
    saveState({
      ...s,
      activeProjectId: id,
      activeSheetId: context.sheetId,
      activeDashboardId: context.dashboardId,
      ui,
    });
    return {
      activeProjectId: id,
      activeSheetId: context.sheetId ?? null,
      activeDashboardId: context.dashboardId ?? null,
      ui,
      aiInsights: [],
    };
  }),

  deleteProject: (id) => set((s) => {
    if (s.projects.length === 1) return {};
    const projects = s.projects.filter((p) => p.id !== id);
    const active   = s.activeProjectId === id ? projects[0] : s.projects.find((p) => p.id === s.activeProjectId);
    const sheet    = active?.sheets[0];
    const dash     = sheet?.dashboards[0];
    const charts = s.charts.filter((chart) => chart.projectId !== id);
    const shareLinks = Object.fromEntries(
      Object.entries(s.shareLinks ?? {}).filter(([, value]) => value?.projectId !== id)
    );
    const ui = {
      ...s.ui,
      recentProjectIds: (s.ui.recentProjectIds ?? []).filter((projectId) => projectId !== id),
      lastOpenedContextByProject: Object.fromEntries(
        Object.entries(s.ui.lastOpenedContextByProject ?? {}).filter(([projectId]) => projectId !== id)
      ),
    };
    saveState({
      ...s,
      projects,
      charts,
      shareLinks,
      ui,
      activeProjectId: active?.id,
      activeSheetId: sheet?.id,
      activeDashboardId: dash?.id,
    });
    return {
      projects,
      charts,
      shareLinks,
      ui,
      activeProjectId:   active?.id   ?? null,
      activeSheetId:     sheet?.id    ?? null,
      activeDashboardId: dash?.id     ?? null,
    };
  }),

  createSheet: (name) => set((s) => {
    const id    = createEntityId("sheet");
    const dashId = createEntityId("dash");
    const sheet = {
      id, name,
      activeDashboardId: dashId,
      dashboards: [{ id: dashId, name: "Dashboard 1", charts: [], layout: [] }],
    };
    const projects = s.projects.map((p) =>
      p.id === s.activeProjectId
        ? { ...p, sheets: [...p.sheets, sheet] }
        : p
    );
    const ui = {
      ...s.ui,
      lastOpenedContextByProject: {
        ...s.ui.lastOpenedContextByProject,
        [s.activeProjectId]: buildProjectContextSnapshot(id, dashId),
      },
    };
    saveState({ ...s, projects, activeSheetId: id, activeDashboardId: dashId, ui });
    return { projects, activeSheetId: id, activeDashboardId: dashId, ui };
  }),

  addSheet: () => {
    const s = get();
    const project = getActiveProject(s);
    const name = `Sheet ${(project?.sheets.length ?? 0) + 1}`;
    get().createSheet(name);
  },

  renameSheet: (id, name) => set((s) => {
    const activeProject = getActiveProject(s);
    const currentSheet = activeProject?.sheets.find((sh) => sh.id === id);
    const nextName = sanitizeRenameValue(name, currentSheet?.name);
    if (!currentSheet || nextName === currentSheet.name) return {};

    const projects = s.projects.map((p) =>
      p.id === s.activeProjectId
        ? { ...p, sheets: p.sheets.map((sh) => sh.id === id ? { ...sh, name: nextName } : sh) }
        : p
    );
    saveState({ ...s, projects });
    return { projects };
  }),

  removeSheet: (id) => set((s) => {
    const project = getActiveProject(s);
    if (!project || project.sheets.length <= 1) return {};
    const sheets  = project.sheets.filter((sh) => sh.id !== id);
    const activeSheetId = s.activeSheetId === id ? sheets[0].id : s.activeSheetId;
    const activeSheet   = sheets.find((sh) => sh.id === activeSheetId);
    const activeDashboardId = activeSheet?.dashboards[0]?.id ?? s.activeDashboardId;
    const projects = s.projects.map((p) =>
      p.id === s.activeProjectId ? { ...p, sheets } : p
    );
    const ui = {
      ...s.ui,
      lastOpenedContextByProject: {
        ...s.ui.lastOpenedContextByProject,
        [s.activeProjectId]: buildProjectContextSnapshot(activeSheetId, activeDashboardId),
      },
    };
    saveState({ ...s, projects, activeSheetId, activeDashboardId, ui });
    return { projects, activeSheetId, activeDashboardId, ui };
  }),

  duplicateSheet: (sheetId) => set((s) => {
    const project = getActiveProject(s);
    const sourceSheet = project?.sheets.find((sheet) => sheet.id === sheetId);
    if (!project || !sourceSheet) return {};

    const chartIdMap = new Map();
    const duplicatedCharts = [];

    const duplicatedDashboards = sourceSheet.dashboards.map((dashboard) => {
      const nextDashboardId = createEntityId("dash");
      const duplicatedLayout = (dashboard.layout ?? []).map((layoutItem) => {
        const sourceChart = s.charts.find((chart) => chart.id === layoutItem.chartId);
        if (sourceChart) {
          const nextChartId = createTimestampId([...s.charts, ...duplicatedCharts].map((chart) => chart?.id));
          chartIdMap.set(layoutItem.chartId, nextChartId);
          duplicatedCharts.push({
            ...sourceChart,
            id: nextChartId,
            name: createCopyName(sourceChart.name || "Chart"),
            config: normalizeChartConfig({
              ...sourceChart.config,
              name: createCopyName(sourceChart.config?.name || sourceChart.name || "Chart"),
              title: createCopyName(sourceChart.config?.title || sourceChart.name || "Chart"),
            }),
            createdAt: new Date().toISOString(),
          });
        }

        return {
          ...layoutItem,
          i: createEntityId("inst"),
          chartId: chartIdMap.get(layoutItem.chartId) ?? layoutItem.chartId,
          titleOverride: layoutItem.titleOverride ? createCopyName(layoutItem.titleOverride) : layoutItem.titleOverride,
        };
      });

      return {
        ...sourceSheet.dashboards.find((item) => item.id === dashboard.id),
        id: nextDashboardId,
        name: createCopyName(dashboard.name || "Dashboard"),
        layout: duplicatedLayout,
      };
    });

    const duplicatedSheetId = createEntityId("sheet");
    const duplicatedSheet = {
      ...sourceSheet,
      id: duplicatedSheetId,
      name: createCopyName(sourceSheet.name || "Sheet"),
      dashboards: duplicatedDashboards,
      activeDashboardId: duplicatedDashboards[0]?.id ?? createEntityId("dash"),
    };

    const projects = s.projects.map((projectItem) =>
      projectItem.id !== s.activeProjectId
        ? projectItem
        : { ...projectItem, sheets: [...projectItem.sheets, duplicatedSheet] }
    );
    const charts = [...s.charts, ...duplicatedCharts];
    const ui = {
      ...s.ui,
      lastOpenedContextByProject: {
        ...s.ui.lastOpenedContextByProject,
        [s.activeProjectId]: buildProjectContextSnapshot(duplicatedSheet.id, duplicatedSheet.activeDashboardId),
      },
    };
    saveState({ ...s, projects, charts, activeSheetId: duplicatedSheet.id, activeDashboardId: duplicatedSheet.activeDashboardId, ui });
    return { projects, charts, activeSheetId: duplicatedSheet.id, activeDashboardId: duplicatedSheet.activeDashboardId, ui };
  }),

  setActiveSheet: (id) => set((s) => {
    const project = getActiveProject(s);
    const sheet   = project?.sheets.find((sh) => sh.id === id);
    const dashId  = sheet?.activeDashboardId ?? sheet?.dashboards[0]?.id;
    const ui = {
      ...s.ui,
      lastOpenedContextByProject: {
        ...s.ui.lastOpenedContextByProject,
        [s.activeProjectId]: buildProjectContextSnapshot(id, dashId),
      },
    };
    saveState({ ...s, activeSheetId: id, activeDashboardId: dashId, ui });
    return { activeSheetId: id, activeDashboardId: dashId ?? null, aiInsights: [], ui };
  }),

  createDashboard: (name) => set((s) => {
    const id   = createEntityId("dash");
    const dash = { id, name, charts: [], layout: [] };
    const projects = s.projects.map((p) =>
      p.id !== s.activeProjectId ? p : {
        ...p,
        sheets: p.sheets.map((sh) =>
          sh.id !== s.activeSheetId ? sh : {
            ...sh,
            activeDashboardId: id,
            dashboards: [...sh.dashboards, dash],
          }
        ),
      }
    );
    const ui = {
      ...s.ui,
      lastOpenedContextByProject: {
        ...s.ui.lastOpenedContextByProject,
        [s.activeProjectId]: buildProjectContextSnapshot(s.activeSheetId, id),
      },
    };
    saveState({ ...s, projects, activeDashboardId: id, ui });
    return { projects, activeDashboardId: id, ui };
  }),

  renameDashboard: (id, name) => set((s) => {
    const activeSheet = getActiveSheet(s);
    const currentDashboard = activeSheet?.dashboards.find((dashboard) => dashboard.id === id);
    const nextName = sanitizeRenameValue(name, currentDashboard?.name);
    if (!currentDashboard || nextName === currentDashboard.name) return {};

    const projects = s.projects.map((p) =>
      p.id !== s.activeProjectId ? p : {
        ...p,
        sheets: p.sheets.map((sh) =>
          sh.id !== s.activeSheetId ? sh : {
            ...sh,
            dashboards: sh.dashboards.map((d) => d.id === id ? { ...d, name: nextName } : d),
          }
        ),
      }
    );
    saveState({ ...s, projects });
    return { projects };
  }),

  removeDashboard: (id) => set((s) => {
    const sheet   = getActiveSheet(s);
    if (!sheet || sheet.dashboards.length <= 1) return {};
    const dashboards = sheet.dashboards.filter((d) => d.id !== id);
    const activeDashboardId = s.activeDashboardId === id ? dashboards[0].id : s.activeDashboardId;
    const projects = s.projects.map((p) =>
      p.id !== s.activeProjectId ? p : {
        ...p,
        sheets: p.sheets.map((sh) =>
          sh.id !== s.activeSheetId ? sh : {
            ...sh,
            dashboards,
            activeDashboardId,
          }
        ),
      }
    );
    const ui = {
      ...s.ui,
      lastOpenedContextByProject: {
        ...s.ui.lastOpenedContextByProject,
        [s.activeProjectId]: buildProjectContextSnapshot(s.activeSheetId, activeDashboardId),
      },
    };
    saveState({ ...s, projects, activeDashboardId, ui });
    return { projects, activeDashboardId, ui };
  }),

  duplicateDashboard: (dashboardId) => set((s) => {
    const project = getActiveProject(s);
    const sheet = getActiveSheet(s);
    const sourceDashboard = sheet?.dashboards.find((dashboard) => dashboard.id === dashboardId);
    if (!project || !sheet || !sourceDashboard) return {};

    const chartIdMap = new Map();
    const duplicatedCharts = [];
    const duplicatedLayout = (sourceDashboard.layout ?? []).map((layoutItem) => {
      const sourceChart = s.charts.find((chart) => chart.id === layoutItem.chartId);
      if (sourceChart) {
        const nextChartId = createTimestampId([...s.charts, ...duplicatedCharts].map((chart) => chart?.id));
        chartIdMap.set(layoutItem.chartId, nextChartId);
        duplicatedCharts.push(createStoredChartRecord(s.activeProjectId, {
          ...sourceChart,
          id: nextChartId,
          name: createCopyName(sourceChart.name || "Chart"),
          title: createCopyName(sourceChart.title || sourceChart.config?.title || sourceChart.name || "Chart"),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));
      }

      return {
        ...layoutItem,
        i: createEntityId("inst"),
        chartId: chartIdMap.get(layoutItem.chartId) ?? layoutItem.chartId,
        titleOverride: layoutItem.titleOverride ? createCopyName(layoutItem.titleOverride) : layoutItem.titleOverride,
      };
    });

    const duplicatedDashboardId = createEntityId("dash");
    const duplicatedDashboard = {
      ...sourceDashboard,
      id: duplicatedDashboardId,
      name: createCopyName(sourceDashboard.name || "Dashboard"),
      layout: duplicatedLayout,
    };

    const projects = s.projects.map((projectItem) =>
      projectItem.id !== s.activeProjectId
        ? projectItem
        : {
            ...projectItem,
            sheets: projectItem.sheets.map((sheetItem) =>
              sheetItem.id !== s.activeSheetId
                ? sheetItem
                : {
                    ...sheetItem,
                    dashboards: [...sheetItem.dashboards, duplicatedDashboard],
                    activeDashboardId: duplicatedDashboardId,
                  }
            ),
          }
    );
    const charts = [...s.charts, ...duplicatedCharts];
    const ui = {
      ...s.ui,
      lastOpenedContextByProject: {
        ...s.ui.lastOpenedContextByProject,
        [s.activeProjectId]: buildProjectContextSnapshot(s.activeSheetId, duplicatedDashboardId),
      },
    };
    saveState({ ...s, projects, charts, activeDashboardId: duplicatedDashboardId, ui });
    return { projects, charts, activeDashboardId: duplicatedDashboardId, ui };
  }),

  setActiveDashboard: (id) => set((s) => {
    const projects = s.projects.map((p) =>
      p.id !== s.activeProjectId ? p : {
        ...p,
        sheets: p.sheets.map((sh) =>
          sh.id !== s.activeSheetId ? sh : { ...sh, activeDashboardId: id }
        ),
      }
    );
    const ui = {
      ...s.ui,
      lastOpenedContextByProject: {
        ...s.ui.lastOpenedContextByProject,
        [s.activeProjectId]: buildProjectContextSnapshot(s.activeSheetId, id),
      },
    };
    saveState({ ...s, projects, activeDashboardId: id, ui });
    return { projects, activeDashboardId: id, aiInsights: [], ui };
  }),

  saveChart: (chart) => set((state) => {
    if (!state.activeProjectId) {
      console.error("Missing active context");
      return state;
    }

    const newChart = createStoredChartRecord(state.activeProjectId, chart);

    const charts = [...state.charts, newChart];
    saveState({ ...state, charts });
    return { charts };
  }),

  saveChartToDashboardContext: ({ projectId, sheetId, dashboardId, chart }) => {
    if (!projectId || !sheetId || !dashboardId || !chart) return null;

    let saveResult = null;

    set((state) => {
      const project = getProjectById(state, projectId);
      const sheet = getSheetById(project, sheetId);
      const dashboard = getDashboardById(sheet, dashboardId);
      if (!project || !sheet || !dashboard) return {};

      const newChart = createStoredChartRecord(projectId, {
        ...chart,
        sourceProjectId: projectId,
      });
      const nextLayoutItem = createLayoutItem(
        dashboard.layout,
        newChart.id,
        chart.layout ?? {}
      );

      const projects = state.projects.map((projectItem) =>
        projectItem.id !== projectId
          ? projectItem
          : {
              ...projectItem,
              sheets: projectItem.sheets.map((sheetItem) =>
                sheetItem.id !== sheetId
                  ? sheetItem
                  : {
                      ...sheetItem,
                      activeDashboardId: dashboardId,
                      dashboards: sheetItem.dashboards.map((dashboardItem) =>
                        dashboardItem.id !== dashboardId
                          ? dashboardItem
                          : {
                              ...dashboardItem,
                              layout: [...dashboardItem.layout, nextLayoutItem],
                            }
                      ),
                    }
              ),
            }
      );

      const charts = [...state.charts, { ...newChart, layout: nextLayoutItem }];
      const ui = {
        ...state.ui,
        selectedWidgetIdByDashboard: {
          ...state.ui.selectedWidgetIdByDashboard,
          [dashboardId]: nextLayoutItem.i,
        },
        lastOpenedContextByProject: {
          ...state.ui.lastOpenedContextByProject,
          [projectId]: buildProjectContextSnapshot(sheetId, dashboardId),
        },
      };
      const nextState = {
        ...state,
        projects,
        charts,
        activeProjectId: projectId,
        activeSheetId: sheetId,
        activeDashboardId: dashboardId,
        ui,
      };

      saveState(nextState);
      saveResult = {
        chart: charts[charts.length - 1],
        layoutItem: nextLayoutItem,
      };

      return {
        projects,
        charts,
        activeProjectId: projectId,
        activeSheetId: sheetId,
        activeDashboardId: dashboardId,
        ui,
        lastChartAddedAt: Date.now(),
      };
    });

    return saveResult;
  },

  addChartToDashboard: (chartId) => set((s) => {
    const savedChart = s.charts.find(c => c.id === chartId);
    if (!savedChart || savedChart.projectId !== s.activeProjectId) return {};

    const projects = s.projects.map((p) =>
      p.id !== s.activeProjectId ? p : {
        ...p,
        sheets: p.sheets.map((sh) =>
          sh.id !== s.activeSheetId ? sh : {
            ...sh,
            dashboards: sh.dashboards.map((d) => {
              if (d.id !== s.activeDashboardId) return d;
              const nextItem = createLayoutItem(d.layout, chartId);
              const layout = [...d.layout, nextItem];
              return { 
                ...d, 
                layout 
              };
            }),
          }
        ),
      }
    );
    const latestLayoutItem = projects
      .find((project) => project.id === s.activeProjectId)
      ?.sheets.find((sheet) => sheet.id === s.activeSheetId)
      ?.dashboards.find((dashboard) => dashboard.id === s.activeDashboardId)
      ?.layout.at(-1);
    const ui = {
      ...s.ui,
      selectedWidgetIdByDashboard: {
        ...s.ui.selectedWidgetIdByDashboard,
        ...(latestLayoutItem ? { [s.activeDashboardId]: latestLayoutItem.i } : {}),
      },
    };
    saveState({ ...s, projects, ui });
    return { projects, ui, lastChartAddedAt: Date.now() };
  }),

  addChart: (chart) => {
    set((s) => {
      const projects = s.projects.map((p) =>
        p.id !== s.activeProjectId ? p : {
          ...p,
          sheets: p.sheets.map((sh) =>
            sh.id !== s.activeSheetId ? sh : {
              ...sh,
              dashboards: sh.dashboards.map((d) => {
                if (d.id !== s.activeDashboardId) return d;
                const layoutItem = createLayoutItem(d.layout, chart.id, { i: chart.id });
                const layout = [...d.layout, layoutItem];
                return { ...d, charts: [...d.charts, chart], layout };
              }),
            }
          ),
        }
      );
      saveState({ ...s, projects });
      return { projects, lastChartAddedAt: Date.now() };
    });
  },

  updateChart: (chartId, updates) => set((s) => {
    const charts = s.charts.map((c) =>
      c.id === chartId
        ? createStoredChartRecord(c.projectId, {
            ...c,
            ...updates,
            id: c.id,
            createdAt: c.createdAt,
            updatedAt: new Date().toISOString(),
            data: Array.isArray(updates?.data)
              ? updates.data
              : Array.isArray(updates?.rows)
                ? updates.rows
                : Array.isArray(updates?.queryResult?.rows)
                  ? updates.queryResult.rows
                  : c.data,
          })
        : c
    );
    saveState({ ...s, charts });
    return { charts };
  }),

  duplicateChart: (sheetId, instanceId) => set((s) => {
    const project = s.projects.find(p => p.id === s.activeProjectId) ?? s.projects[0];
    const sheet   = project?.sheets.find((sh) => sh.id === sheetId);
    if (!sheet) return {};
    
    const dash = sheet.dashboards.find(d => d.id === s.activeDashboardId);
    if (!dash) return {};

    const layoutItem = dash.layout.find(l => l.i === instanceId);
    if (!layoutItem) return {};

    const origChart = s.charts.find(c => c.id === layoutItem.chartId);
    if (!origChart) return {};

    const newChartId = createTimestampId(s.charts.map((chart) => chart?.id));
    const baseName = origChart.name || origChart.config?.name || origChart.config?.title || "Untitled";
    const baseTitle = layoutItem.titleOverride || origChart.config.title || origChart.name || "Untitled";
    const newChart = createStoredChartRecord(s.activeProjectId, {
      ...origChart,
      id: newChartId,
      name: createCopyName(baseName),
      title: createCopyName(baseTitle),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const newL = tryCreateAdjacentLayoutItem(dash.layout, layoutItem, newChartId);

    const charts = [...s.charts, newChart];
    const projects = s.projects.map((p) =>
      p.id !== s.activeProjectId ? p : {
        ...p,
        sheets: p.sheets.map((sh) =>
          sh.id !== sheetId ? sh : {
            ...sh,
            dashboards: sh.dashboards.map((d) =>
              d.id !== s.activeDashboardId ? d : { ...d, layout: [...d.layout, newL] }
            ),
          }
        ),
      }
    );
    saveState({ ...s, projects, charts });
    return { projects, charts, lastChartAddedAt: Date.now() };
  }),

  renameChartWidget: (sheetId, instanceId, nextTitle) => set((s) => {
    const trimmedTitle = String(nextTitle ?? "").trim();
    const projects = s.projects.map((p) =>
      p.id !== s.activeProjectId ? p : {
        ...p,
        sheets: p.sheets.map((sh) =>
          sh.id !== sheetId ? sh : {
            ...sh,
            dashboards: sh.dashboards.map((d) => {
              if (d.id !== s.activeDashboardId) return d;
              return {
                ...d,
                layout: d.layout.map((item) =>
                  item.i !== instanceId
                    ? item
                    : {
                        ...item,
                        ...(trimmedTitle ? { titleOverride: trimmedTitle } : {}),
                        ...(trimmedTitle ? {} : { titleOverride: undefined }),
                      }
                ),
              };
            }),
          }
        ),
      }
    );
    saveState({ ...s, projects });
    return { projects };
  }),

  removeChart: (sheetId, instanceId) => set((s) => {
    const projects = s.projects.map((p) =>
      p.id !== s.activeProjectId ? p : {
        ...p,
        sheets: p.sheets.map((sh) =>
          sh.id !== sheetId ? sh : {
            ...sh,
            dashboards: sh.dashboards.map((d) => {
              if (d.id !== s.activeDashboardId) return d;
              return { 
                ...d, 
                layout: d.layout.filter((l) => l.i !== instanceId) 
              };
            }),
          }
        ),
      }
    );
    saveState({ ...s, projects });
    return { projects };
  }),

  clearDashboard: (sheetId, dashId) => set((s) => {
    const projects = s.projects.map((p) =>
      p.id !== s.activeProjectId ? p : {
        ...p,
        sheets: p.sheets.map((sh) =>
          sh.id !== sheetId ? sh : {
            ...sh,
            dashboards: sh.dashboards.map((d) =>
              d.id !== dashId ? d : { ...d, charts: [], layout: [] }
            ),
          }
        ),
      }
    );
    saveState({ ...s, projects });
    return { projects, aiInsights: [] };
  }),

  // Backwards compat: clearSheet(sheetId) â†’ clears active dashboard
  clearSheet: (sheetId) => {
    const s = get();
    get().clearDashboard(sheetId, s.activeDashboardId);
  },

  updateLayout: (sheetId, layout) => set((s) => {
    const activeDashboard = _getActiveDashboard(s);
    const sanitizedLayout = sanitizeLayout(layout, activeDashboard?.layout ?? []);
    const projects = s.projects.map((p) =>
      p.id !== s.activeProjectId ? p : {
        ...p,
        sheets: p.sheets.map((sh) =>
          sh.id !== sheetId ? sh : {
            ...sh,
            dashboards: sh.dashboards.map((d) =>
              d.id !== s.activeDashboardId ? d : { ...d, layout: sanitizedLayout }
            ),
          }
        ),
      }
    );
    saveState({ ...s, projects });
    return { projects };
  }),

  setFilters: (updates) => set((s) => {
    const filters = normalizeFilters({ ...s.filters, ...updates });
    saveState({ ...s, filters });
    return { filters };
  }),

  resetFilters: () => set((s) => {
    saveState({ ...s, filters: defaultFilters });
    return { filters: defaultFilters };
  }),

  saveFilterPreset: (dashboardId, name, filters) => set((s) => {
    const trimmedName = String(name ?? "").trim();
    if (!dashboardId || !trimmedName) return {};

    const nextFilters = normalizeFilters(filters);
    const now = new Date().toISOString();
    const existingPreset = s.filterPresets.find(
      (preset) =>
        preset.dashboardId === dashboardId &&
        preset.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );

    const filterPresets = existingPreset
      ? s.filterPresets.map((preset) =>
          preset.id === existingPreset.id
            ? {
                ...preset,
                name: trimmedName,
                filters: nextFilters,
                updatedAt: now,
              }
            : preset
        )
      : [
          {
            id: `preset-${Date.now()}`,
            dashboardId,
            name: trimmedName,
            filters: nextFilters,
            createdAt: now,
            updatedAt: now,
          },
          ...s.filterPresets,
        ];

    saveState({ ...s, filterPresets });
    return { filterPresets };
  }),

  applyFilterPreset: (presetId) => set((s) => {
    const preset = s.filterPresets.find((item) => item.id === presetId);
    if (!preset) return {};

    const filters = normalizeFilters(preset.filters);
    saveState({ ...s, filters });
    return { filters };
  }),

  deleteFilterPreset: (presetId) => set((s) => {
    const filterPresets = s.filterPresets.filter((preset) => preset.id !== presetId);
    saveState({ ...s, filterPresets });
    return { filterPresets };
  }),

  setAiInsights:      (insights) => set({ aiInsights: insights, isLoadingInsights: false }),
  setLoadingInsights: (v)        => set({ isLoadingInsights: v }),
  generateShareLink: (sheetId) => {
    const shareId = `shr-${Math.random().toString(36).slice(2, 10)}`;
    set((s) => {
      const shareLinks = {
        ...s.shareLinks,
        [shareId]: {
          id: shareId,
          sheetId,
          createdAt: new Date().toISOString(),
          mode: "readonly",
        },
      };
      saveState({ ...s, shareLinks });
      return { shareLinks };
    });
    return shareId;
  },
  resolveShareLink: (shareId) => {
    const state = get();
    return state.shareLinks?.[shareId] ?? null;
  },

  startBuilderDraft: (context, seedState = null) => set((s) => {
    const matchesExistingDraft =
      s.builderDraft?.projectId === context?.projectId &&
      s.builderDraft?.sheetId === context?.sheetId &&
      s.builderDraft?.dashboardId === context?.dashboardId;

    const nextDraft = matchesExistingDraft
      ? s.builderDraft
      : {
          ...context,
          draft: seedState ?? defaultBuilderState,
          isDirty: false,
          updatedAt: new Date().toISOString(),
        };

    saveBuilderDraftState(nextDraft);
    return {
      builderDraft: nextDraft,
      builderState: nextDraft?.draft ?? defaultBuilderState,
      builderNavigationContext: context ?? null,
    };
  }),

  hydrateBuilderDraft: (context) => set(() => {
    const draft = loadBuilderDraft();
    if (
      draft?.projectId === context?.projectId &&
      draft?.sheetId === context?.sheetId &&
      draft?.dashboardId === context?.dashboardId
    ) {
      return { builderDraft: draft, builderState: draft.draft ?? defaultBuilderState };
    }
    return {};
  }),

  setBuilderState: (updates) => set((s) => {
    const builderState = { ...s.builderState, ...updates };
    const nextDraft = s.builderDraft
      ? {
          ...s.builderDraft,
          draft: builderState,
          isDirty: true,
          updatedAt: new Date().toISOString(),
        }
      : null;

    if (nextDraft) {
      saveBuilderDraftState(nextDraft);
    }

    return { builderState, builderDraft: nextDraft ?? s.builderDraft };
  }),

  resetBuilderState: () => set((s) => {
    const nextDraft = s.builderDraft
      ? {
          ...s.builderDraft,
          draft: defaultBuilderState,
          isDirty: false,
          updatedAt: new Date().toISOString(),
        }
      : null;

    if (nextDraft) {
      saveBuilderDraftState(nextDraft);
    }

    return { builderState: defaultBuilderState, builderDraft: nextDraft };
  }),

  clearBuilderDraftState: () => {
    clearBuilderDraft();
    set({
      builderState: defaultBuilderState,
      builderDraft: null,
    });
  },

  loadChartIntoBuilder: (chart) => set({
    builderState: (() => {
      const normalizedChart = normalizeChartConfig(chart);
      const resolvedRows = Array.isArray(chart.data) && chart.data.length
        ? chart.data
        : normalizedChart.queryResult?.rows ?? [];
      return {
        selectedDb:     chart.db ?? inferSelectedDb(normalizedChart.dataset),
        selectedTable:  normalizedChart.dataset,
        xField:         normalizedChart.x,
        xType:          normalizedChart.xType ?? null,
        yField:         normalizedChart.y,
        yType:          normalizedChart.yType ?? null,
        groupField:     normalizedChart.groupBy,
        sizeField:      normalizedChart.sizeField,
        sizeType:       normalizedChart.sizeType ?? null,
        roleMapping:    normalizedChart.roleMapping ?? {},
        chartType:      normalizedChart.chartType,
        name:           normalizedChart.name || "",
        title:          normalizedChart.title || "",
        subtitle:       normalizedChart.subtitle || "",
        colorTheme:     normalizedChart.colorTheme,
        legendVisible:  normalizedChart.legendVisible,
        showGrid:       normalizedChart.showGrid,
        showLabels:     normalizedChart.showLabels ?? false,
        smooth:         normalizedChart.smooth,
        aggregation:    normalizedChart.aggregate,
        xLabel:         normalizedChart.xLabel,
        yLabel:         normalizedChart.yLabel,
        sizeLabel:      normalizedChart.sizeLabel,
        queryMode:      normalizedChart.queryMode ?? "visual",
        generatedSql:   normalizedChart.generatedSql ?? "",
        customSql:      normalizedChart.customSql ?? "",
        lastExecutedSql: normalizedChart.lastExecutedSql ?? "",
        queryResult:    normalizedChart.queryResult ?? (resolvedRows.length
          ? {
              rows: resolvedRows,
              columns: Object.keys(resolvedRows[0] ?? {}),
              fieldMeta: [],
              rowCount: resolvedRows.length,
              columnCount: Object.keys(resolvedRows[0] ?? {}).length,
              sourceTable: normalizedChart.dataset ?? null,
            }
          : null),
        queryError:     normalizedChart.queryError ?? "",
        queryStatus:    normalizedChart.queryStatus ?? "idle",
        isDirtySql:     normalizedChart.isDirtySql ?? false,
        lastRunAt:      normalizedChart.lastRunAt ?? "",
        editingChartId: chart.id,
        editingSheetId: chart.sheetId,
      };
    })(),
  }),

  toggleTheme: () => set((s) => {
    const theme = s.theme === "light" ? "dark" : "light";
    saveState({ ...s, theme });
    return { theme };
  }),

  setLanguage: (locale) => set((s) => {
    if (!locale || s.locale === locale) return {};
    saveState({ ...s, locale });
    return { locale };
  }),

  setSidebarCollapsed: (v) => set((s) => {
    saveState({ ...s, sidebarCollapsed: v });
    return { sidebarCollapsed: v };
  }),

  toggleSidebar: () => set((s) => {
    const sidebarCollapsed = !s.sidebarCollapsed;
    saveState({ ...s, sidebarCollapsed });
    return { sidebarCollapsed };
  }),

  setMobileMenuOpen: (v) => set({ mobileMenuOpen: v }),
  toggleMobileMenu:  () => set((s) => ({ mobileMenuOpen: !s.mobileMenuOpen })),
  setRightPanelOpen: (v) => set((s) => {
    const ui = { ...s.ui, rightSidebarOpen: v };
    saveState({ ...s, rightPanelOpen: v, ui });
    return { rightPanelOpen: v, ui };
  }),
  toggleRightPanel:  () => set((s) => {
    const rightPanelOpen = !s.rightPanelOpen;
    const ui = { ...s.ui, rightSidebarOpen: rightPanelOpen };
    saveState({ ...s, rightPanelOpen, ui });
    return { rightPanelOpen, ui };
  }),

  toggleKpiBar: () => set((s) => {
    const kpiBarVisible = !s.kpiBarVisible;
    saveState({ ...s, kpiBarVisible });
    return { kpiBarVisible };
  }),

  setPreviewChart: (chart) => set({ previewChart: chart }),
  clearPreviewChart: () => set({ previewChart: null }),
  setBuilderNavigationContext: (context) => set({ builderNavigationContext: context ?? null }),
  clearBuilderNavigationContext: () => set({ builderNavigationContext: null }),
  setSelectedWidget: (dashboardId, widgetId) => set((s) => {
    const ui = {
      ...s.ui,
      selectedWidgetIdByDashboard: {
        ...s.ui.selectedWidgetIdByDashboard,
        ...(dashboardId ? { [dashboardId]: widgetId ?? null } : {}),
      },
    };
    saveState({ ...s, ui });
    return { ui };
  }),
}));

