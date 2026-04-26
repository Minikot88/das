import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { PageContainer, WorkspaceLayout } from "../components/layout/Layout";
import "../components/builder/builderWorkspaceViewport.css";
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

const LEFT_PANEL_DEFAULT_WIDTH = 280;
const LEFT_PANEL_MIN_WIDTH = 220;
const LEFT_PANEL_MAX_WIDTH = 440;
const RIGHT_PANEL_DEFAULT_WIDTH = 340;
const RIGHT_PANEL_MIN_WIDTH = 280;
const RIGHT_PANEL_MAX_WIDTH = 520;
const SETTINGS_COLLAPSED_WIDTH = 40;
const RESIZER_SIZE = 10;
const CENTER_PANEL_MIN_WIDTH = 320;
const BUILDER_GRID_RESERVED_SPACE = 32;
const LEFT_PANEL_WIDTH_STORAGE_KEY = "builder-left-panel-width";
const RIGHT_PANEL_WIDTH_STORAGE_KEY = "builder-right-panel-width";

function clampPanelSize(value, min, max) {
  return Math.min(Math.max(value, min), max);
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
  const [isSettingsOpen, setIsSettingsOpen] = useState(true);
  const [leftPanelWidth, setLeftPanelWidth] = useState(LEFT_PANEL_DEFAULT_WIDTH);
  const [rightPanelWidth, setRightPanelWidth] = useState(RIGHT_PANEL_DEFAULT_WIDTH);
  const [activeResizeHandle, setActiveResizeHandle] = useState(null);
  const resizeDragStateRef = useRef(null);
  const workspaceRegionRef = useRef(null);

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

  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedLeftWidth = Number(window.localStorage.getItem(LEFT_PANEL_WIDTH_STORAGE_KEY));
    const savedRightWidth = Number(window.localStorage.getItem(RIGHT_PANEL_WIDTH_STORAGE_KEY));

    if (Number.isFinite(savedLeftWidth)) {
      setLeftPanelWidth(clampPanelSize(savedLeftWidth, LEFT_PANEL_MIN_WIDTH, LEFT_PANEL_MAX_WIDTH));
    }

    if (Number.isFinite(savedRightWidth)) {
      setRightPanelWidth(clampPanelSize(savedRightWidth, RIGHT_PANEL_MIN_WIDTH, RIGHT_PANEL_MAX_WIDTH));
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LEFT_PANEL_WIDTH_STORAGE_KEY, String(leftPanelWidth));
  }, [leftPanelWidth]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(RIGHT_PANEL_WIDTH_STORAGE_KEY, String(rightPanelWidth));
  }, [rightPanelWidth]);

  const getHorizontalResizeBounds = useCallback((type) => {
    const regionWidth = workspaceRegionRef.current?.getBoundingClientRect().width ?? 0;
    const currentRightWidth = isSettingsOpen ? rightPanelWidth : SETTINGS_COLLAPSED_WIDTH;
    const currentRightResizer = isSettingsOpen ? RESIZER_SIZE : 0;

    if (!regionWidth) {
      return type === "left"
        ? { min: LEFT_PANEL_MIN_WIDTH, max: LEFT_PANEL_MAX_WIDTH }
        : { min: RIGHT_PANEL_MIN_WIDTH, max: RIGHT_PANEL_MAX_WIDTH };
    }

    if (type === "left") {
      const dynamicMax = regionWidth - currentRightWidth - currentRightResizer - RESIZER_SIZE - CENTER_PANEL_MIN_WIDTH - BUILDER_GRID_RESERVED_SPACE;
      return {
        min: LEFT_PANEL_MIN_WIDTH,
        max: Math.max(LEFT_PANEL_MIN_WIDTH, Math.min(LEFT_PANEL_MAX_WIDTH, dynamicMax)),
      };
    }

    const dynamicMax = regionWidth - leftPanelWidth - RESIZER_SIZE - RESIZER_SIZE - CENTER_PANEL_MIN_WIDTH - BUILDER_GRID_RESERVED_SPACE;
    return {
      min: RIGHT_PANEL_MIN_WIDTH,
      max: Math.max(RIGHT_PANEL_MIN_WIDTH, Math.min(RIGHT_PANEL_MAX_WIDTH, dynamicMax)),
    };
  }, [isSettingsOpen, leftPanelWidth, rightPanelWidth]);

  useEffect(() => {
    if (!activeResizeHandle) return undefined;

    function handlePointerMove(event) {
      const dragState = resizeDragStateRef.current;
      if (!dragState) return;

      const bounds = getHorizontalResizeBounds(dragState.type);

      if (dragState.type === "left") {
        const nextWidth = clampPanelSize(
          dragState.startWidth + (event.clientX - dragState.startX),
          bounds.min,
          bounds.max
        );
        setLeftPanelWidth(nextWidth);
        return;
      }

      if (dragState.type === "right") {
        const nextWidth = clampPanelSize(
          dragState.startWidth - (event.clientX - dragState.startX),
          bounds.min,
          bounds.max
        );
        setRightPanelWidth(nextWidth);
      }
    }

    function stopResize() {
      resizeDragStateRef.current = null;
      setActiveResizeHandle(null);
      document.body.classList.remove("builder-resize-active");
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResize);
    window.addEventListener("pointercancel", stopResize);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResize);
      window.removeEventListener("pointercancel", stopResize);
    };
  }, [activeResizeHandle, getHorizontalResizeBounds]);

  useEffect(() => {
    function clampPanelsToViewport() {
      const leftBounds = getHorizontalResizeBounds("left");
      const rightBounds = getHorizontalResizeBounds("right");
      setLeftPanelWidth((current) => clampPanelSize(current, leftBounds.min, leftBounds.max));
      setRightPanelWidth((current) => clampPanelSize(current, rightBounds.min, rightBounds.max));
    }

    const frame = window.requestAnimationFrame(clampPanelsToViewport);
    window.addEventListener("resize", clampPanelsToViewport);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", clampPanelsToViewport);
    };
  }, [getHorizontalResizeBounds]);

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

  function handleToggleSettingsPanel() {
    setIsSettingsOpen((current) => !current);
  }

  function beginHorizontalResize(type, event) {
    if (event.button !== 0) return;
    event.preventDefault();

    resizeDragStateRef.current = {
      type,
      startX: event.clientX,
      startWidth: type === "left" ? leftPanelWidth : rightPanelWidth,
    };
    setActiveResizeHandle(type);
    document.body.classList.add("builder-resize-active");
  }

  function handleHorizontalResizeKeyboard(type, event) {
    const step = event.shiftKey ? 24 : 12;
    const bounds = getHorizontalResizeBounds(type);

    if (type === "left") {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setLeftPanelWidth((current) => clampPanelSize(current - step, bounds.min, bounds.max));
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        setLeftPanelWidth((current) => clampPanelSize(current + step, bounds.min, bounds.max));
      }
    }

    if (type === "right" && isSettingsOpen) {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setRightPanelWidth((current) => clampPanelSize(current + step, bounds.min, bounds.max));
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        setRightPanelWidth((current) => clampPanelSize(current - step, bounds.min, bounds.max));
      }
    }
  }

  function resetHorizontalResize(type) {
    if (type === "left") {
      setLeftPanelWidth(LEFT_PANEL_DEFAULT_WIDTH);
      return;
    }

    if (type === "right") {
      setRightPanelWidth(RIGHT_PANEL_DEFAULT_WIDTH);
    }
  }

  function handleSaveDraft() {
    setBuilderState({});
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
          padding: "6px 8px",
          borderRadius: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          flexWrap: "nowrap",
          overflow: "hidden",
        }}
      >
        <div
          className="builder-top-action-primary"
          style={{
            minWidth: 0,
            flex: 1,
            display: "grid",
            gap: 3,
            alignContent: "center",
            overflow: "hidden",
          }}
        >
          <div
            className="builder-top-action-context-row"
            style={{
              minWidth: 0,
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexWrap: "nowrap",
              overflow: "hidden",
            }}
          >
            <div className="builder-page-kicker">Chart.js Builder</div>
            <div
              className="builder-top-action-breadcrumb"
              style={{
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {compactContextLabel}
            </div>
          </div>
          <div
            className="builder-top-action-title-row"
            style={{
              minWidth: 0,
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexWrap: "nowrap",
              overflow: "hidden",
            }}
          >
            <div className="builder-top-action-title-copy">
              <h1 className="builder-top-action-title">Build a chart</h1>
            </div>
            <div
              className="builder-top-action-summary builder-top-action-summary-compact"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                flexWrap: "nowrap",
                minWidth: 0,
                overflow: "hidden",
              }}
            >
              <span
                className="builder-top-action-summary-chip"
                style={{
                  maxWidth: 180,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {workspaceSummary.activeChartLabel}
              </span>
              <span
                className="builder-top-action-summary-chip"
                style={{
                  maxWidth: 140,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {workspaceSummary.chartFamily}
              </span>
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
            gap: 5,
            flexWrap: "wrap",
            maxWidth: "100%",
            minWidth: 0,
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
            Back
          </button>
          <button
            type="button"
            onClick={handleSaveDraft}
            className="builder-page-toolbar-btn builder-page-toolbar-btn-secondary"
          >
            Save draft
          </button>
          <button
            type="button"
            onClick={handleToggleSettingsPanel}
            className="builder-page-toolbar-btn builder-settings-toggle-btn"
            aria-expanded={isSettingsOpen}
            aria-controls="builder-settings-panel"
          >
            {isSettingsOpen ? "Hide settings" : "Show settings"}
          </button>
          <button
            type="button"
            onClick={handleSaveChart}
            className="builder-top-save-btn"
            disabled={!canSaveWithContext || Boolean(saveDisabledReason)}
            title={saveDisabledReason || "Save Chart"}
          >
            {isSaving ? "Saving..." : "Save chart"}
          </button>
        </div>
      </header>

      <div
        ref={workspaceRegionRef}
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
          className={`builder-workspace-grid builder-workspace-grid-compact${isSettingsOpen ? " is-settings-open" : " is-settings-collapsed"}`}
          style={{
            flex: 1,
            minHeight: 0,
            height: "100%",
            maxHeight: "100%",
            overflow: "hidden",
            "--builder-left-width": `${leftPanelWidth}px`,
            "--builder-right-width": `${isSettingsOpen ? rightPanelWidth : SETTINGS_COLLAPSED_WIDTH}px`,
            "--builder-left-resizer-size": `${RESIZER_SIZE}px`,
            "--builder-right-resizer-size": `${isSettingsOpen ? RESIZER_SIZE : 0}px`,
          }}
        >
          <div
            className="builder-workspace-column builder-workspace-column-data"
            style={{
              minHeight: 0,
              height: "100%",
              maxHeight: "100%",
              overflow: "hidden",
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
            className={`builder-workspace-resizer is-left${activeResizeHandle === "left" ? " is-active" : ""}`}
            role="separator"
            aria-label="Resize data source panel"
            aria-orientation="vertical"
            aria-valuemin={LEFT_PANEL_MIN_WIDTH}
            aria-valuemax={LEFT_PANEL_MAX_WIDTH}
            aria-valuenow={leftPanelWidth}
            tabIndex={0}
            onPointerDown={(event) => beginHorizontalResize("left", event)}
            onKeyDown={(event) => handleHorizontalResizeKeyboard("left", event)}
            onDoubleClick={() => resetHorizontalResize("left")}
          >
            <span className="builder-workspace-resizer__grip" />
          </div>

          <div
            className="builder-workspace-column builder-workspace-column-preview"
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
            className={`builder-workspace-resizer is-right${activeResizeHandle === "right" ? " is-active" : ""}${isSettingsOpen ? "" : " is-disabled"}`}
            role="separator"
            aria-label="Resize settings panel"
            aria-orientation="vertical"
            aria-valuemin={RIGHT_PANEL_MIN_WIDTH}
            aria-valuemax={RIGHT_PANEL_MAX_WIDTH}
            aria-valuenow={rightPanelWidth}
            aria-hidden={!isSettingsOpen}
            tabIndex={isSettingsOpen ? 0 : -1}
            onPointerDown={(event) => {
              if (!isSettingsOpen) return;
              beginHorizontalResize("right", event);
            }}
            onKeyDown={(event) => handleHorizontalResizeKeyboard("right", event)}
            onDoubleClick={() => resetHorizontalResize("right")}
          >
            <span className="builder-workspace-resizer__grip" />
          </div>

          <div
            className={`builder-workspace-column builder-workspace-column-settings${isSettingsOpen ? " is-open" : " is-collapsed"}`}
            style={{
              minHeight: 0,
              height: "100%",
              maxHeight: "100%",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              flexShrink: 0,
            }}
          >
            {isSettingsOpen ? (
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
                onCollapseSettings={handleToggleSettingsPanel}
                panelId="builder-settings-panel"
              />
            ) : (
              <aside className="builder-settings-rail" aria-label="Settings collapsed">
              <button
                type="button"
                className="builder-settings-rail-btn"
                onClick={handleToggleSettingsPanel}
                aria-expanded="false"
                aria-controls="builder-settings-panel"
                title="Show settings"
              >
                <span className="builder-settings-rail-icon" aria-hidden="true">{"<"}</span>
                <span className="builder-settings-rail-label">Settings</span>
              </button>
              </aside>
            )}
          </div>
        </WorkspaceLayout>
      </div>
    </PageContainer>
  );
}

