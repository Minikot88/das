import React from "react";

export default function ChartSkeleton({ height = 320 }) {
  const resolvedHeight = typeof height === "number" ? `${height}px` : height;

  return (
    <div className="chart-status-card" style={{ minHeight: resolvedHeight, height: resolvedHeight }}>
      <span className="chart-status-kicker">Loading</span>
      <strong className="chart-status-title">Preparing chart</strong>
      <p className="chart-status-description">Generating a fresh Chart.js preview.</p>
    </div>
  );
}

