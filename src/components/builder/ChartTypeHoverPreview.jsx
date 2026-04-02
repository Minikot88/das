import React from "react";
import ChartRenderer from "../charts/ChartRendererV2";
import { getChartPreviewSeed } from "../../utils/chartCatalog";

export default function ChartTypeHoverPreview({ chart }) {
  if (!chart) return null;

  const previewSeed = getChartPreviewSeed(chart.id);

  return (
    <div className="builder-chart-hover-preview" role="tooltip">
      <div className="builder-chart-hover-preview-head">
        <strong>{chart.name}</strong>
        <span>{chart.previewSupported === false ? "Preview limited" : chart.category}</span>
      </div>
      <div className="builder-chart-hover-preview-canvas">
        <ChartRenderer
          chart={previewSeed.config}
          data={previewSeed.rows}
          containerHeight={140}
          mode="readonly"
        />
      </div>
    </div>
  );
}
