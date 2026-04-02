/**
 * ChartRenderer.jsx — Production Recharts-based visualization component v4
 */
import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  BarChart, Bar,
  LineChart, Line,
  AreaChart, Area,
  PieChart, Pie, Cell,
  ScatterChart, Scatter,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend, ResponsiveContainer
} from "recharts";
import { runQuery } from "../utils/queryEngine";
import { getColorPalette } from "../utils/chartUtils";
import ChartSkeleton from "./ChartSkeleton";
import ChartErrorBoundary from "./ChartErrorBoundary";

// ─── Export helpers ─────────────────────────────────────────────
function exportCSV(data, filename) {
  if (!data?.length) return;
  const keys = Object.keys(data[0]);
  const rows = data.map((r) =>
    keys.map((k) => {
      const v = r[k];
      if (v === null || v === undefined) return "";
      if (typeof v === "string" && (v.includes(",") || v.includes('"'))) {
        return `"${v.replace(/"/g, '""')}"`;
      }
      return String(v);
    }).join(",")
  );
  const csv  = [keys.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `${filename || "export"}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

// ─── Format value ────────────────────────────────────────────────
function formatValue(val) {
  if (typeof val === "number") {
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(2)}M`;
    if (val >= 1_000)     return `${(val / 1_000).toFixed(1)}K`;
    return val.toLocaleString();
  }
  return val ?? "";
}

// ─── Components ──────────────────────────────────────────────────
function ChartToolbar({ onExportCSV }) {
  return (
    <div className="chart-toolbar">
      <button className="chart-export-btn" onClick={onExportCSV} title="Export CSV" aria-label="Export CSV">
        CSV
      </button>
    </div>
  );
}

const KPIWidget = ({ title, value }) => (
  <div className="kpi-widget" style={{ 
    display: "flex", 
    flexDirection: "column", 
    alignItems: "center", 
    justifyContent: "center",
    height: "100%",
    minHeight: "140px"
  }}>
    <div className="kpi-label" style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>
      {title}
    </div>
    <div className="kpi-value" style={{ fontSize: "32px", fontWeight: "700", color: "#2563eb" }}>
      {formatValue(value)}
    </div>
  </div>
);

const ChartRenderer = memo(
  function ChartRenderer({
    type: propType,
    data: propData,
    xField: propX,
    yField: propY,
    groupField: propGroup,
    title: propTitle,
    chart,
    containerHeight,
    filters,
  }) {
    // Unified config
    const type       = propType    ?? chart?.type       ?? "bar";
    const dataset    = chart?.dataset || chart?.table  || null;
    const xField     = propX       ?? chart?.x      ?? chart?.xField     ?? null;
    const yField     = propY       ?? chart?.y      ?? chart?.yField     ?? null;
    const groupField = propGroup   ?? chart?.groupBy ?? chart?.groupField ?? null;
    const aggregate  = chart?.aggregate ?? chart?.aggregation ?? filters?.aggregateType ?? "sum";
    const displayTitle = propTitle ?? chart?.title ?? "Chart";
    const colorTheme = chart?.colorTheme ?? "default";
    const showLegend = chart?.legendVisible !== false;
    const isSmooth   = chart?.smooth !== false;

    const [fetchedData, setFetchedData] = useState([]);
    const [loading, setLoading]         = useState(!propData);
    const [fetchErr, setFetchErr]       = useState(null);

    const containerH = containerHeight ?? 350;

    const loadData = useCallback(async () => {
      if (propData) { setFetchedData(propData); setLoading(false); return; }
      if (!dataset || !xField) { setFetchedData([]); setLoading(false); return; }
      setLoading(true);
      setFetchErr(null);
      try {
        const gf  = filters ?? {};
        const res = await runQuery({
          dataset,
          x: xField,
          y: yField,
          groupBy: groupField,
          aggregate: aggregate,
          dateRange: gf.dateRange ?? null,
        });
        setFetchedData(res.data ?? []);
      } catch (e) {
        setFetchErr(e.message ?? "Failed to load data");
      } finally {
        setLoading(false);
      }
    }, [propData, dataset, xField, yField, groupField, aggregate, filters]);

    useEffect(() => { loadData(); }, [loadData]);

    const activeData = propData ?? fetchedData;
    const palette = useMemo(() => getColorPalette(colorTheme), [colorTheme]);
    const COLORS = palette.colors;

    if (loading) return <ChartSkeleton height={containerH} />;
    if (fetchErr) return <div className="chart-fetch-error">⚠ {fetchErr}</div>;
    if (!activeData?.length) return <div className="preview-box">📊 No data available</div>;

    const handleExportCSV = () => exportCSV(activeData, displayTitle);

    const renderChart = () => {
      switch (type) {
        case "line":
          return (
            <LineChart data={activeData}>
              <CartesianGrid stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey={xField} tick={{fontSize: 11}} />
              <YAxis tick={{fontSize: 11}} tickFormatter={formatValue} />
              <Tooltip />
              {showLegend && <Legend />}
              <Line type={isSmooth ? "monotone" : "linear"} dataKey={yField} stroke={palette.single} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          );

        case "area":
          return (
            <AreaChart data={activeData}>
              <CartesianGrid stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey={xField} tick={{fontSize: 11}} />
              <YAxis tick={{fontSize: 11}} tickFormatter={formatValue} />
              <Tooltip />
              {showLegend && <Legend />}
              <Area type={isSmooth ? "monotone" : "linear"} dataKey={yField} stroke={palette.single} fill={palette.single} fillOpacity={0.3} />
            </AreaChart>
          );

        case "bar":
        case "stacked-bar":
          return (
            <BarChart data={activeData}>
              <CartesianGrid stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey={xField} tick={{fontSize: 11}} />
              <YAxis tick={{fontSize: 11}} tickFormatter={formatValue} />
              <Tooltip />
              {showLegend && <Legend />}
              <Bar dataKey={yField} fill={palette.single} stackId={type === "stacked-bar" ? "a" : undefined} radius={[2, 2, 0, 0]} />
            </BarChart>
          );

        case "pie":
        case "donut":
          return (
            <PieChart>
              <Tooltip />
              {showLegend && <Legend />}
              <Pie
                data={activeData}
                dataKey={yField}
                nameKey={xField}
                outerRadius="80%"
                innerRadius={type === "donut" ? "55%" : 0}
              >
                {activeData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          );

        case "scatter":
          return (
            <ScatterChart>
              <CartesianGrid stroke="#e5e7eb" />
              <XAxis dataKey={xField} type="number" tick={{fontSize: 11}} />
              <YAxis dataKey={yField} type="number" tick={{fontSize: 11}} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              {showLegend && <Legend />}
              <Scatter name={displayTitle} data={activeData} fill={palette.single} />
            </ScatterChart>
          );

        case "kpi":
          const total = activeData.reduce((sum, d) => sum + (Number(d[yField]) || 0), 0);
          return <KPIWidget title={displayTitle} value={total} />;

        case "heatmap":
          return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af' }}>Heatmap visualization (coming soon)</div>;

        default:
          return (
            <BarChart data={activeData}>
              <CartesianGrid stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey={xField} />
              <YAxis tickFormatter={formatValue} />
              <Tooltip />
              <Bar dataKey={yField} fill={palette.single} />
            </BarChart>
          );
      }
    };

    return (
      <ChartErrorBoundary key={chart?.id ?? xField}>
        <div className="chart-renderer-root" style={{ height: containerH }}>
          <div className="chart-renderer-top">
            <div className="chart-renderer-warning" />
            <ChartToolbar onExportCSV={handleExportCSV} />
          </div>
          <div className="chart-renderer-body" style={{ flex: 1, padding: '10px' }}>
            <ResponsiveContainer width="100%" height="100%">
              {renderChart()}
            </ResponsiveContainer>
          </div>
        </div>
      </ChartErrorBoundary>
    );
  },
  (prev, next) => (
    prev.type === next.type &&
    prev.xField === next.xField &&
    prev.yField === next.yField &&
    prev.data === next.data &&
    prev.chart?.id === next.chart?.id &&
    prev.chart?.colorTheme === next.chart?.colorTheme &&
    prev.filters === next.filters
  )
);

export default ChartRenderer;
