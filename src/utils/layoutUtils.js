import { createInstanceId } from "./id";

export const GRID_BREAKPOINTS = { lg: 900, md: 640, sm: 520, xs: 0 };
export const GRID_COLUMNS = { lg: 12, md: 8, sm: 6, xs: 1 };
export const DASHBOARD_GRID_COLS = 12;
export const DASHBOARD_GRID_MARGIN = [8, 8];
export const DASHBOARD_GRID_PADDING = [0, 0];
export const DASHBOARD_ROW_HEIGHT = 76;
export const DASHBOARD_COMPACT_TYPE = "vertical";
export const MIN_WIDGET_SIZE_PX = 220;

const REFERENCE_CANVAS_WIDTH = 960;
const DEFAULT_GRID_COLUMNS = 12;

function gridUnitsForWidth(targetPx, cols = DEFAULT_GRID_COLUMNS, canvasWidth = REFERENCE_CANVAS_WIDTH) {
  const margin = DASHBOARD_GRID_MARGIN[0];
  const colWidth = Math.max(24, (canvasWidth - margin * (cols - 1)) / cols);
  return Math.max(1, Math.ceil((targetPx + margin) / (colWidth + margin)));
}

function gridUnitsForHeight(targetPx) {
  const margin = DASHBOARD_GRID_MARGIN[1];
  return Math.max(1, Math.ceil((targetPx + margin) / (DASHBOARD_ROW_HEIGHT + margin)));
}

const SQUARE_MIN_UNITS = Math.max(
  3,
  gridUnitsForWidth(MIN_WIDGET_SIZE_PX),
  gridUnitsForHeight(MIN_WIDGET_SIZE_PX)
);

const CIRCULAR_CHART_TYPES = new Set([
  "pie",
  "doughnut",
  "donut",
  "polararea",
  "polar-area",
  "radar",
  "rose",
  "half-donut",
  "nested-pie",
  "scrollable-pie",
  "special-label-pie",
  "rich-text-pie",
  "rich-text-donut",
  "progress-ring",
]);

const KPI_CHART_TYPES = new Set(["kpi", "metric", "stat"]);

function getResponsiveChartType(chart = {}) {
  const safeChart = chart ?? {};
  return String(
    safeChart.type ??
    safeChart.config?.type ??
    safeChart.family ??
    safeChart.variant ??
    safeChart.templateId ??
    ""
  ).toLowerCase();
}

export function getResponsiveChartKind(chart = {}) {
  const type = getResponsiveChartType(chart);
  if (KPI_CHART_TYPES.has(type)) return "kpi";
  if (CIRCULAR_CHART_TYPES.has(type)) return "circular";
  return "axis";
}

export function getChartLayoutConstraints(chart = {}) {
  const kind = getResponsiveChartKind(chart);

  if (kind === "kpi") {
    return { minW: 2, minH: 2, maxH: 4 };
  }

  if (kind === "circular") {
    return { minW: SQUARE_MIN_UNITS, minH: SQUARE_MIN_UNITS, maxH: 7 };
  }

  return { minW: SQUARE_MIN_UNITS, minH: SQUARE_MIN_UNITS, maxH: 8 };
}

export function getPreferredChartLayout(chart = {}, index = 0) {
  const kind = getResponsiveChartKind(chart);

  if (kind === "kpi") {
    return { w: 3, h: 2, minW: 2, minH: 2 };
  }

  if (kind === "circular") {
    return { w: 5, h: 5, minW: SQUARE_MIN_UNITS, minH: SQUARE_MIN_UNITS };
  }

  return {
    w: index === 0 ? 7 : 6,
    h: 5,
    minW: SQUARE_MIN_UNITS,
    minH: SQUARE_MIN_UNITS,
  };
}

const AUTO_LAYOUT_PRESETS = {
  1: [{ x: 0, y: 0, w: 12, h: 5 }],
  2: [
    { x: 0, y: 0, w: 6, h: 4 },
    { x: 6, y: 0, w: 6, h: 4 },
  ],
  3: [
    { x: 0, y: 0, w: 6, h: 4 },
    { x: 6, y: 0, w: 6, h: 4 },
    { x: 0, y: 4, w: 12, h: 4 },
  ],
  4: [
    { x: 0, y: 0, w: 6, h: 4 },
    { x: 6, y: 0, w: 6, h: 4 },
    { x: 0, y: 4, w: 6, h: 4 },
    { x: 6, y: 4, w: 6, h: 4 },
  ],
  5: [
    { x: 0, y: 0, w: 6, h: 4 },
    { x: 6, y: 0, w: 6, h: 4 },
    { x: 0, y: 4, w: 6, h: 4 },
    { x: 6, y: 4, w: 6, h: 4 },
    { x: 0, y: 8, w: 12, h: 4 },
  ],
  6: [
    { x: 0, y: 0, w: 4, h: 4 },
    { x: 4, y: 0, w: 4, h: 4 },
    { x: 8, y: 0, w: 4, h: 4 },
    { x: 0, y: 4, w: 4, h: 4 },
    { x: 4, y: 4, w: 4, h: 4 },
    { x: 8, y: 4, w: 4, h: 4 },
  ],
  7: [
    { x: 0, y: 0, w: 4, h: 4 },
    { x: 4, y: 0, w: 4, h: 4 },
    { x: 8, y: 0, w: 4, h: 4 },
    { x: 0, y: 4, w: 4, h: 4 },
    { x: 4, y: 4, w: 4, h: 4 },
    { x: 8, y: 4, w: 4, h: 4 },
    { x: 0, y: 8, w: 12, h: 4 },
  ],
  8: [
    { x: 0, y: 0, w: 6, h: 4 },
    { x: 6, y: 0, w: 6, h: 4 },
    { x: 0, y: 4, w: 6, h: 4 },
    { x: 6, y: 4, w: 6, h: 4 },
    { x: 0, y: 8, w: 6, h: 4 },
    { x: 6, y: 8, w: 6, h: 4 },
    { x: 0, y: 12, w: 6, h: 4 },
    { x: 6, y: 12, w: 6, h: 4 },
  ],
  9: [
    { x: 0, y: 0, w: 4, h: 4 },
    { x: 4, y: 0, w: 4, h: 4 },
    { x: 8, y: 0, w: 4, h: 4 },
    { x: 0, y: 4, w: 4, h: 4 },
    { x: 4, y: 4, w: 4, h: 4 },
    { x: 8, y: 4, w: 4, h: 4 },
    { x: 0, y: 8, w: 4, h: 4 },
    { x: 4, y: 8, w: 4, h: 4 },
    { x: 8, y: 8, w: 4, h: 4 },
  ],
  10: [
    { x: 0, y: 0, w: 6, h: 4 },
    { x: 6, y: 0, w: 6, h: 4 },
    { x: 0, y: 4, w: 6, h: 4 },
    { x: 6, y: 4, w: 6, h: 4 },
    { x: 0, y: 8, w: 6, h: 4 },
    { x: 6, y: 8, w: 6, h: 4 },
    { x: 0, y: 12, w: 6, h: 4 },
    { x: 6, y: 12, w: 6, h: 4 },
    { x: 0, y: 16, w: 6, h: 4 },
    { x: 6, y: 16, w: 6, h: 4 },
  ],
  11: [
    { x: 0, y: 0, w: 4, h: 4 },
    { x: 4, y: 0, w: 4, h: 4 },
    { x: 8, y: 0, w: 4, h: 4 },
    { x: 0, y: 4, w: 4, h: 4 },
    { x: 4, y: 4, w: 4, h: 4 },
    { x: 8, y: 4, w: 4, h: 4 },
    { x: 0, y: 8, w: 4, h: 4 },
    { x: 4, y: 8, w: 4, h: 4 },
    { x: 8, y: 8, w: 4, h: 4 },
    { x: 0, y: 12, w: 6, h: 4 },
    { x: 6, y: 12, w: 6, h: 4 },
  ],
  12: [
    { x: 0, y: 0, w: 4, h: 4 },
    { x: 4, y: 0, w: 4, h: 4 },
    { x: 8, y: 0, w: 4, h: 4 },
    { x: 0, y: 4, w: 4, h: 4 },
    { x: 4, y: 4, w: 4, h: 4 },
    { x: 8, y: 4, w: 4, h: 4 },
    { x: 0, y: 8, w: 4, h: 4 },
    { x: 4, y: 8, w: 4, h: 4 },
    { x: 8, y: 8, w: 4, h: 4 },
    { x: 0, y: 12, w: 4, h: 4 },
    { x: 4, y: 12, w: 4, h: 4 },
    { x: 8, y: 12, w: 4, h: 4 },
  ],
};

export function buildResponsiveLayouts(layout = []) {
  const safeLayout = Array.isArray(layout) ? layout : [];
  const scaleLayout = (cols) => safeLayout.map((item) => {
    const minW = Math.max(1, Math.min(cols, item.minW ?? 3));
    const width = Math.max(minW, Math.min(cols, Math.round(((item.w ?? 6) / DASHBOARD_GRID_COLS) * cols)));
    const x = Math.max(0, Math.min(cols - width, Math.round(((item.x ?? 0) / DASHBOARD_GRID_COLS) * cols)));

    return {
      ...item,
      x,
      w: width,
      minW,
    };
  });

  return {
    lg: safeLayout,
    md: scaleLayout(GRID_COLUMNS.md),
    sm: safeLayout.map((item) => ({ ...item, x: 0, w: GRID_COLUMNS.sm, minW: Math.min(item.minW ?? 1, GRID_COLUMNS.sm) })),
    xs: safeLayout.map((item) => ({ ...item, x: 0, w: GRID_COLUMNS.xs, minW: 1 })),
  };
}

export function collides(a, b) {
  return !(
    a.x + a.w <= b.x ||
    b.x + b.w <= a.x ||
    a.y + a.h <= b.y ||
    b.y + b.h <= a.y
  );
}

export function createLayoutItem(layout = [], chartId, overrides = {}) {
  const width = overrides.w ?? 7;
  const height = overrides.h ?? 5;
  const cols = 12;
  const maxX = Math.max(cols - width, 0);

  for (let y = 0; y < 200; y += 1) {
    for (let x = 0; x <= maxX; x += 1) {
      const candidate = { x, y, w: width, h: height };
      if (!layout.some((item) => collides(candidate, item))) {
        return {
          i: createInstanceId(),
          chartId,
          x,
          y,
          w: width,
          h: height,
          minW: overrides.minW ?? SQUARE_MIN_UNITS,
          minH: overrides.minH ?? SQUARE_MIN_UNITS,
          ...overrides,
        };
      }
    }
  }

  return {
    i: createInstanceId(),
    chartId,
    x: 0,
    y: layout.reduce((maxY, item) => Math.max(maxY, item.y + item.h), 0),
    w: width,
    h: height,
    minW: overrides.minW ?? SQUARE_MIN_UNITS,
    minH: overrides.minH ?? SQUARE_MIN_UNITS,
    ...overrides,
  };
}

export function tryCreateAdjacentLayoutItem(layout = [], sourceItem, chartId) {
  if (!sourceItem) {
    return createLayoutItem(layout, chartId);
  }

  const width = sourceItem.w ?? 4;
  const height = sourceItem.h ?? 4;
  const minW = sourceItem.minW ?? 2;
  const minH = sourceItem.minH ?? 3;
  const cols = 12;
  const candidates = [
    { x: sourceItem.x + width, y: sourceItem.y },
    { x: sourceItem.x, y: sourceItem.y + height },
    { x: sourceItem.x - width, y: sourceItem.y },
    { x: sourceItem.x, y: Math.max(0, sourceItem.y - height) },
  ];

  for (const candidate of candidates) {
    const x = Math.max(0, Math.min(candidate.x, Math.max(cols - width, 0)));
    const y = Math.max(0, candidate.y);
    const nextItem = { x, y, w: width, h: height };

    if (!layout.some((item) => collides(nextItem, item))) {
      return createLayoutItem(layout, chartId, { x, y, w: width, h: height, minW, minH });
    }
  }

  return createLayoutItem(layout, chartId, { w: width, h: height, minW, minH });
}

export function sanitizeLayout(layout = [], existingLayout = []) {
  const safeLayout = Array.isArray(layout) ? layout : [];
  const safeExistingLayout = Array.isArray(existingLayout) ? existingLayout : [];
  const existingMap = new Map(safeExistingLayout.filter(Boolean).map((item) => [item.i, item]));
  return safeLayout.filter(Boolean).map((item) => {
    const existing = existingMap.get(item.i);
    return {
      i: item.i,
      chartId: item.chartId ?? existing?.chartId,
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
      minW: item.minW ?? existing?.minW ?? 2,
      minH: item.minH ?? existing?.minH ?? 3,
      ...(item.titleOverride ?? existing?.titleOverride
        ? { titleOverride: item.titleOverride ?? existing?.titleOverride }
        : {}),
    };
  });
}

export function getAutoLayoutPreset(count = 0) {
  if (count <= 0) return [];
  if (AUTO_LAYOUT_PRESETS[count]) return AUTO_LAYOUT_PRESETS[count];

  return Array.from({ length: count }, (_, index) => ({
    x: (index % 3) * 4,
    y: Math.floor(index / 3) * 4,
    w: 4,
    h: 4,
  }));
}

function createBalancedPresetForWidgets(widgets = []) {
  const kinds = widgets.map((widget) => getResponsiveChartKind(widget));

  if (widgets.length === 1) {
    const preferred = getPreferredChartLayout(widgets[0], 0);
    const width = preferred.w >= 7 ? 10 : preferred.w;
    return [{ x: Math.floor((DASHBOARD_GRID_COLS - width) / 2), y: 0, w: width, h: preferred.h }];
  }

  if (widgets.length === 2) {
    const hasAxis = kinds.includes("axis");
    const hasCircular = kinds.includes("circular");
    const hasKpi = kinds.includes("kpi");

    if (hasAxis && hasCircular) {
      return widgets.map((widget) => {
        const kind = getResponsiveChartKind(widget);
        if (kind === "axis") return { x: 0, y: 0, w: 7, h: 5 };
        return { x: 7, y: 0, w: 5, h: 5 };
      });
    }

    if (hasAxis && hasKpi) {
      return widgets.map((widget) => {
        const kind = getResponsiveChartKind(widget);
        if (kind === "axis") return { x: 0, y: 0, w: 8, h: 5 };
        return { x: 8, y: 0, w: 4, h: 2 };
      });
    }

    return [
      { x: 0, y: 0, w: 6, h: 5 },
      { x: 6, y: 0, w: 6, h: 5 },
    ];
  }

  if (widgets.length === 3 && kinds.includes("axis") && kinds.includes("circular")) {
    return widgets.map((widget, index) => {
      const kind = getResponsiveChartKind(widget);
      if (index === 0 && kind === "axis") return { x: 0, y: 0, w: 7, h: 5 };
      if (kind === "circular") return { x: 7, y: 0, w: 5, h: 5 };
      return { x: 0, y: 5, w: 12, h: kind === "kpi" ? 2 : 4 };
    });
  }

  return null;
}

export function normalizeLayoutItems(layout = [], widgets = []) {
  const safeLayout = Array.isArray(layout) ? layout.filter(Boolean) : [];
  const safeWidgets = Array.isArray(widgets) ? widgets.filter(Boolean) : [];
  const widgetMap = new Map(safeWidgets.map((widget) => [widget.id, widget]));
  const normalized = safeLayout.map((item, index) => {
    const widget = widgetMap.get(item.i) ?? safeWidgets[index];
    const constraints = getChartLayoutConstraints(widget ?? {});
    const minW = Math.max(1, item.minW ?? widget?.layout?.minW ?? constraints.minW);
    const minH = Math.max(1, item.minH ?? widget?.layout?.minH ?? constraints.minH);
    let width = Math.max(minW, Math.min(item.w ?? widget?.layout?.w ?? 4, DASHBOARD_GRID_COLS));
    let height = Math.max(minH, item.h ?? widget?.layout?.h ?? 4);
    const kind = getResponsiveChartKind(widget ?? {});

    if (kind === "circular" && (width <= minW || height <= minH)) {
      const square = Math.max(minW, minH);
      width = Math.max(width, square);
      height = Math.max(height, square);
    } else if (kind !== "kpi" && width <= minW && height < minH) {
      height = minH;
    }

    const safeX = Math.max(0, Math.min(item.x ?? 0, DASHBOARD_GRID_COLS - width));
    const safeY = Math.max(0, item.y ?? 0);

    return {
      i: String(item.i ?? widget?.id ?? createInstanceId()),
      chartId: item.chartId ?? widget?.chartId,
      x: safeX,
      y: safeY,
      w: width,
      h: height,
      minW,
      minH,
      ...(item.titleOverride ?? widget?.layout?.titleOverride
        ? { titleOverride: item.titleOverride ?? widget?.layout?.titleOverride }
        : {}),
    };
  });

  normalized.sort((a, b) => (a.y - b.y) || (a.x - b.x));

  return normalized.map((item, index, items) => {
    let nextY = item.y;
    while (items.some((other, otherIndex) => otherIndex < index && collides({ ...item, y: nextY }, other))) {
      nextY += 1;
    }

    return { ...item, y: nextY };
  });
}

export function validateLayout(layout = []) {
  return layout.every((item, index) => {
    const inBounds =
      item.x >= 0 &&
      item.y >= 0 &&
      item.w > 0 &&
      item.h > 0 &&
      item.x + item.w <= DASHBOARD_GRID_COLS;

    if (!inBounds) return false;

    return !layout.some((other, otherIndex) => otherIndex !== index && collides(item, other));
  });
}

export function syncWidgetLayoutToDashboard(widgets = [], layout = []) {
  const layoutMap = new Map(layout.map((item) => [item.i, item]));
  return widgets.map((widget) => ({
    ...widget,
    layout: layoutMap.get(widget.id) ?? widget.layout,
  }));
}

export function autoArrangeDashboardLayout(widgets = []) {
  if (!widgets.length) return [];

  const preset = createBalancedPresetForWidgets(widgets) ?? getAutoLayoutPreset(widgets.length);
  const mappedLayout = widgets.map((widget, index) => ({
    i: widget.id,
    chartId: widget.chartId,
    x: preset[index].x,
    y: preset[index].y,
    w: preset[index].w,
    h: preset[index].h,
    minW: widget.layout?.minW ?? getChartLayoutConstraints(widget).minW,
    minH: widget.layout?.minH ?? getChartLayoutConstraints(widget).minH,
    ...(widget.layout?.titleOverride ? { titleOverride: widget.layout.titleOverride } : {}),
  }));

  const normalized = normalizeLayoutItems(mappedLayout, widgets);
  return validateLayout(normalized) ? normalized : normalizeLayoutItems(getAutoLayoutPreset(widgets.length).map((item, index) => ({
    ...item,
    i: widgets[index]?.id ?? createInstanceId(),
    chartId: widgets[index]?.chartId,
    minW: widgets[index]?.layout?.minW ?? 2,
    minH: widgets[index]?.layout?.minH ?? 3,
  })), widgets);
}
