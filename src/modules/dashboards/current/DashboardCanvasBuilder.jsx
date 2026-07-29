import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactGridLayout, { WidthProvider } from "react-grid-layout";
import { useLocation, useNavigate } from "react-router-dom";
import ChartPreview from "@modules/dashboards/designer-v2/components/components/charts/ChartPreview";
import { chartWidgetDensity } from "./chartWidgetDensity";
import { normalizeDashboardChartFields, toDashboardMappingSlots } from "./chartMappingAdapter";
import { createDefaultConfig, dataFields, defaultChartSettings } from "@modules/dashboards/designer-v2/components/mockData";
import { getDatasetRows } from "@modules/dashboards/designer-v2/components/services/datasetService";
import { resolveChartData } from "@domain/charts/chartDataContract";
import {
  createBeforeUnloadHandler,
  createDashboardAutosave,
  createSessionImageAsset,
  prepareDashboardForPersistence,
  runExplicitDashboardSave,
  shouldWarnAboutUnsavedChanges,
} from "@domain/dashboard/dashboardPersistence";
import { createPersistentDashboardShare } from "@modules/sharing";
import { useWorkspaceSelector } from "@app/store/useWorkspaceSelector";
import { useStore } from "@app/store/useStore";
import useNavigationControls from "@shared/hooks/useNavigationControls";
import {
  createSavedChartFromConfig,
  deleteSavedChart,
  getSavedCharts,
  SAVED_CHARTS_KEY,
  SINGLE_CHART_KEY as V2_SINGLE_CHART_KEY,
} from "@modules/charts/public/savedCharts";
import {
  ACTIVE_DASHBOARD_KEY,
  compactDashboardLayoutForStorage,
  ACTIVE_PROJECT_KEY,
  consumeStorageRecoveryMessage,
  createDashboard as createStoredDashboard,
  deleteDashboard as deleteStoredDashboard,
  getActiveDashboard,
  getActiveProject,
  getDashboards,
  PROJECTS_KEY,
  renameDashboard as renameStoredDashboard,
  safeSetLocalStorage,
  setActiveDashboard as setStoredActiveDashboard,
  setActiveProject as setStoredActiveProject,
  upsertDashboard,
} from "@infrastructure/persistence/project-storage/projectStorage";
import { CANONICAL_WORKSPACE_KEY } from "@domain/workspace/workspaceSchema";
import { isMockMode } from "@infrastructure/http/client";
import {
  API_ACTIVE_PROJECT_KEY,
  getProjects as getApiProjects,
  resolveApiActiveProject,
} from "@modules/projects";
import { getCharts } from "@modules/charts/public/api";
import {
  archiveDashboard as archiveDashboardApi,
  createDashboard as createDashboardApi,
  listDashboards as listDashboardsApi,
  loadDashboardContext,
  saveDashboardWidgets,
  updateDashboard as updateDashboardApi,
} from "@modules/dashboards/public/api";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import "@modules/dashboards/current/DashboardCanvasBuilder.css";

const GridLayout = WidthProvider(ReactGridLayout);

const LAYOUT_STORAGE_KEY = "dashboard-canvas-layout-v1";
const PANEL_STATE_STORAGE_KEY = "dashboard-canvas-panel-state";
const LAYOUT_SCHEMA_VERSION = 1;
const GRID_UNIT = 8;
const GRID_COLS = 180;
const DASHBOARD_WIDTH = 1440;
const DASHBOARD_HEIGHT = 900;
const AUTO_LAYOUT_GAP = 4;
const AUTO_LAYOUT_SECTION_GAP = 6;
const AUTO_LAYOUT_MAX_HEIGHT = 1600;
const WIDGET_CONTEXT_MENU_WIDTH = 210;
const WIDGET_CONTEXT_MENU_HEIGHT = 280;

const CHART_LIST_FILTERS = [
  { id: "all", label: "ทั้งหมด" },
  { id: "dashboard", label: "บน Canvas" },
  { id: "available", label: "ยังไม่เพิ่ม" },
];

const WIDGET_LABELS = {
  chart: "กราฟ",
  kpi: "KPI",
  table: "ตาราง",
  text: "ข้อความ",
  image: "รูปภาพ",
  filter: "ตัวกรอง",
  shape: "รูปทรง",
  divider: "เส้นแบ่ง",
  button: "ปุ่ม",
};

const ELEMENTS = [
  { type: "kpi", title: "KPI Card", description: "ตัวเลขสำคัญพร้อมแนวโน้ม" },
  { type: "table", title: "Table", description: "ตารางข้อมูลแบบย่อ" },
  { type: "text", title: "Text", description: "หัวข้อหรือคำอธิบาย" },
  { type: "image", title: "Image", description: "พื้นที่รูปภาพหรือโลโก้" },
  { type: "shape", title: "Shape", description: "พื้นหลังหรือกรอบข้อมูล" },
  { type: "divider", title: "Divider", description: "แบ่งส่วนเนื้อหา" },
  { type: "filter", title: "Filter", description: "ตัวกรองสำหรับเดโม" },
  { type: "button", title: "Button", description: "ปุ่มเรียก action" },
];

const ELEMENT_ICONS = {
  kpi: "K",
  table: "▦",
  text: "T",
  image: "▧",
  filter: "F",
  shape: "□",
  divider: "─",
  button: "B",
};

const TEMPLATES = [
  { id: "sales", title: "Sales Overview", description: "KPI ยอดขาย กราฟแนวโน้ม และตารางสินค้า" },
  { id: "executive", title: "Executive Summary", description: "ภาพรวมผู้บริหารพร้อมตัวชี้วัดหลัก" },
  { id: "marketing", title: "Marketing Funnel", description: "Funnel, KPI และ performance by channel" },
  { id: "operations", title: "Operations Monitor", description: "สถานะงานและตารางตรวจสอบ" },
  { id: "finance", title: "Financial Summary", description: "รายได้ ต้นทุน กำไร และสัดส่วนหมวดหมู่" },
];

const DASHBOARD_TEMPLATE_OPTIONS = [
  ...TEMPLATES.map((template) => ({ ...template, widgetCount: 7 })),
  {
    id: "blank",
    title: "Blank Canvas",
    description: "เริ่มจากพื้นที่ว่างแล้วจัดวางเองทั้งหมด",
    widgetCount: 0,
    blank: true,
  },
];

const ZOOM_OPTIONS = [25, 50, 75, 100, 125];
const WIDGET_TYPES = new Set(Object.keys(WIDGET_LABELS));

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function clampContextMenuPosition(clientX, clientY, width = WIDGET_CONTEXT_MENU_WIDTH, height = WIDGET_CONTEXT_MENU_HEIGHT) {
  if (typeof window === "undefined") return { x: clientX, y: clientY };
  const margin = 8;
  return {
    x: clamp(clientX, margin, Math.max(margin, window.innerWidth - width - margin)),
    y: clamp(clientY, margin, Math.max(margin, window.innerHeight - height - margin)),
  };
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function safeParse(value, fallback = null) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function safeGetLocalStorageValue(key) {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function loadPanelState() {
  if (typeof window === "undefined") return { leftOpen: true, rightOpen: true };
  const saved = safeParse(safeGetLocalStorageValue(PANEL_STATE_STORAGE_KEY), null);
  return {
    leftOpen: typeof saved?.leftOpen === "boolean" ? saved.leftOpen : true,
    rightOpen: typeof saved?.rightOpen === "boolean" ? saved.rightOpen : true,
  };
}

function clone(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function formatSavedTime(value = new Date()) {
  return new Intl.DateTimeFormat("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function formatChartListTime(value) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? "ล่าสุด" : formatSavedTime(date);
}

function timestampForFilename() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function mergeChartSettings(settings) {
  if (!settings || typeof settings !== "object") return clone(defaultChartSettings);
  return {
    ...defaultChartSettings,
    ...settings,
    general: { ...defaultChartSettings.general, ...(settings.general ?? {}) },
    axis: { ...defaultChartSettings.axis, ...(settings.axis ?? {}) },
    labels: { ...defaultChartSettings.labels, ...(settings.labels ?? {}) },
    legend: { ...defaultChartSettings.legend, ...(settings.legend ?? {}) },
    colors: { ...defaultChartSettings.colors, ...(settings.colors ?? {}) },
    grid: { ...defaultChartSettings.grid, ...(settings.grid ?? {}) },
    tooltip: { ...defaultChartSettings.tooltip, ...(settings.tooltip ?? {}) },
    animation: { ...defaultChartSettings.animation, ...(settings.animation ?? {}) },
  };
}

function normalizeChartConfig(rawConfig) {
  const fallback = createDefaultConfig();
  if (!rawConfig || typeof rawConfig !== "object") return fallback;
  const mappings = Array.isArray(rawConfig.mappings)
    ? rawConfig.mappings
    : Array.isArray(rawConfig.fieldMappings)
      ? rawConfig.fieldMappings
      : fallback.mappings;

  return {
    ...fallback,
    ...rawConfig,
    chartType: rawConfig.chartType ?? fallback.chartType,
    mappings,
    settings: mergeChartSettings(rawConfig.settings),
    filters: rawConfig.filters ?? {},
    sort: rawConfig.sort ?? fallback.sort,
    textElements: Array.isArray(rawConfig.textElements) ? rawConfig.textElements : [],
    imageName: rawConfig.imageName ?? null,
    sourceType: rawConfig.sourceType ?? "demo",
    datasetId: rawConfig.datasetId ?? "sales_performance",
    schemaVersion: rawConfig.schemaVersion ?? fallback.schemaVersion,
    version: rawConfig.version ?? fallback.version,
    updatedAt: rawConfig.updatedAt ?? new Date().toISOString(),
  };
}

function chartTitle(config) {
  return config?.settings?.general?.title || "กราฟที่บันทึก";
}

function chartTypeLabel(chartType) {
  const value = String(chartType || "bar").replaceAll("-", " ");
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function chartIcon(chartType) {
  const type = String(chartType || "").toLowerCase();
  if (type.includes("line") || type.includes("area")) return "⌁";
  if (type.includes("pie") || type.includes("donut")) return "◔";
  if (type.includes("kpi") || type.includes("gauge")) return "●";
  if (type.includes("table") || type.includes("pivot")) return "▦";
  if (type.includes("scatter") || type.includes("bubble")) return "∴";
  return "▥";
}

function savedChartIdFromWidget(widget) {
  if (!widget || widget.type !== "chart") return "";
  return widget.sourceChartId || widget.sourceChartConfigId || widget.config?.sourceChartId || "";
}

function resolveWidgetChartConfig(widget, savedCharts = []) {
  if (!widget || widget.type !== "chart") return null;
  const sourceChartId = savedChartIdFromWidget(widget);
  const savedChart = sourceChartId ? savedCharts.find((chart) => chart.id === sourceChartId) : null;
  const copiedConfig = widget.chartConfigSnapshot && typeof widget.chartConfigSnapshot === "object"
    ? normalizeChartConfig(widget.chartConfigSnapshot)
    : widget.config?.chartConfig && typeof widget.config.chartConfig === "object"
      ? normalizeChartConfig(widget.config.chartConfig)
      : widget.config?.chartType
        ? normalizeChartConfig({
          chartType: widget.config.chartType,
          fieldMappings: widget.config.fieldMappings,
          mappings: widget.config.fieldMappings,
          settings: widget.config.settings,
          filters: widget.config.filters,
          sourceType: widget.config.dataset?.sourceType,
          datasetId: widget.config.dataset?.datasetId,
          updatedAt: widget.updatedAt,
        })
        : null;

  if (!savedChart?.config) return copiedConfig;

  const savedConfig = normalizeChartConfig(savedChart.config);
  const copiedUpdatedAt = Date.parse(copiedConfig?.updatedAt ?? "");
  const savedUpdatedAt = Date.parse(savedChart.updatedAt ?? savedConfig.updatedAt ?? "");
  if (!copiedConfig || (Number.isFinite(savedUpdatedAt) && savedUpdatedAt > (Number.isFinite(copiedUpdatedAt) ? copiedUpdatedAt : 0))) {
    return savedConfig;
  }
  return copiedConfig;
}

function chartWidgetDisplayTitle(widget, savedCharts = []) {
  if (!widget || widget.type !== "chart") return widget?.title || "Widget";
  const sourceChartId = savedChartIdFromWidget(widget);
  const savedChart = sourceChartId ? savedCharts.find((chart) => chart.id === sourceChartId) : null;
  return savedChart?.title || chartTitle(resolveWidgetChartConfig(widget, savedCharts)) || widget.title || "กราฟ";
}

function downloadDataUrl(filename, dataUrl) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function requestDashboardResize() {
  if (typeof window === "undefined") return;
  window.requestAnimationFrame(() => {
    window.dispatchEvent(new Event("resize"));
  });
  window.setTimeout(() => {
    window.dispatchEvent(new Event("resize"));
  }, 220);
}

function drawWrappedText(context, text, x, y, maxWidth, lineHeight, maxLines = 3) {
  const words = String(text || "").split(/\s+/);
  let line = "";
  let lineCount = 0;

  words.forEach((word) => {
    if (lineCount >= maxLines) return;
    const testLine = line ? `${line} ${word}` : word;
    if (context.measureText(testLine).width > maxWidth && line) {
      context.fillText(line, x, y + lineCount * lineHeight);
      line = word;
      lineCount += 1;
      return;
    }
    line = testLine;
  });

  if (line && lineCount < maxLines) {
    context.fillText(line, x, y + lineCount * lineHeight);
  }
}

function drawWidgetFallbackPng(widget) {
  if (typeof document === "undefined" || !widget) return "";
  const width = Math.max(320, Math.round((widget.w || 40) * GRID_UNIT));
  const height = Math.max(180, Math.round((widget.h || 24) * GRID_UNIT));
  const pixelRatio = Math.min(2, window.devicePixelRatio || 1);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  const context = canvas.getContext("2d");
  if (!context) return "";

  context.scale(pixelRatio, pixelRatio);
  context.fillStyle = widget.background || "#FFFFFF";
  context.fillRect(0, 0, width, height);
  context.strokeStyle = widget.borderColor || "#E6EAF0";
  context.strokeRect(0.5, 0.5, width - 1, height - 1);
  context.fillStyle = "#172033";
  context.font = '500 13px "IBM Plex Sans Thai", system-ui, sans-serif';
  context.fillText(widget.title || WIDGET_LABELS[widget.type] || "Widget", 16, 28);
  context.strokeStyle = "#E6EAF0";
  context.beginPath();
  context.moveTo(16, 42);
  context.lineTo(width - 16, 42);
  context.stroke();

  if (widget.type === "kpi") {
    context.fillStyle = "#64748B";
    context.font = '400 12px "IBM Plex Sans Thai", system-ui, sans-serif';
    context.fillText(widget.config?.metricTitle || "KPI", 16, 72);
    context.fillStyle = "#172033";
    context.font = '500 32px "IBM Plex Sans Thai", system-ui, sans-serif';
    context.fillText(widget.config?.value || "-", 16, 112);
    context.fillStyle = widget.config?.trend === "down" ? "#DC2626" : "#16A34A";
    context.font = '400 12px "IBM Plex Sans Thai", system-ui, sans-serif';
    context.fillText(widget.config?.comparison || "", 16, 140);
  } else if (widget.type === "table") {
    const columns = widget.config?.columns ?? ["month", "category", "sales", "profit"];
    context.fillStyle = "#64748B";
    context.font = '400 11px "IBM Plex Sans Thai", system-ui, sans-serif';
    columns.slice(0, 4).forEach((column, index) => {
      context.fillText(column, 16 + index * Math.max(70, (width - 32) / 4), 72);
    });
    context.strokeStyle = "#E6EAF0";
    for (let index = 0; index < 5; index += 1) {
      const y = 88 + index * 22;
      context.beginPath();
      context.moveTo(16, y);
      context.lineTo(width - 16, y);
      context.stroke();
    }
  } else if (widget.type === "text") {
    context.fillStyle = widget.config?.color || "#172033";
    context.font = `400 ${Math.min(22, Number(widget.config?.fontSize) || 16)}px "IBM Plex Sans Thai", system-ui, sans-serif`;
    drawWrappedText(context, widget.config?.text || widget.title, 16, 76, width - 32, 24, 4);
  } else {
    context.fillStyle = "#64748B";
    context.font = '400 12px "IBM Plex Sans Thai", system-ui, sans-serif';
    drawWrappedText(context, `${WIDGET_LABELS[widget.type] || "Widget"} export preview`, 16, 78, width - 32, 20, 4);
  }

  return canvas.toDataURL("image/png");
}

function readSavedCharts() {
  return getSavedCharts().map((item) => ({
    ...item,
    config: normalizeChartConfig(item.config),
    chartType: item.chartType || item.config?.chartType || "bar",
    title: item.title || chartTitle(item.config),
    updatedAt: item.updatedAt || item.config?.updatedAt || new Date().toISOString(),
  }));
}

function buildSampleChartConfig({ chartType = "bar", title = "ยอดขายรายเดือน", subtitle = "ข้อมูลตัวอย่างจาก sales_performance" } = {}) {
  const config = createDefaultConfig();
  return {
    ...config,
    chartType,
    chartId: makeId("sample-chart"),
    settings: {
      ...config.settings,
      general: {
        ...config.settings.general,
        title,
        subtitle,
      },
    },
    updatedAt: new Date().toISOString(),
  };
}

function defaultWidgetSize(type) {
  switch (type) {
    case "chart":
      return { w: 64, h: 36 };
    case "kpi":
      return { w: 34, h: 18 };
    case "table":
      return { w: 60, h: 32 };
    case "text":
      return { w: 58, h: 12 };
    case "image":
      return { w: 40, h: 26 };
    case "filter":
      return { w: 34, h: 16 };
    case "divider":
      return { w: 70, h: 4 };
    case "button":
      return { w: 26, h: 10 };
    case "shape":
    default:
      return { w: 40, h: 20 };
  }
}

function minWidgetSize(type) {
  switch (type) {
    case "chart":
      // Keep a useful visual footprint at the default 75% Canvas zoom while
      // allowing a genuinely compact card (84 x 60 visible pixels).
      return { w: 14, h: 10 };
    case "kpi":
      return { w: 23, h: 12 };
    case "table":
      return { w: 53, h: 30 };
    case "text":
      return { w: 30, h: 10 };
    case "image":
      return { w: 30, h: 18 };
    case "filter":
      return { w: 24, h: 12 };
    case "divider":
      return { w: 12, h: 2 };
    case "button":
      return { w: 20, h: 8 };
    case "shape":
    default:
      return { w: 24, h: 16 };
  }
}

function isHeaderTextWidget(widget) {
  if (widget?.type !== "text") return false;
  const text = `${widget.title ?? ""} ${widget.config?.text ?? ""}`.toLowerCase();
  const fontSize = finiteNumber(widget.config?.fontSize, 0);
  return widget.w >= 100 || widget.h >= 14 || fontSize >= 20 || /dashboard|overview|summary|สรุป|ภาพรวม|หัวข้อ/.test(text);
}

function autoLayoutRank(widget) {
  if (isHeaderTextWidget(widget)) return 0;
  switch (widget?.type) {
    case "filter":
      return 1;
    case "kpi":
      return 2;
    case "chart":
      return 3;
    case "table":
      return 4;
    case "text":
      return 5;
    default:
      return 6;
  }
}

function sortWidgetsForDashboardLayout(widgets) {
  return widgets
    .map((widget, index) => ({ widget, index, rank: autoLayoutRank(widget) }))
    .sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      const ay = finiteNumber(a.widget.y, 0);
      const by = finiteNumber(b.widget.y, 0);
      if (ay !== by) return ay - by;
      const ax = finiteNumber(a.widget.x, 0);
      const bx = finiteNumber(b.widget.x, 0);
      if (ax !== bx) return ax - bx;
      return a.index - b.index;
    });
}

function getRecommendedWidgetSize(widget, counts = {}) {
  const maxCols = GRID_COLS;
  const minimum = minWidgetSize(widget?.type);
  let recommended;

  if (isHeaderTextWidget(widget)) {
    recommended = { w: maxCols, h: 14 };
  } else {
    switch (widget?.type) {
      case "filter":
        recommended = { w: 42, h: 16 };
        break;
      case "kpi":
        recommended = { w: 42, h: 18 };
        break;
      case "chart":
        recommended = counts.chart === 1 ? { w: maxCols, h: 48 } : { w: 88, h: 40 };
        break;
      case "table":
        recommended = { w: maxCols, h: 36 };
        break;
      case "text":
        recommended = { w: 88, h: 14 };
        break;
      case "divider":
        recommended = { w: maxCols, h: 4 };
        break;
      case "button":
        recommended = { w: 30, h: 10 };
        break;
      case "image":
        recommended = { w: 42, h: 28 };
        break;
      case "shape":
      default:
        recommended = { w: 42, h: 22 };
        break;
    }
  }

  return {
    w: clamp(Math.round(finiteNumber(recommended.w, minimum.w)), minimum.w, maxCols),
    h: Math.max(minimum.h, Math.round(finiteNumber(recommended.h, minimum.h))),
  };
}

function doRectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function findNextGridPosition(placed, size, cursor) {
  let x = cursor.x;
  let y = cursor.y;
  const w = clamp(size.w, 1, GRID_COLS);
  const h = Math.max(1, size.h);

  if (x > 0 && x + w > GRID_COLS) {
    x = 0;
    y = cursor.nextRowY;
  }

  let guard = 0;
  while (
    guard < 1000 &&
    placed.some((rect) => doRectsOverlap({ x, y, w, h }, rect))
  ) {
    x += w + AUTO_LAYOUT_GAP;
    if (x + w > GRID_COLS) {
      x = 0;
      y += h + AUTO_LAYOUT_GAP;
    }
    guard += 1;
  }

  return { x, y, w, h };
}

function normalizeWidgetLayout(widget, layout, zIndex) {
  return {
    ...widget,
    x: clamp(Math.round(finiteNumber(layout.x, 0)), 0, Math.max(0, GRID_COLS - layout.w)),
    y: Math.max(0, Math.round(finiteNumber(layout.y, 0))),
    w: layout.w,
    h: layout.h,
    zIndex,
    updatedAt: new Date().toISOString(),
  };
}

function autoArrangeWidgets(widgets, options = {}) {
  const safeWidgets = Array.isArray(widgets) ? widgets : [];
  const canvasSettings = normalizeCanvasSettings(options.canvasSettings);
  const counts = safeWidgets.reduce((acc, widget) => {
    acc[widget.type] = (acc[widget.type] ?? 0) + 1;
    return acc;
  }, {});
  const sorted = sortWidgetsForDashboardLayout(safeWidgets);
  const arranged = new Map();
  const placed = [];
  let currentRank = null;
  let cursor = { x: 0, y: 0, nextRowY: 0, rowHeight: 0 };

  sorted.forEach(({ widget, rank }, index) => {
    if (currentRank !== null && rank !== currentRank) {
      cursor = {
        x: 0,
        y: cursor.nextRowY + AUTO_LAYOUT_SECTION_GAP,
        nextRowY: cursor.nextRowY + AUTO_LAYOUT_SECTION_GAP,
        rowHeight: 0,
      };
    }
    currentRank = rank;

    const size = getRecommendedWidgetSize(widget, counts);
    const rect = findNextGridPosition(placed, size, cursor);
    placed.push(rect);
    arranged.set(widget.id, normalizeWidgetLayout(widget, rect, index + 1));

    const nextRowY = Math.max(cursor.nextRowY, rect.y + rect.h);
    if (rect.w >= GRID_COLS) {
      cursor = {
        x: 0,
        y: nextRowY + AUTO_LAYOUT_GAP,
        nextRowY: nextRowY + AUTO_LAYOUT_GAP,
        rowHeight: 0,
      };
      return;
    }

    cursor = {
      x: rect.x + rect.w + AUTO_LAYOUT_GAP,
      y: rect.y,
      nextRowY,
      rowHeight: Math.max(cursor.rowHeight, rect.h),
    };
  });

  const nextWidgets = safeWidgets.map((widget) => arranged.get(widget.id) ?? widget);
  const maxRow = placed.reduce((value, rect) => Math.max(value, rect.y + rect.h), 0);
  const requiredHeight = clamp(
    Math.ceil((maxRow + AUTO_LAYOUT_SECTION_GAP) * GRID_UNIT),
    canvasSettings.height,
    AUTO_LAYOUT_MAX_HEIGHT
  );
  const nextCanvasSettings = requiredHeight > canvasSettings.height
    ? normalizeCanvasSettings({ ...canvasSettings, height: requiredHeight })
    : canvasSettings;

  return {
    widgets: nextWidgets,
    canvasSettings: nextCanvasSettings,
    expandedCanvas: nextCanvasSettings.height > canvasSettings.height,
  };
}

function normalizeCanvasSettings(settings = {}) {
  return {
    width: clamp(Math.round(finiteNumber(settings.width, DASHBOARD_WIDTH)), 960, 2400),
    height: clamp(Math.round(finiteNumber(settings.height, DASHBOARD_HEIGHT)), 640, 1600),
    zoom: clamp(Math.round(finiteNumber(settings.zoom, 75)), 25, 125),
    showGrid: typeof settings.showGrid === "boolean" ? settings.showGrid : true,
    snapToGrid: typeof settings.snapToGrid === "boolean" ? settings.snapToGrid : true,
  };
}

function sanitizeWidgetGeometry(widget, canvasSettings = normalizeCanvasSettings()) {
  const type = WIDGET_TYPES.has(widget?.type) ? widget.type : "text";
  const defaultSize = defaultWidgetSize(type);
  const minSize = minWidgetSize(type);
  const maxCols = Math.max(1, Math.floor(canvasSettings.width / GRID_UNIT));
  const maxRows = Math.max(1, Math.floor(canvasSettings.height / GRID_UNIT));
  const w = clamp(finiteNumber(widget?.w, defaultSize.w), minSize.w, maxCols);
  const h = clamp(finiteNumber(widget?.h, defaultSize.h), minSize.h, maxRows);
  return {
    x: clamp(finiteNumber(widget?.x, 0), 0, Math.max(0, maxCols - w)),
    y: clamp(finiteNumber(widget?.y, 0), 0, Math.max(0, maxRows - h)),
    w,
    h,
  };
}

function sanitizeWidget(widget, index = 0, canvasSettings = normalizeCanvasSettings()) {
  const type = WIDGET_TYPES.has(widget?.type) ? widget.type : "text";
  const fallback = createWidget(type, {
    id: makeId(type),
    x: 0,
    y: index * 2,
  });
  const geometry = sanitizeWidgetGeometry({ ...fallback, ...widget }, canvasSettings);
  return {
    ...fallback,
    ...widget,
    id: typeof widget?.id === "string" && widget.id ? widget.id : fallback.id,
    type,
    title: typeof widget?.title === "string" && widget.title ? widget.title : fallback.title,
    ...geometry,
    zIndex: clamp(finiteNumber(widget?.zIndex, fallback.zIndex), 1, 999),
    visible: typeof widget?.visible === "boolean" ? widget.visible : true,
    background: typeof widget?.background === "string" ? widget.background : fallback.background,
    borderColor: typeof widget?.borderColor === "string" ? widget.borderColor : fallback.borderColor,
    radius: clamp(finiteNumber(widget?.radius, fallback.radius), 0, 24),
    config: widget?.config && typeof widget.config === "object" ? widget.config : fallback.config,
    projectId: typeof widget?.projectId === "string" ? widget.projectId : fallback.projectId,
    dashboardId: typeof widget?.dashboardId === "string" ? widget.dashboardId : fallback.dashboardId,
    sourceChartId:
      typeof widget?.sourceChartId === "string"
        ? widget.sourceChartId
        : typeof widget?.sourceChartConfigId === "string"
          ? widget.sourceChartConfigId
          : typeof widget?.config?.sourceChartId === "string"
            ? widget.config.sourceChartId
            : fallback.sourceChartId,
    sourceChartConfigId:
      typeof widget?.sourceChartConfigId === "string"
        ? widget.sourceChartConfigId
        : typeof widget?.sourceChartId === "string"
          ? widget.sourceChartId
          : fallback.sourceChartConfigId,
    createdAt: typeof widget?.createdAt === "string" ? widget.createdAt : fallback.createdAt,
    updatedAt: typeof widget?.updatedAt === "string" ? widget.updatedAt : new Date().toISOString(),
  };
}

function sanitizeWidgets(widgets, canvasSettings) {
  if (!Array.isArray(widgets)) return [];
  const seenIds = new Set();
  return widgets.map((widget, index) => {
    const sanitized = sanitizeWidget(widget, index, canvasSettings);
    if (seenIds.has(sanitized.id)) sanitized.id = makeId(sanitized.type);
    seenIds.add(sanitized.id);
    return sanitized;
  });
}

function createWidget(type, overrides = {}) {
  const now = new Date().toISOString();
  const size = defaultWidgetSize(type);
  const base = {
    id: makeId(type),
    type,
    title: WIDGET_LABELS[type] ?? "Widget",
    x: 8,
    y: 0,
    w: size.w,
    h: size.h,
    zIndex: 1,
    visible: true,
    background: "#FFFFFF",
    borderColor: "#E6EAF0",
    radius: 4,
    config: {},
    createdAt: now,
    updatedAt: now,
  };

  if (type === "kpi") {
    base.config = {
      metricTitle: "ยอดขายรวม",
      value: "12.8M",
      comparison: "+18.4% จากเดือนก่อน",
      trend: "up",
    };
  }

  if (type === "text") {
    base.config = {
      text: "สรุปภาพรวมแดชบอร์ด",
      fontSize: 24,
      align: "left",
      color: "#172033",
    };
  }

  if (type === "filter") {
    base.config = {
      label: "หมวดหมู่",
      value: "ทั้งหมด",
    };
  }

  if (type === "button") {
    base.config = {
      label: "ดูรายละเอียด",
      tone: "primary",
    };
  }

  return { ...base, ...overrides, config: { ...base.config, ...(overrides.config ?? {}) } };
}

function nextWidgetY(widgets) {
  if (!widgets.length) return 0;
  return widgets.reduce((maxY, widget) => {
    const y = Number.isFinite(widget.y) ? widget.y : 0;
    return Math.max(maxY, y + widget.h + 2);
  }, 0);
}

function nextWidgetZ(widgets) {
  return widgets.reduce((maxZ, widget) => Math.max(maxZ, finiteNumber(widget.zIndex, 1)), 1) + 1;
}

function createChartWidget(savedChart, overrides = {}) {
  const config = normalizeChartConfig(savedChart?.config ?? buildSampleChartConfig());
  const sourceChartId = savedChart?.id || config.chartId;
  return createWidget("chart", {
    title: savedChart?.title || chartTitle(config),
    w: 72,
    h: 42,
    sourceChartId,
    sourceChartConfigId: sourceChartId,
    chartConfigSnapshot: config,
    config: {
      sourceChartId,
      title: savedChart?.title || chartTitle(config),
      chartType: config.chartType,
      fieldMappings: config.mappings,
      settings: config.settings,
      filters: config.filters,
      dataset: {
        sourceType: config.sourceType,
        datasetId: config.datasetId,
      },
      chartConfig: config,
    },
    ...overrides,
  });
}

function createTableWidget(overrides = {}) {
  return createWidget("table", {
    title: "ตารางยอดขาย",
    config: {
      columns: ["month", "category", "sales", "profit"],
      density: "compact",
    },
    ...overrides,
  });
}

function createTemplateWidgets(templateId, savedChart, context = {}) {
  const primaryChart = createChartWidget(savedChart, {
    x: 8,
    y: 36,
    w: 82,
    h: 44,
    projectId: context.projectId,
    dashboardId: context.dashboardId,
  });
  const secondaryConfig = buildSampleChartConfig({
    chartType: templateId === "finance" ? "donut" : templateId === "marketing" ? "funnel" : "line",
    title: templateId === "marketing" ? "Funnel ตามช่องทาง" : "แนวโน้มยอดขาย",
    subtitle: "ข้อมูลตัวอย่างสำหรับการสาธิต",
  });
  const secondarySavedChart = createSavedChartFromConfig(secondaryConfig, { forceNew: true });
  const secondaryChart = createChartWidget(
    secondarySavedChart ?? {
      id: secondaryConfig.chartId,
      title: chartTitle(secondaryConfig),
      chartType: secondaryConfig.chartType,
      config: secondaryConfig,
    },
    {
      x: 8,
      y: 82,
      w: 82,
      h: 32,
      projectId: context.projectId,
      dashboardId: context.dashboardId,
    }
  );

  return [
    createWidget("text", {
      x: 8,
      y: 4,
      w: 92,
      h: 10,
      title: "หัวข้อแดชบอร์ด",
      config: {
        text:
          templateId === "sales"
            ? "Sales Overview"
            : templateId === "marketing"
              ? "Marketing Funnel"
              : templateId === "operations"
                ? "Operations Monitor"
                : templateId === "finance"
                  ? "Financial Summary"
                  : "Executive Dashboard",
        fontSize: 28,
        align: "left",
        color: "#172033",
      },
    }),
    createWidget("kpi", {
      x: 8,
      y: 16,
      config: { metricTitle: "ยอดขายรวม", value: "12.8M", comparison: "+18.4% MoM", trend: "up" },
    }),
    createWidget("kpi", {
      x: 44,
      y: 16,
      config: { metricTitle: "กำไร", value: "3.2M", comparison: "+9.6% MoM", trend: "up" },
    }),
    createWidget("kpi", {
      x: 80,
      y: 16,
      config: { metricTitle: "คำสั่งซื้อ", value: "4,821", comparison: "+6.1% MoM", trend: "up" },
    }),
    createWidget("kpi", {
      x: 116,
      y: 16,
      config: { metricTitle: "ต้นทุน", value: "9.6M", comparison: "-2.4% MoM", trend: "down" },
    }),
    secondaryChart,
    primaryChart,
    createTableWidget({
      x: 92,
      y: 36,
      w: 80,
      h: 78,
      title: templateId === "operations" ? "รายการตรวจสอบ" : "Top Performance",
    }),
  ];
}

function loadDashboardLayout() {
  const defaultCanvasSettings = normalizeCanvasSettings();
  const fallback = {
    version: LAYOUT_SCHEMA_VERSION,
    projectId: "project-default",
    projectName: "Mini BI Workspace",
    dashboardId: "dashboard-default",
    dashboardName: "\u0e41\u0e14\u0e0a\u0e1a\u0e2d\u0e23\u0e4c\u0e14",
    widgets: [],
    canvasSettings: defaultCanvasSettings,
    theme: "light",
    dashboards: [],
    updatedAt: new Date().toISOString(),
    recovered: false,
  };

  if (typeof window === "undefined") return fallback;
  const activeProject = getActiveProject();
  const activeDashboard = getActiveDashboard();
  const stored = activeDashboard && typeof activeDashboard === "object"
    ? activeDashboard
    : safeParse(safeGetLocalStorageValue(LAYOUT_STORAGE_KEY), null);
  if (!stored || typeof stored !== "object") {
    return {
      ...fallback,
      projectId: activeProject?.id ?? fallback.projectId,
      projectName: activeProject?.name ?? fallback.projectName,
      dashboards: activeProject?.dashboards ?? [],
    };
  }
  const projectId = stored.projectId || activeProject?.id || fallback.projectId;
  const dashboardId = stored.id || stored.dashboardId || fallback.dashboardId;
  const canvasSettings = normalizeCanvasSettings(stored.canvasSettings);
  const rawWidgets = Array.isArray(stored.widgets) ? stored.widgets : [];
  const widgets = sanitizeWidgets(rawWidgets, canvasSettings);
  const legacyDefaultDashboardName = `${fallback.dashboardName}\u0e43\u0e2b\u0e21\u0e48`;
  const storedDashboardName =
    typeof stored.name === "string" && stored.name
      ? stored.name
      : typeof stored.dashboardName === "string" && stored.dashboardName && stored.dashboardName !== legacyDefaultDashboardName
        ? stored.dashboardName
      : fallback.dashboardName;
  const recovered =
    (typeof stored.version === "number" && stored.version !== LAYOUT_SCHEMA_VERSION) ||
    !Array.isArray(stored.widgets) ||
    rawWidgets.length !== widgets.length ||
    rawWidgets.some((widget) => {
      const geometry = ["x", "y", "w", "h"].some((key) => !Number.isFinite(Number(widget?.[key])));
      return geometry || !WIDGET_TYPES.has(widget?.type) || typeof widget?.id !== "string";
    });
  return {
    ...fallback,
    ...stored,
    version: LAYOUT_SCHEMA_VERSION,
    projectId,
    projectName: activeProject?.name ?? fallback.projectName,
    dashboardId,
    dashboardName: storedDashboardName,
    dashboards: activeProject?.dashboards ?? [],
    widgets,
    canvasSettings,
    theme: stored.theme === "dark" ? "dark" : "light",
    recovered,
  };
}

function roundLayoutValue(value) {
  return Math.round(value * 2) / 2;
}

function buildLayoutFromWidgets(widgets, gridUnit = GRID_UNIT) {
  const scale = GRID_UNIT / gridUnit;
  return widgets.map((widget) => ({
    i: widget.id,
    x: Math.round((Number.isFinite(widget.x) ? widget.x : 0) * scale),
    y: Math.round((Number.isFinite(widget.y) ? widget.y : 0) * scale),
    w: Math.max(1, Math.round(widget.w * scale)),
    h: Math.max(1, Math.round(widget.h * scale)),
    minW: Math.max(1, Math.round(minWidgetSize(widget.type).w * scale)),
    minH: Math.max(1, Math.round(minWidgetSize(widget.type).h * scale)),
    maxW: Math.round(GRID_COLS * scale),
    maxH: Math.floor(DASHBOARD_HEIGHT / gridUnit),
  }));
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus({ preventScroll: true });
    textarea.select();
    let copied = false;
    try {
      copied = document.execCommand("copy");
    } catch {
      copied = false;
    }
    textarea.remove();
    return copied;
  }
}

function WidgetContent({
  widget,
  canvasZoom,
  rows,
  savedCharts,
  workspaceSnapshot,
  selected,
  editingTextId,
  setEditingTextId,
  updateWidgetConfig,
  onExpandWidget,
}) {
  const chartViewportRef = useRef(null);
  const [chartViewport, setChartViewport] = useState(null);

  useEffect(() => {
    const node = chartViewportRef.current;
    if (widget.type !== "chart" || !node || typeof ResizeObserver === "undefined") return undefined;

    let frameId = null;
    const measure = () => {
      const rect = node.getBoundingClientRect();
      const next = {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };
      setChartViewport((current) => (
        current?.width === next.width && current?.height === next.height ? current : next
      ));
    };
    const observer = new ResizeObserver(() => {
      if (frameId !== null) cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(measure);
    });

    measure();
    observer.observe(node);
    return () => {
      observer.disconnect();
      if (frameId !== null) cancelAnimationFrame(frameId);
    };
  }, [canvasZoom, widget.id, widget.type]);

  if (widget.type === "chart") {
    const chartConfig = resolveWidgetChartConfig(widget, savedCharts);
    if (!chartConfig) {
      return (
        <div className="dcb-chart-compact-placeholder">
          <strong>ไม่พบข้อมูลกราฟ</strong>
          <span>กรุณาเลือกกราฟใหม่จากรายการวิดเจ็ต</span>
        </div>
      );
    }

    const sourceChartId = savedChartIdFromWidget(widget);
    const savedChart = sourceChartId ? savedCharts.find((chart) => chart.id === sourceChartId) : null;
    const chartRecord = savedChart ?? {
      id: sourceChartId || widget.id,
      projectId: widget.projectId,
      datasetId: chartConfig.datasetId ?? null,
      chartType: chartConfig.chartType,
      config: chartConfig,
      dataContract: widget.config?.dataContract ?? null,
    };
    const chartData = resolveChartData(workspaceSnapshot, chartRecord, {
      demoResolver: (datasetId) => ({
        rows: getDatasetRows(datasetId, workspaceSnapshot),
        fields: dataFields,
      }),
    });
    if (chartData.status !== "ready") {
      return (
        <div className="dcb-chart-compact-placeholder" role="status">
          <strong>{chartData.status === "empty" ? "ชุดข้อมูลยังไม่มีแถวข้อมูล" : "ไม่สามารถแสดงข้อมูลกราฟนี้ได้"}</strong>
          <span>{chartData.message}</span>
        </div>
      );
    }

    // Grid dimensions describe the unscaled editor layout. Density must follow
    // the pixels the user can actually see after Canvas zoom is applied.
    const zoomScale = canvasZoom / 100;
    const chartWidth = chartViewport?.width ?? Math.round(widget.w * GRID_UNIT * zoomScale);
    const chartHeight = chartViewport?.height ?? Math.round(widget.h * GRID_UNIT * zoomScale);
    // A chart at the editor minimum is still a valid micro chart. Reserve the
    // placeholder only for a collapsed, non-renderable container.
    if (chartWidth < 1 || chartHeight < 1) {
      return (
        <div className="dcb-chart-compact-placeholder">
          <strong>ขยายวิดเจ็ตเพื่อดูกราฟ</strong>
          <span>พื้นที่ไม่พอสำหรับแสดงแกนและคำอธิบาย</span>
          {!selected ? null : (
            <button type="button" onClick={() => onExpandWidget?.(widget.id)}>
              ขยายขนาด
            </button>
          )}
        </div>
      );
    }

    const density = chartWidgetDensity(chartWidth, chartHeight);
    const compactChart = density === "compact" || density === "mini" || density === "micro";
    const miniChart = density === "mini" || density === "micro";
    const dashboardChartFields = normalizeDashboardChartFields(chartData.fields);
    const dashboardChartConfig = {
      ...chartConfig,
      mappings: toDashboardMappingSlots(chartConfig, dashboardChartFields),
      settings: {
        ...chartConfig.settings,
        general: {
          ...chartConfig.settings.general,
          // The widget handle already presents the saved chart title. Keeping a
          // second title inside a compact dashboard card wastes plot space.
          showTitle: false,
          showSubtitle: false,
          padding: compactChart ? Math.min(finiteNumber(chartConfig.settings.general.padding, 12), 8) : chartConfig.settings.general.padding,
        },
        axis: {
          ...chartConfig.settings.axis,
          showXAxis: miniChart ? false : chartConfig.settings.axis.showXAxis,
          showYAxis: miniChart ? false : chartConfig.settings.axis.showYAxis,
          showAxisLabels: compactChart ? false : chartConfig.settings.axis.showAxisLabels,
          numberFormat: compactChart ? "compact" : chartConfig.settings.axis.numberFormat,
        },
        labels: {
          ...chartConfig.settings.labels,
          showDataLabels: compactChart ? false : chartConfig.settings.labels.showDataLabels,
        },
        legend: {
          ...chartConfig.settings.legend,
          showLegend: compactChart ? false : chartConfig.settings.legend.showLegend,
        },
        grid: {
          ...chartConfig.settings.grid,
          showGrid: miniChart ? false : chartConfig.settings.grid.showGrid,
        },
      },
    };

    return (
      <div
        ref={chartViewportRef}
        className={`dcb-chart-widget ${density === "micro" ? "is-micro" : miniChart ? "is-mini" : compactChart ? "is-compact" : ""}`}
        data-chart-density={density}
      >
        <ChartPreview
          config={dashboardChartConfig}
          datasetRows={chartData.rows}
          fields={dashboardChartFields}
          previewMode
          deviceMode="desktop"
          zoom={canvasZoom}
          density={miniChart ? "mini" : compactChart ? "compact" : "standard"}
        />
      </div>
    );
  }

  if (widget.type === "kpi") {
    return (
      <div className="dcb-kpi-widget">
        <span>{widget.config.metricTitle}</span>
        <strong>{widget.config.value}</strong>
        <small className={widget.config.trend === "down" ? "is-down" : "is-up"}>{widget.config.comparison}</small>
      </div>
    );
  }

  if (widget.type === "table") {
    const columns = widget.config.columns ?? ["month", "category", "sales"];
    return (
      <div className="dcb-table-widget">
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 7).map((row, index) => (
              <tr key={`${row.month}-${row.category}-${index}`}>
                {columns.map((column) => (
                  <td key={column}>{typeof row[column] === "number" ? Number(row[column]).toLocaleString("th-TH") : row[column]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (widget.type === "text") {
    if (editingTextId === widget.id) {
      return (
        <textarea
          className="dcb-text-editor"
          value={widget.config.text}
          autoFocus
          onChange={(event) => updateWidgetConfig(widget.id, { text: event.target.value })}
          onBlur={() => setEditingTextId(null)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setEditingTextId(null);
          }}
        />
      );
    }
    return (
      <div
        className="dcb-text-widget"
        onDoubleClick={() => setEditingTextId(widget.id)}
        style={{
          color: widget.config.color,
          fontSize: widget.config.fontSize,
          textAlign: widget.config.align,
        }}
      >
        {widget.config.text}
        {selected ? <span className="dcb-edit-hint">ดับเบิลคลิกเพื่อแก้ไข</span> : null}
      </div>
    );
  }

  if (widget.type === "image") {
    return widget.config.src ? (
      <img className="dcb-image-widget" src={widget.config.src} alt={widget.title} />
    ) : (
      <div className="dcb-image-placeholder">
        <span>รูปภาพ</span>
        <small>เลือกไฟล์จากแผงคุณสมบัติ</small>
      </div>
    );
  }

  if (widget.type === "filter") {
    return (
      <div className="dcb-filter-widget">
        <label>{widget.config.label}</label>
        <select
          value={widget.config.value}
          onChange={(event) => updateWidgetConfig(widget.id, { value: event.target.value })}
        >
          <option>ทั้งหมด</option>
          <option>Electronics</option>
          <option>Furniture</option>
          <option>Office</option>
        </select>
        <small>ตัวกรองเดโมสำหรับการจัดวาง</small>
      </div>
    );
  }

  if (widget.type === "divider") {
    return <div className="dcb-divider-widget" />;
  }

  if (widget.type === "button") {
    return (
      <button type="button" className="dcb-action-widget" disabled title="ปุ่มตัวอย่างสำหรับจัดวาง ยังไม่ได้ตั้งค่า Action">
        {widget.config.label}
      </button>
    );
  }

  return <div className="dcb-shape-widget" />;
}

export default function DashboardCanvasBuilder() {
  const navigate = useNavigate();
  const location = useLocation();
  const navigation = useNavigationControls();
  const mockMode = isMockMode();
  const storeActiveProjectId = useStore((state) => state.activeProjectId);
  const initialState = useMemo(() => {
    const stored = loadDashboardLayout();
    // A persisted UI id is not authorization proof.  Production must resolve
    // the project from the API before project-scoped requests are issued.
    return mockMode ? stored : {
      ...stored,
      projectId: null,
      projectName: "",
      dashboardId: null,
      dashboards: [],
      widgets: [],
    };
  }, [mockMode]);
  const initialPanelState = useMemo(() => loadPanelState(), []);
  const workspaceSnapshot = useWorkspaceSelector((snapshot) => snapshot);
  const rows = useMemo(() => (mockMode ? getDatasetRows("sales_performance") : []), [mockMode]);
  const [activeProjectId, setActiveProjectId] = useState(initialState.projectId);
  const [activeProjectName, setActiveProjectName] = useState(initialState.projectName);
  const [projectBootstrapStatus, setProjectBootstrapStatus] = useState(mockMode ? "ready" : "loading");
  const [activeDashboardId, setActiveDashboardId] = useState(initialState.dashboardId);
  const [dashboards, setDashboards] = useState(initialState.dashboards);
  const [dashboardName, setDashboardName] = useState(initialState.dashboardName);
  const [widgets, setWidgets] = useState(initialState.widgets);
  const [canvasSettings, setCanvasSettings] = useState(initialState.canvasSettings);
  const [theme, setTheme] = useState(initialState.theme);
  const [leftPanelOpen, setLeftPanelOpen] = useState(initialPanelState.leftOpen);
  const [rightPanelOpen, setRightPanelOpen] = useState(initialPanelState.rightOpen);
  const [selectedWidgetId, setSelectedWidgetId] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [savedCharts, setSavedCharts] = useState(() => (mockMode ? readSavedCharts() : []));
  const [elementsModalOpen, setElementsModalOpen] = useState(false);
  const [suggestedElementType, setSuggestedElementType] = useState(null);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [templateConfirm, setTemplateConfirm] = useState(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [serverShare, setServerShare] = useState({ status: "idle", token: "", dashboardId: "", error: "" });
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [toast, setToast] = useState(() =>
    consumeStorageRecoveryMessage() || (initialState.recovered ? "กู้คืน layout ที่ไม่สมบูรณ์แล้ว" : "")
  );
  const [saveStatus, setSaveStatus] = useState("saved");
  const [lastSavedAt, setLastSavedAt] = useState("ล่าสุด");
  const [historyPast, setHistoryPast] = useState([]);
  const [historyFuture, setHistoryFuture] = useState([]);
  const [editingTextId, setEditingTextId] = useState(null);
  const [widgetMenuId, setWidgetMenuId] = useState(null);
  const [widgetContextMenu, setWidgetContextMenu] = useState(null);
  const [contextDeleteWidget, setContextDeleteWidget] = useState(null);
  const [chartActionMenuId, setChartActionMenuId] = useState(null);
  const [chartListFilter, setChartListFilter] = useState("all");
  const [savedChartDeleteConfirm, setSavedChartDeleteConfirm] = useState(null);
  const [dashboardActionMenuOpen, setDashboardActionMenuOpen] = useState(false);
  const [focusedWidgetId, setFocusedWidgetId] = useState(null);
  const widgetsRef = useRef(widgets);
  const canvasSettingsRef = useRef(canvasSettings);
  const activeProjectIdRef = useRef(activeProjectId);
  const availableProjectIdsRef = useRef(new Set());
  const activeDashboardIdRef = useRef(activeDashboardId);
  const dashboardRevisionRef = useRef(0);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const focusPulseTimerRef = useRef(null);
  const contextMenuRef = useRef(null);
  const [autosave] = useState(() => createDashboardAutosave({
    delay: 700,
    save: () => {},
  }));
  const autosaveReadyRef = useRef(false);
  const autosaveSuppressedRef = useRef(false);
  const saveStatusRef = useRef(saveStatus);
  const sessionAssetUrlsRef = useRef(new Set());

  useEffect(() => {
    widgetsRef.current = widgets;
  }, [widgets]);

  useEffect(() => {
    canvasSettingsRef.current = canvasSettings;
  }, [canvasSettings]);

  useEffect(() => {
    activeProjectIdRef.current = activeProjectId;
  }, [activeProjectId]);

  useEffect(() => {
    if (mockMode || projectBootstrapStatus !== "ready" || !storeActiveProjectId || storeActiveProjectId === activeProjectIdRef.current) return;
    if (!availableProjectIdsRef.current.has(storeActiveProjectId)) return;
    activeProjectIdRef.current = storeActiveProjectId;
    activeDashboardIdRef.current = null;
    setActiveProjectId(storeActiveProjectId);
    setActiveProjectName("");
    setActiveDashboardId(null);
    setSelectedWidgetId(null);
  }, [mockMode, projectBootstrapStatus, storeActiveProjectId]);

  useEffect(() => {
    if (mockMode) return undefined;
    let active = true;
    setProjectBootstrapStatus("loading");
    getApiProjects()
      .then((items) => {
        if (!active) return;
        const projects = Array.isArray(items) ? items : [];
        availableProjectIdsRef.current = new Set(projects.map((project) => project.id));
        const selected = resolveApiActiveProject(
          projects,
          window.localStorage.getItem(API_ACTIVE_PROJECT_KEY),
          useStore.getState().activeProjectId,
        );
        if (!selected) {
          activeProjectIdRef.current = null;
          activeDashboardIdRef.current = null;
          setActiveProjectId(null);
          setActiveProjectName("");
          setActiveDashboardId(null);
          setDashboards([]);
          setSavedCharts([]);
          setWidgets([]);
          widgetsRef.current = [];
          setProjectBootstrapStatus("empty");
          return;
        }
        window.localStorage.setItem(API_ACTIVE_PROJECT_KEY, selected.id);
        useStore.setState({ activeProjectId: selected.id });
        activeProjectIdRef.current = selected.id;
        setActiveProjectId(selected.id);
        setActiveProjectName(selected.name ?? "");
        setProjectBootstrapStatus("ready");
      })
      .catch((error) => {
        if (!active) return;
        availableProjectIdsRef.current = new Set();
        setProjectBootstrapStatus("error");
        setSaveStatus("error");
        setToast(error?.message || "ไม่สามารถโหลด Project จากระบบได้");
      });
    return () => { active = false; };
  }, [mockMode]);

  useEffect(() => {
    activeDashboardIdRef.current = activeDashboardId;
  }, [activeDashboardId]);

  useEffect(() => {
    saveStatusRef.current = saveStatus;
  }, [saveStatus]);

  useEffect(() => {
    if (mockMode || projectBootstrapStatus !== "ready" || !activeProjectId) return undefined;
    let active = true;
    setSaveStatus("loading");
    Promise.all([
      listDashboardsApi(activeProjectId),
      getCharts(activeProjectId),
    ]).then(async ([dashboardItems, chartItems]) => {
      if (!active) return;
      const availableDashboards = Array.isArray(dashboardItems) ? dashboardItems : [];
      const selectedDashboard = availableDashboards.find((item) => item.id === activeDashboardIdRef.current)
        ?? availableDashboards[0]
        ?? null;
      setDashboards(availableDashboards);
      setSavedCharts(Array.isArray(chartItems) ? chartItems : []);
      if (!selectedDashboard) {
        setWidgets([]);
        widgetsRef.current = [];
        setSaveStatus("saved");
        return;
      }
      const context = await loadDashboardContext(selectedDashboard.id, { projectId: activeProjectId });
      if (!active) return;
      const dashboard = context?.dashboard ?? context;
      const chartsById = new Map((Array.isArray(chartItems) ? chartItems : []).map((chart) => [chart.id, chart]));
      const nextCanvasSettings = normalizeCanvasSettings(dashboard.canvasSettingsJson ?? dashboard.canvasSettings ?? canvasSettingsRef.current);
      const nextWidgets = sanitizeWidgets(
        (dashboard.widgets ?? dashboard.layout ?? []).map((widget) => {
          const chart = widget.chartId ? chartsById.get(widget.chartId) : null;
          return {
            ...widget,
            w: widget.width ?? widget.w,
            h: widget.height ?? widget.h,
            sourceChartId: widget.chartId ?? widget.sourceChartId,
            sourceChartConfigId: widget.chartId ?? widget.sourceChartConfigId,
            title: chart?.title ?? chart?.name ?? widget.title,
            config: widget.configJson ?? widget.config ?? {},
            chartConfigSnapshot: chart?.config ?? widget.chartConfigSnapshot,
          };
        }),
        nextCanvasSettings,
      );
      dashboardRevisionRef.current = Number(dashboard.revision || 0);
      activeDashboardIdRef.current = dashboard.id;
      setActiveDashboardId(dashboard.id);
      setDashboardName(dashboard.name || "Dashboard");
      setCanvasSettings(nextCanvasSettings);
      canvasSettingsRef.current = nextCanvasSettings;
      setWidgets(nextWidgets);
      widgetsRef.current = nextWidgets;
      setTheme(dashboard.canvasSettingsJson?.theme ?? dashboard.canvasSettings?.theme ?? "light");
      setSaveStatus("saved");
      setLastSavedAt(formatSavedTime(new Date(dashboard.updatedAt || Date.now())));
    }).catch((error) => {
      if (!active) return;
      setSaveStatus("error");
      setToast(error?.message || "ไม่สามารถโหลด Dashboard จากระบบได้");
    });
    return () => {
      active = false;
    };
  }, [activeProjectId, mockMode, projectBootstrapStatus]);

  useEffect(() => {
    safeSetLocalStorage(PANEL_STATE_STORAGE_KEY, JSON.stringify({
      leftOpen: leftPanelOpen,
      rightOpen: rightPanelOpen,
    }));
  }, [leftPanelOpen, rightPanelOpen]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      window.dispatchEvent(new Event("resize"));
    });
    const timer = window.setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 260);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [leftPanelOpen, previewMode, rightPanelOpen]);

  useEffect(() => {
    if (!mockMode) return undefined;
    const refreshSavedCharts = () => setSavedCharts(readSavedCharts());
    const onStorage = (event) => {
      if (
        event.key === SAVED_CHARTS_KEY ||
        event.key === V2_SINGLE_CHART_KEY ||
        event.key === PROJECTS_KEY ||
        event.key === ACTIVE_PROJECT_KEY ||
        event.key === ACTIVE_DASHBOARD_KEY ||
        event.key === CANONICAL_WORKSPACE_KEY
      ) {
        refreshSavedCharts();
        setDashboards(getDashboards(activeProjectIdRef.current));
      }
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", refreshSavedCharts);
    document.addEventListener("visibilitychange", refreshSavedCharts);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", refreshSavedCharts);
      document.removeEventListener("visibilitychange", refreshSavedCharts);
    };
  }, [mockMode]);

  useEffect(() => {
    if (!chartActionMenuId) return undefined;

    function closeChartActionMenu(event) {
      if (event.target instanceof Element && event.target.closest(".dcb-added-chart-more-wrap")) return;
      setChartActionMenuId(null);
    }

    function closeChartActionMenuWithKeyboard(event) {
      if (event.key !== "Escape") return;
      setChartActionMenuId(null);
    }

    document.addEventListener("pointerdown", closeChartActionMenu, true);
    document.addEventListener("keydown", closeChartActionMenuWithKeyboard);
    return () => {
      document.removeEventListener("pointerdown", closeChartActionMenu, true);
      document.removeEventListener("keydown", closeChartActionMenuWithKeyboard);
    };
  }, [chartActionMenuId]);

  useEffect(() => {
    if (!widgetContextMenu) return undefined;

    function closeContextMenu(event) {
      if (event.target instanceof Element && event.target.closest(".dcb-widget-context-menu")) return;
      setWidgetContextMenu(null);
    }

    function closeContextMenuWithKeyboard(event) {
      if (event.key !== "Escape") return;
      setWidgetContextMenu(null);
    }

    function closeContextMenuOnViewportChange() {
      setWidgetContextMenu(null);
    }

    document.addEventListener("pointerdown", closeContextMenu, true);
    document.addEventListener("keydown", closeContextMenuWithKeyboard);
    window.addEventListener("resize", closeContextMenuOnViewportChange);
    window.addEventListener("scroll", closeContextMenuOnViewportChange, true);
    return () => {
      document.removeEventListener("pointerdown", closeContextMenu, true);
      document.removeEventListener("keydown", closeContextMenuWithKeyboard);
      window.removeEventListener("resize", closeContextMenuOnViewportChange);
      window.removeEventListener("scroll", closeContextMenuOnViewportChange, true);
    };
  }, [widgetContextMenu]);

  useEffect(() => {
    setWidgetContextMenu(null);
  }, [location.hash, location.pathname, location.search]);

  useEffect(() => {
    if (!dashboardActionMenuOpen) return undefined;

    function closeDashboardActionMenu(event) {
      if (event.target instanceof Element && event.target.closest(".dcb-dashboard-more-wrap")) return;
      setDashboardActionMenuOpen(false);
    }

    function closeDashboardActionMenuWithKeyboard(event) {
      if (event.key !== "Escape") return;
      setDashboardActionMenuOpen(false);
    }

    document.addEventListener("pointerdown", closeDashboardActionMenu, true);
    document.addEventListener("keydown", closeDashboardActionMenuWithKeyboard);
    return () => {
      document.removeEventListener("pointerdown", closeDashboardActionMenu, true);
      document.removeEventListener("keydown", closeDashboardActionMenuWithKeyboard);
    };
  }, [dashboardActionMenuOpen]);

  const runChartCardAction = useCallback((action) => {
    setChartActionMenuId(null);
    action();
  }, []);

  const runDashboardAction = useCallback((action) => {
    setDashboardActionMenuOpen(false);
    action();
  }, []);

  const selectedWidget = useMemo(
    () => widgets.find((widget) => widget.id === selectedWidgetId) ?? null,
    [selectedWidgetId, widgets]
  );
  const selectedSavedChart = useMemo(() => {
    const sourceChartId = savedChartIdFromWidget(selectedWidget);
    if (!sourceChartId) return null;
    return savedCharts.find((chart) => chart.id === sourceChartId) ?? null;
  }, [savedCharts, selectedWidget]);
  const selectedChartConfig = useMemo(
    () => (selectedWidget?.type === "chart" ? resolveWidgetChartConfig(selectedWidget, savedCharts) : null),
    [savedCharts, selectedWidget]
  );
  const selectedChartCanRefresh = Boolean(selectedWidget?.type === "chart" && selectedSavedChart);
  const savedChartUsageCounts = useMemo(() => {
    const counts = new Map();
    widgets.forEach((widget) => {
      const chartId = savedChartIdFromWidget(widget);
      if (chartId) counts.set(chartId, (counts.get(chartId) ?? 0) + 1);
    });
    return counts;
  }, [widgets]);

  useEffect(() => {
    if (!savedCharts.length || !widgetsRef.current.some((widget) => widget.type === "chart")) return;

    const savedById = new Map(savedCharts.map((chart) => [chart.id, chart]));
    let changed = false;
    const nextWidgets = widgetsRef.current.map((widget) => {
      if (widget.type !== "chart") return widget;
      const sourceChartId = savedChartIdFromWidget(widget);
      const savedChart = sourceChartId ? savedById.get(sourceChartId) : null;
      if (!savedChart?.config) return widget;

      const savedConfig = normalizeChartConfig(savedChart.config);
      const currentSnapshot = widget.chartConfigSnapshot && typeof widget.chartConfigSnapshot === "object"
        ? normalizeChartConfig(widget.chartConfigSnapshot)
        : widget.config?.chartConfig && typeof widget.config.chartConfig === "object"
          ? normalizeChartConfig(widget.config.chartConfig)
          : null;
      const savedUpdatedAt = Date.parse(savedChart.updatedAt || savedConfig.updatedAt || "");
      const currentUpdatedAt = Date.parse(currentSnapshot?.updatedAt || widget.updatedAt || "");
      const savedIsNewer = Number.isFinite(savedUpdatedAt) && savedUpdatedAt > (Number.isFinite(currentUpdatedAt) ? currentUpdatedAt : 0);
      const titleChanged = widget.title !== savedChart.title || widget.config?.title !== savedChart.title;
      const chartTypeChanged = widget.config?.chartType !== savedConfig.chartType;
      if (!savedIsNewer && !titleChanged && !chartTypeChanged) return widget;

      changed = true;
      return sanitizeWidget(
        {
          ...widget,
          title: savedChart.title,
          sourceChartId: savedChart.id,
          sourceChartConfigId: savedChart.id,
          chartConfigSnapshot: savedConfig,
          config: {
            ...widget.config,
            sourceChartId: savedChart.id,
            title: savedChart.title,
            chartType: savedConfig.chartType,
            fieldMappings: savedConfig.mappings,
            settings: savedConfig.settings,
            filters: savedConfig.filters,
            dataset: {
              sourceType: savedConfig.sourceType,
              datasetId: savedConfig.datasetId,
            },
            chartConfig: savedConfig,
          },
          updatedAt: new Date().toISOString(),
        },
        0,
        canvasSettingsRef.current
      );
    });

    if (!changed) return;
    setWidgets(nextWidgets);
    widgetsRef.current = nextWidgets;
    setSaveStatus("unsaved");
  }, [savedCharts]);

  const unifiedChartItems = useMemo(() => {
    const savedById = new Map(savedCharts.map((chart) => [chart.id, chart]));
    const widgetGroups = new Map();

    widgets
      .filter((widget) => widget.type === "chart")
      .forEach((widget) => {
        const sourceChartId = savedChartIdFromWidget(widget);
        const key = sourceChartId ? `chart:${sourceChartId}` : `snapshot:${widget.id}`;
        const existing = widgetGroups.get(key);
        if (existing) {
          existing.widgets.push(widget);
          return;
        }
        widgetGroups.set(key, {
          key,
          sourceChartId,
          savedChart: sourceChartId ? savedById.get(sourceChartId) ?? null : null,
          widgets: [widget],
        });
      });

    const savedItems = savedCharts.map((chart) => {
      const group = widgetGroups.get(`chart:${chart.id}`);
      const widgetsUsingChart = group?.widgets ?? [];
      const usageCount = widgetsUsingChart.length;
      const status = usageCount ? "dashboard" : "available";
      return {
        id: `chart:${chart.id}`,
        status,
        savedChart: chart,
        sourceChartId: chart.id,
        widgets: widgetsUsingChart,
        firstWidget: widgetsUsingChart[0] ?? null,
        title: chart.title || chartTitle(chart.config),
        chartType: chart.chartType || chart.config?.chartType || "bar",
        updatedAt: chart.updatedAt || chart.createdAt,
        usageCount,
        hasDashboardWidget: usageCount > 0,
        badge:
          usageCount > 1
            ? `ใช้แล้ว ${usageCount} ครั้ง`
            : usageCount === 1
              ? "อยู่ใน Dashboard"
              : "ยังไม่ได้เพิ่ม",
        description:
          usageCount > 1
            ? `ใช้ใน Dashboard นี้ ${usageCount} ครั้ง`
            : usageCount === 1
              ? "ใช้ใน Dashboard นี้ 1 ครั้ง"
              : "กราฟ reusable จากตัวสร้างกราฟ",
      };
    });

    const orphanItems = Array.from(widgetGroups.values())
      .filter((group) => !group.savedChart)
      .map((group) => {
        const firstWidget = group.widgets[0];
        const chartConfig = resolveWidgetChartConfig(firstWidget, savedCharts);
        const chartType = firstWidget?.config?.chartType || chartConfig?.chartType || "bar";
        const isMissingSource = Boolean(group.sourceChartId);
        return {
          id: group.key,
          status: isMissingSource ? "missing" : "snapshot",
          savedChart: null,
          sourceChartId: group.sourceChartId,
          widgets: group.widgets,
          firstWidget,
          title: firstWidget?.title || chartTitle(chartConfig),
          chartType,
          updatedAt: firstWidget?.updatedAt || firstWidget?.createdAt,
          usageCount: group.widgets.length,
          hasDashboardWidget: true,
          badge: isMissingSource ? "ไม่พบต้นฉบับ" : "Snapshot",
          description: isMissingSource
            ? "ต้นฉบับถูกลบแล้ว วิดเจ็ตนี้ใช้ snapshot แทน"
            : "กราฟ snapshot บน Dashboard นี้",
        };
      });

    return [...savedItems, ...orphanItems];
  }, [savedCharts, widgets]);

  const filteredUnifiedChartItems = useMemo(() => {
    if (chartListFilter === "dashboard") {
      return unifiedChartItems.filter((item) => item.hasDashboardWidget);
    }
    if (chartListFilter === "available") {
      return unifiedChartItems.filter((item) => item.status === "available");
    }
    return unifiedChartItems;
  }, [chartListFilter, unifiedChartItems]);

  const chartListCounts = useMemo(() => ({
    all: unifiedChartItems.length,
    dashboard: unifiedChartItems.filter((item) => item.hasDashboardWidget).length,
    available: unifiedChartItems.filter((item) => item.status === "available").length,
  }), [unifiedChartItems]);

  const dashboardChartItems = useMemo(() => (
    widgets
      .filter((widget) => widget.type === "chart")
      .map((widget) => {
        const sourceChartId = savedChartIdFromWidget(widget);
        const savedChart = sourceChartId ? savedCharts.find((chart) => chart.id === sourceChartId) : null;
        const chartConfig = resolveWidgetChartConfig(widget, savedCharts);
        const chartType = savedChart?.chartType || widget.config?.chartType || chartConfig?.chartType || "bar";
        return {
          widget,
          sourceChartId,
          savedChart,
          title: savedChart?.title || widget.title || chartTitle(chartConfig),
          chartType,
          usageCount: sourceChartId ? (savedChartUsageCounts.get(sourceChartId) ?? 0) : 0,
          updatedAt: savedChart?.updatedAt || widget.updatedAt || widget.createdAt,
        };
      })
  ), [savedChartUsageCounts, savedCharts, widgets]);
  const layerRange = useMemo(() => {
    const levels = widgets.map((widget) => finiteNumber(widget.zIndex, 1));
    return {
      min: levels.length ? Math.min(...levels) : 1,
      max: levels.length ? Math.max(...levels) : 1,
    };
  }, [widgets]);
  const selectedLayerState = useMemo(() => {
    if (!selectedWidget) return { isTop: true, isBottom: true };
    const currentZ = finiteNumber(selectedWidget.zIndex, 1);
    const topCount = widgets.filter((widget) => finiteNumber(widget.zIndex, 1) === layerRange.max).length;
    const bottomCount = widgets.filter((widget) => finiteNumber(widget.zIndex, 1) === layerRange.min).length;
    return {
      isTop: widgets.length <= 1 || (currentZ >= layerRange.max && topCount <= 1),
      isBottom: widgets.length <= 1 || (currentZ <= layerRange.min && bottomCount <= 1),
    };
  }, [layerRange.max, layerRange.min, selectedWidget, widgets]);

  const activeGridUnit = canvasSettings.snapToGrid ? GRID_UNIT : GRID_UNIT / 2;
  const activeGridCols = Math.floor(canvasSettings.width / activeGridUnit);
  const layout = useMemo(() => buildLayoutFromWidgets(widgets, activeGridUnit), [activeGridUnit, widgets]);

  const buildLayoutPayload = useCallback(
    () => ({
      version: LAYOUT_SCHEMA_VERSION,
      id: activeDashboardIdRef.current,
      dashboardId: activeDashboardIdRef.current,
      projectId: activeProjectIdRef.current,
      name: dashboardName,
      dashboardName,
      widgets: sanitizeWidgets(widgetsRef.current, canvasSettingsRef.current).map((widget) => ({
        ...widget,
        projectId: activeProjectIdRef.current,
        dashboardId: activeDashboardIdRef.current,
      })),
      canvasSettings: normalizeCanvasSettings(canvasSettingsRef.current),
      theme,
      updatedAt: new Date().toISOString(),
    }),
    [dashboardName, theme]
  );

  const persistLayout = useCallback(async (nextPayload) => {
    const payload = prepareDashboardForPersistence(nextPayload ?? buildLayoutPayload());
    if (mockMode) {
      const savedDashboard = upsertDashboard(payload.projectId, payload);
      if (!savedDashboard) throw new Error("Unable to save dashboard");
      safeSetLocalStorage(LAYOUT_STORAGE_KEY, JSON.stringify(compactDashboardLayoutForStorage(payload)), { removeOnFail: false });
      const storageMessage = consumeStorageRecoveryMessage();
      if (storageMessage) setToast(storageMessage);
      setDashboards(getDashboards(payload.projectId));
      setSaveStatus("saved");
      setLastSavedAt(formatSavedTime());
      return savedDashboard;
    }
    try {
      setSaveStatus("saving");
      const updatedDashboard = await updateDashboardApi(payload.dashboardId, {
        revision: dashboardRevisionRef.current,
        name: payload.dashboardName,
        canvasSettings: { ...payload.canvasSettings, theme: payload.theme },
      });
      const savedDashboard = await saveDashboardWidgets(payload.dashboardId, {
        revision: updatedDashboard.revision,
        widgets: payload.widgets.map((widget) => ({
          id: widget.id,
          chartId: savedChartIdFromWidget(widget),
          type: widget.type,
          x: widget.x,
          y: widget.y,
          width: widget.w ?? widget.width,
          height: widget.h ?? widget.height,
          zIndex: widget.zIndex,
          config: widget.config,
        })),
      });
      dashboardRevisionRef.current = Number(savedDashboard.revision || updatedDashboard.revision + 1);
      setSaveStatus("saved");
      setLastSavedAt(formatSavedTime());
      return savedDashboard;
    } catch (error) {
      setSaveStatus("error");
      setToast(error?.status === 409
        ? "Dashboard ถูกแก้ไขจากอีกหน้าต่าง กรุณาโหลดข้อมูลล่าสุดก่อนบันทึกอีกครั้ง"
        : (error?.message || "ไม่สามารถบันทึก Dashboard ได้"));
      throw error;
    }
  }, [buildLayoutPayload, mockMode]);

  const chartDesignerUrl = useCallback((params = {}) => {
    const search = new URLSearchParams({
      from: "dashboard",
      projectId: activeProjectIdRef.current,
      dashboardId: activeDashboardIdRef.current,
      ...params,
    });
    return `/dashboard-v2?${search.toString()}`;
  }, []);

  const preserveActiveContext = useCallback(() => {
    if (mockMode) setStoredActiveProject(activeProjectIdRef.current, activeDashboardIdRef.current);
  }, [mockMode]);

  const openChartDesignerForCreate = useCallback(() => {
    persistLayout();
    preserveActiveContext();
    navigate(chartDesignerUrl({ mode: "create" }));
  }, [chartDesignerUrl, navigate, persistLayout, preserveActiveContext]);

  const applyDashboardState = useCallback((nextState, message) => {
    autosave.cancel();
    autosaveSuppressedRef.current = true;
    activeProjectIdRef.current = nextState.projectId;
    activeDashboardIdRef.current = nextState.dashboardId;
    setActiveProjectId(nextState.projectId);
    setActiveProjectName(nextState.projectName);
    setActiveDashboardId(nextState.dashboardId);
    setDashboards(nextState.dashboards);
    setDashboardName(nextState.dashboardName);
    setWidgets(nextState.widgets);
    widgetsRef.current = nextState.widgets;
    setCanvasSettings(nextState.canvasSettings);
    canvasSettingsRef.current = nextState.canvasSettings;
    setTheme(nextState.theme);
    setSelectedWidgetId(null);
    setWidgetMenuId(null);
    setWidgetContextMenu(null);
    setChartActionMenuId(null);
    setHistoryPast([]);
    setHistoryFuture([]);
    setSaveStatus("saved");
    setLastSavedAt(formatSavedTime());
    setSavedCharts(readSavedCharts());
    if (message) setToast(message);
  }, [autosave]);

  const loadActiveDashboardState = useCallback(async (message, dashboardId = activeDashboardIdRef.current) => {
    if (mockMode) {
      const nextState = loadDashboardLayout();
      applyDashboardState(nextState, message);
      return;
    }
    const [context, dashboardItems, chartItems] = await Promise.all([
      loadDashboardContext(dashboardId, { projectId: activeProjectIdRef.current }),
      listDashboardsApi(activeProjectIdRef.current),
      getCharts(activeProjectIdRef.current),
    ]);
    const dashboard = context?.dashboard ?? context;
    const nextCanvasSettings = normalizeCanvasSettings(dashboard.canvasSettingsJson ?? dashboard.canvasSettings ?? canvasSettingsRef.current);
    const chartsById = new Map((chartItems ?? []).map((chart) => [chart.id, chart]));
    const nextWidgets = sanitizeWidgets((dashboard.widgets ?? dashboard.layout ?? []).map((widget) => {
      const chart = widget.chartId ? chartsById.get(widget.chartId) : null;
      return {
        ...widget,
        w: widget.width ?? widget.w,
        h: widget.height ?? widget.h,
        sourceChartId: widget.chartId ?? widget.sourceChartId,
        title: chart?.title ?? chart?.name ?? widget.title,
        config: widget.configJson ?? widget.config ?? {},
        chartConfigSnapshot: chart?.config ?? widget.chartConfigSnapshot,
      };
    }), nextCanvasSettings);
    dashboardRevisionRef.current = Number(dashboard.revision || 0);
    activeDashboardIdRef.current = dashboard.id;
    setActiveDashboardId(dashboard.id);
    setDashboards(dashboardItems ?? []);
    setDashboardName(dashboard.name || "Dashboard");
    setCanvasSettings(nextCanvasSettings);
    canvasSettingsRef.current = nextCanvasSettings;
    setWidgets(nextWidgets);
    widgetsRef.current = nextWidgets;
    setSavedCharts(chartItems ?? []);
    setSaveStatus("saved");
    setLastSavedAt(formatSavedTime(new Date(dashboard.updatedAt || Date.now())));
    if (message) setToast(message);
  }, [applyDashboardState, mockMode]);

  const switchDashboard = useCallback(async (dashboardId) => {
    if (!dashboardId || dashboardId === activeDashboardIdRef.current) return;
    await persistLayout();
    activeDashboardIdRef.current = dashboardId;
    if (mockMode) setStoredActiveDashboard(dashboardId);
    await loadActiveDashboardState("\u0e40\u0e1b\u0e25\u0e35\u0e48\u0e22\u0e19 Dashboard \u0e41\u0e25\u0e49\u0e27", dashboardId);
  }, [loadActiveDashboardState, mockMode, persistLayout]);

  const createNewDashboard = useCallback(async () => {
    await persistLayout();
    const dashboard = mockMode
      ? createStoredDashboard(activeProjectIdRef.current, "แดชบอร์ดใหม่")
      : await createDashboardApi({ projectId: activeProjectIdRef.current, name: "แดชบอร์ดใหม่" });
    activeDashboardIdRef.current = dashboard.id;
    if (mockMode) setStoredActiveDashboard(dashboard.id);
    await loadActiveDashboardState("\u0e2a\u0e23\u0e49\u0e32\u0e07 Dashboard \u0e43\u0e2b\u0e21\u0e48\u0e41\u0e25\u0e49\u0e27", dashboard.id);
  }, [loadActiveDashboardState, mockMode, persistLayout]);

  const renameCurrentDashboard = useCallback(async () => {
    setToast("เปิดหน้าต่างเปลี่ยนชื่อ Dashboard");
    const nextName = window.prompt("\u0e0a\u0e37\u0e48\u0e2d Dashboard", dashboardName);
    if (!nextName || !nextName.trim()) return;
    if (mockMode) {
      renameStoredDashboard(activeProjectIdRef.current, activeDashboardIdRef.current, nextName.trim());
      await loadActiveDashboardState("\u0e40\u0e1b\u0e25\u0e35\u0e48\u0e22\u0e19\u0e0a\u0e37\u0e48\u0e2d Dashboard \u0e41\u0e25\u0e49\u0e27");
      return;
    }
    const updated = await updateDashboardApi(activeDashboardIdRef.current, {
      revision: dashboardRevisionRef.current,
      name: nextName.trim(),
    });
    dashboardRevisionRef.current = Number(updated.revision);
    setDashboardName(updated.name);
    setDashboards((current) => current.map((item) => item.id === updated.id ? updated : item));
    setToast("\u0e40\u0e1b\u0e25\u0e35\u0e48\u0e22\u0e19\u0e0a\u0e37\u0e48\u0e2d Dashboard \u0e41\u0e25\u0e49\u0e27");
  }, [dashboardName, loadActiveDashboardState, mockMode]);

  const deleteCurrentDashboard = useCallback(async () => {
    if (dashboards.length <= 1) {
      setToast("\u0e15\u0e49\u0e2d\u0e07\u0e21\u0e35 Dashboard \u0e2d\u0e22\u0e48\u0e32\u0e07\u0e19\u0e49\u0e2d\u0e22 1 \u0e23\u0e32\u0e22\u0e01\u0e32\u0e23");
      return;
    }
    const confirmed = window.confirm(`\u0e25\u0e1a Dashboard "${dashboardName}" \u0e2b\u0e23\u0e37\u0e2d\u0e44\u0e21\u0e48`);
    if (!confirmed) return;
    if (mockMode) {
      deleteStoredDashboard(activeProjectIdRef.current, activeDashboardIdRef.current);
      await loadActiveDashboardState("\u0e25\u0e1a Dashboard \u0e41\u0e25\u0e49\u0e27");
      return;
    }
    await archiveDashboardApi(activeDashboardIdRef.current, dashboardRevisionRef.current);
    const remaining = dashboards.filter((item) => item.id !== activeDashboardIdRef.current);
    if (remaining[0]) {
      activeDashboardIdRef.current = remaining[0].id;
      await loadActiveDashboardState("\u0e25\u0e1a Dashboard \u0e41\u0e25\u0e49\u0e27", remaining[0].id);
    }
  }, [dashboardName, dashboards, loadActiveDashboardState, mockMode]);

  useEffect(() => {
    autosave.setSave(persistLayout);
  }, [autosave, persistLayout]);

  useEffect(() => autosave.subscribe((state) => {
    const nextStatus = state.status === "pending" ? "unsaved" : state.status;
    setSaveStatus(nextStatus);
    if (state.status === "saved" && state.lastSavedAt) {
      setLastSavedAt(formatSavedTime(new Date(state.lastSavedAt)));
    }
  }), [autosave]);

  useEffect(() => {
    if (!autosaveReadyRef.current) {
      autosaveReadyRef.current = true;
      return;
    }
    if (autosaveSuppressedRef.current) {
      autosaveSuppressedRef.current = false;
      return;
    }
    autosave.schedule(buildLayoutPayload());
  }, [autosave, buildLayoutPayload, canvasSettings, dashboardName, theme, widgets]);

  useEffect(() => {
    const onBeforeUnload = createBeforeUnloadHandler(() => shouldWarnAboutUnsavedChanges(saveStatusRef.current));
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(""), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => () => {
    void autosave.dispose().catch(() => {});
    sessionAssetUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    sessionAssetUrlsRef.current.clear();
    if (focusPulseTimerRef.current) {
      window.clearTimeout(focusPulseTimerRef.current);
    }
  }, [autosave]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      window.dispatchEvent(new Event("resize"));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeGridUnit, canvasSettings.zoom, previewMode, widgets]);

  const commitWidgets = useCallback((updater, message) => {
    const current = widgetsRef.current;
    const next = typeof updater === "function" ? updater(current) : updater;
    const sanitizedNext = sanitizeWidgets(next, canvasSettingsRef.current).map((widget) => ({
      ...widget,
      projectId: activeProjectIdRef.current,
      dashboardId: activeDashboardIdRef.current,
    }));
    setHistoryPast((past) => [...past.slice(-29), current]);
    setHistoryFuture([]);
    setWidgets(sanitizedNext);
    widgetsRef.current = sanitizedNext;
    setSaveStatus("unsaved");
    if (message) setToast(message);
  }, []);

  const updateWidget = useCallback((widgetId, patch) => {
    commitWidgets((current) =>
      current.map((widget) =>
        widget.id === widgetId
          ? sanitizeWidget(
              {
                ...widget,
                ...patch,
                updatedAt: new Date().toISOString(),
              },
              0,
              canvasSettingsRef.current
            )
          : widget
      )
    );
  }, [commitWidgets]);

  const updateWidgetConfig = useCallback((widgetId, patch) => {
    commitWidgets((current) =>
      current.map((widget) =>
        widget.id === widgetId
          ? {
              ...widget,
              config: {
                ...widget.config,
                ...patch,
              },
              updatedAt: new Date().toISOString(),
            }
          : widget
      )
    );
  }, [commitWidgets]);

  const addWidget = useCallback((type, overrides = {}) => {
    const placement = {
      y: typeof overrides.y === "number" ? overrides.y : nextWidgetY(widgetsRef.current),
      zIndex: typeof overrides.zIndex === "number" ? overrides.zIndex : nextWidgetZ(widgetsRef.current),
      projectId: activeProjectIdRef.current,
      dashboardId: activeDashboardIdRef.current,
      ...overrides,
    };
    const nextWidget = type === "table" ? createTableWidget(placement) : createWidget(type, placement);
    commitWidgets((current) => [...current, nextWidget], `เพิ่ม ${WIDGET_LABELS[type] ?? "วิดเจ็ต"} ลง Canvas แล้ว`);
    setSelectedWidgetId(nextWidget.id);
  }, [commitWidgets]);

  const addChart = useCallback((savedChart, message = "เพิ่มกราฟลงแดชบอร์ดแล้ว") => {
    const sourceChart = savedChart ?? createSavedChartFromConfig(buildSampleChartConfig(), { forceNew: true });
    const nextWidget = createChartWidget(sourceChart, {
      y: nextWidgetY(widgetsRef.current),
      zIndex: nextWidgetZ(widgetsRef.current),
      projectId: activeProjectIdRef.current,
      dashboardId: activeDashboardIdRef.current,
    });
    commitWidgets((current) => [...current, nextWidget], message);
    setSelectedWidgetId(nextWidget.id);
    window.requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
    setSavedCharts(readSavedCharts());
  }, [commitWidgets]);

  const arrangeAllWidgets = useCallback(() => {
    const currentWidgets = widgetsRef.current;
    if (!currentWidgets.length) {
      setToast("ยังไม่มีวิดเจ็ตให้จัดเรียง");
      return;
    }

    try {
      const result = autoArrangeWidgets(currentWidgets, {
        canvasSettings: canvasSettingsRef.current,
      });
      if (result.expandedCanvas) {
        canvasSettingsRef.current = result.canvasSettings;
        setCanvasSettings(result.canvasSettings);
      }
      commitWidgets(
        result.widgets,
        result.expandedCanvas
          ? "จัดเรียงวิดเจ็ตและขยายพื้นที่ Canvas แล้ว"
          : "จัดเรียงวิดเจ็ตบน Canvas แล้ว"
      );
      setWidgetMenuId(null);
      setWidgetContextMenu(null);
      setChartActionMenuId(null);
      requestDashboardResize();
    } catch {
      setToast("ไม่สามารถจัดเรียงวิดเจ็ตได้ในขณะนี้");
    }
  }, [commitWidgets]);

  const focusWidgetOnCanvas = useCallback((widgetId, message = "เลือกกราฟใน Canvas แล้ว") => {
    const targetWidget = widgetsRef.current.find((widget) => widget.id === widgetId);
    if (!targetWidget) return;
    setSelectedWidgetId(widgetId);
    setWidgetMenuId(null);
    setWidgetContextMenu(null);
    setFocusedWidgetId(widgetId);
    if (focusPulseTimerRef.current) {
      window.clearTimeout(focusPulseTimerRef.current);
    }
    focusPulseTimerRef.current = window.setTimeout(() => {
      setFocusedWidgetId((current) => (current === widgetId ? null : current));
    }, 650);
    setChartActionMenuId(null);
    window.requestAnimationFrame(() => {
      const widgetElement = Array.from(document.querySelectorAll("[data-widget-id]")).find(
        (element) => element.getAttribute("data-widget-id") === widgetId
      );
      widgetElement?.scrollIntoView?.({ block: "center", inline: "center", behavior: "smooth" });
      window.dispatchEvent(new Event("resize"));
    });
    if (message) setToast(message);
  }, []);

  const refreshChartWidgetFromSaved = useCallback((widgetId = selectedWidgetId) => {
    const targetWidget = widgetsRef.current.find((widget) => widget.id === widgetId && widget.type === "chart");
    if (!targetWidget) return;
    const sourceChartId = savedChartIdFromWidget(targetWidget);
    const savedChart = sourceChartId ? savedCharts.find((chart) => chart.id === sourceChartId) : null;
    if (!savedChart) {
      setToast("ไม่พบกราฟที่บันทึกไว้");
      return;
    }
    const nextConfig = normalizeChartConfig(savedChart.config);
    updateWidget(targetWidget.id, {
      title: savedChart.title,
      sourceChartId: savedChart.id,
      sourceChartConfigId: savedChart.id,
      chartConfigSnapshot: nextConfig,
      config: {
        ...targetWidget.config,
        sourceChartId: savedChart.id,
        title: savedChart.title,
        chartType: nextConfig.chartType,
        fieldMappings: nextConfig.mappings,
        settings: nextConfig.settings,
        filters: nextConfig.filters,
        dataset: {
          sourceType: nextConfig.sourceType,
          datasetId: nextConfig.datasetId,
        },
        chartConfig: nextConfig,
      },
    });
    setSelectedWidgetId(targetWidget.id);
    setWidgetMenuId(null);
    setWidgetContextMenu(null);
    setChartActionMenuId(null);
    setToast("อัปเดตจากกราฟที่บันทึกไว้แล้ว");
  }, [savedCharts, selectedWidgetId, updateWidget]);

  const refreshSelectedChartFromSaved = useCallback(() => {
    if (!selectedWidget || selectedWidget.type !== "chart") return;
    refreshChartWidgetFromSaved(selectedWidget.id);
  }, [refreshChartWidgetFromSaved, selectedWidget]);

  const ensureWidgetSavedChart = useCallback((widgetId = selectedWidgetId) => {
    const targetWidget = widgetsRef.current.find((widget) => widget.id === widgetId && widget.type === "chart");
    if (!targetWidget) return null;

    const sourceChartId = savedChartIdFromWidget(targetWidget);
    const existing = sourceChartId ? savedCharts.find((chart) => chart.id === sourceChartId) : null;
    if (existing) return existing;

    const snapshot = normalizeChartConfig(targetWidget.config?.chartConfig ?? buildSampleChartConfig({ title: targetWidget.title }));
    const record = createSavedChartFromConfig(snapshot, {
      forceNew: true,
      title: targetWidget.title || chartTitle(snapshot),
    });
    if (!record) {
      setToast("ไม่สามารถบันทึกเป็นกราฟใหม่ได้");
      return null;
    }

    const nextConfig = normalizeChartConfig(record.config);
    updateWidget(targetWidget.id, {
      title: record.title,
      sourceChartId: record.id,
      sourceChartConfigId: record.id,
      chartConfigSnapshot: nextConfig,
      config: {
        ...targetWidget.config,
        sourceChartId: record.id,
        title: record.title,
        chartType: nextConfig.chartType,
        fieldMappings: nextConfig.mappings,
        settings: nextConfig.settings,
        filters: nextConfig.filters,
        dataset: {
          sourceType: nextConfig.sourceType,
          datasetId: nextConfig.datasetId,
        },
        chartConfig: nextConfig,
      },
    });
    setSavedCharts(readSavedCharts());
    setToast("บันทึกเป็นกราฟใหม่แล้ว");
    return record;
  }, [savedCharts, selectedWidgetId, updateWidget]);

  const editChartWidget = useCallback((widgetId = selectedWidgetId) => {
    const record = ensureWidgetSavedChart(widgetId);
    if (!record) return;
    setWidgetMenuId(null);
    setWidgetContextMenu(null);
    setChartActionMenuId(null);
    persistLayout();
    preserveActiveContext();
    navigate(chartDesignerUrl({ chartId: record.id }));
  }, [chartDesignerUrl, ensureWidgetSavedChart, navigate, persistLayout, preserveActiveContext, selectedWidgetId]);

  const applyTemplate = useCallback((templateId, mode = "replace") => {
    const template = TEMPLATES.find((item) => item.id === templateId);
    if (templateId === "blank") {
      if (mode === "append") {
        setToast("Blank Canvas ไม่มีวิดเจ็ตให้เพิ่มต่อ");
        setTemplateModalOpen(false);
        setTemplateConfirm(null);
        return;
      }
      commitWidgets([], "เริ่ม Blank Canvas แล้ว");
      setSelectedWidgetId(null);
      setTemplateModalOpen(false);
      setTemplateConfirm(null);
      requestDashboardResize();
      setToast("ใช้เทมเพลต Dashboard แล้ว");
      return;
    }

    const primarySavedChart = savedCharts[0] ?? createSavedChartFromConfig(buildSampleChartConfig(), { forceNew: true });
    const templateWidgets = createTemplateWidgets(templateId, primarySavedChart, {
      projectId: activeProjectIdRef.current,
      dashboardId: activeDashboardIdRef.current,
    });

    if (mode === "append") {
      const currentWidgets = widgetsRef.current;
      const yOffset = nextWidgetY(currentWidgets);
      const zBase = currentWidgets.reduce((value, widget) => Math.max(value, finiteNumber(widget.zIndex, 1)), 1);
      const appendedWidgets = templateWidgets.map((widget, index) => ({
        ...widget,
        y: widget.y + yOffset,
        zIndex: zBase + index + 1,
        updatedAt: new Date().toISOString(),
      }));
      const nextWidgets = [...currentWidgets, ...appendedWidgets];
      commitWidgets(nextWidgets, `เพิ่มเทมเพลต Dashboard: ${template?.title ?? "Dashboard"}`);
      setSelectedWidgetId(appendedWidgets[0]?.id ?? null);
      setTemplateModalOpen(false);
      setTemplateConfirm(null);
      requestDashboardResize();
      setToast("ใช้เทมเพลต Dashboard แล้ว");
      return;
    }

    const arranged = autoArrangeWidgets(templateWidgets, {
      canvasSettings: canvasSettingsRef.current,
    });
    if (arranged.expandedCanvas) {
      canvasSettingsRef.current = arranged.canvasSettings;
      setCanvasSettings(arranged.canvasSettings);
    }
    const nextWidgets = arranged.widgets;
    setSavedCharts(readSavedCharts());
    commitWidgets(nextWidgets, `ใช้เทมเพลตและจัดเรียง: ${template?.title ?? "Dashboard"}`);
    setSelectedWidgetId(nextWidgets[0]?.id ?? null);
    setTemplateModalOpen(false);
    setTemplateConfirm(null);
    requestDashboardResize();
    setToast("ใช้เทมเพลต Dashboard แล้ว");
  }, [commitWidgets, savedCharts]);

  const duplicateWidget = useCallback((widgetId = selectedWidgetId) => {
    const source = widgetsRef.current.find((widget) => widget.id === widgetId);
    if (!source) return;
    const maxCols = Math.max(1, Math.floor(canvasSettingsRef.current.width / GRID_UNIT));
    const maxRows = Math.max(1, Math.floor(canvasSettingsRef.current.height / GRID_UNIT));
    const maxZ = widgetsRef.current.reduce((value, widget) => Math.max(value, finiteNumber(widget.zIndex, 1)), 1);
    const duplicate = {
      ...clone(source),
      id: makeId(source.type),
      title: `${source.title} สำเนา`,
      x: clamp(source.x + 3, 0, Math.max(0, maxCols - source.w)),
      y: clamp(source.y + 3, 0, Math.max(0, maxRows - source.h)),
      zIndex: maxZ + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    commitWidgets((current) => [...current, duplicate], "ทำสำเนาวิดเจ็ตแล้ว");
    setSelectedWidgetId(duplicate.id);
    setWidgetMenuId(null);
    setWidgetContextMenu(null);
    setChartActionMenuId(null);
    window.requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
  }, [commitWidgets, selectedWidgetId]);

  const deleteWidget = useCallback((widgetId = selectedWidgetId) => {
    if (!widgetId) return;
    commitWidgets((current) => current.filter((widget) => widget.id !== widgetId), "ลบวิดเจ็ตแล้ว");
    setSelectedWidgetId(null);
    setWidgetMenuId(null);
    setWidgetContextMenu(null);
    setChartActionMenuId(null);
  }, [commitWidgets, selectedWidgetId]);

  const alignSelected = useCallback((mode) => {
    if (!selectedWidget) return;
    const nextX = mode === "left" ? 0 : mode === "center" ? Math.floor((GRID_COLS - selectedWidget.w) / 2) : GRID_COLS - selectedWidget.w;
    updateWidget(selectedWidget.id, { x: Math.max(0, nextX) });
    setToast("จัดแนววิดเจ็ตแล้ว");
  }, [selectedWidget, updateWidget]);

  const changeZIndex = useCallback((direction, widgetId = selectedWidgetId) => {
    const targetWidget = widgetsRef.current.find((widget) => widget.id === widgetId);
    if (!targetWidget) return;
    const currentZ = finiteNumber(targetWidget.zIndex, 1);
    const currentWidgets = widgetsRef.current;
    const maxZ = currentWidgets.reduce((value, widget) => Math.max(value, finiteNumber(widget.zIndex, 1)), 1);
    const minZ = currentWidgets.reduce((value, widget) => Math.min(value, finiteNumber(widget.zIndex, 1)), currentZ);
    const topCount = currentWidgets.filter((widget) => finiteNumber(widget.zIndex, 1) === maxZ).length;
    const bottomCount = currentWidgets.filter((widget) => finiteNumber(widget.zIndex, 1) === minZ).length;
    if (direction > 0 && currentZ >= maxZ && topCount <= 1) {
      setToast("วิดเจ็ตอยู่ด้านหน้าสุดแล้ว");
      return;
    }
    if (direction < 0 && currentZ <= minZ && bottomCount <= 1) {
      setToast("วิดเจ็ตอยู่ด้านหลังสุดแล้ว");
      return;
    }
    if (direction > 0) {
      updateWidget(targetWidget.id, { zIndex: maxZ + 1 });
    } else {
      commitWidgets((current) =>
        current.map((widget) =>
          widget.id === targetWidget.id
            ? { ...widget, zIndex: 1, updatedAt: new Date().toISOString() }
            : { ...widget, zIndex: Math.min(998, finiteNumber(widget.zIndex, 1) + 1), updatedAt: new Date().toISOString() }
        )
      );
    }
    setSelectedWidgetId(targetWidget.id);
    setWidgetMenuId(null);
    setToast(direction > 0 ? "นำวิดเจ็ตขึ้นด้านหน้าแล้ว" : "ส่งวิดเจ็ตไปด้านหลังแล้ว");
  }, [commitWidgets, selectedWidgetId, updateWidget]);

  const expandWidgetToReadableSize = useCallback((widgetId) => {
    const widget = widgetsRef.current.find((item) => item.id === widgetId);
    if (!widget) return;
    const minSize = minWidgetSize(widget.type);
    updateWidget(widget.id, {
      w: Math.max(widget.w, minSize.w),
      h: Math.max(widget.h, minSize.h),
    });
    window.requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
    setToast("ขยายวิดเจ็ตเพื่อแสดงกราฟแล้ว");
  }, [updateWidget]);

  const handleLayoutChange = useCallback((nextLayout) => {
    if (previewMode) return;
    setWidgets((current) => {
      let changed = false;
      const nextWidgets = current.map((widget) => {
        const item = nextLayout.find((layoutItem) => layoutItem.i === widget.id);
        if (!item) return widget;
        const unitScale = activeGridUnit / GRID_UNIT;
        const nextX = roundLayoutValue(item.x * unitScale);
        const nextY = roundLayoutValue(item.y * unitScale);
        const nextW = Math.max(1, roundLayoutValue(item.w * unitScale));
        const nextH = Math.max(1, roundLayoutValue(item.h * unitScale));
        const sanitized = sanitizeWidget(
          {
            ...widget,
            x: nextX,
            y: nextY,
            w: nextW,
            h: nextH,
            updatedAt: new Date().toISOString(),
          },
          0,
          canvasSettingsRef.current
        );
        if (widget.x === sanitized.x && widget.y === sanitized.y && widget.w === sanitized.w && widget.h === sanitized.h) return widget;
        changed = true;
        return sanitized;
      });
      if (!changed) return current;
      widgetsRef.current = nextWidgets;
      setSaveStatus("unsaved");
      return nextWidgets;
    });
  }, [activeGridUnit, previewMode]);

  const undo = useCallback(() => {
    if (!historyPast.length) return;
    const previous = historyPast[historyPast.length - 1];
    setHistoryPast((past) => past.slice(0, -1));
    setHistoryFuture((future) => [widgetsRef.current, ...future]);
    setWidgets(previous);
    widgetsRef.current = previous;
    setSaveStatus("unsaved");
    setToast("ย้อนกลับแล้ว");
  }, [historyPast]);

  const redo = useCallback(() => {
    if (!historyFuture.length) return;
    const next = historyFuture[0];
    setHistoryFuture((future) => future.slice(1));
    setHistoryPast((past) => [...past, widgetsRef.current]);
    setWidgets(next);
    widgetsRef.current = next;
    setSaveStatus("unsaved");
    setToast("ทำซ้ำแล้ว");
  }, [historyFuture]);

  useEffect(() => {
    const onKeyDown = (event) => {
      const target = event.target;
      const isTyping = target instanceof HTMLElement && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
      if (isTyping) return;
      if (event.key === "Delete" || event.key === "Backspace") {
        deleteWidget();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d") {
        event.preventDefault();
        duplicateWidget();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deleteWidget, duplicateWidget]);

  const openElementsModal = useCallback((suggestedType = null) => {
    setSuggestedElementType(suggestedType);
    setElementsModalOpen(true);
  }, []);

  const addElementFromModal = useCallback((type) => {
    addWidget(type);
    setElementsModalOpen(false);
    setSuggestedElementType(null);
    setToast("เพิ่มองค์ประกอบลง Dashboard แล้ว");
  }, [addWidget]);

  const openTemplateModal = useCallback(() => {
    setTemplateConfirm(null);
    setTemplateModalOpen(true);
  }, []);

  const requestTemplateApply = useCallback((template) => {
    if (widgetsRef.current.length) {
      setTemplateModalOpen(false);
      setTemplateConfirm(template);
      return;
    }
    applyTemplate(template.id, "replace");
  }, [applyTemplate]);

  useEffect(() => {
    const hasModalOpen =
      elementsModalOpen ||
      templateModalOpen ||
      Boolean(templateConfirm) ||
      Boolean(contextDeleteWidget) ||
      Boolean(savedChartDeleteConfirm) ||
      shareOpen ||
      pdfModalOpen;
    if (!hasModalOpen) return undefined;

    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      setElementsModalOpen(false);
      setSuggestedElementType(null);
      setTemplateModalOpen(false);
      setTemplateConfirm(null);
      setContextDeleteWidget(null);
      setSavedChartDeleteConfirm(null);
      setShareOpen(false);
      setPdfModalOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [contextDeleteWidget, elementsModalOpen, pdfModalOpen, savedChartDeleteConfirm, shareOpen, templateConfirm, templateModalOpen]);

  const exportJson = useCallback(() => {
    downloadFile("dashboard-canvas-layout.json", JSON.stringify(buildLayoutPayload(), null, 2), "application/json;charset=utf-8");
    setToast("ส่งออก JSON แล้ว");
  }, [buildLayoutPayload]);

  const exportPng = useCallback(() => {
    const width = canvasSettings.width;
    const height = canvasSettings.height;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      setToast("ไม่สามารถส่งออก PNG ได้ในขณะนี้");
      return;
    }
    context.fillStyle = theme === "dark" ? "#0F172A" : "#FFFFFF";
    context.fillRect(0, 0, width, height);
    widgets.forEach((widget) => {
      const x = widget.x * GRID_UNIT;
      const y = widget.y * GRID_UNIT;
      const w = widget.w * GRID_UNIT;
      const h = widget.h * GRID_UNIT;
      context.fillStyle = widget.background || "#FFFFFF";
      context.strokeStyle = widget.borderColor || "#E6EAF0";
      context.lineWidth = 1;
      context.fillRect(x, y, w, h);
      context.strokeRect(x, y, w, h);
      context.fillStyle = "#172033";
      context.font = "500 18px IBM Plex Sans Thai, system-ui, sans-serif";
      context.fillText(widget.title || WIDGET_LABELS[widget.type] || "Widget", x + 16, y + 28);
      context.fillStyle = "#64748B";
      context.font = "400 13px IBM Plex Sans Thai, system-ui, sans-serif";
      context.fillText(WIDGET_LABELS[widget.type] || widget.type, x + 16, y + 50);
    });
    const link = document.createElement("a");
    link.download = "dashboard-canvas-preview.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
    setToast("ส่งออก PNG แล้ว");
  }, [canvasSettings.height, canvasSettings.width, theme, widgets]);

  const saveDashboard = useCallback(() => {
    void runExplicitDashboardSave({
      autosave,
      payload: buildLayoutPayload(),
      onSuccess: () => setToast("บันทึก Dashboard แล้ว"),
      onError: () => setToast("\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01 Dashboard \u0e44\u0e21\u0e48\u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08 \u0e01\u0e23\u0e38\u0e13\u0e32\u0e25\u0e2d\u0e07\u0e43\u0e2b\u0e21\u0e48"),
    });
  }, [autosave, buildLayoutPayload]);

  const shareLink = useMemo(() => {
    if (typeof window === "undefined" || !serverShare.dashboardId || !serverShare.token) return "";
    return `${window.location.origin}/dashboard/${encodeURIComponent(serverShare.dashboardId)}/view?share=${encodeURIComponent(serverShare.token)}`;
  }, [serverShare.dashboardId, serverShare.token]);

  const embedCode = useMemo(
    () => {
      if (!shareLink) return "";
      const embedUrl = shareLink.replace("/view?", "/embed?") + "&header=0";
      return `<iframe src="${embedUrl}" title="Mini BI Dashboard" width="100%" height="640" style="border:0" loading="lazy" allowfullscreen></iframe>`;
    },
    [shareLink]
  );

  const openServerShare = useCallback(async () => {
    if (!activeDashboardId) return;
    setServerShare({ status: "creating", token: "", dashboardId: "", error: "" });
    try {
      await autosave.flush(buildLayoutPayload());
      const share = await createPersistentDashboardShare(activeDashboardId);
      if (!share?.token) throw new Error("Share API returned no token");
      setServerShare({ status: "ready", token: share.token, dashboardId: activeDashboardId, error: "" });
      setShareOpen(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create server share";
      setServerShare({ status: "error", token: "", dashboardId: "", error: message });
      setShareOpen(true);
      setToast("ไม่สามารถสร้างลิงก์แชร์จากเซิร์ฟเวอร์ได้");
    }
  }, [activeDashboardId, autosave, buildLayoutPayload]);

  const copyShareLink = useCallback(async () => {
    const copied = await copyText(shareLink);
    setToast(copied ? "คัดลอกลิงก์แชร์แล้ว" : "คัดลอกอัตโนมัติไม่ได้ กรุณาคัดลอกลิงก์ด้วยตนเอง");
  }, [shareLink]);

  const copyEmbed = useCallback(async () => {
    const copied = await copyText(embedCode);
    setToast(copied ? "คัดลอก Embed code แล้ว" : "คัดลอกอัตโนมัติไม่ได้ กรุณาคัดลอกโค้ดด้วยตนเอง");
  }, [embedCode]);

  const updateSelectedChartTitle = useCallback((value) => {
    if (!selectedWidget || selectedWidget.type !== "chart") return;
    const chartConfig = selectedChartConfig ?? normalizeChartConfig(selectedWidget.config.chartConfig);
    const nextConfig = {
      ...chartConfig,
      updatedAt: new Date().toISOString(),
      settings: {
        ...chartConfig.settings,
        general: {
          ...chartConfig.settings.general,
          title: value,
        },
      },
    };
    updateWidget(selectedWidget.id, {
      title: value,
      chartConfigSnapshot: nextConfig,
      config: {
        ...selectedWidget.config,
        chartConfig: nextConfig,
        title: value,
        chartType: nextConfig.chartType,
        fieldMappings: nextConfig.mappings,
        settings: nextConfig.settings,
        filters: nextConfig.filters,
      },
    });
  }, [selectedChartConfig, selectedWidget, updateWidget]);

  const updateSelectedChartLegend = useCallback((checked) => {
    if (!selectedWidget || selectedWidget.type !== "chart") return;
    const chartConfig = selectedChartConfig ?? normalizeChartConfig(selectedWidget.config.chartConfig);
    const nextConfig = {
      ...chartConfig,
      updatedAt: new Date().toISOString(),
      settings: {
        ...chartConfig.settings,
        legend: {
          ...chartConfig.settings.legend,
          showLegend: checked,
        },
      },
    };
    updateWidget(selectedWidget.id, {
      chartConfigSnapshot: nextConfig,
      config: {
        ...selectedWidget.config,
        chartConfig: nextConfig,
        chartType: nextConfig.chartType,
        fieldMappings: nextConfig.mappings,
        settings: nextConfig.settings,
        filters: nextConfig.filters,
      },
    });
  }, [selectedChartConfig, selectedWidget, updateWidget]);

  const updateSelectedChartAxis = useCallback((axis, checked) => {
    if (!selectedWidget || selectedWidget.type !== "chart") return;
    const chartConfig = selectedChartConfig ?? normalizeChartConfig(selectedWidget.config.chartConfig);
    const axisKey = axis === "x" ? "showXAxis" : "showYAxis";
    const nextConfig = {
      ...chartConfig,
      updatedAt: new Date().toISOString(),
      settings: {
        ...chartConfig.settings,
        axis: {
          ...chartConfig.settings.axis,
          [axisKey]: checked,
        },
      },
    };
    updateWidget(selectedWidget.id, {
      chartConfigSnapshot: nextConfig,
      config: {
        ...selectedWidget.config,
        chartConfig: nextConfig,
        chartType: nextConfig.chartType,
        fieldMappings: nextConfig.mappings,
        settings: nextConfig.settings,
        filters: nextConfig.filters,
      },
    });
  }, [selectedChartConfig, selectedWidget, updateWidget]);

  const exportSelectedWidget = useCallback((widgetId = selectedWidgetId) => {
    const widget = widgetsRef.current.find((item) => item.id === widgetId);
    if (!widget) {
      setToast("กรุณาเลือกวิดเจ็ตก่อนส่งออก");
      return;
    }

    const filename = `mini-bi-widget-${widget.type}-${timestampForFilename()}.png`;
    const widgetElement = Array.from(document.querySelectorAll("[data-widget-id]")).find(
      (element) => element.getAttribute("data-widget-id") === widget.id
    );

    if (widget.type === "chart") {
      const chartCanvas = widgetElement?.querySelector("canvas");
      if (chartCanvas instanceof HTMLCanvasElement && chartCanvas.width > 0 && chartCanvas.height > 0) {
        try {
          downloadDataUrl(filename, chartCanvas.toDataURL("image/png"));
          setToast("ส่งออกวิดเจ็ตแล้ว");
          setWidgetMenuId(null);
          setWidgetContextMenu(null);
          setChartActionMenuId(null);
          return;
        } catch {
          setToast("ไม่สามารถส่งออก PNG ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง");
          return;
        }
      }
    }

    const dataUrl = drawWidgetFallbackPng(widget);
    if (!dataUrl) {
      setToast("ไม่สามารถส่งออก PNG ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง");
      return;
    }
    downloadDataUrl(filename, dataUrl);
    setWidgetMenuId(null);
    setChartActionMenuId(null);
    setToast("ส่งออกวิดเจ็ตแล้ว");
  }, [selectedWidgetId]);

  const getChartItemWidget = useCallback((item) => (
    item?.widgets?.find((widget) => widget.id === selectedWidgetId) ?? item?.firstWidget ?? item?.widgets?.[0] ?? null
  ), [selectedWidgetId]);

  const selectChartListItem = useCallback((item) => {
    const targetWidget = getChartItemWidget(item);
    if (!targetWidget) {
      setToast("กราฟนี้ยังไม่ได้เพิ่มลง Dashboard");
      return;
    }
    focusWidgetOnCanvas(targetWidget.id, "เลือกกราฟบน Canvas แล้ว");
  }, [focusWidgetOnCanvas, getChartItemWidget]);

  const addChartListItem = useCallback((item) => {
    if (!item?.savedChart) {
      setToast("ไม่พบกราฟต้นฉบับสำหรับเพิ่มลง Dashboard");
      return;
    }
    addChart(item.savedChart, "เพิ่มกราฟลง Dashboard แล้ว");
  }, [addChart]);

  const addAnotherChartListItem = useCallback((item) => {
    if (!item?.savedChart) {
      setToast("ไม่พบกราฟต้นฉบับสำหรับเพิ่มอีกชุด");
      return;
    }
    addChart(item.savedChart, "เพิ่มกราฟอีกชุดลง Dashboard แล้ว");
  }, [addChart]);

  const editChartListItem = useCallback((item) => {
    if (item?.savedChart?.id) {
      persistLayout();
      preserveActiveContext();
      navigate(chartDesignerUrl({ chartId: item.savedChart.id }));
      return;
    }

    const targetWidget = getChartItemWidget(item);
    if (targetWidget) {
      editChartWidget(targetWidget.id);
      return;
    }

    setToast("ไม่พบกราฟสำหรับแก้ไข");
  }, [chartDesignerUrl, editChartWidget, getChartItemWidget, navigate, persistLayout, preserveActiveContext]);

  const refreshChartListItemFromSaved = useCallback((item) => {
    const targetWidget = getChartItemWidget(item);
    if (!targetWidget) {
      setToast("กราฟนี้ยังไม่ได้อยู่บน Dashboard");
      return;
    }
    refreshChartWidgetFromSaved(targetWidget.id);
  }, [getChartItemWidget, refreshChartWidgetFromSaved]);

  const exportChartListWidget = useCallback((item) => {
    const targetWidget = getChartItemWidget(item);
    if (!targetWidget) {
      setToast("กราฟนี้ยังไม่ได้อยู่บน Dashboard");
      return;
    }
    exportSelectedWidget(targetWidget.id);
  }, [exportSelectedWidget, getChartItemWidget]);

  const removeChartListItemFromDashboard = useCallback((item) => {
    const targetWidget = getChartItemWidget(item);
    if (!targetWidget) {
      setToast("กราฟนี้ยังไม่ได้อยู่บน Dashboard");
      return;
    }
    setContextDeleteWidget(targetWidget);
  }, [getChartItemWidget]);

  const saveChartListSnapshotAsNew = useCallback((item) => {
    const targetWidget = getChartItemWidget(item);
    if (!targetWidget) {
      setToast("ไม่พบ snapshot สำหรับบันทึกเป็นกราฟใหม่");
      return;
    }
    ensureWidgetSavedChart(targetWidget.id);
    setSavedCharts(readSavedCharts());
  }, [ensureWidgetSavedChart, getChartItemWidget]);

  const duplicateSavedChartFromList = useCallback((chart) => {
    if (!chart?.config) {
      setToast("ไม่พบกราฟต้นฉบับสำหรับทำสำเนา");
      return;
    }
    createSavedChartFromConfig(normalizeChartConfig(chart.config), {
      forceNew: true,
      title: `${chart.title || "กราฟ"} สำเนา`,
      chartType: chart.chartType,
      source: chart.source || "dashboard-v2",
      dataContract: chart.dataContract,
    });
    setSavedCharts(readSavedCharts());
    setToast("ทำสำเนากราฟแล้ว");
  }, []);

  const exportSavedChartFromList = useCallback((chart) => {
    if (!chart) {
      setToast("ไม่พบกราฟสำหรับส่งออก");
      return;
    }
    downloadFile(
      `mini-bi-chart-${chart.id || "saved"}-${timestampForFilename()}.json`,
      JSON.stringify({
        id: chart.id,
        title: chart.title,
        chartType: chart.chartType,
        config: normalizeChartConfig(chart.config),
        exportedAt: new Date().toISOString(),
      }, null, 2),
      "application/json;charset=utf-8"
    );
    setToast("ส่งออกกราฟแล้ว");
  }, []);

  const requestDeleteSavedChartFromList = useCallback((item) => {
    if (!item?.savedChart) {
      setToast("ไม่พบกราฟที่บันทึกไว้สำหรับลบ");
      return;
    }
    setSavedChartDeleteConfirm({
      chart: item.savedChart,
      usageCount: item.usageCount || 0,
    });
  }, []);

  const confirmDeleteSavedChartFromList = useCallback(() => {
    if (!savedChartDeleteConfirm?.chart?.id) return;
    deleteSavedChart(savedChartDeleteConfirm.chart.id);
    setSavedCharts(readSavedCharts());
    setSavedChartDeleteConfirm(null);
    setChartActionMenuId(null);
    setToast("ลบกราฟที่บันทึกไว้แล้ว");
  }, [savedChartDeleteConfirm]);

  const openWidgetContextMenu = useCallback((event, widget) => {
    if (previewMode) return;
    event.preventDefault();
    event.stopPropagation();
    setSelectedWidgetId(widget.id);
    setWidgetMenuId(null);
    setWidgetContextMenu(null);
    setChartActionMenuId(null);
    setDashboardActionMenuOpen(false);
    setWidgetContextMenu({
      widgetId: widget.id,
      ...clampContextMenuPosition(event.clientX, event.clientY),
    });
  }, [previewMode]);

  const runWidgetContextAction = useCallback((action) => {
    setWidgetContextMenu(null);
    action();
  }, []);

  const editWidgetFromContext = useCallback((widgetId) => {
    const widget = widgetsRef.current.find((item) => item.id === widgetId);
    if (!widget) return;
    setSelectedWidgetId(widget.id);
    setRightPanelOpen(true);

    if (widget.type === "chart") {
      const sourceChartId = savedChartIdFromWidget(widget);
      if (sourceChartId) {
        persistLayout();
        preserveActiveContext();
        navigate(chartDesignerUrl({ chartId: sourceChartId }));
        return;
      }
    }

    setToast("เลือกวิดเจ็ตเพื่อแก้ไขแล้ว");
  }, [chartDesignerUrl, navigate, persistLayout, preserveActiveContext]);

  const copyWidgetFromContext = useCallback((widgetId) => {
    duplicateWidget(widgetId);
    setToast("คัดลอกวิดเจ็ตแล้ว");
  }, [duplicateWidget]);

  const confirmDeleteWidgetFromContext = useCallback(() => {
    if (!contextDeleteWidget) return;
    deleteWidget(contextDeleteWidget.id);
    setContextDeleteWidget(null);
  }, [contextDeleteWidget, deleteWidget]);

  useEffect(() => {
    const onRibbonCommand = (event) => {
      const detail = event.detail;
      if (detail?.scope !== "dashboard") return;

      if (detail.command === "add-chart") {
        openChartDesignerForCreate();
        return;
      }
      if (detail.command === "add-kpi") {
        openElementsModal("kpi");
        return;
      }
      if (detail.command === "add-table") {
        openElementsModal("table");
        return;
      }
      if (detail.command === "add-text") {
        openElementsModal("text");
        return;
      }
      if (detail.command === "add-image") {
        openElementsModal("image");
        return;
      }
      if (detail.command === "add-filter") {
        openElementsModal("filter");
        return;
      }
      if (detail.command === "templates") {
        openTemplateModal();
        return;
      }
      if (detail.command === "auto-arrange") {
        arrangeAllWidgets();
        return;
      }
      if (detail.command === "save") {
        // Let navigation paint first. The callback remains valid after this
        // component unmounts, while avoiding a synchronous layout snapshot in
        // the route-click event.
        queueMicrotask(saveDashboard);
        return;
      }
      if (detail.command === "preview") {
        setPreviewMode(true);
        return;
      }
      if (detail.command === "share") {
        void openServerShare();
        return;
      }
      if (detail.command === "export") {
        exportJson();
      }
    };

    window.addEventListener("mini-bi:ribbon-command", onRibbonCommand);
    return () => {
      window.removeEventListener("mini-bi:ribbon-command", onRibbonCommand);
    };
  }, [arrangeAllWidgets, exportJson, openChartDesignerForCreate, openElementsModal, openServerShare, openTemplateModal, saveDashboard]);

  const handleImageUpload = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file || !selectedWidget) return;
    const asset = createSessionImageAsset(file);
    sessionAssetUrlsRef.current.add(asset.src);
    updateWidgetConfig(selectedWidget.id, {
      src: asset.src,
      fileName: file.name,
      asset: asset.metadata,
    });
    event.target.value = "";
    setToast("เพิ่มรูปภาพแล้ว");
  }, [selectedWidget, updateWidgetConfig]);

  const canvasScale = canvasSettings.zoom / 100;
  const canvasHeightRows = Math.floor(canvasSettings.height / activeGridUnit);
  const showLegacyChartSections = false;
  const statusText = saveStatus === "saving"
    ? "กำลังบันทึก"
    : saveStatus === "unsaved"
      ? "รอบันทึกอัตโนมัติ"
      : saveStatus === "error"
        ? "บันทึกไม่สำเร็จ"
        : "บันทึกแล้ว";
  const contextMenuWidget = widgetContextMenu
    ? widgets.find((widget) => widget.id === widgetContextMenu.widgetId)
    : null;
  const contextMenuSourceChartId = savedChartIdFromWidget(contextMenuWidget);
  const contextMenuSavedChart = contextMenuSourceChartId
    ? savedCharts.find((chart) => chart.id === contextMenuSourceChartId)
    : null;

  return (
    <div className={`dashboard-canvas-builder ${previewMode ? "is-preview" : ""}`} data-theme={theme}>
      <header className="dcb-header">
        <div className="dcb-brand">
          <button type="button" className="dcb-logo" onClick={() => navigate("/home")} aria-label="กลับหน้าแรก">MB</button>
          <div>
            <span className="dcb-breadcrumb">Mini BI / ตัวจัดวางแดชบอร์ด</span>
            <div className="dcb-project-context">
              <span>โปรเจกต์</span>
              <strong>{activeProjectName}</strong>
            </div>
            <input
              className="dcb-dashboard-name"
              value={dashboardName}
              onChange={(event) => setDashboardName(event.target.value)}
              aria-label="ชื่อแดชบอร์ด"
            />
            <div className="dcb-dashboard-switcher" aria-label="เลือก Dashboard">
              <span>แดชบอร์ด</span>
              <select value={activeDashboardId} onChange={(event) => switchDashboard(event.target.value)}>
                {dashboards.map((dashboard) => (
                  <option key={dashboard.id} value={dashboard.id}>
                    {dashboard.name || dashboard.dashboardName || "แดชบอร์ด"}
                  </option>
                ))}
              </select>
              <button type="button" onClick={createNewDashboard}>สร้าง Dashboard</button>
              <button type="button" onClick={renameCurrentDashboard}>เปลี่ยนชื่อ Dashboard</button>
              <button
                type="button"
                onClick={deleteCurrentDashboard}
                disabled={dashboards.length <= 1}
                title={dashboards.length <= 1 ? "\u0e15\u0e49\u0e2d\u0e07\u0e21\u0e35 Dashboard \u0e2d\u0e22\u0e48\u0e32\u0e07\u0e19\u0e49\u0e2d\u0e22 1 \u0e23\u0e32\u0e22\u0e01\u0e32\u0e23" : "\u0e25\u0e1a Dashboard \u0e1b\u0e31\u0e08\u0e08\u0e38\u0e1a\u0e31\u0e19"}
              >
                ลบ Dashboard
              </button>
            </div>
          </div>
          <div className="dcb-page-nav" aria-label="นำทางหน้า">
            <button type="button" className="dcb-btn dcb-nav-btn" onClick={navigation.goBack} disabled={!navigation.canGoBack} title={navigation.canGoBack ? "ย้อนกลับ" : "อยู่ที่หน้าหลักแล้ว"} aria-label="ย้อนกลับ">←</button>
            <button type="button" className="dcb-btn dcb-nav-btn" onClick={navigation.goForward} disabled={!navigation.canGoForward} title={navigation.canGoForward ? "ไปข้างหน้า" : "ไม่มีหน้าถัดไป"} aria-label="ไปข้างหน้า">→</button>
          </div>
        </div>
        <div className="dcb-header-actions">
          <span className={`dcb-save-indicator ${saveStatus}`} role="status" aria-live="polite">{statusText} {lastSavedAt}</span>
          {saveStatus === "error" ? (
            <button type="button" className="dcb-btn" onClick={saveDashboard}>ลองบันทึกอีกครั้ง</button>
          ) : null}
          <button type="button" className="dcb-btn" onClick={() => navigate("/home")} title="กลับหน้าหลัก">หน้าหลัก</button>
          <button type="button" className="dcb-btn" onClick={openChartDesignerForCreate}>เปิดตัวสร้างกราฟ</button>
          <button type="button" className="dcb-btn" onClick={openServerShare}>แชร์</button>
          <button type="button" className="dcb-btn dcb-btn-primary" onClick={saveDashboard}>บันทึก</button>
        </div>
      </header>

      {previewMode ? (
        <div className="dcb-preview-bar">
          <span>โหมดนำเสนอ</span>
          <select
            value={canvasSettings.zoom}
            onChange={(event) => setCanvasSettings((current) => ({ ...current, zoom: Number(event.target.value) }))}
          >
            {ZOOM_OPTIONS.map((zoom) => (
              <option key={zoom} value={zoom}>{zoom}%</option>
            ))}
          </select>
          <button type="button" className="dcb-btn" onClick={exportPng}>PNG</button>
          <button type="button" className="dcb-btn" onClick={openServerShare}>แชร์</button>
          <button type="button" className="dcb-btn dcb-btn-primary" onClick={() => setPreviewMode(false)}>ออกจากโหมดนำเสนอ</button>
        </div>
      ) : (
        <nav className="dcb-toolbar" aria-label="เครื่องมือตัวจัดวางแดชบอร์ด">
          <div className="dcb-toolbar-group">
            <button type="button" className="dcb-tool-primary" onClick={openChartDesignerForCreate}>+ เพิ่มกราฟ</button>
            <button type="button" className="dcb-tool" onClick={() => openElementsModal("kpi")}>KPI</button>
            <button type="button" className="dcb-tool" onClick={() => openElementsModal("table")}>ตาราง</button>
            <button type="button" className="dcb-tool" onClick={() => openElementsModal("text")}>ข้อความ</button>
            <button type="button" className="dcb-tool" onClick={() => openElementsModal("image")}>รูปภาพ</button>
            <button type="button" className="dcb-tool" onClick={openTemplateModal}>เทมเพลต</button>
          </div>
          <div className="dcb-toolbar-group">
            <button type="button" className="dcb-tool" onClick={undo} disabled={!historyPast.length} title={historyPast.length ? "ย้อนกลับการเปลี่ยนแปลงล่าสุด" : "ยังไม่มีประวัติให้ย้อนกลับ"}>ย้อนกลับ</button>
            <button type="button" className="dcb-tool" onClick={redo} disabled={!historyFuture.length} title={historyFuture.length ? "ทำซ้ำการเปลี่ยนแปลงล่าสุด" : "ยังไม่มีประวัติให้ทำซ้ำ"}>ทำซ้ำ</button>
          </div>
          <div className="dcb-toolbar-group">
            <button type="button" className="dcb-tool" onClick={() => alignSelected("left")} disabled={!selectedWidget} title={selectedWidget ? "จัดวิดเจ็ตชิดซ้าย" : "เลือกวิดเจ็ตก่อนจัดตำแหน่ง"}>ซ้าย</button>
            <button type="button" className="dcb-tool" onClick={() => alignSelected("center")} disabled={!selectedWidget} title={selectedWidget ? "จัดวิดเจ็ตกึ่งกลาง" : "เลือกวิดเจ็ตก่อนจัดตำแหน่ง"}>กลาง</button>
            <button type="button" className="dcb-tool" onClick={() => alignSelected("right")} disabled={!selectedWidget} title={selectedWidget ? "จัดวิดเจ็ตชิดขวา" : "เลือกวิดเจ็ตก่อนจัดตำแหน่ง"}>ขวา</button>
          </div>
          <div className="dcb-toolbar-group">
            <button
              type="button"
              className={`dcb-tool ${canvasSettings.showGrid ? "is-active" : ""}`}
              onClick={() => setCanvasSettings((current) => ({ ...current, showGrid: !current.showGrid }))}
            >
              Grid
            </button>
            <button
              type="button"
              className={`dcb-tool ${canvasSettings.snapToGrid ? "is-active" : ""}`}
              onClick={() => setCanvasSettings((current) => ({ ...current, snapToGrid: !current.snapToGrid }))}
            >
              Snap
            </button>
            <select
              className="dcb-tool-select"
              value={canvasSettings.zoom}
              onChange={(event) => setCanvasSettings((current) => ({ ...current, zoom: Number(event.target.value) }))}
              aria-label="ซูม Canvas"
            >
              {ZOOM_OPTIONS.map((zoom) => (
                <option key={zoom} value={zoom}>{zoom}%</option>
              ))}
            </select>
          </div>
          <div className="dcb-toolbar-group dcb-toolbar-end">
            <button
              type="button"
              className="dcb-tool dcb-tool-arrange"
              onClick={arrangeAllWidgets}
              disabled={!widgets.length}
              title={widgets.length ? "จัดเรียงวิดเจ็ตบน Canvas อัตโนมัติ" : "ยังไม่มีวิดเจ็ตให้จัดเรียง"}
            >
              <span aria-hidden="true">▦</span>
              จัดเรียง
            </button>
            <button type="button" className="dcb-tool" onClick={() => setPreviewMode(true)}>ดูตัวอย่าง</button>
            <button type="button" className="dcb-tool" onClick={exportPng}>PNG</button>
            <button type="button" className="dcb-tool" onClick={exportJson}>JSON</button>
            <button type="button" className="dcb-tool" onClick={() => setPdfModalOpen(true)}>PDF</button>
          </div>
        </nav>
      )}

        <section className={`dcb-main ${leftPanelOpen ? "" : "is-left-collapsed"} ${rightPanelOpen ? "" : "is-right-collapsed"}`} aria-label="พื้นที่ออกแบบแดชบอร์ด">
          {!previewMode ? (
            <aside className={`dcb-panel dcb-left-panel ${leftPanelOpen ? "" : "is-collapsed"}`} aria-hidden={!leftPanelOpen}>
              <div className="dcb-panel-header">
                <strong>แดชบอร์ด</strong>
                <span>จัดการแดชบอร์ดและวิดเจ็ตที่เชื่อมอยู่</span>
              </div>
              <div className="dcb-dashboard-switcher dcb-dashboard-switcher-panel" aria-label="เลือก Dashboard">
                <div className="dcb-dashboard-switcher-title">แดชบอร์ด</div>
                <div className="dcb-dashboard-control-row">
                  <select className="dcb-dashboard-select" value={activeDashboardId} onChange={(event) => switchDashboard(event.target.value)}>
                    {dashboards.map((dashboard) => (
                      <option key={dashboard.id} value={dashboard.id}>
                        {dashboard.name || dashboard.dashboardName || "แดชบอร์ด"}
                      </option>
                    ))}
                  </select>
                  <div className="dcb-dashboard-actions">
                    <button type="button" className="dcb-dashboard-action dcb-dashboard-action-primary" onClick={createNewDashboard}>สร้าง</button>
                    <div className="dcb-dashboard-more-wrap">
                      <button
                        type="button"
                        className="dcb-dashboard-more"
                        onClick={() => setDashboardActionMenuOpen((current) => !current)}
                        aria-haspopup="menu"
                        aria-expanded={dashboardActionMenuOpen}
                        title="จัดการ Dashboard เพิ่มเติม"
                      >
                        ...
                      </button>
                      {dashboardActionMenuOpen ? (
                        <div className="dcb-dashboard-menu" role="menu" aria-label="เมนู Dashboard">
                          <button type="button" role="menuitem" onClick={() => runDashboardAction(renameCurrentDashboard)}>
                            เปลี่ยนชื่อ Dashboard
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            className="danger"
                            onClick={() => runDashboardAction(deleteCurrentDashboard)}
                            disabled={dashboards.length <= 1}
                            title={dashboards.length <= 1 ? "ต้องมี Dashboard อย่างน้อย 1 รายการ" : "ลบ Dashboard ปัจจุบัน"}
                          >
                            ลบ Dashboard
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            <div className="dcb-library-scroll">
                <div className="dcb-chart-library dcb-chart-library-unified">
                  <section className="dcb-chart-section dcb-chart-section-unified">
                    <div className="dcb-section-heading dcb-unified-chart-heading">
                      <div>
                        <strong>คลังกราฟ <em>{unifiedChartItems.length}</em></strong>
                        <span>คลิกชื่อกราฟเพื่อเลือก · กด “เพิ่ม” เพื่อวางบน Canvas</span>
                      </div>
                      <button type="button" className="dcb-library-create" onClick={openChartDesignerForCreate}>
                        <span aria-hidden="true">+</span> สร้างกราฟ
                      </button>
                    </div>
                    <div className="dcb-chart-filter-chips" role="group" aria-label="กรองรายการกราฟ">
                      {CHART_LIST_FILTERS.map((filter) => (
                        <button
                          key={filter.id}
                          type="button"
                          className={chartListFilter === filter.id ? "is-active" : ""}
                          onClick={() => setChartListFilter(filter.id)}
                          aria-pressed={chartListFilter === filter.id}
                        >
                          <span>{filter.label}</span>
                          <strong>{chartListCounts[filter.id] ?? 0}</strong>
                        </button>
                      ))}
                    </div>
                    {filteredUnifiedChartItems.length ? (
                      <div className="dcb-added-chart-list dcb-unified-chart-list">
                        {filteredUnifiedChartItems.map((item) => {
                          const isSelected = item.widgets.some((widget) => widget.id === selectedWidgetId);
                          const itemTime = formatChartListTime(item.updatedAt);
                          const isAvailable = item.status === "available";
                          const isDetached = item.status === "missing" || item.status === "snapshot";
                          const badgeClass = `dcb-chart-status-badge is-${item.status}`;
                          return (
                            <article
                              key={item.id}
                              className={`dcb-added-chart-item dcb-unified-chart-item ${isSelected ? "is-selected" : ""}`}
                            >
                              <div className="dcb-added-chart-top-row">
                                <button
                                  type="button"
                                  className="dcb-added-chart-main"
                                  onClick={() => (item.hasDashboardWidget ? selectChartListItem(item) : addChartListItem(item))}
                                  title={item.hasDashboardWidget ? "เลือกกราฟบน Canvas" : "เพิ่มกราฟลง Dashboard"}
                                >
                                  <span className="dcb-item-icon">{chartIcon(item.chartType)}</span>
                                  <span className="dcb-added-chart-copy">
                                    <strong title={item.title}>{item.title}</strong>
                                    <span title={`${chartTypeLabel(item.chartType)} · ${itemTime}`}>
                                      {chartTypeLabel(item.chartType)} · {itemTime}
                                    </span>
                                  </span>
                                </button>
                                <span className={badgeClass} title={item.badge}>{item.badge}</span>
                              </div>
                              <p className="dcb-added-chart-description" title={item.description}>
                                {item.description}
                              </p>
                              <div className={`dcb-added-chart-actions ${isAvailable ? "is-available" : ""}`}>
                                {isAvailable ? (
                                  <button
                                    type="button"
                                    className="dcb-added-chart-primary"
                                    onClick={() => addChartListItem(item)}
                                  >
                                    เพิ่ม
                                  </button>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      className="dcb-added-chart-primary"
                                      onClick={() => selectChartListItem(item)}
                                    >
                                      ดูบน Canvas
                                    </button>
                                    <button
                                      type="button"
                                      className="dcb-added-chart-secondary"
                                      onClick={() => (item.usageCount > 1 && item.savedChart ? addAnotherChartListItem(item) : editChartListItem(item))}
                                    >
                                      {item.usageCount > 1 && item.savedChart ? "เพิ่มอีก" : "แก้ไข"}
                                    </button>
                                  </>
                                )}
                                <div className="dcb-added-chart-more-wrap">
                                  <button
                                    type="button"
                                    className="dcb-added-chart-more"
                                    onClick={() => setChartActionMenuId((current) => (current === item.id ? null : item.id))}
                                    aria-haspopup="menu"
                                    aria-expanded={chartActionMenuId === item.id}
                                    title="จัดการเพิ่มเติม"
                                  >
                                    ...
                                  </button>
                                  {chartActionMenuId === item.id ? (
                                    <div className="dcb-added-chart-menu" role="menu" aria-label={`เมนู ${item.title}`}>
                                      {isAvailable ? (
                                        <>
                                          <button type="button" role="menuitem" data-icon="+" onClick={() => runChartCardAction(() => addChartListItem(item))}>เพิ่มลง Dashboard</button>
                                          <button type="button" role="menuitem" data-icon="✎" onClick={() => runChartCardAction(() => editChartListItem(item))}>แก้ไขกราฟ</button>
                                          <button type="button" role="menuitem" data-icon="⧉" onClick={() => runChartCardAction(() => duplicateSavedChartFromList(item.savedChart))}>ทำสำเนากราฟ</button>
                                          <button type="button" role="menuitem" data-icon="⇩" onClick={() => runChartCardAction(() => exportSavedChartFromList(item.savedChart))}>ส่งออกกราฟ</button>
                                          <span className="dcb-added-chart-menu-divider" role="separator" aria-hidden="true" />
                                          <button type="button" role="menuitem" data-icon="×" className="danger" onClick={() => runChartCardAction(() => requestDeleteSavedChartFromList(item))}>ลบกราฟที่บันทึกไว้</button>
                                        </>
                                      ) : isDetached ? (
                                        <>
                                          <button type="button" role="menuitem" data-icon="◎" onClick={() => runChartCardAction(() => selectChartListItem(item))}>เลือกบน Canvas</button>
                                          <button type="button" role="menuitem" data-icon="+" onClick={() => runChartCardAction(() => saveChartListSnapshotAsNew(item))}>บันทึกเป็นกราฟใหม่</button>
                                          <button type="button" role="menuitem" data-icon="⇩" onClick={() => runChartCardAction(() => exportChartListWidget(item))}>ส่งออกวิดเจ็ต</button>
                                          <span className="dcb-added-chart-menu-divider" role="separator" aria-hidden="true" />
                                          <button type="button" role="menuitem" data-icon="×" className="danger" onClick={() => runChartCardAction(() => removeChartListItemFromDashboard(item))}>ลบออกจาก Dashboard</button>
                                        </>
                                      ) : (
                                        <>
                                          <button type="button" role="menuitem" data-icon="◎" onClick={() => runChartCardAction(() => selectChartListItem(item))}>เลือกบน Canvas</button>
                                          <button type="button" role="menuitem" data-icon="+" onClick={() => runChartCardAction(() => addAnotherChartListItem(item))}>เพิ่มอีก</button>
                                          <button type="button" role="menuitem" data-icon="✎" onClick={() => runChartCardAction(() => editChartListItem(item))}>แก้ไขกราฟ</button>
                                          <button type="button" role="menuitem" data-icon="↻" onClick={() => runChartCardAction(() => refreshChartListItemFromSaved(item))}>อัปเดตจากกราฟที่บันทึกไว้</button>
                                          <button type="button" role="menuitem" data-icon="⇩" onClick={() => runChartCardAction(() => exportChartListWidget(item))}>ส่งออกวิดเจ็ต</button>
                                          <span className="dcb-added-chart-menu-divider" role="separator" aria-hidden="true" />
                                          <button type="button" role="menuitem" data-icon="×" className="danger" onClick={() => runChartCardAction(() => removeChartListItemFromDashboard(item))}>ลบออกจาก Dashboard</button>
                                          <button type="button" role="menuitem" data-icon="×" className="danger" onClick={() => runChartCardAction(() => requestDeleteSavedChartFromList(item))}>ลบกราฟที่บันทึกไว้</button>
                                        </>
                                      )}
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="dcb-added-chart-empty dcb-unified-chart-empty">
                        {unifiedChartItems.length ? (
                          <>
                            <strong>ไม่พบกราฟในตัวกรองนี้</strong>
                            <span>ลองเปลี่ยนตัวกรองเป็นทั้งหมดเพื่อดูกราฟที่มีอยู่</span>
                            <div>
                              <button type="button" className="dcb-btn" onClick={() => setChartListFilter("all")}>ดูทั้งหมด</button>
                            </div>
                          </>
                        ) : (
                          <>
                            <strong>ยังไม่มีกราฟ</strong>
                            <span>สร้างกราฟใหม่ หรือใช้เทมเพลตเพื่อเริ่มต้น Dashboard</span>
                            <div>
                              <button type="button" className="dcb-btn dcb-btn-primary" onClick={openChartDesignerForCreate}>สร้างกราฟ</button>
                              <button type="button" className="dcb-btn" onClick={openTemplateModal}>ใช้เทมเพลต</button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </section>
                  {showLegacyChartSections ? (
                    <>
                  <section className="dcb-chart-section">
                      <div className="dcb-section-heading">
                        <div>
                          <strong>กราฟใน Dashboard นี้ ({dashboardChartItems.length})</strong>
                          <span>กดเพื่อเลือกและจัดการบน Canvas</span>
                        </div>
                      </div>
                    {dashboardChartItems.length ? (
                      <div className="dcb-added-chart-list">
                        {dashboardChartItems.map(({ widget, savedChart, sourceChartId, title, chartType, updatedAt }) => (
                            <article
                              key={widget.id}
                              className={`dcb-added-chart-item ${selectedWidgetId === widget.id ? "is-selected" : ""}`}
                            >
                              <button
                                type="button"
                                className="dcb-added-chart-main"
                                onClick={() => focusWidgetOnCanvas(widget.id)}
                                title="เลือกวางบน Canvas"
                              >
                                <span className="dcb-item-icon">{chartIcon(chartType)}</span>
                                <span className="dcb-added-chart-copy">
                                  <strong title={title}>{title}</strong>
                                  <span title={`${chartTypeLabel(chartType)} · ${formatSavedTime(new Date(updatedAt))}`}>
                                    {chartTypeLabel(chartType)} · {formatSavedTime(new Date(updatedAt))}
                                  </span>
                                </span>
                              </button>
                              <p
                                className="dcb-added-chart-description"
                                title={savedChart?.title ? `จาก ${savedChart.title}` : sourceChartId ? "จากกราฟที่บันทึกไว้เดิม" : "snapshot"}
                              >
                                {savedChart?.title
                                  ? `จาก ${savedChart.title}`
                                  : sourceChartId
                                    ? "จากกราฟที่บันทึกไว้เดิม"
                                    : "snapshot"}
                              </p>
                              <div className="dcb-added-chart-actions">
                                <button
                                  type="button"
                                  className="dcb-added-chart-primary"
                                  onClick={() => focusWidgetOnCanvas(widget.id)}
                                  title="เลือกวางบน Canvas"
                                >
                                  เลือก
                                </button>
                                <button
                                  type="button"
                                  className="dcb-added-chart-secondary"
                                  onClick={() => editChartWidget(widget.id)}
                                  title="แก้ไขกราฟ"
                                >
                                  แก้ไข
                                </button>
                                <div className="dcb-added-chart-more-wrap">
                                  <button
                                    type="button"
                                    className="dcb-added-chart-more"
                                    onClick={() => setChartActionMenuId((current) => (current === widget.id ? null : widget.id))}
                                    aria-haspopup="menu"
                                    aria-expanded={chartActionMenuId === widget.id}
                                    title="จัดการเพิ่มเติม"
                                  >
                                    ...
                                  </button>
                                  {chartActionMenuId === widget.id ? (
                                    <div className="dcb-added-chart-menu" role="menu" aria-label={`เมนู ${title}`}>
                                      <button type="button" role="menuitem" data-icon="⧉" onClick={() => runChartCardAction(() => duplicateWidget(widget.id))}>ทำสำเนา</button>
                                      <button
                                        type="button"
                                        role="menuitem"
                                        data-icon="↻"
                                        onClick={() => runChartCardAction(() => refreshChartWidgetFromSaved(widget.id))}
                                        disabled={!sourceChartId || !savedChart}
                                        title={savedChart ? "อัปเดตจากกราฟที่บันทึกไว้" : "ไม่พบกราฟที่บันทึกไว้"}
                                      >
                                        อัปเดตจากกราฟที่บันทึกไว้
                                      </button>
                                      <button type="button" role="menuitem" data-icon="⇩" onClick={() => runChartCardAction(() => exportSelectedWidget(widget.id))}>ส่งออกวิดเจ็ต</button>
                                      <span className="dcb-added-chart-menu-divider" role="separator" aria-hidden="true" />
                                      <button type="button" role="menuitem" data-icon="×" className="danger" onClick={() => runChartCardAction(() => deleteWidget(widget.id))}>ลบ</button>
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            </article>
                        ))}
                      </div>
                    ) : (
                      <div className="dcb-added-chart-empty">
                        <strong>ยังไม่มีกราฟใน Dashboard</strong>
                        <span>เพิ่มกราฟจากคลัง หรือสร้างกราฟใหม่</span>
                        <div>
                          <button type="button" className="dcb-btn dcb-btn-primary" onClick={openChartDesignerForCreate}>เพิ่มกราฟ</button>
                        </div>
                      </div>
                    )}
                  </section>

                    <section className="dcb-chart-section">
                      <div className="dcb-section-heading">
                        <div>
                          <strong>กราฟที่บันทึกไว้</strong>
                          <span>กราฟ reusable จากตัวสร้างกราฟ</span>
                        </div>
                      </div>
                    <div className="dcb-library-list">
                      {savedCharts.length ? (
                        savedCharts.map((chart) => {
                          const usageCount = savedChartUsageCounts.get(chart.id) ?? 0;
                          return (
                              <article key={chart.id} className="dcb-library-item dcb-library-item-saved">
                                <div className="dcb-item-icon">{chartIcon(chart.chartType)}</div>
                                <div className="dcb-item-body">
                                  <strong title={chart.title}>{chart.title}</strong>
                                  <span title={`${chartTypeLabel(chart.chartType)} • ${formatSavedTime(new Date(chart.updatedAt))}`}>
                                    {chartTypeLabel(chart.chartType)} • {formatSavedTime(new Date(chart.updatedAt))}
                                  </span>
                                  {usageCount ? (
                                    <small className="dcb-usage-badge">{usageCount === 1 ? "ใช้แล้ว" : `ใช้แล้ว ${usageCount} ครั้ง`}</small>
                                  ) : null}
                                </div>
                                <button type="button" className="dcb-library-add" onClick={() => addChart(chart)}>เพิ่ม</button>
                              </article>
                          );
                        })
                      ) : (
                        <div className="dcb-library-empty">
                          <strong>ยังไม่มีกราฟที่บันทึกไว้</strong>
                          <span>บันทึกกราฟจากตัวสร้างกราฟ หรือใช้กราฟตัวอย่างเพื่อจัดวางแดชบอร์ด</span>
                          <button type="button" className="dcb-btn dcb-btn-primary" onClick={openChartDesignerForCreate}>เปิดตัวสร้างกราฟ</button>
                          <button type="button" className="dcb-btn" onClick={() => addChart(null)}>ใช้กราฟตัวอย่าง</button>
                        </div>
                      )}
                    </div>
                  </section>
                    </>
                  ) : null}
                </div>
            </div>
          </aside>
        ) : null}

        <section className="dcb-canvas-region">
          <div className="dcb-canvas-toolbar">
            <div>
              <h1>{dashboardName}</h1>
              <span>{canvasSettings.width} × {canvasSettings.height}px · {widgets.length} วิดเจ็ต</span>
            </div>
            <div className="dcb-canvas-actions">
              {!previewMode ? (
                <>
                  <button
                    type="button"
                    className={`dcb-panel-toggle ${leftPanelOpen ? "" : "is-active"}`}
                    onClick={() => setLeftPanelOpen((open) => !open)}
                    title={leftPanelOpen ? "ซ่อนแถบวิดเจ็ต" : "แสดงแถบวิดเจ็ต"}
                    aria-label={leftPanelOpen ? "ซ่อนแถบวิดเจ็ต" : "แสดงแถบวิดเจ็ต"}
                    aria-pressed={!leftPanelOpen}
                  >
                    <span aria-hidden="true">◧</span>
                  </button>
                  <button
                    type="button"
                    className={`dcb-panel-toggle dcb-panel-toggle-right ${rightPanelOpen ? "" : "is-active"}`}
                    onClick={() => setRightPanelOpen((open) => !open)}
                    title={rightPanelOpen ? "ซ่อนแถบคุณสมบัติ" : "แสดงแถบคุณสมบัติ"}
                    aria-label={rightPanelOpen ? "ซ่อนแถบคุณสมบัติ" : "แสดงแถบคุณสมบัติ"}
                    aria-pressed={!rightPanelOpen}
                  >
                    <span aria-hidden="true">◨</span>
                  </button>
                  <span className="dcb-canvas-actions-divider" aria-hidden="true" />
                  <button type="button" onClick={undo} disabled={!historyPast.length} title={historyPast.length ? "ย้อนกลับการเปลี่ยนแปลงล่าสุด" : "ยังไม่มีประวัติให้ย้อนกลับ"} aria-label="ย้อนกลับ">↶</button>
                  <button type="button" onClick={redo} disabled={!historyFuture.length} title={historyFuture.length ? "ทำซ้ำการเปลี่ยนแปลงล่าสุด" : "ยังไม่มีประวัติให้ทำซ้ำ"} aria-label="ทำซ้ำ">↷</button>
                  <span className="dcb-canvas-actions-divider" aria-hidden="true" />
                  <button
                    type="button"
                    className={canvasSettings.showGrid ? "is-active" : ""}
                    onClick={() => setCanvasSettings((current) => ({ ...current, showGrid: !current.showGrid }))}
                  >
                    Grid
                  </button>
                  <button
                    type="button"
                    className={canvasSettings.snapToGrid ? "is-active" : ""}
                    onClick={() => setCanvasSettings((current) => ({ ...current, snapToGrid: !current.snapToGrid }))}
                  >
                    Snap
                  </button>
                  <span className="dcb-canvas-actions-divider" aria-hidden="true" />
                </>
              ) : null}
              <button
                type="button"
                onClick={() => setCanvasSettings((current) => ({ ...current, zoom: Math.max(25, current.zoom - 25) }))}
              >
                -
              </button>
              <span>{canvasSettings.zoom}%</span>
              <button
                type="button"
                onClick={() => setCanvasSettings((current) => ({ ...current, zoom: Math.min(125, current.zoom + 25) }))}
              >
                +
              </button>
              <button
                type="button"
                onClick={() => setCanvasSettings((current) => ({ ...current, zoom: 75 }))}
                disabled={canvasSettings.zoom === 75}
                title={canvasSettings.zoom === 75 ? "Canvas อยู่ที่ขนาด Fit แล้ว" : "ปรับขนาด Canvas ให้พอดี"}
              >
                Fit
              </button>
            </div>
          </div>
          <div
            className="dcb-workspace"
            onMouseDown={() => {
              setSelectedWidgetId(null);
              setWidgetMenuId(null);
              setWidgetContextMenu(null);
            }}
          >
            <div
              className="dcb-canvas-scale-wrap"
              style={{
                width: canvasSettings.width * canvasScale,
                height: canvasSettings.height * canvasScale,
              }}
            >
              <div
                ref={canvasRef}
                className={`dcb-canvas-surface ${canvasSettings.showGrid && !previewMode ? "show-grid" : ""}`}
                style={{
                  width: canvasSettings.width,
                  height: canvasSettings.height,
                  transform: `scale(${canvasScale})`,
                }}
                onMouseDown={(event) => event.stopPropagation()}
              >
                {!widgets.length ? (
                  <div className="dcb-canvas-empty">
                    <strong>เริ่มสร้าง Dashboard</strong>
                    <span>เพิ่มกราฟ วิดเจ็ต หรือเลือกเทมเพลตเพื่อจัดวางข้อมูลบน Canvas</span>
                    <div>
                      <button type="button" className="dcb-btn dcb-btn-primary" onClick={openChartDesignerForCreate}>เพิ่มกราฟ</button>
                      <button type="button" className="dcb-btn" onClick={openTemplateModal}>เลือกเทมเพลต</button>
                      <button type="button" className="dcb-btn" onClick={openChartDesignerForCreate}>เปิดตัวสร้างกราฟ</button>
                    </div>
                  </div>
                ) : null}
                <GridLayout
                  className="dcb-grid-layout"
                  layout={layout}
                  cols={activeGridCols}
                  rowHeight={activeGridUnit}
                  maxRows={canvasHeightRows}
                  margin={[0, 0]}
                  containerPadding={[0, 0]}
                  compactType={null}
                  preventCollision={false}
                  allowOverlap
                  isDraggable={!previewMode}
                  isResizable={!previewMode}
                  transformScale={canvasScale}
                  draggableHandle=".dcb-widget-handle"
                  resizeHandles={previewMode ? [] : ["se", "e", "s"]}
                  onLayoutChange={handleLayoutChange}
                >
                  {widgets.map((widget) => (
                    <div
                      key={widget.id}
                      className={`dcb-grid-item ${selectedWidgetId === widget.id ? "is-selected" : ""} ${focusedWidgetId === widget.id ? "is-focus-pulse" : ""}`}
                      style={{ zIndex: finiteNumber(widget.zIndex, 1) }}
                      onMouseDownCapture={() => setSelectedWidgetId(widget.id)}
                      onMouseDown={(event) => {
                        event.stopPropagation();
                        setSelectedWidgetId(widget.id);
                      }}
                      onContextMenu={(event) => openWidgetContextMenu(event, widget)}
                    >
                      <section
                        className={`dcb-widget dcb-widget-${widget.type}${widget.type === "chart" && (widget.w < 40 || widget.h < 26) ? " is-compact-size" : ""}`}
                        data-testid={`dashboard-widget-${widget.id}`}
                        data-widget-id={widget.id}
                        style={{
                          background: widget.background,
                          borderColor: widget.borderColor,
                          borderRadius: widget.radius,
                          zIndex: widget.zIndex,
                        }}
                      >
                        {!previewMode && widget.config?.showHeader !== false ? (
                          <div className="dcb-widget-handle">
                            <span>{chartWidgetDisplayTitle(widget, savedCharts)}</span>
                            <div onMouseDown={(event) => event.stopPropagation()}>
                              <button type="button" onClick={() => duplicateWidget(widget.id)} aria-label="ทำสำเนา">⧉</button>
                              <button
                                type="button"
                                onClick={() => {
                                  setWidgetContextMenu(null);
                                  setWidgetMenuId((current) => (current === widget.id ? null : widget.id));
                                }}
                                aria-label="เมนูวิดเจ็ต"
                                aria-expanded={widgetMenuId === widget.id}
                              >
                                ⋯
                              </button>
                              <button type="button" className="is-danger" onClick={() => deleteWidget(widget.id)} aria-label="ลบ">×</button>
                            </div>
                          </div>
                        ) : null}
                        <WidgetContent
                          widget={widget}
                          canvasZoom={canvasSettings.zoom}
                          rows={rows}
                          savedCharts={savedCharts}
                          workspaceSnapshot={workspaceSnapshot}
                          selected={selectedWidgetId === widget.id}
                          editingTextId={editingTextId}
                          setEditingTextId={setEditingTextId}
                          updateWidgetConfig={updateWidgetConfig}
                          onExpandWidget={expandWidgetToReadableSize}
                        />
                      </section>
                      {!previewMode && widgetMenuId === widget.id ? (
                        <div className="dcb-widget-menu" onMouseDown={(event) => event.stopPropagation()}>
                          {widget.type === "chart" ? (
                            <>
                              <button type="button" onClick={() => editChartWidget(widget.id)}>แก้ไขกราฟ</button>
                              <button
                                type="button"
                                onClick={() => refreshChartWidgetFromSaved(widget.id)}
                                disabled={!savedChartIdFromWidget(widget)}
                                title={savedChartIdFromWidget(widget) ? "อัปเดตจากต้นฉบับ" : "ยังไม่มีกราฟต้นฉบับ"}
                              >
                                อัปเดตจากต้นฉบับ
                              </button>
                            </>
                          ) : null}
                          <button type="button" onClick={() => duplicateWidget(widget.id)}>ทำสำเนา</button>
                          <button type="button" onClick={() => exportSelectedWidget(widget.id)}>ส่งออก PNG</button>
                          <button type="button" onClick={() => changeZIndex(1, widget.id)}>ขึ้นหน้า</button>
                          <button type="button" onClick={() => changeZIndex(-1, widget.id)}>ลงหลัง</button>
                          <button type="button" className="danger" onClick={() => deleteWidget(widget.id)}>ลบ</button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </GridLayout>
              </div>
            </div>
          </div>
        </section>

        {!previewMode ? (
          <aside className={`dcb-panel dcb-right-panel ${rightPanelOpen ? "" : "is-collapsed"}`} aria-hidden={!rightPanelOpen}>
            <div className="dcb-panel-header">
              <strong>คุณสมบัติ</strong>
              <span>{selectedWidget ? `${WIDGET_LABELS[selectedWidget.type]} · ${selectedWidget.title}` : "ตั้งค่าแดชบอร์ดและ Canvas"}</span>
            </div>
            <div className="dcb-properties-scroll">
              {!selectedWidget ? (
                <div className="dcb-property-section">
                  <h3>แดชบอร์ด</h3>
                  <label>
                    ชื่อแดชบอร์ด
                    <input value={dashboardName} onChange={(event) => setDashboardName(event.target.value)} />
                  </label>
                  <label>
                    Theme
                    <select value={theme} onChange={(event) => setTheme(event.target.value)}>
                      <option value="light">Light</option>
                      <option value="dark">Executive Dark</option>
                    </select>
                  </label>
                  <h3>Canvas</h3>
                  <div className="dcb-property-grid">
                    <label>
                      Width
                      <input
                        type="number"
                        value={canvasSettings.width}
                        onChange={(event) => setCanvasSettings((current) => ({ ...current, width: Number(event.target.value) }))}
                      />
                    </label>
                    <label>
                      Height
                      <input
                        type="number"
                        value={canvasSettings.height}
                        onChange={(event) => setCanvasSettings((current) => ({ ...current, height: Number(event.target.value) }))}
                      />
                    </label>
                  </div>
                  <label className="dcb-check-row">
                    <input
                      type="checkbox"
                      checked={canvasSettings.showGrid}
                      onChange={(event) => setCanvasSettings((current) => ({ ...current, showGrid: event.target.checked }))}
                    />
                    แสดง Grid
                  </label>
                  <label className="dcb-check-row">
                    <input
                      type="checkbox"
                      checked={canvasSettings.snapToGrid}
                      onChange={(event) => setCanvasSettings((current) => ({ ...current, snapToGrid: event.target.checked }))}
                    />
                    Snap to grid
                  </label>
                  <h3>ส่งออก</h3>
                  <div className="dcb-property-actions">
                    <button type="button" onClick={exportJson}>Export JSON</button>
                    <button type="button" onClick={exportPng}>Export PNG</button>
                    <button type="button" onClick={() => setPdfModalOpen(true)}>Export PDF</button>
                  </div>
                </div>
              ) : (
                <div className="dcb-property-section">
                  {selectedWidget.type === "chart" && selectedChartConfig ? (
                    <>
                      <h3>กราฟ</h3>
                      <label className="dcb-check-row">
                        <input
                          type="checkbox"
                          checked={selectedWidget.config?.showHeader !== false}
                          onChange={(event) => updateWidgetConfig(selectedWidget.id, { showHeader: event.target.checked })}
                        />
                        แสดงแถบหัว Widget
                      </label>
                      <label>
                        ชื่อกราฟ
                        <input
                          value={selectedChartConfig.settings.general.title}
                          onChange={(event) => updateSelectedChartTitle(event.target.value)}
                        />
                      </label>
                      <label>
                        ประเภทกราฟ
                        <input value={chartTypeLabel(selectedChartConfig.chartType)} readOnly />
                      </label>
                      <label className="dcb-check-row">
                        <input
                          type="checkbox"
                          checked={selectedChartConfig.settings.legend.showLegend}
                          onChange={(event) => updateSelectedChartLegend(event.target.checked)}
                        />
                        แสดง Legend
                      </label>
                      <label className="dcb-check-row">
                        <input
                          type="checkbox"
                          checked={selectedChartConfig.settings.axis.showXAxis}
                          onChange={(event) => updateSelectedChartAxis("x", event.target.checked)}
                        />
                        แสดงแกน X
                      </label>
                      <label className="dcb-check-row">
                        <input
                          type="checkbox"
                          checked={selectedChartConfig.settings.axis.showYAxis}
                          onChange={(event) => updateSelectedChartAxis("y", event.target.checked)}
                        />
                        แสดงแกน Y
                      </label>
                      {selectedSavedChart ? (
                        <div className="dcb-chart-sync">
                          <span>
                            ต้นฉบับ: {selectedSavedChart.title}
                            <small>อัปเดตล่าสุด {formatSavedTime(new Date(selectedSavedChart.updatedAt))}</small>
                          </span>
                          <button type="button" onClick={() => editChartWidget(selectedWidget.id)}>
                            แก้ไขกราฟ
                          </button>
                          <button type="button" onClick={refreshSelectedChartFromSaved} disabled={!selectedChartCanRefresh}>
                            อัปเดตจากกราฟที่บันทึกไว้
                          </button>
                        </div>
                      ) : (
                        <div className="dcb-chart-sync">
                          <span>
                            ต้นฉบับ: ใช้ snapshot
                            <small>ไม่พบกราฟต้นฉบับในคลัง กราฟนี้จะใช้ config ที่บันทึกอยู่ใน layout</small>
                          </span>
                          <button type="button" onClick={() => editChartWidget(selectedWidget.id)}>
                            แก้ไขจาก snapshot
                          </button>
                          <button type="button" onClick={() => ensureWidgetSavedChart(selectedWidget.id)}>
                            บันทึกเป็นกราฟใหม่
                          </button>
                        </div>
                      )}
                    </>
                  ) : null}
                  {selectedWidget.type === "text" ? (
                    <>
                      <h3>ข้อความ</h3>
                      <label>
                        ข้อความ
                        <textarea value={selectedWidget.config.text} onChange={(event) => updateWidgetConfig(selectedWidget.id, { text: event.target.value })} />
                      </label>
                      <label>
                        Font size
                        <input type="range" min="12" max="48" value={selectedWidget.config.fontSize} onChange={(event) => updateWidgetConfig(selectedWidget.id, { fontSize: Number(event.target.value) })} />
                      </label>
                    </>
                  ) : null}
                  {selectedWidget.type === "image" ? (
                    <>
                      <h3>รูปภาพ</h3>
                      <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleImageUpload} />
                      <button type="button" className="dcb-wide-btn" onClick={() => fileInputRef.current?.click()}>เลือกไฟล์รูปภาพ</button>
                      {selectedWidget.config.fileName ? <small>ไฟล์: {selectedWidget.config.fileName}</small> : null}
                      {selectedWidget.config.asset?.durability === "session-only" ? (
                        <small className="dcb-session-asset-note">รูปภาพนี้ใช้ได้เฉพาะเซสชันปัจจุบัน และจะต้องเลือกใหม่หลังรีเฟรช</small>
                      ) : null}
                    </>
                  ) : null}
                  <h3>การทำงาน</h3>
                  <div className="dcb-property-actions is-widget-actions">
                    <button type="button" onClick={() => duplicateWidget(selectedWidget.id)}>ทำสำเนา</button>
                    <button
                      type="button"
                      onClick={() => changeZIndex(1, selectedWidget.id)}
                      disabled={selectedLayerState.isTop}
                      title={selectedLayerState.isTop ? "วิดเจ็ตอยู่ด้านหน้าสุดแล้ว" : "นำวิดเจ็ตขึ้นด้านหน้า"}
                    >
                      ขึ้นหน้า
                    </button>
                    <button
                      type="button"
                      onClick={() => changeZIndex(-1, selectedWidget.id)}
                      disabled={selectedLayerState.isBottom}
                      title={selectedLayerState.isBottom ? "วิดเจ็ตอยู่ด้านหลังสุดแล้ว" : "ส่งวิดเจ็ตลงด้านหลัง"}
                    >
                      ลงหลัง
                    </button>
                    <button type="button" onClick={() => exportSelectedWidget(selectedWidget.id)}>ส่งออกวิดเจ็ต</button>
                    <button type="button" className="danger" onClick={() => deleteWidget(selectedWidget.id)}>ลบ</button>
                  </div>
                </div>
              )}
            </div>
          </aside>
        ) : null}
      </section>

      <footer className="dcb-statusbar">
        <span>วิดเจ็ต: {widgets.length}</span>
        <span>กราฟ: {dashboardChartItems.length}</span>
        <span>ซูม: {canvasSettings.zoom}%</span>
        <span>Grid: {canvasSettings.showGrid ? "On" : "Off"}</span>
        <span>Snap: {canvasSettings.snapToGrid ? "On" : "Off"}</span>
        <span>{statusText}</span>
      </footer>

      {elementsModalOpen ? (
        <div className="dcb-modal-backdrop" role="presentation" onMouseDown={() => setElementsModalOpen(false)}>
          <section className="dcb-modal dcb-elements-modal" role="dialog" aria-modal="true" aria-labelledby="elements-modal-title" onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <div>
                <h2 id="elements-modal-title">เพิ่มองค์ประกอบ</h2>
                <p>เลือกวิดเจ็ตที่ต้องการเพิ่มลงใน Dashboard</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setElementsModalOpen(false);
                  setSuggestedElementType(null);
                }}
                aria-label="ปิด"
              >
                ×
              </button>
            </header>
            <div className="dcb-elements-grid">
              {ELEMENTS.map((element) => (
                <button
                  key={element.type}
                  type="button"
                  className={`dcb-element-option ${suggestedElementType === element.type ? "is-suggested" : ""}`}
                  onClick={() => addElementFromModal(element.type)}
                >
                  <span className="dcb-element-icon" aria-hidden="true">{ELEMENT_ICONS[element.type] ?? "□"}</span>
                  <span className="dcb-element-copy">
                    <strong>{WIDGET_LABELS[element.type] ?? element.title}</strong>
                    <small>{element.description}</small>
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {templateModalOpen ? (
        <div className="dcb-modal-backdrop" role="presentation" onMouseDown={() => setTemplateModalOpen(false)}>
          <section className="dcb-modal dcb-template-modal" role="dialog" aria-modal="true" aria-labelledby="template-modal-title" onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <div>
                <h2 id="template-modal-title">เลือกเทมเพลต Dashboard</h2>
                <p>เริ่มต้นจาก layout สำเร็จรูป แล้วปรับแต่งต่อได้</p>
              </div>
              <button type="button" onClick={() => setTemplateModalOpen(false)} aria-label="ปิด">×</button>
            </header>
            <div className="dcb-template-grid">
              {DASHBOARD_TEMPLATE_OPTIONS.map((template) => (
                <article key={template.id} className={`dcb-template-option ${template.blank ? "is-blank" : ""}`}>
                  <div className="dcb-template-preview" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </div>
                  <div className="dcb-template-copy">
                    <strong>{template.title}</strong>
                    <span>{template.description}</span>
                    <small>{template.widgetCount ? `${template.widgetCount} widgets` : "พื้นที่ว่าง"}</small>
                  </div>
                  <button type="button" className="dcb-template-apply" onClick={() => requestTemplateApply(template)}>
                    ใช้เทมเพลต
                  </button>
                </article>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {templateConfirm ? (
        <div className="dcb-modal-backdrop" role="presentation" onMouseDown={() => setTemplateConfirm(null)}>
          <section className="dcb-modal dcb-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="template-confirm-title" onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <div>
                <h2 id="template-confirm-title">ใช้เทมเพลตนี้กับ Dashboard ปัจจุบัน?</h2>
                <p>Canvas มีวิดเจ็ตอยู่แล้ว เลือกวิธีนำเทมเพลตไปใช้</p>
              </div>
              <button type="button" onClick={() => setTemplateConfirm(null)} aria-label="ปิด">×</button>
            </header>
            <div className="dcb-confirm-summary">
              <strong>{templateConfirm.title}</strong>
              <span>{templateConfirm.description}</span>
            </div>
            <div className="dcb-modal-actions">
              <button type="button" className="dcb-btn" onClick={() => setTemplateConfirm(null)}>ยกเลิก</button>
              <button
                type="button"
                className="dcb-btn"
                onClick={() => applyTemplate(templateConfirm.id, "append")}
                disabled={templateConfirm.blank}
                title={templateConfirm.blank ? "Blank Canvas ไม่มีวิดเจ็ตให้เพิ่มต่อ" : "เพิ่มเทมเพลตต่อจากวิดเจ็ตเดิม"}
              >
                เพิ่มต่อจากของเดิม
              </button>
              <button type="button" className="dcb-btn dcb-btn-primary" onClick={() => applyTemplate(templateConfirm.id, "replace")}>
                แทนที่ Dashboard ปัจจุบัน
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {contextDeleteWidget ? (
        <div className="dcb-modal-backdrop" role="presentation" onMouseDown={() => setContextDeleteWidget(null)}>
          <section className="dcb-modal dcb-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="widget-delete-confirm-title" onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <div>
                <h2 id="widget-delete-confirm-title">ลบวิดเจ็ต</h2>
                <p>ต้องการลบวิดเจ็ตนี้ออกจาก Dashboard หรือไม่</p>
              </div>
              <button type="button" onClick={() => setContextDeleteWidget(null)} aria-label="ปิด">×</button>
            </header>
            <div className="dcb-confirm-summary">
              <strong>{contextDeleteWidget.title || WIDGET_LABELS[contextDeleteWidget.type] || "วิดเจ็ต"}</strong>
              <span>{WIDGET_LABELS[contextDeleteWidget.type] || contextDeleteWidget.type}</span>
            </div>
            <div className="dcb-modal-actions">
              <button type="button" className="dcb-btn" onClick={() => setContextDeleteWidget(null)}>ยกเลิก</button>
              <button type="button" className="dcb-btn dcb-btn-danger" onClick={confirmDeleteWidgetFromContext}>ลบ</button>
            </div>
          </section>
        </div>
      ) : null}

      {savedChartDeleteConfirm ? (
        <div className="dcb-modal-backdrop" role="presentation" onMouseDown={() => setSavedChartDeleteConfirm(null)}>
          <section className="dcb-modal dcb-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="saved-chart-delete-confirm-title" onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <div>
                <h2 id="saved-chart-delete-confirm-title">ลบกราฟที่บันทึกไว้</h2>
                <p>
                  {savedChartDeleteConfirm.usageCount
                    ? "กราฟนี้ถูกใช้ใน Dashboard อยู่ หากลบต้นฉบับ วิดเจ็ตจะใช้ snapshot แทน"
                    : "ต้องการลบกราฟนี้ออกจากคลังกราฟหรือไม่"}
                </p>
              </div>
              <button type="button" onClick={() => setSavedChartDeleteConfirm(null)} aria-label="ปิด">×</button>
            </header>
            <div className="dcb-confirm-summary">
              <strong>{savedChartDeleteConfirm.chart.title}</strong>
              <span>
                {chartTypeLabel(savedChartDeleteConfirm.chart.chartType)}
                {savedChartDeleteConfirm.usageCount ? ` · ใช้อยู่ ${savedChartDeleteConfirm.usageCount} ครั้ง` : ""}
              </span>
            </div>
            <div className="dcb-modal-actions">
              <button type="button" className="dcb-btn" onClick={() => setSavedChartDeleteConfirm(null)}>ยกเลิก</button>
              <button type="button" className="dcb-btn dcb-btn-danger" onClick={confirmDeleteSavedChartFromList}>ลบกราฟ</button>
            </div>
          </section>
        </div>
      ) : null}

      {shareOpen ? (
        <div className="dcb-modal-backdrop" role="presentation" onMouseDown={() => setShareOpen(false)}>
          <section className="dcb-modal dcb-share-modal" role="dialog" aria-modal="true" aria-labelledby="share-title" onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <div>
                <h2 id="share-title">แชร์ Dashboard</h2>
                <p>Server/Public read-only share</p>
              </div>
              <button type="button" onClick={() => setShareOpen(false)} aria-label="ปิด">×</button>
            </header>
            <label>
              Public share URL
              <div className="dcb-copy-row">
                <input readOnly value={shareLink} />
                <button type="button" onClick={copyShareLink}>คัดลอก</button>
              </div>
            </label>
            <label>
              Iframe embed code
              <div className="dcb-copy-row">
                <input readOnly value={embedCode} />
                <button type="button" onClick={copyEmbed}>คัดลอก</button>
              </div>
            </label>
            {serverShare.status === "creating" ? <small>Creating secure server share…</small> : null}
            {serverShare.status === "error" ? <small role="alert">{serverShare.error}</small> : null}
          </section>
        </div>
      ) : null}

      {pdfModalOpen ? (
        <div className="dcb-modal-backdrop" role="presentation" onMouseDown={() => setPdfModalOpen(false)}>
          <section className="dcb-modal dcb-feature-modal" role="dialog" aria-modal="true" aria-labelledby="pdf-title" onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <div>
                <h2 id="pdf-title">PDF export</h2>
                <p>PDF export จะพร้อมใช้งานใน Production build พร้อม backend export service</p>
              </div>
              <button type="button" onClick={() => setPdfModalOpen(false)} aria-label="ปิด">×</button>
            </header>
            <button type="button" className="dcb-btn dcb-btn-primary" onClick={() => setPdfModalOpen(false)}>รับทราบ</button>
          </section>
        </div>
      ) : null}

      {contextMenuWidget && widgetContextMenu && !previewMode ? (
        <div
          ref={contextMenuRef}
          className="dcb-widget-context-menu"
          role="menu"
          aria-label="เมนูวิดเจ็ต"
          style={{ left: widgetContextMenu.x, top: widgetContextMenu.y }}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            role="menuitem"
            data-icon="✎"
            onClick={() => runWidgetContextAction(() => editWidgetFromContext(contextMenuWidget.id))}
          >
            แก้ไข
          </button>
          <button
            type="button"
            role="menuitem"
            data-icon="⧉"
            onClick={() => runWidgetContextAction(() => copyWidgetFromContext(contextMenuWidget.id))}
          >
            คัดลอก
          </button>
          <span className="dcb-widget-context-divider" aria-hidden="true" />
          <button
            type="button"
            role="menuitem"
            data-icon="↑"
            onClick={() => runWidgetContextAction(() => changeZIndex(1, contextMenuWidget.id))}
          >
            ขึ้นหน้า
          </button>
          <button
            type="button"
            role="menuitem"
            data-icon="↓"
            onClick={() => runWidgetContextAction(() => changeZIndex(-1, contextMenuWidget.id))}
          >
            ลงหลัง
          </button>
          <button
            type="button"
            role="menuitem"
            data-icon="↧"
            onClick={() => runWidgetContextAction(() => exportSelectedWidget(contextMenuWidget.id))}
          >
            ส่งออกวิดเจ็ต
          </button>
          <button
            type="button"
            role="menuitem"
            data-icon="↻"
            disabled={contextMenuWidget.type !== "chart" || !contextMenuSourceChartId || !contextMenuSavedChart}
            title={
              contextMenuWidget.type !== "chart"
                ? "ใช้ได้กับวิดเจ็ตกราฟเท่านั้น"
                : !contextMenuSourceChartId
                  ? "วิดเจ็ตนี้ยังไม่ได้เชื่อมกับกราฟที่บันทึกไว้"
                  : !contextMenuSavedChart
                    ? "ไม่พบกราฟต้นฉบับที่บันทึกไว้"
                    : "อัปเดตจากกราฟที่บันทึกไว้"
            }
            onClick={() => runWidgetContextAction(() => refreshChartWidgetFromSaved(contextMenuWidget.id))}
          >
            อัปเดตจากกราฟที่บันทึกไว้
          </button>
          <span className="dcb-widget-context-divider" aria-hidden="true" />
          <button
            type="button"
            role="menuitem"
            className="danger"
            data-icon="×"
            onClick={() => runWidgetContextAction(() => setContextDeleteWidget(contextMenuWidget))}
          >
            ลบ
          </button>
        </div>
      ) : null}

      {toast ? <div className="dcb-toast" role="status">{toast}</div> : null}
    </div>
  );
}
