/**
 * ChartSkeleton.jsx — Animated loading placeholder for chart cards.
 */
import React from "react";

export default function ChartSkeleton({ height = 300 }) {
  return (
    <div className="chart-skeleton" style={{ height }} aria-label="Loading chart" aria-busy="true">
      <div className="skeleton-header">
        <div className="skeleton-line" style={{ width: "55%", height: 12 }} />
        <div className="skeleton-line" style={{ width: "18%", height: 12 }} />
      </div>
      <div className="skeleton-body">
        {/* Fake bar chart bars */}
        {[60, 85, 45, 95, 70, 55, 80].map((h, i) => (
          <div
            key={i}
            className="skeleton-bar"
            style={{ height: `${h}%`, animationDelay: `${i * 0.08}s` }}
          />
        ))}
      </div>
    </div>
  );
}
