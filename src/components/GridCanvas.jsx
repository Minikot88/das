/**
 * GridCanvas.jsx
 * Drag-and-resize grid for dashboard widgets using react-grid-layout v2.
 * Reads/writes layout from the active sheet in the Zustand store.
 */
import React, { useCallback } from "react";
import { ResponsiveGridLayout, useContainerWidth } from "react-grid-layout";
import ChartCard from "./ChartCard";
import { useStore } from "../store/useStore";

export default function GridCanvas({ sheet }) {
  const updateLayout = useStore((s) => s.updateLayout);
  const removeChart  = useStore((s) => s.removeChart);

  const { width, containerRef, mounted } = useContainerWidth();

  const handleLayoutChange = useCallback(
    (_cur, allLayouts) => updateLayout(sheet.id, allLayouts.lg ?? _cur),
    [sheet.id, updateLayout]
  );

  const handleRemove = useCallback(
    (chartId) => removeChart(sheet.id, chartId),
    [sheet.id, removeChart]
  );

  return (
    <div ref={containerRef} style={{ width: "100%" }}>
      {mounted && (
        <ResponsiveGridLayout
          width={width}
          layouts={{ lg: sheet.layout }}
          breakpoints={{ lg: 1200, md: 992, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={80}
          margin={[12, 12]}
          onLayoutChange={handleLayoutChange}
          dragConfig={{ handle: ".card-drag-handle" }}
          autoSize
        >
          {sheet.charts.map((chart) => (
            <div key={chart.id}>
              <ChartCard chart={chart} onRemove={handleRemove} />
            </div>
          ))}
        </ResponsiveGridLayout>
      )}
    </div>
  );
}
