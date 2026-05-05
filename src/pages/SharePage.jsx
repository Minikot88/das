import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useStore } from "../store/useStore";
import ReadOnlyDashboardHeader from "../components/ui/ReadOnlyDashboardHeader";
import ReadOnlyChartFrame from "../components/ui/ReadOnlyChartFrame";
import ReadOnlyStateCard from "../components/ui/ReadOnlyStateCard";

export default function SharePage() {
  const { sheetId } = useParams();
  const projects = useStore((state) => state.projects);
  const chartsPool = useStore((state) => state.charts);
  const resolveShareLink = useStore((state) => state.resolveShareLink);
  const [loading, setLoading] = useState(true);

  const sheet = useMemo(() => {
    const shareRecord = resolveShareLink(sheetId);
    const resolvedSheetId = shareRecord?.sheetId ?? sheetId;
    if (!resolvedSheetId) return null;

    for (const project of projects ?? []) {
      const foundSheet = project?.sheets?.find((candidate) => candidate?.id === resolvedSheetId);
      if (foundSheet) return foundSheet;
    }

    return null;
  }, [projects, resolveShareLink, sheetId]);

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 180);
    return () => window.clearTimeout(timer);
  }, [sheetId, sheet]);

  const activeDashboard = sheet?.dashboards?.[0] ?? null;
  const dashboardCharts = useMemo(() => {
    if (!activeDashboard?.layout) return [];

    return activeDashboard.layout
      .map((item) => {
        const savedChart = chartsPool.find((chart) => chart.id === item.chartId);
        if (!savedChart) return null;

        return {
          ...savedChart,
          id: item.i,
          chartId: savedChart.id,
          title: item.titleOverride || savedChart.title || savedChart.name,
          name: item.titleOverride || savedChart.title || savedChart.name,
          rows: Array.isArray(savedChart.rows)
            ? savedChart.rows
            : Array.isArray(savedChart.data)
              ? savedChart.data
              : savedChart.config?.rows ?? [],
        };
      })
      .filter(Boolean);
  }, [activeDashboard, chartsPool]);

  const shareSummary = useMemo(() => {
    if (!dashboardCharts.length) {
      return {
        chartCount: 0,
        chartTypes: 0,
        primaryDataset: "No dataset",
        updatedLabel: "Ready",
      };
    }

    const typeSet = new Set();
    const datasetCounts = new Map();

    for (const chart of dashboardCharts) {
      if (chart.type) typeSet.add(chart.type);
      if (chart.dataset) {
        datasetCounts.set(chart.dataset, (datasetCounts.get(chart.dataset) ?? 0) + 1);
      }
    }

    const primaryDataset = [...datasetCounts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? "No dataset";

    return {
      chartCount: dashboardCharts.length,
      chartTypes: typeSet.size,
      primaryDataset,
      updatedLabel: activeDashboard?.name ? "Published" : "Ready",
    };
  }, [activeDashboard?.name, dashboardCharts]);

  const dashboardTitle = activeDashboard?.name ?? "Shared dashboard";

  if (loading) {
    return (
      <div className="share-page share-page-shell">
        <ReadOnlyStateCard
          loading
          kicker="Preparing shared view"
          title="Loading dashboard"
          description="Please wait a moment."
        />
      </div>
    );
  }

  if (!sheet) {
    return (
      <div className="share-page share-page-shell">
        <ReadOnlyStateCard
          kicker="Link unavailable"
          title="Dashboard not found"
          description="This shared link may have expired or been removed."
          linkTo="/login"
          linkLabel="Go to sign in"
        />
      </div>
    );
  }

  return (
    <div className="share-page share-page-shell">
      <ReadOnlyDashboardHeader
        title={sheet?.name ?? "Shared sheet"}
        dashboardName={dashboardTitle}
        chartCount={dashboardCharts.length}
        chartTypes={shareSummary.chartTypes}
        primaryDataset={shareSummary.primaryDataset}
        statusLabel={shareSummary.updatedLabel}
      />

      <section className="share-content-shell">
        {dashboardCharts.length ? (
          <div className="readonly-overview-grid">
            <div className="readonly-summary-strip" role="region" aria-label="Shared dashboard summary">
              <div className="readonly-summary-card accent">
                <span className="readonly-summary-label">Charts</span>
                <strong className="readonly-summary-value">{shareSummary.chartCount}</strong>
              </div>
              <div className="readonly-summary-card">
                <span className="readonly-summary-label">Types</span>
                <strong className="readonly-summary-value">{shareSummary.chartTypes}</strong>
              </div>
              <div className="readonly-summary-card">
                <span className="readonly-summary-label">Dataset</span>
                <strong className="readonly-summary-value">{shareSummary.primaryDataset}</strong>
              </div>
            </div>

            <aside className="readonly-viewer-note" aria-label="Read only details">
              <span className="readonly-viewer-note-kicker">Read only</span>
              <h2 className="readonly-viewer-note-title">{dashboardTitle}</h2>
              <div className="readonly-viewer-note-list">
                <span>Editing disabled</span>
                <span>Layout preserved</span>
                <span>No sign in required</span>
              </div>
            </aside>
          </div>
        ) : null}

        {!dashboardCharts.length ? (
          <ReadOnlyStateCard
            kicker="No charts yet"
            title="This dashboard does not have any charts"
            description="Try again later after new charts have been saved."
            linkTo="/login"
            linkLabel="Sign in"
          />
        ) : (
          <div className="share-grid" role="list" aria-label="Shared charts">
            {dashboardCharts.map((chart) => (
              <ReadOnlyChartFrame key={chart.id} chart={chart} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
