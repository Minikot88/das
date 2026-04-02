import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Responsive, WidthProvider } from "react-grid-layout";
import { useStore } from "../store/useStore";
import ChartRendererV2 from "../components/charts/ChartRendererV2";
import { buildDashboardExportCode, buildWidgetExportCode } from "../utils/exportUtils";
import {
  autoArrangeDashboardLayout,
  buildResponsiveLayouts,
  DASHBOARD_COMPACT_TYPE,
  DASHBOARD_GRID_MARGIN,
  DASHBOARD_GRID_PADDING,
  DASHBOARD_ROW_HEIGHT,
  GRID_BREAKPOINTS,
  GRID_COLUMNS,
  normalizeLayoutItems,
} from "../utils/layoutUtils";
import ChartPicker from "../components/dashboard/ChartPicker";
import SidebarRight from "../layout/SidebarRight";
import {
  createBuilderContextForDashboard,
  getDashboardWorkspaceStats,
  readBuilderReturnState,
  resolveDashboardWidgets,
} from "../utils/dashboardWorkspace";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const ResponsiveGridLayout = WidthProvider(Responsive);

function getNextName(prefix, items = []) {
  return `${prefix} ${items.length + 1}`;
}

function WorkspaceTab({
  item,
  isActive,
  isEditing,
  editingValue,
  onSelect,
  onStartEdit,
  onChangeEdit,
  onCommitEdit,
  onCancelEdit,
  onOpenMenu,
  compact = false,
}) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  return (
    <button
      type="button"
      onClick={() => onSelect(item.id)}
      onDoubleClick={() => onStartEdit(item)}
      onContextMenu={(event) => onOpenMenu(event, item)}
      className={`dashboard-workspace-tab${compact ? " is-compact" : ""}${isActive ? " is-active" : ""}`}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          value={editingValue}
          onChange={(event) => onChangeEdit(event.target.value)}
          onClick={(event) => event.stopPropagation()}
          onBlur={onCommitEdit}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onCommitEdit();
            }
            if (event.key === "Escape") {
              event.preventDefault();
              onCancelEdit();
            }
          }}
          className="dashboard-workspace-tab-input"
        />
      ) : (
        <span className="dashboard-workspace-tab-label">{item.name}</span>
      )}
    </button>
  );
}

function ContextMenu({ menu, onRename, onDelete }) {
  if (!menu) return null;

  return (
    <div
      className="dashboard-workspace-context-menu"
      style={{ left: menu.x, top: menu.y }}
      role="menu"
    >
      <button type="button" className="dashboard-context-menu-item" onClick={onRename}>
        Rename
      </button>
      <button type="button" className="dashboard-context-menu-item" onClick={menu.onDuplicate}>
        Duplicate
      </button>
      <button type="button" className="dashboard-context-menu-item is-danger" onClick={onDelete}>
        Delete
      </button>
    </div>
  );
}

function EmptyCanvasState({ onBuildChart }) {
  return (
    <div className="dashboard-empty-state">
      <div className="dashboard-empty-state-inner">
        <div className="dashboard-empty-state-title">No widgets in this dashboard</div>
        <div className="dashboard-empty-state-copy">Start from Builder or add a saved chart from this project.</div>
        <button type="button" onClick={onBuildChart} className="dashboard-toolbar-btn is-primary">
          Build New Chart
        </button>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const projects = useStore((state) => state.projects);
  const activeProjectId = useStore((state) => state.activeProjectId);
  const activeSheetId = useStore((state) => state.activeSheetId);
  const activeDashboardId = useStore((state) => state.activeDashboardId);
  const chartsPool = useStore((state) => state.charts);
  const ui = useStore((state) => state.ui);
  const addChartToDashboard = useStore((state) => state.addChartToDashboard);
  const createSheet = useStore((state) => state.createSheet);
  const duplicateSheetAction = useStore((state) => state.duplicateSheet);
  const renameSheet = useStore((state) => state.renameSheet);
  const removeSheet = useStore((state) => state.removeSheet);
  const setActiveSheet = useStore((state) => state.setActiveSheet);
  const createDashboard = useStore((state) => state.createDashboard);
  const duplicateDashboardAction = useStore((state) => state.duplicateDashboard);
  const renameDashboard = useStore((state) => state.renameDashboard);
  const removeDashboard = useStore((state) => state.removeDashboard);
  const setActiveDashboard = useStore((state) => state.setActiveDashboard);
  const updateLayout = useStore((state) => state.updateLayout);
  const removeChart = useStore((state) => state.removeChart);
  const duplicateChart = useStore((state) => state.duplicateChart);
  const renameChartWidget = useStore((state) => state.renameChartWidget);
  const setBuilderNavigationContext = useStore((state) => state.setBuilderNavigationContext);
  const setSelectedWidget = useStore((state) => state.setSelectedWidget);
  const rightPanelOpen = useStore((state) => state.rightPanelOpen);
  const setRightPanelOpen = useStore((state) => state.setRightPanelOpen);

  const [pickingChart, setPickingChart] = useState(false);
  const [editingTab, setEditingTab] = useState(null);
  const [editingValue, setEditingValue] = useState("");
  const [contextMenuState, setContextMenuState] = useState(null);
  const [pendingCreatedWidgetId, setPendingCreatedWidgetId] = useState(null);
  const [exportState, setExportState] = useState(null);

  const contextMenuRef = useRef(null);
  const previousWidgetCountRef = useRef(0);

  const activeProject = useMemo(
    () => projects.find((project) => project.id === activeProjectId) ?? projects[0],
    [projects, activeProjectId]
  );
  const activeSheet = useMemo(
    () => activeProject?.sheets.find((sheet) => sheet.id === activeSheetId) ?? activeProject?.sheets[0],
    [activeProject, activeSheetId]
  );
  const activeDashboard = useMemo(
    () =>
      activeSheet?.dashboards.find((dashboard) => dashboard.id === activeDashboardId) ??
      activeSheet?.dashboards[0],
    [activeSheet, activeDashboardId]
  );

  const currentProjectId = activeProject?.id ?? activeProjectId;
  const projectCharts = useMemo(
    () => chartsPool.filter((chart) => chart.projectId === currentProjectId),
    [chartsPool, currentProjectId]
  );
  const dashboardWidgets = useMemo(
    () => resolveDashboardWidgets(activeDashboard?.layout ?? [], chartsPool),
    [activeDashboard?.layout, chartsPool]
  );
  const workspaceStats = useMemo(
    () => getDashboardWorkspaceStats(dashboardWidgets),
    [dashboardWidgets]
  );
  const hasWidgets = dashboardWidgets.length > 0;
  const selectedWidgetId = ui.selectedWidgetIdByDashboard?.[activeDashboard?.id] ?? null;
  const selectedWidget = dashboardWidgets.find((widget) => widget.id === selectedWidgetId) ?? null;
  const isRightSidebarOpen = rightPanelOpen;
  const canvasLayouts = useMemo(
    () => buildResponsiveLayouts(activeDashboard?.layout ?? []),
    [activeDashboard?.layout]
  );

  useEffect(() => {
    if (!contextMenuState) return undefined;

    const handlePointerDown = (event) => {
      if (contextMenuRef.current?.contains(event.target)) return;
      setContextMenuState(null);
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setContextMenuState(null);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [contextMenuState]);

  useEffect(() => {
    const previousCount = previousWidgetCountRef.current;

    if (!dashboardWidgets.length) {
      setSelectedWidget(activeDashboard?.id, null);
    } else if (dashboardWidgets.length > previousCount) {
      setSelectedWidget(activeDashboard?.id, dashboardWidgets[dashboardWidgets.length - 1].id);
    } else if (!dashboardWidgets.some((widget) => widget.id === selectedWidgetId)) {
      setSelectedWidget(activeDashboard?.id, dashboardWidgets[0].id);
    }

    previousWidgetCountRef.current = dashboardWidgets.length;
  }, [activeDashboard?.id, dashboardWidgets, selectedWidgetId, setSelectedWidget]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 220);

    return () => window.clearTimeout(timer);
  }, [isRightSidebarOpen]);

  useEffect(() => {
    const builderReturn = readBuilderReturnState(location.state);
    if (!builderReturn) return;

    const store = useStore.getState();
    if (builderReturn.projectId !== store.activeProjectId) {
      store.setActiveProject(builderReturn.projectId);
    }
    if (builderReturn.sheetId !== store.activeSheetId) {
      store.setActiveSheet(builderReturn.sheetId);
    }
    if (builderReturn.dashboardId !== store.activeDashboardId) {
      store.setActiveDashboard(builderReturn.dashboardId);
    }

    if (builderReturn.shouldSelectCreatedWidget && builderReturn.createdWidgetId) {
      setPendingCreatedWidgetId(builderReturn.createdWidgetId);
    }

    navigate(location.pathname, { replace: true, state: {} });
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    if (!pendingCreatedWidgetId) return;
    if (!dashboardWidgets.some((widget) => widget.id === pendingCreatedWidgetId)) return;

    setSelectedWidget(activeDashboard?.id, pendingCreatedWidgetId);
    setPendingCreatedWidgetId(null);
  }, [activeDashboard?.id, dashboardWidgets, pendingCreatedWidgetId, setSelectedWidget]);

  if (!projects.length || !activeProject) {
    return (
      <div className="dashboard-workspace-page">
        <div className="dashboard-empty-state">
          <div className="dashboard-empty-state-inner">
            <div className="dashboard-empty-state-title">No project available</div>
            <div className="dashboard-empty-state-copy">Create a project from the home page to start building dashboards.</div>
            <button type="button" onClick={() => navigate("/")} className="dashboard-toolbar-btn">
              Go To Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!activeSheet || !activeDashboard) {
    return (
      <div className="dashboard-workspace-page">
        <div className="dashboard-empty-state">
          <div className="dashboard-empty-state-inner">
            <div className="dashboard-empty-state-title">Workspace unavailable</div>
            <div className="dashboard-empty-state-copy">Select a valid sheet and dashboard from the current project.</div>
            <button type="button" onClick={() => navigate("/")} className="dashboard-toolbar-btn">
              Go To Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const startEdit = (type, item) => {
    setContextMenuState(null);
    if (type === "widget") {
      const nextName = window.prompt("Rename widget", item.name);
      if (nextName && nextName.trim() && activeSheet?.id) {
        renameChartWidget(activeSheet.id, item.id, nextName.trim());
      }
      return;
    }
    setEditingTab({ type, id: item.id });
    setEditingValue(item.name);
  };

  const cancelEdit = () => {
    setEditingTab(null);
    setEditingValue("");
  };

  const commitEdit = () => {
    if (!editingTab) return;

    const nextName = editingValue.trim();
    if (!nextName) {
      cancelEdit();
      return;
    }

    if (editingTab.type === "sheet") renameSheet(editingTab.id, nextName);
    if (editingTab.type === "dashboard") renameDashboard(editingTab.id, nextName);

    cancelEdit();
  };

  const addSheet = () => {
    createSheet(getNextName("Sheet", activeProject?.sheets ?? []));
  };

  const addDashboard = () => {
    createDashboard(getNextName("Dashboard", activeSheet?.dashboards ?? []));
  };

  const duplicateSheet = (sheetId) => {
    duplicateSheetAction(sheetId);
    setContextMenuState(null);
  };

  const duplicateDashboard = (dashboardId) => {
    duplicateDashboardAction(dashboardId);
    setContextMenuState(null);
  };

  const duplicateWidget = (widgetId) => {
    if (!activeSheet?.id || !widgetId) return;
    duplicateChart(activeSheet.id, widgetId);
    setContextMenuState(null);
  };

  const deleteSheet = (sheetId) => {
    removeSheet(sheetId);
    setContextMenuState(null);
  };

  const deleteDashboard = (dashboardId) => {
    removeDashboard(dashboardId);
    setContextMenuState(null);
  };

  const removeWidget = (widgetId) => {
    if (!activeSheet?.id) return;
    removeChart(activeSheet.id, widgetId);
    setContextMenuState(null);
  };

  const handleLayoutChange = (currentLayout, allLayouts) => {
    if (!hasWidgets || !activeSheet?.id) return;

    const nextLayout = normalizeLayoutItems(
      (allLayouts?.lg ?? currentLayout).map((item) => {
        const original = activeDashboard?.layout?.find((layoutItem) => layoutItem.i === item.i);
        return {
          ...item,
          chartId: original?.chartId,
          minW: original?.minW ?? 4,
          minH: original?.minH ?? 3,
          titleOverride: original?.titleOverride,
        };
      }),
      dashboardWidgets
    );

    updateLayout(activeSheet.id, nextLayout);
  };

  const openContextMenu = (type, target, event) => {
    event.preventDefault();
    if (type === "sheet") setActiveSheet(target.id);
    if (type === "dashboard") setActiveDashboard(target.id);
    if (type === "widget") setSelectedWidget(activeDashboard?.id, target.id);

    setContextMenuState({
      type,
      target,
      x: event.clientX,
      y: event.clientY,
      onDuplicate: () => {
        if (type === "sheet") duplicateSheet(target.id);
        if (type === "dashboard") duplicateDashboard(target.id);
        if (type === "widget") duplicateWidget(target.id);
      },
    });
  };

  const openBuilderForCurrentContext = () => {
    const builderContext = createBuilderContextForDashboard({
      projectId: currentProjectId,
      sheetId: activeSheet?.id,
      dashboardId: activeDashboard?.id,
      returnTo: "/dashboard",
    });
    if (!builderContext) return;

    setBuilderNavigationContext(builderContext);
    navigate("/builder", { state: { builderContext } });
  };

  const autoArrangeDashboard = () => {
    if (!activeSheet?.id || !dashboardWidgets.length) return;
    updateLayout(activeSheet.id, autoArrangeDashboardLayout(dashboardWidgets));
  };

  const handleAddSavedChart = (chartId) => {
    addChartToDashboard(chartId);
    setPickingChart(false);
  };

  const toggleRightSidebar = () => {
    setRightPanelOpen(!isRightSidebarOpen);
  };

  const selectWidget = (widgetId) => {
    setSelectedWidget(activeDashboard?.id, widgetId);
  };

  const exportWidgetCode = (widgetId) => {
    const widget = dashboardWidgets.find((item) => item.id === widgetId);
    if (!widget) return;

    setExportState({
      target: widget.id,
      mode: "widget",
      title: `Export: ${widget.name}`,
      code: buildWidgetExportCode(widget),
    });
  };

  const exportDashboardCode = () => {
    if (!dashboardWidgets.length) return;

    setExportState({
      target: activeDashboard?.id,
      mode: "dashboard",
      title: `Export: ${activeDashboard?.name ?? "Dashboard"}`,
      code: buildDashboardExportCode(activeDashboard?.name ?? "Dashboard", dashboardWidgets),
    });
  };

  const handleCopyCode = async () => {
    if (!exportState?.code) return;

    try {
      await navigator.clipboard.writeText(exportState.code);
    } catch {
      window.prompt("Copy the code below", exportState.code);
    }
  };

  const handleContextRename = () => {
    if (!contextMenuState) return;
    startEdit(contextMenuState.type, contextMenuState.target);
  };

  const handleContextDelete = () => {
    if (!contextMenuState) return;

    if (contextMenuState.type === "sheet") return deleteSheet(contextMenuState.target.id);
    if (contextMenuState.type === "dashboard") return deleteDashboard(contextMenuState.target.id);
    removeWidget(contextMenuState.target.id);
  };

  return (
    <div className="dashboard-workspace-page">
      <div className="dashboard-workspace-shell">
        <div className="dashboard-workspace-main">
          <header className="dashboard-workspace-header">
            <div className="dashboard-workspace-header-copy">
              <div className="dashboard-workspace-breadcrumb">
                <span>{activeProject?.name ?? "Project"}</span>
                <span>/</span>
                <span>{activeSheet?.name ?? "Sheet"}</span>
                <span>/</span>
                <span>{activeDashboard?.name ?? "Dashboard"}</span>
              </div>
              <div className="dashboard-workspace-title-row">
                <h1 className="dashboard-workspace-title">{activeDashboard?.name ?? "Dashboard"}</h1>
                <span className="dashboard-workspace-status">
                  {workspaceStats.chartCount ? `${workspaceStats.chartCount} widgets` : "Empty dashboard"}
                </span>
              </div>
              <div className="dashboard-workspace-meta">
                <span>{workspaceStats.readyChartsCount} configured</span>
                <span>{workspaceStats.coveragePercent}% coverage</span>
                <span>{projectCharts.length} charts in project</span>
              </div>
            </div>

            <div className="dashboard-workspace-header-actions">
              {!isRightSidebarOpen ? (
                <button type="button" onClick={toggleRightSidebar} className="dashboard-toolbar-btn">
                  Open Panel
                </button>
              ) : null}
              <button type="button" onClick={() => setPickingChart(true)} className="dashboard-toolbar-btn">
                Add Saved Chart
              </button>
              <button type="button" onClick={autoArrangeDashboard} className="dashboard-toolbar-btn">
                Auto Arrange
              </button>
              <button type="button" onClick={openBuilderForCurrentContext} className="dashboard-toolbar-btn is-primary">
                Build New Chart
              </button>
            </div>
          </header>

          <section className="dashboard-workspace-tabs">
            {(activeProject?.sheets ?? []).map((sheet) => (
              <WorkspaceTab
                key={sheet.id}
                item={sheet}
                isActive={sheet.id === activeSheet?.id}
                isEditing={editingTab?.type === "sheet" && editingTab.id === sheet.id}
                editingValue={editingValue}
                onSelect={setActiveSheet}
                onStartEdit={(item) => startEdit("sheet", item)}
                onChangeEdit={setEditingValue}
                onCommitEdit={commitEdit}
                onCancelEdit={cancelEdit}
                onOpenMenu={(event, item) => openContextMenu("sheet", item, event)}
              />
            ))}
            <button type="button" onClick={addSheet} className="dashboard-workspace-tab-add">
              +
            </button>
          </section>

          <section className="dashboard-workspace-tabs is-secondary">
            {(activeSheet?.dashboards ?? []).map((dashboard) => (
              <WorkspaceTab
                key={dashboard.id}
                item={dashboard}
                isActive={dashboard.id === activeDashboard?.id}
                isEditing={editingTab?.type === "dashboard" && editingTab.id === dashboard.id}
                editingValue={editingValue}
                onSelect={setActiveDashboard}
                onStartEdit={(item) => startEdit("dashboard", item)}
                onChangeEdit={setEditingValue}
                onCommitEdit={commitEdit}
                onCancelEdit={cancelEdit}
                onOpenMenu={(event, item) => openContextMenu("dashboard", item, event)}
                compact
              />
            ))}
            <button type="button" onClick={addDashboard} className="dashboard-workspace-tab-add is-compact">
              +
            </button>
          </section>

          <section className="dashboard-workspace-canvas">
            {hasWidgets ? (
              <ResponsiveGridLayout
                className="dashboard-canvas-grid"
                layouts={canvasLayouts}
                breakpoints={GRID_BREAKPOINTS}
                cols={GRID_COLUMNS}
                rowHeight={DASHBOARD_ROW_HEIGHT}
                margin={DASHBOARD_GRID_MARGIN}
                containerPadding={DASHBOARD_GRID_PADDING}
                isResizable
                isDraggable
                compactType={DASHBOARD_COMPACT_TYPE}
                preventCollision={false}
                onLayoutChange={handleLayoutChange}
              >
                {dashboardWidgets.map((widget) => (
                  <div key={widget.id} className="dashboard-canvas-grid-item">
                    <div
                      className={`dashboard-widget-frame${widget.id === selectedWidgetId ? " is-selected" : ""}`}
                      onClick={() => selectWidget(widget.id)}
                      onContextMenu={(event) => openContextMenu("widget", widget, event)}
                    >
                      <div className="dashboard-widget-frame-head">
                        <div className="dashboard-widget-frame-title">{widget.name}</div>
                        <div className="dashboard-widget-frame-meta">{widget.typeLabel}</div>
                      </div>
                      <div className="dashboard-widget-frame-body">
                        <ChartRendererV2 chart={widget.config} containerHeight="100%" />
                      </div>
                    </div>
                  </div>
                ))}
              </ResponsiveGridLayout>
            ) : (
              <EmptyCanvasState onBuildChart={openBuilderForCurrentContext} />
            )}
          </section>
        </div>

        <SidebarRight
          isOpen={isRightSidebarOpen}
          widgets={dashboardWidgets}
          selectedWidgetId={selectedWidget?.id ?? null}
          exportState={exportState}
          projectName={activeProject?.name ?? ""}
          dashboardName={activeDashboard?.name ?? ""}
          onToggle={toggleRightSidebar}
          onOpenSavedCharts={() => setPickingChart(true)}
          onBuildChart={openBuilderForCurrentContext}
          onAutoArrange={autoArrangeDashboard}
          onSelectWidget={selectWidget}
          onRemoveWidget={removeWidget}
          onExportSelected={() => exportWidgetCode(selectedWidget?.id)}
          onExportDashboard={exportDashboardCode}
          onCopyCode={handleCopyCode}
        />
      </div>

      <div ref={contextMenuRef}>
        <ContextMenu menu={contextMenuState} onRename={handleContextRename} onDelete={handleContextDelete} />
      </div>

      {pickingChart ? (
        <ChartPicker charts={projectCharts} onSelect={handleAddSavedChart} onClose={() => setPickingChart(false)} />
      ) : null}
    </div>
  );
}
