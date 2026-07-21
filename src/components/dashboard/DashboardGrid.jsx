import React, { useMemo } from "react";
import { Responsive, WidthProvider } from "react-grid-layout";
import ChartCard from "@/components/dashboard/ChartCard";
import {
  buildResponsiveLayouts,
  DASHBOARD_COMPACT_TYPE,
  DASHBOARD_GRID_MARGIN,
  DASHBOARD_GRID_PADDING,
  DASHBOARD_ROW_HEIGHT,
  getChartLayoutConstraints,
  GRID_BREAKPOINTS,
  GRID_COLUMNS,
  normalizeLayoutItems,
} from "@/utils/layoutUtils";
import { toDashboardChartModel } from "@/utils/dashboardWorkspace";

const ResponsiveGridLayout = WidthProvider(Responsive);

function itemPixelHeight(h) {
  return h * DASHBOARD_ROW_HEIGHT + (h - 1) * DASHBOARD_GRID_MARGIN[1];
}

export default function DashboardGrid({
  widgets = [],
  layout = [],
  selectedWidgetId = null,
  onSelectWidget,
  onOpenWidgetMenu,
  onLayoutChange,
  onLayoutPreviewChange,
  onExportCSV,
  onExportPNG,
  onEditChart,
  onWidgetDataPointClick,
  fullscreenChartId,
  onToggleFullscreen,
  onInsightData,
  isEditable = true,
  isSelectable = true,
  themeMode,
  showCardHeader = true,
  className = "",
}) {
  const normalizedLayout = useMemo(
    () => normalizeLayoutItems(layout, widgets),
    [layout, widgets]
  );
  const responsiveLayouts = useMemo(
    () => buildResponsiveLayouts(normalizedLayout),
    [normalizedLayout]
  );

  function handleLayoutChange(currentLayout) {
    const nextLayout = normalizeLayoutItems(currentLayout, widgets);
    onLayoutChange?.(nextLayout);
  }

  function handleLayoutPreviewChange(currentLayout) {
    const nextLayout = normalizeLayoutItems(currentLayout, widgets);
    onLayoutPreviewChange?.(nextLayout);
  }

  return (
    <ResponsiveGridLayout
      className={`dashboard-canvas-grid${isEditable ? "" : " is-readonly"}${className ? ` ${className}` : ""}`}
      layouts={responsiveLayouts}
      breakpoints={GRID_BREAKPOINTS}
      cols={GRID_COLUMNS}
      rowHeight={DASHBOARD_ROW_HEIGHT}
      margin={DASHBOARD_GRID_MARGIN}
      containerPadding={DASHBOARD_GRID_PADDING}
      isResizable={isEditable}
      isDraggable={isEditable}
      draggableHandle={showCardHeader ? ".card-drag-handle" : ".dashboard-widget-slot"}
      draggableCancel=".chart-card-controls, .card-actions-wrap, .card-actions-menu, button, input, textarea, select, a, [data-grid-drag-cancel='true']"
      resizeHandles={isEditable ? ["se"] : []}
      compactType={DASHBOARD_COMPACT_TYPE}
      verticalCompact={false}
      preventCollision={false}
      preventOverlap={false}
      isBounded={false}
      useCSSTransforms
      onDragStop={isEditable ? handleLayoutChange : undefined}
      onResizeStop={isEditable ? handleLayoutChange : undefined}
      onDrag={isEditable ? handleLayoutPreviewChange : undefined}
      onResize={isEditable ? handleLayoutPreviewChange : undefined}
    >
      {widgets.map((widget) => {
        const chart = toDashboardChartModel(widget);
        const constraints = getChartLayoutConstraints(chart);
        const layoutItem = normalizedLayout.find((item) => item.i === widget.id) ?? {
          i: widget.id,
          chartId: widget.chartId,
          x: 0,
          y: 0,
          w: 5,
          h: 5,
          minW: constraints.minW,
          minH: constraints.minH,
        };
        const gridItem = {
          i: layoutItem.i,
          chartId: layoutItem.chartId,
          x: layoutItem.x,
          y: layoutItem.y,
          w: layoutItem.w,
          h: layoutItem.h,
          minW: Math.max(layoutItem.minW ?? 1, constraints.minW),
          minH: Math.max(layoutItem.minH ?? 1, constraints.minH),
          maxH: constraints.maxH,
          ...(layoutItem.titleOverride ? { titleOverride: layoutItem.titleOverride } : {}),
        };
        const isSelected = widget.id === selectedWidgetId;

        return (
          <div
            key={widget.id}
            className={`dashboard-canvas-grid-item${isSelected ? " is-selected" : ""}`}
            data-grid={gridItem}
          >
            <div
              className={`dashboard-widget-slot${isSelected ? " is-selected" : ""}`}
              onClick={isSelectable ? () => onSelectWidget?.(widget.id) : undefined}
              onContextMenu={isEditable ? (event) => onOpenWidgetMenu?.(widget, event) : undefined}
            >
              <ChartCard
                chart={chart}
                pixelHeight={itemPixelHeight(gridItem.h ?? 4)}
                sheetId={chart.sheetId}
                onExportCSV={onExportCSV}
                onExportPNG={onExportPNG}
                onEditChart={isEditable ? onEditChart : undefined}
                onInsightData={onInsightData}
                onDataPointClick={onWidgetDataPointClick}
                isFullscreen={fullscreenChartId === widget.id}
                onToggleFullscreen={isEditable ? () => onToggleFullscreen?.(widget.id) : undefined}
                themeMode={themeMode}
                showCardHeader={showCardHeader}
              />
            </div>
          </div>
        );
      })}
    </ResponsiveGridLayout>
  );
}
