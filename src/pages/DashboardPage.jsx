import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useStore } from "@/store/useStore";
import { PageContainer, WorkspaceLayout } from "@app/layouts/Layout";
import { autoArrangeDashboardLayout, DASHBOARD_GRID_MARGIN, DASHBOARD_ROW_HEIGHT } from "@/utils/layoutUtils";
import ChartPicker from "@/components/dashboard/ChartPicker";
import DashboardGrid from "@/components/dashboard/DashboardGrid";
import DashboardFullscreenModal from "@/components/dashboard/DashboardFullscreenModal";
import DashboardShareModal from "@/components/dashboard/DashboardShareModal";
import CommandPaletteModal from "@/components/bi/CommandPaletteModal";
import DatasetExplorerModal from "@modules/datasets/components/DatasetExplorerModal";
import SidebarRight from "@app/layouts/SidebarRight";
import useDashboard from "@/features/dashboard/hooks/useDashboard";
import {
  createBuilderContextForDashboard,
  getDashboardWorkspaceStats,
  readBuilderReturnState,
  toDashboardChartModel,
} from "@/utils/dashboardWorkspace";
import {
  buildDashboardEmbedCode,
  buildDashboardViewUrl,
  exportNodeAsImage,
  exportNodeAsPdf,
  sanitizeFileName,
} from "@modules/sharing/lib/dashboardShareUtils";
import {
  applyDashboardFiltersToWidget,
  getActiveDashboardFilterChips,
  getInteractionChips,
  getNextDrilldownStep,
  resolveInteractionPoint,
} from "@/utils/dashboardFilters";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import "@/styles/enterpriseBiRedesign.css";

const GLOBAL_FILTER_PRESETS = [
  {
    id: "executive",
    name: "มุมมองผู้บริหาร",
    filters: {
      dateRange: "Last 30 days",
      department: "All departments",
      region: "North",
      year: "2025",
    },
  },
  {
    id: "finance",
    name: "มุมมองการเงิน",
    filters: {
      dateRange: "Current quarter",
      department: "Technology",
      region: "East",
      year: "2025",
    },
  },
  {
    id: "marketing",
    name: "มุมมองการตลาด",
    filters: {
      dateRange: "Last 90 days",
      department: "Office Supplies",
      region: "South",
      year: "2025",
    },
  },
  {
    id: "research",
    name: "มุมมองงานวิจัย",
    filters: {
      dateRange: "Year to date",
      department: "Enterprise",
      region: "West",
      year: "2025",
    },
  },
];

const DATE_RANGE_OPTIONS = [
  "All dates",
  "Last 7 days",
  "Last 14 days",
  "Last 30 days",
  "Current quarter",
  "Year to date",
  "Last year",
];

const DEPARTMENT_OPTIONS = [
  "All departments",
  "Technology",
  "Furniture",
  "Office Supplies",
  "Enterprise",
  "SMB",
  "Online",
  "Retail",
];

const REGION_OPTIONS = [
  "All regions",
  "North",
  "South",
  "East",
  "West",
];

const YEAR_OPTIONS = ["All years", "2024", "2025", "2026", "2027"];

const FILTER_DISPLAY_LABELS = {
  "All dates": "ทุกช่วงวันที่",
  "Last 7 days": "7 วันที่ผ่านมา",
  "Last 14 days": "14 วันที่ผ่านมา",
  "Last 30 days": "30 วันที่ผ่านมา",
  "Current quarter": "ไตรมาสปัจจุบัน",
  "Year to date": "ตั้งแต่ต้นปี",
  "Last year": "ปีที่ผ่านมา",
  "All departments": "ทุกแผนก",
  Technology: "เทคโนโลยี",
  Furniture: "เฟอร์นิเจอร์",
  "Office Supplies": "อุปกรณ์สำนักงาน",
  Enterprise: "องค์กร",
  SMB: "ธุรกิจขนาดกลางและเล็ก",
  Online: "ออนไลน์",
  Retail: "ค้าปลีก",
  "All regions": "ทุกภูมิภาค",
  North: "เหนือ",
  South: "ใต้",
  East: "ตะวันออก",
  West: "ตะวันตก",
  "All years": "ทุกปี",
};

function getFilterDisplayLabel(value) {
  return FILTER_DISPLAY_LABELS[value] ?? value;
}

const COMMAND_WIDGET_LIBRARY_ITEMS = [
  "KPI",
  "Bar",
  "Line",
  "Area",
  "Pie",
  "Table",
  "Pivot",
  "Text",
  "Image",
  "Filter",
  "Divider",
];

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
      <button type="button" onClick={onClose} aria-label="ปิดการแจ้งเตือน">
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
          <button type="button" className="modal-close-btn" onClick={onCancel} aria-label="ปิดหน้าต่างเปลี่ยนชื่อ">x</button>
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
  tone = "sheet",
  onSelect,
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item.id)}
      className={`dashboard-workspace-tab is-${tone}${isActive ? " is-active" : ""}`}
    >
      <span className="dashboard-workspace-tab-accent" aria-hidden="true" />
      <span className="dashboard-workspace-tab-pill">{tone === "sheet" ? "Sheet" : "Dashboard"}</span>
      <span className="dashboard-workspace-tab-label">{item.name}</span>
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
        ทำสำเนา
      </button>
      <button type="button" className="dashboard-context-menu-item is-danger" onClick={onDelete}>
        ลบ
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
        <div className="dashboard-empty-state-title">เริ่มพื้นที่วิเคราะห์</div>
        <div className="dashboard-empty-state-copy">สร้างกราฟ จัดวางภาพข้อมูล และประกอบหน้าแดชบอร์ดที่พร้อมสำหรับผู้บริหาร</div>
        <div className="dashboard-empty-state-notes">
          <span>ตัวชี้วัด</span>
          <span>แนวโน้ม</span>
          <span>เปรียบเทียบ</span>
        </div>
        <div className="dashboard-empty-state-actions">
          <button type="button" onClick={onBuildChart} className="dashboard-toolbar-btn is-primary">
            สร้างกราฟ
          </button>
          <button type="button" onClick={onOpenSavedCharts} className="dashboard-toolbar-btn">
            เลือกกราฟ
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
    auto: { label: "อัตโนมัติ / ตอบสนอง", width: null, height: null, mode: "auto" },
    "16:9": { label: "16:9 สำหรับนำเสนอ", width: 1280, height: 720, mode: "preset" },
    "4:3": { label: "4:3 สำหรับนำเสนอ", width: 1024, height: 768, mode: "preset" },
    square: { label: "สี่เหลี่ยมจัตุรัส", width: 1080, height: 1080, mode: "preset" },
    "a4-portrait": { label: "A4 แนวตั้ง", width: 794, height: 1123, mode: "preset" },
    "a4-landscape": { label: "A4 แนวนอน", width: 1123, height: 794, mode: "preset" },
    custom: { label: "กำหนดเอง", width: 1280, height: 720, mode: "custom" },
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
  const duplicateDashboardAction = useStore((state) => state.duplicateDashboard);
  const setActiveDashboard = useStore((state) => state.setActiveDashboard);
  const updateLayout = useStore((state) => state.updateLayout);
  const removeChart = useStore((state) => state.removeChart);
  const duplicateChart = useStore((state) => state.duplicateChart);
  const renameChartWidget = useStore((state) => state.renameChartWidget);
  const setBuilderNavigationContext = useStore((state) => state.setBuilderNavigationContext);
  const setSelectedWidget = useStore((state) => state.setSelectedWidget);
  const getOrCreateDashboardShareLink = useStore((state) => state.getOrCreateDashboardShareLink);
  const updateDashboardShareSnapshot = useStore((state) => state.updateDashboardShareSnapshot);
  const updateDashboardCanvasSize = useStore((state) => state.updateDashboardCanvasSize);
  const dashboardFilters = useStore((state) => state.dashboardFilters);
  const filterPresets = useStore((state) => state.filterPresets);
  const setDashboardFilters = useStore((state) => state.setDashboardFilters);
  const resetDashboardFilters = useStore((state) => state.resetDashboardFilters);
  const saveDashboardFilterPreset = useStore((state) => state.saveDashboardFilterPreset);
  const dashboardInteractions = useStore((state) => state.dashboardInteractions);
  const savedViews = useStore((state) => state.savedViews);
  const setCrossFilter = useStore((state) => state.setCrossFilter);
  const clearDashboardInteractions = useStore((state) => state.clearDashboardInteractions);
  const pushDrilldownStep = useStore((state) => state.pushDrilldownStep);
  const trimDrilldownPath = useStore((state) => state.trimDrilldownPath);
  const createSavedView = useStore((state) => state.createSavedView);
  const renameSavedView = useStore((state) => state.renameSavedView);
  const deleteSavedView = useStore((state) => state.deleteSavedView);
  const loadSavedView = useStore((state) => state.loadSavedView);

  const [pickingChart, setPickingChart] = useState(false);
  const [contextMenuState, setContextMenuState] = useState(null);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const [pendingCreatedWidgetId, setPendingCreatedWidgetId] = useState(null);
  const [fullscreenWidgetId, setFullscreenWidgetId] = useState(null);
  const [shareModalTab, setShareModalTab] = useState("share");
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [dashboardShareId, setDashboardShareId] = useState("");
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false);
  const [notice, setNotice] = useState(null);
  const [renameWidgetTarget, setRenameWidgetTarget] = useState(null);
  const [renameWidgetValue, setRenameWidgetValue] = useState("");
  const [dashboardExporting, setDashboardExporting] = useState(false);
  const [presentationMode, setPresentationMode] = useState(false);
  const [previewLayout, setPreviewLayout] = useState(null);
  const [shareOptions, setShareOptions] = useState({
    width: 1200,
    height: 720,
    responsive: true,
    theme: "auto",
    showHeader: false,
  });
  const [activeFilterPreset, setActiveFilterPreset] = useState("custom");
  const [favoriteDashboards, setFavoriteDashboards] = useState([]);
  const [recentDashboards, setRecentDashboards] = useState([]);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [datasetExplorerOpen, setDatasetExplorerOpen] = useState(false);
  const [savedViewName, setSavedViewName] = useState("");
  const [renamingViewId, setRenamingViewId] = useState("");
  const [renamingViewName, setRenamingViewName] = useState("");

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
  const filteredDashboardWidgets = useMemo(
    () => dashboardWidgets.map((widget) => applyDashboardFiltersToWidget(widget, dashboardFilters, dashboardInteractions)),
    [dashboardFilters, dashboardInteractions, dashboardWidgets]
  );
  const activeFilterChips = useMemo(
    () => getActiveDashboardFilterChips(dashboardFilters),
    [dashboardFilters]
  );
  const interactionChips = useMemo(
    () => getInteractionChips(dashboardInteractions),
    [dashboardInteractions]
  );
  const globalSavedPresets = useMemo(
    () => [
      ...GLOBAL_FILTER_PRESETS,
      ...filterPresets.filter((preset) => preset.dashboardId === activeDashboard?.id && preset.scope === "dashboard-global"),
    ],
    [activeDashboard?.id, filterPresets]
  );
  const dashboardSavedViews = useMemo(
    () => savedViews.filter((view) => view.dashboardId === activeDashboard?.id),
    [activeDashboard?.id, savedViews]
  );
  const reportContextItems = useMemo(
    () => [
      ...activeFilterChips.map((chip) => `${chip.label}: ${chip.value}`),
      ...interactionChips.map((chip) => `${chip.label}: ${chip.value}`),
    ],
    [activeFilterChips, interactionChips]
  );
  const workspaceStats = useMemo(() => getDashboardWorkspaceStats(filteredDashboardWidgets), [filteredDashboardWidgets]);
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
  const selectedWidget = filteredDashboardWidgets.find((widget) => widget.id === selectedWidgetId) ?? null;
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
  const fullscreenWidget = filteredDashboardWidgets.find((widget) => widget.id === fullscreenWidgetId) ?? null;
  const activeSelectionLabel = selectedWidget?.name ?? "ยังไม่ได้เลือก";
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
    function handleCommandShortcut(event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandPaletteOpen((isOpen) => !isOpen);
      }
    }

    window.addEventListener("keydown", handleCommandShortcut);
    return () => window.removeEventListener("keydown", handleCommandShortcut);
  }, []);

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
    if (!dashboardShareId || !activeDashboard?.id) return;
    updateDashboardShareSnapshot(dashboardShareId, {
      projectName: activeProject?.name ?? "Workspace",
      sheetName: activeSheet?.name ?? "Sheet",
      dashboardName: activeDashboard.name,
      dashboardId: activeDashboard.id,
      layout: activeDashboard.layout ?? [],
      widgets: filteredDashboardWidgets,
      filters: dashboardFilters,
      interactions: dashboardInteractions,
      contextItems: reportContextItems,
      updatedAt: new Date().toISOString(),
    });
  }, [
    activeDashboard?.id,
    activeDashboard?.layout,
    activeDashboard?.name,
    activeProject?.name,
    activeSheet?.name,
    dashboardFilters,
    dashboardInteractions,
    dashboardShareId,
    filteredDashboardWidgets,
    reportContextItems,
    updateDashboardShareSnapshot,
  ]);

  useEffect(() => {
    if (!presentationMode) return undefined;
    function handlePresentationKeyDown(event) {
      if (event.key === "Escape") {
        setPresentationMode(false);
      }
    }
    document.body.classList.add("dashboard-presentation-active");
    window.addEventListener("keydown", handlePresentationKeyDown);
    return () => {
      document.body.classList.remove("dashboard-presentation-active");
      window.removeEventListener("keydown", handlePresentationKeyDown);
    };
  }, [presentationMode]);

  useEffect(() => {
    setPreviewLayout(null);
  }, [activeDashboard?.id]);

  useEffect(() => {
    if (!activeDashboard?.id) return;
    setRecentDashboards((previous) => {
      const next = previous.filter((item) => item !== activeDashboard.id);
      return [activeDashboard.id, ...next].slice(0, 6);
    });
  }, [activeDashboard?.id]);

  const commandPaletteDashboardActions = (activeSheet?.dashboards ?? []).map((dashboard) => ({
    id: `dashboard-${dashboard.id}`,
    label: dashboard.name,
    detail: `Open dashboard in ${activeSheet?.name ?? "current sheet"}`,
      group: "แดชบอร์ด",
    onActivate: () => setActiveDashboard(dashboard.id),
  }));
  const commandPaletteWidgetActions = dashboardWidgets.map((widget) => ({
    id: `widget-${widget.id}`,
    label: widget.name,
    detail: widget.metaLabel ?? widget.typeLabel ?? "Dashboard widget",
    group: "Widgets",
    onActivate: () => selectWidget(widget.id),
  }));
  const commandPaletteLibraryWidgetActions = COMMAND_WIDGET_LIBRARY_ITEMS.map((widgetName) => ({
    id: `library-widget-${widgetName.toLowerCase()}`,
      label: `วิดเจ็ต ${widgetName}`,
    detail: "Available in the widget library",
    group: "Widgets",
    onActivate: () => notify(`${widgetName} widget is available in the Widget Library.`, "info"),
  }));
  const commandPaletteActions = [
    {
      id: "add-chart",
      label: "เพิ่มกราฟ",
      detail: "Open saved chart library",
      group: "Actions",
      shortcut: "A",
      onActivate: () => setPickingChart(true),
    },
    {
      id: "new-chart",
      label: "กราฟใหม่",
      detail: "Open builder for this dashboard",
      group: "Actions",
      shortcut: "N",
      onActivate: openBuilderForCurrentContext,
    },
    {
      id: "refresh-dashboard",
      label: "รีเฟรชแดชบอร์ด",
      detail: "รีเฟรชหน้าดูแดชบอร์ด",
      group: "Actions",
      shortcut: "R",
      onActivate: handleRefreshDashboard,
    },
    {
      id: "share-dashboard",
      label: "แชร์แดชบอร์ด",
      detail: "Open sharing tools",
      group: "Actions",
      shortcut: "S",
      onActivate: () => openShareModal("share"),
    },
    {
      id: "export-dashboard",
      label: "ส่งออกแดชบอร์ด",
      detail: "Open export options",
      group: "Actions",
      shortcut: "E",
      disabled: !hasWidgets,
      onActivate: () => openShareModal("export"),
    },
    {
      id: "open-dataset-explorer",
      label: "เปิดตัวสำรวจชุดข้อมูล",
      detail: "Browse dataset cards, schema, and sample rows",
      group: "Actions",
      shortcut: "D",
    },
    ...commandPaletteDashboardActions,
    ...commandPaletteWidgetActions,
    ...commandPaletteLibraryWidgetActions,
  ];

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
    }
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
      returnTo: "/dashboard-legacy",
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
      returnTo: "/dashboard-legacy",
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
      const backgroundColor = getComputedStyle(document.documentElement).getPropertyValue("--surface")?.trim() || "#ffffff";
      if (format === "pdf") {
        await exportNodeAsPdf(dashboardCaptureRef.current, {
          filename: activeDashboard?.name ?? "dashboard",
          backgroundColor,
        });
      } else {
        await exportNodeAsImage(dashboardCaptureRef.current, {
          filename: activeDashboard?.name ?? "dashboard",
          format,
          backgroundColor,
        });
      }
    } catch (error) {
      notify(error?.message || "Unable to export this dashboard right now.", "warning");
    } finally {
      setDashboardExporting(false);
    }
  }

  function openFullscreenSelection() {
    if (!hasWidgets || !selectedWidgetId) {
      notify("Select a widget to open fullscreen mode.", "warning");
      return;
    }
    setFullscreenWidgetId((current) => (current === selectedWidgetId ? null : selectedWidgetId));
  }

  function applyGlobalFilterPreset(presetId) {
    if (presetId === "custom") {
      setActiveFilterPreset("custom");
      return;
    }

    const selected = globalSavedPresets.find((preset) => preset.id === presetId);
    if (!selected) return;

    setDashboardFilters({ ...selected.filters });
    setActiveFilterPreset(selected.id);
  }

  function handleGlobalFilterChange(key, value) {
    setDashboardFilters({ [key]: value });
    setActiveFilterPreset("custom");
  }

  function clearGlobalFilters() {
    resetDashboardFilters();
    setActiveFilterPreset("custom");
  }

  function handleSaveFilterPreset() {
    const presetName = `Saved ${globalSavedPresets.length + 1}`;
    saveDashboardFilterPreset(activeDashboard?.id, presetName, dashboardFilters);
    notify(`Saved filter preset "${presetName}".`, "info");
  }

  function handleWidgetDataPointClick(chart, point) {
    const interactionPoint = resolveInteractionPoint(chart, point);
    if (!interactionPoint) {
      notify("This data point cannot be used for filtering yet.", "warning");
      return;
    }

    setCrossFilter({
      sourceWidgetId: chart?.id ?? chart?.chartId ?? null,
      ...interactionPoint,
    });

    const drillStep = getNextDrilldownStep(dashboardInteractions?.drilldown?.path ?? [], interactionPoint);
    if (drillStep) {
      pushDrilldownStep({
        sourceWidgetId: chart?.id ?? chart?.chartId ?? null,
        ...drillStep,
      });
    }

    notify(`Filtered dashboard by ${interactionPoint.field}: ${interactionPoint.value}.`, "info");
  }

  function handleClearInteractions() {
    clearDashboardInteractions();
    notify("Cross-filter and drilldown state cleared.", "info");
  }

  function handleCreateSavedView() {
    const name = savedViewName.trim() || `View ${dashboardSavedViews.length + 1}`;
    createSavedView({
      name,
      dashboardId: activeDashboard?.id,
      filters: dashboardFilters,
      interactions: dashboardInteractions,
      layout: activeDashboard?.layout ?? [],
    });
    setSavedViewName("");
    notify(`Saved view "${name}".`, "info");
  }

  function handleRenameSavedView(viewId) {
    const nextName = renamingViewName.trim();
    if (!nextName) return;
    renameSavedView(viewId, nextName);
    setRenamingViewId("");
    setRenamingViewName("");
    notify(`Renamed saved view to "${nextName}".`, "info");
  }

  function handleLoadSavedView(viewId) {
    loadSavedView(viewId);
    notify("Saved view loaded.", "info");
  }

  function handleRefreshDashboard() {
    const activeCount = activeFilterChips.length + interactionChips.length;
      notify(`รีเฟรชแดชบอร์ดด้วยตัวกรองที่ใช้งาน ${activeCount} รายการแล้ว`, "info");
  }

  function handleDuplicateCurrentDashboard() {
    if (!activeDashboard?.id) return;
    duplicateDashboard(activeDashboard?.id);
    notify("เริ่มทำสำเนาแดชบอร์ดแล้ว", "info");
  }

  function handleClearFilters() {
    clearGlobalFilters();
    clearDashboardInteractions();
    notify("Filter panel reset to defaults.", "info");
  }

  function openPresentationMode() {
    if (!hasWidgets) {
      notify("Add widgets before starting presentation mode.", "warning");
      return;
    }
    setPresentationMode(true);
  }

  function handleToggleFavoriteDashboard(dashboardId) {
    setFavoriteDashboards((previous) => {
      const set = new Set(previous);
      if (set.has(dashboardId)) set.delete(dashboardId);
      else set.add(dashboardId);
      return [...set];
    });
  }

  const toolbarItems = [
    {
      key: "saved",
      label: "เพิ่มกราฟ",
      onClick: () => setPickingChart(true),
    },
    {
      key: "new",
      label: "กราฟใหม่",
      onClick: openBuilderForCurrentContext,
      primary: true,
    },
    {
      key: "arrange",
      label: "จัดวางอัตโนมัติ",
      onClick: autoArrangeDashboard,
      disabled: !dashboardWidgets.length,
    },
  ];

  return (
    <PageContainer className="dashboard-workspace-page">
      <DashboardNotice notice={notice} onClose={() => setNotice(null)} />
      <h1 className="sr-only">แดชบอร์ดเดิม: {activeDashboard.name}</h1>

      <WorkspaceLayout
        columns="two"
        className={`dashboard-workspace-shell is-inspector-open${inspectorCollapsed ? " is-inspector-collapsed" : ""}`}
      >
        <div className="dashboard-workspace-main">
          <header className="dashboard-workspace-header dashboard-bi-header">
            <div className="dashboard-workspace-header-copy">
              <div className="dashboard-bi-brandbar">
                <span className="dashboard-bi-brand">Dashboard Mini BI</span>
                <div className="dashboard-bi-brand-meta">ประสบการณ์พื้นที่ทำงาน</div>
              </div>
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
                      {hasWidgets ? "ใช้งาน" : "ร่าง"}
                    </span>
                  </div>
                  <h1 className="dashboard-workspace-title">{activeDashboard.name}</h1>
                  <div className="dashboard-workspace-meta dashboard-bi-meta">
                    <span>{workspaceStats.chartCount} กราฟ</span>
                    <span>{workspaceStats.readyChartsCount} พร้อมใช้</span>
                    <span>{selectedWidget ? "เลือก 1 รายการ" : "ยังไม่ได้เลือก"}</span>
                  </div>
                  <p className="dashboard-workspace-summary">พื้นที่แดชบอร์ดสำหรับผู้บริหาร พร้อมเครื่องมือจัดองค์ประกอบ BI ที่ทันสมัย</p>
                </div>
              </div>
            </div>

            <div className="dashboard-workspace-header-actions dashboard-bi-header-actions">
              <div className="dashboard-workspace-header-panel">
                <div className="dashboard-workspace-header-panel-label">พื้นที่ทำงานปัจจุบัน</div>
                <strong className="dashboard-workspace-header-panel-value">{activeProject.name}</strong>
                <div className="dashboard-workspace-header-panel-copy">ชีต: {activeSheet.name}</div>
                <div className="dashboard-workspace-search-wrap">
                  <input
                    type="text"
                    className="dashboard-bi-search"
                    placeholder="ค้นหาแดชบอร์ด กราฟ แท็ก..."
                    aria-label="ค้นหาในพื้นที่แดชบอร์ด"
                    readOnly
                  />
                </div>
                <div className="dashboard-bi-header-microline">
                  <span className="dashboard-bi-control-chip">ธีม: อัตโนมัติ</span>
                  <span className="dashboard-bi-control-chip">ผู้ใช้: {activeProject.ownerName ?? "เจ้าของพื้นที่ทำงาน"}</span>
                </div>
              </div>
            </div>
          </header>

          <section className="dashboard-workspace-toolbar dashboard-command-strip dashboard-bi-toolbar">
            <div className="dashboard-workspace-toolbar-group dashboard-workspace-toolbar-group-main">
                <div className="dashboard-workspace-action-strip dashboard-command-bar">
                <button
                  type="button"
                  onClick={() => setCommandPaletteOpen(true)}
                  className="dashboard-toolbar-btn"
                  title="เปิดแผงคำสั่ง"
                >
                  Ctrl + K
                </button>
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
              </div>
              <div className="dashboard-workspace-action-strip dashboard-bi-quick-actions" aria-label="คำสั่งด่วนแดชบอร์ด">
                <button
                  type="button"
                  onClick={handleRefreshDashboard}
                  className="dashboard-toolbar-btn"
                  title="รีเฟรชแดชบอร์ด"
                >
                  รีเฟรช
                </button>
                <button
                  type="button"
                  onClick={handleDuplicateCurrentDashboard}
                  className="dashboard-toolbar-btn"
                  title="ทำสำเนาแดชบอร์ด"
                >
                  ทำสำเนาแดชบอร์ด
                </button>
                <button
                  type="button"
                  onClick={() => openShareModal("share")}
                  className="dashboard-toolbar-btn"
                  title="แชร์แดชบอร์ด"
                >
                  แชร์
                </button>
                <button
                  type="button"
                  onClick={() => openShareModal("export")}
                  className="dashboard-toolbar-btn"
                  disabled={!dashboardWidgets.length}
                  title="ส่งออกแดชบอร์ด"
                >
                  ส่งออก
                </button>
                <button
                  type="button"
                  onClick={openPresentationMode}
                  className="dashboard-toolbar-btn"
                  disabled={!dashboardWidgets.length}
                  title="เริ่มโหมดนำเสนอ"
                >
                  นำเสนอ
                </button>
                <button
                  type="button"
                  onClick={openFullscreenSelection}
                  className="dashboard-toolbar-btn"
                  disabled={!selectedWidgetId || !dashboardWidgets.length}
                  title="สลับโหมดเต็มหน้าจอสำหรับวิดเจ็ตที่เลือก"
                >
                  {fullscreenWidgetId ? "มุมมองโฟกัส" : "โฟกัสวิดเจ็ต"}
                </button>
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="dashboard-toolbar-btn"
                  disabled={!activeProject}
                  title="ล้างตัวกรองรวม"
                >
                  ล้างตัวกรอง
                </button>
                <div className="dashboard-actions-menu" ref={actionsMenuRef}>
                  <button
                    type="button"
                    onClick={() => setActionsMenuOpen((isOpen) => !isOpen)}
                    className="dashboard-toolbar-btn"
                    aria-haspopup="menu"
                    aria-expanded={actionsMenuOpen}
                  >
                    การทำงาน
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
                        ส่งออก
                      </button>
                      <button
                        type="button"
                        className="dashboard-context-menu-item"
                        role="menuitem"
                        onClick={() => openShareModal("share")}
                      >
                        แชร์
                      </button>
                      <button
                        type="button"
                        className="dashboard-context-menu-item"
                        role="menuitem"
                        onClick={() => openShareModal("embed")}
                      >
                        ฝัง
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="dashboard-workspace-toolbar-summary">
              <div className="dashboard-workspace-toolbar-meta">
                <span>โปรเจกต์</span>
                <strong>{activeProject.name}</strong>
              </div>
              <div className="dashboard-workspace-toolbar-meta">
                <span>รายการที่เลือก</span>
                <strong>{activeSelectionLabel}</strong>
              </div>
              <div className="dashboard-workspace-toolbar-meta">
                <span>โหมดพื้นที่</span>
                <strong>{isAutoCanvas ? "อัตโนมัติ" : canvasPresetKey.toUpperCase()}</strong>
              </div>
            </div>
          </section>

          <section className="dashboard-global-filters">
            <div className="dashboard-global-filters-head">
              <div className="dashboard-workspace-tabs-label">ตัวกรองรวม</div>
              <div className="dashboard-global-filter-preset-wrap">
                <label className="dashboard-global-filter-label" htmlFor="dashboard-filter-preset-select">
                  เลือกพรีเซ็ต
                </label>
                <select
                  id="dashboard-filter-preset-select"
                  className="dashboard-global-filter-select"
                  value={activeFilterPreset}
                  onChange={(event) => applyGlobalFilterPreset(event.target.value)}
                >
                  <option value="custom">กำหนดเอง</option>
                  {globalSavedPresets.map((preset) => (
                    <option key={preset.id} value={preset.id}>{preset.name}</option>
                  ))}
                </select>
              </div>
              <button type="button" onClick={handleSaveFilterPreset} className="dashboard-toolbar-btn dashboard-toolbar-btn-sm">บันทึกพรีเซ็ต</button>
            </div>
            <div className="dashboard-global-filters-grid">
              <div className="dashboard-global-filter-control">
                <label htmlFor="dashboard-filter-date-range" className="dashboard-global-filter-label">ช่วงวันที่</label>
                <select
                  id="dashboard-filter-date-range"
                  className="dashboard-global-filter-select"
                  value={dashboardFilters.dateRange}
                  onChange={(event) => handleGlobalFilterChange("dateRange", event.target.value)}
                >
                  {DATE_RANGE_OPTIONS.map((item) => <option key={item} value={item}>{getFilterDisplayLabel(item)}</option>)}
                </select>
              </div>
              <div className="dashboard-global-filter-control">
                <label htmlFor="dashboard-filter-department" className="dashboard-global-filter-label">แผนก</label>
                <select
                  id="dashboard-filter-department"
                  className="dashboard-global-filter-select"
                  value={dashboardFilters.department}
                  onChange={(event) => handleGlobalFilterChange("department", event.target.value)}
                >
                  {DEPARTMENT_OPTIONS.map((item) => <option key={item} value={item}>{getFilterDisplayLabel(item)}</option>)}
                </select>
              </div>
              <div className="dashboard-global-filter-control">
                <label htmlFor="dashboard-filter-region" className="dashboard-global-filter-label">ภูมิภาค</label>
                <select
                  id="dashboard-filter-region"
                  className="dashboard-global-filter-select"
                  value={dashboardFilters.region}
                  onChange={(event) => handleGlobalFilterChange("region", event.target.value)}
                >
                  {REGION_OPTIONS.map((item) => <option key={item} value={item}>{getFilterDisplayLabel(item)}</option>)}
                </select>
              </div>
              <div className="dashboard-global-filter-control">
                <label htmlFor="dashboard-filter-year" className="dashboard-global-filter-label">ปี</label>
                <select
                  id="dashboard-filter-year"
                  className="dashboard-global-filter-select"
                  value={dashboardFilters.year}
                  onChange={(event) => handleGlobalFilterChange("year", event.target.value)}
                >
                  {YEAR_OPTIONS.map((item) => <option key={item} value={item}>{getFilterDisplayLabel(item)}</option>)}
                </select>
              </div>
            </div>
            <div className="dashboard-global-filter-chips" role="list" aria-label="ตัวกรองที่ใช้งาน">
              {activeFilterChips.length ? activeFilterChips.map((chip) => (
                <span className="dashboard-filter-chip" key={chip.key}>{chip.label}: {getFilterDisplayLabel(chip.value)}</span>
              )) : (
                <span className="dashboard-filter-chip">ไม่มีตัวกรองที่ใช้งาน</span>
              )}
            </div>
            <div className="dashboard-global-filter-actions">
              <button type="button" onClick={clearGlobalFilters} className="dashboard-toolbar-btn">ล้างตัวกรองรวม</button>
              <button type="button" onClick={handleClearInteractions} className="dashboard-toolbar-btn" disabled={!interactionChips.length}>
                ล้างการโต้ตอบ
              </button>
            </div>
          </section>

          <section className="dashboard-interactions-panel">
            <div className="dashboard-interactions-head">
              <div>
                <span className="dashboard-workspace-tabs-label">การวิเคราะห์แบบโต้ตอบ</span>
                <h2>กรองข้ามวิดเจ็ต เจาะดูข้อมูล และมุมมองที่บันทึกไว้</h2>
              </div>
              <button type="button" className="dashboard-toolbar-btn" onClick={handleClearInteractions} disabled={!interactionChips.length}>
                ล้างสถานะ
              </button>
            </div>
            <div className="dashboard-interaction-chip-row">
              {interactionChips.length ? interactionChips.map((chip) => (
                <span className="dashboard-filter-chip" key={chip.key}>{chip.label}: {getFilterDisplayLabel(chip.value)}</span>
              )) : (
                <span className="dashboard-filter-chip">คลิกจุดบนกราฟเพื่อกรองข้ามวิดเจ็ตและเจาะดูข้อมูล</span>
              )}
            </div>
            <div className="dashboard-drilldown-breadcrumbs" aria-label="เส้นทางการเจาะดูข้อมูล">
              <button type="button" onClick={() => trimDrilldownPath(-1)} className="dashboard-toolbar-btn dashboard-toolbar-btn-sm">
                จุดเริ่มต้น
              </button>
              {(dashboardInteractions?.drilldown?.path ?? []).map((step, index) => (
                <button
                  key={`${step.field}-${step.value}-${index}`}
                  type="button"
                  className="dashboard-toolbar-btn dashboard-toolbar-btn-sm"
                  onClick={() => trimDrilldownPath(index)}
                >
                  {step.field}: {getFilterDisplayLabel(step.value)}
                </button>
              ))}
            </div>
            <div className="dashboard-saved-views">
              <div className="dashboard-saved-view-create">
                <input
                  value={savedViewName}
                  onChange={(event) => setSavedViewName(event.target.value)}
                  placeholder="ชื่อมุมมองที่บันทึก"
                  aria-label="ชื่อมุมมองที่บันทึก"
                />
                <button type="button" className="dashboard-toolbar-btn is-primary" onClick={handleCreateSavedView}>
                  สร้างมุมมอง
                </button>
              </div>
              <div className="dashboard-saved-view-list">
                {dashboardSavedViews.length ? dashboardSavedViews.map((view) => (
                  <div className="dashboard-saved-view-item" key={view.id}>
                    {renamingViewId === view.id ? (
                      <input
                        value={renamingViewName}
                        onChange={(event) => setRenamingViewName(event.target.value)}
                        aria-label="เปลี่ยนชื่อมุมมองที่บันทึก"
                      />
                    ) : (
                      <strong>{view.name}</strong>
                    )}
                    <span>{new Date(view.updatedAt).toLocaleDateString()}</span>
                    <div>
                      <button type="button" className="dashboard-toolbar-btn dashboard-toolbar-btn-sm" onClick={() => handleLoadSavedView(view.id)}>
                        โหลด
                      </button>
                      {renamingViewId === view.id ? (
                        <button type="button" className="dashboard-toolbar-btn dashboard-toolbar-btn-sm" onClick={() => handleRenameSavedView(view.id)}>
                          บันทึก
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="dashboard-toolbar-btn dashboard-toolbar-btn-sm"
                          onClick={() => {
                            setRenamingViewId(view.id);
                            setRenamingViewName(view.name);
                          }}
                        >
                          เปลี่ยนชื่อ
                        </button>
                      )}
                      <button type="button" className="dashboard-toolbar-btn dashboard-toolbar-btn-sm" onClick={() => deleteSavedView(view.id)}>
                        ลบ
                      </button>
                    </div>
                  </div>
                )) : (
                  <div className="dashboard-saved-view-empty">ยังไม่มีมุมมองที่บันทึกสำหรับแดชบอร์ดนี้</div>
                )}
              </div>
            </div>
          </section>

          <section className="dashboard-workspace-tabs-section">
            <div className="dashboard-workspace-tabs-head">
              <span className="dashboard-workspace-tabs-label">แดชบอร์ด</span>
            </div>
            <div className="dashboard-workspace-tabs-row is-dashboard-row">
              {(activeSheet.dashboards ?? []).map((dashboard) => (
                <WorkspaceTab
                  key={dashboard.id}
                  item={dashboard}
                  isActive={dashboard.id === activeDashboard.id}
                  tone="dashboard"
                  onSelect={setActiveDashboard}
                />
              ))}
            </div>
          </section>

          <section className="dashboard-workspace-canvas dashboard-bi-canvas">
            <div className="dashboard-workspace-canvas-head">
              <div className="dashboard-workspace-canvas-heading">
                <span className="dashboard-workspace-canvas-kicker">พื้นที่วิเคราะห์</span>
                <h2 className="dashboard-workspace-canvas-title">เลย์เอาต์แดชบอร์ด</h2>
                <p className="dashboard-workspace-canvas-description">จัดวางภาพข้อมูลให้เล่าเรื่องชัดเจนและรักษาระยะห่างระหว่างวิดเจ็ตให้สม่ำเสมอ</p>
              </div>
              <div className="dashboard-workspace-canvas-meta">
                <span>{hasWidgets ? `${workspaceStats.chartCount} วิดเจ็ต` : "ยังไม่มีวิดเจ็ต"}</span>
              </div>
              <div className="dashboard-canvas-size-controls">
                <label className="dashboard-canvas-size-label" htmlFor="dashboard-canvas-size-select">ขนาดพื้นที่</label>
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
                      aria-label="ความกว้างพื้นที่"
                    />
                    <span>x</span>
                    <input
                      type="number"
                      min="240"
                      step="1"
                      value={canvasSize?.height ?? CANVAS_SIZE_PRESETS.custom.height}
                      onChange={(event) => handleCanvasCustomSizeChange("height", event.target.value)}
                      aria-label="ความสูงพื้นที่"
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
                  widgets={filteredDashboardWidgets}
                  layout={activeDashboard.layout ?? []}
                  selectedWidgetId={selectedWidgetId}
                  onSelectWidget={selectWidget}
                  onOpenWidgetMenu={(widget, event) => openContextMenu("widget", widget, event)}
                  onLayoutChange={handleLayoutChange}
                  onLayoutPreviewChange={handleLayoutPreviewChange}
                  onExportCSV={handleExportCsv}
                  onExportPNG={handleExportPng}
                  onEditChart={openBuilderForSavedChart}
                  onWidgetDataPointClick={handleWidgetDataPointClick}
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
          isCollapsed={inspectorCollapsed}
          onToggleCollapsed={() => setInspectorCollapsed((current) => !current)}
          widgets={filteredDashboardWidgets}
          selectedWidgetId={selectedWidget?.id ?? null}
          projectName={activeProject.name}
          dashboardName={activeDashboard.name}
          onSelectWidget={selectWidget}
          onRemoveWidget={removeWidget}
          favoriteDashboardIds={favoriteDashboards}
          recentDashboardIds={recentDashboards}
          onToggleFavoriteDashboard={handleToggleFavoriteDashboard}
        />
      </WorkspaceLayout>

      {(shareModalOpen || dashboardExporting) && hasWidgets ? (
        <div className="dashboard-export-stage" aria-hidden="true">
          <div ref={dashboardCaptureRef} className="dashboard-export-surface">
            <div className="dashboard-export-surface-head">
              <div className="dashboard-export-surface-copy">
                <span className="dashboard-export-surface-kicker">{activeProject.name} / {activeSheet.name}</span>
                <strong>{activeDashboard.name}</strong>
                <small>{new Date().toLocaleString()}</small>
              </div>
              <div className="dashboard-export-surface-badges">
                <span>{workspaceStats.chartCount} กราฟ</span>
                <span>{workspaceStats.readyChartsCount} พร้อมใช้</span>
              </div>
            </div>
            <div className="dashboard-export-context">
              <strong>สถานะปัจจุบัน</strong>
              <div>
                {reportContextItems.length ? reportContextItems.map((item) => (
                  <span key={item}>{item}</span>
                )) : (
                  <span>ไม่มีตัวกรองหรือการโต้ตอบที่ใช้งาน</span>
                )}
              </div>
            </div>
            <div className="dashboard-export-surface-body">
              <DashboardGrid
                widgets={filteredDashboardWidgets}
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
          onDataPointClick={handleWidgetDataPointClick}
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
          onDownloadPdf={() => handleDownloadDashboardImage("pdf")}
          publicUrl={publicViewUrl}
          embedUrl={embedViewUrl}
          embedCode={embedCode}
          options={shareOptions}
          onChangeOptions={updateShareOptions}
          onClose={closeShareModal}
        />
      ) : null}

      <CommandPaletteModal
        isOpen={commandPaletteOpen}
        actions={commandPaletteActions}
        onClose={() => setCommandPaletteOpen(false)}
        onOpenDatasetExplorer={() => {
          setCommandPaletteOpen(false);
          setDatasetExplorerOpen(true);
        }}
      />

      <DatasetExplorerModal
        isOpen={datasetExplorerOpen}
        onClose={() => setDatasetExplorerOpen(false)}
      />

      {presentationMode ? (
        <div className="dashboard-presentation-overlay" role="dialog" aria-modal="true" aria-label="โหมดนำเสนอแดชบอร์ด">
          <div className="dashboard-presentation-topbar" data-export-ignore="true">
            <div>
              <span>{activeProject.name} / {activeSheet.name}</span>
              <strong>{activeDashboard.name}</strong>
            </div>
            <div className="dashboard-presentation-context">
              {reportContextItems.length ? reportContextItems.slice(0, 4).map((item) => <span key={item}>{item}</span>) : <span>มุมมองแดชบอร์ดสด</span>}
            </div>
            <button type="button" className="dashboard-toolbar-btn" onClick={() => setPresentationMode(false)}>
              ออก
            </button>
          </div>
          <div className="dashboard-presentation-canvas">
            <DashboardGrid
              widgets={filteredDashboardWidgets}
              layout={activeDashboard.layout ?? []}
              isEditable={false}
              isSelectable={false}
              showCardHeader={false}
              className="is-presentation-mode"
            />
          </div>
        </div>
      ) : null}
    </PageContainer>
  );
}
