import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import BuilderDataPane from "../components/builder/BuilderDataPane";
import BuilderPreviewPane from "../components/builder/BuilderPreviewPane";
import BuilderConfigPane from "../components/builder/BuilderConfigPane";
import useBuilderWorkspace from "../components/builder/useBuilderWorkspace";
import { createBuilderSaveConfig } from "../components/builder/builderStateUtils";
import "../components/builder/builderRefinements.css";
import { runQuery } from "../utils/queryEngine";
import { useStore } from "../store/useStore";
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

  const validation = useMemo(
    () => validateBuilderContext(builderContext, projects),
    [builderContext, projects]
  );
  const targetDashboard = useMemo(
    () => getTargetDashboard(builderContext, projects),
    [builderContext, projects]
  );
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
    hydrateBuilderDraft(builderContext);
    startBuilderDraft(builderContext);
  }, [builderContext, hydrateBuilderDraft, startBuilderDraft, validation.isValid]);

  useEffect(() => {
    if (!builderContext) {
      setContextError("Missing builder context. Select a project dashboard and try again.");
      return;
    }

    if (!validation.isValid) {
      setContextError("This project, sheet, or dashboard is no longer available.");
      return;
    }

    setContextError("");
    setActiveProject(builderContext.projectId);
    setActiveSheet(builderContext.sheetId);
    setActiveDashboard(builderContext.dashboardId);
  }, [
    builderContext,
    setActiveDashboard,
    setActiveProject,
    setActiveSheet,
    validation.isValid,
  ]);

  const handleCancelAndReturn = () => {
    if (builderDraft?.isDirty) {
      const shouldDiscard = window.confirm("Discard this chart draft and return to the dashboard?");
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
    handleChartTypeChange,
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
  const saveDisabledReason = contextError || (isSaving ? "Saving chart..." : null);
  const blockerCount = configSummary.validationSummary?.blockers?.length ?? 0;
  const draftLabel = builderDraft?.isDirty ? "Draft" : "Saved";

  async function handleSaveChart() {
    if (!builderContext || !validation.isValid || !targetDashboard) {
      setContextError("Builder context is invalid. Return to the dashboard and try again.");
      return;
    }

    const chartConfig = createBuilderSaveConfig({
      builderState,
      selectedTable: sourceSummary.selectedTable,
      activeChartMeta: { label: getChartTypeLabel(builderState.chartType) },
    });

    if (!chartConfig.dataset || !chartConfig.chartType) {
      setContextError("Chart configuration is incomplete.");
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
          title: chartConfig.title || `${getChartTypeLabel(chartConfig.chartType)} from ${chartConfig.dataset}`,
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
        throw new Error("Unable to save chart into the selected dashboard.");
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
      setContextError(error?.message || "Unable to save this chart right now.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="builder-shell">
      <header className="builder-top-action-bar">
        <div className="builder-top-action-primary">
          <span className="builder-page-kicker">Builder</span>
          <div className="builder-top-action-context">
            {contextLabels ? `${contextLabels.project} / ${contextLabels.sheet} / ${contextLabels.dashboard}` : (contextError || "Context unavailable")}
          </div>
        </div>
        <div className="builder-top-action-secondary">
          <span className="builder-top-action-badge">{draftLabel}</span>
          {blockerCount ? <span className="builder-top-action-badge is-blocked">{blockerCount} blocker{blockerCount > 1 ? "s" : ""}</span> : null}
          <button
            type="button"
            onClick={handleCancelAndReturn}
            className="builder-page-toolbar-btn"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveChart}
            className="builder-top-save-btn"
            disabled={!canSaveWithContext || Boolean(saveDisabledReason)}
            title={saveDisabledReason || "Save chart"}
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </header>

      <div className="builder-workspace-grid builder-workspace-grid-v3 builder-workspace-grid-compact">
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

        <BuilderPreviewPane
          title={configSummary.title}
          name={configSummary.name}
          subtitle={configSummary.subtitle}
          selectedTable={sourceSummary.selectedTable}
          aggregation={configSummary.aggregation}
          {...previewSummary}
        />

        <BuilderConfigPane
          {...configSummary}
          canAddChart={canSaveWithContext}
          onChartTypeChange={handleChartTypeChange}
          setBuilderState={setBuilderState}
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
          saveDescription="Save directly into the selected dashboard."
          readyLabel={validation.isValid ? "Project-scoped" : "Context required"}
          saveDisabledReason={saveDisabledReason}
          roleAssignments={configSummary.roleAssignments}
          roleValidation={configSummary.roleValidation}
          lastMappingNotice={configSummary.lastMappingNotice}
          subtitle={configSummary.subtitle}
          colorTheme={configSummary.colorTheme}
          legendVisible={configSummary.legendVisible}
          showGrid={configSummary.showGrid}
          showLabels={configSummary.showLabels}
          xLabel={configSummary.xLabel}
          yLabel={configSummary.yLabel}
        />
      </div>
    </div>
  );
}
