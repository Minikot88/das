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
  cardBackground: "",
  lineWidth: 2,
  barBorderRadius: 8,
};

const REQUIRED_TITLE_MESSAGE = "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E01\u0E23\u0E2D\u0E01\u0E0A\u0E37\u0E48\u0E2D\u0E01\u0E23\u0E32\u0E1F\u0E01\u0E48\u0E2D\u0E19\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01";

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

function getRoleConfig(template, roleKey) {
  return template?.roles?.find((role) => role.key === roleKey) ?? null;
}

function normalizeTemplateState(template, savedState = {}) {
  return {
    mapping: {
      ...template.defaultMapping,
      ...savedState.mapping,
    },
    settings: {
      ...BASE_SETTINGS,
      ...template.defaultSettings,
      ...savedState.settings,
    },
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
  const rawTitle = chart.settings?.title;
  const resolvedTitle = typeof rawTitle === "string"
    ? rawTitle.trim()
    : "";
  const defaults = normalizeTemplateState(template, {
    mapping: chart.mapping ?? chart.config?.mapping ?? {},
    settings: {
      ...(chart.settings ?? {}),
      title: resolvedTitle,
      showTitle: chart.settings?.showTitle ?? true,
      subtitle: chart.settings?.subtitle ?? chart.config?.options?.plugins?.subtitle?.text ?? "",
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
  const trimmedTitle = typeof state.settings.title === "string" ? state.settings.title.trim() : "";
  return {
    projectId,
    templateId: selectedTemplate.id,
    title: trimmedTitle,
    name: trimmedTitle,
    mapping: state.mapping,
    settings: state.settings,
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
        const previewConfig = await createChartConfig({
          templateId: selectedTemplate.id,
          rows: effectiveRows,
          schema: effectiveSchema,
          mapping: state.mapping,
          settings: state.settings,
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

    const trimmedTitle = typeof state.settings.title === "string" ? state.settings.title.trim() : "";
    if (!trimmedTitle) {
      setState((current) => ({
        ...current,
        error: REQUIRED_TITLE_MESSAGE,
      }));
      throw new Error(REQUIRED_TITLE_MESSAGE);
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
