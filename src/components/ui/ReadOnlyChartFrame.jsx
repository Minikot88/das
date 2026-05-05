import React from "react";
import ChartRenderer from "../charts/ChartRenderer";

const CHART_TYPE_LABELS = {
  line: "Line",
  area: "Area",
  bar: "Bar",
  "stacked-bar": "Stacked Bar",
  "grouped-bar": "Grouped Bar",
  pie: "Pie",
  doughnut: "Doughnut",
  donut: "Donut",
  scatter: "Scatter",
  bubble: "Bubble",
  heatmap: "Heatmap",
  histogram: "Histogram",
  radar: "Radar",
  gauge: "Gauge",
  funnel: "Funnel",
  table: "Table",
  kpi: "KPI",
};

export default function ReadOnlyChartFrame({ chart }) {
  const chartType = chart.type ?? chart.config?.type;
  const chartLabel = CHART_TYPE_LABELS[chartType] ?? chartType ?? "Chart";
  const xField = chart.mapping?.x || chart.mapping?.label || "Not set";
  const yField = chart.mapping?.y || chart.mapping?.value || chart.mapping?.bar || "Not set";
  const groupField = chart.mapping?.series || "None";
  const dataset = chart.dataset || "Unavailable";

  return (
    <article className="readonly-chart-frame" aria-label={`Shared chart: ${chart.title}`} role="listitem">
      <div className="readonly-chart-header">
        <div className="readonly-chart-title-row">
          <h2 className="readonly-chart-title">{chart.title}</h2>
          <div className="readonly-chart-tags" aria-label="Chart details">
            <span className="chart-type-badge">{chartLabel}</span>
            <span className="readonly-chart-tag">Read only</span>
          </div>
        </div>
        <div className="readonly-chart-meta">
          <span>Dataset: <strong>{dataset}</strong></span>
          <span>X: <strong>{xField}</strong></span>
          <span>Y: <strong>{yField}</strong></span>
          <span>Group: <strong>{groupField}</strong></span>
        </div>
      </div>
      <div className="readonly-chart-body">
        <ChartRenderer chart={chart} containerHeight={320} mode="readonly" />
      </div>
    </article>
  );
}
