import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { PageContainer, WorkspaceLayout } from "../components/layout/Layout";
import BuilderDataPane from "../components/builder/BuilderDataPane";
import BuilderPreviewPane from "../components/builder/BuilderPreviewPane";
import BuilderConfigPane from "../components/builder/BuilderConfigPane";
import useBuilderWorkspace from "../components/builder/useBuilderWorkspace";
import { createBuilderSaveConfig } from "../components/builder/builderStateUtils";
import { runQuery } from "../utils/queryEngine";
import { useStore } from "../store/useStore";
import { loadBuilderDraft } from "../utils/storage";
import {
  getBuilderContext,
  getChartTypeLabel,
  getTargetDashboard,
  validateBuilderContext,
} from "../utils/builderChartUtils";
import {
  createBuilderContextForDashboard,
  createBuilderReturnState,
  createWidgetFromBuilder,
} from "../utils/dashboardWorkspace";

function getBuilderContextFromState(routeState, fallbackContext) {
  return getBuilderContext(routeState, fallbackContext);
}

export default function BuilderPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const projects = useStore((state) => state.projects);
  const charts = useStore((state) => state.charts);
  const updateChart = useStore((state) => state.updateChart);
  const builderState = useStore((state) => state.builderState);
  const setBuilderState = useStore((state) => state.setBuilderState);
  const resetBuilderState = useStore((state) => state.resetBuilderState);
  const previewChart = useStore((state) => state.previewChart);
  const setPreviewChart = useStore((state) => state.setPreviewChart);
  const clearPreviewChart = useStore((state) => state.clearPreviewChart);
  const setActiveProject = useStore((state) => state.setActiveProject);
  const activeProjectId = useStore((state) => state.activeProjectId);
  const activeSheetId = useStore((state) => state.activeSheetId);
  const activeDashboardId = useStore((state) => state.activeDashboardId);
  const setActiveSheet = useStore((state) => state.setActiveSheet);
  const setActiveDashboard = useStore((state) => state.setActiveDashboard);
  const saveChartToDashboardContext = useStore((state) => state.saveChartToDashboardContext);
  const builderNavigationContext = useStore((state) => state.builderNavigationContext);
  const builderDraft = useStore((state) => state.builderDraft);
  const setBuilderNavigationContext = useStore((state) => state.setBuilderNavigationContext);
  const clearBuilderNavigationContext = useStore((state) => state.clearBuilderNavigationContext);
  const startBuilderDraft = useStore((state) => state.startBuilderDraft);
  const hydrateBuilderDraft = useStore((state) => state.hydrateBuilderDraft);
  const clearBuilderDraftState = useStore((state) => state.clearBuilderDraftState);

  const [contextError, setContextError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [draftFeedback, setDraftFeedback] = useState("");
  const draftFeedbackTimerRef = useRef(null);

  const fallbackContext = useMemo(
    () =>
      createBuilderContextForDashboard({
        projectId: activeProjectId,
        sheetId: activeSheetId,
        dashboardId: activeDashboardId,
        returnTo: "/dashboard",
      }),
    [activeDashboardId, activeProjectId, activeSheetId]
  );

  const builderContext = useMemo(
    () =>
      getBuilderContextFromState(location.state, builderNavigationContext) ??
      fallbackContext ??
      (builderDraft
        ? {
            projectId: builderDraft.projectId,
            sheetId: builderDraft.sheetId,
            dashboardId: builderDraft.dashboardId,
            source: "dashboard",
            returnTo: "/dashboard",
          }
        : null),
    [builderDraft, builderNavigationContext, fallbackContext, location.state]
  );

  useEffect(() => () => window.clearTimeout(draftFeedbackTimerRef.current), []);

  const validation = useMemo(() => validateBuilderContext(builderContext, projects), [builderContext, projects]);
  const targetDashboard = useMemo(() => getTargetDashboard(builderContext, projects), [builderContext, projects]);
  const contextLabels = useMemo(
    () =>
      validation.isValid
        ? {
            project: validation.project?.name ?? builderContext.projectId,
            sheet: validation.sheet?.name ?? builderContext.sheetId,
            dashboard: validation.dashboard?.name ?? builderContext.dashboardId,
          }
        : null,
    [builderContext, validation]
  );

  const projectCharts = useMemo(
    () => charts.filter((chart) => chart.projectId === builderContext?.projectId),
    [builderContext?.projectId, charts]
  );

  useEffect(() => {
    if (location.state?.builderContext) {
      setBuilderNavigationContext(location.state.builderContext);
    }
  }, [location.state, setBuilderNavigationContext]);

  useEffect(() => {
    if (!builderContext || !validation.isValid) return;
    const hasActiveDraft =
      builderDraft?.projectId === builderContext.projectId &&
      builderDraft?.sheetId === builderContext.sheetId &&
      builderDraft?.dashboardId === builderContext.dashboardId;

    if (hasActiveDraft) return;

    const persistedDraft = loadBuilderDraft();
    const hasPersistedDraft =
      persistedDraft?.projectId === builderContext.projectId &&
      persistedDraft?.sheetId === builderContext.sheetId &&
      persistedDraft?.dashboardId === builderContext.dashboardId;

    if (hasPersistedDraft) {
      hydrateBuilderDraft(builderContext);
      return;
    }

    startBuilderDraft(builderContext);
  }, [
    builderContext,
    builderDraft,
    hydrateBuilderDraft,
    startBuilderDraft,
    validation.isValid,
  ]);

  useEffect(() => {
    if (!builderContext) {
      setContextError("Builder unavailable.");
      return;
    }

    if (!validation.isValid) {
      setContextError("Context unavailable.");
      return;
    }

    setContextError("");
    setActiveProject(builderContext.projectId);
    setActiveSheet(builderContext.sheetId);
    setActiveDashboard(builderContext.dashboardId);
  }, [builderContext, setActiveDashboard, setActiveProject, setActiveSheet, validation.isValid]);

  const handleCancelAndReturn = () => {
    if (builderDraft?.isDirty) {
      const shouldDiscard = window.confirm("Discard draft?");
      if (!shouldDiscard) return;
    }
    clearBuilderDraftState();
    clearPreviewChart();
    clearBuilderNavigationContext();
    navigate(builderContext?.returnTo || "/dashboard", {
      replace: true,
      state: createBuilderReturnState(builderContext),
    });
  };

  const {
    sourceSummary,
    previewSummary,
    configSummary,
    workspaceSummary,
    handleChartTypeChange,
    handleChartCategoryChange,
    handleChartFamilyChange,
    handleChartVariantChange,
    handleChartSettingChange,
    handleDisplayChange,
    handleLabelChange,
    handleAggregationChange,
    handleFieldAssign,
    clearSlot,
    handleRoleFieldRemove,
    handleReorderRole,
    canAssignFieldToRole,
    getFieldRoleHints,
    handleQueryModeChange,
    handleSqlChange,
    handleRunSql,
    handleFormatSql,
    handleResetSql,
    handleUseSqlResultForChart,
  } = useBuilderWorkspace({
    builderState,
    setBuilderState,
    resetBuilderState,
    updateChart,
    saveChartAction: async () => {},
    previewChart,
    setPreviewChart,
    clearPreviewChart,
    navigate,
  });

  const canSaveWithContext = configSummary.canAddChart && validation.isValid && Boolean(builderContext);
  const saveDisabledReason = contextError || (isSaving ? "Saving..." : null);
  const blockerCount = configSummary.validationSummary?.blockers?.length ?? 0;
  const draftLabel = builderDraft?.isDirty ? "Draft" : "Saved";
  const previewStatus = previewSummary.previewState?.status ?? "idle";
  const readinessLabel = blockerCount
    ? "Needs Mapping"
    : previewStatus === "success"
      ? "Preview Ready"
      : previewStatus === "loading"
        ? "Rendering"
        : "Preview Pending";
  const compactContextLabel = contextLabels
    ? `${contextLabels.project} / ${contextLabels.sheet} / ${contextLabels.dashboard}`
    : (contextError || "Unavailable");
  function handleSaveDraft() {
    setBuilderState({});
    setDraftFeedback("Draft saved");
    window.clearTimeout(draftFeedbackTimerRef.current);
    draftFeedbackTimerRef.current = window.setTimeout(() => setDraftFeedback(""), 1800);
  }

  async function handleSaveChart() {
    if (!builderContext || !validation.isValid || !targetDashboard) {
      setContextError("Context unavailable.");
      return;
    }

    const chartConfig = createBuilderSaveConfig({
      builderState,
      selectedTable: sourceSummary.selectedTable,
      activeChartMeta: { label: getChartTypeLabel(builderState.chartType) },
    });

    if (!chartConfig.dataset || !chartConfig.chartType) {
      setContextError("Chart incomplete.");
      return;
    }

    setIsSaving(true);
    setContextError("");

    try {
      const queryResult = builderState.queryMode === "sql" && builderState.queryResult?.rows
        ? { data: builderState.queryResult.rows }
        : await runQuery({
            dataset: chartConfig.dataset,
            x: chartConfig.x,
            y: chartConfig.y,
            groupBy: chartConfig.groupBy,
            sizeField: chartConfig.sizeField,
            aggregate: chartConfig.aggregate,
            chartType: chartConfig.chartType,
          });

      const widgetData = createWidgetFromBuilder({
        chartConfig: {
          ...chartConfig,
          title: chartConfig.title || `${getChartTypeLabel(chartConfig.chartType)} - ${chartConfig.dataset}`,
          name: chartConfig.name,
        },
        chartRows: queryResult.data ?? [],
        context: builderContext,
        existingCharts: projectCharts,
      });

      const saveResult = saveChartToDashboardContext({
        projectId: builderContext.projectId,
        sheetId: builderContext.sheetId,
        dashboardId: builderContext.dashboardId,
        chart: widgetData,
      });

      if (!saveResult?.chart?.id) {
        throw new Error("Save failed.");
      }

      resetBuilderState();
      clearBuilderDraftState();
      clearPreviewChart();
      clearBuilderNavigationContext();
      navigate(builderContext.returnTo || "/dashboard", {
        replace: true,
        state: createBuilderReturnState(builderContext, {
          createdWidgetId: saveResult.layoutItem?.i ?? null,
          shouldSelectCreatedWidget: true,
        }),
      });
    } catch (error) {
      setContextError(error?.message || "Save failed.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <PageContainer
      className="builder-shell"
      style={{
        flex: 1,
        minHeight: 0,
        height: "100%",
        maxHeight: "100%",
        overflow: "hidden",
        padding: 0,
        gap: 0,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        className="builder-top-action-bar"
        style={{
          flexShrink: 0,
          minHeight: 0,
          minWidth: 0,
          padding: "10px 12px",
          borderRadius: 6,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "nowrap",
        }}
      >
        <div
          className="builder-top-action-primary"
          style={{
            minWidth: 0,
            flex: 1,
            display: "grid",
            gap: 2,
            alignContent: "center",
          }}
        >
          <div className="builder-page-kicker">Builder</div>
          <div className="builder-top-action-breadcrumb">{compactContextLabel}</div>
          <div
            className="builder-top-action-title-row"
            style={{
              minWidth: 0,
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <div className="builder-top-action-title-copy">
              <h1 className="builder-top-action-title">Builder</h1>
            </div>
            <div
              className="builder-top-action-summary builder-top-action-summary-compact"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                flexWrap: "wrap",
              }}
            >
              <span className="builder-top-action-summary-chip">{workspaceSummary.activeChartLabel}</span>
              <span className="builder-top-action-summary-chip">{workspaceSummary.chartFamily}</span>
              <span className="builder-top-action-summary-chip">
                {workspaceSummary.mappedCount}/{workspaceSummary.mappedTarget} mapped
              </span>
            </div>
          </div>
        </div>
        <div
          className="builder-top-action-secondary"
          style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 6,
            flexWrap: "wrap",
            maxWidth: "52%",
          }}
        >
          <span className="builder-top-action-badge">{draftLabel}</span>
          <span className="builder-top-action-badge">{builderState.queryMode === "sql" ? "SQL" : "Visual"}</span>
          <span className={`builder-top-action-badge${blockerCount ? " is-blocked" : " is-ready"}`}>
            {readinessLabel}
          </span>
          <button
            type="button"
            onClick={handleCancelAndReturn}
            className="builder-page-toolbar-btn"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveDraft}
            className="builder-page-toolbar-btn builder-page-toolbar-btn-secondary"
          >
            Draft
          </button>
          <button
            type="button"
            onClick={handleSaveChart}
            className="builder-top-save-btn"
            disabled={!canSaveWithContext || Boolean(saveDisabledReason)}
            title={saveDisabledReason || "Save Chart"}
          >
            {isSaving ? "Saving..." : "Save Chart"}
          </button>
        </div>
      </header>

      <div
        className="builder-workspace-region"
        style={{
          flex: 1,
          minHeight: 0,
          height: "100%",
          maxHeight: "100%",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <WorkspaceLayout
          columns="three"
          className="builder-workspace-grid builder-workspace-grid-compact"
          style={{
            flex: 1,
            minHeight: 0,
            height: "100%",
            maxHeight: "100%",
            overflow: "hidden",
            display: "flex",
            flexDirection: "row",
            alignItems: "stretch",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 288,
              minWidth: 288,
              maxWidth: 288,
              minHeight: 0,
              height: "100%",
              maxHeight: "100%",
              overflow: "hidden",
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <BuilderDataPane
              selectedDb={sourceSummary.selectedDb}
              selectedTable={sourceSummary.selectedTable}
              tableData={sourceSummary.tableData}
              tableFields={sourceSummary.tableFields}
              queryMode={sourceSummary.queryMode}
              queryResult={sourceSummary.queryResult}
              onFieldAssign={handleFieldAssign}
              chartDefinition={previewSummary.chartDefinition}
              roleAssignments={sourceSummary.roleAssignments}
              lastMappingNotice={sourceSummary.lastMappingNotice}
              getFieldRoleHints={getFieldRoleHints}
            />
          </div>

          <div
            style={{
              flex: 1,
              minWidth: 0,
              minHeight: 0,
              height: "100%",
              maxHeight: "100%",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <BuilderPreviewPane
              title={configSummary.title}
              name={configSummary.name}
              subtitle={configSummary.subtitle}
              selectedTable={sourceSummary.selectedTable}
              aggregation={configSummary.aggregation}
              {...previewSummary}
            />
          </div>

          <div
            style={{
              width: 344,
              minWidth: 344,
              maxWidth: 344,
              minHeight: 0,
              height: "100%",
              maxHeight: "100%",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              flexShrink: 0,
            }}
          >
            <BuilderConfigPane
              {...configSummary}
              canAddChart={canSaveWithContext}
              onChartTypeChange={handleChartTypeChange}
              onChartCategoryChange={handleChartCategoryChange}
              onChartFamilyChange={handleChartFamilyChange}
              onChartVariantChange={handleChartVariantChange}
              onChartSettingChange={handleChartSettingChange}
              onDisplayChange={handleDisplayChange}
              onLabelChange={handleLabelChange}
              onAggregationChange={handleAggregationChange}
              queryMode={configSummary.queryMode}
              generatedSql={configSummary.generatedSql}
              customSql={configSummary.customSql}
              queryResult={configSummary.queryResult}
              queryError={configSummary.queryError}
              queryStatus={configSummary.queryStatus}
              lastRunAt={configSummary.lastRunAt}
              handleFieldAssign={handleFieldAssign}
              clearSlot={clearSlot}
              handleRoleFieldRemove={handleRoleFieldRemove}
              handleReorderRole={handleReorderRole}
              canAssignFieldToRole={canAssignFieldToRole}
              resetBuilderState={resetBuilderState}
              navigate={navigate}
              handleSave={handleSaveChart}
              handleCancel={handleCancelAndReturn}
              handleQueryModeChange={handleQueryModeChange}
              handleSqlChange={handleSqlChange}
              handleRunSql={handleRunSql}
              handleFormatSql={handleFormatSql}
              handleResetSql={handleResetSql}
              handleUseSqlResultForChart={handleUseSqlResultForChart}
              saveLabel={isSaving ? "Saving..." : "Save Chart"}
              readyLabel={validation.isValid ? "Ready" : "Required"}
              saveDisabledReason={saveDisabledReason}
              roleAssignments={configSummary.roleAssignments}
              roleValidation={configSummary.roleValidation}
              lastMappingNotice={configSummary.lastMappingNotice}
            />
          </div>
        </WorkspaceLayout>
      </div>
    </PageContainer>
  );
}

