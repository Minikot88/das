import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import ChartRenderer from "@/components/charts/ChartRenderer";
import ChartSkeleton from "@/components/charts/ChartSkeleton";
import CardActions from "@/components/dashboard/CardActions";
import { pickChartColor } from "@/utils/chartPalette";
import { getResponsiveChartKind } from "@/utils/layoutUtils";

function accessibleCellValue(value) {
  if (value === null || typeof value === "undefined") return "";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

const ChartCard = memo(function ChartCard({
  chart,
  pixelHeight,
  sheetId,
  filters,
  onExportCSV,
  onExportPNG,
  onEditChart,
  onInsightData,
  onDataPointClick,
  isFullscreen = false,
  onToggleFullscreen,
  themeMode,
  showCardHeader = true,
}) {
  const [loaded, setLoaded] = useState(false);
  const cardRef = useRef(null);
  const bodyRef = useRef(null);
  const resizeFrameRef = useRef(0);
  const [bodySize, setBodySize] = useState({ width: 0, height: 0 });
  const rows = useMemo(
    () => Array.isArray(chart.rows)
      ? chart.rows
      : Array.isArray(chart.data)
        ? chart.data
        : Array.isArray(chart.config?.rows)
          ? chart.config.rows
          : [],
    [chart]
  );
  const accessibleColumns = useMemo(() => {
    const columns = [];
    const seen = new Set();
    rows.slice(0, 20).forEach((row) => {
      if (!row || typeof row !== "object" || Array.isArray(row)) return;
      Object.keys(row).forEach((key) => {
        if (!seen.has(key) && columns.length < 12) {
          seen.add(key);
          columns.push(key);
        }
      });
    });
    return columns;
  }, [rows]);

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

    const updateBodySize = () => {
      if (resizeFrameRef.current) cancelAnimationFrame(resizeFrameRef.current);
      resizeFrameRef.current = requestAnimationFrame(() => {
        resizeFrameRef.current = 0;
        const nextSize = {
          width: Math.round(bodyElement.clientWidth),
          height: Math.round(bodyElement.clientHeight),
        };
        if (!nextSize.height) return;
        setBodySize((current) =>
          current.width === nextSize.width && current.height === nextSize.height ? current : nextSize
        );
      });
    };

    updateBodySize();

    const resizeObserver = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => updateBodySize())
      : null;

    resizeObserver?.observe(bodyElement);
    window.addEventListener("resize", updateBodySize);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateBodySize);
      if (resizeFrameRef.current) cancelAnimationFrame(resizeFrameRef.current);
      resizeFrameRef.current = 0;
    };
  }, [pixelHeight]);

  const accent = chart.settings?.datasetColors?.[0] || pickChartColor(0);
  const chartKind = getResponsiveChartKind(chart);
  const safeTitle = typeof chart.title === "string" ? chart.title.trim() : "";
  const showTitleSetting = chart.settings?.showTitle ?? chart.config?.meta?.settings?.showTitle ?? true;
  const shouldShowTitle = safeTitle.length > 0 && showTitleSetting !== false;
  const hasCardActions = Boolean(onExportCSV || onExportPNG || onEditChart || onToggleFullscreen);
  const shouldRenderHeader = showCardHeader && (shouldShowTitle || (isFullscreen && hasCardActions));
  const chartTypeLabel = chart.type ? String(chart.type).toUpperCase() : "CHART";
  const dataSource = chart.dataset || chart.dataSource || chart.config?.dataset || "Unknown source";
  const chartStatusText = Array.isArray(rows) && rows.length
    ? `${rows.length} row${rows.length === 1 ? "" : "s"}`
    : "No data";
  const chartSummary = `${safeTitle || "Untitled chart"}. ${chartTypeLabel} visualization from ${dataSource}. ${chartStatusText}.`;
  const cardWidth = bodySize.width || 0;
  const cardHeight = Math.max(pixelHeight || 0, bodySize.height || 0);
  const isTiny = cardWidth > 0 && cardHeight > 0 && (cardWidth < 260 || cardHeight < 240);
  const isCompact = cardWidth > 0 && cardHeight > 0 && (cardWidth < 360 || cardHeight < 300);
  const isSquareMin = cardWidth > 0 && cardHeight > 0 && isCompact && Math.max(cardWidth, cardHeight) <= 460;
  const contentHeight = Math.max(120, bodySize.height || (pixelHeight - (shouldRenderHeader ? 42 : 0)));
  const sizeClass = [
    chartKind === "axis" ? "chart-card--axis" : "",
    chartKind === "circular" ? "chart-card--circular" : "",
    chartKind === "kpi" ? "chart-card--kpi" : "",
    isCompact ? "chart-card--compact" : "",
    isTiny ? "chart-card--tiny" : "",
    isSquareMin ? "chart-card--square-min" : "",
  ].filter(Boolean).join(" ");
  const circularSize = chartKind === "circular"
    ? Math.max(isTiny ? 112 : 144, Math.min(cardWidth || 320, contentHeight, isFullscreen ? 460 : 310))
    : null;
  const cardBackground =
    chart.settings?.cardBackground ||
    chart.settings?.chartCardBackground ||
    chart.settings?.chartBackground ||
    chart.settings?.backgroundColor ||
    chart.config?.meta?.settings?.cardBackground ||
    chart.config?.meta?.settings?.backgroundColor ||
    "";

  return (
    <div
      className={`chart-card is-${chartKind}-chart bi-widget-shell bi-chart-widget ${sizeClass}${isFullscreen ? " is-fullscreen" : ""}${shouldRenderHeader ? "" : " has-no-card-header"}`}
      ref={cardRef}
      style={{
        height: pixelHeight,
        ...(shouldRenderHeader ? {} : { gridTemplateRows: "minmax(0, 1fr)" }),
        "--card-accent": accent,
        ...(circularSize ? { "--chart-circular-size": `${circularSize}px` } : {}),
      }}
      role="article"
      aria-label={safeTitle ? `Chart: ${safeTitle}` : "Chart card"}
      aria-describedby={`chart-summary-${chart.id}`}
      tabIndex={0}
    >
      <p id={`chart-summary-${chart.id}`} className="sr-only">{chartSummary}</p>
      {rows.length && accessibleColumns.length ? (
        <div className="sr-only">
          <table>
            <caption>{`Data preview for ${safeTitle || "Untitled chart"}`}</caption>
            <thead>
              <tr>{accessibleColumns.map((column) => <th key={column} scope="col">{column}</th>)}</tr>
            </thead>
            <tbody>
              {rows.slice(0, 20).map((row, rowIndex) => (
                <tr key={row?.id ?? rowIndex}>
                  {accessibleColumns.map((column) => <td key={column}>{accessibleCellValue(row?.[column])}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > 20 ? <p>{`Showing the first 20 of ${rows.length} rows.`}</p> : null}
        </div>
      ) : null}
      <div className="chart-card-accent-bar" style={{ background: accent }} />

      {shouldRenderHeader ? (
        <div
          className={`chart-card-header bi-widget-header${isFullscreen ? "" : " card-drag-handle"}`}
          onDoubleClick={onToggleFullscreen}
        >
          <div className="chart-card-title-block">
            {shouldShowTitle ? <span className="chart-card-title chart-title-text">{safeTitle}</span> : null}
            <div className="chart-card-meta-row">
              <span>{chartTypeLabel}</span>
              <span>{chartStatusText}</span>
              <span>{dataSource}</span>
            </div>
          </div>
          {hasCardActions ? (
            <div className="chart-card-controls bi-widget-actions" data-export-ignore="true">
              <CardActions
                chart={chart}
                sheetId={sheetId}
                cardRef={cardRef}
                onExportCSV={(activeChart) => onExportCSV?.(activeChart, rows)}
                onExportPNG={onExportPNG}
                onEditChart={onEditChart}
                onToggleFullscreen={onToggleFullscreen}
                isFullscreen={isFullscreen}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      <div
        ref={bodyRef}
        className="chart-card-body bi-widget-body"
        style={cardBackground ? { background: cardBackground } : undefined}
      >
        {!loaded ? (
          <ChartSkeleton height={contentHeight} />
        ) : (
          <ChartRenderer
            chart={chart}
            height={contentHeight}
            filters={filters}
            className={`${isCompact ? "is-compact-card" : ""} ${isTiny ? "is-tiny-card" : ""}`.trim()}
            themeMode={themeMode}
            onDataPointClick={(point) => onDataPointClick?.(chart, point)}
          />
        )}
      </div>
      <div className="chart-card-footer bi-widget-footer">
        <span>Type: {chartKind}</span>
        <span>Source: {dataSource}</span>
        <span>{chartStatusText}</span>
      </div>
    </div>
  );
});

export default ChartCard;
