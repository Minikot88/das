import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactGridLayout, { WidthProvider } from "react-grid-layout";
import { useNavigate } from "react-router-dom";
import ChartPreview from "@/components/dashboard-v2/components/charts/ChartPreview";
import { createDefaultConfig, dataFields, defaultChartSettings } from "@/components/dashboard-v2/mockData";
import { getDatasetRows } from "@/components/dashboard-v2/services/datasetService";
import useNavigationControls from "@/hooks/useNavigationControls";
import {
  createSavedChartFromConfig,
  getSavedCharts,
  SAVED_CHARTS_KEY,
  SINGLE_CHART_KEY as V2_SINGLE_CHART_KEY,
} from "@/utils/savedChartsStorage";
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
} from "@/services/projectStorage";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import "./DashboardCanvasBuilder.css";

const GridLayout = WidthProvider(ReactGridLayout);

const LAYOUT_STORAGE_KEY = "dashboard-canvas-layout-v1";
const PANEL_STATE_STORAGE_KEY = "dashboard-canvas-panel-state";
const LAYOUT_SCHEMA_VERSION = 1;
const GRID_UNIT = 8;
const GRID_COLS = 180;
const DASHBOARD_WIDTH = 1440;
const DASHBOARD_HEIGHT = 900;

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

const TEMPLATES = [
  { id: "sales", title: "Sales Overview", description: "KPI ยอดขาย กราฟแนวโน้ม และตารางสินค้า" },
  { id: "executive", title: "Executive Dashboard", description: "ภาพรวมผู้บริหารพร้อมตัวชี้วัดหลัก" },
  { id: "marketing", title: "Marketing Funnel", description: "Funnel, KPI และ performance by channel" },
  { id: "operations", title: "Operations Monitor", description: "สถานะงานและตารางตรวจสอบ" },
  { id: "finance", title: "Financial Summary", description: "รายได้ ต้นทุน กำไร และสัดส่วนหมวดหมู่" },
];

const ZOOM_OPTIONS = [25, 50, 75, 100, 125];
const WIDGET_TYPES = new Set(Object.keys(WIDGET_LABELS));

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
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

function loadPanelState() {
  if (typeof window === "undefined") return { leftOpen: true, rightOpen: true };
  const saved = safeParse(window.localStorage.getItem(PANEL_STATE_STORAGE_KEY), null);
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
      return { w: 40, h: 28 };
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
    radius: 6,
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
    : safeParse(window.localStorage.getItem(LAYOUT_STORAGE_KEY), null);
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
  rows,
  savedCharts,
  selected,
  editingTextId,
  setEditingTextId,
  updateWidgetConfig,
  onExpandWidget,
}) {
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

    const chartWidth = widget.w * GRID_UNIT;
    const chartHeight = widget.h * GRID_UNIT;
    if (chartWidth < 280 || chartHeight < 180) {
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

    return (
      <div className="dcb-chart-widget">
        <ChartPreview
          config={chartConfig}
          datasetRows={rows}
          fields={dataFields}
          previewMode
          deviceMode="desktop"
          zoom={100}
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
  const navigation = useNavigationControls();
  const initialState = useMemo(() => loadDashboardLayout(), []);
  const initialPanelState = useMemo(() => loadPanelState(), []);
  const rows = useMemo(() => getDatasetRows("sales_performance"), []);
  const [activeProjectId, setActiveProjectId] = useState(initialState.projectId);
  const [activeProjectName, setActiveProjectName] = useState(initialState.projectName);
  const [activeDashboardId, setActiveDashboardId] = useState(initialState.dashboardId);
  const [dashboards, setDashboards] = useState(initialState.dashboards);
  const [dashboardName, setDashboardName] = useState(initialState.dashboardName);
  const [widgets, setWidgets] = useState(initialState.widgets);
  const [canvasSettings, setCanvasSettings] = useState(initialState.canvasSettings);
  const [theme, setTheme] = useState(initialState.theme);
  const [leftPanelOpen, setLeftPanelOpen] = useState(initialPanelState.leftOpen);
  const [rightPanelOpen, setRightPanelOpen] = useState(initialPanelState.rightOpen);
  const [activeLibraryTab, setActiveLibraryTab] = useState("charts");
  const [selectedWidgetId, setSelectedWidgetId] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [savedCharts, setSavedCharts] = useState(() => readSavedCharts());
  const [chartPickerOpen, setChartPickerOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
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
  const [chartActionMenuId, setChartActionMenuId] = useState(null);
  const [focusedWidgetId, setFocusedWidgetId] = useState(null);
  const widgetsRef = useRef(widgets);
  const canvasSettingsRef = useRef(canvasSettings);
  const activeProjectIdRef = useRef(activeProjectId);
  const activeDashboardIdRef = useRef(activeDashboardId);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const focusPulseTimerRef = useRef(null);

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
    activeDashboardIdRef.current = activeDashboardId;
  }, [activeDashboardId]);

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
    const refreshSavedCharts = () => setSavedCharts(readSavedCharts());
    const onStorage = (event) => {
      if (
        event.key === SAVED_CHARTS_KEY ||
        event.key === V2_SINGLE_CHART_KEY ||
        event.key === PROJECTS_KEY ||
        event.key === ACTIVE_PROJECT_KEY ||
        event.key === ACTIVE_DASHBOARD_KEY
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
  }, []);

  useEffect(() => {
    if (!chartActionMenuId) return undefined;

    function closeChartActionMenu(event) {
      if (event.target instanceof Element && event.target.closest(".dcb-added-chart-item")) return;
      setChartActionMenuId(null);
    }

    document.addEventListener("mousedown", closeChartActionMenu);
    return () => {
      document.removeEventListener("mousedown", closeChartActionMenu);
    };
  }, [chartActionMenuId]);

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

  const persistLayout = useCallback(() => {
    const payload = buildLayoutPayload();
    upsertDashboard(payload.projectId, payload);
    safeSetLocalStorage(LAYOUT_STORAGE_KEY, JSON.stringify(compactDashboardLayoutForStorage(payload)));
    const storageMessage = consumeStorageRecoveryMessage();
    if (storageMessage) setToast(storageMessage);
    setDashboards(getDashboards(payload.projectId));
    setSaveStatus("saved");
    setLastSavedAt(formatSavedTime());
  }, [buildLayoutPayload]);

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
    setStoredActiveProject(activeProjectIdRef.current, activeDashboardIdRef.current);
  }, []);

  const openChartDesignerForCreate = useCallback(() => {
    persistLayout();
    preserveActiveContext();
    setChartPickerOpen(false);
    navigate(chartDesignerUrl({ mode: "create" }));
  }, [chartDesignerUrl, navigate, persistLayout, preserveActiveContext]);

  const applyDashboardState = useCallback((nextState, message) => {
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
    setChartActionMenuId(null);
    setHistoryPast([]);
    setHistoryFuture([]);
    setSaveStatus("saved");
    setLastSavedAt(formatSavedTime());
    setSavedCharts(readSavedCharts());
    if (message) setToast(message);
  }, []);

  const loadActiveDashboardState = useCallback((message) => {
    const nextState = loadDashboardLayout();
    applyDashboardState(nextState, message);
  }, [applyDashboardState]);

  const switchDashboard = useCallback((dashboardId) => {
    if (!dashboardId || dashboardId === activeDashboardIdRef.current) return;
    persistLayout();
    setStoredActiveDashboard(dashboardId);
    loadActiveDashboardState("\u0e40\u0e1b\u0e25\u0e35\u0e48\u0e22\u0e19 Dashboard \u0e41\u0e25\u0e49\u0e27");
  }, [loadActiveDashboardState, persistLayout]);

  const createNewDashboard = useCallback(() => {
    persistLayout();
    const dashboard = createStoredDashboard(activeProjectIdRef.current, "แดชบอร์ดใหม่");
    setStoredActiveDashboard(dashboard.id);
    loadActiveDashboardState("\u0e2a\u0e23\u0e49\u0e32\u0e07 Dashboard \u0e43\u0e2b\u0e21\u0e48\u0e41\u0e25\u0e49\u0e27");
  }, [loadActiveDashboardState, persistLayout]);

  const renameCurrentDashboard = useCallback(() => {
    setToast("เปิดหน้าต่างเปลี่ยนชื่อ Dashboard");
    const nextName = window.prompt("\u0e0a\u0e37\u0e48\u0e2d Dashboard", dashboardName);
    if (!nextName || !nextName.trim()) return;
    renameStoredDashboard(activeProjectIdRef.current, activeDashboardIdRef.current, nextName.trim());
    loadActiveDashboardState("\u0e40\u0e1b\u0e25\u0e35\u0e48\u0e22\u0e19\u0e0a\u0e37\u0e48\u0e2d Dashboard \u0e41\u0e25\u0e49\u0e27");
  }, [dashboardName, loadActiveDashboardState]);

  const deleteCurrentDashboard = useCallback(() => {
    if (dashboards.length <= 1) {
      setToast("\u0e15\u0e49\u0e2d\u0e07\u0e21\u0e35 Dashboard \u0e2d\u0e22\u0e48\u0e32\u0e07\u0e19\u0e49\u0e2d\u0e22 1 \u0e23\u0e32\u0e22\u0e01\u0e32\u0e23");
      return;
    }
    const confirmed = window.confirm(`\u0e25\u0e1a Dashboard "${dashboardName}" \u0e2b\u0e23\u0e37\u0e2d\u0e44\u0e21\u0e48`);
    if (!confirmed) return;
    deleteStoredDashboard(activeProjectIdRef.current, activeDashboardIdRef.current);
    loadActiveDashboardState("\u0e25\u0e1a Dashboard \u0e41\u0e25\u0e49\u0e27");
  }, [dashboardName, dashboards.length, loadActiveDashboardState]);

  useEffect(() => {
    setSaveStatus("saving");
    const timer = window.setTimeout(() => {
      persistLayout();
    }, 500);
    return () => window.clearTimeout(timer);
  }, [persistLayout]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(""), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => () => {
    if (focusPulseTimerRef.current) {
      window.clearTimeout(focusPulseTimerRef.current);
    }
  }, []);

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

  const addChart = useCallback((savedChart) => {
    const sourceChart = savedChart ?? createSavedChartFromConfig(buildSampleChartConfig(), { forceNew: true });
    const nextWidget = createChartWidget(sourceChart, {
      y: nextWidgetY(widgetsRef.current),
      zIndex: nextWidgetZ(widgetsRef.current),
      projectId: activeProjectIdRef.current,
      dashboardId: activeDashboardIdRef.current,
    });
    commitWidgets((current) => [...current, nextWidget], "เพิ่มกราฟลงแดชบอร์ดแล้ว");
    setSelectedWidgetId(nextWidget.id);
    window.requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
    setSavedCharts(readSavedCharts());
    setChartPickerOpen(false);
  }, [commitWidgets]);

  const focusWidgetOnCanvas = useCallback((widgetId, message = "เลือกกราฟใน Canvas แล้ว") => {
    const targetWidget = widgetsRef.current.find((widget) => widget.id === widgetId);
    if (!targetWidget) return;
    setSelectedWidgetId(widgetId);
    setWidgetMenuId(null);
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
    setChartActionMenuId(null);
    persistLayout();
    preserveActiveContext();
    navigate(chartDesignerUrl({ chartId: record.id }));
  }, [chartDesignerUrl, ensureWidgetSavedChart, navigate, persistLayout, preserveActiveContext, selectedWidgetId]);

  const applyTemplate = useCallback((templateId) => {
    const template = TEMPLATES.find((item) => item.id === templateId);
    const primarySavedChart = savedCharts[0] ?? createSavedChartFromConfig(buildSampleChartConfig(), { forceNew: true });
    const nextWidgets = createTemplateWidgets(templateId, primarySavedChart, {
      projectId: activeProjectIdRef.current,
      dashboardId: activeDashboardIdRef.current,
    });
    setSavedCharts(readSavedCharts());
    commitWidgets(nextWidgets, `ใช้เทมเพลต: ${template?.title ?? "Dashboard"}`);
    setSelectedWidgetId(nextWidgets[0]?.id ?? null);
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
    setChartActionMenuId(null);
    window.requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
  }, [commitWidgets, selectedWidgetId]);

  const deleteWidget = useCallback((widgetId = selectedWidgetId) => {
    if (!widgetId) return;
    commitWidgets((current) => current.filter((widget) => widget.id !== widgetId), "ลบวิดเจ็ตแล้ว");
    setSelectedWidgetId(null);
    setWidgetMenuId(null);
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

  const refreshSavedCharts = useCallback(() => {
    const nextCharts = readSavedCharts();
    setSavedCharts(nextCharts);
    return nextCharts;
  }, []);

  const openChartPicker = useCallback(() => {
    refreshSavedCharts();
    setChartPickerOpen(true);
  }, [refreshSavedCharts]);

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
    persistLayout();
    setToast("บันทึก Dashboard แล้ว");
  }, [persistLayout]);

  const shareLink = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/dashboard?share=local-demo`;
  }, []);

  const embedCode = useMemo(
    () => `<iframe src="${shareLink}" title="Mini BI Dashboard" width="1440" height="900"></iframe>`,
    [shareLink]
  );

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

  useEffect(() => {
    const onRibbonCommand = (event) => {
      const detail = event.detail;
      if (detail?.scope !== "dashboard") return;

      if (detail.command === "add-chart") {
        openChartPicker();
        return;
      }
      if (detail.command === "add-kpi") {
        addWidget("kpi");
        return;
      }
      if (detail.command === "add-table") {
        addWidget("table");
        return;
      }
      if (detail.command === "add-text") {
        addWidget("text");
        return;
      }
      if (detail.command === "add-image") {
        addWidget("image");
        return;
      }
      if (detail.command === "add-filter") {
        addWidget("filter");
        return;
      }
      if (detail.command === "templates") {
        setActiveLibraryTab("templates");
        setToast("เลือกเทมเพลตจากคลังด้านซ้าย");
        return;
      }
      if (detail.command === "save") {
        saveDashboard();
        return;
      }
      if (detail.command === "preview") {
        setPreviewMode(true);
        return;
      }
      if (detail.command === "share") {
        setShareOpen(true);
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
  }, [addWidget, exportJson, openChartPicker, saveDashboard]);

  const handleImageUpload = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file || !selectedWidget) return;
    const url = URL.createObjectURL(file);
    updateWidgetConfig(selectedWidget.id, { src: url, fileName: file.name });
    setToast("เพิ่มรูปภาพแล้ว");
  }, [selectedWidget, updateWidgetConfig]);

  const canvasScale = canvasSettings.zoom / 100;
  const canvasHeightRows = Math.floor(canvasSettings.height / activeGridUnit);
  const statusText = saveStatus === "saving" ? "กำลังบันทึก" : saveStatus === "unsaved" ? "ยังไม่บันทึก" : "บันทึกแล้ว";

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
          <span className={`dcb-save-indicator ${saveStatus}`}>{statusText} {lastSavedAt}</span>
          <button type="button" className="dcb-btn" onClick={() => navigate("/home")} title="กลับหน้าหลัก">หน้าหลัก</button>
          <button type="button" className="dcb-btn" onClick={openChartDesignerForCreate}>เปิดตัวสร้างกราฟ</button>
          <button type="button" className="dcb-btn" onClick={() => setShareOpen(true)}>แชร์</button>
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
          <button type="button" className="dcb-btn" onClick={() => setShareOpen(true)}>แชร์</button>
          <button type="button" className="dcb-btn dcb-btn-primary" onClick={() => setPreviewMode(false)}>ออกจากโหมดนำเสนอ</button>
        </div>
      ) : (
        <nav className="dcb-toolbar" aria-label="เครื่องมือตัวจัดวางแดชบอร์ด">
          <div className="dcb-toolbar-group">
            <button type="button" className="dcb-tool-primary" onClick={openChartPicker}>+ เพิ่มกราฟ</button>
            <button type="button" className="dcb-tool" onClick={() => addWidget("kpi")}>KPI</button>
            <button type="button" className="dcb-tool" onClick={() => addWidget("table")}>ตาราง</button>
            <button type="button" className="dcb-tool" onClick={() => addWidget("text")}>ข้อความ</button>
            <button type="button" className="dcb-tool" onClick={() => addWidget("image")}>รูปภาพ</button>
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
            <button type="button" className="dcb-tool" onClick={() => setPreviewMode(true)}>ดูตัวอย่าง</button>
            <button type="button" className="dcb-tool" onClick={exportPng}>PNG</button>
            <button type="button" className="dcb-tool" onClick={exportJson}>JSON</button>
            <button type="button" className="dcb-tool" onClick={() => setPdfModalOpen(true)}>PDF</button>
          </div>
        </nav>
      )}

      <main className={`dcb-main ${leftPanelOpen ? "" : "is-left-collapsed"} ${rightPanelOpen ? "" : "is-right-collapsed"}`}>
        {!previewMode ? (
          <aside className={`dcb-panel dcb-left-panel ${leftPanelOpen ? "" : "is-collapsed"}`} aria-hidden={!leftPanelOpen}>
            <div className="dcb-panel-header">
              <strong>วิดเจ็ต</strong>
              <span>กราฟ องค์ประกอบ และเทมเพลต</span>
            </div>
            <div className="dcb-dashboard-switcher dcb-dashboard-switcher-panel" aria-label="เลือก Dashboard">
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
            <div className="dcb-tabs" role="tablist" aria-label="คลังวิดเจ็ต">
              {[
                ["charts", "กราฟ"],
                ["elements", "องค์ประกอบ"],
                ["templates", "เทมเพลต"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={activeLibraryTab === id}
                  className={activeLibraryTab === id ? "is-active" : ""}
                  onClick={() => setActiveLibraryTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="dcb-library-scroll">
              {activeLibraryTab === "charts" ? (
                <div className="dcb-chart-library">
                  <section className="dcb-chart-section">
                    <div className="dcb-section-heading">
                      <div>
                        <strong>กราฟใน Dashboard นี้ ({dashboardChartItems.length})</strong>
                        <span>กราฟที่ถูกเพิ่มลง Canvas แล้ว</span>
                      </div>
                    </div>
                    {dashboardChartItems.length ? (
                      <div className="dcb-added-chart-list">
                        {dashboardChartItems.map(({ widget, savedChart, sourceChartId, title, chartType, usageCount, updatedAt }) => (
                          <article
                            key={widget.id}
                            className={`dcb-added-chart-item ${selectedWidgetId === widget.id ? "is-selected" : ""}`}
                          >
                            <button
                              type="button"
                              className="dcb-added-chart-main"
                              onClick={() => focusWidgetOnCanvas(widget.id)}
                              title="เลือกกราฟใน Canvas"
                            >
                              <span className="dcb-item-icon">{chartIcon(chartType)}</span>
                              <span className="dcb-added-chart-copy">
                                <strong>{title}</strong>
                                <span>{chartTypeLabel(chartType)} · {formatSavedTime(new Date(updatedAt))}</span>
                                <small>
                                  {savedChart?.title
                                    ? `เชื่อมกับ ${savedChart.title}`
                                    : sourceChartId
                                      ? "ไม่พบกราฟต้นฉบับ"
                                      : "ใช้ snapshot"}
                                </small>
                              </span>
                              {usageCount > 1 ? <small className="dcb-usage-badge">ใช้ {usageCount} ครั้ง</small> : null}
                            </button>
                            <div className="dcb-added-chart-actions">
                              <button type="button" onClick={() => focusWidgetOnCanvas(widget.id)} title="เลือกและโฟกัสกราฟนี้">เลือก</button>
                              <button type="button" onClick={() => editChartWidget(widget.id)} title="แก้ไขกราฟนี้ในตัวสร้างกราฟ">แก้ไขกราฟ</button>
                              <button
                                type="button"
                                className="dcb-added-chart-more"
                                onClick={() => setChartActionMenuId((current) => (current === widget.id ? null : widget.id))}
                                aria-haspopup="menu"
                                aria-expanded={chartActionMenuId === widget.id}
                                title="คำสั่งเพิ่มเติม"
                              >
                                ⋯
                              </button>
                              {chartActionMenuId === widget.id ? (
                                <div className="dcb-added-chart-menu" role="menu" aria-label={`คำสั่ง ${title}`}>
                                  <button type="button" role="menuitem" onClick={() => duplicateWidget(widget.id)}>ทำสำเนา</button>
                                  <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => refreshChartWidgetFromSaved(widget.id)}
                                    disabled={!sourceChartId || !savedChart}
                                    title={savedChart ? "อัปเดตจากกราฟที่บันทึกไว้" : "ไม่พบกราฟต้นฉบับในคลัง"}
                                  >
                                    อัปเดตจากต้นฉบับ
                                  </button>
                                  <button type="button" role="menuitem" onClick={() => exportSelectedWidget(widget.id)}>ส่งออก</button>
                                  <button type="button" role="menuitem" className="danger" onClick={() => deleteWidget(widget.id)}>ลบ</button>
                                </div>
                              ) : null}
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <div className="dcb-added-chart-empty">
                        <strong>ยังไม่มีกราฟใน Dashboard</strong>
                        <span>เพิ่มกราฟจากรายการที่บันทึกไว้ หรือเปิดตัวสร้างกราฟเพื่อสร้างกราฟใหม่</span>
                        <div>
                          <button type="button" className="dcb-btn dcb-btn-primary" onClick={() => addChart(null)}>เพิ่มกราฟตัวอย่าง</button>
                          <button type="button" className="dcb-btn" onClick={openChartDesignerForCreate}>เปิดตัวสร้างกราฟ</button>
                        </div>
                      </div>
                    )}
                  </section>

                  <section className="dcb-chart-section">
                    <div className="dcb-section-heading">
                      <div>
                        <strong>กราฟที่บันทึกไว้</strong>
                        <span>Reusable charts จากตัวสร้างกราฟ</span>
                      </div>
                    </div>
                    <div className="dcb-library-list">
                      {savedCharts.length ? (
                        savedCharts.map((chart) => {
                          const usageCount = savedChartUsageCounts.get(chart.id) ?? 0;
                          return (
                            <article key={chart.id} className="dcb-library-item">
                              <div className="dcb-item-icon">{chartIcon(chart.chartType)}</div>
                              <div className="dcb-item-body">
                                <strong>{chart.title}</strong>
                                <span>{chartTypeLabel(chart.chartType)} · {formatSavedTime(new Date(chart.updatedAt))}</span>
                                {usageCount ? (
                                  <small className="dcb-usage-badge">{usageCount === 1 ? "เพิ่มแล้ว" : `ใช้แล้ว ${usageCount} ครั้ง`}</small>
                                ) : null}
                              </div>
                              <button type="button" onClick={() => addChart(chart)}>เพิ่ม</button>
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
                </div>
              ) : null}

              {activeLibraryTab === "elements" ? (
                <div className="dcb-library-list">
                  {ELEMENTS.map((element) => (
                    <button key={element.type} type="button" className="dcb-element-row" onClick={() => addWidget(element.type)}>
                      <span className="dcb-item-icon">{element.type === "divider" ? "—" : "□"}</span>
                      <span>
                        <strong>{element.title}</strong>
                        <small>{element.description}</small>
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}

              {activeLibraryTab === "templates" ? (
                <div className="dcb-library-list">
                  {TEMPLATES.map((template) => (
                    <article key={template.id} className="dcb-template-card">
                      <strong>{template.title}</strong>
                      <span>{template.description}</span>
                      <button type="button" onClick={() => applyTemplate(template.id)}>ใช้เทมเพลต</button>
                    </article>
                  ))}
                </div>
              ) : null}
            </div>
          </aside>
        ) : null}

        <section className="dcb-canvas-region">
          <div className="dcb-canvas-toolbar">
            <div>
              <strong>{dashboardName}</strong>
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
                      <button type="button" className="dcb-btn dcb-btn-primary" onClick={openChartPicker}>เพิ่มกราฟ</button>
                      <button type="button" className="dcb-btn" onClick={() => setActiveLibraryTab("templates")}>เลือกเทมเพลต</button>
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
                    >
                      <section
                        className={`dcb-widget dcb-widget-${widget.type}`}
                        data-testid={`dashboard-widget-${widget.id}`}
                        data-widget-id={widget.id}
                        style={{
                          background: widget.background,
                          borderColor: widget.borderColor,
                          borderRadius: widget.radius,
                          zIndex: widget.zIndex,
                        }}
                      >
                        {!previewMode ? (
                          <div className="dcb-widget-handle">
                            <span>{chartWidgetDisplayTitle(widget, savedCharts)}</span>
                            <div onMouseDown={(event) => event.stopPropagation()}>
                              <button type="button" onClick={() => duplicateWidget(widget.id)} aria-label="ทำสำเนา">⧉</button>
                              <button
                                type="button"
                                onClick={() => setWidgetMenuId((current) => (current === widget.id ? null : widget.id))}
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
                          rows={rows}
                          savedCharts={savedCharts}
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
                  <h3>วิดเจ็ต</h3>
                  <label>
                    ประเภท
                    <input value={WIDGET_LABELS[selectedWidget.type] ?? selectedWidget.type} readOnly />
                  </label>
                  <label>
                    ชื่อ
                    <input value={selectedWidget.title} onChange={(event) => updateWidget(selectedWidget.id, { title: event.target.value })} />
                  </label>
                  <div className="dcb-property-grid">
                    <label>
                      X
                      <input type="number" value={selectedWidget.x} onChange={(event) => updateWidget(selectedWidget.id, { x: Number(event.target.value) })} />
                    </label>
                    <label>
                      Y
                      <input type="number" value={selectedWidget.y} onChange={(event) => updateWidget(selectedWidget.id, { y: Number(event.target.value) })} />
                    </label>
                    <label>
                      W
                      <input type="number" value={selectedWidget.w} onChange={(event) => updateWidget(selectedWidget.id, { w: Number(event.target.value) })} />
                    </label>
                    <label>
                      H
                      <input type="number" value={selectedWidget.h} onChange={(event) => updateWidget(selectedWidget.id, { h: Number(event.target.value) })} />
                    </label>
                  </div>
                  <label>
                    Background
                    <input type="color" value={selectedWidget.background} onChange={(event) => updateWidget(selectedWidget.id, { background: event.target.value })} />
                  </label>
                  <label>
                    Border
                    <input type="color" value={selectedWidget.borderColor} onChange={(event) => updateWidget(selectedWidget.id, { borderColor: event.target.value })} />
                  </label>
                  <label>
                    Radius
                    <input type="range" min="0" max="16" value={selectedWidget.radius} onChange={(event) => updateWidget(selectedWidget.id, { radius: Number(event.target.value) })} />
                  </label>
                  {selectedWidget.type === "chart" && selectedChartConfig ? (
                    <>
                      <h3>กราฟ</h3>
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
      </main>

      <footer className="dcb-statusbar">
        <span>วิดเจ็ต: {widgets.length}</span>
        <span>กราฟ: {dashboardChartItems.length}</span>
        <span>ซูม: {canvasSettings.zoom}%</span>
        <span>Grid: {canvasSettings.showGrid ? "On" : "Off"}</span>
        <span>Snap: {canvasSettings.snapToGrid ? "On" : "Off"}</span>
        <span>{statusText}</span>
        <span>โหมดเดโม</span>
      </footer>

      {chartPickerOpen ? (
        <div className="dcb-modal-backdrop" role="presentation" onMouseDown={() => setChartPickerOpen(false)}>
          <section className="dcb-modal" role="dialog" aria-modal="true" aria-labelledby="chart-picker-title" onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <div>
                <h2 id="chart-picker-title">เลือกกราฟ</h2>
                <p>เลือกกราฟที่บันทึกจากตัวสร้างกราฟ หรือสร้างกราฟใหม่</p>
              </div>
              <button type="button" onClick={() => setChartPickerOpen(false)} aria-label="ปิด">×</button>
            </header>
            <div className="dcb-modal-grid">
              {savedCharts.length ? (
                savedCharts.map((chart) => (
                  <button key={chart.id} type="button" className="dcb-chart-option" onClick={() => addChart(chart)}>
                    <span>▦</span>
                    <strong>{chart.title}</strong>
                    <small>{chartTypeLabel(chart.chartType)}</small>
                  </button>
                ))
              ) : (
                <div className="dcb-modal-empty">
                  <strong>ยังไม่มีกราฟที่บันทึกไว้</strong>
                  <span>คุณสามารถใช้กราฟตัวอย่าง หรือเปิดตัวสร้างกราฟเพื่อบันทึกกราฟใหม่</span>
                </div>
              )}
              <button type="button" className="dcb-chart-option" onClick={() => addChart(null)}>
                <span>▥</span>
                <strong>กราฟตัวอย่าง</strong>
                <small>Bar Chart</small>
              </button>
              <button type="button" className="dcb-chart-option" onClick={openChartDesignerForCreate}>
                <span>＋</span>
                <strong>สร้างกราฟใหม่</strong>
                <small>เปิดตัวสร้างกราฟ</small>
              </button>
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
                <p>ลิงก์นี้เป็น mock link สำหรับเดโมจนกว่าจะเชื่อม backend</p>
              </div>
              <button type="button" onClick={() => setShareOpen(false)} aria-label="ปิด">×</button>
            </header>
            <label>
              สิทธิ์การเข้าถึง
              <select defaultValue="private">
                <option value="private">Private</option>
                <option value="link">Anyone with link</option>
              </select>
            </label>
            <label>
              Share link
              <div className="dcb-copy-row">
                <input readOnly value={shareLink} />
                <button type="button" onClick={copyShareLink}>คัดลอก</button>
              </div>
            </label>
            <label>
              Embed code
              <div className="dcb-copy-row">
                <input readOnly value={embedCode} />
                <button type="button" onClick={copyEmbed}>คัดลอก</button>
              </div>
            </label>
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

      {toast ? <div className="dcb-toast" role="status">{toast}</div> : null}
    </div>
  );
}
