import React from "react";
import { Responsive, WidthProvider } from "react-grid-layout";
import ChartCard from "./ChartCard";
import {
  buildResponsiveLayouts,
  DASHBOARD_COMPACT_TYPE,
  DASHBOARD_GRID_MARGIN,
  DASHBOARD_GRID_PADDING,
  DASHBOARD_ROW_HEIGHT,
  GRID_BREAKPOINTS,
  GRID_COLUMNS,
  normalizeLayoutItems,
} from "../../utils/layoutUtils";
import { toDashboardChartModel } from "../../utils/dashboardWorkspace";

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
  onExportCSV,
  onExportPNG,
  fullscreenChartId,
  onToggleFullscreen,
  onInsightData,
  isEditable = true,
  isSelectable = true,
  themeMode,
  className = "",
}) {
  const responsiveLayouts = buildResponsiveLayouts(layout);

  function handleLayoutChange(currentLayout, allLayouts) {
    const nextLayout = normalizeLayoutItems(allLayouts?.lg ?? currentLayout, widgets);
    onLayoutChange?.(nextLayout);
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
      draggableHandle=".card-drag-handle"
      compactType={DASHBOARD_COMPACT_TYPE}
      preventCollision={false}
      onLayoutChange={isEditable ? handleLayoutChange : undefined}
    >
      {widgets.map((widget) => {
        const layoutItem = layout.find((item) => item.i === widget.id) ?? {
          i: widget.id,
          chartId: widget.chartId,
          x: 0,
          y: 0,
          w: 6,
          h: 5,
          minW: 3,
          minH: 4,
        };
        const chart = toDashboardChartModel(widget);

        return (
          <div key={widget.id} className="dashboard-canvas-grid-item" data-grid={layoutItem}>
            <div
              className={`dashboard-widget-slot${widget.id === selectedWidgetId ? " is-selected" : ""}`}
              onClick={isSelectable ? () => onSelectWidget?.(widget.id) : undefined}
              onContextMenu={isEditable ? (event) => onOpenWidgetMenu?.(widget, event) : undefined}
            >
              <ChartCard
                chart={chart}
                pixelHeight={itemPixelHeight(layoutItem.h ?? 4)}
                sheetId={chart.sheetId}
                onExportCSV={onExportCSV}
                onExportPNG={onExportPNG}
                onInsightData={onInsightData}
                isFullscreen={fullscreenChartId === widget.id}
                onToggleFullscreen={isEditable ? () => onToggleFullscreen?.(widget.id) : undefined}
                themeMode={themeMode}
              />
            </div>
          </div>
        );
      })}
    </ResponsiveGridLayout>
  );
}
