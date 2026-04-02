/**
 * components/charts/EChartRenderer.jsx
 * Unified Apache ECharts visualization engine for the active app.
 */
import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import ReactECharts from "echarts-for-react";
import * as echarts from "echarts";
import { runQuery } from "../../utils/queryEngine";
import { getChartMeta } from "../../utils/chartCatalog";
import { buildChartDrilldown, canChartDrilldown } from "../../utils/chartUtils";
import { normalizeChartConfig } from "../../utils/normalizeChartConfig";
import { buildChartClickPayload, buildEChartOption } from "../../utils/buildEChartOption";
import ChartSkeleton from "./ChartSkeleton";
import ChartErrorBoundary from "./ChartErrorBoundary";
import KPIWidget from "./KPIWidget";

const GRAPHICAL_TYPES = new Set([
  "line",
  "multi-line",
  "area",
  "stacked-area",
  "step-line",
  "bar",
  "horizontal-bar",
  "grouped-bar",
  "stacked-bar",
  "pie",
  "donut",
  "rose",
  "scatter",
  "bubble",
  "heatmap",
  "histogram",
  "radar",
  "gauge",
  "progress-ring",
  "funnel",
  "treemap",
  "sunburst",
  "waterfall",
]);

const CHART_TYPE_LABELS = {
  line: "Line chart",
  "multi-line": "Multi line chart",
  area: "Area chart",
  "stacked-area": "Stacked area chart",
  "step-line": "Step line chart",
  bar: "Bar chart",
  "horizontal-bar": "Horizontal bar chart",
  "grouped-bar": "Grouped bar chart",
  "stacked-bar": "Stacked bar chart",
  pie: "Pie chart",
  donut: "Donut chart",
  rose: "Rose chart",
  scatter: "Scatter plot",
  bubble: "Bubble chart",
  heatmap: "Heatmap",
  histogram: "Histogram",
  radar: "Radar chart",
  gauge: "Gauge",
  "progress-ring": "Progress ring",
  funnel: "Funnel chart",
  treemap: "Treemap",
  sunburst: "Sunburst",
  waterfall: "Waterfall chart",
  table: "Table",
  kpi: "KPI",
};

function formatTooltipValue(value) {
  return typeof value === "number" ? value.toLocaleString() : value;
}

function formatStatusLabel(value) {
  if (!value) return "Not available";
  return String(value)
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function inferSeriesKeys(data = [], xField = "", groupField = "") {
  return data
    .flatMap((row) => Object.keys(row))
    .filter((key, index, keys) => key !== xField && key !== groupField && keys.indexOf(key) === index);
}

function pivotGroupedData(data = [], xField, yField, groupField) {
  if (!groupField) {
    return {
      data,
      seriesKeys: yField ? [yField] : [],
    };
  }

  const grouped = new Map();
  for (const row of data) {
    const xValue = row[xField];
    const groupValue = row[groupField] ?? "Unknown";
    if (!grouped.has(xValue)) grouped.set(xValue, { [xField]: xValue });
    grouped.get(xValue)[groupValue] = Number(row[yField]) || 0;
  }

  const pivoted = [...grouped.values()];
  return { data: pivoted, seriesKeys: inferSeriesKeys(pivoted, xField, groupField) };
}

function createHistogramData(data = [], field) {
  const values = data.map((row) => Number(row[field])).filter((value) => Number.isFinite(value));
  if (!values.length) return [];

  const min = Math.min(...values);
  const max = Math.max(...values);
  const binCount = Math.min(8, Math.max(4, Math.round(Math.sqrt(values.length))));
  const span = max - min || 1;
  const binSize = span / binCount;

  const bins = Array.from({ length: binCount }, (_, index) => ({
    range: `${(min + index * binSize).toFixed(0)}-${(min + (index + 1) * binSize).toFixed(0)}`,
    count: 0,
  }));

  for (const value of values) {
    const rawIndex = Math.floor((value - min) / binSize);
    const index = Math.min(binCount - 1, Math.max(0, rawIndex));
    bins[index].count += 1;
  }

  return bins;
}

function createGaugeData(data = [], yField) {
  const values = data.map((row) => Number(row[yField])).filter((value) => Number.isFinite(value));
  if (!values.length) return { actual: 0, max: 100 };

  const actual = values[values.length - 1];
  const max = Math.max(...values, actual || 100);
  return { actual, max };
}

function DataTable({ data = [] }) {
  const columns = Object.keys(data[0] ?? {});
  return (
    <div className="chart-html-root">
      <div className="chart-table-wrap">
        <table className="chart-table">
          <thead>
            <tr>
              {columns.map((column) => <th key={column}>{column}</th>)}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={`${index}-${columns[0] ?? "row"}`}>
                {columns.map((column) => <td key={column}>{formatTooltipValue(row[column])}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DrilldownTable({ data = [], title, drilldown }) {
  return (
    <div className="chart-drilldown-view">
      <div className="chart-drilldown-header">
        <span className="chart-drilldown-view-kicker">Detailed View</span>
        <strong className="chart-drilldown-view-title">{title}</strong>
        <p className="chart-drilldown-view-subtitle">
          Showing raw rows for {drilldown?.label ?? "the selected data point"}.
        </p>
      </div>
      <DataTable data={data} />
    </div>
  );
}

const EChartRenderer = memo(function EChartRenderer({
  type: propType,
  data: propData,
  xField: propX,
  yField: propY,
  groupField: propGroup,
  title: propTitle,
  chart,
  containerHeight,
  filters,
  drilldown,
  onDrilldown,
  onDataReady,
  mode = "default",
}) {
  const [themeRevision, setThemeRevision] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const observer = new MutationObserver(() => {
      setThemeRevision((current) => current + 1);
    });

    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const normalizedChart = useMemo(
    () =>
      normalizeChartConfig({
        ...chart,
        chartType: propType ?? chart?.chartType ?? chart?.type,
        x: propX ?? chart?.x ?? chart?.xField,
        y: propY ?? chart?.y ?? chart?.yField,
        groupBy: propGroup ?? chart?.groupBy ?? chart?.groupField,
        title: propTitle ?? chart?.title,
      }),
    [chart, propGroup, propTitle, propType, propX, propY]
  );

  const requestedType = normalizedChart.chartType;
  const type = getChartMeta(requestedType).renderType ?? requestedType;
  const dataset = normalizedChart.dataset;
  const xField = normalizedChart.x;
  const yField = normalizedChart.y;
  const groupField = normalizedChart.groupBy;
  const sizeField = normalizedChart.sizeField;
  const aggregate = normalizedChart.aggregate ?? filters?.aggregateType ?? "sum";
  const displayTitle = normalizedChart.title || "Chart";
  const showLegend = normalizedChart.legendVisible !== false;
  const isSmooth = normalizedChart.smooth === true;
  const isReadOnly = mode === "readonly";
  const sourceField = xField || yField || groupField || "Not configured";
  const drilldownEnabled = !isReadOnly && canChartDrilldown(normalizedChart);
  const isDrilled = Boolean(drilldown?.filters?.length);
  const containerH = containerHeight ?? 350;

  const [fetchedData, setFetchedData] = useState([]);
  const [loading, setLoading] = useState(!propData);
  const [fetchErr, setFetchErr] = useState(null);

  const loadData = useCallback(async () => {
    if (propData) {
      setFetchedData(propData);
      setLoading(false);
      return;
    }

    const needsData = dataset && (xField || yField);
    if (!needsData) {
      setFetchedData([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setFetchErr(null);
    try {
      const gf = filters ?? {};
      const res = await runQuery({
        dataset,
        x: xField,
        y: yField,
        groupBy: groupField,
        sizeField,
        chartType: requestedType,
        aggregate,
        dateRange: gf.dateRange ?? null,
        dateField: gf.dateField ?? "",
        categoryField: gf.categoryField ?? "",
        categoryValue: gf.categoryValue ?? "",
        drillFilters: drilldown?.filters ?? [],
        detailRows: isDrilled,
      });
      setFetchedData(res.data ?? []);
    } catch (e) {
      setFetchErr(e.message ?? "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [aggregate, dataset, drilldown?.filters, filters, groupField, isDrilled, propData, requestedType, sizeField, xField, yField]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeData = propData ?? fetchedData;

  const { chartData, seriesKeys, exportRows } = useMemo(() => {
    if (!activeData?.length) return { chartData: [], seriesKeys: [], exportRows: [] };

    if (type === "grouped-bar" || type === "stacked-bar" || type === "radar") {
      const pivoted = pivotGroupedData(activeData, xField, yField, groupField);
      return { chartData: pivoted.data, seriesKeys: pivoted.seriesKeys, exportRows: activeData };
    }

    if (type === "histogram") {
      const bins = createHistogramData(activeData, xField || yField);
      return { chartData: bins, seriesKeys: ["count"], exportRows: bins };
    }

    if (type === "gauge" || type === "progress-ring") {
      const gauge = createGaugeData(activeData, yField);
      return {
        chartData: [{ actual: gauge.actual, max: gauge.max }],
        seriesKeys: ["actual"],
        exportRows: [{ value: gauge.actual, max: gauge.max }],
      };
    }

    if (type === "funnel") {
      const sorted = [...activeData].sort((a, b) => (Number(b[yField]) || 0) - (Number(a[yField]) || 0));
      return { chartData: sorted, seriesKeys: [yField], exportRows: sorted };
    }

    return { chartData: activeData, seriesKeys: yField ? [yField] : [], exportRows: activeData };
  }, [activeData, groupField, type, xField, yField]);

  useEffect(() => {
    onDataReady?.(exportRows);
  }, [exportRows, onDataReady]);

  const triggerDrilldown = useCallback((payload) => {
    if (!drilldownEnabled || isDrilled) return;

    const nextDrilldown = buildChartDrilldown(normalizedChart, payload);
    if (!nextDrilldown) return;
    onDrilldown?.(nextDrilldown);
  }, [drilldownEnabled, isDrilled, normalizedChart, onDrilldown]);

  const handleChartClick = useCallback((params) => {
    const payload = buildChartClickPayload({ type, params, xField, groupField });
    if (!payload) return;
    triggerDrilldown(payload);
  }, [groupField, triggerDrilldown, type, xField]);

  const chartOption = useMemo(
    () =>
      GRAPHICAL_TYPES.has(type)
        ? buildEChartOption({
            chart: normalizedChart,
            type,
            chartData,
            seriesKeys,
            xField,
            yField,
            groupField,
            sizeField,
            displayTitle,
            showLegend,
            isSmooth,
            isReadOnly,
            themeRevision,
          })
        : null,
    [
      chartData,
      displayTitle,
      groupField,
      isReadOnly,
      isSmooth,
      normalizedChart,
      seriesKeys,
      showLegend,
      sizeField,
      themeRevision,
      type,
      xField,
      yField,
    ]
  );

  if (loading) return <ChartSkeleton height={containerH} />;

  if (fetchErr) {
    return (
      <div className={`chart-status-card is-error${isReadOnly ? " is-readonly" : ""}`} role="status">
        <span className="chart-status-kicker">Data unavailable</span>
        <strong className="chart-status-title">This visualization could not be loaded</strong>
        <p className="chart-status-description">{fetchErr}</p>
        {isReadOnly ? (
          <div className="chart-status-meta" aria-label="Chart status details">
            <span>Dataset <strong>{formatStatusLabel(dataset)}</strong></span>
            <span>Field <strong>{formatStatusLabel(sourceField)}</strong></span>
          </div>
        ) : null}
      </div>
    );
  }

  if (!chartData?.length) {
    return (
      <div className={`chart-status-card${isReadOnly ? " is-readonly" : ""}`} role="status">
        <span className="chart-status-kicker">No results</span>
        <strong className="chart-status-title">
          {CHART_TYPE_LABELS[requestedType] ?? CHART_TYPE_LABELS[type] ?? "Chart"} has no data to display
        </strong>
        <p className="chart-status-description">
          {isReadOnly
            ? "This shared view is available, but the current chart configuration does not return any rows for external review."
            : "The current chart configuration does not return any rows."}
        </p>
        {isReadOnly ? (
          <div className="chart-status-meta" aria-label="Chart status details">
            <span>Dataset <strong>{formatStatusLabel(dataset)}</strong></span>
            <span>Chart type <strong>{formatStatusLabel(requestedType)}</strong></span>
          </div>
        ) : null}
      </div>
    );
  }

  if (isDrilled) {
    return (
      <ChartErrorBoundary key={chart?.id ?? xField ?? type}>
        <div
          className={`chart-renderer-root chart-renderer-root-drilled${isReadOnly ? " is-readonly" : ""}`}
          style={{ height: containerH }}
        >
          <DrilldownTable data={activeData} title={displayTitle} drilldown={drilldown} />
        </div>
      </ChartErrorBoundary>
    );
  }

  if (type === "table") {
    return (
      <ChartErrorBoundary key={chart?.id ?? xField ?? type}>
        <div className={`chart-renderer-root${isReadOnly ? " is-readonly" : ""}`} style={{ height: containerH }}>
          <DataTable data={chartData} />
        </div>
      </ChartErrorBoundary>
    );
  }

  if (type === "kpi") {
    const total = chartData.reduce((sum, datum) => sum + (Number(datum[yField]) || 0), 0);
    return (
      <ChartErrorBoundary key={chart?.id ?? xField ?? type}>
        <div className={`chart-renderer-root${isReadOnly ? " is-readonly" : ""}`} style={{ height: containerH }}>
          <KPIWidget title={displayTitle} value={total} />
        </div>
      </ChartErrorBoundary>
    );
  }

  return (
    <ChartErrorBoundary key={chart?.id ?? xField ?? type}>
      <div
        className={`chart-renderer-root${isReadOnly ? " is-readonly" : ""}${drilldownEnabled ? " is-drillable" : ""}`}
        style={{ height: containerH }}
      >
        <ReactECharts
          echarts={echarts}
          option={chartOption ?? {}}
          notMerge
          lazyUpdate
          onEvents={drilldownEnabled ? { click: handleChartClick } : undefined}
          style={{ width: "100%", height: "100%" }}
          className="chart-echarts-surface"
          opts={{ renderer: "canvas" }}
        />
      </div>
    </ChartErrorBoundary>
  );
});

export default EChartRenderer;
