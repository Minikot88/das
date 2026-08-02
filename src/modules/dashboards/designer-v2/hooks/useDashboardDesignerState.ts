import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { chartPresets } from "@modules/dashboards/designer-v2/components/demo/chartPresets";
import { createDemoInsights } from "@modules/dashboards/designer-v2/components/demo/demoInsights";
import { demoTemplates } from "@modules/dashboards/designer-v2/components/demo/demoTemplates";
import { applyThemeToSettings, demoThemes } from "@modules/dashboards/designer-v2/components/demo/demoThemes";
import type { ChartPreset, DemoMappingPreset, DemoSettingsPatch, DemoTemplate, DemoThemeId } from "@modules/dashboards/designer-v2/components/demo/demoTypes";
import { chartCatalog, createDefaultConfig, dataFields, defaultChartSettings } from "@modules/dashboards/designer-v2/components/mockData";
import { getDatasetRows, getDatasetSchema, getDatasources, refreshDataset as refreshDatasetRows, type DemoDatasource, type DemoDatasetRow } from "@modules/dashboards/designer-v2/components/services/datasetService";
import { useWorkspaceSelector } from "@app/store/useWorkspaceSelector";
import { scanForSecretMaterial } from "@domain/workspace/workspaceSchema";
import {
  defaultSavedSqlQueries,
  formatSql,
  runDemoSqlQuery,
  sqlExamples,
  type SqlQueryError,
  type SqlQueryResult,
  type SqlSavedQuery,
} from "@modules/dashboards/designer-v2/components/sql/sqlQueryEngine";
import { exportRowsToCsv, transformChartData } from "@modules/dashboards/designer-v2/components/utils/chartDataEngine";
import { getLatestEChartsDataUrl } from "@modules/dashboards/designer-v2/components/utils/echartsInstanceRegistry";
import {
  validateAggregationForField,
  validateChartConfig,
  validateFieldForSlot,
} from "@modules/dashboards/designer-v2/components/utils/chartValidation";
import {
  mappingRecommendationFor,
  preferredAggregationFor,
} from "@modules/dashboards/designer-v2/components/utils/axisTitles";
import {
  createTableAlias,
  relationToJoin,
  toQualifiedFields,
} from "@modules/dashboards/designer-v2/components/utils/multiTableDataset";
import { getChartDefinition } from "@modules/dashboards/designer-v2/components/utils/chartRegistry";
import { getSavedChartById, upsertSavedChart } from "@modules/charts/public/savedCharts";
import {
  compactChartConfigForStorage,
  consumeStorageRecoveryMessage,
  safeSetLocalStorage,
} from "@infrastructure/persistence/project-storage/projectStorage";
import { useLocation } from "react-router";
import { isMockMode } from "@infrastructure/http/client";
import { getChartById, createChart, updateChart } from "@modules/charts/public/api";
import {
  createExternalDataset,
  getDatasetDetail,
  getDatasetFields,
  listDatasets,
  listExternalColumns,
  listExternalRelationships,
  listExternalSources,
  listExternalTables,
  loadDataset,
  previewExternalSource,
} from "@modules/datasets/public/api";
import {
  API_ACTIVE_PROJECT_KEY,
  getProjects,
  resolveApiActiveProject,
} from "@modules/projects";
import type {
  Aggregation,
  ChartCategory,
  ChartConfig,
  ChartSettings,
  ChartType,
  DataField,
  DatasetJoin,
  DatasetTable,
  DeviceMode,
  DragFieldItem,
  FilterValue,
  MappingSlot,
  MappingSlotId,
} from "@modules/dashboards/designer-v2/components/types";

const STORAGE_KEY = "dashboard-v2-chart-config";
const SQL_SAVED_QUERIES_KEY = "dashboard-v2-sql-saved-queries";
const CONFIG_SCHEMA_VERSION = 3;
const DEFAULT_DATASET_ID = "sales_performance";
const INITIAL_DATASOURCES = getDatasources();
const SQL_DATASOURCE_ID = "demo-sql";
const SQL_TABLE_NAME = "SQL Result";
const SQL_CREDENTIAL_ASSIGNMENT_PATTERN = /\b(?:password|passwd|passphrase|api[_\s-]?key|access[_\s-]?token|refresh[_\s-]?token|id[_\s-]?token|client[_\s-]?secret|private[_\s-]?key|secret)\b\s*(?:=|:=|=>)\s*(?:N?'[^']*'|"[^"]*"|[^\s,;]+)/i;
const SQL_PASSWORD_CLAUSE_PATTERN = /\b(?:(?:identified\s+by|with\s+password|set\s+password)\s+|password\s+)(?:N?'[^']*'|"[^"]*"|\$\$[\s\S]*?\$\$)/i;
const EMBEDDED_URL_PATTERN = /[a-z][a-z\d+.-]*:\/\/[^\s'"<>]+/gi;

const DEMO_SQL_DATASOURCE: DemoDatasource = {
  id: SQL_DATASOURCE_ID,
  name: "Demo SQL",
  database: "demo_sql",
  schema: "query",
  table: SQL_TABLE_NAME,
  rowCount: 0,
  fieldCount: 0,
  lastUpdated: "ล่าสุด",
};

type ManualCopyFallback = {
  label: string;
  text: string;
} | null;

function containsSqlCredentialMaterial(query: string) {
  if (SQL_CREDENTIAL_ASSIGNMENT_PATTERN.test(query) || SQL_PASSWORD_CLAUSE_PATTERN.test(query)) return true;
  const embeddedUrls = query.match(EMBEDDED_URL_PATTERN) ?? [];
  return embeddedUrls.some((url) => scanForSecretMaterial({ sqlUrl: url }).length > 0);
}

function safeSqlForPersistence(query: string) {
  return containsSqlCredentialMaterial(query) ? "" : query;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function errorStatus(error: unknown) {
  return isObject(error) ? Number(error.status) : 0;
}

function safeGetLocalStorageValue(key: string) {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function cloneConfig(config: ChartConfig): ChartConfig {
  return structuredClone(config);
}

export function persistChartEditLocation(chartId: string) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.set("chartId", chartId);
  window.history.replaceState(window.history.state, "", url);
}

export function createApiDesignerConfig(): ChartConfig {
  const config = createDefaultConfig();
  config.sourceType = "dataset";
  config.datasetId = "";
  config.settings.general.title = "";
  config.settings.general.subtitle = "";
  config.settings.axis.xAxisLabel = "";
  config.settings.axis.yAxisLabel = "";
  config.mappings = config.mappings.map((mapping) => ({ ...mapping, fields: [] }));
  config.filters = {};
  config.sort = "none";
  return config;
}

function toDesignerFields(fields: Array<Record<string, unknown>>, table = "dataset"): DataField[] {
  return fields.map((field) => {
    const rawType = String(field.type || field.dataType || "string").toLowerCase();
    const type: DataField["type"] = /int|numeric|decimal|double|real|money/.test(rawType)
      ? "number"
      : /date|time/.test(rawType)
        ? "date"
        : rawType === "boolean"
          ? "boolean"
          : "text";
    const name = String(field.name || field.fieldKey || "");
    const isPrimaryKey = field.primaryKey === true || /(^id$|_id$|^id_)/i.test(name);
    const isMeasure = type === "number";
    const storedSemantic = String(field.semanticType || "").toLowerCase();
    return {
      id: String(field.id || name),
      name,
      label: String(field.label || field.name || field.fieldKey || name),
      type,
      semanticType: (storedSemantic || (type === "date" ? "date" : isMeasure ? "quantity" : type === "boolean" ? "boolean" : "category")) as DataField["semanticType"],
      table,
      description: "",
      sampleValues: [],
      isMeasure,
      isDimension: !isMeasure,
      defaultAggregation: isPrimaryKey ? "Count" : isMeasure ? "Sum" : "None",
      isPrimaryKey,
      physicalType: String(field.dataType || field.type || "text"),
      nullable: field.nullable !== false,
    };
  });
}

function toRemoteDatasource(item: Record<string, unknown>): DemoDatasource {
  const sourceConfig = item.sourceConfigJson && typeof item.sourceConfigJson === "object"
    ? item.sourceConfigJson as Record<string, unknown>
    : {};
  const schema = String(sourceConfig.schemaName || "public");
  const table = String(sourceConfig.tableName || item.name || item.id);
  return {
    id: String(item.id),
    name: String(item.name || `${schema}.${table}`),
    database: "PostgreSQL",
    schema,
    table,
    rowCount: Number(item.rowCount || sourceConfig.estimatedRowCount || 0),
    fieldCount: Number(item.fieldCount || 0),
    lastUpdated: String(item.updatedAt || ""),
  };
}

export function persistedMultiTableState(dataset: Record<string, unknown>) {
  const source = dataset.sourceConfigJson && typeof dataset.sourceConfigJson === "object"
    ? dataset.sourceConfigJson as Record<string, unknown>
    : {};
  const tables = Array.isArray(source.selectedTables) ? source.selectedTables as DatasetTable[] : [];
  const joins = Array.isArray(source.joins) ? source.joins as DatasetJoin[] : [];
  const selectedFields = Array.isArray(source.selectedFields) ? source.selectedFields as Array<Record<string, unknown>> : [];
  return {
    tables,
    joins,
    semanticTypeOverrides: source.semanticTypeOverrides && typeof source.semanticTypeOverrides === "object"
      ? source.semanticTypeOverrides as Record<string, string>
      : {},
    safeCasts: Object.fromEntries(selectedFields.flatMap((field) => {
      const cast = field.cast && typeof field.cast === "object" ? field.cast as Record<string, unknown> : null;
      return cast?.targetType ? [[`${field.tableAlias}.${field.column}`, String(cast.targetType)]] : [];
    })) as Record<string, "numeric" | "date" | "text">,
    calculatedFields: Array.isArray(source.calculatedFields) ? source.calculatedFields as Array<Record<string, unknown>> : [],
  };
}

function applyPersistedFieldSource(fields: DataField[], tables: DatasetTable[]) {
  return fields.map((field) => {
    const alias = field.label.includes(".") ? field.label.split(".")[0] : "";
    const table = tables.find((item) => item.alias === alias);
    return table ? { ...field, sourceAlias: alias, sourceSchema: table.schema, sourceTable: table.table, table: `${table.schema}.${table.table}` } : field;
  });
}

export function datasetSourceIdentity(dataset: Record<string, unknown>) {
  const sourceConfig = isObject(dataset.sourceConfigJson) ? dataset.sourceConfigJson : {};
  const name = String(dataset.name || "dataset");
  const [nameSchema, ...nameTableParts] = name.split(".");
  const schema = String(sourceConfig.schemaName || (nameTableParts.length ? nameSchema : ""));
  const table = String(sourceConfig.tableName || (nameTableParts.length ? nameTableParts.join(".") : name));
  return { schema, table, context: schema ? `${schema}.${table}` : table };
}

function remapFieldsToDatasource(currentFields: DataField[], nextFields: DataField[]) {
  const nextById = new Map(nextFields.map((field) => [field.id, field]));
  return currentFields
    .map((field) => nextById.get(field.id))
    .filter((field): field is DataField => Boolean(field));
}

function resolveSavedFields(savedSlot: Record<string, unknown>, fallbackFields: DataField[], availableFields = dataFields) {
  if (!Array.isArray(savedSlot.fields)) return fallbackFields;
  return savedSlot.fields
    .map((field) =>
      isObject(field) && typeof field.id === "string"
        ? availableFields.find((item) => item.id === field.id) ?? dataFields.find((item) => item.id === field.id)
        : undefined
    )
    .filter((field): field is DataField => Boolean(field));
}

function savedMappingsFrom(value: Record<string, unknown>) {
  if (Array.isArray(value.fieldMappings)) return value.fieldMappings;
  if (Array.isArray(value.mappings)) return value.mappings;
  return [];
}

export function serializeChartConfig(config: ChartConfig, sqlSnapshot?: { query: string; result: SqlQueryResult | null }) {
  const aggregations = config.mappings.reduce<Record<string, Aggregation | undefined>>((result, slot) => {
    result[slot.id] = slot.aggregation;
    return result;
  }, {});

  return {
    schemaVersion: config.schemaVersion,
    version: config.version,
    dashboardId: config.dashboardId,
    chartId: config.chartId,
    chartType: config.chartType,
    fieldMappings: config.mappings,
    mappings: config.mappings,
    filters: config.filters,
    aggregations,
    settings: config.settings,
    sort: config.sort,
    textElements: config.textElements,
    imageName: config.imageName,
    sourceType: config.sourceType,
    datasetId: config.datasetId,
    sqlModeEnabled: config.sourceType === "demo-sql",
    sqlQuery: safeSqlForPersistence(sqlSnapshot?.query ?? ""),
    sqlResultSchema: sqlSnapshot?.result?.fields ?? [],
    sqlResultRows: sqlSnapshot?.result?.rows ?? [],
    createdAt: config.createdAt,
    updatedAt: config.updatedAt,
  };
}

type SavedDesignerChartRecord = {
  id: string;
  title: string;
  chartType: ChartType;
  updatedAt: string;
  config: ReturnType<typeof serializeChartConfig>;
};

function makeSavedChartId() {
  return `chart-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function persistDesignerChartConfig(
  config: ChartConfig,
  sqlSnapshot?: { query: string; result: SqlQueryResult | null },
  activeChartId?: string | null,
  options: { createIfMissing?: boolean } = {}
) {
  const serialized = serializeChartConfig(config, sqlSnapshot);
  const now = new Date().toISOString();
  const hasActiveChart = Boolean(activeChartId);
  const id = activeChartId || (options.createIfMissing ? makeSavedChartId() : serialized.chartId || "chart-v2-draft");
  const latestConfig = {
    ...serialized,
    chartId: id,
    createdAt: hasActiveChart ? serialized.createdAt : serialized.createdAt || now,
    updatedAt: now,
  };

  if (!hasActiveChart && !options.createIfMissing) {
    safeSetLocalStorage(STORAGE_KEY, JSON.stringify(compactChartConfigForStorage(latestConfig)));
    return null;
  }

  const record = upsertSavedChart({
    id,
    title: serialized.settings.general.title || "กราฟที่บันทึก",
    chartType: serialized.chartType,
    createdAt: latestConfig.createdAt,
    updatedAt: now,
    config: latestConfig,
  }) as SavedDesignerChartRecord | null;

  safeSetLocalStorage(STORAGE_KEY, JSON.stringify(compactChartConfigForStorage(record?.config ?? latestConfig)));
  return record;
}

function isSupportedSavedConfig(value: unknown) {
  if (!isObject(value)) return false;
  if (typeof value.schemaVersion === "undefined") return true;
  return value.schemaVersion === CONFIG_SCHEMA_VERSION;
}

function slugPart(value: string | null | undefined, fallback: string) {
  return (value || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9ก-ฮะ-์]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || fallback;
}

function timestampForFilename() {
  const date = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function exportFilename(config: ChartConfig, extension: string) {
  const dashboard = slugPart(config.dashboardId, "dashboard-v2");
  const chart = slugPart(config.chartType, "chart");
  return `${dashboard}-${chart}-${timestampForFilename()}.${extension}`;
}

export function normalizeConfig(value: unknown, availableFields = dataFields): ChartConfig {
  const fallback = createDefaultConfig();
  if (!isObject(value)) return fallback;

  const chartType = typeof value.chartType === "string" && chartCatalog.some((chart) => chart.id === value.chartType)
    ? (value.chartType as ChartType)
    : fallback.chartType;

  const settings = isObject(value.settings)
    ? {
        ...defaultChartSettings,
        ...value.settings,
        general: { ...defaultChartSettings.general, ...(isObject(value.settings.general) ? value.settings.general : {}) },
        axis: {
          ...defaultChartSettings.axis,
          ...(isObject(value.settings.axis) ? value.settings.axis : {}),
          xTitle: {
            ...defaultChartSettings.axis.xTitle,
            ...(isObject(value.settings.axis) && isObject(value.settings.axis.xTitle) ? value.settings.axis.xTitle : {}),
          },
          yTitle: {
            ...defaultChartSettings.axis.yTitle,
            ...(isObject(value.settings.axis) && isObject(value.settings.axis.yTitle) ? value.settings.axis.yTitle : {}),
          },
        },
        labels: { ...defaultChartSettings.labels, ...(isObject(value.settings.labels) ? value.settings.labels : {}) },
        legend: { ...defaultChartSettings.legend, ...(isObject(value.settings.legend) ? value.settings.legend : {}) },
        colors: { ...defaultChartSettings.colors, ...(isObject(value.settings.colors) ? value.settings.colors : {}) },
        grid: { ...defaultChartSettings.grid, ...(isObject(value.settings.grid) ? value.settings.grid : {}) },
        tooltip: { ...defaultChartSettings.tooltip, ...(isObject(value.settings.tooltip) ? value.settings.tooltip : {}) },
        animation: { ...defaultChartSettings.animation, ...(isObject(value.settings.animation) ? value.settings.animation : {}) },
      }
    : fallback.settings;

  const savedMappings = savedMappingsFrom(value);
  const mappings = savedMappings.length
    ? fallback.mappings.map((fallbackSlot) => {
        const savedSlot = savedMappings.find(
          (slot): slot is Record<string, unknown> => isObject(slot) && slot.id === fallbackSlot.id
        );
        if (!savedSlot) return fallbackSlot;
        return {
          ...fallbackSlot,
          fields: resolveSavedFields(savedSlot, fallbackSlot.fields, availableFields),
          aggregation: typeof savedSlot.aggregation === "string" ? (savedSlot.aggregation as Aggregation) : fallbackSlot.aggregation,
        };
      })
    : fallback.mappings;

  const filters = isObject(value.filters) ? (value.filters as Record<string, FilterValue>) : fallback.filters;

  return {
    chartType,
    mappings,
    settings: settings as ChartSettings,
    filters,
    sort: typeof value.sort === "string" ? (value.sort as ChartConfig["sort"]) : fallback.sort,
    textElements: Array.isArray(value.textElements) ? value.textElements.filter((item): item is string => typeof item === "string") : [],
    imageName: typeof value.imageName === "string" ? value.imageName : null,
    dashboardId: typeof value.dashboardId === "string" ? value.dashboardId : fallback.dashboardId,
    chartId: typeof value.chartId === "string" ? value.chartId : fallback.chartId,
    sourceType: value.sourceType === "api" || value.sourceType === "dataset" || value.sourceType === "demo" || value.sourceType === "demo-sql" ? value.sourceType : fallback.sourceType,
    datasetId: typeof value.datasetId === "string" ? value.datasetId : fallback.datasetId,
    schemaVersion: typeof value.schemaVersion === "number" ? value.schemaVersion : CONFIG_SCHEMA_VERSION,
    version: typeof value.version === "number" ? value.version : fallback.version,
    createdAt: typeof value.createdAt === "string" ? value.createdAt : fallback.createdAt,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : new Date().toISOString(),
  };
}

function loadStoredConfigValue() {
  const saved = safeGetLocalStorageValue(STORAGE_KEY);
  if (!saved) return null;
  try {
    return JSON.parse(saved) as unknown;
  } catch {
    return null;
  }
}

function createSqlDatasource(result: SqlQueryResult | null): DemoDatasource {
  return {
    ...DEMO_SQL_DATASOURCE,
    rowCount: result?.rowCount ?? 0,
    fieldCount: result?.fields.length ?? 0,
    lastUpdated: result ? "เมื่อสักครู่" : DEMO_SQL_DATASOURCE.lastUpdated,
  };
}

function loadSavedSqlQueries(): SqlSavedQuery[] {
  const saved = safeGetLocalStorageValue(SQL_SAVED_QUERIES_KEY);
  if (!saved) return defaultSavedSqlQueries;

  try {
    const parsed = JSON.parse(saved) as unknown;
    if (!Array.isArray(parsed)) return defaultSavedSqlQueries;
    const queries = parsed.filter((item): item is SqlSavedQuery =>
      isObject(item) &&
      typeof item.id === "string" &&
      typeof item.name === "string" &&
      typeof item.description === "string" &&
      typeof item.sql === "string" &&
      typeof item.createdAt === "string" &&
      typeof item.updatedAt === "string" &&
      !containsSqlCredentialMaterial(item.sql)
    );
    return queries.length ? queries : defaultSavedSqlQueries;
  } catch {
    return defaultSavedSqlQueries;
  }
}

function loadInitialDesignerSnapshot(chartId?: string | null) {
  const savedChart = chartId ? getSavedChartById(chartId) : null;
  const parsed = savedChart?.config ?? loadStoredConfigValue();
  if (!parsed || !isSupportedSavedConfig(parsed)) {
    return {
      config: createDefaultConfig(),
      rows: getDatasetRows(DEFAULT_DATASET_ID),
      fields: dataFields,
      activeDatasourceId: INITIAL_DATASOURCES[0]?.id ?? "researchdb",
      selectedTable: INITIAL_DATASOURCES[0]?.table ?? DEFAULT_DATASET_ID,
      sqlQuery: sqlExamples[0]?.sql ?? "",
      sqlResult: null as SqlQueryResult | null,
      loadedSavedChartId: null as string | null,
      requestedChartMissing: Boolean(chartId && !savedChart),
    };
  }

  const sqlQuery = isObject(parsed) && typeof parsed.sqlQuery === "string"
    ? safeSqlForPersistence(parsed.sqlQuery)
    : sqlExamples[0]?.sql ?? "";
  const persistedContract = isObject(savedChart?.dataContract) ? savedChart.dataContract : null;
  const persistedSqlRows = Array.isArray(persistedContract?.rows) ? persistedContract.rows : [];
  const persistedSqlFields = Array.isArray(persistedContract?.fields) ? persistedContract.fields : [];
  const persistedSqlResult: SqlQueryResult | null = persistedContract?.sourceType === "sql-result"
    ? {
        sql: typeof persistedContract.queryText === "string" ? persistedContract.queryText : sqlQuery,
        rows: persistedSqlRows as SqlQueryResult["rows"],
        previewRows: persistedSqlRows.slice(0, 100) as SqlQueryResult["rows"],
        fields: persistedSqlFields as DataField[],
        columns: persistedSqlFields.map((field: unknown) => String((field as { id?: string }).id ?? "")).filter(Boolean),
        rowCount: persistedSqlRows.length,
        executionMs: 0,
      }
    : null;
  const sqlExecution =
    !persistedSqlResult && isObject(parsed) && parsed.sourceType === "demo-sql" && sqlQuery
      ? runDemoSqlQuery(sqlQuery, getDatasetRows(DEFAULT_DATASET_ID), dataFields)
      : null;
  const sqlResult = persistedSqlResult ?? (sqlExecution?.ok ? sqlExecution.result : null);
  const requestedDatasetId = isObject(parsed) && typeof parsed.datasetId === "string" ? parsed.datasetId : DEFAULT_DATASET_ID;
  const savedDatasetSchema = isObject(parsed) && parsed.sourceType === "dataset"
    ? getDatasetSchema(requestedDatasetId)
    : null;
  const activeFields = sqlResult
    ? sqlResult.fields
    : savedDatasetSchema?.available
      ? savedDatasetSchema.fields
      : dataFields;
  const normalizedConfig = normalizeConfig(parsed, activeFields);
  const config = savedChart ? { ...normalizedConfig, chartId: savedChart.id } : normalizedConfig;
  const sqlActive = config.sourceType === "demo-sql" && Boolean(sqlResult);

  if (sqlActive && sqlResult) {
    return {
      config,
      rows: sqlResult.rows as DemoDatasetRow[],
      fields: sqlResult.fields,
      activeDatasourceId: SQL_DATASOURCE_ID,
      selectedTable: SQL_TABLE_NAME,
      sqlQuery,
      sqlResult,
      loadedSavedChartId: savedChart?.id ?? null,
      requestedChartMissing: Boolean(chartId && !savedChart),
    };
  }

  if (config.sourceType === "dataset") {
    const datasetSchema = getDatasetSchema(config.datasetId);
    return {
      config,
      rows: datasetSchema.available ? getDatasetRows(config.datasetId) : [],
      fields: datasetSchema.available ? datasetSchema.fields : [],
      activeDatasourceId: config.datasetId,
      selectedTable: config.datasetId,
      sqlQuery,
      sqlResult,
      loadedSavedChartId: savedChart?.id ?? null,
      requestedChartMissing: Boolean(chartId && !savedChart),
    };
  }

  return {
    config: config.sourceType === "demo-sql" ? { ...config, sourceType: "demo" as const, datasetId: DEFAULT_DATASET_ID } : config,
    rows: getDatasetRows(DEFAULT_DATASET_ID),
    fields: dataFields,
    activeDatasourceId: INITIAL_DATASOURCES[0]?.id ?? "researchdb",
    selectedTable: INITIAL_DATASOURCES[0]?.table ?? DEFAULT_DATASET_ID,
    sqlQuery,
    sqlResult,
    loadedSavedChartId: savedChart?.id ?? null,
    requestedChartMissing: Boolean(chartId && !savedChart),
  };
}

function createFilterValue(field: DataField): FilterValue {
  if (field.type === "number" || field.type === "currency" || field.type === "percentage") return { type: "number", min: "", max: "" };
  if (field.type === "date") return { type: "date", start: "", end: "" };
  return { type: field.type === "boolean" ? "boolean" : "text", values: [] };
}

function formatSavedTime() {
  return new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit" }).format(new Date());
}

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function copyTextToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fall back to execCommand for browsers or embedded previews without Clipboard API access.
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.left = "16px";
  textarea.style.top = "16px";
  textarea.style.width = "1px";
  textarea.style.height = "1px";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";
  document.body.appendChild(textarea);
  textarea.focus({ preventScroll: true });
  textarea.select();
  textarea.setSelectionRange(0, text.length);
  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  } finally {
    textarea.remove();
  }
  if (copied) return true;
  return false;
}

function updateSlot(
  mappings: MappingSlot[],
  slotId: MappingSlotId,
  fields: DataField[],
  aggregation?: Aggregation
) {
  const fallbackSlot = createDefaultConfig().mappings.find((slot) => slot.id === slotId);
  const nextMappings = mappings.map((slot) => (slot.id === slotId ? { ...slot, fields, aggregation: aggregation ?? slot.aggregation } : slot));
  if (nextMappings.some((slot) => slot.id === slotId)) return nextMappings;
  return [...nextMappings, { ...(fallbackSlot ?? { id: slotId, label: slotId, helper: "", fields: [] }), fields, aggregation }];
}

function resolveFields(fieldIds: string[]) {
  return fieldIds
    .map((fieldId) => dataFields.find((field) => field.id === fieldId))
    .filter((field): field is DataField => Boolean(field));
}

function applyMappingPresets(mappings: MappingSlot[], presets: DemoMappingPreset[]) {
  const presetMap = new Map(presets.map((preset) => [preset.slotId, preset]));
  return mappings.map((slot) => {
    const preset = presetMap.get(slot.id);
    if (!preset) return { ...slot, fields: [] };
    return {
      ...slot,
      fields: resolveFields(preset.fieldIds),
      aggregation: preset.aggregation ?? slot.aggregation,
    };
  });
}

function mergeSettingsPatch(settings: ChartSettings, patch: DemoSettingsPatch): ChartSettings {
  return {
    ...settings,
    ...patch,
    general: { ...settings.general, ...(patch.general ?? {}) },
    axis: { ...settings.axis, ...(patch.axis ?? {}) },
    labels: { ...settings.labels, ...(patch.labels ?? {}) },
    legend: { ...settings.legend, ...(patch.legend ?? {}) },
    colors: { ...settings.colors, ...(patch.colors ?? {}) },
    grid: { ...settings.grid, ...(patch.grid ?? {}) },
    tooltip: { ...settings.tooltip, ...(patch.tooltip ?? {}) },
    animation: { ...settings.animation, ...(patch.animation ?? {}) },
  };
}

function applyDemoConfig(
  current: ChartConfig,
  args: {
    chartType: ChartType;
    mappings: DemoMappingPreset[];
    settings: DemoSettingsPatch;
    themeId?: DemoThemeId;
    sort?: ChartConfig["sort"];
  }
) {
  const themedSettings = args.themeId ? applyThemeToSettings(current.settings, args.themeId) : current.settings;
  return {
    ...current,
    chartType: args.chartType,
    mappings: applyMappingPresets(current.mappings, args.mappings),
    settings: mergeSettingsPatch(themedSettings, args.settings),
    filters: {},
    sort: args.sort ?? current.sort,
    sourceType: "demo" as const,
    datasetId: DEFAULT_DATASET_ID,
  };
}

function applyChartTypeDefaults(mappings: MappingSlot[], chartType: ChartType, availableFields = dataFields) {
  const fieldPool = availableFields;
  const numericFields = fieldPool.filter((field) => field.isMeasure && (field.type === "number" || field.type === "currency" || field.type === "percentage"));
  const salesField = fieldPool.find((field) => field.id === "sales") ?? fieldPool.find((field) => /sales|revenue/i.test(field.id) && field.isMeasure) ?? numericFields[0];
  const profitField = fieldPool.find((field) => field.id === "profit") ?? fieldPool.find((field) => /profit|margin/i.test(field.id) && field.isMeasure);
  const costField = fieldPool.find((field) => field.id === "cost") ?? numericFields[1];
  const targetField = fieldPool.find((field) => field.id === "target");
  const monthField = fieldPool.find((field) => field.id === "month") ?? fieldPool.find((field) => field.semanticType === "month") ?? fieldPool.find((field) => field.type === "date");
  const dateField = fieldPool.find((field) => field.id === "date") ?? fieldPool.find((field) => field.type === "date");
  const quantityField = fieldPool.find((field) => field.id === "quantity") ?? fieldPool.find((field) => /quantity|count|customers?/i.test(field.id) && field.isMeasure);
  const categoryField = fieldPool.find((field) => field.id === "category") ?? fieldPool.find((field) => field.isDimension && field.type !== "date");
  const channelField = fieldPool.find((field) => field.id === "channel") ?? fieldPool.find((field) => /channel/i.test(field.id));
  const productField = fieldPool.find((field) => field.id === "product") ?? fieldPool.find((field) => /product/i.test(field.id));
  const sourceField = fieldPool.find((field) => field.id === "source");
  const targetNodeField = fieldPool.find((field) => field.id === "targetNode");
  const flowValueField = fieldPool.find((field) => field.id === "flowValue");
  const openField = fieldPool.find((field) => field.id === "open");
  const highField = fieldPool.find((field) => field.id === "high");
  const lowField = fieldPool.find((field) => field.id === "low");
  const closeField = fieldPool.find((field) => field.id === "close");
  const satisfactionField = fieldPool.find((field) => field.id === "satisfactionScore");

  let nextMappings = mappings;

  if (["bar", "clustered-bar", "column", "grouped-column", "ranking-bar", "top-n-bar"].includes(chartType) && monthField && salesField) {
    nextMappings = updateSlot(nextMappings, "xAxis", [monthField], "None");
    nextMappings = updateSlot(nextMappings, "yAxis", [salesField], "Sum");
    nextMappings = updateSlot(nextMappings, "value", [salesField], "Sum");
  }

  if ((chartType === "scatter" || chartType === "bubble" || chartType === "correlation-scatter") && costField && profitField) {
    nextMappings = updateSlot(nextMappings, "xAxis", [salesField ?? costField].filter(Boolean) as DataField[], "Sum");
    nextMappings = updateSlot(nextMappings, "yAxis", [profitField], "Sum");
    if (quantityField) nextMappings = updateSlot(nextMappings, "size", [quantityField], "Sum");
  }

  if (
    ["stacked-bar", "stacked-column", "100-percent-stacked-bar", "100-percent-stacked-column", "stacked-area", "multi-line", "pivot-table", "matrix-table"].includes(chartType) &&
    categoryField &&
    !nextMappings.find((slot) => slot.id === "legend")?.fields.length
  ) {
    nextMappings = updateSlot(nextMappings, "legend", [categoryField], "None");
  }

  if (["stacked-bar", "stacked-column", "100-percent-stacked-bar", "100-percent-stacked-column"].includes(chartType) && monthField && salesField && categoryField) {
    nextMappings = updateSlot(nextMappings, "xAxis", [monthField], "None");
    nextMappings = updateSlot(nextMappings, "yAxis", [salesField], "Sum");
    nextMappings = updateSlot(nextMappings, "value", [salesField], "Sum");
    nextMappings = updateSlot(nextMappings, "legend", [categoryField], "None");
  }

  if (["line", "multi-line", "area", "stacked-area", "combo-bar-line", "time-series-line", "sparkline", "kpi-trend"].includes(chartType) && monthField && salesField) {
    nextMappings = updateSlot(nextMappings, "xAxis", [monthField], "None");
    nextMappings = updateSlot(nextMappings, "yAxis", [salesField], "Sum");
  }

  if (["pie", "donut", "treemap", "funnel"].includes(chartType) && categoryField && salesField) {
    const hasDimension = nextMappings.find((slot) => slot.id === "legend")?.fields.length || nextMappings.find((slot) => slot.id === "xAxis")?.fields.length;
    if (!hasDimension) nextMappings = updateSlot(nextMappings, "legend", [categoryField], "None");
    nextMappings = updateSlot(nextMappings, "category", [categoryField], "None");
    nextMappings = updateSlot(nextMappings, "value", [salesField], preferredAggregationFor(salesField));
    if (!nextMappings.find((slot) => slot.id === "yAxis")?.fields.length) {
      nextMappings = updateSlot(nextMappings, "yAxis", [salesField], preferredAggregationFor(salesField));
    }
  }

  if (["kpi-card", "metric-card", "scorecard", "gauge", "progress-ring"].includes(chartType) && salesField) {
    nextMappings = updateSlot(nextMappings, "value", [salesField], "Sum");
    nextMappings = updateSlot(nextMappings, "yAxis", [salesField], "Sum");
    if (targetField) nextMappings = updateSlot(nextMappings, "target", [targetField], "Sum");
  }

  if (chartType === "radar" && categoryField && (satisfactionField ?? salesField)) {
    nextMappings = updateSlot(nextMappings, "xAxis", [categoryField], "None");
    nextMappings = updateSlot(nextMappings, "category", [categoryField], "None");
    nextMappings = updateSlot(nextMappings, "value", [satisfactionField ?? salesField], satisfactionField ? "Average" : "Sum");
    nextMappings = updateSlot(nextMappings, "yAxis", [satisfactionField ?? salesField], satisfactionField ? "Average" : "Sum");
  }

  if (chartType === "waterfall" && monthField && profitField) {
    nextMappings = updateSlot(nextMappings, "xAxis", [monthField], "None");
    nextMappings = updateSlot(nextMappings, "category", [monthField], "None");
    nextMappings = updateSlot(nextMappings, "value", [profitField], "Sum");
    nextMappings = updateSlot(nextMappings, "yAxis", [profitField], "Sum");
  }

  if (chartType === "horizontal-bar" && channelField && salesField) {
    nextMappings = updateSlot(nextMappings, "xAxis", [salesField], "Sum");
    nextMappings = updateSlot(nextMappings, "yAxis", [channelField], "None");
    nextMappings = updateSlot(nextMappings, "category", [channelField], "None");
    nextMappings = updateSlot(nextMappings, "value", [salesField], "Sum");
  }

  if (chartType === "heatmap" && monthField && categoryField && salesField) {
    nextMappings = updateSlot(nextMappings, "xAxis", [monthField], "None");
    nextMappings = updateSlot(nextMappings, "yAxis", [categoryField], "None");
    nextMappings = updateSlot(nextMappings, "value", [salesField], "Sum");
  }

  if (chartType === "sunburst" && categoryField && productField && channelField && salesField) {
    nextMappings = updateSlot(nextMappings, "rows", [channelField, categoryField, productField], "None");
    nextMappings = updateSlot(nextMappings, "value", [salesField], "Sum");
  }

  if ((chartType === "sankey" || chartType === "graph-network") && sourceField && targetNodeField) {
    nextMappings = updateSlot(nextMappings, "source", [sourceField], "None");
    nextMappings = updateSlot(nextMappings, "target", [targetNodeField], "None");
    if (flowValueField) nextMappings = updateSlot(nextMappings, "value", [flowValueField], "Sum");
  }

  if (chartType === "candlestick" && dateField && openField && highField && lowField && closeField) {
    nextMappings = updateSlot(nextMappings, "xAxis", [dateField], "None");
    nextMappings = updateSlot(nextMappings, "open", [openField], "Average");
    nextMappings = updateSlot(nextMappings, "high", [highField], "Max");
    nextMappings = updateSlot(nextMappings, "low", [lowField], "Min");
    nextMappings = updateSlot(nextMappings, "close", [closeField], "Average");
  }

  if (chartType === "boxplot" && categoryField && profitField) {
    nextMappings = updateSlot(nextMappings, "category", [categoryField], "None");
    nextMappings = updateSlot(nextMappings, "xAxis", [categoryField], "None");
    nextMappings = updateSlot(nextMappings, "value", [profitField], "Sum");
  }

  if (chartType === "calendar-heatmap" && dateField && salesField) {
    nextMappings = updateSlot(nextMappings, "xAxis", [dateField], "None");
    nextMappings = updateSlot(nextMappings, "value", [salesField], "Sum");
  }

  if (chartType === "parallel-coordinates" && numericFields.length >= 3) {
    nextMappings = updateSlot(nextMappings, "value", numericFields.slice(0, 5), "Sum");
    nextMappings = updateSlot(nextMappings, "yAxis", numericFields.slice(0, 5), "Sum");
  }

  if (chartType === "combo-bar-line" && monthField && salesField && profitField) {
    nextMappings = updateSlot(nextMappings, "xAxis", [monthField], "None");
    nextMappings = updateSlot(nextMappings, "yAxis", [salesField, profitField], "Sum");
  }

  if ((chartType === "table" || chartType === "pivot-table") && categoryField && salesField) {
    nextMappings = updateSlot(nextMappings, "rows", [monthField, categoryField, channelField].filter(Boolean) as DataField[], "None");
    nextMappings = updateSlot(nextMappings, "columns", [categoryField], "None");
    nextMappings = updateSlot(nextMappings, "value", [salesField], "Sum");
  }

  const currentX = nextMappings.find((slot) => slot.id === "xAxis")?.fields[0];
  const currentY = nextMappings.find((slot) => slot.id === "yAxis")?.fields[0];
  const recommendedX = currentX ?? fieldPool.find((field) => mappingRecommendationFor(field).slotId === "xAxis");
  const recommendedY = currentY ?? fieldPool.find((field) => mappingRecommendationFor(field).slotId === "yAxis");
  if (["pie", "donut"].includes(chartType)) {
    const category = nextMappings.find((slot) => slot.id === "category")?.fields[0] ?? recommendedX;
    const value = nextMappings.find((slot) => slot.id === "value")?.fields[0] ?? recommendedY;
    if (category) nextMappings = updateSlot(nextMappings, "category", [category], "None");
    if (value) nextMappings = updateSlot(nextMappings, "value", [value], preferredAggregationFor(value));
  } else {
    if (!currentX && recommendedX) nextMappings = updateSlot(nextMappings, "xAxis", [recommendedX], "None");
    if (!currentY && recommendedY) nextMappings = updateSlot(nextMappings, "yAxis", [recommendedY], preferredAggregationFor(recommendedY));
  }

  return nextMappings;
}

function downloadCanvas(canvas: HTMLCanvasElement, filename: string) {
  const pngUrl = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.href = pngUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function drawFallbackPreview(element: HTMLElement, filename: string) {
  const rect = element.getBoundingClientRect();
  const width = Math.max(480, Math.round(rect.width));
  const height = Math.max(320, Math.round(rect.height));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas context unavailable");

  context.fillStyle = "#FFFFFF";
  context.fillRect(0, 0, width, height);
  context.strokeStyle = "#ECEFF5";
  context.strokeRect(0, 0, width, height);
  context.fillStyle = "#172033";
  context.font = '500 18px "IBM Plex Sans Thai", sans-serif';

  const lines = (element.innerText || "Dashboard Designer")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 16);

  lines.forEach((line, index) => {
    context.font = index === 0 ? '500 18px "IBM Plex Sans Thai", sans-serif' : '400 13px "IBM Plex Sans Thai", sans-serif';
    context.fillStyle = index === 0 ? "#172033" : "#6B7894";
    context.fillText(line.slice(0, 86), 24, 36 + index * 24);
  });

  downloadCanvas(canvas, filename);
}

function chartTypeUsesLiveECharts(chartType: ChartType | null) {
  return Boolean(chartType && !["table", "summary-table", "matrix-table", "pivot-table", "kpi-card", "metric-card", "scorecard"].includes(chartType));
}

async function downloadElementAsPng(element: HTMLElement, filename: string, requireLiveECharts = false) {
  const echartsDataUrl = getLatestEChartsDataUrl();
  if (echartsDataUrl) {
    downloadDataUrl(echartsDataUrl, filename);
    return true;
  }

  if (requireLiveECharts) return false;

  drawFallbackPreview(element, filename);
  return true;
}

export function useDashboardDesignerState() {
  const location = useLocation();
  const mockMode = isMockMode();
  const workspaceSnapshot = useWorkspaceSelector((snapshot: Parameters<typeof getDatasources>[0]) => snapshot);
  const [remoteDatasources, setRemoteDatasources] = useState<DemoDatasource[]>([]);
  const [externalSchemaCatalog, setExternalSchemaCatalog] = useState<Array<{ schemaName: string; displayName: string; tables: Array<{ name: string; rowCountEstimate?: number }> }>>([]);
  const availableDatasources = useMemo(
    () => (mockMode ? getDatasources(workspaceSnapshot) : remoteDatasources),
    [mockMode, remoteDatasources, workspaceSnapshot],
  );
  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const requestedChartId = queryParams.get("chartId");
  const requestedDatasetId = queryParams.get("datasetId");
  const returnToDashboard = queryParams.get("from") === "dashboard";
  const returnProjectId = queryParams.get("projectId");
  const returnDashboardId = queryParams.get("dashboardId");
  const createMode = queryParams.get("mode") === "create";
  const [resolvedProjectId, setResolvedProjectId] = useState<string | null>(returnProjectId);
  const [initialSnapshot] = useState(() => {
    if (mockMode) return loadInitialDesignerSnapshot(createMode ? null : requestedChartId);
    const apiConfig = createApiDesignerConfig();
    return {
      config: apiConfig,
      rows: [] as DemoDatasetRow[],
      fields: [] as DataField[],
      activeDatasourceId: "",
      selectedTable: "",
      sqlQuery: "",
      sqlResult: null,
      loadedSavedChartId: null,
      requestedChartMissing: false,
    };
  });
  const [config, setConfig] = useState<ChartConfig>(() => initialSnapshot.config);
  const [rows, setRows] = useState<DemoDatasetRow[]>(() => initialSnapshot.rows);
  const [fields, setFields] = useState<DataField[]>(() => initialSnapshot.fields);
  const [selectedTables, setSelectedTables] = useState<DatasetTable[]>([]);
  const [datasetJoins, setDatasetJoins] = useState<DatasetJoin[]>([]);
  const [queryPreview, setQueryPreview] = useState<{ sql: string; durationMs: number } | null>(null);
  const [semanticTypeOverrides, setSemanticTypeOverrides] = useState<Record<string, string>>({});
  const [safeCasts, setSafeCasts] = useState<Record<string, "numeric" | "date" | "text">>({});
  const [calculatedFields, setCalculatedFields] = useState<Array<Record<string, unknown>>>([]);
  const [selectedCategory, setSelectedCategory] = useState<ChartCategory>("all");
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("desktop");
  const [zoom, setZoom] = useState(100);
  const [searchValue, setSearchValue] = useState("");
  const [activeDatasourceId, setActiveDatasourceId] = useState(initialSnapshot.activeDatasourceId);
  const [selectedTable, setSelectedTable] = useState(initialSnapshot.selectedTable);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [focusedSlotId, setFocusedSlotId] = useState<MappingSlotId | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [sqlPanelOpen, setSqlPanelOpen] = useState(false);
  const [sqlQuery, setSqlQuery] = useState(initialSnapshot.sqlQuery);
  const [sqlResult, setSqlResult] = useState<SqlQueryResult | null>(initialSnapshot.sqlResult);
  const [sqlError, setSqlError] = useState<SqlQueryError | null>(null);
  const [savedSqlQueries, setSavedSqlQueries] = useState<SqlSavedQuery[]>(() => loadSavedSqlQueries());
  const [shareOpen, setShareOpen] = useState(false);
  const [shareAccess, setShareAccess] = useState<"private" | "link" | "team">("private");
  const [shareCopyFallback, setShareCopyFallback] = useState<ManualCopyFallback>(null);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(
    initialSnapshot.loadedSavedChartId
      ? "โหลดกราฟสำหรับแก้ไขแล้ว"
      : initialSnapshot.requestedChartMissing
        ? "ไม่พบกราฟที่ต้องการแก้ไข"
        : "โหลดแดชบอร์ดสำเร็จ"
  );
  const [isLoading, setIsLoading] = useState(!mockMode);
  const [datasetError, setDatasetError] = useState<string | null>(null);
  const [historyPast, setHistoryPast] = useState<ChartConfig[]>([]);
  const [historyFuture, setHistoryFuture] = useState<ChartConfig[]>([]);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved" | "failed">("saved");
  const [lastSavedAt, setLastSavedAt] = useState(formatSavedTime());
  const [activeSavedChartId, setActiveSavedChartId] = useState<string | null>(() => initialSnapshot.loadedSavedChartId);
  const [activeChartRevision, setActiveChartRevision] = useState<number | undefined>(undefined);
  const loadedQueryChartIdRef = useRef<string | null>(initialSnapshot.loadedSavedChartId);
  const configRef = useRef(config);
  const pendingPersistenceRef = useRef({ config, sqlQuery, sqlResult, activeSavedChartId });
  const previewRef = useRef<HTMLDivElement | null>(null);
  const previewAbortRef = useRef<AbortController | null>(null);

  const selectedChart = useMemo(
    () => chartCatalog.find((chart) => chart.id === config.chartType),
    [config.chartType]
  );
  const selectedField = useMemo(
    () => fields.find((field) => field.id === selectedFieldId) ?? null,
    [fields, selectedFieldId]
  );

  const transformedData = useMemo(() => transformChartData(rows, config, fields), [rows, config, fields]);
  const datasources = useMemo(
    () => (config.sourceType === "demo-sql" ? [createSqlDatasource(sqlResult), ...availableDatasources] : availableDatasources),
    [availableDatasources, config.sourceType, sqlResult]
  );
  const validation = useMemo(() => validateChartConfig(config), [config]);
  const activeTemplate = useMemo(
    () => demoTemplates.find((template) => template.id === activeTemplateId) ?? null,
    [activeTemplateId]
  );
  const demoInsights = useMemo(
    () => createDemoInsights(transformedData, config, activeTemplate?.insights ?? []),
    [activeTemplate, config, transformedData]
  );

  useEffect(() => {
    configRef.current = config;
    pendingPersistenceRef.current = { config, sqlQuery, sqlResult, activeSavedChartId };
  }, [activeSavedChartId, config, sqlQuery, sqlResult]);

  useEffect(() => {
    if (mockMode) return undefined;
    if (returnProjectId) {
      setResolvedProjectId(returnProjectId);
      return undefined;
    }

    let active = true;
    setIsLoading(true);
    setDatasetError(null);
    getProjects()
      .then((projects) => {
        if (!active) return;
        const preferredProjectId = window.localStorage.getItem(API_ACTIVE_PROJECT_KEY);
        const project = resolveApiActiveProject(projects, preferredProjectId, null);
        if (project) {
          setResolvedProjectId(project.id);
          return;
        }
        setResolvedProjectId(null);
        setRemoteDatasources([]);
        setRows([]);
        setFields([]);
        setSnackbar("ยังไม่มีโปรเจกต์สำหรับสร้างกราฟ");
        setIsLoading(false);
      })
      .catch((error) => {
        if (!active) return;
        setSnackbar(errorMessage(error, "ไม่สามารถโหลดโปรเจกต์จาก API ได้"));
        setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [mockMode, returnProjectId]);

  useEffect(() => {
    if (mockMode) return undefined;
    if (!resolvedProjectId) return undefined;
    let active = true;
    setIsLoading(true);
    listDatasets({ projectId: resolvedProjectId, page: 1, pageSize: 200 })
      .then(async (response) => {
        const items = Array.isArray(response?.items) ? response.items : [];
        if (!active) return;
        const nextDatasources = items.map((item: Record<string, unknown>) => toRemoteDatasource(item));
        setRemoteDatasources(nextDatasources);
        if (!items.length) {
          setRows([]);
          setFields([]);
          setSnackbar("โปรเจกต์นี้ยังไม่มีชุดข้อมูล");
          return;
        }
        if (requestedChartId) return;
        const selectedItem = items.find((item: Record<string, unknown>) => String(item.id) === requestedDatasetId) ?? items[0];
        const selectedDatasource = toRemoteDatasource(selectedItem);
        const [dataset, columnResult] = await Promise.all([
          loadDataset(String(selectedItem.id), { pageSize: 500 }),
          listExternalColumns(selectedDatasource.schema, selectedDatasource.table, resolvedProjectId),
        ]);
        if (!active) return;
        const persisted = persistedMultiTableState(dataset as Record<string, unknown>);
        const tableRef = { schema: selectedDatasource.schema, table: selectedDatasource.table, alias: createTableAlias(selectedDatasource.table, []) };
        const metadataFields = toQualifiedFields(tableRef, columnResult?.items ?? []);
        let nextFields = toDesignerFields(dataset.fields ?? [], `${selectedDatasource.schema}.${selectedDatasource.table}`).map((field) => {
          const metadata = metadataFields.find((item) => item.name.endsWith(`.${field.name}`));
          return metadata ? { ...field, ...metadata, id: field.id, name: field.name, label: metadata.label } : field;
        });
        if (persisted.tables.length) nextFields = applyPersistedFieldSource(nextFields, persisted.tables);
        setRows((dataset.rows ?? []) as DemoDatasetRow[]);
        setFields(nextFields);
        setSelectedTables(persisted.tables.length ? persisted.tables : [tableRef]);
        setDatasetJoins(persisted.joins);
        setSemanticTypeOverrides(persisted.semanticTypeOverrides);
        setSafeCasts(persisted.safeCasts);
        setCalculatedFields(persisted.calculatedFields);
        setQueryPreview(null);
        setActiveDatasourceId(dataset.id);
        setSelectedTable(selectedDatasource.table);
        setConfig((current) => ({
          ...current,
          sourceType: "dataset",
          datasetId: dataset.id,
          settings: current.datasetId
            ? current.settings
            : {
                ...current.settings,
                general: {
                  ...current.settings.general,
                  title: dataset.name || "Live dataset",
                  subtitle: `ข้อมูลจาก ${selectedDatasource.schema}.${selectedDatasource.table}`,
                },
              },
          mappings: current.chartType
            ? applyChartTypeDefaults(current.mappings, current.chartType, nextFields)
            : current.mappings,
        }));
      })
      .catch((error) => {
        if (active) setSnackbar(errorMessage(error, "ไม่สามารถโหลดชุดข้อมูลจาก API ได้"));
        if (active) setDatasetError(errorMessage(error, "ไม่สามารถโหลดชุดข้อมูลจาก API ได้"));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [mockMode, requestedChartId, requestedDatasetId, resolvedProjectId]);

  useEffect(() => {
    if (mockMode) { setExternalSchemaCatalog([]); return undefined; }
    if (!resolvedProjectId) { setExternalSchemaCatalog([]); return undefined; }
    let active = true;
    listExternalSources(resolvedProjectId)
      .then(async (result) => {
        const sources = Array.isArray(result?.items) ? result.items : [];
        const entries = await Promise.all(sources.map(async (source: { schemaName?: unknown; displayName?: unknown }) => {
          const schemaName = String(source.schemaName || "");
          const tables = schemaName ? (await listExternalTables(schemaName, resolvedProjectId))?.items ?? [] : [];
          return { schemaName, displayName: String(source.displayName || schemaName), tables };
        }));
        if (active) setExternalSchemaCatalog(entries.filter((entry) => entry.schemaName));
      })
      .catch(() => { if (active) setExternalSchemaCatalog([]); });
    return () => { active = false; };
  }, [mockMode, resolvedProjectId]);

  useEffect(() => {
    if (!requestedChartId || requestedChartId === loadedQueryChartIdRef.current) return;
    if (!mockMode) {
      loadedQueryChartIdRef.current = requestedChartId;
      setIsLoading(true);
      void getChartById(requestedChartId)
        .then(async (chart) => {
          if (!chart) throw new Error("ไม่พบกราฟที่ต้องการแก้ไข");
          const dataset = chart.datasetId ? await loadDataset(chart.datasetId, { pageSize: 500 }) : null;
          const sourceIdentity = dataset ? datasetSourceIdentity(dataset as Record<string, unknown>) : { schema: "", table: "", context: "dataset" };
          const persisted = dataset ? persistedMultiTableState(dataset as Record<string, unknown>) : null;
          const rawFields = toDesignerFields(dataset?.fields ?? [], sourceIdentity.context);
          const nextFields = persisted?.tables.length ? applyPersistedFieldSource(rawFields, persisted.tables) : rawFields;
          const nextConfig = normalizeConfig({
            ...(chart.config ?? {}),
            chartId: chart.id,
            datasetId: chart.datasetId,
            settings: chart.settings ?? chart.config?.settings,
            mappings: chart.mapping ?? chart.config?.mappings,
          }, nextFields);
          setConfig(nextConfig);
          setRows((dataset?.rows ?? []) as DemoDatasetRow[]);
          setFields(nextFields);
          setSelectedTables(persisted?.tables ?? []);
          setDatasetJoins(persisted?.joins ?? []);
          setSemanticTypeOverrides(persisted?.semanticTypeOverrides ?? {});
          setSafeCasts(persisted?.safeCasts ?? {});
          setCalculatedFields(persisted?.calculatedFields ?? []);
          setActiveDatasourceId(dataset?.id ?? "");
          setSelectedTable(sourceIdentity.table);
          setActiveSavedChartId(chart.id);
          setActiveChartRevision(Number(chart.revision || 0));
          setSaveStatus("saved");
          setLastSavedAt(formatSavedTime());
          setSnackbar("โหลดกราฟสำหรับแก้ไขแล้ว");
        })
        .catch((error) => setSnackbar(errorMessage(error, "ไม่พบกราฟที่ต้องการแก้ไข")))
        .finally(() => setIsLoading(false));
      return;
    }
    const snapshot = loadInitialDesignerSnapshot(requestedChartId);
    if (!snapshot.loadedSavedChartId) {
      setSnackbar("ไม่พบกราฟที่ต้องการแก้ไข");
      loadedQueryChartIdRef.current = requestedChartId;
      return;
    }

    setConfig(snapshot.config);
    setRows(snapshot.rows);
    setFields(snapshot.fields);
    setActiveDatasourceId(snapshot.activeDatasourceId);
    setSelectedTable(snapshot.selectedTable);
    setSqlQuery(snapshot.sqlQuery);
    setSqlResult(snapshot.sqlResult);
    setSqlError(null);
    setActiveTemplateId(null);
    setSelectedFieldId(null);
    setHistoryPast([]);
    setHistoryFuture([]);
    setActiveSavedChartId(snapshot.loadedSavedChartId);
    loadedQueryChartIdRef.current = snapshot.loadedSavedChartId;
    setSaveStatus("saved");
    setLastSavedAt(formatSavedTime());
    setSnackbar("โหลดกราฟสำหรับแก้ไขแล้ว");
  }, [mockMode, requestedChartId, returnDashboardId, returnProjectId]);

  useEffect(() => {
    if (!mockMode) return undefined;
    setSaveStatus("saving");
    const timer = window.setTimeout(() => {
      const record = persistDesignerChartConfig(config, { query: sqlQuery, result: sqlResult }, activeSavedChartId);
      if (record?.id) setActiveSavedChartId(record.id);
      setSaveStatus("saved");
      setLastSavedAt(formatSavedTime());
      const storageMessage = consumeStorageRecoveryMessage();
      if (storageMessage) setSnackbar(storageMessage);
    }, 800);
    return () => window.clearTimeout(timer);
  }, [activeSavedChartId, config, mockMode, sqlQuery, sqlResult]);

  useEffect(() => () => {
    if (!mockMode) return;
    const pending = pendingPersistenceRef.current;
    persistDesignerChartConfig(
      pending.config,
      { query: pending.sqlQuery, result: pending.sqlResult },
      pending.activeSavedChartId,
    );
  }, [mockMode]);

  useEffect(() => {
    const compactQueries = savedSqlQueries
      .filter((query) => !containsSqlCredentialMaterial(query.sql))
      .slice(-20)
      .map((query) => ({
        id: query.id,
        name: query.name,
        description: query.description,
        sql: query.sql,
        createdAt: query.createdAt,
        updatedAt: query.updatedAt,
      }));
    safeSetLocalStorage(SQL_SAVED_QUERIES_KEY, JSON.stringify(compactQueries));
  }, [savedSqlQueries]);

  const showMessage = useCallback((message: string) => {
    setSnackbar(message);
  }, []);

  const closeSnackbar = useCallback(() => {
    setSnackbar(null);
  }, []);

  const updateShareOpen = useCallback((open: boolean) => {
    setShareOpen(open);
    if (!open) setShareCopyFallback(null);
  }, []);

  const commitConfig = useCallback((updater: (current: ChartConfig) => ChartConfig, message?: string) => {
    const current = configRef.current;
    const next = updater(cloneConfig(current));
    next.updatedAt = new Date().toISOString();
    configRef.current = next;
    setConfig(next);
    setHistoryPast((past) => [...past.slice(-39), current]);
    setHistoryFuture([]);
    setSaveStatus("unsaved");
    if (message) setSnackbar(message);
  }, []);

  const activateDemoDataset = useCallback((message = "กลับไปใช้ Demo Dataset แล้ว") => {
    if (!mockMode) {
      setSnackbar("Demo Dataset ถูกปิดในโหมดใช้งานจริง");
      return;
    }
    setRows(getDatasetRows(DEFAULT_DATASET_ID));
    setFields(dataFields);
    setActiveDatasourceId(INITIAL_DATASOURCES[0]?.id ?? "researchdb");
    setSelectedTable(INITIAL_DATASOURCES[0]?.table ?? DEFAULT_DATASET_ID);
    setSelectedFieldId(null);
    setSearchValue("");
    setActiveTemplateId(null);
    commitConfig((current) => {
      const defaultMappings = current.chartType
        ? applyChartTypeDefaults(createDefaultConfig().mappings, current.chartType, dataFields)
        : createDefaultConfig().mappings;
      return {
        ...current,
        sourceType: "demo",
        datasetId: DEFAULT_DATASET_ID,
        mappings: defaultMappings,
        filters: {},
      };
    }, message);
  }, [commitConfig, mockMode]);

  const updateDatasource = useCallback(async (datasourceId: string) => {
    if (datasourceId === SQL_DATASOURCE_ID && sqlResult) {
      setActiveDatasourceId(SQL_DATASOURCE_ID);
      setSelectedTable(SQL_TABLE_NAME);
      return;
    }

    if (config.sourceType === "demo-sql") {
      activateDemoDataset();
      return;
    }

    const datasource = availableDatasources.find((item) => item.id === datasourceId) ?? availableDatasources[0];
    if (!datasource) {
      setSnackbar("ไม่พบชุดข้อมูลที่เลือก");
      return;
    }
    if (!mockMode) {
      try {
        setIsLoading(true);
        setDatasetError(null);
        const [dataset, columnResult] = await Promise.all([
          loadDataset(datasource.id, { pageSize: 500 }),
          listExternalColumns(datasource.schema, datasource.table, resolvedProjectId),
        ]);
        const tableRef = { schema: datasource.schema, table: datasource.table, alias: createTableAlias(datasource.table, []) };
        const metadataFields = toQualifiedFields(tableRef, columnResult?.items ?? []);
        const nextFields = toDesignerFields(dataset.fields ?? [], `${datasource.schema}.${datasource.table}`).map((field) => {
          const metadata = metadataFields.find((item) => item.name.endsWith(`.${field.name}`));
          return metadata ? { ...field, ...metadata, id: field.id, name: field.name, label: metadata.label } : field;
        });
        setRows((dataset.rows ?? []) as DemoDatasetRow[]);
        setFields(nextFields);
        setActiveDatasourceId(dataset.id);
        setSelectedTable(datasource.table);
        setSelectedFieldId(null);
        setSearchValue("");
        setActiveTemplateId(null);
        commitConfig((current) => ({
          ...current,
          sourceType: "dataset",
          datasetId: dataset.id,
          settings: {
            ...current.settings,
            general: {
              ...current.settings.general,
              title: `${datasource.schema}.${datasource.table}`,
              subtitle: `ข้อมูลจาก ${datasource.schema}.${datasource.table}`,
            },
          },
          mappings: applyChartTypeDefaults(current.mappings.map((slot) => ({
            ...slot,
            fields: remapFieldsToDatasource(slot.fields, nextFields),
          })), current.chartType ?? "bar", nextFields),
          filters: {},
        }));
      } catch (error) {
        const message = errorMessage(error, "ไม่สามารถโหลดชุดข้อมูลได้");
        setSnackbar(message);
        setDatasetError(message);
      } finally {
        setIsLoading(false);
      }
      return;
    }
    const schema = getDatasetSchema(datasource.id, workspaceSnapshot);
    if (!schema.available) {
      setRows([]);
      setFields([]);
      setSnackbar(schema.message ?? "ชุดข้อมูลนี้ไม่พร้อมใช้งาน");
      return;
    }
    setActiveDatasourceId(datasource?.id ?? "researchdb");
    setSelectedTable(datasource?.table ?? DEFAULT_DATASET_ID);
    setRows(getDatasetRows(schema.datasetId, workspaceSnapshot));
    setFields(schema.fields);
    setSelectedFieldId(null);
    setSearchValue("");
    setActiveTemplateId(null);
    commitConfig((current) => ({
      ...current,
      sourceType: "dataset",
      datasetId: schema.datasetId,
      mappings: current.mappings.map((slot) => ({
        ...slot,
        fields: remapFieldsToDatasource(slot.fields, schema.fields),
      })),
      filters: {},
    }));
  }, [activateDemoDataset, availableDatasources, commitConfig, config.sourceType, mockMode, resolvedProjectId, sqlResult, workspaceSnapshot]);

  const materializeMultiTable = useCallback(async (
    tables: DatasetTable[],
    joins: DatasetJoin[],
    nextFields: DataField[],
    overrides = semanticTypeOverrides,
    casts = safeCasts,
    calculations = calculatedFields,
  ) => {
    if (!resolvedProjectId || !tables.length) return;
    const selectedFields = nextFields.map((field) => ({
      tableAlias: field.sourceAlias,
      column: field.name.includes(".") ? field.name.split(".").at(-1) : field.label.split(".").at(-1),
      alias: `${field.sourceAlias}_${field.label.split(".").at(-1)}`,
      cast: casts[`${field.sourceAlias}.${field.label.split(".").at(-1)}`]
        ? { targetType: casts[`${field.sourceAlias}.${field.label.split(".").at(-1)}`] }
        : undefined,
    }));
    const definition = {
      projectId: resolvedProjectId,
      name: tables.map((table) => table.alias).join(" + "),
      sourceSchema: tables[0].schema,
      baseTable: tables[0].table,
      selectedTables: tables,
      selectedFields,
      joins,
      filters: [],
      groupBy: [],
      aggregations: [],
      sorting: [],
      rowLimit: 500,
      semanticTypeOverrides: overrides,
      calculatedFields: calculations,
      revision: 1,
    };
    previewAbortRef.current?.abort();
    const previewController = new AbortController();
    previewAbortRef.current = previewController;
    const preview = await previewExternalSource({ ...definition, pageSize: 500 }, { signal: previewController.signal });
    const created = await createExternalDataset(definition);
    const [datasetDetail, datasetFields] = await Promise.all([
      getDatasetDetail(String(created.id)),
      getDatasetFields(String(created.id)),
    ]);
    const dataset = { ...created, ...datasetDetail, fields: datasetFields, rows: preview.rows ?? [] };
    const designerFields = toDesignerFields(dataset.fields ?? [], tables.map((table) => `${table.schema}.${table.table}`).join(", "));
    setRows((preview.rows ?? dataset.rows ?? []) as DemoDatasetRow[]);
    setFields(designerFields.map((field) => {
      const qualified = nextFields.find((candidate) => `${candidate.sourceAlias}_${candidate.label.split(".").at(-1)}` === field.name);
      return qualified ? { ...field, ...qualified, id: field.id, name: field.name, label: qualified.label } : field;
    }));
    setActiveDatasourceId(String(created.id));
    setSelectedTable(tables[0].table);
    setQueryPreview({ sql: String(preview.sqlPreview || ""), durationMs: Number(preview.queryDurationMs || 0) });
    setRemoteDatasources((current) => current.some((item) => item.id === created.id)
      ? current
      : [...current, toRemoteDatasource({ ...created, ...dataset })]);
    commitConfig((current) => ({
      ...current,
      sourceType: "dataset",
      datasetId: String(created.id),
      mappings: current.mappings.map((slot) => ({
        ...slot,
        fields: slot.fields.flatMap((mapped) => {
          const sourceAlias = mapped.sourceAlias || tables[0]?.alias;
          const sourceColumn = mapped.label.split(".").at(-1) || mapped.name;
          const replacement = designerFields.find((field) => field.name === `${sourceAlias}_${sourceColumn}`);
          return replacement ? [replacement] : [];
        }),
      })),
      filters: {},
      settings: {
        ...current.settings,
        general: {
          ...current.settings.general,
          title: current.settings.general.title || tables.map((table) => table.alias).join(" + "),
          subtitle: `ข้อมูลจาก ${tables.map((table) => `${table.schema}.${table.table}`).join(", ")}`,
        },
      },
    }), `เชื่อม ${tables.length} ตารางและอัปเดต Preview แล้ว`);
  }, [calculatedFields, commitConfig, resolvedProjectId, safeCasts, semanticTypeOverrides]);

  const setManualJoin = useCallback(async (join: DatasetJoin) => {
    const nextJoins = [...datasetJoins.filter((item) => item.right.alias !== join.right.alias), join];
    setDatasetJoins(nextJoins);
    try {
      setIsLoading(true);
      setDatasetError(null);
      await materializeMultiTable(selectedTables, nextJoins, fields);
    } catch (error) {
      const message = errorMessage(error, "เงื่อนไข Join ไม่ถูกต้อง");
      setDatasetError(message);
      setSnackbar(message);
    } finally {
      setIsLoading(false);
    }
  }, [datasetJoins, fields, materializeMultiTable, selectedTables]);

  const removeDatasetTable = useCallback((alias: string) => {
    if (selectedTables[0]?.alias === alias) {
      setSnackbar("ลบ Base Table ไม่ได้ขณะที่ยังมี Field หรือ Join อ้างถึง");
      return;
    }
    const affected = config.mappings.flatMap((slot) => slot.fields).filter((field) => field.sourceAlias === alias);
    if (affected.length) {
      setSnackbar(`ลบไม่ได้: ${affected.length} Mapping ยังอ้างถึงตาราง ${alias}`);
      return;
    }
    setSelectedTables((current) => current.filter((table) => table.alias !== alias));
    setDatasetJoins((current) => current.filter((join) => join.left.alias !== alias && join.right.alias !== alias));
    setFields((current) => current.filter((field) => field.sourceAlias !== alias));
    setSnackbar(`ลบตาราง ${alias} แล้ว`);
  }, [config.mappings, selectedTables]);

  const updateSemanticType = useCallback(async (fieldId: string, semanticType: string) => {
    const field = fields.find((item) => item.id === fieldId);
    if (!field) return;
    const key = `${field.sourceAlias}.${field.label.split(".").at(-1)}`;
    const nextOverrides = { ...semanticTypeOverrides, [key]: semanticType };
    const nextFields = fields.map((item) => item.id === fieldId ? { ...item, semanticType: semanticType as DataField["semanticType"] } : item);
    setSemanticTypeOverrides(nextOverrides);
    setFields(nextFields);
    setSaveStatus("unsaved");
    setSnackbar(`ตั้ง Semantic Type ของ ${field.label} เป็น ${semanticType}`);
    if (selectedTables.length > 1 && datasetJoins.length >= selectedTables.length - 1) {
      try {
        setIsLoading(true);
        await materializeMultiTable(selectedTables, datasetJoins, nextFields, nextOverrides);
      } catch (error) {
        const message = errorMessage(error, "ไม่สามารถบันทึก Semantic Type ได้");
        setDatasetError(message);
        setSnackbar(message);
      } finally {
        setIsLoading(false);
      }
    }
  }, [datasetJoins, fields, materializeMultiTable, selectedTables, semanticTypeOverrides]);

  const updateSafeCast = useCallback(async (fieldId: string, targetType: string) => {
    const field = fields.find((item) => item.id === fieldId);
    if (!field) return;
    const key = `${field.sourceAlias}.${field.label.split(".").at(-1)}`;
    const next = { ...safeCasts };
    if (targetType === "none") delete next[key];
    else next[key] = targetType as "numeric" | "date" | "text";
    setSafeCasts(next);
    if (selectedTables.length > 1 && datasetJoins.length >= selectedTables.length - 1) {
      try {
        setIsLoading(true);
        await materializeMultiTable(selectedTables, datasetJoins, fields, semanticTypeOverrides, next);
        setSnackbar(`ตรวจสอบ Safe Cast ของ ${field.label} แล้ว`);
      } catch (error) {
        const message = errorMessage(error, `ค่าบางรายการใน ${field.label} ไม่สามารถแปลงชนิดได้`);
        setDatasetError(message);
        setSnackbar(message);
      } finally {
        setIsLoading(false);
      }
    }
  }, [datasetJoins, fields, materializeMultiTable, safeCasts, selectedTables, semanticTypeOverrides]);

  const addCalculatedField = useCallback(async (calculated: Record<string, unknown>) => {
    const next = [...calculatedFields, calculated];
    try {
      setIsLoading(true);
      setDatasetError(null);
      await materializeMultiTable(selectedTables, datasetJoins, fields, semanticTypeOverrides, safeCasts, next);
      setCalculatedFields(next);
      setSnackbar(`เพิ่ม Calculated Field ${String(calculated.name || "")} แล้ว`);
    } catch (error) {
      const message = errorMessage(error, "Calculated Field ไม่ผ่านการตรวจสอบ");
      setDatasetError(message);
      setSnackbar(message);
    } finally {
      setIsLoading(false);
    }
  }, [calculatedFields, datasetJoins, fields, materializeMultiTable, safeCasts, selectedTables, semanticTypeOverrides]);

  const activateCatalogTable = useCallback(async (schemaName: string, tableName: string) => {
    const alreadySelected = selectedTables.some((table) => table.schema === schemaName && table.table === tableName);
    if (alreadySelected) {
      setSelectedTable(tableName);
      return;
    }
    if (selectedTables.length >= 6) {
      setSnackbar("หนึ่ง Dataset ใช้ได้สูงสุด 6 ตาราง");
      return;
    }
    if (!mockMode && selectedTables.length) {
      try {
        setIsLoading(true);
        setDatasetError(null);
        const alias = createTableAlias(tableName, selectedTables.map((table) => table.alias));
        const nextTable: DatasetTable = { schema: schemaName, table: tableName, alias };
        const [columnResult, relationResults] = await Promise.all([
          listExternalColumns(schemaName, tableName, resolvedProjectId),
          Promise.all(selectedTables.map((table) => listExternalRelationships(table.schema, table.table, resolvedProjectId, tableName))),
        ]);
        const newFields = toQualifiedFields(nextTable, columnResult?.items ?? []);
        const candidates = relationResults.flatMap((result, index) =>
          (result?.items ?? []).map((relation: Parameters<typeof relationToJoin>[2]) =>
            relationToJoin(selectedTables[index], nextTable, relation)).filter(Boolean)) as DatasetJoin[];
        const nextTables = [...selectedTables, nextTable];
        const nextFields = [...fields, ...newFields];
        const pathCandidates = candidates.length ? [] : relationResults.flatMap((result, index) => {
          const paths = Array.isArray(result?.paths) ? result.paths : [];
          return paths.map((path: Array<Parameters<typeof relationToJoin>[2]>) => ({ start: selectedTables[index], path }));
        });
        setSelectedTables(nextTables);
        setFields(nextFields);
        setSelectedTable(tableName);
        if (candidates.length === 1) {
          const nextJoins = [...datasetJoins, candidates[0]];
          setDatasetJoins(nextJoins);
          await materializeMultiTable(nextTables, nextJoins, nextFields);
        } else if (pathCandidates.length === 1) {
          const path = pathCandidates[0];
          const aliases = nextTables.map((table) => table.alias);
          let currentTable = path.start;
          const pathTables: DatasetTable[] = [];
          const pathJoins: DatasetJoin[] = [];
          const pathFields: DataField[] = [];
          for (const relation of path.path) {
            const isTarget = relation.referencedTable === tableName && relation.referencedSchema === schemaName;
            const pathTable: DatasetTable = isTarget
              ? nextTable
              : { schema: relation.referencedSchema, table: relation.referencedTable, alias: createTableAlias(relation.referencedTable, aliases) };
            if (!isTarget) aliases.push(pathTable.alias);
            const join = relationToJoin(currentTable, pathTable, relation);
            if (!join) throw new Error("ไม่สามารถสร้าง Join path จาก Foreign Key metadata ได้");
            pathJoins.push(join);
            if (!isTarget) {
              const pathColumns = await listExternalColumns(pathTable.schema, pathTable.table, resolvedProjectId);
              pathTables.push(pathTable);
              pathFields.push(...toQualifiedFields(pathTable, pathColumns?.items ?? []));
            }
            currentTable = pathTable;
          }
          const tablesWithPath = [...selectedTables, ...pathTables, nextTable];
          const fieldsWithPath = [...fields, ...pathFields, ...newFields];
          const joinsWithPath = [...datasetJoins, ...pathJoins];
          setSelectedTables(tablesWithPath);
          setFields(fieldsWithPath);
          setDatasetJoins(joinsWithPath);
          await materializeMultiTable(tablesWithPath, joinsWithPath, fieldsWithPath);
          setSnackbar(`เชื่อม ${tableName} ผ่าน Foreign Key path ${path.path.map((item: Parameters<typeof relationToJoin>[2]) => item.name).join(" → ")}`);
        } else {
          setSnackbar(candidates.length > 1
            ? `พบหลายความสัมพันธ์สำหรับ ${alias} กรุณาเลือก Join`
            : `ไม่พบ Foreign Key สำหรับ ${alias} กรุณากำหนด Manual Join`);
        }
      } catch (error) {
        const message = errorMessage(error, "ไม่สามารถเพิ่มตารางได้");
        setDatasetError(message);
        setSnackbar(message);
      } finally {
        setIsLoading(false);
      }
      return;
    }
    const existing = availableDatasources.find((item) => item.schema === schemaName && item.table === tableName);
    if (existing) {
      await updateDatasource(existing.id);
      return;
    }
    if (mockMode) {
      setSnackbar("ตารางนี้ไม่มีใน Demo Dataset");
      return;
    }
    if (!resolvedProjectId) {
      setSnackbar("ไม่พบโปรเจกต์สำหรับเปิดตาราง");
      return;
    }
    try {
      setIsLoading(true);
      setDatasetError(null);
      const created = await createExternalDataset({
        projectId: resolvedProjectId,
        name: `${schemaName}.${tableName}`,
        schemaName,
        tableName,
      });
      const [dataset, columnResult] = await Promise.all([
        loadDataset(String(created.id), { pageSize: 500 }),
        listExternalColumns(schemaName, tableName, resolvedProjectId),
      ]);
      const datasource = toRemoteDatasource({ ...created, ...dataset });
      const tableRef = { schema: schemaName, table: tableName, alias: createTableAlias(tableName, []) };
      const metadataFields = toQualifiedFields(tableRef, columnResult?.items ?? []);
      const nextFields = toDesignerFields(dataset.fields ?? [], `${schemaName}.${tableName}`).map((field) => {
        const metadata = metadataFields.find((item) => item.name.endsWith(`.${field.name}`));
        return metadata ? { ...field, ...metadata, id: field.id, name: field.name, label: metadata.label } : field;
      });
      setRemoteDatasources((current) => current.some((item) => item.id === datasource.id) ? current : [...current, datasource]);
      setRows((dataset.rows ?? []) as DemoDatasetRow[]);
      setFields(nextFields);
      setSelectedTables([tableRef]);
      setDatasetJoins([]);
      setQueryPreview(null);
      setActiveDatasourceId(datasource.id);
      setSelectedTable(tableName);
      setSelectedFieldId(null);
      setSearchValue("");
      setActiveTemplateId(null);
      commitConfig((current) => ({
        ...current,
        sourceType: "dataset",
        datasetId: datasource.id,
        settings: {
          ...current.settings,
          general: {
            ...current.settings.general,
            title: `${schemaName}.${tableName}`,
            subtitle: `ข้อมูลจาก ${schemaName}.${tableName}`,
          },
        },
        mappings: applyChartTypeDefaults(current.mappings.map((slot) => ({
          ...slot,
          fields: remapFieldsToDatasource(slot.fields, nextFields),
        })), current.chartType ?? "bar", nextFields),
        filters: {},
      }), `เปลี่ยนตารางเป็น ${schemaName}.${tableName}`);
    } catch (error) {
      const message = errorMessage(error, "ไม่สามารถเปิดตารางนี้ได้");
      setSnackbar(message);
      setDatasetError(message);
    } finally {
      setIsLoading(false);
    }
  }, [availableDatasources, commitConfig, datasetJoins, fields, materializeMultiTable, mockMode, resolvedProjectId, selectedTables, updateDatasource]);

  const executeSqlQuery = useCallback((query: string, message = "รัน SQL Query แล้ว") => {
    if (!mockMode) {
      setSnackbar("Demo SQL ถูกปิดในโหมดใช้งานจริง");
      return false;
    }
    const execution = runDemoSqlQuery(query, getDatasetRows(DEFAULT_DATASET_ID), dataFields);

    if (execution.ok) {
      setSqlResult(execution.result);
      setSqlError(null);
      setSnackbar(message);
      return true;
    }

    setSqlError(execution.error);
    setSnackbar(execution.error.message);
    return false;
  }, [mockMode]);

  const runSqlQuery = useCallback(() => {
    executeSqlQuery(sqlQuery);
  }, [executeSqlQuery, sqlQuery]);

  const loadSqlExample = useCallback((exampleId: string) => {
    const example = sqlExamples.find((item) => item.id === exampleId);
    if (!example) {
      setSnackbar("ไม่พบ SQL Example");
      return;
    }
    setSqlQuery(example.sql);
    setSqlError(null);
    setSnackbar(`โหลด Example: ${example.name}`);
  }, []);

  const formatSqlQuery = useCallback(() => {
    setSqlQuery((current) => formatSql(current));
    setSnackbar("จัดรูปแบบ SQL แล้ว");
  }, []);

  const clearSqlQuery = useCallback(() => {
    setSqlQuery("");
    setSqlError(null);
    setSqlResult(null);
    setSnackbar("ล้าง SQL Query แล้ว");
  }, []);

  const useSqlResultAsDataset = useCallback(() => {
    if (!sqlResult) {
      setSnackbar("ยังไม่มีผลลัพธ์ SQL ให้ใช้งาน");
      return;
    }

    setRows(sqlResult.rows as DemoDatasetRow[]);
    setFields(sqlResult.fields);
    setActiveDatasourceId(SQL_DATASOURCE_ID);
    setSelectedTable(SQL_TABLE_NAME);
    setSelectedFieldId(null);
    setSearchValue("");
    setActiveTemplateId(null);
    commitConfig((current) => ({
      ...current,
      sourceType: "demo-sql",
      datasetId: "sql_result",
      mappings: current.mappings.map((slot) => ({ ...slot, fields: [] })),
      filters: {},
    }), "ใช้ผลลัพธ์ SQL เป็นชุดข้อมูลแล้ว");
  }, [commitConfig, sqlResult]);

  const exportSqlResultCsv = useCallback(() => {
    if (!sqlResult) {
      setSnackbar("ยังไม่มี SQL Result สำหรับส่งออก");
      return;
    }
    const csv = exportRowsToCsv(sqlResult.rows as DemoDatasetRow[], sqlResult.fields);
    downloadFile(`demo-sql-result-${timestampForFilename()}.csv`, csv, "text/csv;charset=utf-8");
    setSnackbar("ส่งออก SQL Result CSV แล้ว");
  }, [sqlResult]);

  const copySqlQuery = useCallback(async () => {
    if (containsSqlCredentialMaterial(sqlQuery)) {
      setSnackbar("ไม่สามารถคัดลอก SQL ที่มี credential material ได้");
      return;
    }
    const copied = await copyTextToClipboard(sqlQuery);
    setSnackbar(copied ? "คัดลอก SQL Query แล้ว" : "คัดลอก SQL Query ไม่สำเร็จ");
  }, [sqlQuery]);

  const saveCurrentSqlQuery = useCallback((name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName || !sqlQuery.trim()) {
      setSnackbar("กรุณาใส่ชื่อและ SQL Query ก่อนบันทึก");
      return;
    }
    if (containsSqlCredentialMaterial(sqlQuery)) {
      setSnackbar("ไม่สามารถบันทึก SQL ที่มี credential material ได้");
      return;
    }
    const now = new Date().toISOString();
    const nextQuery: SqlSavedQuery = {
      id: `custom-${Date.now()}`,
      name: trimmedName,
      description: "Custom SQL query",
      sql: sqlQuery,
      createdAt: now,
      updatedAt: now,
    };
    setSavedSqlQueries((current) => [nextQuery, ...current]);
    setSnackbar("บันทึก Saved Query แล้ว");
  }, [sqlQuery]);

  const loadSavedSqlQuery = useCallback((queryId: string) => {
    const saved = savedSqlQueries.find((item) => item.id === queryId);
    if (!saved) {
      setSnackbar("ไม่พบ Saved Query");
      return;
    }
    setSqlQuery(saved.sql);
    setSqlError(null);
    setSnackbar(`โหลด Saved Query: ${saved.name}`);
  }, [savedSqlQueries]);

  const renameSavedSqlQuery = useCallback((queryId: string, name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setSnackbar("ชื่อ Saved Query ต้องไม่ว่าง");
      return;
    }
    setSavedSqlQueries((current) =>
      current.map((item) => (item.id === queryId ? { ...item, name: trimmedName, updatedAt: new Date().toISOString() } : item))
    );
    setSnackbar("เปลี่ยนชื่อ Saved Query แล้ว");
  }, []);

  const deleteSavedSqlQuery = useCallback((queryId: string) => {
    setSavedSqlQueries((current) => current.filter((item) => item.id !== queryId));
    setSnackbar("ลบ Saved Query แล้ว");
  }, []);

  const runSavedSqlQuery = useCallback((queryId: string) => {
    const saved = savedSqlQueries.find((item) => item.id === queryId);
    if (!saved) {
      setSnackbar("ไม่พบ Saved Query");
      return;
    }
    setSqlQuery(saved.sql);
    executeSqlQuery(saved.sql, `รัน Saved Query: ${saved.name}`);
  }, [executeSqlQuery, savedSqlQueries]);

  const selectChart = useCallback((chartId: ChartType) => {
    const definition = getChartDefinition(chartId);
    if (!definition?.enabled) {
      setSnackbar(definition?.disabledReason ?? "กราฟนี้ยังไม่พร้อมใช้งาน");
      return;
    }
    commitConfig((current) => {
      let mappings = applyChartTypeDefaults(current.mappings, chartId, fields);
      if (chartId === "pie" || chartId === "donut") {
        const category = current.mappings.find((item) => item.id === "category")?.fields[0]
          ?? current.mappings.find((item) => item.id === "xAxis")?.fields[0];
        const valueSlot = current.mappings.find((item) => item.id === "value");
        const ySlot = current.mappings.find((item) => item.id === "yAxis");
        const value = valueSlot?.fields[0] ?? ySlot?.fields[0];
        if (category) mappings = updateSlot(mappings, "category", [category], "None");
        if (value) mappings = updateSlot(mappings, "value", [value], valueSlot?.fields.length ? valueSlot.aggregation : ySlot?.aggregation);
      } else {
        mappings = mappings.map((mapping) => {
          const existing = current.mappings.find((item) => item.id === mapping.id);
          if (!existing?.fields.length || !existing.fields.every((field) => validateFieldForSlot(mapping.id, field, chartId))) return mapping;
          return { ...mapping, fields: existing.fields, aggregation: existing.aggregation };
        });
      }
      return { ...current, chartType: chartId, mappings };
    }, "เปลี่ยนประเภทกราฟแล้ว");
    setActiveTemplateId(null);
  }, [commitConfig, fields]);

  const updateZoom = useCallback((nextZoom: number) => {
    setZoom(clamp(nextZoom, 50, 160));
  }, []);

  const updateSettings = useCallback(<K extends keyof ChartSettings>(section: K, patch: Partial<ChartSettings[K]>) => {
    commitConfig((current) => ({
      ...current,
      settings: {
        ...current.settings,
        [section]: {
          ...current.settings[section],
          ...patch,
        },
      },
    }));
  }, [commitConfig]);

  const replaceConfig = useCallback((nextConfig: ChartConfig, message = "นำเข้า config แล้ว") => {
    commitConfig(() => normalizeConfig(nextConfig, fields), message);
  }, [commitConfig, fields]);

  const resetConfig = useCallback(() => {
    if (!mockMode) {
      setSelectedFieldId(null);
      setActiveSavedChartId(null);
      loadedQueryChartIdRef.current = null;
      commitConfig((current) => {
        const clean = createApiDesignerConfig();
        clean.dashboardId = current.dashboardId;
        clean.chartId = current.chartId;
        clean.chartType = current.chartType;
        clean.sourceType = current.sourceType;
        clean.datasetId = current.datasetId;
        clean.settings.general.subtitle = current.settings.general.subtitle;
        clean.mappings = current.chartType
          ? applyChartTypeDefaults(clean.mappings, current.chartType, fields)
          : clean.mappings;
        return clean;
      }, "รีเซ็ตการตั้งค่ากราฟแล้ว");
      setActiveTemplateId(null);
      return;
    }
    setRows(getDatasetRows(DEFAULT_DATASET_ID));
    setFields(dataFields);
    setActiveDatasourceId(INITIAL_DATASOURCES[0]?.id ?? "researchdb");
    setSelectedTable(INITIAL_DATASOURCES[0]?.table ?? DEFAULT_DATASET_ID);
    setSelectedFieldId(null);
    setActiveSavedChartId(null);
    loadedQueryChartIdRef.current = null;
    commitConfig(() => createDefaultConfig(), "รีเซ็ตการตั้งค่ากราฟแล้ว");
    setActiveTemplateId(null);
  }, [commitConfig, fields, mockMode]);

  const applyDemoTemplate = useCallback((templateId: DemoTemplate["id"]) => {
    const template = demoTemplates.find((item) => item.id === templateId);
    if (!template) {
      setSnackbar("ไม่พบ Template ที่เลือก");
      return;
    }
    if (!mockMode) {
      commitConfig((current) => ({
        ...current,
        chartType: template.chartType,
        settings: mergeSettingsPatch(applyThemeToSettings(current.settings, template.themeId), template.settings),
        mappings: applyChartTypeDefaults(current.mappings, template.chartType, fields),
        sort: template.sort ?? current.sort,
      }), `ใช้ Template: ${template.name}`);
      setActiveTemplateId(template.id);
      return;
    }
    if (config.sourceType === "demo-sql") {
      setRows(getDatasetRows(DEFAULT_DATASET_ID));
      setFields(dataFields);
      setActiveDatasourceId(INITIAL_DATASOURCES[0]?.id ?? "researchdb");
      setSelectedTable(INITIAL_DATASOURCES[0]?.table ?? DEFAULT_DATASET_ID);
      setSelectedFieldId(null);
    }

    commitConfig(
      (current) =>
        applyDemoConfig(current, {
          chartType: template.chartType,
          mappings: template.mappings,
          settings: template.settings,
          themeId: template.themeId,
          sort: template.sort,
        }),
      `ใช้ Template: ${template.name}`
    );
    setActiveTemplateId(template.id);
  }, [commitConfig, config.sourceType, fields, mockMode]);

  const applyChartPreset = useCallback((presetId: ChartPreset["id"]) => {
    const preset = chartPresets.find((item) => item.id === presetId);
    if (!preset) {
      setSnackbar("ไม่พบ Preset ที่เลือก");
      return;
    }
    if (!mockMode) {
      commitConfig((current) => ({
        ...current,
        chartType: preset.chartType,
        settings: mergeSettingsPatch(
          preset.themeId ? applyThemeToSettings(current.settings, preset.themeId) : current.settings,
          preset.settings,
        ),
        mappings: applyChartTypeDefaults(current.mappings, preset.chartType, fields),
        sort: preset.sort ?? current.sort,
      }), `ใช้ Preset: ${preset.name}`);
      setActiveTemplateId(null);
      return;
    }
    if (config.sourceType === "demo-sql") {
      setRows(getDatasetRows(DEFAULT_DATASET_ID));
      setFields(dataFields);
      setActiveDatasourceId(INITIAL_DATASOURCES[0]?.id ?? "researchdb");
      setSelectedTable(INITIAL_DATASOURCES[0]?.table ?? DEFAULT_DATASET_ID);
      setSelectedFieldId(null);
    }

    commitConfig(
      (current) =>
        applyDemoConfig(current, {
          chartType: preset.chartType,
          mappings: preset.mappings,
          settings: preset.settings,
          themeId: preset.themeId,
          sort: preset.sort,
        }),
      `ใช้ Preset: ${preset.name}`
    );
    setActiveTemplateId(null);
  }, [commitConfig, config.sourceType, fields, mockMode]);

  const applyThemePreset = useCallback((themeId: DemoThemeId) => {
    const theme = demoThemes.find((item) => item.id === themeId);
    if (!theme) {
      setSnackbar("ไม่พบ Theme ที่เลือก");
      return;
    }

    commitConfig((current) => ({
      ...current,
      settings: applyThemeToSettings(current.settings, themeId),
    }), `ใช้ Theme: ${theme.name}`);
  }, [commitConfig]);

  const dropField = useCallback((slotId: MappingSlotId, field: DataField, sourceSlotId?: MappingSlotId) => {
    if (!validateFieldForSlot(slotId, field, config.chartType)) {
      const slotLabel = slotId === "yAxis" ? "Y Axis" : slotId === "xAxis" ? "X Axis" : slotId;
      setSnackbar(`ฟิลด์ \`${field.name}\` จากตาราง ${field.table} เป็นชนิด ${field.type} จึงไม่เหมาะกับ ${slotLabel}`);
      return;
    }

    commitConfig((current) => {
      const singleSlots: MappingSlotId[] = ["xAxis", "legend", "color", "size", "category", "series", "columns", "source", "target", "open", "high", "low", "close"];
      const nextMappings = current.mappings.map((slot) => {
        let nextFields = slot.fields;
        if (sourceSlotId && slot.id === sourceSlotId) {
          nextFields = nextFields.filter((item) => item.id !== field.id);
        }
        if (slot.id === slotId) {
          nextFields = singleSlots.includes(slotId)
            ? [field]
            : nextFields.some((item) => item.id === field.id)
              ? nextFields
              : [...nextFields, field];
        }
        const nextAggregation =
          slot.id === slotId && ["yAxis", "value", "size"].includes(slotId)
            ? preferredAggregationFor(field)
            : slot.aggregation;
        return { ...slot, fields: nextFields, aggregation: nextAggregation };
      });
      const nextFilters = { ...current.filters };
      if (slotId === "filter" && !nextFilters[field.id]) {
        nextFilters[field.id] = createFilterValue(field);
      }
      return { ...current, mappings: nextMappings, filters: nextFilters };
    }, `เพิ่ม ${field.name} ใน ${slotId}`);
    setFocusedSlotId(null);
  }, [commitConfig, config.chartType]);

  const dropFieldOnCanvas = useCallback((item: DragFieldItem) => {
    const targetSlot: MappingSlotId = item.field.type === "number" ? "yAxis" : "xAxis";
    dropField(targetSlot, item.field, item.sourceSlotId);
  }, [dropField]);

  const removeField = useCallback((slotId: MappingSlotId, fieldId: string) => {
    commitConfig((current) => {
      const nextFilters = { ...current.filters };
      if (slotId === "filter") delete nextFilters[fieldId];
      return {
        ...current,
        mappings: current.mappings.map((slot) =>
          slot.id === slotId ? { ...slot, fields: slot.fields.filter((field) => field.id !== fieldId) } : slot
        ),
        filters: nextFilters,
      };
    }, "ลบฟิลด์ออกจาก mapping แล้ว");
  }, [commitConfig]);

  const changeAggregation = useCallback((slotId: MappingSlotId, aggregation: Aggregation) => {
    const target = configRef.current.mappings.find((slot) => slot.id === slotId);
    const invalid = target?.fields
      .map((field) => validateAggregationForField(field, aggregation, slotId))
      .find((result) => !result.valid);
    if (invalid) {
      setSnackbar(invalid.message);
      return;
    }
    commitConfig((current) => ({
      ...current,
      mappings: current.mappings.map((slot) => (slot.id === slotId ? { ...slot, aggregation } : slot)),
    }), `เปลี่ยน Aggregation เป็น ${aggregation}`);
  }, [commitConfig]);

  const changeSort = useCallback((sort: ChartConfig["sort"]) => {
    commitConfig((current) => ({ ...current, sort }), "เปลี่ยนการเรียงข้อมูลแล้ว");
  }, [commitConfig]);

  const updateFilter = useCallback((field: DataField, value: FilterValue) => {
    commitConfig((current) => ({
      ...current,
      filters: {
        ...current.filters,
        [field.id]: value,
      },
    }));
  }, [commitConfig]);

  const sortSlot = useCallback((slotId: MappingSlotId) => {
    commitConfig((current) => ({
      ...current,
      mappings: current.mappings.map((slot) =>
        slot.id === slotId ? { ...slot, fields: [...slot.fields].sort((a, b) => a.name.localeCompare(b.name, "th")) } : slot
      ),
    }), "จัดเรียงฟิลด์แล้ว");
  }, [commitConfig]);

  const undo = useCallback(() => {
    if (!historyPast.length) return;
    const previous = historyPast[historyPast.length - 1];
    setHistoryPast((past) => past.slice(0, -1));
    setHistoryFuture((future) => [config, ...future]);
    setConfig(previous);
    setSaveStatus("unsaved");
    setSnackbar("ย้อนกลับแล้ว");
  }, [config, historyPast]);

  const redo = useCallback(() => {
    if (!historyFuture.length) return;
    const next = historyFuture[0];
    setHistoryFuture((future) => future.slice(1));
    setHistoryPast((past) => [...past, config]);
    setConfig(next);
    setSaveStatus("unsaved");
    setSnackbar("ทำซ้ำแล้ว");
  }, [config, historyFuture]);

  const saveChart = useCallback(async () => {
    if (!mockMode) {
      if (!resolvedProjectId || !config.datasetId) {
        setSnackbar("ต้องเลือกโปรเจกต์และชุดข้อมูลก่อนบันทึก");
        return;
      }
      setSaveStatus("saving");
      try {
        const serialized = serializeChartConfig(config, { query: sqlQuery, result: sqlResult });
        const payload = {
          projectId: resolvedProjectId,
          datasetId: config.datasetId,
          name: config.settings.general.title || "กราฟที่บันทึก",
          title: config.settings.general.title || "กราฟที่บันทึก",
          engine: "echarts",
          mapping: serialized.mappings,
          settings: serialized.settings,
          filters: serialized.filters,
          config: serialized,
          revision: activeChartRevision,
        };
        const saved = activeSavedChartId
          ? await updateChart(activeSavedChartId, payload)
          : await createChart(payload);
        setConfig((current) => {
          const next = { ...current, chartId: saved.id };
          configRef.current = next;
          return next;
        });
        setActiveSavedChartId(saved.id);
        setActiveChartRevision(Number(saved.revision || 0));
        persistChartEditLocation(saved.id);
        setSaveStatus("saved");
        setLastSavedAt(formatSavedTime());
        setSnackbar("บันทึกกราฟลง PostgreSQL แล้ว");
      } catch (error) {
        setSaveStatus("failed");
        setSnackbar(errorStatus(error) === 409
          ? "กราฟถูกแก้ไขจากอีกหน้าต่าง กรุณาโหลดข้อมูลล่าสุด"
          : errorMessage(error, "ไม่สามารถบันทึกกราฟได้"));
      }
      return;
    }
    const record = persistDesignerChartConfig(config, { query: sqlQuery, result: sqlResult }, activeSavedChartId, {
      createIfMissing: true,
    });
    if (record?.id) setActiveSavedChartId(record.id);
    setSaveStatus("saved");
    setLastSavedAt(formatSavedTime());
    setSnackbar(consumeStorageRecoveryMessage() || "บันทึกกราฟแล้ว");
  }, [activeChartRevision, activeSavedChartId, config, mockMode, resolvedProjectId, sqlQuery, sqlResult]);

  const refreshDataset = useCallback(async () => {
    if (config.sourceType === "demo-sql" && sqlQuery.trim()) {
      const execution = runDemoSqlQuery(sqlQuery, getDatasetRows(DEFAULT_DATASET_ID), dataFields);
      if (execution.ok) {
        setSqlResult(execution.result);
        setSqlError(null);
        setRows(execution.result.rows as DemoDatasetRow[]);
        setFields(execution.result.fields);
        setSnackbar("รีเฟรช Demo SQL แล้ว");
        return;
      }
      setSqlError(execution.error);
      setSnackbar(execution.error.message);
      return;
    }
    if (!mockMode) {
      try {
        setDatasetError(null);
        const dataset = await loadDataset(config.datasetId, { pageSize: 500 });
        const nextFields = toDesignerFields(dataset.fields ?? [], dataset.name);
        setRows((dataset.rows ?? []) as DemoDatasetRow[]);
        setFields(nextFields);
        setSnackbar("รีเฟรชข้อมูลจาก PostgreSQL แล้ว");
      } catch (error) {
        const message = errorMessage(error, "ไม่สามารถรีเฟรชชุดข้อมูลได้");
        setSnackbar(message);
        setDatasetError(message);
      }
      return;
    }
    const schema = getDatasetSchema(config.datasetId, workspaceSnapshot);
    setRows(refreshDatasetRows(config.datasetId, workspaceSnapshot));
    if (schema.available) setFields(schema.fields);
    setSnackbar("รีเฟรชข้อมูลแล้ว");
  }, [config.datasetId, config.sourceType, mockMode, sqlQuery, workspaceSnapshot]);

  const addTextElement = useCallback(() => {
    commitConfig((current) => ({
      ...current,
      textElements: [...current.textElements, "ข้อความใหม่"],
    }), "เพิ่มข้อความใน Preview แล้ว");
  }, [commitConfig]);

  const setImageName = useCallback((imageName: string) => {
    commitConfig((current) => ({ ...current, imageName }), "เพิ่มรูปภาพใน Preview แล้ว");
  }, [commitConfig]);

  const focusFilter = useCallback(() => {
    setFocusedSlotId("filter");
    setSnackbar("ลากฟิลด์ลงช่อง Filter เพื่อสร้างตัวกรอง");
  }, []);

  const exportJson = useCallback(() => {
    downloadFile(exportFilename(config, "json"), JSON.stringify(serializeChartConfig(config, { query: sqlQuery, result: sqlResult }), null, 2), "application/json;charset=utf-8");
    setSnackbar("ส่งออก JSON config แล้ว");
  }, [config, sqlQuery, sqlResult]);

  const exportCsv = useCallback(() => {
    const csv = exportRowsToCsv(transformedData.tableRows, transformedData.tableColumns);
    downloadFile(exportFilename(config, "csv"), csv, "text/csv;charset=utf-8");
    setSnackbar("ส่งออก CSV แล้ว");
  }, [config, transformedData]);

  const exportPng = useCallback(async () => {
    if (!previewRef.current) {
      setSnackbar("ไม่พบพื้นที่ Preview สำหรับส่งออก PNG");
      return;
    }
    try {
      const exported = await downloadElementAsPng(previewRef.current, exportFilename(config, "png"), chartTypeUsesLiveECharts(config.chartType));
      if (!exported) {
        setSnackbar("ไม่สามารถส่งออก PNG ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง");
        return;
      }
      setSnackbar("ส่งออก PNG แล้ว");
    } catch {
      setSnackbar("ไม่สามารถส่งออก PNG ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง");
    }
  }, [config]);

  const exportDemoReport = useCallback(() => {
    const report = {
      exportedAt: new Date().toISOString(),
      mode: "Dashboard Designer Demo",
      dashboardId: config.dashboardId,
      chartId: config.chartId,
      chartType: config.chartType,
      title: config.settings.general.title,
      subtitle: config.settings.general.subtitle,
      template: activeTemplate?.name ?? null,
      theme: demoThemes.find((theme) => theme.id === config.settings.general.themePreset)?.name ?? null,
      rows: transformedData.metadata.rowCount,
      filteredRows: transformedData.metadata.filteredRowCount,
      fields: config.mappings.flatMap((slot) => slot.fields.map((field) => ({ slot: slot.id, field: field.id, label: field.name, aggregation: slot.aggregation }))),
      insights: demoInsights,
      config: serializeChartConfig(config, { query: sqlQuery, result: sqlResult }),
    };

    downloadFile(exportFilename(config, "demo-report.json"), JSON.stringify(report, null, 2), "application/json;charset=utf-8");
    setSnackbar("ส่งออก Demo Report แล้ว");
  }, [activeTemplate, config, demoInsights, sqlQuery, sqlResult, transformedData]);

  const copyConfig = useCallback(async () => {
    if (containsSqlCredentialMaterial(sqlQuery)) {
      setSnackbar("ไม่สามารถคัดลอก config ที่มี SQL credential material ได้");
      return;
    }
    const copied = await copyTextToClipboard(JSON.stringify(serializeChartConfig(config, { query: sqlQuery, result: sqlResult }), null, 2));
    setSnackbar(copied ? "คัดลอก config แล้ว" : "คัดลอก config ไม่สำเร็จ");
  }, [config, sqlQuery, sqlResult]);

  const copyShareLink = useCallback(async () => {
    setShareCopyFallback(null);
    setSnackbar("Share ใช้งานได้จากหน้า Dashboard หลังสร้าง Local snapshot แบบอ่านอย่างเดียว");
  }, []);

  const copyShareEmbed = useCallback(async () => {
    setShareCopyFallback(null);
    setSnackbar("Embed ใช้งานได้จากหน้า Dashboard หลังสร้าง Local snapshot แบบอ่านอย่างเดียว");
  }, []);

  const togglePreviewMode = useCallback(() => {
    setPreviewMode((value) => {
      const next = !value;
      setSnackbar(next ? "เข้าสู่ Presentation Mode แล้ว" : "ออกจาก Presentation Mode แล้ว");
      return next;
    });
  }, []);

  return {
    state: {
      config,
      selectedCategory,
      selectedChartId: config.chartType,
      selectedChart,
      deviceMode,
      zoom,
      searchValue,
      activeDatasourceId,
      selectedTable,
      selectedFieldId,
      selectedField,
      focusedSlotId,
      rows,
      fields,
      datasources,
      externalSchemaCatalog,
      selectedTables,
      datasetJoins,
      queryPreview,
      semanticTypeOverrides,
      safeCasts,
      calculatedFields,
      transformedData,
      validation,
      templates: demoTemplates,
      chartPresets,
      demoThemes,
      demoInsights,
      activeTemplateId,
      previewMode,
      shareOpen,
      shareAccess,
      shareCopyFallback,
      sqlPanelOpen,
      sqlQuery,
      sqlResult,
      sqlError,
      sqlExamples,
      savedSqlQueries,
      sqlSourceActive: config.sourceType === "demo-sql",
      snackbar,
      isLoading,
      datasetError,
      canUndo: historyPast.length > 0,
      canRedo: historyFuture.length > 0,
      saveStatus,
      lastSavedAt,
      activeSavedChartId,
      returnToDashboard,
      previewRef,
    },
    actions: {
      setSelectedCategory,
      selectChart,
      setDeviceMode,
      setZoom: updateZoom,
      setSearchValue,
      setActiveDatasourceId: updateDatasource,
      setSelectedTable: activateCatalogTable,
      setSelectedField: (field: DataField) => setSelectedFieldId(field.id),
      setManualJoin,
      removeDatasetTable,
      updateSemanticType,
      updateSafeCast,
      addCalculatedField,
      setPreviewMode,
      togglePreviewMode,
      setShareOpen: updateShareOpen,
      setShareAccess,
      updateSettings,
      changeSort,
      replaceConfig,
      resetConfig,
      applyDemoTemplate,
      applyChartPreset,
      applyThemePreset,
      dropField,
      dropFieldOnCanvas,
      removeField,
      changeAggregation,
      updateFilter,
      sortSlot,
      undo,
      redo,
      saveChart,
      refreshDataset,
      addTextElement,
      setImageName,
      focusFilter,
      setSqlPanelOpen,
      setSqlQuery,
      runSqlQuery,
      loadSqlExample,
      formatSqlQuery,
      clearSqlQuery,
      useSqlResultAsDataset,
      activateDemoDataset,
      exportSqlResultCsv,
      copySqlQuery,
      saveCurrentSqlQuery,
      loadSavedSqlQuery,
      renameSavedSqlQuery,
      deleteSavedSqlQuery,
      runSavedSqlQuery,
      exportJson,
      exportCsv,
      exportPng,
      exportDemoReport,
      copyConfig,
      copyShareLink,
      copyShareEmbed,
      showMessage,
      closeSnackbar,
    },
  };
}

export type DashboardDesignerStateValue = ReturnType<typeof useDashboardDesignerState>;
