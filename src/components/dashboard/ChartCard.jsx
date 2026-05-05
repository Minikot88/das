import React, { memo, useEffect, useRef, useState } from "react";
import ChartRenderer from "../charts/ChartRenderer";
import ChartSkeleton from "../charts/ChartSkeleton";
import CardActions from "./CardActions";
import { pickChartColor } from "../../utils/chartPalette";

const ChartCard = memo(function ChartCard({
  chart,
  pixelHeight,
  sheetId,
  filters,
  onExportCSV,
  onExportPNG,
  onInsightData,
  isFullscreen = false,
  onToggleFullscreen,
  themeMode,
}) {
  const [loaded, setLoaded] = useState(false);
  const cardRef = useRef(null);
  const bodyRef = useRef(null);
  const resizeFrameRef = useRef(0);
  const [bodyHeight, setBodyHeight] = useState(0);
  const rows = Array.isArray(chart.rows)
    ? chart.rows
    : Array.isArray(chart.data)
      ? chart.data
      : Array.isArray(chart.config?.rows)
        ? chart.config.rows
        : [];

  useEffect(() => {
    const timer = window.setTimeout(() => setLoaded(true), 80);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    onInsightData?.(chart, rows);
  }, [chart, onInsightData, rows]);

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
      ? new ResizeObserver(() => updateBodyHeight())
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

  const accent = chart.settings?.datasetColors?.[0] || pickChartColor(0);
  const contentHeight = Math.max(180, bodyHeight || (pixelHeight - 42));
  const cardBackground = chart.settings?.cardBackground || chart.config?.meta?.settings?.cardBackground || "";

  return (
    <div
      className={`chart-card${isFullscreen ? " is-fullscreen" : ""}`}
      ref={cardRef}
      style={{
        height: pixelHeight,
        "--card-accent": accent,
        ...(cardBackground ? { "--chart-card-surface": cardBackground, background: cardBackground } : {}),
      }}
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
              onExportCSV={(activeChart) => onExportCSV?.(activeChart, rows)}
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
            height={contentHeight}
            filters={filters}
            chrome="minimal"
            themeMode={themeMode}
          />
        )}
      </div>
    </div>
  );
});

export default ChartCard;
