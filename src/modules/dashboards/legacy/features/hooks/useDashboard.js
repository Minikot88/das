import { useEffect, useMemo, useState } from "react";
import { getDashboardCharts } from "@modules/dashboards/api/dashboardApi";

export default function useDashboard({ projectId, sheetId, dashboardId, layout = [], charts = [] }) {
  const [widgets, setWidgets] = useState([]);
  const refreshKey = useMemo(
    () =>
      [
        projectId,
        sheetId,
        dashboardId,
        layout.map((item) => `${item.i}:${item.chartId}:${item.x}:${item.y}:${item.w}:${item.h}:${item.titleOverride ?? ""}`).join("|"),
        charts.map((chart) => `${chart.id}:${chart.updatedAt ?? ""}:${chart.title ?? ""}:${chart.type ?? ""}`).join("|"),
      ].join("::"),
    [charts, dashboardId, layout, projectId, sheetId]
  );

  useEffect(() => {
    let isActive = true;

    async function loadDashboard() {
      if (!dashboardId) {
        setWidgets([]);
        return;
      }

      try {
        const nextWidgets = await getDashboardCharts(dashboardId, { projectId, sheetId });
        if (isActive) {
          setWidgets(Array.isArray(nextWidgets) ? nextWidgets : []);
        }
      } catch {
        if (isActive) {
          setWidgets([]);
        }
      }
    }

    loadDashboard();
    return () => {
      isActive = false;
    };
  }, [dashboardId, projectId, refreshKey, sheetId]);

  return widgets;
}
