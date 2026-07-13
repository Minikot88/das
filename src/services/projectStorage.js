import { repairMojibakeText, repairObjectTextWithMeta } from "@/utils/textEncodingRepair";
import {
  mergeProjectStorageProjects,
  toProjectStorageProjects,
} from "@/domain/workspace/workspaceCompatibility";
import { workspaceRepository } from "@/domain/workspace/workspaceRepository";
import { cloneWorkspace } from "@/domain/workspace/workspaceSchema";

const PROJECTS_KEY = "mini-bi-projects";
const ACTIVE_PROJECT_KEY = "mini-bi-active-project-id";
const ACTIVE_DASHBOARD_KEY = "mini-bi-active-dashboard-id";
const STORAGE_VERSION_KEY = "mini-bi-storage-version";
const STORAGE_VERSION = "demo-storage-v2-thai-repair";

const LEGACY_CHARTS_KEY = "dashboard-v2-saved-charts";
const LEGACY_SINGLE_CHART_KEY = "dashboard-v2-chart-config";
const LEGACY_LAYOUT_KEY = "dashboard-canvas-layout-v1";

const DEFAULT_PROJECT_ID = "project-default";
const DEFAULT_DASHBOARD_ID = "dashboard-default";
const PROJECTS_SOFT_LIMIT = 2_800_000;
const STORAGE_RECOVERY_MESSAGE =
  "พื้นที่จัดเก็บในเบราว์เซอร์เต็ม ระบบได้ลดขนาดข้อมูลเดโมและกู้คืนการทำงานแล้ว";
const THAI_TEXT_REPAIR_MESSAGE = "แก้ไขข้อความภาษาไทยที่เสียหายแล้ว";
const MINI_BI_COMPACT_KEYS = [
  PROJECTS_KEY,
  LEGACY_SINGLE_CHART_KEY,
  LEGACY_CHARTS_KEY,
  LEGACY_LAYOUT_KEY,
  "dashboard-v2-sql-saved-queries",
  "dashboard-canvas-panel-state",
];
const RUNTIME_FIELD_NAMES = new Set([
  "base64",
  "cache",
  "canvas",
  "chartData",
  "chartOption",
  "chartOptions",
  "dataUrl",
  "dataURL",
  "demoDataset",
  "demoRows",
  "echartsOption",
  "echartsOptions",
  "historyFuture",
  "historyPast",
  "imageData",
  "option",
  "previewData",
  "previewImage",
  "renderMetadata",
  "renderedImage",
  "resizeObserver",
  "rows",
  "runtimeState",
  "sqlResultPreview",
  "tableRows",
  "transformedData",
]);
const memoryValues = new Map();
let memoryProjects = null;
let storageRecoveryMessage = "";
let compactingStorage = false;

function storageAvailable() {
  if (typeof window === "undefined") return false;
  try {
    return typeof window.localStorage !== "undefined";
  } catch {
    return false;
  }
}

function isQuotaError(error) {
  return (
    error?.name === "QuotaExceededError" ||
    error?.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    error?.code === 22 ||
    error?.code === 1014 ||
    /quota|exceeded/i.test(String(error?.message || ""))
  );
}

function warnStorageIssue(error) {
  if (import.meta?.env?.DEV) {
    console.warn("[Mini BI] localStorage persistence was limited.", error);
  }
}

function setStorageRecovery(message = STORAGE_RECOVERY_MESSAGE) {
  storageRecoveryMessage = message;
}

function repairStoredValue(value) {
  const result = repairObjectTextWithMeta(value);
  if (result.repaired) setStorageRecovery(THAI_TEXT_REPAIR_MESSAGE);
  return result.value;
}

function repairStoredText(value) {
  const repaired = repairMojibakeText(value);
  if (repaired !== value) setStorageRecovery(THAI_TEXT_REPAIR_MESSAGE);
  return repaired;
}

export function getStorageRecoveryMessage() {
  return storageRecoveryMessage;
}

export function consumeStorageRecoveryMessage() {
  const message = storageRecoveryMessage;
  storageRecoveryMessage = "";
  return message;
}

function directSetLocalStorage(key, value) {
  window.localStorage.setItem(key, value);
  memoryValues.delete(key);
}

function safeGetLocalStorage(key) {
  if (memoryValues.has(key)) return memoryValues.get(key);
  if (!storageAvailable()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeRemoveLocalStorage(key) {
  memoryValues.delete(key);
  if (!storageAvailable()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage removal failures; they should never block the UI.
  }
}

function safeParse(value, fallback = null) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function isObject(value) {
  return typeof value === "object" && value !== null;
}

function isDataUrl(value) {
  return typeof value === "string" && /^data:/i.test(value);
}

function compactSmallValue(value, depth = 0) {
  if (value === null || typeof value === "undefined") return value;
  if (typeof value === "string") return isDataUrl(value) || value.length > 10_000 ? undefined : value;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    if (depth > 8) return [];
    return value
      .slice(0, 250)
      .map((item) => compactSmallValue(item, depth + 1))
      .filter((item) => typeof item !== "undefined");
  }
  if (!isObject(value) || depth > 8) return undefined;

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !RUNTIME_FIELD_NAMES.has(key))
      .map(([key, nestedValue]) => [key, compactSmallValue(nestedValue, depth + 1)])
      .filter(([, nestedValue]) => typeof nestedValue !== "undefined")
  );
}

function compactField(field) {
  if (!isObject(field)) return null;
  const compacted = {};
  [
    "id",
    "name",
    "label",
    "type",
    "role",
    "category",
    "format",
    "table",
    "source",
    "sourceType",
  ].forEach((key) => {
    if (typeof field[key] !== "undefined") compacted[key] = compactSmallValue(field[key]);
  });
  return compacted.id ? compacted : null;
}

function compactMappings(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((slot) => {
      if (!isObject(slot)) return null;
      const fields = Array.isArray(slot.fields) ? slot.fields.map(compactField).filter(Boolean) : [];
      return {
        id: typeof slot.id === "string" ? slot.id : "",
        label: typeof slot.label === "string" ? slot.label : undefined,
        helper: typeof slot.helper === "string" ? slot.helper : undefined,
        aggregation: typeof slot.aggregation === "string" ? slot.aggregation : undefined,
        fields,
      };
    })
    .filter((slot) => slot?.id);
}

function compactDatasets(datasets) {
  if (!Array.isArray(datasets)) return [];
  return datasets
    .map((dataset) => {
      if (!isObject(dataset)) return null;
      return {
        ...cloneWorkspace(dataset),
        fields: Array.isArray(dataset.fields) ? dataset.fields.map((field) => cloneWorkspace(field)) : [],
        rows: Array.isArray(dataset.rows) ? dataset.rows.map((row) => cloneWorkspace(row)) : [],
        rowCount: Number.isInteger(dataset.rowCount) ? dataset.rowCount : Array.isArray(dataset.rows) ? dataset.rows.length : 0,
        columnCount: Number.isInteger(dataset.columnCount) ? dataset.columnCount : Array.isArray(dataset.fields) ? dataset.fields.length : 0,
      };
    })
    .filter(Boolean);
}

function compactChartDataContract(value) {
  if (!isObject(value)) return null;
  const rows = Array.isArray(value.rows)
    ? value.rows.filter(isObject).map((row) => cloneWorkspace(row))
    : [];
  return {
    sourceType: typeof value.sourceType === "string" ? value.sourceType : "unknown",
    datasetId: typeof value.datasetId === "string" ? value.datasetId : null,
    fields: Array.isArray(value.fields) ? value.fields.filter(isObject).map((field) => cloneWorkspace(field)) : [],
    rows,
    ...(typeof value.queryText === "string" ? { queryText: value.queryText } : {}),
  };
}

export function compactChartConfigForStorage(config) {
  if (!isObject(config)) return {};
  const mappings = compactMappings(config.fieldMappings ?? config.mappings);
  return compactSmallValue({
    schemaVersion: config.schemaVersion,
    version: config.version,
    dashboardId: config.dashboardId,
    chartId: config.chartId ?? config.id,
    chartType: config.chartType ?? config.type,
    fieldMappings: mappings,
    mappings,
    filters: config.filters,
    aggregations: config.aggregations,
    settings: config.settings,
    sort: config.sort,
    textElements: config.textElements,
    imageName: isDataUrl(config.imageName) ? undefined : config.imageName,
    sourceType: config.sourceType,
    datasetId: config.datasetId,
    sqlQueryId: config.sqlQueryId,
    sqlModeEnabled: config.sqlModeEnabled,
    sqlQuery: config.sqlQuery,
    createdAt: config.createdAt,
    updatedAt: config.updatedAt,
  });
}

function compactChartForLegacy(chart, projectId, index) {
  const normalized = normalizeChartRecord(chart, projectId, index);
  if (!normalized) return null;
  return normalized;
}

function compactWidgetConfig(config = {}, type = "text", sourceChartId = "", snapshot = null) {
  const sourceId = sourceChartId || config.sourceChartId || "";
  if (type === "chart") {
    const compactChartConfig = compactChartConfigForStorage(config.chartConfig || snapshot || config);
    return compactSmallValue({
      sourceChartId: sourceId || undefined,
      title: config.title,
      chartType: config.chartType ?? compactChartConfig.chartType,
      fieldMappings: compactMappings(config.fieldMappings ?? compactChartConfig.fieldMappings),
      settings: config.settings ?? compactChartConfig.settings,
      filters: config.filters ?? compactChartConfig.filters,
      dataset: config.dataset,
      chartConfig: sourceId ? undefined : compactChartConfig,
    });
  }

  return compactSmallValue(config);
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function chartTitle(config) {
  return repairStoredText(config?.settings?.general?.title || config?.title || "กราฟที่บันทึก");
}

function chartType(config) {
  return config?.chartType || config?.type || "bar";
}

function normalizeChartRecord(item, projectId = DEFAULT_PROJECT_ID, index = 0) {
  if (!isObject(item)) return null;
  const repairedItem = repairStoredValue(item);
  const rawConfig = isObject(repairedItem.config)
    ? repairedItem.config
    : isObject(repairedItem.chartConfig)
      ? repairedItem.chartConfig
      : repairedItem;
  if (!isObject(rawConfig)) return null;

  const updatedAt = String(repairedItem.updatedAt || rawConfig.updatedAt || nowIso());
  const createdAt = String(repairedItem.createdAt || rawConfig.createdAt || updatedAt);
  const id = String(repairedItem.id || rawConfig.chartId || rawConfig.id || `chart-migrated-${index}`);
  const config = {
    ...compactChartConfigForStorage(rawConfig),
    chartId: id,
    chartType: chartType(rawConfig) || repairedItem.chartType || "bar",
    updatedAt,
    createdAt,
  };
  const title = repairStoredText(String(repairedItem.title || repairedItem.name || chartTitle(config)));
  const dataContract = compactChartDataContract(repairedItem.dataContract);
  const datasetId = dataContract?.sourceType === "dataset" || dataContract?.sourceType === "demo"
    ? dataContract.datasetId ?? repairedItem.datasetId ?? config.datasetId
    : dataContract
      ? null
      : repairedItem.datasetId ?? config.datasetId;

  return {
    id,
    projectId: String(repairedItem.projectId || projectId || DEFAULT_PROJECT_ID),
    name: repairStoredText(String(repairedItem.name || title)),
    title,
    chartType: chartType(config),
    config,
    fieldMappings: compactMappings(repairedItem.fieldMappings ?? config.fieldMappings ?? config.mappings ?? []),
    settings: compactSmallValue(repairedItem.settings ?? config.settings ?? {}) ?? {},
    filters: compactSmallValue(repairedItem.filters ?? config.filters ?? {}) ?? {},
    datasetId,
    datasetInfo: repairedItem.datasetInfo ?? {
      sourceType: config.sourceType ?? "demo",
      datasetId: config.datasetId ?? "sales_performance",
    },
    dataContract,
    engine: ["echarts", "chartjs", "unknown"].includes(repairedItem.engine) ? repairedItem.engine : "echarts",
    source: repairedItem.source || "dashboard-v2",
    createdAt,
    updatedAt,
  };
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeWidgetRecord(widget, projectId, dashboardId, index = 0) {
  if (!isObject(widget)) return null;
  const repairedWidget = repairStoredValue(widget);
  const now = nowIso();
  const type = typeof repairedWidget.type === "string" ? repairedWidget.type : "text";
  const id = typeof repairedWidget.id === "string" && repairedWidget.id ? repairedWidget.id : makeId(type);
  const sourceChartId =
    typeof repairedWidget.sourceChartId === "string"
      ? repairedWidget.sourceChartId
      : typeof repairedWidget.sourceChartConfigId === "string"
        ? repairedWidget.sourceChartConfigId
        : typeof repairedWidget.chartId === "string"
          ? repairedWidget.chartId
        : typeof repairedWidget.config?.sourceChartId === "string"
          ? repairedWidget.config.sourceChartId
          : typeof repairedWidget.config?.chartId === "string"
            ? repairedWidget.config.chartId
            : typeof repairedWidget.config?.chartConfig?.chartId === "string"
              ? repairedWidget.config.chartConfig.chartId
              : undefined;
  const rawSnapshot = isObject(repairedWidget.chartConfigSnapshot)
    ? repairedWidget.chartConfigSnapshot
    : isObject(repairedWidget.config?.chartConfig)
      ? repairedWidget.config.chartConfig
      : null;
  const compactSnapshot = rawSnapshot ? compactChartConfigForStorage(rawSnapshot) : null;
  const config = compactWidgetConfig(repairedWidget.config, type, sourceChartId, compactSnapshot);

  const normalized = {
    id,
    dashboardId,
    projectId,
    type,
    title: typeof repairedWidget.title === "string" && repairedWidget.title ? repairedWidget.title : type,
    sourceChartId,
    sourceChartConfigId: typeof repairedWidget.sourceChartConfigId === "string" ? repairedWidget.sourceChartConfigId : sourceChartId,
    x: finiteNumber(repairedWidget.x, 0),
    y: finiteNumber(repairedWidget.y, index * 2),
    w: finiteNumber(repairedWidget.w, 24),
    h: finiteNumber(repairedWidget.h, 12),
    zIndex: finiteNumber(repairedWidget.zIndex, 1),
    visible: typeof repairedWidget.visible === "boolean" ? repairedWidget.visible : true,
    background: typeof repairedWidget.background === "string" && !isDataUrl(repairedWidget.background) ? repairedWidget.background : "#FFFFFF",
    borderColor: typeof repairedWidget.borderColor === "string" ? repairedWidget.borderColor : "#E6EAF0",
    radius: finiteNumber(repairedWidget.radius, 6),
    config,
    createdAt: typeof repairedWidget.createdAt === "string" ? repairedWidget.createdAt : now,
    updatedAt: typeof repairedWidget.updatedAt === "string" ? repairedWidget.updatedAt : now,
  };
  if (!sourceChartId && compactSnapshot) normalized.chartConfigSnapshot = compactSnapshot;
  return compactSmallValue(normalized);
}

function normalizeCanvasSettings(settings = {}) {
  return {
    width: finiteNumber(settings.width, 1440),
    height: finiteNumber(settings.height, 900),
    zoom: finiteNumber(settings.zoom, 75),
    showGrid: typeof settings.showGrid === "boolean" ? settings.showGrid : true,
    snapToGrid: typeof settings.snapToGrid === "boolean" ? settings.snapToGrid : true,
  };
}

function normalizeDashboardRecord(item, projectId = DEFAULT_PROJECT_ID, index = 0) {
  const source = repairStoredValue(isObject(item) ? item : {});
  const rawId = source.id || source.dashboardId || (index === 0 ? DEFAULT_DASHBOARD_ID : makeId("dashboard"));
  const id = rawId === "dashboard-canvas-local" ? DEFAULT_DASHBOARD_ID : String(rawId);
  const updatedAt = String(source.updatedAt || nowIso());
  const createdAt = String(source.createdAt || updatedAt);
  const name = repairStoredText(String(source.name || source.dashboardName || "\u0e41\u0e14\u0e0a\u0e1a\u0e2d\u0e23\u0e4c\u0e14"));
  const canvasSettings = normalizeCanvasSettings(source.canvasSettings);
  const widgets = Array.isArray(source.widgets)
    ? source.widgets.map((widget, widgetIndex) => normalizeWidgetRecord(widget, projectId, id, widgetIndex)).filter(Boolean)
    : [];

  return {
    id,
    projectId,
    name,
    dashboardName: name,
    widgets,
    canvasSettings,
    theme: source.theme === "dark" ? "dark" : "light",
    createdAt,
    updatedAt,
  };
}

function normalizeProjectRecord(project, index = 0) {
  const source = repairStoredValue(isObject(project) ? project : {});
  const id = String(source.id || (index === 0 ? DEFAULT_PROJECT_ID : makeId("project")));
  const updatedAt = String(source.updatedAt || nowIso());
  const createdAt = String(source.createdAt || updatedAt);
  const dashboards = Array.isArray(source.dashboards)
    ? source.dashboards.map((dashboard, dashboardIndex) => normalizeDashboardRecord(dashboard, id, dashboardIndex)).filter(Boolean)
    : [];
  const charts = Array.isArray(source.charts)
    ? source.charts.map((chart, chartIndex) => normalizeChartRecord(chart, id, chartIndex)).filter(Boolean)
    : [];

  return {
    id,
    name: repairStoredText(String(source.name || "Mini BI Workspace")),
    dashboards: dashboards.length ? dashboards : [normalizeDashboardRecord(null, id, 0)],
    charts,
    datasets: compactDatasets(source.datasets),
    createdAt,
    updatedAt,
  };
}

function ensureCanonicalMode() {
  if (workspaceRepository.getStatus().mode === "uninitialized") {
    workspaceRepository.migrateIfNeeded();
  }
  return workspaceRepository.getStatus().mode === "canonical";
}

function getCanonicalProjects() {
  return toProjectStorageProjects(workspaceRepository.getSnapshot())
    .map((project, index) => normalizeProjectRecord(project, index));
}

function writeCanonicalProjects(projects, { replaceProjects = false } = {}) {
  const normalized = (Array.isArray(projects) ? projects : [])
    .map((project, index) => normalizeProjectRecord(project, index));
  const projectIds = new Set(normalized.map((project) => project.id));
  const projectionsById = new Map(normalized.map((project) => [project.id, project]));
  workspaceRepository.update((current) => {
    const merged = mergeProjectStorageProjects(current, normalized);
    const exactCollections = merged.projects.map((project) => {
      const projection = projectionsById.get(project.id);
      if (!projection) return project;
      const datasetIds = new Set(projection.datasets.map((dataset) => dataset.id));
      const chartIds = new Set(projection.charts.map((chart) => chart.id));
      const dashboardsById = new Map(projection.dashboards.map((dashboard) => [dashboard.id, dashboard]));
      return {
        ...project,
        datasets: project.datasets.filter((dataset) => datasetIds.has(dataset.id)),
        charts: project.charts.filter((chart) => chartIds.has(chart.id)),
        dashboards: project.dashboards
          .filter((dashboard) => dashboardsById.has(dashboard.id))
          .map((dashboard) => {
            const projectedDashboard = dashboardsById.get(dashboard.id);
            const widgetIds = new Set(projectedDashboard.widgets.map((widget) => widget.id));
            return { ...dashboard, widgets: dashboard.widgets.filter((widget) => widgetIds.has(widget.id)) };
          }),
      };
    });
    return {
      ...merged,
      projects: replaceProjects ? exactCollections.filter((project) => projectIds.has(project.id)) : exactCollections,
    };
  });
  return getCanonicalProjects();
}

function readLegacyCharts() {
  if (!storageAvailable()) return [];
  const parsedList = repairStoredValue(safeParse(safeGetLocalStorage(LEGACY_CHARTS_KEY), []));
  const records = Array.isArray(parsedList)
    ? parsedList.map((item, index) => normalizeChartRecord(item, DEFAULT_PROJECT_ID, index)).filter(Boolean)
    : [];
  const singleConfig = repairStoredValue(safeParse(safeGetLocalStorage(LEGACY_SINGLE_CHART_KEY), null));
  const singleRecord = normalizeChartRecord(singleConfig, DEFAULT_PROJECT_ID, records.length);
  if (singleRecord && !records.some((chart) => chart.id === singleRecord.id)) records.unshift(singleRecord);
  return records;
}

function readLegacyDashboard() {
  if (!storageAvailable()) return null;
  const legacy = repairStoredValue(safeParse(safeGetLocalStorage(LEGACY_LAYOUT_KEY), null));
  if (!legacy || !isObject(legacy)) return null;
  return normalizeDashboardRecord({ ...legacy, id: DEFAULT_DASHBOARD_ID }, DEFAULT_PROJECT_ID, 0);
}

function dedupeCharts(charts) {
  const seen = new Set();
  return charts.filter((chart) => {
    if (!chart?.id || seen.has(chart.id)) return false;
    seen.add(chart.id);
    return true;
  });
}

function uniqueName(baseName, existingNames) {
  const base = String(baseName || "").trim() || "\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23\u0e43\u0e2b\u0e21\u0e48";
  const names = new Set(existingNames.filter(Boolean).map((name) => String(name).trim()));
  if (!names.has(base)) return base;
  let index = 2;
  while (names.has(`${base} ${index}`)) index += 1;
  return `${base} ${index}`;
}

function uniqueDashboardName(project, baseName = "\u0e41\u0e14\u0e0a\u0e1a\u0e2d\u0e23\u0e4c\u0e14\u0e43\u0e2b\u0e21\u0e48") {
  return uniqueName(
    baseName,
    (project?.dashboards ?? []).map((dashboard) => dashboard.name || dashboard.dashboardName)
  );
}

function uniqueProjectName(projects, baseName = "\u0e42\u0e1b\u0e23\u0e40\u0e08\u0e01\u0e15\u0e4c\u0e43\u0e2b\u0e21\u0e48") {
  return uniqueName(baseName, projects.map((project) => project.name));
}

function serializeDashboardForLegacy(dashboard) {
  const compactDashboard = normalizeDashboardRecord(dashboard, dashboard?.projectId ?? DEFAULT_PROJECT_ID, 0);
  return {
    version: 1,
    dashboardId: compactDashboard.id,
    dashboardName: compactDashboard.name,
    widgets: compactDashboard.widgets,
    canvasSettings: compactDashboard.canvasSettings,
    theme: compactDashboard.theme ?? "light",
    updatedAt: compactDashboard.updatedAt,
  };
}

export function compactDashboardLayoutForStorage(dashboard) {
  return serializeDashboardForLegacy(dashboard);
}

function compactSqlQueries(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => isObject(item) && typeof item.id === "string")
    .slice(-20)
    .map((item) =>
      compactSmallValue({
        id: item.id,
        name: item.name,
        description: item.description,
        sql: item.sql,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })
    )
    .filter(Boolean);
}

function compactPanelState(value) {
  return {
    leftOpen: typeof value?.leftOpen === "boolean" ? value.leftOpen : true,
    rightOpen: typeof value?.rightOpen === "boolean" ? value.rightOpen : true,
  };
}

function compactValueForKey(key, value) {
  const repairedValue = repairStoredValue(value);
  if (key === PROJECTS_KEY) {
    const projects = Array.isArray(repairedValue) ? repairedValue : [];
    return projects.map(normalizeProjectRecord).filter(Boolean);
  }
  if (key === LEGACY_CHARTS_KEY) {
    return Array.isArray(repairedValue)
      ? repairedValue.map((chart, index) => compactChartForLegacy(chart, DEFAULT_PROJECT_ID, index)).filter(Boolean)
      : [];
  }
  if (key === LEGACY_SINGLE_CHART_KEY) {
    return compactChartConfigForStorage(repairedValue);
  }
  if (key === LEGACY_LAYOUT_KEY) {
    return isObject(repairedValue) ? serializeDashboardForLegacy(repairedValue) : null;
  }
  if (key === "dashboard-v2-sql-saved-queries") {
    return compactSqlQueries(repairedValue);
  }
  if (key === "dashboard-canvas-panel-state") {
    return compactPanelState(repairedValue);
  }
  return compactSmallValue(repairedValue);
}

function readStorageJson(key, fallback) {
  const raw = safeGetLocalStorage(key);
  return safeParse(raw, fallback);
}

export function compactMiniBiStorage() {
  if (compactingStorage || !storageAvailable()) return;
  compactingStorage = true;
  try {
    MINI_BI_COMPACT_KEYS.forEach((key) => {
      const parsed = readStorageJson(key, null);
      if (parsed === null) return;
      const compacted = compactValueForKey(key, parsed);
      if (compacted === null || typeof compacted === "undefined") {
        if (key !== PROJECTS_KEY) safeRemoveLocalStorage(key);
        return;
      }
      try {
        directSetLocalStorage(key, JSON.stringify(compacted));
      } catch (error) {
        if (key !== PROJECTS_KEY) safeRemoveLocalStorage(key);
        if (isQuotaError(error)) setStorageRecovery();
        warnStorageIssue(error);
      }
    });
  } finally {
    compactingStorage = false;
  }
}

export function safeSetLocalStorage(key, value) {
  const stringValue = typeof value === "string" ? value : String(value ?? "");
  if (!storageAvailable()) {
    memoryValues.set(key, stringValue);
    setStorageRecovery("ไม่สามารถเข้าถึงพื้นที่จัดเก็บในเบราว์เซอร์ได้ ระบบจะเก็บข้อมูลไว้ในหน่วยความจำชั่วคราว");
    return false;
  }

  try {
    directSetLocalStorage(key, stringValue);
    return true;
  } catch (error) {
    if (!isQuotaError(error)) {
      memoryValues.set(key, stringValue);
      warnStorageIssue(error);
      return false;
    }
    memoryValues.set(key, stringValue);
    setStorageRecovery();
    warnStorageIssue(error);
    return false;
  }
}

export function resetMiniBiDemoStorage({ reload = false } = {}) {
  [
    PROJECTS_KEY,
    ACTIVE_PROJECT_KEY,
    ACTIVE_DASHBOARD_KEY,
    STORAGE_VERSION_KEY,
    LEGACY_SINGLE_CHART_KEY,
    LEGACY_CHARTS_KEY,
    LEGACY_LAYOUT_KEY,
    "dashboard-v2-sql-saved-queries",
    "dashboard-canvas-panel-state",
  ].forEach(safeRemoveLocalStorage);
  memoryProjects = null;
  memoryValues.clear();
  storageRecoveryMessage = "";
  if (reload && typeof window !== "undefined") window.location.reload();
}

function writeLegacyCompatibility(project, dashboard) {
  if (!storageAvailable() || !project) return;
  safeSetLocalStorage(LEGACY_CHARTS_KEY, JSON.stringify((project.charts ?? []).map((chart, index) =>
    compactChartForLegacy(chart, project.id, index)
  ).filter(Boolean)));
  if (dashboard) {
    safeSetLocalStorage(LEGACY_LAYOUT_KEY, JSON.stringify(serializeDashboardForLegacy(dashboard)));
  }
}

function loadProjectsRaw() {
  if (memoryProjects) return memoryProjects.map((project, index) => normalizeProjectRecord(project, index));
  if (!storageAvailable()) return [];
  const raw = safeGetLocalStorage(PROJECTS_KEY);
  const parsed = safeParse(raw, null);
  if (raw && raw.length > PROJECTS_SOFT_LIMIT) {
    setStorageRecovery();
  }
  if (raw && !Array.isArray(parsed)) {
    setStorageRecovery("ข้อมูลโปรเจกต์เดโมในเบราว์เซอร์ไม่สมบูรณ์ ระบบได้กู้คืนพื้นที่ทำงานเริ่มต้นแล้ว");
  }
  return Array.isArray(parsed) ? repairStoredValue(parsed) : [];
}

function persistProjects(projects) {
  const normalized = Array.isArray(projects) ? projects.map(normalizeProjectRecord).filter(Boolean) : [];
  const next = normalized.length ? normalized : [normalizeProjectRecord(null, 0)];
  const payload = JSON.stringify(next);
  memoryProjects = next;
  if (payload.length > PROJECTS_SOFT_LIMIT) {
    setStorageRecovery();
  }
  safeSetLocalStorage(PROJECTS_KEY, payload, { removeOnFail: false });
  safeSetLocalStorage(STORAGE_VERSION_KEY, String(STORAGE_VERSION), { removeOnFail: false });
  return next;
}

function ensureProjectStorage() {
  if (!storageAvailable()) {
    return [normalizeProjectRecord(null, 0)];
  }

  const rawProjects = loadProjectsRaw();
  const legacyCharts = readLegacyCharts();
  const legacyDashboard = readLegacyDashboard();
  let projects = rawProjects.map(normalizeProjectRecord).filter(Boolean);

  if (!projects.length) {
    const dashboard = legacyDashboard ?? normalizeDashboardRecord(null, DEFAULT_PROJECT_ID, 0);
    projects = [
      normalizeProjectRecord(
        {
          id: DEFAULT_PROJECT_ID,
          name: "Mini BI Workspace",
          dashboards: [dashboard],
          charts: legacyCharts,
          datasets: [],
        },
        0
      ),
    ];
  } else {
    const activeProjectId = safeGetLocalStorage(ACTIVE_PROJECT_KEY);
    const activeProjectIndex = Math.max(0, projects.findIndex((project) => project.id === activeProjectId));
    const activeProject = projects[activeProjectIndex] ?? projects[0];
    const existingIds = new Set(activeProject.charts.map((chart) => chart.id));
    const missingLegacyCharts = legacyCharts
      .filter((chart) => chart.id && !existingIds.has(chart.id))
      .map((chart, index) => normalizeChartRecord(chart, activeProject.id, activeProject.charts.length + index))
      .filter(Boolean);
    if (missingLegacyCharts.length) {
      projects[activeProjectIndex] = {
        ...activeProject,
        charts: dedupeCharts([...activeProject.charts, ...missingLegacyCharts]),
        updatedAt: nowIso(),
      };
    }
  }

  projects = projects.map((project, index) => normalizeProjectRecord(project, index));
  persistProjects(projects);

  const activeProjectId = safeGetLocalStorage(ACTIVE_PROJECT_KEY);
  const activeProject = projects.find((project) => project.id === activeProjectId) ?? projects[0];
  safeSetLocalStorage(ACTIVE_PROJECT_KEY, activeProject.id, { removeOnFail: false });

  const activeDashboardId = safeGetLocalStorage(ACTIVE_DASHBOARD_KEY);
  const activeDashboard = activeProject.dashboards.find((dashboard) => dashboard.id === activeDashboardId) ?? activeProject.dashboards[0];
  safeSetLocalStorage(ACTIVE_DASHBOARD_KEY, activeDashboard.id, { removeOnFail: false });
  writeLegacyCompatibility(activeProject, activeDashboard);
  return projects;
}

export function getProjects() {
  if (ensureCanonicalMode()) return getCanonicalProjects();
  return ensureProjectStorage();
}

export function saveProjects(projects) {
  if (ensureCanonicalMode()) return writeCanonicalProjects(projects, { replaceProjects: true });
  const normalized = Array.isArray(projects) ? projects.map(normalizeProjectRecord).filter(Boolean) : [];
  const next = normalized.length ? normalized : [normalizeProjectRecord(null, 0)];
  persistProjects(next);
  const activeProject = getActiveProject(next);
  writeLegacyCompatibility(activeProject, getActiveDashboard(next));
  return next;
}

export function getActiveProject(projectsArg) {
  if (ensureCanonicalMode()) {
    const projects = projectsArg ?? getCanonicalProjects();
    const activeProjectId = workspaceRepository.getSnapshot().active.projectId;
    return projects.find((project) => project.id === activeProjectId) ?? projects[0] ?? normalizeProjectRecord(null, 0);
  }
  const projects = projectsArg ?? ensureProjectStorage();
  const activeProjectId = safeGetLocalStorage(ACTIVE_PROJECT_KEY);
  return projects.find((project) => project.id === activeProjectId) ?? projects[0] ?? normalizeProjectRecord(null, 0);
}

export function setActiveProject(projectId, preferredDashboardId) {
  if (ensureCanonicalMode()) {
    workspaceRepository.setActiveProject(projectId, preferredDashboardId);
    return getActiveProject();
  }
  const projects = ensureProjectStorage();
  const project = projects.find((item) => item.id === projectId) ?? projects[0];
  if (!storageAvailable()) return project;
  safeSetLocalStorage(ACTIVE_PROJECT_KEY, project.id, { removeOnFail: false });
  const currentDashboardId = safeGetLocalStorage(ACTIVE_DASHBOARD_KEY);
  const dashboard =
    project.dashboards.find((item) => item.id === preferredDashboardId) ??
    project.dashboards.find((item) => item.id === currentDashboardId) ??
    project.dashboards[0];
  safeSetLocalStorage(ACTIVE_DASHBOARD_KEY, dashboard.id, { removeOnFail: false });
  writeLegacyCompatibility(project, dashboard);
  return project;
}

export function getActiveDashboard(projectsArg) {
  if (ensureCanonicalMode()) {
    const projects = projectsArg ?? getCanonicalProjects();
    const activeProject = getActiveProject(projects);
    const activeDashboardId = workspaceRepository.getSnapshot().active.dashboardId;
    return activeProject.dashboards.find((dashboard) => dashboard.id === activeDashboardId) ?? activeProject.dashboards[0];
  }
  const projects = projectsArg ?? ensureProjectStorage();
  const activeProject = getActiveProject(projects);
  const activeDashboardId = safeGetLocalStorage(ACTIVE_DASHBOARD_KEY);
  return activeProject.dashboards.find((dashboard) => dashboard.id === activeDashboardId) ?? activeProject.dashboards[0];
}

export function setActiveDashboard(dashboardId) {
  if (ensureCanonicalMode()) {
    workspaceRepository.setActiveDashboard(dashboardId);
    return getActiveDashboard();
  }
  const projects = ensureProjectStorage();
  const project = getActiveProject(projects);
  const dashboard = project.dashboards.find((item) => item.id === dashboardId) ?? project.dashboards[0];
  if (!storageAvailable()) return dashboard;
  safeSetLocalStorage(ACTIVE_DASHBOARD_KEY, dashboard.id, { removeOnFail: false });
  writeLegacyCompatibility(project, dashboard);
  return dashboard;
}

export function getCharts(projectId) {
  if (ensureCanonicalMode()) {
    const projects = getCanonicalProjects();
    const project = projectId ? projects.find((item) => item.id === projectId) : getActiveProject(projects);
    return project?.charts ?? [];
  }
  const projects = ensureProjectStorage();
  const project = projectId ? projects.find((item) => item.id === projectId) : getActiveProject(projects);
  return project?.charts ?? [];
}

export function replaceCharts(projectId, charts) {
  if (ensureCanonicalMode()) {
    const projects = getCanonicalProjects();
    const targetProject = projectId ? projects.find((project) => project.id === projectId) : getActiveProject(projects);
    if (!targetProject) return [];
    targetProject.charts = Array.isArray(charts)
      ? dedupeCharts(charts.map((chart, index) => normalizeChartRecord(chart, targetProject.id, index)).filter(Boolean))
      : [];
    writeCanonicalProjects(projects);
    return getCharts(targetProject.id);
  }
  const projects = ensureProjectStorage();
  const targetProject = projectId ? projects.find((project) => project.id === projectId) : getActiveProject(projects);
  if (!targetProject) return [];
  const nextCharts = Array.isArray(charts)
    ? dedupeCharts(charts.map((chart, index) => normalizeChartRecord(chart, targetProject.id, index)).filter(Boolean))
    : [];
  const nextProjects = projects.map((project) =>
    project.id === targetProject.id ? { ...project, charts: nextCharts, updatedAt: nowIso() } : project
  );
  saveProjects(nextProjects);
  return nextCharts;
}

export function getChartById(projectId, chartId) {
  if (!chartId) return null;
  return getCharts(projectId).find((chart) => chart.id === chartId) ?? null;
}

export function upsertChart(projectId, chart) {
  if (ensureCanonicalMode()) {
    const projects = getCanonicalProjects();
    const targetProject = projectId ? projects.find((project) => project.id === projectId) : getActiveProject(projects);
    if (!targetProject) return null;
    const normalized = normalizeChartRecord(chart, targetProject.id, targetProject.charts.length);
    if (!normalized) return null;
    targetProject.charts = dedupeCharts([normalized, ...targetProject.charts.filter((item) => item.id !== normalized.id)]);
    writeCanonicalProjects(projects);
    return getChartById(targetProject.id, normalized.id);
  }
  const projects = ensureProjectStorage();
  const targetProject = projectId ? projects.find((project) => project.id === projectId) : getActiveProject(projects);
  if (!targetProject) return null;
  const normalized = normalizeChartRecord(chart, targetProject.id, targetProject.charts.length);
  if (!normalized) return null;
  const nextCharts = dedupeCharts([normalized, ...targetProject.charts.filter((item) => item.id !== normalized.id)]);
  const nextProjects = projects.map((project) =>
    project.id === targetProject.id ? { ...project, charts: nextCharts, updatedAt: nowIso() } : project
  );
  saveProjects(nextProjects);
  return normalized;
}

export function deleteChart(projectId, chartId) {
  const withoutChartDependents = (dashboards = []) =>
    dashboards.map((dashboard) => ({
      ...dashboard,
      widgets: (dashboard.widgets ?? []).filter(
        (widget) =>
          widget.sourceChartId !== chartId &&
          widget.sourceChartConfigId !== chartId &&
          widget.config?.sourceChartId !== chartId
      ),
    }));

  if (ensureCanonicalMode()) {
    const projects = getCanonicalProjects();
    const targetProject = projectId ? projects.find((project) => project.id === projectId) : getActiveProject(projects);
    if (!targetProject) return [];
    targetProject.charts = targetProject.charts.filter((chart) => chart.id !== chartId);
    targetProject.dashboards = withoutChartDependents(targetProject.dashboards);
    writeCanonicalProjects(projects);
    return getCharts(targetProject.id);
  }
  const projects = ensureProjectStorage();
  const targetProject = projectId ? projects.find((project) => project.id === projectId) : getActiveProject(projects);
  if (!targetProject) return [];
  const nextCharts = targetProject.charts.filter((chart) => chart.id !== chartId);
  const nextProjects = projects.map((project) =>
    project.id === targetProject.id
      ? {
          ...project,
          charts: nextCharts,
          dashboards: withoutChartDependents(project.dashboards),
          updatedAt: nowIso(),
        }
      : project
  );
  saveProjects(nextProjects);
  return nextCharts;
}

export function getDashboards(projectId) {
  if (ensureCanonicalMode()) {
    const projects = getCanonicalProjects();
    const project = projectId ? projects.find((item) => item.id === projectId) : getActiveProject(projects);
    return project?.dashboards ?? [];
  }
  const projects = ensureProjectStorage();
  const project = projectId ? projects.find((item) => item.id === projectId) : getActiveProject(projects);
  return project?.dashboards ?? [];
}

export function getDashboardById(projectId, dashboardId) {
  if (!dashboardId) return null;
  return getDashboards(projectId).find((dashboard) => dashboard.id === dashboardId) ?? null;
}

export function upsertDashboard(projectId, dashboard) {
  if (ensureCanonicalMode()) {
    const projects = getCanonicalProjects();
    const targetProject = projectId ? projects.find((project) => project.id === projectId) : getActiveProject(projects);
    if (!targetProject) return null;
    const normalized = normalizeDashboardRecord(dashboard, targetProject.id, targetProject.dashboards.length);
    targetProject.dashboards = [
      normalized,
      ...targetProject.dashboards.filter((item) => item.id !== normalized.id),
    ].sort((left, right) => (left.createdAt || "").localeCompare(right.createdAt || ""));
    writeCanonicalProjects(projects);
    return getDashboardById(targetProject.id, normalized.id);
  }
  const projects = ensureProjectStorage();
  const targetProject = projectId ? projects.find((project) => project.id === projectId) : getActiveProject(projects);
  if (!targetProject) return null;
  const normalized = normalizeDashboardRecord(dashboard, targetProject.id, targetProject.dashboards.length);
  const nextDashboards = [
    normalized,
    ...targetProject.dashboards.filter((item) => item.id !== normalized.id),
  ].sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
  const nextProjects = projects.map((project) =>
    project.id === targetProject.id ? { ...project, dashboards: nextDashboards, updatedAt: nowIso() } : project
  );
  saveProjects(nextProjects);
  if (safeGetLocalStorage(ACTIVE_DASHBOARD_KEY) === normalized.id) {
    writeLegacyCompatibility({ ...targetProject, dashboards: nextDashboards }, normalized);
  }
  return normalized;
}

export function createDashboard(projectId, name = "\u0e41\u0e14\u0e0a\u0e1a\u0e2d\u0e23\u0e4c\u0e14\u0e43\u0e2b\u0e21\u0e48") {
  if (ensureCanonicalMode()) {
    const project = projectId ? getProjects().find((item) => item.id === projectId) : getActiveProject();
    if (!project) return null;
    const now = nowIso();
    const dashboard = normalizeDashboardRecord({
      id: makeId("dashboard"),
      name: uniqueDashboardName(project, name),
      widgets: [],
      canvasSettings: normalizeCanvasSettings(),
      theme: "light",
      createdAt: now,
      updatedAt: now,
    }, project.id, project.dashboards.length);
    upsertDashboard(project.id, dashboard);
    setActiveDashboard(dashboard.id);
    return getDashboardById(project.id, dashboard.id);
  }
  const project = projectId ? getProjects().find((item) => item.id === projectId) : getActiveProject();
  const dashboardName = uniqueDashboardName(project, name);
  const dashboard = normalizeDashboardRecord(
    {
      id: makeId("dashboard"),
      name: dashboardName,
      widgets: [],
      canvasSettings: normalizeCanvasSettings(),
      theme: "light",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
    project?.id || projectId || getActiveProject().id,
    0
  );
  upsertDashboard(dashboard.projectId, dashboard);
  setActiveDashboard(dashboard.id);
  return dashboard;
}

export function createProject(name = "\u0e42\u0e1b\u0e23\u0e40\u0e08\u0e01\u0e15\u0e4c\u0e43\u0e2b\u0e21\u0e48") {
  if (ensureCanonicalMode()) {
    const projects = getCanonicalProjects();
    const now = nowIso();
    const projectId = makeId("project");
    const dashboard = normalizeDashboardRecord({
      id: makeId("dashboard"),
      name: "\u0e41\u0e14\u0e0a\u0e1a\u0e2d\u0e23\u0e4c\u0e14\u0e43\u0e2b\u0e21\u0e48",
      widgets: [],
      canvasSettings: normalizeCanvasSettings(),
      theme: "light",
      createdAt: now,
      updatedAt: now,
    }, projectId, 0);
    const project = normalizeProjectRecord({
      id: projectId,
      name: uniqueProjectName(projects, name),
      dashboards: [dashboard],
      charts: [],
      datasets: [],
      createdAt: now,
      updatedAt: now,
    }, projects.length);
    writeCanonicalProjects([...projects, project]);
    workspaceRepository.setActiveProject(project.id, dashboard.id);
    return getActiveProject();
  }
  const projects = ensureProjectStorage();
  const now = nowIso();
  const projectName = uniqueProjectName(projects, name);
  const project = normalizeProjectRecord(
    {
      id: makeId("project"),
      name: projectName,
      dashboards: [
        normalizeDashboardRecord(
          {
            id: makeId("dashboard"),
            name: "\u0e41\u0e14\u0e0a\u0e1a\u0e2d\u0e23\u0e4c\u0e14\u0e43\u0e2b\u0e21\u0e48",
            widgets: [],
            canvasSettings: normalizeCanvasSettings(),
            theme: "light",
            createdAt: now,
            updatedAt: now,
          },
          DEFAULT_PROJECT_ID,
          0
        ),
      ],
      charts: [],
      datasets: [],
      createdAt: now,
      updatedAt: now,
    },
    projects.length
  );
  const nextProjects = [...projects, project];
  saveProjects(nextProjects);
  setActiveProject(project.id, project.dashboards[0]?.id);
  return project;
}

export function renameProject(projectId, name) {
  if (ensureCanonicalMode()) {
    const nextName = String(name || "").trim();
    if (!nextName) return null;
    const projects = getCanonicalProjects();
    const project = projects.find((item) => item.id === projectId);
    if (!project) return null;
    project.name = nextName;
    project.updatedAt = nowIso();
    writeCanonicalProjects(projects);
    return getProjects().find((item) => item.id === projectId) ?? null;
  }
  const nextName = String(name || "").trim();
  if (!nextName) return null;
  const projects = ensureProjectStorage();
  const existing = projects.find((project) => project.id === projectId);
  if (!existing) return null;
  const nextProjects = projects.map((project) =>
    project.id === projectId ? { ...project, name: nextName, updatedAt: nowIso() } : project
  );
  saveProjects(nextProjects);
  return nextProjects.find((project) => project.id === projectId) ?? null;
}

export function renameDashboard(projectId, dashboardId, name) {
  if (ensureCanonicalMode()) {
    const existing = getDashboardById(projectId, dashboardId);
    if (!existing || !String(name || "").trim()) return existing;
    return upsertDashboard(projectId, { ...existing, name: String(name).trim(), dashboardName: String(name).trim() });
  }
  const existing = getDashboardById(projectId, dashboardId);
  if (!existing || !String(name || "").trim()) return existing;
  return upsertDashboard(projectId, {
    ...existing,
    name: String(name).trim(),
    dashboardName: String(name).trim(),
    updatedAt: nowIso(),
  });
}

export function deleteDashboard(projectId, dashboardId) {
  if (ensureCanonicalMode()) {
    const projects = getCanonicalProjects();
    const targetProject = projectId ? projects.find((project) => project.id === projectId) : getActiveProject(projects);
    if (!targetProject || targetProject.dashboards.length <= 1) return getActiveDashboard(projects);
    const nextDashboardId = targetProject.dashboards.find((dashboard) => dashboard.id !== dashboardId)?.id ?? null;
    workspaceRepository.update((current) => ({
      ...current,
      projects: current.projects.map((project) => project.id === targetProject.id
        ? {
            ...project,
            dashboards: project.dashboards.filter((dashboard) => dashboard.id !== dashboardId),
            updatedAt: nowIso(),
          }
        : project),
      active: current.active.dashboardId === dashboardId
        ? { ...current.active, dashboardId: nextDashboardId }
        : current.active,
    }));
    return getActiveDashboard();
  }
  const projects = ensureProjectStorage();
  const targetProject = projectId ? projects.find((project) => project.id === projectId) : getActiveProject(projects);
  if (!targetProject || targetProject.dashboards.length <= 1) return getActiveDashboard(projects);
  const nextDashboards = targetProject.dashboards.filter((dashboard) => dashboard.id !== dashboardId);
  const nextProjects = projects.map((project) =>
    project.id === targetProject.id ? { ...project, dashboards: nextDashboards, updatedAt: nowIso() } : project
  );
  saveProjects(nextProjects);
  const activeDashboardId = safeGetLocalStorage(ACTIVE_DASHBOARD_KEY);
  const nextActive = activeDashboardId === dashboardId ? nextDashboards[0] : nextDashboards.find((item) => item.id === activeDashboardId) ?? nextDashboards[0];
  safeSetLocalStorage(ACTIVE_DASHBOARD_KEY, nextActive.id, { removeOnFail: false });
  writeLegacyCompatibility({ ...targetProject, dashboards: nextDashboards }, nextActive);
  return nextActive;
}

export function addWidgetToDashboard(projectId, dashboardId, widget) {
  if (ensureCanonicalMode()) {
    const dashboard = getDashboardById(projectId, dashboardId);
    if (!dashboard) return null;
    const normalizedWidget = normalizeWidgetRecord(widget, projectId, dashboardId, dashboard.widgets.length);
    upsertDashboard(projectId, { ...dashboard, widgets: [...dashboard.widgets, normalizedWidget], updatedAt: nowIso() });
    return getDashboardById(projectId, dashboardId)?.widgets.find((item) => item.id === normalizedWidget.id) ?? null;
  }
  const dashboard = getDashboardById(projectId, dashboardId);
  if (!dashboard) return null;
  const normalizedWidget = normalizeWidgetRecord(widget, projectId, dashboardId, dashboard.widgets.length);
  const nextDashboard = {
    ...dashboard,
    widgets: [...dashboard.widgets, normalizedWidget],
    updatedAt: nowIso(),
  };
  upsertDashboard(projectId, nextDashboard);
  return normalizedWidget;
}

export function updateWidget(projectId, dashboardId, widgetId, patch) {
  if (ensureCanonicalMode()) {
    const dashboard = getDashboardById(projectId, dashboardId);
    if (!dashboard) return null;
    upsertDashboard(projectId, {
      ...dashboard,
      widgets: dashboard.widgets.map((widget) => widget.id === widgetId
        ? normalizeWidgetRecord({ ...widget, ...patch, updatedAt: nowIso() }, projectId, dashboardId)
        : widget),
      updatedAt: nowIso(),
    });
    return getDashboardById(projectId, dashboardId)?.widgets.find((widget) => widget.id === widgetId) ?? null;
  }
  const dashboard = getDashboardById(projectId, dashboardId);
  if (!dashboard) return null;
  const nextDashboard = {
    ...dashboard,
    widgets: dashboard.widgets.map((widget) =>
      widget.id === widgetId
        ? normalizeWidgetRecord({ ...widget, ...patch, updatedAt: nowIso() }, projectId, dashboardId)
        : widget
    ),
    updatedAt: nowIso(),
  };
  upsertDashboard(projectId, nextDashboard);
  return nextDashboard.widgets.find((widget) => widget.id === widgetId) ?? null;
}

export function deleteWidget(projectId, dashboardId, widgetId) {
  if (ensureCanonicalMode()) {
    const dashboard = getDashboardById(projectId, dashboardId);
    if (!dashboard) return [];
    upsertDashboard(projectId, {
      ...dashboard,
      widgets: dashboard.widgets.filter((widget) => widget.id !== widgetId),
      updatedAt: nowIso(),
    });
    return getDashboardById(projectId, dashboardId)?.widgets ?? [];
  }
  const dashboard = getDashboardById(projectId, dashboardId);
  if (!dashboard) return [];
  const nextWidgets = dashboard.widgets.filter((widget) => widget.id !== widgetId);
  upsertDashboard(projectId, { ...dashboard, widgets: nextWidgets, updatedAt: nowIso() });
  return nextWidgets;
}

export {
  ACTIVE_DASHBOARD_KEY,
  ACTIVE_PROJECT_KEY,
  DEFAULT_DASHBOARD_ID,
  DEFAULT_PROJECT_ID,
  LEGACY_CHARTS_KEY,
  LEGACY_LAYOUT_KEY,
  LEGACY_SINGLE_CHART_KEY,
  PROJECTS_KEY,
  STORAGE_VERSION_KEY,
};
