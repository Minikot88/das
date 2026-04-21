import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  RadialLinearScale,
  Title,
  Tooltip,
} from "chart.js";
import {
  Bar,
  Bubble,
  Doughnut,
  Line,
  Pie,
  PolarArea,
  Radar,
  Scatter,
} from "react-chartjs-2";
import { normalizeChartConfig } from "../../utils/normalizeChartConfig";
import { runQuery } from "../../utils/queryEngine";
import { normalizePreviewChartType } from "../../utils/builderChartUtils";
import {
  createChartPresentationOptions,
  formatChartNumber,
  getChartCanvasShellStyle,
  getChartFallbackNoteStyle,
  getChartMetricStyles,
  getChartPlaceholderStyles,
  getChartPlotAreaStyle,
  getChartSurfaceStyle,
  getChartTableStyles,
  styleChartJsData,
} from "../../utils/chartTheme";
import {
  buildChartJsData,
  buildChartJsOptions,
  getChartJsSupport,
  normalizeChartType,
} from "../../utils/chartjsAdapter";
import { buildChartDrilldown, canChartDrilldown } from "../../utils/chartUtils";
import ChartErrorBoundary from "./ChartErrorBoundary";
import ChartSkeleton from "./ChartSkeleton";

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  RadialLinearScale,
  Title,
  Tooltip
);

const CHART_COMPONENTS = {
  bar: Bar,
  line: Line,
  pie: Pie,
  doughnut: Doughnut,
  radar: Radar,
  polarArea: PolarArea,
  scatter: Scatter,
  bubble: Bubble,
};

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function isSameRows(left = [], right = []) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function getChartRows(chart, propData) {
  if (Array.isArray(propData)) return propData;
  if (Array.isArray(chart?.data)) return chart.data;
  if (Array.isArray(chart?.queryResult?.rows)) return chart.queryResult.rows;
  if (Array.isArray(chart?.config?.queryResult?.rows)) return chart.config.queryResult.rows;
  return [];
}

function getHeightValue(height, widthFallback = 320) {
  if (typeof height === "number") return `${height}px`;
  if (typeof height === "string" && height.trim()) return height;
  return `${widthFallback}px`;
}

function formatChartTypeLabel(value) {
  return String(value ?? "")
    .replace(/-/g, " ")
    .trim();
}

function readDarkMode() {
  if (typeof document === "undefined") return false;
  return document.body.classList.contains("dark");
}

function PlaceholderCard({
  title,
  message,
  accent = "var(--warning)",
  darkMode = false,
  colorTheme = "default",
  chrome = "default",
  mode = "dashboard",
}) {
  const styles = getChartPlaceholderStyles({
    accent,
    darkMode,
    colorTheme,
    chrome,
    mode,
  });

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <span style={styles.eyebrow}>Chart state</span>
        <strong style={styles.title}>{title}</strong>
        <p style={styles.message}>
          {message}
        </p>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  darkMode = false,
  colorTheme = "default",
  chrome = "default",
  mode = "dashboard",
}) {
  const styles = getChartMetricStyles({
    darkMode,
    colorTheme,
    chrome,
    mode,
  });

  return (
    <div style={styles.wrapper}>
      <span style={styles.kicker}>
        {subtitle || "Metric"}
      </span>
      <strong style={styles.value}>
        {value}
      </strong>
      <span style={styles.title}>{title}</span>
    </div>
  );
}

function TablePreview({
  columns = [],
  rows = [],
  darkMode = false,
  colorTheme = "default",
  chrome = "default",
  mode = "dashboard",
}) {
  const styles = getChartTableStyles({
    darkMode,
    colorTheme,
    chrome,
    mode,
  });

  return (
    <div style={styles.wrapper}>
      <table style={styles.table}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column}
                style={styles.headerCell}
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map((column) => (
                <td
                  key={`${rowIndex}-${column}`}
                  style={styles.bodyCell}
                >
                  {String(row?.[column] ?? "-")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const ChartJsRenderer = memo(function ChartJsRenderer({
  type,
  rows,
  data: propData,
  chart,
  config,
  height = 320,
  width = "100%",
  containerHeight,
  className = "",
  theme,
  filters,
  drilldown = null,
  onDrilldown,
  onDataReady,
  mode = "dashboard",
  chrome = "default",
}) {
  const normalizedChart = useMemo(
    () => normalizeChartConfig(config ?? chart ?? { chartType: type ?? "bar" }),
    [chart, config, type]
  );
  const requestedType = useMemo(
    () => normalizeChartType(normalizedChart.type ?? normalizedChart.chartType ?? type ?? "bar", normalizedChart),
    [normalizedChart, type]
  );
  const [runtimeRows, setRuntimeRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [renderError, setRenderError] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(readDarkMode);
  const chartRef = useRef(null);
  const wrapperRef = useRef(null);
  const lastDataKeyRef = useRef("");

  const externalRows = useMemo(
    () => getChartRows(normalizedChart, Array.isArray(rows) ? rows : propData),
    [normalizedChart, propData, rows]
  );
  const fetchSignature = JSON.stringify({
    dataset: normalizedChart.dataset,
    chartType: requestedType,
    x: normalizedChart.x,
    y: normalizedChart.y,
    groupBy: normalizedChart.groupBy,
    sizeField: normalizedChart.sizeField,
    aggregate: normalizedChart.aggregate,
    filters,
    drilldown: drilldown?.filters ?? [],
  });

  useEffect(() => {
    if (typeof MutationObserver === "undefined" || typeof document === "undefined") return undefined;
    const observer = new MutationObserver(() => setIsDarkMode(readDarkMode()));
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (externalRows.length || !normalizedChart.dataset) {
      setRuntimeRows((current) => {
        if (externalRows.length) {
          return isSameRows(current, externalRows) ? current : externalRows;
        }
        return current.length ? [] : current;
      });
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    setRenderError("");

    runQuery({
      dataset: normalizedChart.dataset,
      x: normalizedChart.x,
      y: normalizedChart.y,
      groupBy: normalizedChart.groupBy,
      sizeField: normalizedChart.sizeField,
      aggregate: normalizedChart.aggregate,
      chartType: requestedType,
      detailRows: ["scatter", "bubble"].includes(requestedType),
      drillFilters: drilldown?.filters ?? [],
    })
      .then((result) => {
        if (cancelled) return;
        const nextRows = ensureArray(result?.data);
        setRuntimeRows((current) => (isSameRows(current, nextRows) ? current : nextRows));
        setLoading(false);
      })
      .catch((error) => {
        if (cancelled) return;
        setRuntimeRows([]);
        setLoading(false);
        setRenderError(error?.message || "Unable to load chart data.");
      });

    return () => {
      cancelled = true;
    };
  }, [drilldown?.filters, externalRows, fetchSignature, normalizedChart.dataset, normalizedChart.x, normalizedChart.y, normalizedChart.groupBy, normalizedChart.sizeField, normalizedChart.aggregate, requestedType]);

  const activeRows = externalRows.length ? externalRows : runtimeRows;
  const previewTypeNormalization = useMemo(
    () =>
      normalizePreviewChartType(requestedType, activeRows, {
        roleMapping: normalizedChart.roleMapping ?? normalizedChart.mappings?.roleMapping ?? {},
      }),
    [activeRows, normalizedChart, requestedType]
  );
  const effectiveType = previewTypeNormalization.useFallback
    ? previewTypeNormalization.chartType
    : requestedType;
  const support = useMemo(() => getChartJsSupport(effectiveType), [effectiveType]);
  const adapterResult = useMemo(
    () =>
      buildChartJsData({
        type: effectiveType,
        rows: activeRows,
        config: normalizedChart,
        theme: theme ?? normalizedChart.colorTheme ?? "default",
      }),
    [activeRows, effectiveType, normalizedChart, theme]
  );
  const styledChartData = useMemo(
    () =>
      adapterResult.data
        ? styleChartJsData({
            type: support.mode ?? effectiveType,
            data: adapterResult.data,
            config: normalizedChart,
            darkMode: isDarkMode,
            mode,
            chrome,
          })
        : adapterResult.data,
    [adapterResult.data, chrome, effectiveType, isDarkMode, mode, normalizedChart, support.mode]
  );

  const chartOptions = useMemo(() => {
    const baseOptions = buildChartJsOptions({
      type: effectiveType,
      config: normalizedChart,
      theme: theme ?? normalizedChart.colorTheme ?? "default",
      darkMode: isDarkMode,
    });

    const styledOptions = createChartPresentationOptions({
      type: support.mode ?? effectiveType,
      baseOptions,
      data: styledChartData,
      config: normalizedChart,
      darkMode: isDarkMode,
      mode,
      chrome,
    });

    return {
      ...baseOptions,
      ...styledOptions,
      onClick: (_event, elements) => {
        if (!elements?.length || !canChartDrilldown(normalizedChart)) return;
        const firstElement = elements[0];
        const payload = adapterResult?.clickTargets?.[firstElement.datasetIndex]?.[firstElement.index] ?? null;
        if (!payload) return;
        const nextDrilldown = buildChartDrilldown(normalizedChart, payload);
        if (nextDrilldown) onDrilldown?.(nextDrilldown);
      },
    };
  }, [adapterResult?.clickTargets, chrome, effectiveType, isDarkMode, mode, normalizedChart, onDrilldown, styledChartData, support.mode, theme]);

  useEffect(() => {
    if (!onDataReady) return;
    const nextKey = JSON.stringify(activeRows);
    if (lastDataKeyRef.current === nextKey) return;
    lastDataKeyRef.current = nextKey;
    onDataReady(activeRows);
  }, [activeRows, onDataReady]);

  useEffect(() => {
    const element = wrapperRef.current;
    if (!element || typeof ResizeObserver === "undefined") return undefined;

    const observer = new ResizeObserver(() => {
      chartRef.current?.resize?.();
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const renderHeight = getHeightValue(containerHeight ?? height);
  const renderWidth = typeof width === "number" ? `${width}px` : width;
  const ChartComponent = CHART_COMPONENTS[support.chartJsType];
  const isBuilderPreview = mode === "builder-preview";
  const hasRows = activeRows.length > 0;
  const rendererColorTheme = theme ?? normalizedChart.colorTheme ?? "default";
  const fallbackSourceType = normalizedChart.meta?.previewFallbackSourceChartType
    ?? normalizedChart.chartType
    ?? requestedType;
  const fallbackNote = normalizedChart.previewFallbackMessage
    ?? normalizedChart.meta?.previewFallbackReason
    ?? (previewTypeNormalization.useFallback && fallbackSourceType !== effectiveType
      ? (
          isBuilderPreview
            ? `Preview fallback applied: ${formatChartTypeLabel(fallbackSourceType)} -> ${formatChartTypeLabel(effectiveType)}.`
            : `Legacy chart normalized: ${formatChartTypeLabel(fallbackSourceType)} -> ${formatChartTypeLabel(effectiveType)}.`
        )
      : "");

  if (loading) {
    return <ChartSkeleton height={containerHeight ?? height} />;
  }

  if (renderError) {
    return (
      <PlaceholderCard
        title="Preview error"
        message={renderError}
        accent="var(--danger)"
        darkMode={isDarkMode}
        colorTheme={rendererColorTheme}
        chrome={chrome}
        mode={mode}
      />
    );
  }

  if (!support.supported) {
    return (
      <PlaceholderCard
        title={`Unsupported chart type: ${fallbackSourceType}`}
        message={previewTypeNormalization.useFallback
          ? `Chart.js preview could not render ${formatChartTypeLabel(fallbackSourceType)} even after trying ${formatChartTypeLabel(effectiveType)}.`
          : "Chart type not yet supported in Chart.js renderer"}
        darkMode={isDarkMode}
        colorTheme={rendererColorTheme}
        chrome={chrome}
        mode={mode}
      />
    );
  }

  if (!hasRows && !(normalizedChart.option || normalizedChart.echartsOption)) {
    return (
      <PlaceholderCard
        title={isBuilderPreview ? "Preview waiting for data" : "No chart data"}
        message={normalizedChart.emptyStateLabel || "This chart does not have any rows to render yet."}
        darkMode={isDarkMode}
        colorTheme={rendererColorTheme}
        chrome={chrome}
        mode={mode}
      />
    );
  }

  if (adapterResult.status === "unsupported") {
    return (
      <PlaceholderCard
        title={`Unsupported chart type: ${fallbackSourceType}`}
        message={adapterResult.reason}
        darkMode={isDarkMode}
        colorTheme={rendererColorTheme}
        chrome={chrome}
        mode={mode}
      />
    );
  }

  if (adapterResult.status === "invalid") {
    return (
      <PlaceholderCard
        title="Chart mapping incomplete"
        message={adapterResult.reason || "The current chart configuration does not produce a renderable chart."}
        darkMode={isDarkMode}
        colorTheme={rendererColorTheme}
        chrome={chrome}
        mode={mode}
      />
    );
  }

  if (support.mode === "kpi") {
    const firstRow = activeRows[0] ?? {};
    const firstNumericKey = Object.keys(firstRow).find((key) => Number.isFinite(Number(firstRow[key])));
    return (
      <MetricCard
        title={normalizedChart.title || normalizedChart.name || "KPI"}
        subtitle={normalizedChart.subtitle || firstNumericKey || "Value"}
        value={formatChartNumber(firstRow?.[firstNumericKey])}
        darkMode={isDarkMode}
        colorTheme={rendererColorTheme}
        chrome={chrome}
        mode={mode}
      />
    );
  }

  if (support.mode === "table") {
    const tableMeta = adapterResult.tableMeta ?? { columns: [], rows: [] };
    return (
      <TablePreview
        columns={tableMeta.columns}
        rows={tableMeta.rows}
        darkMode={isDarkMode}
        colorTheme={rendererColorTheme}
        chrome={chrome}
        mode={mode}
      />
    );
  }

  if (!ChartComponent || !adapterResult.data) {
    return (
      <PlaceholderCard
        title="Chart unavailable"
        message="This chart could not be mapped into the Chart.js renderer."
        darkMode={isDarkMode}
        colorTheme={rendererColorTheme}
        chrome={chrome}
        mode={mode}
      />
    );
  }

  const gaugeMeta = adapterResult.gaugeMeta;

  return (
    <ChartErrorBoundary>
      <div
        ref={wrapperRef}
        className={`chart-renderer-root${isBuilderPreview ? " is-builder-preview" : ""}${chrome === "minimal" ? " is-minimal" : ""}${className ? ` ${className}` : ""}`}
        style={getChartSurfaceStyle({
          darkMode: isDarkMode,
          colorTheme: rendererColorTheme,
          chrome,
          mode,
          width: renderWidth,
          height: renderHeight,
        })}
      >
        <div
          style={getChartCanvasShellStyle({
            darkMode: isDarkMode,
            colorTheme: rendererColorTheme,
            chrome,
            mode,
          })}
        >
          {fallbackNote ? (
            <div
              style={getChartFallbackNoteStyle({
                darkMode: isDarkMode,
                colorTheme: rendererColorTheme,
                chrome,
                mode,
              })}
            >
              {fallbackNote}
            </div>
          ) : null}
          <div style={getChartPlotAreaStyle()}>
            <ChartComponent ref={chartRef} data={styledChartData} options={chartOptions} />
            {support.mode === "gauge" && gaugeMeta ? (
              <div
                style={{
                  position: "absolute",
                  inset: "auto 0 18% 0",
                  display: "grid",
                  justifyItems: "center",
                  pointerEvents: "none",
                }}
              >
                <strong style={{ fontSize: 24, color: "var(--text-primary)", letterSpacing: "-0.03em" }}>
                  {formatChartNumber(gaugeMeta.value, { compact: false })}
                </strong>
                <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                  / {formatChartNumber(gaugeMeta.max, { compact: false })}
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </ChartErrorBoundary>
  );
});

export default ChartJsRenderer;
