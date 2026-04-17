import { useEffect, useRef, useState } from "react";
import { evaluatePreviewRows } from "../../utils/builderChartUtils";
import { formatSql, runQuery } from "../../utils/queryEngine";

function areArraysEqual(left = [], right = []) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function isSameQueryResult(left = null, right = null) {
  if (!left && !right) return true;
  if (!left || !right) return false;

  return (
    left.rowCount === right.rowCount &&
    left.columnCount === right.columnCount &&
    left.sourceTable === right.sourceTable &&
    areArraysEqual(left.columns, right.columns) &&
    areArraysEqual(left.fieldMeta, right.fieldMeta) &&
    areArraysEqual(left.rows, right.rows)
  );
}

function isSamePreviewState(left = null, right = null) {
  if (!left && !right) return true;
  if (!left || !right) return false;
  return left.status === right.status && left.error === right.error;
}

function createSerializableQueryResult(result = {}, selectedTable = null) {
  return {
    rows: Array.isArray(result?.data) ? result.data : Array.isArray(result?.rows) ? result.rows : [],
    columns: Array.isArray(result?.columns) ? result.columns : [],
    fieldMeta: Array.isArray(result?.fieldMeta) ? result.fieldMeta : [],
    rowCount: result?.meta?.rowCount ?? result?.rowCount ?? result?.data?.length ?? result?.rows?.length ?? 0,
    columnCount: result?.meta?.columnCount ?? result?.columnCount ?? result?.columns?.length ?? 0,
    sourceTable: result?.meta?.table ?? result?.sourceTable ?? selectedTable,
  };
}

function createPreviewState(status, error = "") {
  return { status, error };
}

function getBasePreviewState({ selectedTable, previewReadiness, previewReady }) {
  if (!selectedTable) return createPreviewState("idle");

  if (!previewReady) {
    if ((previewReadiness?.canAttemptPreview ?? true) === false && previewReadiness?.blockers?.length) {
      return createPreviewState(
        "missing_required_mappings",
        previewReadiness.blockers[0]?.title || "Map required fields."
      );
    }

    if ((previewReadiness?.canAttemptPreview ?? true) === false) {
      return createPreviewState(
        "unsupported_chart",
        previewReadiness?.message || "This chart is not available for preview."
      );
    }
  }

  return createPreviewState("idle");
}

export default function useBuilderPreview({
  builderSnapshot,
  setBuilderState,
  clearPreviewChart,
  previewConfig,
  previewReady,
  previewReadiness,
  queryMode,
  chartType,
  roleMapping,
  selectedTable,
  tableData,
  tableFields,
  builderQueryInput,
  generatedQueryPreviewSql,
  useDirectPreviewData,
  setPreviewChart,
  sourcePreviewRows,
}) {
  const [previewRows, setPreviewRows] = useState([]);
  const [previewState, setPreviewState] = useState(createPreviewState("idle"));
  const previewSignatureRef = useRef("");
  const visualQuerySignatureRef = useRef("");
  const latestQueryStoreRef = useRef({
    generatedSql: builderSnapshot.generatedSql,
    queryResult: builderSnapshot.queryResult,
    queryError: builderSnapshot.queryError,
    queryStatus: builderSnapshot.queryStatus,
    lastRunAt: builderSnapshot.lastRunAt,
  });

  const previewSignature = JSON.stringify({
    previewReady,
    chartType: previewConfig.chartType,
    dataset: previewConfig.dataset,
    x: previewConfig.x,
    y: previewConfig.y,
    groupBy: previewConfig.groupBy,
    sizeField: previewConfig.sizeField,
    aggregate: previewConfig.aggregate,
    title: previewConfig.title,
    subtitle: previewConfig.subtitle,
    xLabel: previewConfig.xLabel,
    yLabel: previewConfig.yLabel,
    legendVisible: previewConfig.legendVisible,
    showGrid: previewConfig.showGrid,
    showLabels: previewConfig.showLabels,
    colorTheme: previewConfig.colorTheme,
    smooth: previewConfig.smooth,
    settings: previewConfig.settings,
    display: previewConfig.display,
    labels: previewConfig.labels,
  });

  const visualQuerySignature = JSON.stringify({
    queryMode,
    selectedTable,
    chartType: builderQueryInput.chartType,
    dataset: builderQueryInput.dataset,
    x: builderQueryInput.x,
    y: builderQueryInput.y,
    groupBy: builderQueryInput.groupBy,
    sizeField: builderQueryInput.sizeField,
    aggregate: builderQueryInput.aggregate,
    direct: useDirectPreviewData,
  });

  useEffect(() => {
    latestQueryStoreRef.current = {
      generatedSql: builderSnapshot.generatedSql,
      queryResult: builderSnapshot.queryResult,
      queryError: builderSnapshot.queryError,
      queryStatus: builderSnapshot.queryStatus,
      lastRunAt: builderSnapshot.lastRunAt,
    };
  }, [
    builderSnapshot.generatedSql,
    builderSnapshot.lastRunAt,
    builderSnapshot.queryError,
    builderSnapshot.queryResult,
    builderSnapshot.queryStatus,
  ]);

  function syncPreviewRows(nextRows) {
    setPreviewRows((currentRows) => (areArraysEqual(currentRows, nextRows) ? currentRows : nextRows));
  }

  function syncPreviewState(nextState) {
    setPreviewState((currentState) => (isSamePreviewState(currentState, nextState) ? currentState : nextState));
  }

  function commitQueryStatePatch(patch) {
    const currentQueryState = latestQueryStoreRef.current;
    const nextQueryState = {
      ...currentQueryState,
      ...patch,
    };
    const hasChanges =
      currentQueryState.generatedSql !== nextQueryState.generatedSql ||
      currentQueryState.queryError !== nextQueryState.queryError ||
      currentQueryState.queryStatus !== nextQueryState.queryStatus ||
      currentQueryState.lastRunAt !== nextQueryState.lastRunAt ||
      !isSameQueryResult(currentQueryState.queryResult, nextQueryState.queryResult);

    if (!hasChanges) return false;

    latestQueryStoreRef.current = nextQueryState;
    setBuilderState(patch);
    return true;
  }

  useEffect(() => {
    if (!previewReady) {
      if (previewSignatureRef.current) {
        previewSignatureRef.current = "";
        clearPreviewChart();
      }
      syncPreviewRows([]);
      syncPreviewState(
        getBasePreviewState({
          selectedTable,
          previewReadiness,
          previewReady,
        })
      );
      return;
    }

    if (previewSignatureRef.current === previewSignature) return;
    previewSignatureRef.current = previewSignature;
    setPreviewChart({ config: previewConfig });
  }, [clearPreviewChart, previewConfig, previewReadiness, previewReady, previewSignature, selectedTable, setPreviewChart]);

  useEffect(() => () => clearPreviewChart(), [clearPreviewChart]);

  useEffect(() => {
    if (queryMode !== "visual" || useDirectPreviewData) return;

    if (
      previewReadiness.canAttemptPreview &&
      previewReadiness.rowAssessment.hasRows &&
      !previewReadiness.rowAssessment.canRender
    ) {
      syncPreviewRows([]);
      syncPreviewState(createPreviewState("invalid_config", previewReadiness.rowAssessment.emptyReason));
      return;
    }

    syncPreviewRows([]);
    syncPreviewState(createPreviewState("idle"));

    const nextGeneratedSql = formatSql(generatedQueryPreviewSql || "");
    commitQueryStatePatch({
      generatedSql: nextGeneratedSql,
      queryResult: null,
      queryError: "",
      queryStatus: "idle",
    });
  }, [generatedQueryPreviewSql, previewReadiness, queryMode, useDirectPreviewData]);

  useEffect(() => {
    if (!previewReady || queryMode !== "sql") return;

    const nextRows = Array.isArray(builderSnapshot.queryResult?.rows) ? builderSnapshot.queryResult.rows : [];
    const sqlPreviewAssessment = evaluatePreviewRows(chartType, roleMapping, nextRows);
    const nextStatus = sqlPreviewAssessment.canRender
      ? "success"
      : nextRows.length
        ? "invalid_config"
        : "no_rows";

    syncPreviewRows(nextRows);
    syncPreviewState(createPreviewState(
      nextStatus,
      nextStatus === "success" ? "" : sqlPreviewAssessment.emptyReason
    ));
  }, [
    builderSnapshot.queryResult?.rows,
    chartType,
    previewReady,
    queryMode,
    roleMapping,
  ]);

  useEffect(() => {
    if (!previewReady || queryMode !== "visual" || !useDirectPreviewData) return;

    const nextRows = Array.isArray(tableData) ? tableData : [];
    const directPreviewAssessment = evaluatePreviewRows(chartType, roleMapping, nextRows);
    const nextStatus = directPreviewAssessment.canRender
      ? "success"
      : nextRows.length
        ? "invalid_config"
        : "no_rows";
    const nextGeneratedSql = formatSql(generatedQueryPreviewSql || "");
    const nextQueryResult = createSerializableQueryResult(
      {
        data: nextRows,
        columns: tableFields.map((field) => field.name),
        fieldMeta: tableFields,
        rowCount: nextRows.length,
        columnCount: tableFields.length,
        sourceTable: selectedTable,
      },
      selectedTable
    );

    syncPreviewRows(nextRows);
    syncPreviewState(createPreviewState(
      nextStatus,
      nextStatus === "success" ? "" : directPreviewAssessment.emptyReason
    ));
    visualQuerySignatureRef.current = visualQuerySignature;

    commitQueryStatePatch({
      generatedSql: nextGeneratedSql,
      queryResult: nextQueryResult,
      queryError: nextStatus === "success" ? "" : directPreviewAssessment.emptyReason,
      queryStatus: nextStatus,
    });
  }, [
    chartType,
    generatedQueryPreviewSql,
    previewReady,
    queryMode,
    roleMapping,
    selectedTable,
    tableData,
    tableFields,
    useDirectPreviewData,
    visualQuerySignature,
  ]);

  useEffect(() => {
    let cancelled = false;
    if (!previewReady || useDirectPreviewData) {
      syncPreviewRows([]);
      syncPreviewState(
        getBasePreviewState({
          selectedTable,
          previewReadiness,
          previewReady,
        })
      );
      visualQuerySignatureRef.current = "";
      return undefined;
    }

    if (queryMode === "sql") {
      visualQuerySignatureRef.current = "";
      return undefined;
    }

    if (visualQuerySignatureRef.current === visualQuerySignature) {
      return undefined;
    }

    visualQuerySignatureRef.current = visualQuerySignature;
    syncPreviewState(createPreviewState("loading"));

    commitQueryStatePatch({
      queryError: "",
      queryStatus: "running",
    });

    runQuery(builderQueryInput)
      .then((result) => {
        if (cancelled) return;

        const nextRows = Array.isArray(result.data) ? result.data : [];
        const queryPreviewAssessment = evaluatePreviewRows(chartType, roleMapping, nextRows);
        const nextQueryResult = createSerializableQueryResult(result, selectedTable);
        const nextGeneratedSql = formatSql(result.sql ?? "");
        const nextQueryStatus = queryPreviewAssessment.canRender
          ? "success"
          : nextRows.length
            ? "invalid_config"
            : "no_rows";
        const nextQueryError = nextQueryStatus === "success" ? "" : queryPreviewAssessment.emptyReason;

        syncPreviewRows(nextRows);
        syncPreviewState(createPreviewState(nextQueryStatus, nextQueryError));

        commitQueryStatePatch({
          generatedSql: nextGeneratedSql,
          queryResult: nextQueryResult,
          queryError: nextQueryError,
          queryStatus: nextQueryStatus,
          lastRunAt: new Date().toISOString(),
        });
      })
      .catch((error) => {
        if (cancelled) return;

        syncPreviewRows([]);
        const nextError = error?.message || "Unable to run visual query.";
        syncPreviewState(createPreviewState("render_error", nextError));
        commitQueryStatePatch({
          queryError: nextError,
          queryStatus: "render_error",
          lastRunAt: new Date().toISOString(),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [
    builderQueryInput,
    chartType,
    previewReady,
    queryMode,
    roleMapping,
    selectedTable,
    previewReadiness,
    useDirectPreviewData,
    visualQuerySignature,
  ]);

  return {
    previewRows,
    previewState,
  };
}
