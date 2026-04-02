/**
 * KpiBar.jsx — Dashboard KPI summary cards.
 * Auto-computed from active sheet charts + their data.
 * Animated count-up on mount. Responsive horizontal scroll.
 *
 * EXTENSION: Drive from backend aggregated query results.
 */
import React, { useEffect, useState, useRef, useMemo, memo } from "react";
import { datasets } from "../data/mockData";

// ─── Count-up animation hook ──────────────────────────────────────
function useCountUp(target, duration = 900) {
  const [val, setVal] = useState(0);
  const rafRef        = useRef(null);

  useEffect(() => {
    const start  = performance.now();
    const from   = 0;
    const to     = typeof target === "number" ? target : 0;
    const isInt  = Number.isInteger(to);

    function step(now) {
      const elapsed = now - start;
      const t       = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased   = 1 - (1 - t) ** 3;
      const current = from + (to - from) * eased;
      setVal(isInt ? Math.round(current) : parseFloat(current.toFixed(1)));
      if (t < 1) rafRef.current = requestAnimationFrame(step);
    }
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return val;
}

// ─── Single KPI Card ────────────────────────────────────────────
function KpiCard({ icon, label, value, sub, accent, suffix = "" }) {
  const animated = useCountUp(typeof value === "number" ? value : 0);
  return (
    <div className="kpi-card" style={{ "--kpi-accent": accent }}>
      <div className="kpi-card-icon">{icon}</div>
      <div className="kpi-card-body">
        <div className="kpi-card-value">
          {typeof value === "number"
            ? animated.toLocaleString()
            : value
          }
          {suffix && <span className="kpi-suffix">{suffix}</span>}
        </div>
        <div className="kpi-card-label">{label}</div>
        {sub && <div className="kpi-card-sub">{sub}</div>}
      </div>
    </div>
  );
}

// ─── KPI Bar ─────────────────────────────────────────────────────
const KpiBar = memo(function KpiBar({ charts }) {
  const kpis = useMemo(() => {
    if (!charts.length) return [];

    const allValues = charts.flatMap((chart) => {
      const data = datasets[chart.table] ?? [];
      return data.map((d) => Number(d[chart.yField])).filter((v) => !isNaN(v));
    });

    const totalRecords = charts.reduce((sum, c) => sum + (datasets[c.table]?.length ?? 0), 0);
    const maxVal       = allValues.length ? Math.max(...allValues) : 0;
    const minVal       = allValues.length ? Math.min(...allValues) : 0;
    const avgVal       = allValues.length ? allValues.reduce((a, b) => a + b, 0) / allValues.length : 0;

    // Trend: compare first half vs second half of all values
    const half  = Math.floor(allValues.length / 2);
    const first = allValues.slice(0, half).reduce((a, b) => a + b, 0) / (half || 1);
    const last  = allValues.slice(half).reduce((a, b) => a + b, 0) / ((allValues.length - half) || 1);
    const trendPct = first > 0 ? (((last - first) / first) * 100).toFixed(1) : null;
    const trendDir = trendPct > 0 ? "↑" : trendPct < 0 ? "↓" : "→";

    return [
      {
        icon: "📊", label: "Charts", value: charts.length, accent: "#1677ff",
        sub: `${totalRecords.toLocaleString()} total rows`,
      },
      {
        icon: "📈", label: "Peak Value", value: maxVal, accent: "#52c41a",
        sub: "across all charts",
      },
      {
        icon: "📉", label: "Min Value", value: minVal, accent: "#fa8c16",
        sub: "across all charts",
      },
      {
        icon: "✦", label: "Avg Value", value: parseFloat(avgVal.toFixed(1)), accent: "#722ed1",
        sub: trendPct !== null ? `Trend ${trendDir} ${Math.abs(trendPct)}%` : undefined,
      },
    ];
  }, [charts]);

  if (!kpis.length) return null;

  return (
    <div className="kpi-bar" role="region" aria-label="Dashboard KPIs">
      {kpis.map((k, i) => (
        <KpiCard key={i} {...k} />
      ))}
    </div>
  );
});

export default KpiBar;
