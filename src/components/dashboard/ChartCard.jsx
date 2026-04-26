import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import ChartRenderer from "../charts/ChartRenderer";
import ChartSkeleton from "../charts/ChartSkeleton";
import CardActions from "./CardActions";
import { getChartPalette } from "../../utils/chartPalette";

const ChartCard = memo(function ChartCard({
  chart,
  pixelHeight,
  sheetId,
  filters,
  onExportCSV,
  onExportPNG,
  onInsightData,
  drilldown = null,
  onDrilldown,
  isFullscreen = false,
  onToggleFullscreen,
  themeMode,
}) {
  const [loaded, setLoaded] = useState(false);
  const [renderRows, setRenderRows] = useState([]);
  const lastRowsKeyRef = useRef("");
  const cardRef = useRef(null);
  const bodyRef = useRef(null);
  const resizeFrameRef = useRef(0);
  const [bodyHeight, setBodyHeight] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const bodyElement = bodyRef.current;
    if (!bodyElement) return undefined;

    const updateBodyHeight = () => {
      if (resizeFrameRef.current) cancelAnimationFrame(resizeFrameRef.current);
      resizeFrameRef.current = requestAnimationFrame(() => {
        resizeFrameRef.current = 0;
        const nextHeight = Math.round(bodyElement.clientHeight);
        if (!nextHeight) return;
        setBodyHeight((current) => (current === nextHeight ? current : nextHeight));
      });
    };

    updateBodyHeight();

    const resizeObserver = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => {
          updateBodyHeight();
        })
      : null;

    resizeObserver?.observe(bodyElement);
    window.addEventListener("resize", updateBodyHeight);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateBodyHeight);
      if (resizeFrameRef.current) cancelAnimationFrame(resizeFrameRef.current);
      resizeFrameRef.current = 0;
    };
  }, [pixelHeight]);

  const accent = getChartPalette(chart.colorTheme).single;
  const contentHeight = Math.max(180, bodyHeight || (pixelHeight - 42));

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

      <div
        className={`chart-card-header${isFullscreen ? "" : " card-drag-handle"}`}
        onDoubleClick={onToggleFullscreen}
      >
        <div className="chart-card-title">
          <span className="chart-title-text">{chart.title}</span>
        </div>
        {(onExportCSV || onExportPNG || onToggleFullscreen) ? (
          <div className="chart-card-controls" data-export-ignore="true">
            <CardActions
              chart={chart}
              sheetId={sheetId}
              cardRef={cardRef}
              onExportCSV={(activeChart) => onExportCSV?.(activeChart, renderRows)}
              onExportPNG={onExportPNG}
              onToggleFullscreen={onToggleFullscreen}
              isFullscreen={isFullscreen}
            />
          </div>
        ) : null}
      </div>

      <div ref={bodyRef} className="chart-card-body">
        {!loaded ? (
          <ChartSkeleton height={contentHeight} />
        ) : (
          <ChartRenderer
            chart={chart}
            data={Array.isArray(chart.data) && chart.data.length > 0
              ? chart.data
              : Array.isArray(chart.queryResult?.rows)
                ? chart.queryResult.rows
                : undefined}
            containerHeight={contentHeight}
            filters={filters}
            drilldown={drilldown}
            onDrilldown={onDrilldown}
            onDataReady={handleDataReady}
            chrome="minimal"
            themeMode={themeMode}
          />
        )}
      </div>
    </div>
  );
});

export default ChartCard;
