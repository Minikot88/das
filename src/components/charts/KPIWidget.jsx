/**
 * components/charts/KPIWidget.jsx
 * Visual widget for single-value data points.
 */
import React from "react";

function formatValue(value) {
  if (typeof value === "number") {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return value.toLocaleString();
  }
  return value ?? "";
}

export default function KPIWidget({ title, value }) {
  return (
    <div className="kpi-widget">
      <div className="kpi-label">{title}</div>
      <div className="kpi-value">{formatValue(value)}</div>
      <div className="kpi-caption">Single metric snapshot</div>
    </div>
  );
}

