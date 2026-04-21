import { useEffect, useMemo, useRef, useState } from "react";
import { schema } from "../../data/mockData";
import {
  getBuilderChartCatalog,
  getChartFamilyMeta,
  getChartMeta,
  getChartSelectorCategories,
  getChartSelectorDefaults,
  getChartSelectorFamilies,
  getRecommendedCharts,
  resolveChartRuntimeType,
} from "../../utils/chartCatalog";
import { getChartCompatibility, getChartSwitchPlan } from "../../utils/chartCompatibility";
import { getChartJsSupport } from "../../utils/chartjsAdapter";
import { normalizeChartConfig } from "../../utils/normalizeChartConfig";
import { buildQuery, formatSql, runQuery, runSqlQuery } from "../../utils/queryEngine";
import {
  autoMapFieldsForChart,
  assignFieldToRole,
  clearRole,
  createBuilderStateFromRoleMapping,
  createFieldLookupFromTable,
  createRoleMappingFromConfig,
  getChartRoleConfig,
  getCompatibleRolesForField,
  getFieldRoleHints,
  getMissingRoleSummary,
  getRoleAssignments,
  preserveCompatibleMapping,
  removeFieldFromRole,
  reorderRoleFields,
  validateRoleMapping,
} from "../../utils/builderMappingUtils";
import {
  clearBuilderMappings,
  createBuilderQueryInput,
  createBuilderSaveConfig,
  createReadinessLabel,
  createSlotAssignments,
  createValidationSummary,
  findFieldInSchema,
} from "./builderStateUtils";
import { buildPreviewFallback, evaluatePreviewRows, getPreviewReadiness } from "../../utils/builderChartUtils";
import useBuilderPreview from "./useBuilderPreview";

const AGGREGATION_BY_TYPE = {
  scatter: [],
  bubble: [],
  histogram: [],
  table: ["sum", "count", "avg", "min", "max"],
  "pivot-table": ["sum", "count", "avg", "min", "max"],
  pie: ["sum", "count"],
  donut: ["sum", "count"],
  rose: ["sum", "count"],
};

const DIRECT_PREVIEW_RENDER_TYPES = new Set([
  "heatmap",
  "matrix",
  "tree",
  "treemap",
  "sunburst",
  "sankey",
  "graph",
  "parallel",
  "candlestick",
  "calendar",
  "theme-river",
  "map",
  "lines",
  "boxplot",
  "custom",
  "table",
  "pivot-table",
]);

const DISPLAY_STATE_DEFAULTS = {
  colorTheme: "default",
  showLegend: true,
  legendPosition: "bottom",
  showTooltip: true,
  showGrid: true,
  showAxis: true,
  showLabels: false,
  backgroundOpacity: 0,
  padding: 24,
};

const LABEL_STATE_DEFAULTS = {
  name: "",
  title: "",
  subtitle: "",
  xLabel: "",
  yLabel: "",
  valueFormat: "default",
  emptyStateLabel: "No rows available",
};

function getSettingsFamilyKey(chartType, familyId = null) {
  const meta = getChartMeta(chartType);
  const resolvedFamily = familyId ?? meta.selectorFamilyId ?? meta.family ?? meta.renderType ?? meta.id;

  if (["line"].includes(resolvedFamily)) return "line";
  if (["bar"].includes(resolvedFamily)) return "bar";
  if (["pie", "richText"].includes(resolvedFamily)) return "pie";
  if (["scatter"].includes(resolvedFamily)) return "scatter";
  if (["gauge"].includes(resolvedFamily)) return "gauge";
  if (["heatmap", "matrix"].includes(resolvedFamily)) return "heatmap";
  if (["treemap"].includes(resolvedFamily)) return "treemap";
  if (["sunburst"].includes(resolvedFamily)) return "sunburst";
  if (["tree"].includes(resolvedFamily)) return "tree";
  if (["sankey"].includes(resolvedFamily)) return "sankey";
  if (["funnel"].includes(resolvedFamily)) return "funnel";
  if (["radar"].includes(resolvedFamily)) return "radar";
  if (["candlestick"].includes(resolvedFamily)) return "candlestick";
  if (["boxplot"].includes(resolvedFamily)) return "boxplot";
  if (["parallel"].includes(resolvedFamily)) return "parallel";
  if (["calendar"].includes(resolvedFamily)) return "calendar";
  if (["themeRiver"].includes(resolvedFamily) || meta.renderType === "theme-river") return "theme-river";
  return "fallback";
}

function getChartSettingsDefaults(chartType, familyId = null) {
  const settingsFamilyKey = getSettingsFamilyKey(chartType, familyId);

  const defaultsByFamily = {
    line: { smooth: false, area: false, stack: false, step: false, showSymbol: true, connectNulls: false, lineWidth: 3, curveTension: 0.35 },
    bar: { horizontal: chartType === "horizontal-bar", stack: chartType === "stacked-bar", borderRadius: 6, barWidth: 34, sort: "none", groupGap: 30, barGap: 24 },
    pie: { donut: chartType === "donut", rose: chartType === "rose", innerRadius: 48, outerRadius: 72, labelPosition: "outside", showPercent: false },
    scatter: { symbolSize: 14, bubbleMode: chartType === "bubble", opacity: 0.72, regression: false },
    gauge: { min: 0, max: 100, progress: true, splitNumber: 5, startAngle: 210, endAngle: -30, showPointer: true, showProgressRing: chartType === "progress-ring", detailFormatter: "value" },
    heatmap: { cellGap: 1, visualMin: "auto", visualMax: "auto", colorScaleMode: "sequential" },
    treemap: { leafDepth: 1, showParentLabels: true, breadcrumb: false, gapWidth: 2 },
    sunburst: { radiusInner: 18, radiusOuter: 84, labelRotate: "radial", nodeClick: "rootToNode" },
    tree: { orientation: "LR", radial: false, expandDepth: 2, edgeShape: "curve" },
    sankey: { nodeAlign: "justify", nodeWidth: 18, nodeGap: 12, curveness: 0.5 },
    funnel: { sortDirection: "descending", gap: 2, labelPosition: "inside" },
    radar: { shape: "polygon", radius: 62, splitNumber: 4, areaFill: true },
    candlestick: { showDataZoom: false, bullMode: "default", bearMode: "default" },
    boxplot: { showOutliers: false, boxWidth: 50 },
    parallel: { axisExpand: false, lineOpacity: 0.35, smooth: false },
    calendar: { cellSize: 18, layout: "horizontal", rangeMode: "auto" },
    "theme-river": { boundaryGap: true, showSeriesLabels: false },
    fallback: {},
  };

  return {
    settingsFamilyKey,
    defaults: defaultsByFamily[settingsFamilyKey] ?? defaultsByFamily.fallback,
  };
}

function normalizeDisplayState(builderState = {}) {
  const nested = builderState.display ?? builderState.displayOptions ?? {};

  return {
    ...DISPLAY_STATE_DEFAULTS,
    ...nested,
    colorTheme: nested.colorTheme ?? builderState.colorTheme ?? DISPLAY_STATE_DEFAULTS.colorTheme,
    showLegend: nested.showLegend ?? builderState.legendVisible ?? DISPLAY_STATE_DEFAULTS.showLegend,
    showGrid: nested.showGrid ?? builderState.showGrid ?? DISPLAY_STATE_DEFAULTS.showGrid,
    showLabels: nested.showLabels ?? builderState.showLabels ?? DISPLAY_STATE_DEFAULTS.showLabels,
  };
}

function normalizeLabelState(builderState = {}) {
  const nested = builderState.labels ?? builderState.labelSettings ?? {};

  return {
    ...LABEL_STATE_DEFAULTS,
    ...nested,
    name: nested.name ?? builderState.name ?? LABEL_STATE_DEFAULTS.name,
    title: nested.title ?? builderState.title ?? LABEL_STATE_DEFAULTS.title,
    subtitle: nested.subtitle ?? builderState.subtitle ?? LABEL_STATE_DEFAULTS.subtitle,
    xLabel: nested.xLabel ?? builderState.xLabel ?? LABEL_STATE_DEFAULTS.xLabel,
    yLabel: nested.yLabel ?? builderState.yLabel ?? LABEL_STATE_DEFAULTS.yLabel,
  };
}

function normalizeChartSettingsState(builderState = {}, chartType, familyId = null) {
  const nested = builderState.settings ?? builderState.chartSettings ?? {};
  const profile = getChartSettingsDefaults(chartType, familyId);

  return {
    settingsFamilyKey: profile.settingsFamilyKey,
    values: {
      ...profile.defaults,
      ...nested,
      smooth: nested.smooth ?? builderState.smooth ?? profile.defaults.smooth,
    },
  };
}

function mergeChartSettingsState(previousSettings = {}, chartType, familyId = null) {
  const profile = getChartSettingsDefaults(chartType, familyId);
  return Object.keys(profile.defaults).reduce((accumulator, key) => {
    accumulator[key] = previousSettings[key] !== undefined ? previousSettings[key] : profile.defaults[key];
    return accumulator;
  }, {});
}

function getAggregationOptions(type, activeAggregation = "sum") {
  const defaults = AGGREGATION_BY_TYPE[type] ?? ["sum", "count", "avg", "min", "max"];
  if (!defaults.length) return [];
  return defaults.includes(activeAggregation) ? defaults : [...defaults, activeAggregation];
}

function resolveRuntimeFields(builderState, fallbackFields) {
  if (builderState.queryMode !== "sql") return fallbackFields;
  return builderState.queryResult?.fieldMeta?.length ? builderState.queryResult.fieldMeta : fallbackFields;
}

function resolveSourceDb(tableName) {
  return Object.entries(schema).find(([, tables]) => tables?.[tableName])?.[0] ?? null;
}

function shouldUseDirectPreviewData(chartMeta, roleMapping = {}) {
  const renderType = chartMeta?.renderType ?? chartMeta?.id;
  if (DIRECT_PREVIEW_RENDER_TYPES.has(renderType)) return true;

  return ["values", "ys", "dimensions", "hierarchy", "nodes", "edges", "open", "close", "low", "high", "min", "q1", "median", "q3", "max", "targetValue"]
    .some((roleKey) => (roleMapping?.[roleKey]?.length ?? 0) > 0);
}

function isSameMapping(left = {}, right = {}) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function isSelectableChartVariant(variant) {
  if (!variant) return false;
  if (variant.supported === false) return false;
  if (variant.previewSupported === false) return false;
  if (variant.rendererSupported === false) return false;
  return (variant.supportLevel ?? "supported") !== "metadata-ready";
}

function getChartVariantDisabledReason(variant) {
  if (!variant) return "Variant unavailable.";
  if (variant.supported === false) {
    return variant.chart?.disabledReason || "This variant is not available in the current runtime.";
  }
  if (variant.previewSupported === false) {
    return variant.chart?.disabledReason || "This variant is not preview-ready in the current runtime.";
  }
  if (variant.rendererSupported === false) {
    return variant.rendererDisabledReason || "This chart type is not available in the current Chart.js renderer yet.";
  }
  if ((variant.supportLevel ?? "supported") === "metadata-ready") {
    return "This variant is cataloged, but not fully wired for preview and save yet.";
  }
  return "";
}

function getRendererSupportForChart(chartId) {
  const runtimeType = resolveChartRuntimeType(chartId);
  const rendererSupport = getChartJsSupport(runtimeType);
  return {
    runtimeType,
    rendererSupport,
    rendererSupported: rendererSupport.supported,
    rendererDisabledReason: rendererSupport.supported
      ? ""
      : (rendererSupport.placeholder || "This chart type is not available in the current Chart.js renderer yet."),
  };
}

function pickSelectableVariant(variants = [], preferredMatchers = []) {
  const matchers = preferredMatchers.filter(Boolean);
  const selectable = variants.filter(isSelectableChartVariant);

  for (const matcher of matchers) {
    const preferredVariant = selectable.find((variant) => matcher(variant));
    if (preferredVariant) return preferredVariant;
  }

  return selectable[0] ?? variants[0] ?? null;
}

function createBuilderStateSnapshot(builderState = {}) {
  return {
    selectedDb: builderState.selectedDb ?? null,
    selectedTable: builderState.selectedTable ?? null,
    chartType: builderState.chartType ?? "bar",
    aggregation: builderState.aggregation ?? "sum",
    xField: builderState.xField ?? null,
    xType: builderState.xType ?? null,
    yField: builderState.yField ?? null,
    yType: builderState.yType ?? null,
    groupField: builderState.groupField ?? null,
    sizeField: builderState.sizeField ?? null,
    sizeType: builderState.sizeType ?? null,
    queryMode: builderState.queryMode ?? "visual",
    generatedSql: builderState.generatedSql ?? "",
    customSql: builderState.customSql ?? "",
    lastExecutedSql: builderState.lastExecutedSql ?? "",
    queryResult: builderState.queryResult ?? null,
    queryError: builderState.queryError ?? "",
    queryStatus: builderState.queryStatus ?? "idle",
    isDirtySql: builderState.isDirtySql ?? false,
    lastRunAt: builderState.lastRunAt ?? "",
    roleMapping: builderState.roleMapping ?? {},
    selectedChartCategory: builderState.selectedChartCategory ?? null,
    selectedChartFamily: builderState.selectedChartFamily ?? null,
    selectedChartVariant: builderState.selectedChartVariant ?? null,
    title: builderState.title ?? "",
    subtitle: builderState.subtitle ?? "",
    name: builderState.name ?? "",
    labels: builderState.labels ?? builderState.labelSettings ?? null,
    colorTheme: builderState.colorTheme ?? "default",
    legendVisible: builderState.legendVisible,
    showTooltip: builderState.showTooltip,
    showGrid: builderState.showGrid,
    showAxis: builderState.showAxis,
    showLabels: builderState.showLabels,
    smooth: builderState.smooth,
    display: builderState.display ?? builderState.displayOptions ?? null,
    settings: builderState.settings ?? builderState.chartSettings ?? null,
    meta: builderState.meta ?? null,
    xLabel: builderState.xLabel ?? "",
    yLabel: builderState.yLabel ?? "",
    editingChartId: builderState.editingChartId ?? null,
  };
}

export default function useBuilderWorkspace({
  builderState,
  setBuilderState,
  resetBuilderState,
  updateChart,
  saveChartAction,
  previewChart,
  setPreviewChart,
  clearPreviewChart,
  navigate,
}) {
  const builderSnapshot = useMemo(() => createBuilderStateSnapshot(builderState), [builderState]);
  const isEditing = !!builderState.editingChartId;
  const [chartSelectionMode, setChartSelectionMode] = useState("auto");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [lastMappingNotice, setLastMappingNotice] = useState("");
  const autoMappingContextRef = useRef("");
  const autoSuggestionContextRef = useRef("");

  const selectedDb = builderSnapshot.selectedDb;
  const selectedTable = builderSnapshot.selectedTable;
  const chartType = builderSnapshot.chartType;
  const queryMode = builderSnapshot.queryMode;
  const tableInfo = selectedDb && selectedTable ? schema[selectedDb]?.[selectedTable] : null;
  const tableData = tableInfo?.data ?? [];
  const tableFields = resolveRuntimeFields(builderSnapshot, tableInfo?.fields ?? []);
  const mappingSeed = useMemo(
    () => ({
      roleMapping: builderSnapshot.roleMapping,
      xField: builderSnapshot.xField,
      xType: builderSnapshot.xType,
      yField: builderSnapshot.yField,
      yType: builderSnapshot.yType,
      groupField: builderSnapshot.groupField,
      sizeField: builderSnapshot.sizeField,
      sizeType: builderSnapshot.sizeType,
      x: builderSnapshot.xField,
      y: builderSnapshot.yField,
      groupBy: builderSnapshot.groupField,
    }),
    [
      builderSnapshot.groupField,
      builderSnapshot.roleMapping,
      builderSnapshot.sizeField,
      builderSnapshot.sizeType,
      builderSnapshot.xField,
      builderSnapshot.xType,
      builderSnapshot.yField,
      builderSnapshot.yType,
    ]
  );
  const availableFields = useMemo(
    () => createFieldLookupFromTable(tableFields, selectedDb, selectedTable),
    [selectedDb, selectedTable, tableFields]
  );
  const chartCatalog = useMemo(() => getBuilderChartCatalog(), []);
  const chartMeta = useMemo(() => getChartMeta(chartType), [chartType]);
  const activeRendererSupport = useMemo(() => getRendererSupportForChart(chartType), [chartType]);
  const selectorDefaults = useMemo(() => getChartSelectorDefaults(chartType), [chartType]);
  const [selectedChartCategory, setSelectedChartCategory] = useState(builderSnapshot.selectedChartCategory ?? selectorDefaults.categoryId);
  const [selectedChartFamily, setSelectedChartFamily] = useState(builderSnapshot.selectedChartFamily ?? selectorDefaults.familyId);
  const [selectedChartVariant, setSelectedChartVariant] = useState(builderSnapshot.selectedChartVariant ?? selectorDefaults.variantId);
  const displayOptions = useMemo(() => normalizeDisplayState(builderSnapshot), [builderSnapshot]);
  const labelSettings = useMemo(() => normalizeLabelState(builderSnapshot), [builderSnapshot]);
  const chartSettingsState = useMemo(
    () => normalizeChartSettingsState(builderSnapshot, chartType, builderSnapshot.selectedChartFamily ?? selectorDefaults.familyId),
    [builderSnapshot, chartType, selectorDefaults.familyId]
  );
  const chartSettings = chartSettingsState.values;
  const roleConfig = useMemo(() => getChartRoleConfig(chartType), [chartType]);
  const roleMapping = useMemo(
    () =>
      createRoleMappingFromConfig(mappingSeed, chartType, {
        tableFields,
        selectedDb,
        selectedTable,
      }),
    [chartType, mappingSeed, selectedDb, selectedTable, tableFields]
  );
  const mappedState = useMemo(
    () => createBuilderStateFromRoleMapping(chartType, roleMapping, { selectedDb, selectedTable }),
    [chartType, roleMapping, selectedDb, selectedTable]
  );
  const configMeta = useMemo(
    () => ({
      ...(builderSnapshot.meta ?? {}),
      supportLevel: builderSnapshot.meta?.supportLevel ?? chartMeta.supportLevel ?? "supported",
      family: selectedChartFamily ?? selectorDefaults.familyId,
      variant: selectedChartVariant ?? selectorDefaults.variantId,
      runtimeType: chartMeta.renderType ?? chartMeta.id,
      selectedChartBaseType: chartMeta.chartId ?? chartMeta.renderType ?? chartType,
    }),
    [builderSnapshot.meta, chartMeta, chartType, selectedChartFamily, selectedChartVariant, selectorDefaults.familyId, selectorDefaults.variantId]
  );
  const previewConfig = useMemo(
    () =>
      normalizeChartConfig({
        ...builderSnapshot,
        ...mappedState,
        family: selectedChartFamily ?? selectorDefaults.familyId,
        variant: selectedChartVariant ?? selectorDefaults.variantId,
        settings: chartSettings,
        display: displayOptions,
        labels: labelSettings,
        meta: configMeta,
        ...createBuilderQueryInput({
          ...builderSnapshot,
          ...mappedState,
          chartType,
        }),
      }),
    [builderSnapshot, chartSettings, chartType, configMeta, displayOptions, labelSettings, mappedState, selectedChartFamily, selectedChartVariant, selectorDefaults.familyId, selectorDefaults.variantId]
  );
  const catalogWithCompatibility = useMemo(
    () =>
      chartCatalog.map((chart) => ({
        ...chart,
        compatibility: getChartCompatibility(chart.id, { ...builderSnapshot, ...previewConfig }, tableFields),
      })),
    [builderSnapshot, chartCatalog, previewConfig, tableFields]
  );
  const chartDefinition = useMemo(
    () => ({
      family: chartMeta.category,
      title: chartMeta.name,
      description: chartMeta.description,
    }),
    [chartMeta]
  );
  const recommendedCharts = useMemo(
    () =>
      getRecommendedCharts(previewConfig, tableFields)
        .filter((chart) => getRendererSupportForChart(chart.id).rendererSupported)
        .map((chart) => ({
          ...chart,
          compatibility: getChartCompatibility(chart.id, { ...builderSnapshot, ...previewConfig }, tableFields),
        })),
    [builderSnapshot, previewConfig, tableFields]
  );
  const suggestionResult = useMemo(() => {
    if (!recommendedCharts.length) return null;
    return {
      suggested: recommendedCharts[0]?.id ?? null,
      alternatives: recommendedCharts.slice(1, 5).map((chart) => chart.id),
      summary: recommendedCharts[0]?.description ?? "",
      confidence: "medium",
    };
  }, [recommendedCharts]);
  const selectorCategories = useMemo(() => getChartSelectorCategories(), []);
  const selectorFamilyCatalog = useMemo(() => {
    const chartById = new Map(catalogWithCompatibility.map((chart) => [chart.id, chart]));
    const recommendedIds = new Set((recommendedCharts ?? []).map((chart) => chart.id));

    return getChartSelectorFamilies().map((family) => ({
      ...family,
      variants: family.variants.map((variant) => {
        const variantChart = chartById.get(variant.id) ?? getChartMeta(variant.id);
        const previewSupported = variantChart.previewSupported !== false;
        const supported = variantChart.supported !== false;
        const rendererInfo = getRendererSupportForChart(variant.chartId ?? variant.id);
        const isSelectable = isSelectableChartVariant({
          ...variant,
          chart: variantChart,
          supported,
          previewSupported,
          rendererSupported: rendererInfo.rendererSupported,
        });
        return {
          ...variant,
          chart: variantChart,
          supported,
          previewSupported,
          runtimeType: rendererInfo.runtimeType,
          rendererSupport: rendererInfo.rendererSupport,
          rendererSupported: rendererInfo.rendererSupported,
          rendererDisabledReason: rendererInfo.rendererDisabledReason,
          isSelectable,
          disabledReason: getChartVariantDisabledReason({
            ...variant,
            chart: variantChart,
            supported,
            previewSupported,
            rendererSupported: rendererInfo.rendererSupported,
            rendererDisabledReason: rendererInfo.rendererDisabledReason,
          }),
          recommended: recommendedIds.has(variant.id) || recommendedIds.has(variant.chartId),
        };
      }),
      recommended: family.variants.some((variant) => recommendedIds.has(variant.id) || recommendedIds.has(variant.chartId)),
    })).map((family) => ({
      ...family,
      selectableCount: family.variants.filter((variant) => variant.isSelectable).length,
      totalVariantCount: family.variants.length,
    }));
  }, [catalogWithCompatibility, recommendedCharts]);
  const visibleChartFamilies = useMemo(
    () =>
      selectorFamilyCatalog.filter(
        (family) =>
          family.categories.includes(selectedChartCategory) &&
          family.variants.some((variant) => variant.isSelectable)
      ),
    [selectedChartCategory, selectorFamilyCatalog]
  );
  const activeChartFamilyMeta = useMemo(
    () =>
      selectorFamilyCatalog.find((family) => family.id === selectedChartFamily) ??
      getChartFamilyMeta(selectedChartFamily),
    [selectedChartFamily, selectorFamilyCatalog]
  );
  const visibleChartVariants = activeChartFamilyMeta?.variants ?? [];
  const activeChartVariantMeta = useMemo(
    () =>
      visibleChartVariants.find((variant) => variant.id === selectedChartVariant) ??
      visibleChartVariants.find((variant) => variant.id === chartType || variant.chartId === chartType) ??
      pickSelectableVariant(visibleChartVariants, [
        (variant) => variant.id === selectedChartVariant,
        (variant) => variant.id === chartType,
        (variant) => variant.chartId === chartType,
      ]) ??
      visibleChartVariants[0] ??
      null,
    [chartType, selectedChartVariant, visibleChartVariants]
  );
  const roleAssignments = useMemo(() => getRoleAssignments(chartType, roleMapping), [chartType, roleMapping]);
  const roleValidation = useMemo(
    () =>
      validateRoleMapping(chartType, roleMapping, {
        selectedTable,
        previewSupported: chartMeta.previewSupported,
        availableFields,
      }),
    [availableFields, chartMeta.previewSupported, chartType, roleMapping, selectedTable]
  );
  const validationSummary = useMemo(
    () => {
      const summary = createValidationSummary(roleValidation, selectedTable);

      if (activeRendererSupport.rendererSupported) {
        return summary;
      }

      const rendererBlocker = {
        level: "error",
        code: "unsupported-renderer-chart",
        title: "Pick a supported chart type",
        message: `${chartMeta.name} is not wired to the current Chart.js renderer yet.`,
        action: "Choose one of the available chart families or variants to continue.",
      };

      return {
        blockers: [rendererBlocker, ...summary.blockers],
        cautions: summary.cautions,
        nextStep: rendererBlocker.action,
      };
    },
    [activeRendererSupport.rendererSupported, chartMeta.name, roleValidation, selectedTable]
  );
  const slotAssignments = useMemo(
    () =>
      createSlotAssignments({
        builderState: {
          ...builderSnapshot,
          ...mappedState,
          xField: previewConfig.x,
          xType: previewConfig.xType,
          yField: previewConfig.y,
          yType: previewConfig.yType,
          groupField: previewConfig.groupBy,
          sizeField: previewConfig.sizeField,
          sizeType: previewConfig.sizeType,
        },
        chartSlots: chartMeta.slots ?? [],
        tableFields,
        schema,
      }),
    [builderSnapshot, chartMeta.slots, mappedState, previewConfig, tableFields]
  );
  const builderQueryInput = useMemo(
    () => ({
      ...createBuilderQueryInput({
        ...builderSnapshot,
        ...mappedState,
        chartType,
        aggregation: builderSnapshot.aggregation,
      }),
      chartType: chartMeta.renderType ?? chartType,
    }),
    [builderSnapshot, chartMeta.renderType, chartType, mappedState]
  );
  const requiredRoleCount = roleAssignments.filter((role) => role.required).length;
  const completedRequiredRoleCount = roleAssignments.filter(
    (role) => role.required && role.state.status === "valid"
  ).length;
  const useDirectPreviewData = useMemo(
    () => shouldUseDirectPreviewData(chartMeta, roleMapping),
    [chartMeta, roleMapping]
  );
  const sourcePreviewRows = useMemo(
    () => (queryMode === "sql" ? builderSnapshot.queryResult?.rows ?? [] : tableData),
    [builderSnapshot.queryResult?.rows, queryMode, tableData]
  );
  const previewFallback = useMemo(
    () =>
      buildPreviewFallback({
        chartId: chartType,
        roleMapping,
        rows: sourcePreviewRows,
        tableFields,
      }),
    [chartType, roleMapping, sourcePreviewRows, tableFields]
  );
  const previewChartType = previewFallback.useFallback ? previewFallback.chartType : chartType;
  const previewChartMeta = useMemo(() => getChartMeta(previewChartType), [previewChartType]);
  const previewRoleMapping = useMemo(
    () => (previewFallback.useFallback ? previewFallback.roleMapping : roleMapping),
    [previewFallback, roleMapping]
  );
  const previewConfigForRender = useMemo(
    () =>
      previewFallback.useFallback
        ? normalizeChartConfig({
            ...previewConfig,
            chartType: previewChartType,
            type: previewChartMeta.renderType ?? previewChartType,
            x: previewFallback.xField,
            y: previewFallback.yField,
            groupBy: previewFallback.groupField,
            sizeField: previewFallback.sizeField,
            xField: previewFallback.xField,
            yField: previewFallback.yField,
            groupField: previewFallback.groupField,
            roleMapping: previewRoleMapping,
            mappings: {
              ...(previewConfig.mappings ?? {}),
              x: previewFallback.xField,
              y: previewFallback.yField,
              groupBy: previewFallback.groupField,
              sizeField: previewFallback.sizeField,
              roleMapping: previewRoleMapping,
            },
            meta: {
              ...(previewConfig.meta ?? {}),
              runtimeType: previewChartMeta.renderType ?? previewChartType,
              selectedChartBaseType: previewChartMeta.chartId ?? previewChartMeta.renderType ?? previewChartType,
              previewFallback: true,
              previewFallbackSourceChartType: chartType,
              previewFallbackType: previewChartType,
              previewFallbackReason: previewFallback.message,
            },
          })
        : previewConfig,
    [chartType, previewConfig, previewFallback, previewChartMeta, previewChartType, previewRoleMapping]
  );
  const previewRoleValidation = useMemo(
    () =>
      validateRoleMapping(previewChartType, previewRoleMapping, {
        selectedTable,
        previewSupported: previewChartMeta.previewSupported,
        availableFields,
      }),
    [availableFields, previewChartMeta.previewSupported, previewChartType, previewRoleMapping, selectedTable]
  );
  const previewReadiness = useMemo(
    () =>
      getPreviewReadiness({
        chartId: previewChartType,
        chartMeta: previewChartMeta,
        roleMapping: previewRoleMapping,
        validation: previewRoleValidation,
        selectedTable,
        rows: sourcePreviewRows,
      }),
    [previewChartMeta, previewChartType, previewRoleMapping, previewRoleValidation, selectedTable, sourcePreviewRows]
  );
  const previewReady = useMemo(
    () =>
      previewReadiness.shouldRender &&
      (queryMode !== "sql" || builderSnapshot.queryStatus === "success"),
    [builderSnapshot.queryStatus, previewReadiness.shouldRender, queryMode]
  );
  const previewUsesDirectRows = useMemo(
    () => useDirectPreviewData || previewFallback.useFallback,
    [previewFallback.useFallback, useDirectPreviewData]
  );
  const previewSignature = useMemo(
    () =>
      JSON.stringify({
        previewReady,
        chartType: previewConfigForRender.chartType,
        dataset: previewConfigForRender.dataset,
        x: previewConfigForRender.x,
        y: previewConfigForRender.y,
        groupBy: previewConfigForRender.groupBy,
        sizeField: previewConfigForRender.sizeField,
        aggregate: previewConfigForRender.aggregate,
        title: previewConfigForRender.title,
        subtitle: previewConfigForRender.subtitle,
        xLabel: previewConfigForRender.xLabel,
        yLabel: previewConfigForRender.yLabel,
        legendVisible: previewConfigForRender.legendVisible,
        showGrid: previewConfigForRender.showGrid,
        showLabels: previewConfigForRender.showLabels,
        colorTheme: previewConfigForRender.colorTheme,
        smooth: previewConfigForRender.smooth,
        settings: previewConfigForRender.settings,
        display: previewConfigForRender.display,
        labels: previewConfigForRender.labels,
      }),
    [previewConfigForRender, previewReady]
  );
  const mappingSignature = useMemo(
    () =>
      JSON.stringify({
        selectedDb,
        selectedTable,
        chartType,
        queryMode,
        roleMapping,
      }),
    [chartType, queryMode, roleMapping, selectedDb, selectedTable]
  );
  const generatedQueryPreview = useMemo(() => buildQuery(builderQueryInput), [builderQueryInput]);

  useEffect(() => {
    const selectedFamilyMeta = selectorFamilyCatalog.find((family) => family.id === selectedChartFamily);
    const selectedVariantMeta = selectedFamilyMeta?.variants.find((variant) => variant.id === selectedChartVariant) ?? null;
    if (
      selectedVariantMeta &&
      selectedVariantMeta.isSelectable &&
      (selectedVariantMeta.id === chartType || selectedVariantMeta.chartId === chartType)
    ) {
      return;
    }

    const fallbackFamily =
      selectorFamilyCatalog.find((family) => family.id === selectorDefaults.familyId) ??
      selectorFamilyCatalog.find((family) => family.variants.some((variant) => variant.isSelectable)) ??
      selectorFamilyCatalog[0] ??
      null;
    const fallbackVariant = pickSelectableVariant(fallbackFamily?.variants ?? [], [
      (variant) => variant.id === selectorDefaults.variantId,
      (variant) => variant.id === chartType,
      (variant) => variant.chartId === chartType,
    ]);

    if (!fallbackFamily || !fallbackVariant) return;

    setSelectedChartCategory((current) =>
      current === (fallbackFamily.primaryCategory ?? selectorDefaults.categoryId)
        ? current
        : (fallbackFamily.primaryCategory ?? selectorDefaults.categoryId)
    );
    setSelectedChartFamily((current) =>
      current === fallbackFamily.id ? current : fallbackFamily.id
    );
    setSelectedChartVariant((current) =>
      current === fallbackVariant.id ? current : fallbackVariant.id
    );
  }, [chartType, selectedChartFamily, selectedChartVariant, selectorDefaults, selectorFamilyCatalog]);

  useEffect(() => {
    const contextSignature = JSON.stringify({
      selectedDb,
      selectedTable,
      chartType,
      fieldNames: availableFields.map((field) => field.name),
      queryMode,
    });

    if (!selectedTable || !availableFields.length) {
      autoMappingContextRef.current = contextSignature;
      return;
    }

    const sourceChanged = autoMappingContextRef.current !== contextSignature;
    const hasStoredMapping = Object.values(builderSnapshot.roleMapping ?? {}).some(
      (fields) => (fields?.length ?? 0) > 0
    );
    const shouldAutoMap = sourceChanged || !hasStoredMapping;

    if (!shouldAutoMap) {
      autoMappingContextRef.current = contextSignature;
      return;
    }

    const preservedMapping = preserveCompatibleMapping(chartType, roleMapping, availableFields);
    const suggestedMapping = autoMapFieldsForChart(chartType, availableFields, preservedMapping);

    if (!isSameMapping(suggestedMapping, roleMapping)) {
      const missingRoles = getMissingRoleSummary(chartType, suggestedMapping);
      setLastMappingNotice(
        missingRoles.length
          ? `${chartMeta.name} still needs ${missingRoles.join(", ")}.`
          : "Mapped likely fields automatically."
      );
      commitRoleMapping(suggestedMapping, { selectedDb, selectedTable });
    }

    autoMappingContextRef.current = contextSignature;
  }, [
    availableFields,
    builderSnapshot.roleMapping,
    chartMeta.name,
    chartType,
    queryMode,
    roleMapping,
    selectedDb,
    selectedTable,
  ]);

  useEffect(() => {
    if (!isEditing) {
      setChartSelectionMode("auto");
    }
  }, [isEditing]);

  useEffect(() => {
    const suggested = suggestionResult?.suggested;
    if (!suggested || chartSelectionMode === "manual" || isEditing || chartType === suggested) return;

    const suggestionContext = JSON.stringify({
      selectedDb,
      selectedTable,
      suggested,
      fieldNames: availableFields.map((field) => field.name),
    });

    if (autoSuggestionContextRef.current === suggestionContext) return;
    autoSuggestionContextRef.current = suggestionContext;

    handleChartTypeChange(suggested, "auto");
  }, [
    availableFields,
    chartSelectionMode,
    chartType,
    isEditing,
    selectedDb,
    selectedTable,
    suggestionResult?.suggested,
  ]);
  const {
    previewRows,
    previewState,
    previewChartType: activePreviewChartType,
    previewConfig: activePreviewConfig,
    missingRequirements,
    canRenderPreview,
  } = useBuilderPreview({
    builderSnapshot,
    setBuilderState,
    clearPreviewChart,
    previewConfig: previewConfigForRender,
    previewReady,
    previewReadiness,
    queryMode,
    chartType: previewChartType,
    roleMapping: previewRoleMapping,
    selectedTable,
    tableData,
    tableFields,
    builderQueryInput,
    generatedQueryPreviewSql: generatedQueryPreview.sql,
    useDirectPreviewData: previewUsesDirectRows,
    setPreviewChart,
    sourcePreviewRows,
    previewHint: previewFallback.useFallback ? previewFallback.message : "",
  });

  const hasChartConfig = Boolean(previewConfig.dataset) && Boolean(previewConfig.chartType);
  const sqlReadyToSave = queryMode !== "sql" || builderSnapshot.queryStatus === "success";
  const canAddChart = validationSummary.blockers.length === 0
    && hasChartConfig
    && sqlReadyToSave;
  const mappedCount = roleAssignments.filter((role) => role.fields.length).length;
  const mappedTarget = roleAssignments.filter((role) => role.required).length;
  const readinessLabel = createReadinessLabel({
    saveSuccess,
    canAddChart,
    cautionCount: validationSummary.cautions.length,
  });
  const aggregationOptions = useMemo(
    () => getAggregationOptions(chartType, builderSnapshot.aggregation),
    [builderSnapshot.aggregation, chartType]
  );
  const queryPreview = useMemo(
    () => ({
      ...(queryMode === "sql"
        ? {
            sql: builderSnapshot.customSql || builderSnapshot.generatedSql || formatSql(generatedQueryPreview.sql || ""),
            params: [],
            columns: builderSnapshot.queryResult?.columns ?? [],
          }
        : {
            ...generatedQueryPreview,
            sql: builderSnapshot.generatedSql || formatSql(generatedQueryPreview.sql || ""),
          }),
      aggregate: builderSnapshot.aggregation,
      mode: queryMode,
      rowCount: builderSnapshot.queryResult?.rowCount ?? 0,
      columnCount: builderSnapshot.queryResult?.columnCount ?? 0,
      status: builderSnapshot.queryStatus ?? "idle",
      error: builderSnapshot.queryError ?? "",
      lastRunAt: builderSnapshot.lastRunAt ?? "",
    }),
    [builderSnapshot, generatedQueryPreview, queryMode]
  );
  function createConfigSectionsPatch({
    nextChartType = chartType,
    nextFamily = selectedChartFamily ?? selectorDefaults.familyId,
    nextVariant = selectedChartVariant ?? selectorDefaults.variantId,
    nextSettings = chartSettings,
    nextDisplay = displayOptions,
    nextLabels = labelSettings,
    nextMeta = configMeta,
  } = {}) {
    return {
      settings: nextSettings,
      chartSettings: nextSettings,
      display: nextDisplay,
      displayOptions: nextDisplay,
      labels: nextLabels,
      labelSettings: nextLabels,
      meta: {
        ...nextMeta,
        family: nextFamily,
        variant: nextVariant,
        chartType: nextChartType,
      },
      selectedChartFamily: nextFamily,
      selectedChartVariant: nextVariant,
      name: nextLabels.name ?? "",
      title: nextLabels.title ?? "",
      subtitle: nextLabels.subtitle ?? "",
      xLabel: nextLabels.xLabel ?? "",
      yLabel: nextLabels.yLabel ?? "",
      valueFormat: nextLabels.valueFormat ?? "default",
      emptyStateLabel: nextLabels.emptyStateLabel ?? "No rows available",
      colorTheme: nextDisplay.colorTheme ?? "default",
      legendVisible: nextDisplay.showLegend,
      showTooltip: nextDisplay.showTooltip,
      showGrid: nextDisplay.showGrid,
      showAxis: nextDisplay.showAxis,
      showLabels: nextDisplay.showLabels,
      backgroundOpacity: nextDisplay.backgroundOpacity,
      padding: nextDisplay.padding,
      smooth: nextSettings.smooth ?? false,
    };
  }
  function commitRoleMapping(nextMapping, overrides = {}) {
    const bridgeState = createBuilderStateFromRoleMapping(overrides.chartType ?? chartType, nextMapping, {
      selectedDb: overrides.selectedDb ?? selectedDb,
      selectedTable: overrides.selectedTable ?? selectedTable,
    });
    const nextSettings = overrides.settings ?? chartSettings;
    const nextDisplay = overrides.display ?? displayOptions;
    const nextLabels = overrides.labels ?? labelSettings;
    const nextMeta = overrides.meta ?? configMeta;
    const nextState = {
      ...overrides,
      ...clearBuilderMappings(),
      ...bridgeState,
      roleMapping: bridgeState.roleMapping,
      selectedChartCategory: overrides.selectedChartCategory ?? builderSnapshot.selectedChartCategory ?? selectedChartCategory,
      ...createConfigSectionsPatch({
        nextChartType: overrides.chartType ?? chartType,
        nextFamily: overrides.selectedChartFamily ?? builderSnapshot.selectedChartFamily ?? selectedChartFamily,
        nextVariant: overrides.selectedChartVariant ?? builderSnapshot.selectedChartVariant ?? selectedChartVariant,
        nextSettings,
        nextDisplay,
        nextLabels,
        nextMeta,
      }),
    };
    const noChange =
      nextState.selectedDb === builderSnapshot.selectedDb &&
      nextState.selectedTable === builderSnapshot.selectedTable &&
      nextState.chartType === (overrides.chartType ?? builderSnapshot.chartType) &&
      nextState.selectedChartCategory === (builderSnapshot.selectedChartCategory ?? selectedChartCategory) &&
      nextState.selectedChartFamily === (builderSnapshot.selectedChartFamily ?? selectedChartFamily) &&
      nextState.selectedChartVariant === (builderSnapshot.selectedChartVariant ?? selectedChartVariant) &&
      JSON.stringify(nextState.settings) === JSON.stringify(chartSettings) &&
      JSON.stringify(nextState.display) === JSON.stringify(displayOptions) &&
      JSON.stringify(nextState.labels) === JSON.stringify(labelSettings) &&
      JSON.stringify(nextState.roleMapping) === JSON.stringify(builderSnapshot.roleMapping) &&
      nextState.xField === builderSnapshot.xField &&
      nextState.yField === builderSnapshot.yField &&
      nextState.groupField === builderSnapshot.groupField &&
      nextState.sizeField === builderSnapshot.sizeField;

    if (!noChange) {
      setBuilderState(nextState);
    }
  }

  function getDefaultRoleKey(fieldRef) {
    const compatibleRoles = getCompatibleRolesForField(chartType, fieldRef, roleMapping);
    const nextRequired = compatibleRoles.find(
      (role) => role.required && (roleMapping[role.key]?.length ?? 0) < role.min
    );
    return nextRequired?.key ?? compatibleRoles[0]?.key ?? roleAssignments[0]?.key ?? "category";
  }

  function handleAggregationChange(nextAggregation) {
    if (builderSnapshot.aggregation === nextAggregation) return;
    setBuilderState({ aggregation: nextAggregation });
  }

  function handleChartSettingChange(key, value) {
    const nextSettings = {
      ...chartSettings,
      [key]: value,
    };

    setBuilderState(
      createConfigSectionsPatch({
        nextSettings,
      })
    );
  }

  function handleDisplayChange(key, value) {
    const nextDisplay = {
      ...displayOptions,
      [key]: value,
    };

    setBuilderState(
      createConfigSectionsPatch({
        nextDisplay,
      })
    );
  }

  function handleLabelChange(key, value) {
    const nextLabels = {
      ...labelSettings,
      [key]: value,
    };

    setBuilderState(
      createConfigSectionsPatch({
        nextLabels,
      })
    );
  }

  function handleFieldAssign(db, tbl, field, targetRole) {
    const fieldRef = { id: `${db}.${tbl}.${field.name}`, name: field.name, type: field.type, db, tbl };
    const roleKey = targetRole ?? getDefaultRoleKey(fieldRef);

    if (selectedTable && selectedTable !== tbl) {
      const resetMapping = autoMapFieldsForChart(chartType, [fieldRef], {
        [roleKey]: [fieldRef],
      });
      setLastMappingNotice(`Switched to ${tbl} and remapped ${field.name}.`);
      commitRoleMapping(resetMapping, { selectedDb: db, selectedTable: tbl });
      return { changed: true };
    }

    const result = assignFieldToRole(chartType, roleMapping, roleKey, fieldRef);
    if (!result.changed) {
      setLastMappingNotice(result.reason ?? "Field could not be assigned.");
      return result;
    }

    setLastMappingNotice("");
    commitRoleMapping(result.mapping, { selectedDb: db, selectedTable: tbl });
    return result;
  }

  function handleRoleFieldRemove(roleKey, fieldName) {
    setLastMappingNotice("");
    commitRoleMapping(removeFieldFromRole(roleMapping, roleKey, fieldName));
  }

  function handleClearRole(roleKey) {
    setLastMappingNotice("");
    commitRoleMapping(clearRole(roleMapping, roleKey));
  }

  function handleReorderRole(roleKey, nextOrder) {
    commitRoleMapping(reorderRoleFields(roleMapping, roleKey, nextOrder));
  }

  function handleChartTypeChange(nextChartType, source = "manual", selectorState = {}) {
    if (source === "manual") setChartSelectionMode("manual");
    const nextMeta = getChartMeta(nextChartType);
    const nextSelectorDefaults = getChartSelectorDefaults(nextChartType);
    const nextCategoryId = selectorState.selectedCategory ?? nextSelectorDefaults.categoryId;
    const nextFamilyId = selectorState.selectedFamily ?? nextSelectorDefaults.familyId;
    const nextVariantId = selectorState.selectedVariant ?? nextSelectorDefaults.variantId;
    const switchPlan = getChartSwitchPlan(
      nextChartType,
      { ...builderSnapshot, roleMapping, x: previewConfig.x, y: previewConfig.y, groupBy: previewConfig.groupBy, sizeField: previewConfig.sizeField },
      tableFields
    );
    const preservedMapping = preserveCompatibleMapping(nextChartType, roleMapping, availableFields);
    const nextMapping = autoMapFieldsForChart(
      nextChartType,
      availableFields,
      preserveCompatibleMapping(nextChartType, switchPlan.nextMapping ?? preservedMapping, availableFields)
    );
    const nextAggregationOptions = getAggregationOptions(nextChartType, builderSnapshot.aggregation);
    const nextSettings = mergeChartSettingsState(chartSettings, nextChartType, nextFamilyId);

    commitRoleMapping(nextMapping, {
      chartType: nextChartType,
      selectedChartCategory: nextCategoryId,
      selectedChartFamily: nextFamilyId,
      selectedChartVariant: nextVariantId,
      settings: nextSettings,
      display: {
        ...displayOptions,
        showLegend: nextMeta.defaultConfig?.legendVisible ?? displayOptions.showLegend,
        showGrid: nextMeta.defaultConfig?.showGrid ?? displayOptions.showGrid,
      },
      aggregation: nextAggregationOptions[0] ?? builderSnapshot.aggregation,
    });
    setSelectedChartCategory(nextCategoryId);
    setSelectedChartFamily(nextFamilyId);
    setSelectedChartVariant(nextVariantId);

    const missingRoles = getMissingRoleSummary(nextChartType, nextMapping);
    setLastMappingNotice(missingRoles.length ? `${nextMeta.name} still needs ${missingRoles.join(", ")}.` : switchPlan.message);
  }

  function handleChartCategoryChange(nextCategory) {
    if (!nextCategory) return;
    const nextFamilies = selectorFamilyCatalog.filter((family) => family.categories.includes(nextCategory));
    const nextFamily =
      nextFamilies.find((family) => family.id === selectedChartFamily) ??
      nextFamilies[0] ??
      null;
    const nextVariant = pickSelectableVariant(nextFamily?.variants ?? [], [
      (variant) => variant.id === selectedChartVariant,
      (variant) => variant.id === chartType,
      (variant) => variant.chartId === chartType,
    ]);

    if (!nextFamily || !nextVariant || !nextVariant.isSelectable) {
      setLastMappingNotice("No preview-ready variants are available in this family yet.");
      return;
    }

    handleChartTypeChange(nextVariant.id, "manual", {
      selectedCategory: nextCategory,
      selectedFamily: nextFamily.id,
      selectedVariant: nextVariant.id,
    });
  }

  function handleChartFamilyChange(nextFamilyId) {
    const nextFamily = selectorFamilyCatalog.find((family) => family.id === nextFamilyId);
    if (!nextFamily) return;

    const nextVariant = pickSelectableVariant(nextFamily.variants, [
      (variant) => variant.id === selectedChartVariant,
      (variant) => variant.id === chartType,
      (variant) => variant.chartId === chartType,
    ]);

    if (!nextVariant || !nextVariant.isSelectable) {
      setLastMappingNotice("No preview-ready variants are available in this family yet.");
      return;
    }

    handleChartTypeChange(nextVariant.id, "manual", {
      selectedCategory: nextFamily.categories.includes(selectedChartCategory)
        ? selectedChartCategory
        : (nextFamily.primaryCategory ?? nextFamily.categories?.[0] ?? selectedChartCategory),
      selectedFamily: nextFamily.id,
      selectedVariant: nextVariant.id,
    });
  }

  function handleChartVariantChange(nextVariantId) {
    const family =
      selectorFamilyCatalog.find((familyItem) => familyItem.id === selectedChartFamily) ??
      selectorFamilyCatalog.find((familyItem) =>
        familyItem.variants.some((variant) => variant.id === nextVariantId)
      ) ??
      null;
    const variant = family?.variants.find((variantItem) => variantItem.id === nextVariantId) ?? null;
    if (!family || !variant) return;
    if (!variant.isSelectable) {
      setLastMappingNotice(variant.disabledReason || "This variant is not available yet.");
      return;
    }

    handleChartTypeChange(variant.id, "manual", {
      selectedCategory: family.categories.includes(selectedChartCategory)
        ? selectedChartCategory
        : (family.primaryCategory ?? selectedChartCategory),
      selectedFamily: family.id,
      selectedVariant: variant.id,
    });
  }

  function handleQueryModeChange(nextMode) {
    if (nextMode === queryMode) return;
    const nextGeneratedSql = formatSql(generatedQueryPreview.sql || "");
    const nextCustomSql =
      nextMode === "sql"
        ? (builderSnapshot.isDirtySql ? builderSnapshot.customSql : builderSnapshot.customSql || nextGeneratedSql)
        : builderSnapshot.customSql;

    if (
      builderSnapshot.generatedSql === nextGeneratedSql &&
      builderSnapshot.customSql === nextCustomSql
    ) {
      setBuilderState({ queryMode: nextMode });
      return;
    }

    setBuilderState({
      queryMode: nextMode,
      generatedSql: nextGeneratedSql,
      customSql: nextCustomSql,
    });
  }

  function handleSqlChange(nextSql) {
    if (builderSnapshot.customSql === nextSql && builderSnapshot.queryMode === "sql") return;
    setBuilderState({
      queryMode: "sql",
      customSql: nextSql,
      isDirtySql: true,
      queryError: "",
      queryStatus: "idle",
    });
  }

  function applySqlResult(result) {
    const runtimeFields = result?.fieldMeta ?? [];
    const sourceTable = result.meta?.table ?? selectedTable;
    const sourceDb = resolveSourceDb(sourceTable) ?? selectedDb;
    const runtimeAvailableFields = createFieldLookupFromTable(runtimeFields, sourceDb, sourceTable);
    const preservedMapping = preserveCompatibleMapping(chartType, roleMapping, runtimeAvailableFields);
    const nextMapping = autoMapFieldsForChart(chartType, runtimeAvailableFields, preservedMapping);

    commitRoleMapping(nextMapping, {
      selectedDb: sourceDb,
      selectedTable: sourceTable,
      queryResult: {
        rows: result.data ?? [],
        columns: result.columns ?? [],
        fieldMeta: runtimeFields,
        rowCount: result.meta?.rowCount ?? result.data?.length ?? 0,
        columnCount: result.meta?.columnCount ?? result.columns?.length ?? 0,
        sourceTable,
      },
    });
  }

  async function handleRunSql() {
    const sqlText = builderSnapshot.customSql || builderSnapshot.generatedSql || generatedQueryPreview.sql;
    const formattedSql = formatSql(sqlText);

    setBuilderState({
      queryMode: "sql",
      customSql: formattedSql,
      queryStatus: "running",
      queryError: "",
    });

    try {
      const result = await runSqlQuery(formattedSql);
      const sqlPreviewAssessment = evaluatePreviewRows(chartType, roleMapping, result.data ?? []);
      applySqlResult(result);
      setBuilderState({
        generatedSql: formatSql(generatedQueryPreview.sql || ""),
        customSql: formattedSql,
        lastExecutedSql: formattedSql,
        queryError: sqlPreviewAssessment.canRender ? "" : sqlPreviewAssessment.emptyReason,
        queryStatus: sqlPreviewAssessment.canRender
          ? "success"
          : result.data?.length
            ? "invalid_config"
            : "no_rows",
        isDirtySql: true,
        lastRunAt: new Date().toISOString(),
      });
      return result;
    } catch (error) {
      setBuilderState({
        queryError: error?.message || "Unable to run SQL query.",
        queryStatus: "error",
        lastRunAt: new Date().toISOString(),
      });
      return null;
    }
  }

  function handleFormatSql() {
    const sqlText = builderSnapshot.customSql || builderSnapshot.generatedSql || generatedQueryPreview.sql;
    setBuilderState({
      customSql: formatSql(sqlText),
      isDirtySql: true,
    });
  }

  function handleResetSql() {
    const nextGeneratedSql = formatSql(generatedQueryPreview.sql || "");
    setBuilderState({
      generatedSql: nextGeneratedSql,
      customSql: nextGeneratedSql,
      isDirtySql: false,
      queryError: "",
      queryStatus: "idle",
    });
  }

  function handleUseSqlResultForChart() {
    if (!builderSnapshot.queryResult?.rows?.length) return;
    applySqlResult({
      data: builderSnapshot.queryResult.rows,
      columns: builderSnapshot.queryResult.columns,
      fieldMeta: builderSnapshot.queryResult.fieldMeta,
      meta: {
        rowCount: builderSnapshot.queryResult.rowCount,
        columnCount: builderSnapshot.queryResult.columnCount,
        table: builderSnapshot.queryResult.sourceTable,
      },
    });
  }

  async function handleSave() {
    const chartConfig = createBuilderSaveConfig({
      builderState: {
        ...builderSnapshot,
        ...mappedState,
        chartType,
        xField: previewConfig.x,
        xType: previewConfig.xType,
        yField: previewConfig.y,
        yType: previewConfig.yType,
        groupField: previewConfig.groupBy,
        sizeField: previewConfig.sizeField,
        sizeType: previewConfig.sizeType,
        aggregation: previewConfig.aggregate,
        legendVisible: previewConfig.legendVisible,
        showGrid: previewConfig.showGrid,
        showLabels: previewConfig.showLabels,
        smooth: previewConfig.smooth,
        subtitle: previewConfig.subtitle,
        colorTheme: previewConfig.colorTheme,
        xLabel: previewConfig.xLabel,
        yLabel: previewConfig.yLabel,
        settings: chartSettings,
        display: displayOptions,
        labels: labelSettings,
        meta: configMeta,
        roleMapping,
      },
      selectedTable,
      activeChartMeta: { label: chartMeta.name },
    });

    if (isEditing) {
      updateChart(builderSnapshot.editingChartId, chartConfig);
      navigate("/dashboard");
    } else {
      await saveChartAction({ name: chartConfig.name, config: chartConfig });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }

    clearPreviewChart();
    resetBuilderState();
  }

  return {
    sourceSummary: {
      selectedDb,
      selectedTable,
      tableData,
      tableFields,
      queryMode,
      queryResult: builderSnapshot.queryResult,
      availableFields,
      roleAssignments,
      roleMapping,
      lastMappingNotice,
    },
    previewSummary: {
      chartDefinition,
      activeChartLabel: chartMeta.name,
      activeChartMeta: chartMeta,
      previewChart,
      previewData: previewRows,
      previewChartType: activePreviewChartType,
      previewConfig: activePreviewConfig,
      queryPreview,
      readinessLabel,
      mappedCount,
      mappedTarget,
      slotAssignments,
      roleAssignments,
      validationSummary,
      previewSupported: previewFallback.useFallback ? true : chartMeta.previewSupported,
      rendererSupport: activeRendererSupport,
      previewState,
      missingRequirements,
      canRenderPreview,
      completedRequiredRoleCount,
      requiredRoleCount,
    },
    configSummary: {
      chartDefinition,
      suggestionResult,
      chartType,
      activeChartMeta: chartMeta,
      activeChartFamilyMeta,
      activeChartVariantMeta,
      chartCatalog: catalogWithCompatibility,
      chartSelectorFamilies: selectorFamilyCatalog,
      chartSelectorCategories: selectorCategories.map((category) => ({
        ...category,
        count: selectorFamilyCatalog.filter((family) => family.categories.includes(category.id)).length,
      })),
      visibleChartFamilies,
      visibleChartVariants,
      rendererSupport: activeRendererSupport,
      selectedChartCategory,
      selectedChartFamily,
      selectedChartVariant,
      recommendedCharts,
      saveSuccess,
      canAddChart,
      validationSummary,
      aggregation: builderSnapshot.aggregation,
      aggregationOptions,
      queryMode,
      generatedSql: builderSnapshot.generatedSql || formatSql(generatedQueryPreview.sql || ""),
      customSql: builderSnapshot.customSql || "",
      lastExecutedSql: builderSnapshot.lastExecutedSql || "",
      queryResult: builderSnapshot.queryResult,
      queryError: builderSnapshot.queryError || "",
      queryStatus: builderSnapshot.queryStatus || "idle",
      isDirtySql: builderSnapshot.isDirtySql || false,
      lastRunAt: builderSnapshot.lastRunAt || "",
      previewState,
      slotAssignments,
      roleAssignments,
      roleConfig,
      roleValidation,
      chartSettings,
      displayOptions,
      labelSettings,
      normalizedConfig: previewConfig,
      name: labelSettings.name,
      title: labelSettings.title,
      subtitle: labelSettings.subtitle ?? "",
      colorTheme: displayOptions.colorTheme ?? "default",
      legendVisible: displayOptions.showLegend,
      showGrid: displayOptions.showGrid,
      showLabels: displayOptions.showLabels ?? false,
      xLabel: labelSettings.xLabel ?? "",
      yLabel: labelSettings.yLabel ?? "",
      lastMappingNotice,
    },
    workspaceSummary: {
      isEditing,
      activeChartLabel: chartMeta.name,
      chartFamily: chartMeta.category,
      selectedTable,
      readinessLabel,
      nextStep: validationSummary.nextStep,
      blockerCount: validationSummary.blockers.length,
      cautionCount: validationSummary.cautions.length,
      mappedCount,
      mappedTarget,
    },
    handleChartTypeChange,
    handleChartCategoryChange,
    handleChartFamilyChange,
    handleChartVariantChange,
    handleChartSettingChange,
    handleDisplayChange,
    handleLabelChange,
    handleAggregationChange,
    handleFieldAssign,
    clearSlot: handleClearRole,
    handleRoleFieldRemove,
    handleClearRole,
    handleReorderRole,
    handleSave,
    handleQueryModeChange,
    handleSqlChange,
    handleRunSql,
    handleFormatSql,
    handleResetSql,
    handleUseSqlResultForChart,
    canAssignFieldToRole: (roleKey, field) => {
      const compatible = getCompatibleRolesForField(chartType, field, roleMapping).find(
        (role) => role.key === roleKey
      );
      return compatible?.decision ?? { ok: false, reason: "Incompatible field" };
    },
    getFieldRoleHints: (field) => getFieldRoleHints(chartType, field, roleMapping),
    findFieldInSchema: (fieldName) => findFieldInSchema(schema, fieldName),
  };
}
