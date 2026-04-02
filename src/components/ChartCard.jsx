/**
 * ChartCard.jsx
 * Card wrapper for a chart widget on the dashboard.
 * Provides drag handle, title, type badge, and remove action.
 */
import React from "react";
import ChartRenderer from "./ChartRenderer";

export default function ChartCard({ chart, onRemove }) {
  return (
    <div className="chart-card">
      {/* ── Header (doubles as drag handle) ── */}
      <div className="chart-card-header card-drag-handle">
        <div className="chart-card-title">
          <span className="drag-dots" title="Drag to move">⠿</span>
          <span className="chart-title-text">{chart.title}</span>
          <span className="chart-type-badge">{chart.type}</span>
        </div>
        <button
          className="chart-remove-btn"
          onClick={(e) => { e.stopPropagation(); onRemove(chart.id); }}
          title="Remove chart"
        >
          ×
        </button>
      </div>

      {/* ── Chart body ── */}
      <div className="chart-card-body">
        <ChartRenderer chart={chart} />
      </div>
    </div>
  );
}
