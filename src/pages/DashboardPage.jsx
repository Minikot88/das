import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useStore } from "../store/useStore";
import { PageContainer, WorkspaceLayout } from "../components/layout/Layout";
import { buildDashboardExportCode, buildWidgetExportCode } from "../utils/exportUtils";
import { autoArrangeDashboardLayout } from "../utils/layoutUtils";
import ChartPicker from "../components/dashboard/ChartPicker";
import DashboardGrid from "../components/dashboard/DashboardGrid";
import DashboardFullscreenModal from "../components/dashboard/DashboardFullscreenModal";
import SidebarRight from "../layout/SidebarRight";
import {
  createBuilderContextForDashboard,
  getDashboardWorkspaceStats,
  readBuilderReturnState,
  resolveDashboardWidgets,
  toDashboardChartModel,
} from "../utils/dashboardWorkspace";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

function getNextName(prefix, items = []) {
  return `${prefix} ${items.length + 1}`;
}

function downloadCsv(rows = [], filename = "chart-data") {
  const safeRows = Array.isArray(rows) ? rows : [];
  if (!safeRows.length) return;

  const columns = Array.from(new Set(safeRows.flatMap((row) => Object.keys(row ?? {}))));
  const csv = [
    columns.join(","),
    ...safeRows.map((row) =>
      columns
        .map((column) => {
          const value = row?.[column] ?? "";
          const escaped = String(value).replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadChartAsPng(cardNode, title = "chart") {
  const canvas = cardNode?.querySelector("canvas");
  if (!canvas) return;

  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = `${title}.png`;
  link.click();
}

function WorkspaceTab({
  item,
  isActive,
  isEditing,
  editingValue,
  tone = "sheet",
  onSelect,
  onStartEdit,
  onChangeEdit,
  onCommitEdit,
  onCancelEdit,
  onOpenMenu,
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
      className={`dashboard-workspace-tab is-${tone}${isActive ? " is-active" : ""}`}
    >
      <span className="dashboard-workspace-tab-accent" aria-hidden="true" />
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
        <>
          <span className="dashboard-workspace-tab-pill">{tone === "sheet" ? "Sheet" : "Dashboard"}</span>
          <span className="dashboard-workspace-tab-label">{item.name}</span>
        </>
      )}
    </button>
  );
}

function ContextMenu({ menu, onRename, onDelete }) {
  if (!menu) return null;

  return (
    <div className="dashboard-workspace-context-menu" style={{ left: menu.x, top: menu.y }} role="menu">
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

function EmptyCanvasState({ onBuildChart, onOpenSavedCharts }) {
  return (
    <div className="dashboard-empty-state">
      <div className="dashboard-empty-state-inner">
        <div className="dashboard-empty-state-visual" aria-hidden="true">
          <span className="is-tall" />
          <span className="is-mid" />
          <span className="is-card" />
        </div>
        <div className="dashboard-empty-state-title">Start the canvas</div>
        <div className="dashboard-empty-state-copy">Create a chart or place one from the library.</div>
        <div className="dashboard-empty-state-actions">
          <button type="button" onClick={onBuildChart} className="dashboard-toolbar-btn is-primary">
            New Chart
          </button>
          <button type="button" onClick={onOpenSavedCharts} className="dashboard-toolbar-btn">
            Saved Charts
          </button>
        </div>
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
  const [fullscreenWidgetId, setFullscreenWidgetId] = useState(null);

  const contextMenuRef = useRef(null);
  const previousWidgetCountRef = useRef(0);

  const activeProject = useMemo(
    () => projects.find((project) => project.id === activeProjectId) ?? projects[0] ?? null,
    [projects, activeProjectId]
  );
  const activeSheet = useMemo(
    () => activeProject?.sheets.find((sheet) => sheet.id === activeSheetId) ?? activeProject?.sheets[0] ?? null,
    [activeProject, activeSheetId]
  );
  const activeDashboard = useMemo(
    () => activeSheet?.dashboards.find((dashboard) => dashboard.id === activeDashboardId) ?? activeSheet?.dashboards[0] ?? null,
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
  const workspaceStats = useMemo(() => getDashboardWorkspaceStats(dashboardWidgets), [dashboardWidgets]);
  const hasWidgets = dashboardWidgets.length > 0;
  const selectedWidgetId = ui.selectedWidgetIdByDashboard?.[activeDashboard?.id] ?? null;
  const selectedWidget = dashboardWidgets.find((widget) => widget.id === selectedWidgetId) ?? null;
  const fullscreenWidget = dashboardWidgets.find((widget) => widget.id === fullscreenWidgetId) ?? null;
  const activeSelectionLabel = selectedWidget?.name ?? "No selection";

  useEffect(() => {
    if (!contextMenuState) return undefined;

    function handlePointerDown(event) {
      if (contextMenuRef.current?.contains(event.target)) return;
      setContextMenuState(null);
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setContextMenuState(null);
      }
    }

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
    const builderReturn = readBuilderReturnState(location.state);
    if (!builderReturn) return;

    const store = useStore.getState();
    if (builderReturn.projectId !== store.activeProjectId) store.setActiveProject(builderReturn.projectId);
    if (builderReturn.sheetId !== store.activeSheetId) store.setActiveSheet(builderReturn.sheetId);
    if (builderReturn.dashboardId !== store.activeDashboardId) store.setActiveDashboard(builderReturn.dashboardId);

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

  useEffect(() => {
    if (fullscreenWidgetId && !dashboardWidgets.some((widget) => widget.id === fullscreenWidgetId)) {
      setFullscreenWidgetId(null);
    }
  }, [dashboardWidgets, fullscreenWidgetId]);

  if (!activeProject || !activeSheet || !activeDashboard) {
    return (
      <PageContainer className="dashboard-workspace-page">
        <EmptyCanvasState onBuildChart={() => navigate("/")} onOpenSavedCharts={() => navigate("/")} />
      </PageContainer>
    );
  }

  function startEdit(type, item) {
    setContextMenuState(null);
    if (type === "widget") {
      const nextName = window.prompt("Rename chart", item.name);
      if (nextName && nextName.trim() && activeSheet?.id) {
        renameChartWidget(activeSheet.id, item.id, nextName.trim());
      }
      return;
    }

    setEditingTab({ type, id: item.id });
    setEditingValue(item.name);
  }

  function cancelEdit() {
    setEditingTab(null);
    setEditingValue("");
  }

  function commitEdit() {
    if (!editingTab) return;

    const nextName = editingValue.trim();
    if (!nextName) {
      cancelEdit();
      return;
    }

    if (editingTab.type === "sheet") renameSheet(editingTab.id, nextName);
    if (editingTab.type === "dashboard") renameDashboard(editingTab.id, nextName);
    cancelEdit();
  }

  function addSheet() {
    createSheet(getNextName("Sheet", activeProject?.sheets ?? []));
  }

  function addDashboard() {
    createDashboard(getNextName("Dashboard", activeSheet?.dashboards ?? []));
  }

  function duplicateSheet(sheetId) {
    duplicateSheetAction(sheetId);
    setContextMenuState(null);
  }

  function duplicateDashboard(dashboardId) {
    duplicateDashboardAction(dashboardId);
    setContextMenuState(null);
  }

  function duplicateWidget(widgetId) {
    if (!activeSheet?.id || !widgetId) return;
    duplicateChart(activeSheet.id, widgetId);
    setContextMenuState(null);
  }

  function deleteSheet(sheetId) {
    removeSheet(sheetId);
    setContextMenuState(null);
  }

  function deleteDashboard(dashboardId) {
    removeDashboard(dashboardId);
    setContextMenuState(null);
  }

  function removeWidget(widgetId) {
    if (!activeSheet?.id) return;
    removeChart(activeSheet.id, widgetId);
    setContextMenuState(null);
  }

  function handleLayoutChange(nextLayout) {
    if (!activeSheet?.id) return;
    updateLayout(activeSheet.id, nextLayout);
  }

  function openContextMenu(type, target, event) {
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
  }

  function openBuilderForCurrentContext() {
    const builderContext = createBuilderContextForDashboard({
      projectId: currentProjectId,
      sheetId: activeSheet?.id,
      dashboardId: activeDashboard?.id,
      returnTo: "/dashboard",
    });
    if (!builderContext) return;

    setBuilderNavigationContext(builderContext);
    navigate("/builder", { state: { builderContext } });
  }

  function autoArrangeDashboard() {
    if (!activeSheet?.id || !dashboardWidgets.length) return;
    updateLayout(activeSheet.id, autoArrangeDashboardLayout(dashboardWidgets));
  }

  function handleAddSavedChart(chartId) {
    addChartToDashboard(chartId);
    setPickingChart(false);
  }

  function toggleRightSidebar() {
    setRightPanelOpen(!rightPanelOpen);
  }

  function selectWidget(widgetId) {
    setSelectedWidget(activeDashboard?.id, widgetId);
  }

  function exportWidgetCode(widgetId) {
    const widget = dashboardWidgets.find((item) => item.id === widgetId);
    if (!widget) return;

    setExportState({
      target: widget.id,
      mode: "widget",
      title: `Export: ${widget.name}`,
      code: buildWidgetExportCode(widget),
    });
  }

  function exportDashboardCode() {
    if (!dashboardWidgets.length) return;

    setExportState({
      target: activeDashboard?.id,
      mode: "dashboard",
      title: `Export: ${activeDashboard?.name ?? "Dashboard"}`,
      code: buildDashboardExportCode(activeDashboard?.name ?? "Dashboard", dashboardWidgets),
    });
  }

  async function handleCopyCode() {
    if (!exportState?.code) return;

    try {
      await navigator.clipboard.writeText(exportState.code);
    } catch {
      window.prompt("คัดลอกโค้ดด้านล่าง", exportState.code);
    }
  }

  function handleContextRename() {
    if (!contextMenuState) return;
    startEdit(contextMenuState.type, contextMenuState.target);
  }

  function handleContextDelete() {
    if (!contextMenuState) return;
    if (contextMenuState.type === "sheet") return deleteSheet(contextMenuState.target.id);
    if (contextMenuState.type === "dashboard") return deleteDashboard(contextMenuState.target.id);
    return removeWidget(contextMenuState.target.id);
  }

  function handleExportCsv(chart, rows) {
    downloadCsv(rows, chart?.title || chart?.name || "chart-data");
  }

  function handleExportPng(cardNode, chart) {
    downloadChartAsPng(cardNode, chart?.title || chart?.name || "chart");
  }

  const toolbarItems = [
    {
      key: "panel",
      label: rightPanelOpen ? "Hide Panel" : "Show Panel",
      onClick: toggleRightSidebar,
    },
    {
      key: "saved",
      label: "Add Chart",
      onClick: () => setPickingChart(true),
    },
    {
      key: "arrange",
      label: "Arrange",
      onClick: autoArrangeDashboard,
      disabled: !dashboardWidgets.length,
    },
  ];

  return (
    <PageContainer className="dashboard-workspace-page">
      <WorkspaceLayout columns="two" className={`dashboard-workspace-shell${rightPanelOpen ? "" : " is-rail-collapsed"}`}>
        <div className="dashboard-workspace-main">
          <header className="dashboard-workspace-header">
            <div className="dashboard-workspace-header-copy">
              <div className="dashboard-workspace-breadcrumb">
                <span>{activeProject.name}</span>
                <span className="dashboard-workspace-breadcrumb-separator">/</span>
                <span>{activeSheet.name}</span>
                <span className="dashboard-workspace-breadcrumb-separator">/</span>
                <span>{activeDashboard.name}</span>
              </div>

              <div className="dashboard-workspace-title-row">
                <div className="dashboard-workspace-title-copy">
                  <div className="dashboard-workspace-title-topline">
                    <span className={`dashboard-workspace-status${hasWidgets ? " is-live" : ""}`}>
                      {hasWidgets ? "Live" : "Draft"}
                    </span>
                  </div>
                  <h1 className="dashboard-workspace-title">{activeDashboard.name}</h1>
                  <div className="dashboard-workspace-meta">
                    <span>{workspaceStats.chartCount} charts</span>
                    <span>{workspaceStats.readyChartsCount} ready</span>
                    <span>{selectedWidget ? "1 selected" : "No selection"}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="dashboard-workspace-header-actions">
              <div className="dashboard-workspace-stat-row">
                <div className="dashboard-workspace-stat">
                  <span>Charts</span>
                  <strong>{workspaceStats.chartCount}</strong>
                </div>
                <div className="dashboard-workspace-stat">
                  <span>Ready</span>
                  <strong>{workspaceStats.readyChartsCount}</strong>
                </div>
                <div className="dashboard-workspace-stat">
                  <span>Selection</span>
                  <strong>{selectedWidget ? "1" : "0"}</strong>
                </div>
              </div>
              <div className="dashboard-workspace-header-quick-actions">
                <button type="button" onClick={() => setPickingChart(true)} className="dashboard-toolbar-btn">
                  Add Chart
                </button>
                <button type="button" onClick={openBuilderForCurrentContext} className="dashboard-toolbar-btn is-primary">
                  New Chart
                </button>
              </div>
            </div>
          </header>

          <section className="dashboard-workspace-toolbar">
            <div className="dashboard-workspace-toolbar-group dashboard-workspace-toolbar-group-main">
              <div className="dashboard-workspace-action-strip">
                {toolbarItems.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={item.onClick}
                    disabled={item.disabled}
                    className="dashboard-toolbar-btn"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="dashboard-workspace-toolbar-summary">
              <div className="dashboard-workspace-toolbar-meta">
                <span>Project</span>
                <strong>{activeProject.name}</strong>
              </div>
              <div className="dashboard-workspace-toolbar-meta">
                <span>Selection</span>
                <strong>{activeSelectionLabel}</strong>
              </div>
            </div>
          </section>

          <section className="dashboard-workspace-tabs-section">
            <div className="dashboard-workspace-tabs-head">
              <span className="dashboard-workspace-tabs-label">Sheets</span>
            </div>
            <div className="dashboard-workspace-tabs-row is-sheet-row">
              {(activeProject.sheets ?? []).map((sheet) => (
                <WorkspaceTab
                  key={sheet.id}
                  item={sheet}
                  isActive={sheet.id === activeSheet.id}
                  isEditing={editingTab?.type === "sheet" && editingTab.id === sheet.id}
                  editingValue={editingValue}
                  tone="sheet"
                  onSelect={setActiveSheet}
                  onStartEdit={(item) => startEdit("sheet", item)}
                  onChangeEdit={setEditingValue}
                  onCommitEdit={commitEdit}
                  onCancelEdit={cancelEdit}
                  onOpenMenu={(event, item) => openContextMenu("sheet", item, event)}
                />
              ))}
              <button type="button" onClick={addSheet} className="dashboard-workspace-tab-add" aria-label="Add sheet">
                + Sheet
              </button>
            </div>

            <div className="dashboard-workspace-tabs-subhead">
              <span className="dashboard-workspace-tabs-label">Dashboards</span>
            </div>
            <div className="dashboard-workspace-tabs-row is-dashboard-row">
              {(activeSheet.dashboards ?? []).map((dashboard) => (
                <WorkspaceTab
                  key={dashboard.id}
                  item={dashboard}
                  isActive={dashboard.id === activeDashboard.id}
                  isEditing={editingTab?.type === "dashboard" && editingTab.id === dashboard.id}
                  editingValue={editingValue}
                  tone="dashboard"
                  onSelect={setActiveDashboard}
                  onStartEdit={(item) => startEdit("dashboard", item)}
                  onChangeEdit={setEditingValue}
                  onCommitEdit={commitEdit}
                  onCancelEdit={cancelEdit}
                  onOpenMenu={(event, item) => openContextMenu("dashboard", item, event)}
                />
              ))}
              <button type="button" onClick={addDashboard} className="dashboard-workspace-tab-add is-secondary" aria-label="Add dashboard">
                + Dashboard
              </button>
            </div>
          </section>

          <section className="dashboard-workspace-canvas">
            <div className="dashboard-workspace-canvas-head">
              <div className="dashboard-workspace-canvas-heading">
                <div className="dashboard-workspace-canvas-title">Canvas</div>
              </div>
              <div className="dashboard-workspace-canvas-meta">
                <span>{hasWidgets ? `${workspaceStats.chartCount} widgets` : "Empty"}</span>
              </div>
            </div>

            <div className="dashboard-workspace-canvas-frame">
              <div className="dashboard-workspace-canvas-strip">
                <span className="dashboard-workspace-canvas-strip-item">{workspaceStats.chartCount} charts</span>
                <span className="dashboard-workspace-canvas-strip-item">{activeSelectionLabel}</span>
                <span className="dashboard-workspace-canvas-strip-item">{rightPanelOpen ? "Inspector on" : "Inspector off"}</span>
              </div>

              {hasWidgets ? (
                <DashboardGrid
                  widgets={dashboardWidgets}
                  layout={activeDashboard.layout ?? []}
                  selectedWidgetId={selectedWidgetId}
                  onSelectWidget={selectWidget}
                  onOpenWidgetMenu={(widget, event) => openContextMenu("widget", widget, event)}
                  onLayoutChange={handleLayoutChange}
                  onExportCSV={handleExportCsv}
                  onExportPNG={handleExportPng}
                  fullscreenChartId={fullscreenWidgetId}
                  onToggleFullscreen={(widgetId) => setFullscreenWidgetId((current) => current === widgetId ? null : widgetId)}
                />
              ) : (
                <EmptyCanvasState
                  onBuildChart={openBuilderForCurrentContext}
                  onOpenSavedCharts={() => setPickingChart(true)}
                />
              )}
            </div>
          </section>
        </div>

        <SidebarRight
          isOpen={rightPanelOpen}
          widgets={dashboardWidgets}
          selectedWidgetId={selectedWidget?.id ?? null}
          exportState={exportState}
          projectName={activeProject.name}
          dashboardName={activeDashboard.name}
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
      </WorkspaceLayout>

      <div ref={contextMenuRef}>
        <ContextMenu menu={contextMenuState} onRename={handleContextRename} onDelete={handleContextDelete} />
      </div>

      {pickingChart ? (
        <ChartPicker charts={projectCharts} onSelect={handleAddSavedChart} onClose={() => setPickingChart(false)} />
      ) : null}

      {fullscreenWidget ? (
        <DashboardFullscreenModal
          chart={toDashboardChartModel(fullscreenWidget)}
          sheetId={activeSheet.id}
          onExportCSV={handleExportCsv}
          onExportPNG={handleExportPng}
          onClose={() => setFullscreenWidgetId(null)}
        />
      ) : null}
    </PageContainer>
  );
}
