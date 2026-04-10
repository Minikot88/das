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
}) {
  const responsiveLayouts = buildResponsiveLayouts(layout);

  function handleLayoutChange(currentLayout, allLayouts) {
    const nextLayout = normalizeLayoutItems(allLayouts?.lg ?? currentLayout, widgets);
    onLayoutChange?.(nextLayout);
  }

  return (
    <ResponsiveGridLayout
      className="dashboard-canvas-grid"
      layouts={responsiveLayouts}
      breakpoints={GRID_BREAKPOINTS}
      cols={GRID_COLUMNS}
      rowHeight={DASHBOARD_ROW_HEIGHT}
      margin={DASHBOARD_GRID_MARGIN}
      containerPadding={DASHBOARD_GRID_PADDING}
      isResizable
      isDraggable
      compactType={DASHBOARD_COMPACT_TYPE}
      preventCollision={false}
      onLayoutChange={handleLayoutChange}
    >
      {widgets.map((widget) => {
        const layoutItem = layout.find((item) => item.i === widget.id) ?? {
          i: widget.id,
          chartId: widget.chartId,
          x: 0,
          y: 0,
          w: 6,
          h: 4,
          minW: 2,
          minH: 3,
        };
        const chart = toDashboardChartModel(widget);

        return (
          <div key={widget.id} className="dashboard-canvas-grid-item" data-grid={layoutItem}>
            <div
              className={`dashboard-widget-slot${widget.id === selectedWidgetId ? " is-selected" : ""}`}
              onClick={() => onSelectWidget?.(widget.id)}
              onContextMenu={(event) => onOpenWidgetMenu?.(widget, event)}
            >
              <ChartCard
                chart={chart}
                pixelHeight={itemPixelHeight(layoutItem.h ?? 4)}
                sheetId={chart.sheetId}
                onExportCSV={onExportCSV}
                onExportPNG={onExportPNG}
                onInsightData={onInsightData}
                isFullscreen={fullscreenChartId === widget.id}
                onToggleFullscreen={() => onToggleFullscreen?.(widget.id)}
              />
            </div>
          </div>
        );
      })}
    </ResponsiveGridLayout>
  );
}
