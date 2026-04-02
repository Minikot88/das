/**
 * components/dashboard/ChartCardV2.jsx
 * Active chart card wrapper with export-ready render data.
 */
import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import ChartRenderer from "../charts/ChartRendererV2";
import ChartSkeleton from "../charts/ChartSkeleton";
import CardActions from "./CardActionsV2";
import { describeDrilldown } from "../../utils/chartUtils";

const CHART_TYPE_LABELS = {
  line: "Line",
  area: "Area",
  bar: "Bar",
  "stacked-bar": "Stacked",
  "grouped-bar": "Grouped",
  pie: "Pie",
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

const THEME_ACCENTS = {
  default: "#1677ff",
  vibrant: "#ff4d4f",
  pastel: "#aec6cf",
  dark: "#4fc3f7",
  ocean: "#0a9396",
  warm: "#e63946",
};

const ChartCardV2 = memo(function ChartCardV2({
  chart,
  pixelHeight,
  sheetId,
  filters,
  onExportCSV,
  onExportPNG,
  onInsightData,
  drilldown = null,
  onDrilldown,
  onResetDrilldown,
  isFullscreen = false,
  onToggleFullscreen,
}) {
  const [loaded, setLoaded] = useState(false);
  const [renderRows, setRenderRows] = useState([]);
  const cardRef = useRef(null);
  const lastRowsKeyRef = useRef("");

  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const accent = THEME_ACCENTS[chart.colorTheme] ?? THEME_ACCENTS.default;
  const contentHeight = Math.max(180, pixelHeight - 52 - (drilldown ? 64 : 0));
  const chartType = chart.chartType ?? chart.type;
  const chartDataset = chart.dataset ?? chart.table;

  const handleDataReady = useCallback((rows) => {
    const nextRows = rows ?? [];
    const nextKey = JSON.stringify(nextRows);

    if (lastRowsKeyRef.current === nextKey) return;

    lastRowsKeyRef.current = nextKey;
    setRenderRows(nextRows);
    onInsightData?.(chart, nextRows);
  }, [chart, onInsightData]);

  return (
    <div
      className={`chart-card${isFullscreen ? " is-fullscreen" : ""}`}
      ref={cardRef}
      style={{ height: pixelHeight, "--card-accent": accent }}
      role="article"
      aria-label={`Chart: ${chart.title}`}
    >
      <div className="chart-card-accent-bar" style={{ background: accent }} />

      <div className={`chart-card-header${isFullscreen ? "" : " card-drag-handle"}`}>
        <div className="chart-card-title-block">
          <div className="chart-card-title-stack">
            <div className="chart-card-title">
              {!isFullscreen ? <span className="drag-dots" aria-hidden="true">::</span> : null}
              <span className="chart-title-text">{chart.title}</span>
            </div>
            <div className="chart-card-subline">
              {chartDataset ? <span>{chartDataset}</span> : null}
              {chart.colorTheme && chart.colorTheme !== "default" ? <span>{chart.colorTheme}</span> : null}
              {drilldown ? <span>Drill-down</span> : null}
            </div>
          </div>
          <div className="chart-card-meta-row">
            <span className="chart-type-badge" title={chartType}>
              {CHART_TYPE_LABELS[chartType] ?? chartType}
            </span>
            {drilldown ? <span className="chart-theme-badge chart-drilldown-badge">Drilled</span> : null}
          </div>
        </div>
        <div className="chart-card-controls">
          <CardActions
            chart={chart}
            sheetId={sheetId}
            cardRef={cardRef}
            onExportCSV={(activeChart) => onExportCSV(activeChart, renderRows)}
            onExportPNG={onExportPNG}
            onToggleFullscreen={onToggleFullscreen}
            isFullscreen={isFullscreen}
          />
          {onToggleFullscreen ? (
            <button
              type="button"
              className="chart-card-control-btn"
              onClick={onToggleFullscreen}
              aria-label={isFullscreen ? "Exit fullscreen" : "Open fullscreen"}
              title={isFullscreen ? "Exit fullscreen" : "Open fullscreen"}
            >
              {isFullscreen ? "[]-" : "[]"}
            </button>
          ) : null}
        </div>
      </div>

      <div className="chart-card-body">
        {drilldown ? (
          <div className="chart-drilldown-banner" role="status" aria-live="polite">
            <div className="chart-drilldown-copy">
              <span className="chart-drilldown-kicker">Drill-down</span>
              <strong className="chart-drilldown-title">{describeDrilldown(drilldown)}</strong>
            </div>
            <button
              type="button"
              className="chart-drilldown-reset"
              onClick={onResetDrilldown}
            >
              Back to chart
            </button>
          </div>
        ) : null}

        {!loaded ? (
          <ChartSkeleton height={contentHeight} />
        ) : (
          <ChartRenderer
            chart={chart}
            containerHeight={contentHeight}
            filters={filters}
            drilldown={drilldown}
            onDrilldown={onDrilldown}
            onDataReady={handleDataReady}
          />
        )}
      </div>
    </div>
  );
});

export default ChartCardV2;
