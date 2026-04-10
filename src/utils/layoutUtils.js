import { createInstanceId } from "./id";

export const GRID_BREAKPOINTS = { lg: 1280, md: 960, sm: 640, xs: 0 };
export const GRID_COLUMNS = { lg: 12, md: 12, sm: 6, xs: 1 };
export const DASHBOARD_GRID_COLS = 12;
export const DASHBOARD_GRID_MARGIN = [12, 12];
export const DASHBOARD_GRID_PADDING = [0, 0];
export const DASHBOARD_ROW_HEIGHT = 84;
export const DASHBOARD_COMPACT_TYPE = "vertical";

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
  return {
    lg: safeLayout,
    md: safeLayout.map((item) => ({ ...item, x: Math.min(item.x ?? 0, 6), w: Math.min(item.w ?? 6, 6) })),
    sm: safeLayout.map((item) => ({ ...item, x: 0, w: 6 })),
    xs: safeLayout.map((item) => ({ ...item, x: 0, w: 1 })),
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
  const width = overrides.w ?? 4;
  const height = overrides.h ?? 4;
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
          minW: 2,
          minH: 3,
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
    minW: 2,
    minH: 3,
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

export function normalizeLayoutItems(layout = [], widgets = []) {
  const safeLayout = Array.isArray(layout) ? layout.filter(Boolean) : [];
  const safeWidgets = Array.isArray(widgets) ? widgets.filter(Boolean) : [];
  const widgetMap = new Map(safeWidgets.map((widget) => [widget.id, widget]));
  const normalized = safeLayout.map((item, index) => {
    const widget = widgetMap.get(item.i) ?? safeWidgets[index];
    const width = Math.max(1, Math.min(item.w ?? widget?.layout?.w ?? 4, DASHBOARD_GRID_COLS));
    const height = Math.max(1, item.h ?? widget?.layout?.h ?? 4);
    const safeX = Math.max(0, Math.min(item.x ?? 0, DASHBOARD_GRID_COLS - width));
    const safeY = Math.max(0, item.y ?? 0);

    return {
      i: String(item.i ?? widget?.id ?? createInstanceId()),
      chartId: item.chartId ?? widget?.chartId,
      x: safeX,
      y: safeY,
      w: width,
      h: height,
      minW: Math.max(1, item.minW ?? widget?.layout?.minW ?? 2),
      minH: Math.max(1, item.minH ?? widget?.layout?.minH ?? 3),
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

  const preset = getAutoLayoutPreset(widgets.length);
  const mappedLayout = widgets.map((widget, index) => ({
    i: widget.id,
    chartId: widget.chartId,
    x: preset[index].x,
    y: preset[index].y,
    w: preset[index].w,
    h: preset[index].h,
    minW: widget.layout?.minW ?? 2,
    minH: widget.layout?.minH ?? 3,
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
