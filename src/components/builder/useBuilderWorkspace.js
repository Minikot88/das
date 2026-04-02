import { useEffect, useMemo, useState } from "react";
import { schema } from "../../data/mockData";
import { getBuilderChartCatalog, getChartMeta, getRecommendedCharts } from "../../utils/chartCatalog";
import { getChartCompatibility } from "../../utils/chartCompatibility";
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
  const isEditing = !!builderState.editingChartId;
  const [chartSelectionMode, setChartSelectionMode] = useState("auto");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [previewRows, setPreviewRows] = useState([]);
  const [lastMappingNotice, setLastMappingNotice] = useState("");

  const selectedDb = builderState.selectedDb;
  const selectedTable = builderState.selectedTable;
  const chartType = builderState.chartType;
  const queryMode = builderState.queryMode ?? "visual";
  const tableInfo = selectedDb && selectedTable ? schema[selectedDb]?.[selectedTable] : null;
  const tableData = tableInfo?.data ?? [];
  const tableFields = resolveRuntimeFields(builderState, tableInfo?.fields ?? []);
  const availableFields = useMemo(
    () => createFieldLookupFromTable(tableFields, selectedDb, selectedTable),
    [selectedDb, selectedTable, tableFields]
  );
  const chartCatalog = useMemo(() => getBuilderChartCatalog(), []);
  const chartMeta = useMemo(() => getChartMeta(chartType), [chartType]);
  const roleConfig = useMemo(() => getChartRoleConfig(chartType), [chartType]);
  const roleMapping = useMemo(
    () =>
      createRoleMappingFromConfig(builderState, chartType, {
        tableFields,
        selectedDb,
        selectedTable,
      }),
    [builderState, chartType, selectedDb, selectedTable, tableFields]
  );
  const mappedState = useMemo(
    () => createBuilderStateFromRoleMapping(chartType, roleMapping, { selectedDb, selectedTable }),
    [chartType, roleMapping, selectedDb, selectedTable]
  );
  const previewConfig = useMemo(
    () =>
      normalizeChartConfig({
        ...builderState,
        ...mappedState,
        ...createBuilderQueryInput({
          ...builderState,
          ...mappedState,
          chartType,
        }),
      }),
    [builderState, chartType, mappedState]
  );
  const catalogWithCompatibility = useMemo(
    () =>
      chartCatalog.map((chart) => ({
        ...chart,
        compatibility: getChartCompatibility(chart.id, { ...builderState, ...previewConfig }, tableFields),
      })),
    [builderState, chartCatalog, previewConfig, tableFields]
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
      getRecommendedCharts(previewConfig, tableFields).map((chart) => ({
        ...chart,
        compatibility: getChartCompatibility(chart.id, { ...builderState, ...previewConfig }, tableFields),
      })),
    [builderState, previewConfig, tableFields]
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
  const roleAssignments = useMemo(() => getRoleAssignments(chartType, roleMapping), [chartType, roleMapping]);
  const roleValidation = useMemo(
    () =>
      validateRoleMapping(chartType, roleMapping, {
        selectedTable,
        previewSupported: chartMeta.previewSupported,
      }),
    [chartMeta.previewSupported, chartType, roleMapping, selectedTable]
  );
  const validationSummary = useMemo(
    () => createValidationSummary(roleValidation, selectedTable),
    [roleValidation, selectedTable]
  );
  const slotAssignments = useMemo(
    () =>
      createSlotAssignments({
        builderState: {
          ...builderState,
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
    [builderState, chartMeta.slots, mappedState, previewConfig, tableFields]
  );
  const builderQueryInput = useMemo(
    () => ({
      ...createBuilderQueryInput({
        ...builderState,
        ...mappedState,
        chartType,
        aggregation: builderState.aggregation,
      }),
      chartType: chartMeta.renderType ?? chartType,
    }),
    [builderState, chartMeta.renderType, chartType, mappedState]
  );
  const previewReady = useMemo(
    () =>
      Boolean(selectedTable) &&
      chartMeta.previewSupported &&
      validationSummary.blockers.length === 0 &&
      slotAssignments.some((slot) => slot.field) &&
      (queryMode === "visual" || (builderState.queryResult?.rows?.length ?? 0) > 0),
    [builderState.queryResult?.rows?.length, chartMeta.previewSupported, queryMode, selectedTable, slotAssignments, validationSummary.blockers.length]
  );

  useEffect(() => {
    if (!isEditing) setChartSelectionMode("auto");
  }, [chartType, isEditing, roleMapping]);

  useEffect(() => {
    const suggested = suggestionResult?.suggested;
    if (!suggested || chartSelectionMode === "manual" || isEditing || chartType === suggested) return;
    handleChartTypeChange(suggested, "auto");
  }, [chartSelectionMode, chartType, isEditing, suggestionResult]);

  useEffect(() => {
    if (previewReady) setPreviewChart({ config: previewConfig });
    else clearPreviewChart();
  }, [clearPreviewChart, previewConfig, previewReady, setPreviewChart]);

  useEffect(() => () => clearPreviewChart(), [clearPreviewChart]);

  useEffect(() => {
    let cancelled = false;
    if (!previewReady || queryMode === "sql") {
      setPreviewRows([]);
      return undefined;
    }
    runQuery(builderQueryInput)
      .then((result) => {
        if (!cancelled) {
          setPreviewRows(result.data ?? []);
          setBuilderState({
            generatedSql: formatSql(result.sql ?? ""),
            queryResult: {
              rows: result.data ?? [],
              columns: result.columns ?? [],
              fieldMeta: result.fieldMeta ?? [],
              rowCount: result.meta?.rowCount ?? result.data?.length ?? 0,
              columnCount: result.meta?.columnCount ?? result.columns?.length ?? 0,
              sourceTable: result.meta?.table ?? selectedTable,
            },
            queryError: "",
            queryStatus: "success",
            lastRunAt: new Date().toISOString(),
          });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setPreviewRows([]);
          setBuilderState({
            queryError: error?.message || "Unable to run visual query.",
            queryStatus: "error",
            lastRunAt: new Date().toISOString(),
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [builderQueryInput, previewReady, queryMode, selectedTable, setBuilderState]);

  const canAddChart = validationSummary.blockers.length === 0
    && (queryMode !== "sql" || builderState.queryStatus === "success");
  const mappedCount = roleAssignments.filter((role) => role.fields.length).length;
  const mappedTarget = roleAssignments.filter((role) => role.required).length;
  const readinessLabel = createReadinessLabel({
    saveSuccess,
    canAddChart,
    cautionCount: validationSummary.cautions.length,
  });
  const aggregationOptions = useMemo(
    () => getAggregationOptions(chartType, builderState.aggregation),
    [builderState.aggregation, chartType]
  );
  const generatedQueryPreview = useMemo(() => buildQuery(builderQueryInput), [builderQueryInput]);
  const queryPreview = useMemo(
    () => ({
      ...(queryMode === "sql"
        ? {
            sql: builderState.customSql || builderState.generatedSql || formatSql(generatedQueryPreview.sql || ""),
            params: [],
            columns: builderState.queryResult?.columns ?? [],
          }
        : {
            ...generatedQueryPreview,
            sql: builderState.generatedSql || formatSql(generatedQueryPreview.sql || ""),
          }),
      aggregate: builderState.aggregation,
      mode: queryMode,
      rowCount: builderState.queryResult?.rowCount ?? 0,
      columnCount: builderState.queryResult?.columnCount ?? 0,
      status: builderState.queryStatus ?? "idle",
      error: builderState.queryError ?? "",
      lastRunAt: builderState.lastRunAt ?? "",
    }),
    [builderState, generatedQueryPreview, queryMode]
  );
  const requiredRoleCount = roleAssignments.filter((role) => role.required).length;
  const completedRequiredRoleCount = roleAssignments.filter(
    (role) => role.required && role.state.status === "valid"
  ).length;

  function commitRoleMapping(nextMapping, overrides = {}) {
    const bridgeState = createBuilderStateFromRoleMapping(overrides.chartType ?? chartType, nextMapping, {
      selectedDb: overrides.selectedDb ?? selectedDb,
      selectedTable: overrides.selectedTable ?? selectedTable,
    });

    setBuilderState({
      ...overrides,
      ...clearBuilderMappings(),
      ...bridgeState,
      roleMapping: bridgeState.roleMapping,
    });
  }

  function getDefaultRoleKey(fieldRef) {
    const compatibleRoles = getCompatibleRolesForField(chartType, fieldRef, roleMapping);
    const nextRequired = compatibleRoles.find(
      (role) => role.required && (roleMapping[role.key]?.length ?? 0) < role.min
    );
    return nextRequired?.key ?? compatibleRoles[0]?.key ?? roleAssignments[0]?.key ?? "category";
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

  function handleChartTypeChange(nextChartType, source = "manual") {
    if (source === "manual") setChartSelectionMode("manual");
    const nextMeta = getChartMeta(nextChartType);
    const preservedMapping = preserveCompatibleMapping(nextChartType, roleMapping, availableFields);
    const nextMapping = autoMapFieldsForChart(nextChartType, availableFields, preservedMapping);
    const nextAggregationOptions = getAggregationOptions(nextChartType, builderState.aggregation);

    commitRoleMapping(nextMapping, {
      chartType: nextChartType,
      legendVisible: nextMeta.defaultConfig?.legendVisible ?? builderState.legendVisible,
      showGrid: nextMeta.defaultConfig?.showGrid ?? builderState.showGrid,
      smooth: nextMeta.defaultConfig?.smooth ?? builderState.smooth,
      aggregation: nextAggregationOptions[0] ?? builderState.aggregation,
    });

    const missingRoles = getMissingRoleSummary(nextChartType, nextMapping);
    setLastMappingNotice(
      missingRoles.length
        ? `${nextMeta.name} still needs ${missingRoles.join(", ")}.`
        : `${nextMeta.name} preserved compatible mappings.`
    );
  }

  function handleQueryModeChange(nextMode) {
    if (nextMode === queryMode) return;
    const nextGeneratedSql = formatSql(generatedQueryPreview.sql || "");

    setBuilderState({
      queryMode: nextMode,
      generatedSql: nextGeneratedSql,
      customSql:
        nextMode === "sql"
          ? (builderState.isDirtySql ? builderState.customSql : builderState.customSql || nextGeneratedSql)
          : builderState.customSql,
    });
  }

  function handleSqlChange(nextSql) {
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
    const sqlText = builderState.customSql || builderState.generatedSql || generatedQueryPreview.sql;
    const formattedSql = formatSql(sqlText);

    setBuilderState({
      queryMode: "sql",
      customSql: formattedSql,
      queryStatus: "running",
      queryError: "",
    });

    try {
      const result = await runSqlQuery(formattedSql);
      setPreviewRows([]);
      applySqlResult(result);
      setBuilderState({
        generatedSql: formatSql(generatedQueryPreview.sql || ""),
        customSql: formattedSql,
        lastExecutedSql: formattedSql,
        queryError: result.data?.length ? "" : "Query returned no rows.",
        queryStatus: result.data?.length ? "success" : "empty",
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
    const sqlText = builderState.customSql || builderState.generatedSql || generatedQueryPreview.sql;
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
    if (!builderState.queryResult?.rows?.length) return;
    applySqlResult({
      data: builderState.queryResult.rows,
      columns: builderState.queryResult.columns,
      fieldMeta: builderState.queryResult.fieldMeta,
      meta: {
        rowCount: builderState.queryResult.rowCount,
        columnCount: builderState.queryResult.columnCount,
        table: builderState.queryResult.sourceTable,
      },
    });
  }

  async function handleSave() {
    const chartConfig = createBuilderSaveConfig({
      builderState: {
        ...builderState,
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
        roleMapping,
      },
      selectedTable,
      activeChartMeta: { label: chartMeta.name },
    });

    if (isEditing) {
      updateChart(builderState.editingChartId, chartConfig);
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
      queryResult: builderState.queryResult,
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
      previewData: queryMode === "sql" ? builderState.queryResult?.rows ?? [] : previewRows,
      queryPreview,
      readinessLabel,
      mappedCount,
      mappedTarget,
      slotAssignments,
      roleAssignments,
      validationSummary,
      previewSupported: chartMeta.previewSupported,
      completedRequiredRoleCount,
      requiredRoleCount,
    },
    configSummary: {
      chartDefinition,
      suggestionResult,
      chartType,
      activeChartMeta: chartMeta,
      chartCatalog: catalogWithCompatibility,
      recommendedCharts,
      saveSuccess,
      canAddChart,
      validationSummary,
      aggregation: builderState.aggregation,
      aggregationOptions,
      queryMode,
      generatedSql: builderState.generatedSql || formatSql(generatedQueryPreview.sql || ""),
      customSql: builderState.customSql || "",
      lastExecutedSql: builderState.lastExecutedSql || "",
      queryResult: builderState.queryResult,
      queryError: builderState.queryError || "",
      queryStatus: builderState.queryStatus || "idle",
      isDirtySql: builderState.isDirtySql || false,
      lastRunAt: builderState.lastRunAt || "",
      slotAssignments,
      roleAssignments,
      roleConfig,
      roleValidation,
      name: builderState.name,
      title: builderState.title,
      subtitle: builderState.subtitle ?? "",
      colorTheme: builderState.colorTheme ?? "default",
      legendVisible: builderState.legendVisible,
      showGrid: builderState.showGrid,
      showLabels: builderState.showLabels ?? false,
      xLabel: builderState.xLabel ?? "",
      yLabel: builderState.yLabel ?? "",
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
