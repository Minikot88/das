/**
 * components/dashboard/DashboardGrid.jsx
 * Responsive grid layout for dashboard charts.
 */
import React, { useMemo, useCallback, useEffect, useRef, useState } from "react";
import { Responsive, WidthProvider } from "react-grid-layout";
import ChartCard from "./ChartCardV2";

const ResponsiveGridLayout = WidthProvider(Responsive);

const BREAKPOINTS = { lg: 1200, md: 900, sm: 600, xs: 0 };
const COLS        = { lg: 12,   md: 10,  sm: 6,   xs: 2 };
const ROW_HEIGHT  = 80;
const MARGIN      = [12, 12];
const DEFAULT_ITEM = { x: 0, y: 9999, w: 4, h: 4, minW: 2, minH: 3 };

function itemPixelHeight(h) {
  return h * ROW_HEIGHT + (h - 1) * MARGIN[1];
}

function sanitizeLayoutItem(item = {}, fallback = {}) {
  const rawWidth = Number.isFinite(item?.w) ? item.w : (fallback.w ?? DEFAULT_ITEM.w);
  const width = Math.max(item?.minW ?? fallback.minW ?? DEFAULT_ITEM.minW, rawWidth);
  const maxX = Math.max(DEFAULT_ITEM.x, COLS.lg - width);

  return {
    ...DEFAULT_ITEM,
    ...fallback,
    ...item,
    x: Math.max(DEFAULT_ITEM.x, Math.min(maxX, Number.isFinite(item?.x) ? item.x : (fallback.x ?? DEFAULT_ITEM.x))),
    y: Math.max(DEFAULT_ITEM.y, Number.isFinite(item?.y) ? item.y : (fallback.y ?? DEFAULT_ITEM.y)),
    w: width,
    h: Math.max(item?.minH ?? fallback.minH ?? DEFAULT_ITEM.minH, Number.isFinite(item?.h) ? item.h : (fallback.h ?? DEFAULT_ITEM.h)),
    minW: item?.minW ?? fallback.minW ?? DEFAULT_ITEM.minW,
    minH: item?.minH ?? fallback.minH ?? DEFAULT_ITEM.minH,
  };
}

function normalizeCanonicalLayout(layout = [], charts = []) {
  const layoutMap = new Map(layout.map((item) => [item.i, sanitizeLayoutItem(item)]));

  return charts.map((chart, index) => {
    const existing = layoutMap.get(chart.id);
    if (existing) {
      return { ...existing, i: chart.id };
    }

    return sanitizeLayoutItem({
      i: chart.id,
      x: (index * DEFAULT_ITEM.w) % COLS.lg,
      y: 9999,
    });
  });
}

function buildResponsiveLayouts(lgLayout) {
  if (!lgLayout?.length) return { lg: [], md: [], sm: [], xs: [] };
  const mdLayout = lgLayout.map((item) => ({
    ...item,
    x: Math.min(item.x, Math.max(0, COLS.md - Math.min(item.w, COLS.md))),
    w: Math.min(item.w, COLS.md),
  }));
  const sortedBySm = [...lgLayout].sort((a, b) => a.y - b.y || a.x - b.x);
  let smY = 0;
  const smLayout = sortedBySm.map((item) => {
    const newItem = { ...item, x: 0, w: COLS.sm, y: smY, h: item.h };
    smY += item.h;
    return newItem;
  });
  let xsY = 0;
  const xsLayout = sortedBySm.map((item) => {
    const newItem = { ...item, x: 0, w: COLS.xs, y: xsY, h: Math.max(item.h, 3) };
    xsY += newItem.h;
    return newItem;
  });
  return { lg: lgLayout, md: mdLayout, sm: smLayout, xs: xsLayout };
}

export default function DashboardGrid({
  sheet,
  sheetId,
  onLayoutChange,
  filters,
  onExportCSV,
  onExportPNG,
  onInsightData,
  drilldownByChartId,
  onChartDrilldown,
  onResetChartDrilldown,
  fullscreenChartId,
  onToggleFullscreen,
}) {
  const [draftLayout, setDraftLayout] = useState(null);
  const [isInteracting, setIsInteracting] = useState(false);
  const [activeBreakpoint, setActiveBreakpoint] = useState("lg");
  const previewLayoutsRef = useRef({ lg: [] });
  const canonicalLayout = useMemo(
    () => normalizeCanonicalLayout(sheet.layout ?? [], sheet.charts ?? []),
    [sheet.layout, sheet.charts]
  );
  const activeLayout = useMemo(
    () => (isInteracting && draftLayout ? draftLayout : canonicalLayout),
    [canonicalLayout, draftLayout, isInteracting]
  );
  const layouts = useMemo(() => buildResponsiveLayouts(activeLayout), [activeLayout]);

  useEffect(() => {
    previewLayoutsRef.current = buildResponsiveLayouts(canonicalLayout);
  }, [canonicalLayout]);

  const handleLayoutPreview = useCallback((_currentLayout, allLayouts) => {
    const responsiveLayouts = {
      lg: normalizeCanonicalLayout(allLayouts?.lg ?? (activeBreakpoint === "lg" ? _currentLayout : canonicalLayout), sheet.charts ?? []),
      md: allLayouts?.md ?? [],
      sm: allLayouts?.sm ?? [],
      xs: allLayouts?.xs ?? [],
    };
    previewLayoutsRef.current = responsiveLayouts;

    const nextLg = responsiveLayouts.lg;
    if (isInteracting) {
      setDraftLayout(nextLg);
    }
  }, [activeBreakpoint, canonicalLayout, isInteracting, sheet.charts]);

  const beginInteraction = useCallback(() => {
    setIsInteracting(true);
    setDraftLayout(canonicalLayout);
    previewLayoutsRef.current = buildResponsiveLayouts(canonicalLayout);
  }, [canonicalLayout]);

  const handleLayoutCommit = useCallback((layout) => {
    const nextLg = normalizeCanonicalLayout(
      previewLayoutsRef.current.lg?.length
        ? previewLayoutsRef.current.lg
        : (activeBreakpoint === "lg" ? layout : canonicalLayout),
      sheet.charts ?? []
    );
    setDraftLayout(null);
    setIsInteracting(false);
    onLayoutChange(nextLg);
  }, [activeBreakpoint, canonicalLayout, onLayoutChange, sheet.charts]);

  return (
    <div className="dashboard-grid-wrap">
      <ResponsiveGridLayout
        className={`dashboard-rgl${isInteracting ? " is-interacting" : ""}`}
        layouts={layouts}
        breakpoints={BREAKPOINTS}
        cols={COLS}
        onBreakpointChange={setActiveBreakpoint}
        rowHeight={ROW_HEIGHT}
        margin={MARGIN}
        containerPadding={[0, 0]}
        onLayoutChange={handleLayoutPreview}
        onDragStart={beginInteraction}
        onDragStop={(_layout, _oldItem, _newItem, _placeholder, event, element) => {
          void event;
          void element;
          handleLayoutCommit(_layout);
        }}
        onResizeStart={beginInteraction}
        onResizeStop={(_layout, _oldItem, _newItem, _placeholder, event, element) => {
          void event;
          void element;
          handleLayoutCommit(_layout);
        }}
        draggableHandle=".card-drag-handle"
        resizeHandles={["se"]}
        isDraggable
        isResizable
        preventCollision
        compactType="vertical"
        useCSSTransforms
        isBounded
      >
        {sheet.charts.map((chart) => {
          const lItem      = activeLayout.find((l) => l.i === chart.id);
          const pixelH     = lItem ? itemPixelHeight(lItem.h) : itemPixelHeight(4);
          return (
            <div key={chart.id} className="rgl-item" data-grid={lItem ?? { ...DEFAULT_ITEM, i: chart.id }}>
              <ChartCard
                chart={chart}
                pixelHeight={pixelH}
                sheetId={sheetId}
                filters={filters}
                onExportCSV={onExportCSV}
                onExportPNG={onExportPNG}
                onInsightData={onInsightData}
                drilldown={drilldownByChartId?.[chart.id] ?? null}
                onDrilldown={(drilldown) => onChartDrilldown?.(chart.id, drilldown)}
                onResetDrilldown={() => onResetChartDrilldown?.(chart.id)}
                isFullscreen={fullscreenChartId === chart.id}
                onToggleFullscreen={() => onToggleFullscreen?.(chart.id)}
              />
            </div>
          );
        })}
      </ResponsiveGridLayout>
    </div>
  );
}
