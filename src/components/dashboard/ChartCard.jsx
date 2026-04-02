/**
 * components/dashboard/ChartCard.jsx
 * Wrapper for individual chart components in the dashboard.
 */
import React, { useState, useEffect, useRef, memo } from "react";
import ChartRenderer from "../charts/ChartRenderer";
import ChartSkeleton from "../charts/ChartSkeleton";
import CardActions from "./CardActions";

const CHART_TYPE_ICONS = {
  line: "📈", area: "📉", bar: "📊", stacked_bar: "📦", grouped_bar: "🗂",
  pie: "🥧", donut: "🍩", scatter: "✦", heatmap: "🟥", kpi: "💎"
};

const THEME_ACCENTS = {
  default: "#1677ff", vibrant: "#ff4d4f", pastel: "#aec6cf",
  dark: "#4fc3f7", ocean: "#0a9396", warm: "#e63946",
};

const ChartCard = memo(function ChartCard({ 
  chart, 
  pixelHeight, 
  sheetId, 
  filters, 
  onExportCSV, 
  onExportPNG 
}) {
  const [loaded, setLoaded] = useState(false);
  const cardRef             = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 100);
    return () => clearTimeout(t);
  }, []);

  const accent = THEME_ACCENTS[chart.colorTheme] ?? THEME_ACCENTS.default;

  return (
    <div
      className="chart-card"
      ref={cardRef}
      style={{ height: pixelHeight, "--card-accent": accent }}
      role="article"
      aria-label={`Chart: ${chart.title}`}
    >
      <div className="chart-card-accent-bar" style={{ background: accent }} />

      <div className="chart-card-header card-drag-handle">
        <div className="chart-card-title">
          <span className="drag-dots" aria-hidden="true">⠿</span>
          <span className="chart-title-text">{chart.title}</span>
          <span className="chart-type-badge" title={chart.type}>
            {CHART_TYPE_ICONS[chart.type] ?? "📊"} {chart.type}
          </span>
          {chart.colorTheme && chart.colorTheme !== "default" && (
            <span className="chart-theme-badge">{chart.colorTheme}</span>
          )}
        </div>
        <CardActions 
          chart={chart} 
          sheetId={sheetId} 
          cardRef={cardRef} 
          onExportCSV={onExportCSV} 
          onExportPNG={onExportPNG} 
        />
      </div>

      <div className="chart-card-body">
        {!loaded
          ? <ChartSkeleton height={pixelHeight - 52} />
          : <ChartRenderer chart={chart} containerHeight={pixelHeight - 52} filters={filters} />
        }
      </div>
    </div>
  );
});

export default ChartCard;
