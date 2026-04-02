/**
 * components/dashboard/KpiBar.jsx
 * Animated summary bar for project-wide key metrics.
 */
import React, { useEffect, useMemo, useRef, useState, memo } from "react";
import { datasets } from "../../data/mockData";
import { normalizeChartConfig } from "../../utils/normalizeChartConfig";

function useCountUp(target, duration = 1200) {
  const [val, setVal] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    const start = performance.now();
    const from = 0;
    const to = typeof target === "number" ? target : 0;
    const isInt = Number.isInteger(to);

    function step(now) {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = from + (to - from) * eased;
      setVal(isInt ? Math.round(current) : parseFloat(current.toFixed(1)));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    }

    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return val;
}

function KpiCard({ icon, label, value, sub, accent, suffix = "" }) {
  const animated = useCountUp(typeof value === "number" ? value : 0);

  return (
    <div className="kpi-card" style={{ "--kpi-accent": accent }}>
      <div className="kpi-card-topline" />
      <div className="kpi-card-head">
        <div className="kpi-card-icon">{icon}</div>
        <div className="kpi-card-label-wrap">
          <div className="kpi-card-label">{label}</div>
          {sub && <div className="kpi-card-sub">{sub}</div>}
        </div>
      </div>
      <div className="kpi-card-body">
        <div className="kpi-card-value">
          {typeof value === "number" ? animated.toLocaleString() : value}
          {suffix && <span className="kpi-suffix">{suffix}</span>}
        </div>
        <div className="kpi-card-foot">
          <span className="kpi-card-foot-label">Live metric</span>
        </div>
      </div>
    </div>
  );
}

const KpiBar = memo(function KpiBar({ charts }) {
  const kpis = useMemo(() => {
    if (!charts.length) return [];

    const allValues = charts.flatMap((chart) => {
      const normalizedChart = normalizeChartConfig(chart);
      const data = datasets[normalizedChart.dataset] ?? [];
      return data.map((row) => Number(row[normalizedChart.y])).filter((value) => !isNaN(value));
    });

    const totalRecords = charts.reduce((sum, chart) => {
      const normalizedChart = normalizeChartConfig(chart);
      return sum + (datasets[normalizedChart.dataset]?.length ?? 0);
    }, 0);
    const maxVal = allValues.length ? Math.max(...allValues) : 0;
    const minVal = allValues.length ? Math.min(...allValues) : 0;
    const avgVal = allValues.length ? allValues.reduce((a, b) => a + b, 0) / allValues.length : 0;

    return [
      { icon: "WG", label: "Active Charts", value: charts.length, accent: "#2563eb", sub: `${totalRecords.toLocaleString()} rows in review` },
      { icon: "PK", label: "Peak Metric", value: maxVal, accent: "#0f9f6e", sub: "Highest observed value" },
      { icon: "MN", label: "Floor Metric", value: minVal, accent: "#c67028", sub: "Lowest observed value" },
      { icon: "AV", label: "Average Metric", value: parseFloat(avgVal.toFixed(1)), accent: "#4f46e5", sub: "Cross-widget mean" },
    ];
  }, [charts]);

  if (!kpis.length) return null;

  return (
    <div className="kpi-bar" role="region" aria-label="Dashboard overview">
      {kpis.map((kpi) => (
        <KpiCard key={kpi.label} {...kpi} />
      ))}
    </div>
  );
});

export default KpiBar;
