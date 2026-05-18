import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useStore } from "../store/useStore";
import { PageContainer, WorkspaceLayout } from "../components/layout/Layout";
import { autoArrangeDashboardLayout, DASHBOARD_GRID_MARGIN, DASHBOARD_ROW_HEIGHT } from "../utils/layoutUtils";
import ChartPicker from "../components/dashboard/ChartPicker";
import DashboardGrid from "../components/dashboard/DashboardGrid";
import DashboardFullscreenModal from "../components/dashboard/DashboardFullscreenModal";
import DashboardShareModal from "../components/dashboard/DashboardShareModal";
import SidebarRight from "../layout/SidebarRight";
import useDashboard from "../features/dashboard/hooks/useDashboard";
import {
  createBuilderContextForDashboard,
  getDashboardWorkspaceStats,
  readBuilderReturnState,
  toDashboardChartModel,
} from "../utils/dashboardWorkspace";
import {
  buildDashboardEmbedCode,
  buildDashboardViewUrl,
  exportNodeAsImage,
  sanitizeFileName,
} from "../utils/dashboardShareUtils";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

function getNextName(prefix, items = []) {
  return `${prefix} ${items.length + 1}`;
}

function getChartExportRows(chart = {}, rows = []) {
  if (Array.isArray(rows) && rows.length) return rows;
  if (Array.isArray(chart.data) && chart.data.length) return chart.data;
  if (Array.isArray(chart.queryResult?.rows) && chart.queryResult.rows.length) return chart.queryResult.rows;
  return [];
}

function downloadCsv(rows = [], filename = "chart-data", onError = () => {}) {
  const safeRows = Array.isArray(rows) ? rows : [];
  if (!safeRows.length) {
    onError("No rows available to export yet.");
    return false;
  }

  const columns = Array.from(new Set(safeRows.flatMap((row) => Object.keys(row ?? {}))));
  if (!columns.length) {
    onError("No columns available to export yet.");
    return false;
  }
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

  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${sanitizeFileName(filename)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return true;
}

async function downloadChartAsPng(cardNode, title = "chart", onError = () => {}) {
  const canvas = cardNode?.querySelector("canvas");
  if (!canvas) {
    if (cardNode instanceof HTMLElement) {
      await exportNodeAsImage(cardNode, {
        filename: title,
        format: "png",
        backgroundColor: getComputedStyle(document.documentElement).getPropertyValue("--surface")?.trim() || "#ffffff",
      });
      return true;
    }

    onError("Unable to find a rendered chart to export.");
    return false;
  }

  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = `${sanitizeFileName(title)}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  return true;
}

function DashboardNotice({ notice, onClose }) {
  if (!notice) return null;

  return (
    <div className={`dashboard-notice is-${notice.tone ?? "info"}`} role="status">
      <span>{notice.message}</span>
      <button type="button" onClick={onClose} aria-label="Dismiss notification">
        x
      </button>
    </div>
  );
}

function RenameWidgetModal({ widget, value, onChange, onCancel, onSave }) {
  if (!widget) return null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={onCancel}>
      <div className="modal-box ui-surface" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-copy">
            <h2 className="modal-title">Rename chart</h2>
          </div>
          <button type="button" className="modal-close-btn" onClick={onCancel} aria-label="Close rename dialog">x</button>
        </div>
        <form className="modal-body" onSubmit={onSave}>
          <label className="input-label" htmlFor="rename-widget-input">Chart name</label>
          <input
            id="rename-widget-input"
            className="input-control modal-field"
            value={value}
            maxLength={80}
            autoFocus
            onChange={(event) => onChange(event.target.value)}
          />
          <div className="modal-actions">
            <button type="button" className="ui-button is-ghost modal-btn cancel" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="ui-button is-primary modal-btn primary" disabled={!value.trim()}>
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
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

function ContextMenu({ menu, onEdit, onRename, onDelete }) {
  if (!menu) return null;
  const canEdit = menu.type === "widget";

  return (
    <div className="dashboard-workspace-context-menu" style={{ left: menu.x, top: menu.y }} role="menu">
      {canEdit ? (
        <button type="button" className="dashboard-context-menu-item" onClick={onEdit}>
          Edit
        </button>
      ) : null}
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
  const MIN_CANVAS_HEIGHT = 420;
  const CANVAS_BOTTOM_PADDING = 96;
  const CANVAS_SIZE_PRESETS = {
    auto: { label: "Auto / Responsive", width: null, height: null, mode: "auto" },
    "16:9": { label: "16:9 Presentation", width: 1280, height: 720, mode: "preset" },
    "4:3": { label: "4:3 Presentation", width: 1024, height: 768, mode: "preset" },
    square: { label: "Square", width: 1080, height: 1080, mode: "preset" },
    "a4-portrait": { label: "A4 Portrait", width: 794, height: 1123, mode: "preset" },
    "a4-landscape": { label: "A4 Landscape", width: 1123, height: 794, mode: "preset" },
    custom: { label: "Custom", width: 1280, height: 720, mode: "custom" },
  };
  const navigate = useNavigate();
  const location = useLocation();
  const projects = useStore((state) => state.projects);
  const activeProjectId = useStore((state) => state.activeProjectId);
  const activeSheetId = useStore((state) => state.activeSheetId);
  const activeDashboardId = useStore((state) => state.activeDashboardId);
  const chartsPool = useStore((state) => state.charts);
  const ui = useStore((state) => state.ui);
  const addChartToDashboard = useStore((state) => state.addChartToDashboard);
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
  const getOrCreateDashboardShareLink = useStore((state) => state.getOrCreateDashboardShareLink);
  const updateDashboardCanvasSize = useStore((state) => state.updateDashboardCanvasSize);

  const [pickingChart, setPickingChart] = useState(false);
  const [editingTab, setEditingTab] = useState(null);
  const [editingValue, setEditingValue] = useState("");
  const [contextMenuState, setContextMenuState] = useState(null);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const [pendingCreatedWidgetId, setPendingCreatedWidgetId] = useState(null);
  const [fullscreenWidgetId, setFullscreenWidgetId] = useState(null);
  const [shareModalTab, setShareModalTab] = useState("share");
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [dashboardShareId, setDashboardShareId] = useState("");
  const [notice, setNotice] = useState(null);
  const [renameWidgetTarget, setRenameWidgetTarget] = useState(null);
  const [renameWidgetValue, setRenameWidgetValue] = useState("");
  const [dashboardExporting, setDashboardExporting] = useState(false);
  const [previewLayout, setPreviewLayout] = useState(null);
  const [shareOptions, setShareOptions] = useState({
    width: 1200,
    height: 720,
    responsive: true,
    theme: "auto",
    showHeader: false,
  });

  const contextMenuRef = useRef(null);
  const actionsMenuRef = useRef(null);
  const dashboardCaptureRef = useRef(null);
  const previousWidgetCountRef = useRef(0);
  const removingWidgetIdsRef = useRef(new Set());

  function notify(message, tone = "info") {
    setNotice({ message, tone, id: Date.now() });
  }

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
  const dashboardWidgets = useDashboard({
    projectId: currentProjectId,
    sheetId: activeSheet?.id,
    dashboardId: activeDashboard?.id,
    layout: activeDashboard?.layout ?? [],
    charts: chartsPool,
  });
  const workspaceStats = useMemo(() => getDashboardWorkspaceStats(dashboardWidgets), [dashboardWidgets]);
  const canvasLayout = useMemo(
    () => previewLayout ?? activeDashboard?.layout ?? [],
    [previewLayout, activeDashboard?.layout]
  );
  const canvasMinHeight = useMemo(() => {
    const maxBottom = (canvasLayout ?? []).reduce((max, item) => {
      const y = item?.y ?? 0;
      const h = item?.h ?? 0;
      return Math.max(max, y + h);
    }, 0);
    const contentHeight = maxBottom > 0
      ? (maxBottom * DASHBOARD_ROW_HEIGHT) + (Math.max(0, maxBottom - 1) * DASHBOARD_GRID_MARGIN[1]) + CANVAS_BOTTOM_PADDING
      : MIN_CANVAS_HEIGHT;
    return Math.max(MIN_CANVAS_HEIGHT, contentHeight);
  }, [canvasLayout, CANVAS_BOTTOM_PADDING, MIN_CANVAS_HEIGHT]);
  const hasWidgets = dashboardWidgets.length > 0;
  const selectedWidgetId = ui.selectedWidgetIdByDashboard?.[activeDashboard?.id] ?? null;
  const selectedWidget = dashboardWidgets.find((widget) => widget.id === selectedWidgetId) ?? null;
  const canvasSize = activeDashboard?.canvasSize ?? CANVAS_SIZE_PRESETS.auto;
  const canvasPresetKey = canvasSize?.preset ?? "auto";
  const isAutoCanvas = canvasPresetKey === "auto";
  const selectedCanvasWidth = canvasSize?.width ?? CANVAS_SIZE_PRESETS[canvasPresetKey]?.width ?? null;
  const selectedCanvasHeight = canvasSize?.height ?? CANVAS_SIZE_PRESETS[canvasPresetKey]?.height ?? null;
  const canvasFrameWidth = isAutoCanvas ? null : Math.max(320, selectedCanvasWidth ?? 1280);
  const canvasFrameHeight = Math.max(
    isAutoCanvas ? MIN_CANVAS_HEIGHT : (selectedCanvasHeight ?? MIN_CANVAS_HEIGHT),
    canvasMinHeight
  );
  const fullscreenWidget = dashboardWidgets.find((widget) => widget.id === fullscreenWidgetId) ?? null;
  const activeSelectionLabel = selectedWidget?.name ?? "No selection";
  const publicViewUrl = useMemo(
    () => activeDashboard?.id
      ? buildDashboardViewUrl({
          dashboardId: activeDashboard.id,
          mode: "view",
          theme: shareOptions.theme,
          showHeader: true,
          shareId: dashboardShareId,
        })
      : "",
    [activeDashboard?.id, dashboardShareId, shareOptions.theme]
  );
  const embedViewUrl = useMemo(
    () => activeDashboard?.id
      ? buildDashboardViewUrl({
          dashboardId: activeDashboard.id,
          mode: "embed",
          theme: shareOptions.theme,
          showHeader: shareOptions.showHeader,
          shareId: dashboardShareId,
        })
      : "",
    [activeDashboard?.id, dashboardShareId, shareOptions.showHeader, shareOptions.theme]
  );
  const embedCode = useMemo(
    () =>
      buildDashboardEmbedCode({
        src: embedViewUrl,
        width: shareOptions.width,
        height: shareOptions.height,
        responsive: shareOptions.responsive,
      }),
    [embedViewUrl, shareOptions.height, shareOptions.responsive, shareOptions.width]
  );

  useEffect(() => {
    if (!contextMenuState && !actionsMenuOpen) return undefined;

    function handlePointerDown(event) {
      if (contextMenuRef.current?.contains(event.target)) return;
      if (actionsMenuRef.current?.contains(event.target)) return;
      setContextMenuState(null);
      setActionsMenuOpen(false);
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setContextMenuState(null);
        setActionsMenuOpen(false);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [actionsMenuOpen, contextMenuState]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(null), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    const previousCount = previousWidgetCountRef.current;

    if (!dashboardWidgets.length) {
      setSelectedWidget(activeDashboard?.id, null);
    } else if (dashboardWidgets.length > previousCount) {
      setSelectedWidget(activeDashboard?.id, dashboardWidgets[dashboardWidgets.length - 1].id);
    } else if (!dashboardWidgets.some((widget) => widget.id === selectedWidgetId)) {
      setSelectedWidget(activeDashboard?.id, null);
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

  useEffect(() => {
    if (!removingWidgetIdsRef.current.size) return;

    const liveWidgetIds = new Set(dashboardWidgets.map((widget) => widget.id));
    removingWidgetIdsRef.current.forEach((widgetId) => {
      if (!liveWidgetIds.has(widgetId)) {
        removingWidgetIdsRef.current.delete(widgetId);
      }
    });
  }, [dashboardWidgets]);

  useEffect(() => {
    if (!currentProjectId || !activeSheet?.id || !activeDashboard?.id) {
      setDashboardShareId("");
      return;
    }

    const shareId = getOrCreateDashboardShareLink({
      projectId: currentProjectId,
      sheetId: activeSheet.id,
      dashboardId: activeDashboard.id,
    });
    setDashboardShareId(shareId);
  }, [activeDashboard?.id, activeSheet?.id, currentProjectId, getOrCreateDashboardShareLink]);

  useEffect(() => {
    setPreviewLayout(null);
  }, [activeDashboard?.id]);

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
      setRenameWidgetTarget(item);
      setRenameWidgetValue(item.name ?? "");
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

    if (editingTab.type === "dashboard") renameDashboard(editingTab.id, nextName);
    cancelEdit();
  }

  function addDashboard() {
    createDashboard(getNextName("Dashboard", activeSheet?.dashboards ?? []));
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

  function deleteDashboard(dashboardId) {
    removeDashboard(dashboardId);
    setContextMenuState(null);
  }

  function removeWidget(widgetId) {
    if (!activeSheet?.id || !activeDashboard?.id) return;
    const widget = dashboardWidgets.find((item) => item.id === widgetId);
    const layoutWidgetId = widget?.layout?.i ?? widgetId;
    removingWidgetIdsRef.current.add(layoutWidgetId);
    if (activeDashboardId !== activeDashboard.id) {
      setActiveDashboard(activeDashboard.id);
    }
    removeChart(activeSheet.id, layoutWidgetId, activeDashboard.id);
    if (layoutWidgetId === selectedWidgetId || widgetId === selectedWidgetId) {
      setSelectedWidget(activeDashboard?.id, null);
    }
    setContextMenuState(null);
  }

  function handleLayoutChange(nextLayout) {
    if (!activeSheet?.id) return;
    setPreviewLayout(null);
    const removingWidgetIds = removingWidgetIdsRef.current;
    const nextSafeLayout = removingWidgetIds.size
      ? nextLayout.filter((item) => !removingWidgetIds.has(item.i))
      : nextLayout;
    updateLayout(activeSheet.id, nextSafeLayout);
  }

  function handleLayoutPreviewChange(nextLayout) {
    setPreviewLayout(nextLayout);
  }

  function openContextMenu(type, target, event) {
    event.preventDefault();
    if (type === "dashboard") setActiveDashboard(target.id);
    if (type === "widget") setSelectedWidget(activeDashboard?.id, target.id);

    setContextMenuState({
      type,
      target,
      x: event.clientX,
      y: event.clientY,
      onDuplicate: () => {
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

  function openBuilderForSavedChart(chart) {
    const savedChartId = chart?.chartId ?? chart?.id;
    const builderContext = createBuilderContextForDashboard({
      projectId: currentProjectId,
      sheetId: activeSheet?.id,
      dashboardId: activeDashboard?.id,
      returnTo: "/dashboard",
    });

    if (!savedChartId || !builderContext) {
      notify("Unable to open this chart for editing.", "warning");
      return;
    }

    setBuilderNavigationContext(builderContext);
    navigate(`/builder?chartId=${encodeURIComponent(savedChartId)}`, { state: { builderContext } });
  }

  function autoArrangeDashboard() {
    if (!activeSheet?.id || !dashboardWidgets.length) return;
    updateLayout(activeSheet.id, autoArrangeDashboardLayout(dashboardWidgets));
  }

  function handleAddSavedChart(chartId) {
    addChartToDashboard(chartId);
    setPickingChart(false);
  }

  function selectWidget(widgetId) {
    setSelectedWidget(activeDashboard?.id, widgetId);
  }

  function openShareModal(nextTab = "share") {
    setActionsMenuOpen(false);
    setShareModalTab(nextTab);
    setShareModalOpen(true);
  }

  function closeShareModal() {
    setShareModalOpen(false);
  }

  function updateShareOptions(patch) {
    setShareOptions((current) => ({
      ...current,
      ...patch,
    }));
  }

  function handleCanvasPresetChange(nextPreset) {
    if (!activeDashboard?.id || !CANVAS_SIZE_PRESETS[nextPreset]) return;
    const preset = CANVAS_SIZE_PRESETS[nextPreset];
    updateDashboardCanvasSize(activeDashboard.id, {
      mode: preset.mode,
      preset: nextPreset,
      width: preset.width,
      height: preset.height,
    });
  }

  function handleCanvasCustomSizeChange(field, value) {
    if (!activeDashboard?.id) return;
    const nextNumber = Number(value);
    const safeValue = Number.isFinite(nextNumber) && nextNumber > 0 ? Math.round(nextNumber) : null;
    updateDashboardCanvasSize(activeDashboard.id, {
      mode: "custom",
      preset: "custom",
      width: field === "width" ? safeValue : (canvasSize?.width ?? CANVAS_SIZE_PRESETS.custom.width),
      height: field === "height" ? safeValue : (canvasSize?.height ?? CANVAS_SIZE_PRESETS.custom.height),
    });
  }

  function handleContextRename() {
    if (!contextMenuState) return;
    startEdit(contextMenuState.type, contextMenuState.target);
  }

  function handleContextEdit() {
    if (!contextMenuState || contextMenuState.type !== "widget") return;
    const target = contextMenuState.target;
    setContextMenuState(null);
    openBuilderForSavedChart(target);
  }

  function handleContextDelete() {
    if (!contextMenuState) return;
    if (contextMenuState.type === "dashboard") return deleteDashboard(contextMenuState.target.id);
    return removeWidget(contextMenuState.target.id);
  }

  function closeRenameWidgetModal() {
    setRenameWidgetTarget(null);
    setRenameWidgetValue("");
  }

  function commitWidgetRename(event) {
    event.preventDefault();
    const nextName = renameWidgetValue.trim();
    if (!renameWidgetTarget || !activeSheet?.id || !nextName) return;
    renameChartWidget(activeSheet.id, renameWidgetTarget.id, nextName);
    closeRenameWidgetModal();
  }

  function handleExportCsv(chart, rows) {
    downloadCsv(getChartExportRows(chart, rows), chart?.title || chart?.name || "chart-data", (message) => notify(message, "warning"));
  }

  async function handleExportPng(cardNode, chart) {
    try {
      await downloadChartAsPng(cardNode, chart?.title || chart?.name || "chart", (message) => notify(message, "warning"));
    } catch (error) {
      notify(error?.message || "Unable to export this chart right now.", "warning");
    }
  }

  async function handleDownloadDashboardImage(format = "png") {
    if (!dashboardWidgets.length || !(dashboardCaptureRef.current instanceof HTMLElement)) return;

    setDashboardExporting(true);

    try {
      await new Promise((resolve) => window.setTimeout(resolve, 180));
      await exportNodeAsImage(dashboardCaptureRef.current, {
        filename: activeDashboard?.name ?? "dashboard",
        format,
        backgroundColor: getComputedStyle(document.documentElement).getPropertyValue("--surface")?.trim() || "#ffffff",
      });
    } catch (error) {
      notify(error?.message || "Unable to export this dashboard right now.", "warning");
    } finally {
      setDashboardExporting(false);
    }
  }

  const toolbarItems = [
    {
      key: "saved",
      label: "Add Chart",
      onClick: () => setPickingChart(true),
    },
    {
      key: "new",
      label: "New Chart",
      onClick: openBuilderForCurrentContext,
      primary: true,
    },
    {
      key: "arrange",
      label: "Auto Layout",
      onClick: autoArrangeDashboard,
      disabled: !dashboardWidgets.length,
    },
  ];

  return (
    <PageContainer className="dashboard-workspace-page">
      <DashboardNotice notice={notice} onClose={() => setNotice(null)} />

      <WorkspaceLayout
        columns="two"
        className="dashboard-workspace-shell is-inspector-open"
      >
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
            </div>
          </header>

          <section className="dashboard-workspace-toolbar dashboard-command-strip">
            <div className="dashboard-workspace-toolbar-group dashboard-workspace-toolbar-group-main">
              <div className="dashboard-workspace-action-strip">
                {toolbarItems.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={item.onClick}
                    disabled={item.disabled}
                    className={`dashboard-toolbar-btn${item.primary ? " is-primary" : ""}`}
                  >
                    {item.label}
                  </button>
                ))}
                <div className="dashboard-actions-menu" ref={actionsMenuRef}>
                  <button
                    type="button"
                    onClick={() => setActionsMenuOpen((isOpen) => !isOpen)}
                    className="dashboard-toolbar-btn"
                    aria-haspopup="menu"
                    aria-expanded={actionsMenuOpen}
                  >
                    Actions
                  </button>
                  {actionsMenuOpen ? (
                    <div className="dashboard-actions-menu-list" role="menu">
                      <button
                        type="button"
                        className="dashboard-context-menu-item"
                        role="menuitem"
                        onClick={() => openShareModal("export")}
                        disabled={!dashboardWidgets.length}
                      >
                        Export
                      </button>
                      <button
                        type="button"
                        className="dashboard-context-menu-item"
                        role="menuitem"
                        onClick={() => openShareModal("share")}
                      >
                        Share
                      </button>
                      <button
                        type="button"
                        className="dashboard-context-menu-item"
                        role="menuitem"
                        onClick={() => openShareModal("embed")}
                      >
                        Embed
                      </button>
                    </div>
                  ) : null}
                </div>
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
              <div className="dashboard-canvas-size-controls">
                <label className="dashboard-canvas-size-label" htmlFor="dashboard-canvas-size-select">Canvas size</label>
                <select
                  id="dashboard-canvas-size-select"
                  className="dashboard-canvas-size-select"
                  value={canvasPresetKey}
                  onChange={(event) => handleCanvasPresetChange(event.target.value)}
                >
                  {Object.entries(CANVAS_SIZE_PRESETS).map(([key, preset]) => (
                    <option key={key} value={key}>{preset.label}</option>
                  ))}
                </select>
                {canvasPresetKey === "custom" ? (
                  <div className="dashboard-canvas-size-custom">
                    <input
                      type="number"
                      min="320"
                      step="1"
                      value={canvasSize?.width ?? CANVAS_SIZE_PRESETS.custom.width}
                      onChange={(event) => handleCanvasCustomSizeChange("width", event.target.value)}
                      aria-label="Canvas width"
                    />
                    <span>x</span>
                    <input
                      type="number"
                      min="240"
                      step="1"
                      value={canvasSize?.height ?? CANVAS_SIZE_PRESETS.custom.height}
                      onChange={(event) => handleCanvasCustomSizeChange("height", event.target.value)}
                      aria-label="Canvas height"
                    />
                  </div>
                ) : null}
              </div>
            </div>

            <div className="dashboard-workspace-canvas-stage">
              <div
                className={`dashboard-workspace-canvas-frame${hasWidgets ? " is-populated" : " is-empty"}${isAutoCanvas ? " is-auto-canvas" : " is-fixed-canvas"}`}
                style={{
                  minHeight: `${canvasFrameHeight}px`,
                  height: `${canvasFrameHeight}px`,
                  width: canvasFrameWidth ? `${canvasFrameWidth}px` : "100%",
                  minWidth: canvasFrameWidth ? `${canvasFrameWidth}px` : "100%",
                }}
              >
              {hasWidgets ? (
                <DashboardGrid
                  widgets={dashboardWidgets}
                  layout={activeDashboard.layout ?? []}
                  selectedWidgetId={selectedWidgetId}
                  onSelectWidget={selectWidget}
                  onOpenWidgetMenu={(widget, event) => openContextMenu("widget", widget, event)}
                  onLayoutChange={handleLayoutChange}
                  onLayoutPreviewChange={handleLayoutPreviewChange}
                  onExportCSV={handleExportCsv}
                  onExportPNG={handleExportPng}
                  onEditChart={openBuilderForSavedChart}
                  fullscreenChartId={fullscreenWidgetId}
                  onToggleFullscreen={(widgetId) => setFullscreenWidgetId((current) => current === widgetId ? null : widgetId)}
                  showCardHeader={false}
                />
              ) : (
                <EmptyCanvasState
                  onBuildChart={openBuilderForCurrentContext}
                  onOpenSavedCharts={() => setPickingChart(true)}
                />
              )}
              </div>
            </div>
          </section>
        </div>

        <SidebarRight
          widgets={dashboardWidgets}
          selectedWidgetId={selectedWidget?.id ?? null}
          projectName={activeProject.name}
          dashboardName={activeDashboard.name}
          onSelectWidget={selectWidget}
          onRemoveWidget={removeWidget}
        />
      </WorkspaceLayout>

      {(shareModalOpen || dashboardExporting) && hasWidgets ? (
        <div className="dashboard-export-stage" aria-hidden="true">
          <div ref={dashboardCaptureRef} className="dashboard-export-surface">
            <div className="dashboard-export-surface-head">
              <div className="dashboard-export-surface-copy">
                <span className="dashboard-export-surface-kicker">{activeProject.name} / {activeSheet.name}</span>
                <strong>{activeDashboard.name}</strong>
              </div>
              <div className="dashboard-export-surface-badges">
                <span>{workspaceStats.chartCount} charts</span>
                <span>{workspaceStats.readyChartsCount} ready</span>
              </div>
            </div>
            <div className="dashboard-export-surface-body">
              <DashboardGrid
                widgets={dashboardWidgets}
                layout={activeDashboard.layout ?? []}
                isEditable={false}
                isSelectable={false}
                className="is-export-surface"
                showCardHeader={false}
              />
            </div>
          </div>
        </div>
      ) : null}

      <div ref={contextMenuRef}>
        <ContextMenu
          menu={contextMenuState}
          onEdit={handleContextEdit}
          onRename={handleContextRename}
          onDelete={handleContextDelete}
        />
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

      <RenameWidgetModal
        widget={renameWidgetTarget}
        value={renameWidgetValue}
        onChange={setRenameWidgetValue}
        onCancel={closeRenameWidgetModal}
        onSave={commitWidgetRename}
      />

      {shareModalOpen ? (
        <DashboardShareModal
          dashboardName={activeDashboard.name}
          activeTab={shareModalTab}
          onChangeTab={setShareModalTab}
          canExport={hasWidgets}
          exportBusy={dashboardExporting}
          onDownloadPng={() => handleDownloadDashboardImage("png")}
          onDownloadJpg={() => handleDownloadDashboardImage("jpg")}
          publicUrl={publicViewUrl}
          embedUrl={embedViewUrl}
          embedCode={embedCode}
          options={shareOptions}
          onChangeOptions={updateShareOptions}
          onClose={closeShareModal}
        />
      ) : null}
    </PageContainer>
  );
}
