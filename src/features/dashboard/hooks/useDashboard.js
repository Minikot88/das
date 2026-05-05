import { useEffect, useMemo, useState } from "react";
import { getDashboardCharts } from "../../../api/dashboardApi";

export default function useDashboard({ projectId, sheetId, dashboardId, layout = [], charts = [] }) {
  const [widgets, setWidgets] = useState([]);
  const refreshKey = useMemo(
    () =>
      JSON.stringify({
        projectId,
        sheetId,
        dashboardId,
        layout: layout.map((item) => [item.i, item.chartId, item.x, item.y, item.w, item.h, item.titleOverride]),
        charts: charts.map((chart) => [chart.id, chart.updatedAt, chart.title, chart.type]),
      }),
    [charts, dashboardId, layout, projectId, sheetId]
  );

  useEffect(() => {
    let isActive = true;

    async function loadDashboard() {
      if (!dashboardId) {
        setWidgets([]);
        return;
      }

      const nextWidgets = await getDashboardCharts(dashboardId, { projectId, sheetId });
      if (isActive) {
        setWidgets(nextWidgets);
      }
    }

    loadDashboard();
    return () => {
      isActive = false;
    };
  }, [dashboardId, projectId, refreshKey, sheetId]);

  return widgets;
}
