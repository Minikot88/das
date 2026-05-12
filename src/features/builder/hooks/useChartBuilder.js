import { useEffect, useMemo, useState } from "react";
import {
  createChart,
  createChartConfig,
  generateVisualSql,
  getChartById,
  getChartTemplates,
  getDataset,
  getDatasetSchema,
  runDatasetSql,
  updateChart,
  validateChartMapping,
} from "../../../api/chartApi";
import { addSavedChartToDashboard } from "../../../api/dashboardApi";
import {
  DEFAULT_SQL_CONNECTION_NAME,
  DEFAULT_SQL_NAMESPACE,
} from "../../../utils/mockSqlEngine";
import { loadBuilderDraft, saveBuilderDraft } from "../../../utils/storage";

const BASE_SETTINGS = {
  title: "",
  showTitle: true,
  subtitle: "",
  aggregation: "sum",
  legendPosition: "bottom",
  showLegend: true,
  showXAxisTitle: true,
  xAxisTitle: "",
  showYAxisTitle: true,
  yAxisTitle: "",
  stacked: false,
  horizontal: false,
  beginAtZero: true,
  showGrid: true,
  palette: "chartjs",
  datasetColors: [],
  backgroundColor: "#ffffff",
  borderColor: "",
  titleColor: "#0f172a",
  axisLabelColor: "#475569",
  lineWidth: 2,
  barBorderRadius: 8,
};

const LEGEND_POSITIONS = new Set(["top", "bottom", "left", "right"]);
const CARTESIAN_FAMILIES = new Set(["bar", "line", "area", "scatter", "bubble", "mixed"]);

function getDefaultTitleForTemplate(template) {
  if (!template) return "Chart";
  const key = `${template.family}:${template.variant}`;
  const lookup = {
    "bar:vertical": "Bar Chart",
    "bar:horizontal": "Horizontal Bar Chart",
    "bar:grouped": "Grouped Bar Chart",
    "bar:stacked": "Stacked Bar Chart",
    "bar:floating": "Floating Bar Chart",
    "pie:pie": "Pie Chart",
    "doughnut:basic": "Doughnut Chart",
    "doughnut:semi": "Doughnut Chart",
    "doughnut:multi-ring": "Doughnut Chart",
    "line:basic": "Line Chart",
    "line:multi": "Line Chart",
    "line:stepped": "Line Chart",
    "line:curved": "Line Chart",
    "line:multi-axis": "Line Chart",
    "area:basic": "Area Chart",
    "area:stacked": "Area Chart",
    "area:filled-line": "Area Chart",
    "polar-area:polar-area": "Polar Area Chart",
    "radar:basic": "Radar Chart",
    "radar:filled": "Radar Chart",
    "radar:multi-dataset": "Radar Chart",
    "scatter:scatter": "Scatter Chart",
    "scatter:multi-series": "Scatter Chart",
    "bubble:bubble": "Bubble Chart",
    "bubble:size-comparison": "Bubble Chart",
    "mixed:bar-line": "Mixed Chart",
    "mixed:stacked-bar-line": "Mixed Chart",
    "mixed:multi-axis": "Mixed Chart",
  };
  return lookup[key] || ({
    bar: "Bar Chart",
    line: "Line Chart",
    area: "Area Chart",
    pie: "Pie Chart",
    doughnut: "Doughnut Chart",
    "polar-area": "Polar Area Chart",
    radar: "Radar Chart",
    scatter: "Scatter Chart",
    bubble: "Bubble Chart",
    mixed: "Mixed Chart",
  }[template.family]) || template.name || "Chart";
}

function sanitizeLegendPosition(position, fallback = "bottom") {
  const value = typeof position === "string" ? position.trim().toLowerCase() : "";
  if (LEGEND_POSITIONS.has(value)) return value;
  return LEGEND_POSITIONS.has(fallback) ? fallback : "bottom";
}

function resolveUnifiedBackground(settings = {}) {
  const fallback = BASE_SETTINGS.backgroundColor;
  const preferred =
    settings.cardBackground ??
    settings.chartCardBackground ??
    settings.chartBackground ??
    settings.backgroundColor;
  if (typeof preferred !== "string") return fallback;
  const trimmed = preferred.trim();
  return trimmed || fallback;
}

function isCartesianTemplate(template) {
  return CARTESIAN_FAMILIES.has(template?.family) && template?.variant !== "floating";
}

function firstMappingValue(mapping = {}, roles = []) {
  for (const role of roles) {
    const value = mapping?.[role];
    if (Array.isArray(value)) {
      const first = value.find(Boolean);
      if (first) return first;
      continue;
    }
    if (value) return value;
  }
  return "";
}

function getAxisTitleFallbacks(template, mapping = {}) {
  if (!isCartesianTemplate(template)) return { xAxisTitle: "", yAxisTitle: "" };

  const horizontal = template?.family === "bar" && (template?.variant === "horizontal" || template?.defaultSettings?.horizontal);
  const categoryField = firstMappingValue(mapping, ["x"]);
  const valueField = firstMappingValue(mapping, ["y", "value", "bar", "line", "measures", "size"]);

  return horizontal
    ? { xAxisTitle: valueField, yAxisTitle: categoryField }
    : { xAxisTitle: categoryField, yAxisTitle: valueField };
}

function resolveAxisTitleSettings(template, settings = {}, mapping = {}) {
  if (!isCartesianTemplate(template)) {
    return {
      showXAxisTitle: false,
      xAxisTitle: "",
      showYAxisTitle: false,
      yAxisTitle: "",
    };
  }

  const fallbacks = getAxisTitleFallbacks(template, mapping);
  const rawXAxisTitle = typeof settings.xAxisTitle === "string" ? settings.xAxisTitle.trim() : "";
  const rawYAxisTitle = typeof settings.yAxisTitle === "string" ? settings.yAxisTitle.trim() : "";
  const xAxisTitle = rawXAxisTitle || fallbacks.xAxisTitle;
  const yAxisTitle = rawYAxisTitle || fallbacks.yAxisTitle;

  return {
    showXAxisTitle: settings.showXAxisTitle ?? Boolean(fallbacks.xAxisTitle),
    xAxisTitle,
    showYAxisTitle: settings.showYAxisTitle ?? Boolean(fallbacks.yAxisTitle),
    yAxisTitle,
  };
}

function createPersistedSettings(template, settings = {}, mapping = {}) {
  const {
    cardBackground,
    chartCardBackground,
    chartBackground,
    ...rest
  } = settings ?? {};
  const trimmedTitle = typeof settings.title === "string" ? settings.title.trim() : "";
  const trimmedSubtitle = typeof settings.subtitle === "string" ? settings.subtitle.trim() : "";
  const axisTitleSettings = resolveAxisTitleSettings(template, settings, mapping);
  return {
    ...rest,
    ...axisTitleSettings,
    title: trimmedTitle || getDefaultTitleForTemplate(template),
    subtitle: trimmedSubtitle,
    legendPosition: sanitizeLegendPosition(settings.legendPosition, template?.defaultSettings?.legendPosition || "bottom"),
    backgroundColor: resolveUnifiedBackground(settings),
  };
}

function createEmptyState() {
  return {
    dataset: null,
    schema: null,
    templates: [],
    selectedTemplateId: "bar-vertical",
    mapping: {},
    settings: { ...BASE_SETTINGS },
    previewConfig: null,
    validation: {
      valid: false,
      errors: [],
      warnings: [],
      requiredRoles: [],
      message: "Select a chart type to begin.",
    },
    queryMode: "visual",
    generatedSql: "",
    customSql: "",
    lastExecutedSql: "",
    queryResult: null,
    querySchema: null,
    queryStatus: "idle",
    queryError: "",
    loading: true,
    saving: false,
    error: "",
  };
}

function createStateSettings(template, savedState = {}) {
  const settings = savedState.settings ?? {};
  const trimmedTitle = typeof settings.title === "string" ? settings.title.trim() : "";
  const trimmedSubtitle = typeof settings.subtitle === "string" ? settings.subtitle.trim() : "";
  const fallbacks = getAxisTitleFallbacks(template, savedState.mapping ?? {});

  return {
    ...BASE_SETTINGS,
    ...template.defaultSettings,
    ...settings,
    title: trimmedTitle || getDefaultTitleForTemplate(template),
    subtitle: trimmedSubtitle,
    legendPosition: sanitizeLegendPosition(settings.legendPosition, template?.defaultSettings?.legendPosition || "bottom"),
    backgroundColor: resolveUnifiedBackground(settings),
    showXAxisTitle: settings.showXAxisTitle ?? Boolean(fallbacks.xAxisTitle),
    xAxisTitle: typeof settings.xAxisTitle === "string" ? settings.xAxisTitle.trim() : "",
    showYAxisTitle: settings.showYAxisTitle ?? Boolean(fallbacks.yAxisTitle),
    yAxisTitle: typeof settings.yAxisTitle === "string" ? settings.yAxisTitle.trim() : "",
  };
}

function getRoleConfig(template, roleKey) {
  return template?.roles?.find((role) => role.key === roleKey) ?? null;
}

function normalizeTemplateState(template, savedState = {}) {
  return {
    mapping: {
      ...template.defaultMapping,
      ...savedState.mapping,
    },
    settings: createStateSettings(template, savedState),
  };
}

function createDraftPayload(builderContext, state) {
  return {
    ...builderContext,
    draft: {
      selectedTemplateId: state.selectedTemplateId,
      mapping: state.mapping,
      settings: state.settings,
      queryMode: state.queryMode,
      customSql: state.customSql,
      lastExecutedSql: state.lastExecutedSql,
    },
    isDirty: true,
    updatedAt: new Date().toISOString(),
  };
}

function getEffectiveSchema(state) {
  if (state.queryMode === "sql" && state.querySchema?.fields?.length) {
    return state.querySchema;
  }
  return state.schema;
}

function getEffectiveRows(state) {
  if (state.queryMode === "sql" && Array.isArray(state.queryResult?.rows)) {
    return state.queryResult.rows;
  }
  return state.dataset?.rows ?? [];
}

function getSqlExplorerDataset(state) {
  if (state.queryMode === "sql" && state.querySchema?.fields?.length) {
    return {
      id: "query_result",
      name: "Query Result",
      rows: state.queryResult?.rows ?? [],
      connectionName: DEFAULT_SQL_CONNECTION_NAME,
      namespace: DEFAULT_SQL_NAMESPACE,
      tableName: "query_result",
      sourceLabel: state.lastExecutedSql ? "SQL result" : "SQL editor",
    };
  }

  return {
    ...(state.dataset ?? {}),
    connectionName: DEFAULT_SQL_CONNECTION_NAME,
    namespace: DEFAULT_SQL_NAMESPACE,
    tableName: state.dataset?.id ?? "dataset",
    sourceLabel: "Base dataset",
  };
}

function createPendingSqlValidation(template) {
  return {
    valid: false,
    errors: ["Run SQL to preview this chart."],
    warnings: [],
    requiredRoles: template?.requiredRoles ?? [],
    message: "Run SQL to preview this chart.",
  };
}

function getChartRows(chart = {}) {
  return Array.isArray(chart.rows)
    ? chart.rows
    : Array.isArray(chart.data)
      ? chart.data
      : Array.isArray(chart.config?.rows)
        ? chart.config.rows
        : Array.isArray(chart.config?.queryResult?.rows)
          ? chart.config.queryResult.rows
          : [];
}

function getChartTemplateId(chart = {}, templates = []) {
  const candidate = chart.templateId ?? chart.config?.meta?.templateId;
  if (candidate && templates.some((template) => template.id === candidate)) return candidate;
  return templates.find((template) => template.type === (chart.type ?? chart.config?.type))?.id ?? templates[0]?.id;
}

function createEditingState(chart, templates, dataset, schema) {
  const templateId = getChartTemplateId(chart, templates);
  const template = templates.find((item) => item.id === templateId) ?? templates[0];
  const queryMode = chart.queryMode ?? chart.config?.queryMode ?? "visual";
  const queryResult = chart.queryResult ?? chart.config?.queryResult ?? null;
  const querySchema = chart.schema ?? chart.querySchema ?? schema;
  const rawTitle =
    chart.settings?.title ??
    chart.settings?.chartTitle ??
    chart.title ??
    chart.chartTitle ??
    chart.config?.options?.plugins?.title?.text ??
    "";
  const rawSubtitle =
    chart.settings?.subtitle ??
    chart.subtitle ??
    chart.config?.options?.plugins?.subtitle?.text ??
    "";
  const rawLegendPosition =
    chart.settings?.legendPosition ??
    chart.config?.options?.plugins?.legend?.position ??
    template?.defaultSettings?.legendPosition ??
    "bottom";
  const rawShowXAxisTitle =
    chart.settings?.showXAxisTitle ??
    chart.config?.options?.scales?.x?.title?.display;
  const rawXAxisTitle =
    chart.settings?.xAxisTitle ??
    chart.config?.options?.scales?.x?.title?.text ??
    "";
  const rawShowYAxisTitle =
    chart.settings?.showYAxisTitle ??
    chart.config?.options?.scales?.y?.title?.display;
  const rawYAxisTitle =
    chart.settings?.yAxisTitle ??
    chart.config?.options?.scales?.y?.title?.text ??
    "";
  const resolvedTitle = typeof rawTitle === "string"
    ? rawTitle.trim()
    : "";
  const defaults = normalizeTemplateState(template, {
    mapping: chart.mapping ?? chart.config?.mapping ?? {},
    settings: {
      ...(chart.settings ?? {}),
      title: resolvedTitle,
      showTitle: chart.settings?.showTitle ?? true,
      subtitle: typeof rawSubtitle === "string" ? rawSubtitle.trim() : "",
      legendPosition: sanitizeLegendPosition(rawLegendPosition, "bottom"),
      showXAxisTitle: rawShowXAxisTitle,
      xAxisTitle: typeof rawXAxisTitle === "string" ? rawXAxisTitle.trim() : "",
      showYAxisTitle: rawShowYAxisTitle,
      yAxisTitle: typeof rawYAxisTitle === "string" ? rawYAxisTitle.trim() : "",
    },
  });

  return {
    dataset: dataset ?? { rows: getChartRows(chart) },
    schema,
    templates,
    selectedTemplateId: template?.id ?? "bar-vertical",
    mapping: defaults.mapping,
    settings: defaults.settings,
    previewConfig: chart.config ?? null,
    validation: {
      valid: false,
      errors: [],
      warnings: [],
      requiredRoles: template?.requiredRoles ?? [],
      message: "Loading saved chart.",
    },
    queryMode,
    generatedSql: chart.generatedSql ?? chart.config?.generatedSql ?? "",
    customSql: chart.customSql ?? chart.config?.customSql ?? chart.generatedSql ?? chart.config?.generatedSql ?? "",
    lastExecutedSql: chart.lastExecutedSql ?? chart.config?.lastExecutedSql ?? "",
    queryResult,
    querySchema: queryMode === "sql" ? querySchema : null,
    queryStatus: queryMode === "sql" && queryResult ? "ready" : "idle",
    queryError: "",
    loading: false,
    saving: false,
    error: "",
    isEditing: true,
    editingChartId: chart.id,
  };
}

function createChartPayload({
  projectId,
  selectedTemplate,
  state,
  effectiveRows,
  effectiveSchema,
}) {
  const persistedSettings = createPersistedSettings(selectedTemplate, state.settings, state.mapping);
  const resolvedTitle = persistedSettings.title;
  return {
    projectId,
    templateId: selectedTemplate.id,
    title: resolvedTitle,
    chartTitle: resolvedTitle,
    name: resolvedTitle,
    mapping: state.mapping,
    settings: persistedSettings,
    rows: effectiveRows,
    schema: effectiveSchema,
    querySchema: effectiveSchema,
    config: state.previewConfig,
    queryMode: state.queryMode,
    generatedSql: state.generatedSql,
    customSql: state.customSql,
    lastExecutedSql: state.lastExecutedSql,
    queryResult: state.queryResult,
  };
}

export default function useChartBuilder(builderContext, editingChartId = "") {
  const [state, setState] = useState(createEmptyState);

  useEffect(() => {
    let isActive = true;

    async function loadBuilder() {
      try {
        setState((current) => ({ ...current, loading: true, error: "" }));
        const [dataset, schema, templates] = await Promise.all([
          getDataset(),
          getDatasetSchema(),
          getChartTemplates(),
        ]);

        if (!isActive) return;

        if (editingChartId) {
          const chart = await getChartById(editingChartId);
          if (!isActive) return;
          if (!chart) {
            setState((current) => ({
              ...current,
              dataset,
              schema,
              templates,
              loading: false,
              isEditing: true,
              editingChartId,
              error: "Saved chart not found. It may have been deleted.",
            }));
            return;
          }

          setState(createEditingState(chart, templates, dataset, schema));
          return;
        }

        const draft = loadBuilderDraft();
        const defaultTemplate = templates.find((template) => template.id === "bar-vertical") ?? templates[0];
        const shouldUseDraft =
          draft?.projectId === builderContext?.projectId &&
          draft?.sheetId === builderContext?.sheetId &&
          draft?.dashboardId === builderContext?.dashboardId;
        const template = shouldUseDraft
          ? templates.find((item) => item.id === draft.draft?.selectedTemplateId) ?? defaultTemplate
          : defaultTemplate;
        const normalizedDefaults = normalizeTemplateState(template, shouldUseDraft ? draft.draft : {});

        setState((current) => ({
          ...current,
          dataset,
          schema,
          templates,
          loading: false,
          selectedTemplateId: template.id,
          mapping: normalizedDefaults.mapping,
          settings: normalizedDefaults.settings,
          queryMode: shouldUseDraft ? draft.draft?.queryMode ?? "visual" : "visual",
          customSql: shouldUseDraft ? draft.draft?.customSql ?? "" : "",
          lastExecutedSql: shouldUseDraft ? draft.draft?.lastExecutedSql ?? "" : "",
        }));
      } catch (error) {
        if (!isActive) return;
        setState((current) => ({
          ...current,
          loading: false,
          error: error?.message || "Unable to load builder data.",
        }));
      }
    }

    loadBuilder();
    return () => {
      isActive = false;
    };
  }, [builderContext?.dashboardId, builderContext?.projectId, builderContext?.sheetId, editingChartId]);

  const selectedTemplate = useMemo(
    () => state.templates.find((template) => template.id === state.selectedTemplateId) ?? null,
    [state.selectedTemplateId, state.templates]
  );

  const effectiveSchema = useMemo(() => getEffectiveSchema(state), [state]);
  const effectiveRows = useMemo(() => getEffectiveRows(state), [state]);
  const explorerDataset = useMemo(() => getSqlExplorerDataset(state), [state]);

  useEffect(() => {
    if (!selectedTemplate || !state.dataset) return;

    let isActive = true;

    async function syncGeneratedSql() {
      try {
        const sql = await generateVisualSql({
          templateId: selectedTemplate.id,
          mapping: state.mapping,
          settings: state.settings,
          dataset: state.dataset,
        });

        if (!isActive) return;

        setState((current) => ({
          ...current,
          generatedSql: sql,
          customSql: current.customSql?.trim() ? current.customSql : sql,
        }));
      } catch {
        if (!isActive) return;
        setState((current) => ({
          ...current,
          generatedSql: "",
        }));
      }
    }

    syncGeneratedSql();
    return () => {
      isActive = false;
    };
  }, [selectedTemplate, state.dataset, state.mapping, state.settings]);

  useEffect(() => {
    if (!selectedTemplate || !state.dataset || !state.schema) return;

    if (state.queryMode === "sql" && !state.querySchema?.fields?.length) {
      setState((current) => ({
        ...current,
        validation: createPendingSqlValidation(selectedTemplate),
        previewConfig: null,
      }));
      return;
    }

    let isActive = true;

    async function buildPreview() {
      const validation = await validateChartMapping({
        templateId: selectedTemplate.id,
        mapping: state.mapping,
        schema: effectiveSchema,
        rows: effectiveRows,
      });

      if (!isActive) return;

      if (!validation.valid) {
        setState((current) => ({
          ...current,
          validation,
          previewConfig: null,
        }));
        return;
      }

      try {
        const previewSettings = createPersistedSettings(selectedTemplate, state.settings, state.mapping);
        const previewConfig = await createChartConfig({
          templateId: selectedTemplate.id,
          rows: effectiveRows,
          schema: effectiveSchema,
          mapping: state.mapping,
          settings: previewSettings,
        });

        if (!isActive) return;

        setState((current) => ({
          ...current,
          validation,
          previewConfig: {
            ...previewConfig,
            generatedSql: current.generatedSql,
            customSql: current.customSql,
            lastExecutedSql: current.lastExecutedSql,
            queryMode: current.queryMode,
            queryResult: current.queryResult,
          },
        }));
      } catch (error) {
        if (!isActive) return;
        setState((current) => ({
          ...current,
          validation: {
            valid: false,
            errors: [error?.message || "Preview generation failed."],
            warnings: [],
            requiredRoles: validation.requiredRoles ?? [],
            message: error?.message || "Preview generation failed.",
          },
          previewConfig: null,
        }));
      }
    }

    buildPreview();
    return () => {
      isActive = false;
    };
  }, [
    effectiveRows,
    effectiveSchema,
    selectedTemplate,
    state.customSql,
    state.dataset,
    state.generatedSql,
    state.lastExecutedSql,
    state.mapping,
    state.queryMode,
    state.queryResult,
    state.querySchema,
    state.schema,
    state.settings,
  ]);

  useEffect(() => {
    if (!builderContext || !selectedTemplate || state.loading || state.isEditing) return;
    saveBuilderDraft(createDraftPayload(builderContext, state));
  }, [builderContext, selectedTemplate, state]);

  function setSelectedTemplate(templateId) {
    const template = state.templates.find((item) => item.id === templateId);
    if (!template) return;

    const defaults = normalizeTemplateState(template, {
      mapping: Object.fromEntries(
        Object.entries(state.mapping).filter(([roleKey]) => template.roles.some((role) => role.key === roleKey))
      ),
      settings: {
        ...state.settings,
        title: state.settings.title,
        subtitle: state.settings.subtitle,
        backgroundColor: resolveUnifiedBackground(state.settings),
      },
    });

    setState((current) => ({
      ...current,
      selectedTemplateId: templateId,
      mapping: defaults.mapping,
      settings: defaults.settings,
    }));
  }

  function updateSetting(key, value) {
    setState((current) => ({
      ...current,
      error: key === "title" ? "" : current.error,
      settings: {
        ...current.settings,
        [key]: value,
      },
    }));
  }

  function setQueryMode(mode) {
    setState((current) => ({
      ...current,
      queryMode: mode,
      querySchema: mode === "visual" ? null : current.querySchema,
      queryResult: mode === "visual" ? null : current.queryResult,
      queryError: mode === "visual" ? "" : current.queryError,
      queryStatus: mode === "visual" ? "idle" : current.queryStatus,
      customSql: current.customSql?.trim() ? current.customSql : current.generatedSql,
      lastExecutedSql: mode === "visual" ? "" : current.lastExecutedSql,
    }));
  }

  function updateCustomSql(value) {
    setState((current) => ({
      ...current,
      customSql: value,
      queryError: "",
      queryStatus: current.queryMode === "sql" ? "idle" : current.queryStatus,
    }));
  }

  async function applySql() {
    if (!state.customSql.trim()) {
      setState((current) => ({
        ...current,
        queryError: "Write a SQL query before running it.",
        queryStatus: "error",
      }));
      return null;
    }

    setState((current) => ({
      ...current,
      queryStatus: "running",
      queryError: "",
    }));

    try {
      const result = await runDatasetSql({
        sql: state.customSql,
        rows: state.dataset?.rows ?? [],
        schema: state.schema,
        dataset: state.dataset,
      });

      setState((current) => ({
        ...current,
        queryResult: result.queryResult,
        querySchema: result.schema,
        queryStatus: "ready",
        queryError: "",
        lastExecutedSql: result.sql,
      }));

      return result;
    } catch (error) {
      setState((current) => ({
        ...current,
        queryResult: null,
        querySchema: null,
        queryStatus: "error",
        queryError: error?.message || "Unable to run this SQL query.",
      }));
      return null;
    }
  }

  function resetSqlToGenerated() {
    setState((current) => ({
      ...current,
      customSql: current.generatedSql,
      queryError: "",
      queryStatus: current.generatedSql ? "idle" : current.queryStatus,
    }));
  }

  function assignField(roleKey, fieldName) {
    const roleConfig = getRoleConfig(selectedTemplate, roleKey);
    if (!roleConfig) return;

    setState((current) => {
      const nextValues = roleConfig.multiple
        ? Array.from(new Set([...(Array.isArray(current.mapping[roleKey]) ? current.mapping[roleKey] : []), fieldName]))
        : fieldName;

      return {
        ...current,
        mapping: {
          ...current.mapping,
          [roleKey]: nextValues,
        },
      };
    });
  }

  function removeField(roleKey, fieldName = null) {
    const roleConfig = getRoleConfig(selectedTemplate, roleKey);
    if (!roleConfig) return;

    setState((current) => ({
      ...current,
      mapping: {
        ...current.mapping,
        [roleKey]: roleConfig.multiple
          ? (Array.isArray(current.mapping[roleKey]) ? current.mapping[roleKey].filter((value) => value !== fieldName) : [])
          : null,
      },
    }));
  }

  function canAssignField(roleKey, fieldName) {
    const roleConfig = getRoleConfig(selectedTemplate, roleKey);
    const field = effectiveSchema?.fields?.find((item) => item.name === fieldName);
    if (!roleConfig || !field) return false;
    return roleConfig.accepts.includes(field.type);
  }

  async function saveChartToDashboard() {
    if (!builderContext || !selectedTemplate || !state.previewConfig || !state.validation.valid) {
      throw new Error("Chart is not ready to save.");
    }

    setState((current) => ({ ...current, saving: true, error: "" }));

    try {
      const payload = createChartPayload({
        projectId: builderContext.projectId,
        selectedTemplate,
        state,
        effectiveRows,
        effectiveSchema,
      });

      if (state.isEditing && state.editingChartId) {
        const updatedChart = await updateChart(state.editingChartId, payload);
        setState((current) => ({
          ...current,
          saving: false,
        }));

        return {
          chart: updatedChart,
          layoutItem: null,
          updated: true,
        };
      }

      const savedChart = await createChart(payload);
      const attachResult = await addSavedChartToDashboard({
        chartId: savedChart.id,
        projectId: builderContext.projectId,
        sheetId: builderContext.sheetId,
        dashboardId: builderContext.dashboardId,
      });

      setState((current) => ({
        ...current,
        saving: false,
      }));

      return {
        chart: savedChart,
        layoutItem: attachResult?.layoutItem ?? null,
      };
    } catch (error) {
      setState((current) => ({
        ...current,
        saving: false,
        error: error?.message || "Unable to save chart.",
      }));
      throw error;
    }
  }

  return {
    ...state,
    selectedTemplate,
    effectiveSchema,
    effectiveRows,
    explorerDataset,
    chartFamilies: Array.from(new Set(state.templates.map((template) => template.family))),
    isEditing: Boolean(state.isEditing),
    editingChartId: state.editingChartId ?? "",
    setSelectedTemplate,
    updateSetting,
    setQueryMode,
    updateCustomSql,
    applySql,
    resetSqlToGenerated,
    assignField,
    removeField,
    canAssignField,
    saveChartToDashboard,
  };
}
