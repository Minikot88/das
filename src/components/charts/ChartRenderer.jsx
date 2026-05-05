import React from "react";
import ChartErrorBoundary from "./ChartErrorBoundary";
import ChartJsRenderer from "./ChartJsRenderer";
import KPIWidget from "./KPIWidget";

export default function ChartRenderer({ chart = {}, config, containerHeight, height, className = "", onChartReady }) {
  const resolvedHeight = containerHeight ?? height ?? 320;
  const resolvedConfig = config ?? chart.config ?? null;

  if (chart.type === "kpi") {
    return (
      <ChartErrorBoundary>
        <KPIWidget chart={chart} className={className} />
      </ChartErrorBoundary>
    );
  }

  if (chart.engine === "chartjs" || resolvedConfig) {
    return (
      <ChartErrorBoundary>
        <ChartJsRenderer
          chart={chart}
          config={resolvedConfig}
          height={resolvedHeight}
          className={className}
          onChartReady={onChartReady}
        />
      </ChartErrorBoundary>
    );
  }

  return (
    <div className="chart-status-card">
      <span className="chart-status-kicker">Chart</span>
      <strong className="chart-status-title">Unsupported renderer</strong>
      <p className="chart-status-description">This chart does not have a supported rendering engine.</p>
    </div>
  );
}
