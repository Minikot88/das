import {
  compactChartConfigForStorage,
  deleteChart as deleteProjectChart,
  getActiveProject,
  getChartById as getProjectChartById,
  getCharts as getProjectCharts,
  LEGACY_CHARTS_KEY as SAVED_CHARTS_KEY,
  LEGACY_SINGLE_CHART_KEY as SINGLE_CHART_KEY,
  replaceCharts as replaceProjectCharts,
  safeSetLocalStorage,
  upsertChart as upsertProjectChart,
} from "@/services/projectStorage";
import { repairMojibakeText, repairObjectText } from "@/utils/textEncodingRepair";
import { normalizeChartDataContract } from "@/domain/charts/chartDataContract";

function makeId(prefix = "chart") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isObject(value) {
  return typeof value === "object" && value !== null;
}

function clone(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function storageAvailable() {
  if (typeof window === "undefined") return false;
  try {
    return typeof window.localStorage !== "undefined";
  } catch {
    return false;
  }
}

function chartTitle(config) {
  return repairMojibakeText(config?.settings?.general?.title || config?.title || "กราฟที่บันทึก");
}

function chartType(config) {
  return config?.chartType || config?.type || "bar";
}

function existingTitleSet(charts, ignoredId = "") {
  return new Set(charts.filter((chart) => chart.id !== ignoredId).map((chart) => chart.title));
}

function uniqueTitle(baseTitle, charts, ignoredId = "") {
  const base = repairMojibakeText(String(baseTitle || "กราฟที่บันทึก")).trim() || "กราฟที่บันทึก";
  const titles = existingTitleSet(charts, ignoredId);
  if (!titles.has(base)) return base;
  let index = 2;
  while (titles.has(`${base} ${index}`)) index += 1;
  return `${base} ${index}`;
}

function normalizeSavedChartRecord(item, index = 0) {
  if (!isObject(item)) return null;
  const repairedItem = repairObjectText(item);
  const rawConfig = isObject(repairedItem.config)
    ? repairedItem.config
    : isObject(repairedItem.chartConfig)
      ? repairedItem.chartConfig
      : repairedItem;
  if (!isObject(rawConfig)) return null;

  const id = String(repairedItem.id || rawConfig.chartId || rawConfig.id || `saved-chart-${index}`);
  const updatedAt = String(repairedItem.updatedAt || rawConfig.updatedAt || new Date().toISOString());
  const createdAt = String(repairedItem.createdAt || rawConfig.createdAt || updatedAt);
  const config = {
    ...compactChartConfigForStorage(rawConfig),
    chartId: id,
    updatedAt,
    createdAt,
  };
  const dataContract = normalizeChartDataContract({
    ...repairedItem,
    datasetId: repairedItem.datasetId ?? rawConfig.datasetId ?? null,
    config: rawConfig,
  });
  const datasetId = dataContract.sourceType === "dataset" || dataContract.sourceType === "demo"
    ? dataContract.datasetId
    : null;

  return {
    id,
    projectId: typeof repairedItem.projectId === "string" ? repairedItem.projectId : getActiveProject()?.id,
    name: repairMojibakeText(String(repairedItem.name || repairedItem.title || chartTitle(config))),
    title: repairMojibakeText(String(repairedItem.title || chartTitle(config))),
    chartType: chartType(config),
    config,
    fieldMappings: repairedItem.fieldMappings ?? config.fieldMappings ?? config.mappings ?? [],
    settings: repairedItem.settings ?? config.settings ?? {},
    filters: repairedItem.filters ?? config.filters ?? {},
    datasetId,
    dataContract,
    datasetInfo: {
      ...(isObject(repairedItem.datasetInfo) ? repairedItem.datasetInfo : {}),
      sourceType: dataContract.sourceType,
      datasetId,
    },
    source: repairedItem.source || "dashboard-v2",
    createdAt,
    updatedAt,
  };
}

export function getSavedCharts() {
  const activeProject = getActiveProject();
  const records = getProjectCharts(activeProject?.id).map((item, index) =>
    normalizeSavedChartRecord({ ...item, projectId: activeProject?.id }, index)
  ).filter(Boolean);
  const seen = new Set();
  return records.filter((record) => {
    if (seen.has(record.id)) return false;
    seen.add(record.id);
    return true;
  });
}

export function saveSavedCharts(charts) {
  const activeProject = getActiveProject();
  const normalized = Array.isArray(charts)
    ? charts.map((chart, index) => normalizeSavedChartRecord({ ...chart, projectId: activeProject?.id }, index)).filter(Boolean)
    : [];
  return replaceProjectCharts(activeProject?.id, normalized);
}

export function getSavedChartById(id) {
  if (!id) return null;
  const activeProject = getActiveProject();
  return getProjectChartById(activeProject?.id, id) ?? getSavedCharts().find((chart) => chart.id === id) ?? null;
}

export function upsertSavedChart(chart) {
  if (!storageAvailable()) return normalizeSavedChartRecord(chart, 0);
  const existing = getSavedCharts();
  const activeProject = getActiveProject();
  const now = new Date().toISOString();
  const incoming = normalizeSavedChartRecord(
    {
      ...chart,
      projectId: chart?.projectId || activeProject?.id,
      updatedAt: chart?.updatedAt || now,
      createdAt: chart?.createdAt || now,
    },
    existing.length
  );
  if (!incoming) return null;

  incoming.title = chart?.title ? String(chart.title) : uniqueTitle(incoming.title, existing, incoming.id);
  incoming.config = {
    ...incoming.config,
    chartId: incoming.id,
    updatedAt: incoming.updatedAt,
    createdAt: incoming.createdAt,
  };

  const saved = upsertProjectChart(activeProject?.id, incoming);
  safeSetLocalStorage(SINGLE_CHART_KEY, JSON.stringify(compactChartConfigForStorage(saved?.config ?? incoming.config)));
  return saved ?? incoming;
}

export function createSavedChartFromConfig(config, options = {}) {
  const existing = getSavedCharts();
  const now = new Date().toISOString();
  const id = options.forceNew ? makeId("chart") : String(options.id || config?.chartId || makeId("chart"));
  const title = uniqueTitle(options.title || chartTitle(config), existing, id);
  return upsertSavedChart({
    id,
    title,
    chartType: options.chartType || chartType(config),
    ...(isObject(options.dataContract) ? { dataContract: clone(options.dataContract) } : {}),
    config: {
      ...(isObject(config) ? clone(config) : {}),
      chartId: id,
      updatedAt: now,
      createdAt: config?.createdAt || now,
    },
    source: options.source || "dashboard-v2",
    createdAt: config?.createdAt || now,
    updatedAt: now,
  });
}

export function updateSavedChart(id, patch = {}) {
  const existing = getSavedChartById(id);
  if (!existing) return null;
  const now = new Date().toISOString();
  return upsertSavedChart({
    ...existing,
    ...patch,
    id,
    title: patch.title || existing.title,
    chartType: patch.chartType || patch.config?.chartType || existing.chartType,
    config: {
      ...existing.config,
      ...(isObject(patch.config) ? patch.config : {}),
      chartId: id,
      updatedAt: now,
    },
    updatedAt: now,
  });
}

export function deleteSavedChart(id) {
  if (!storageAvailable()) return [];
  const activeProject = getActiveProject();
  return deleteProjectChart(activeProject?.id, id);
}

export { SAVED_CHARTS_KEY, SINGLE_CHART_KEY };
