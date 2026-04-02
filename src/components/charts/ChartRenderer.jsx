/**
 * components/charts/ChartRenderer.jsx 
 * Unified visualization engine with dynamic chart switching.
 */
import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar,
  LineChart, Line,
  AreaChart, Area,
  PieChart, Pie, Cell,
  ScatterChart, Scatter,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend, ResponsiveContainer
} from "recharts";
import { runQuery } from "../../utils/queryEngine";
import { getColorPalette } from "../../utils/chartUtils";
import { normalizeChartConfig } from "../../utils/normalizeChartConfig";
import ChartSkeleton from "./ChartSkeleton";
import ChartErrorBoundary from "./ChartErrorBoundary";
import KPIWidget from "./KPIWidget";

// Logic-heavy Presentational Component
const ChartRenderer = memo(function ChartRenderer({
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

  const type = normalizedChart.chartType;
  const dataset = normalizedChart.dataset;
  const xField = normalizedChart.x;
  const yField = normalizedChart.y;
  const groupField = normalizedChart.groupBy;
  const aggregate = normalizedChart.aggregate ?? filters?.aggregateType ?? "sum";
  const displayTitle = normalizedChart.title || "Chart";
  const colorTheme = normalizedChart.colorTheme;
  const showLegend = normalizedChart.legendVisible !== false;
  const isSmooth = normalizedChart.smooth !== false;

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
      const gf = filters ?? {};
      const res = await runQuery({
        dataset,
        x: xField,
        y: yField,
        groupBy: groupField,
        aggregate,
        dateRange: gf.dateRange ?? null,
        dateField: gf.dateField ?? "",
        categoryField: gf.categoryField ?? "",
        categoryValue: gf.categoryValue ?? "",
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

  const renderChart = () => {
    switch (type) {
      case "line":
        return (
          <LineChart data={activeData}>
            <CartesianGrid stroke="#e5e7eb" vertical={false} />
            <XAxis dataKey={xField} />
            <YAxis tickFormatter={(val) => val.toLocaleString()} />
            <Tooltip />
            {showLegend && <Legend />}
            <Line type={isSmooth ? "monotone" : "linear"} dataKey={yField} stroke={palette.single} strokeWidth={2.5} dot={{ r: 4 }} />
          </LineChart>
        );

      case "area":
        return (
          <AreaChart data={activeData}>
            <CartesianGrid stroke="#e5e7eb" vertical={false} />
            <XAxis dataKey={xField} />
            <YAxis tickFormatter={(val) => val.toLocaleString()} />
            <Tooltip />
            {showLegend && <Legend />}
            <Area type={isSmooth ? "monotone" : "linear"} dataKey={yField} stroke={palette.single} fill={palette.single} fillOpacity={0.3} strokeWidth={2} />
          </AreaChart>
        );

      case "bar":
      case "stacked-bar":
        return (
          <BarChart data={activeData}>
            <CartesianGrid stroke="#e5e7eb" vertical={false} />
            <XAxis dataKey={xField} />
            <YAxis tickFormatter={(val) => val.toLocaleString()} />
            <Tooltip />
            {showLegend && <Legend />}
            <Bar dataKey={yField} fill={palette.single} stackId={type === "stacked-bar" ? "a" : undefined} radius={[4, 4, 0, 0]} />
          </BarChart>
        );

      case "pie":
      case "donut":
        return (
          <PieChart>
            <Tooltip />
            {showLegend && <Legend />}
            <Pie data={activeData} dataKey={yField} nameKey={xField} outerRadius="80%" innerRadius={type === "donut" ? "55%" : 0}>
              {activeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
          </PieChart>
        );

      case "scatter":
        return (
          <ScatterChart>
            <CartesianGrid stroke="#e5e7eb" />
            <XAxis dataKey={xField} type="number" />
            <YAxis dataKey={yField} type="number" />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            {showLegend && <Legend />}
            <Scatter name={displayTitle} data={activeData} fill={palette.single} />
          </ScatterChart>
        );

      case "kpi": {
        const total = activeData.reduce((sum, d) => sum + (Number(d[yField]) || 0), 0);
        return <KPIWidget title={displayTitle} value={total} />;
      }

      default:
        return <div className="preview-box">Unsupported chart type: {type}</div>;
    }
  };

  return (
    <ChartErrorBoundary key={chart?.id ?? xField}>
      <div className="chart-renderer-root" style={{ height: containerH }}>
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </ChartErrorBoundary>
  );
});

export default ChartRenderer;
