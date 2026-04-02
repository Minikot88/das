/**
 * pages/SharePage.jsx
 * Public, read-only view for dashboards.
 */
import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useStore } from "../store/useStore";
import { normalizeChartConfig } from "../utils/normalizeChartConfig";
import ReadOnlyDashboardHeader from "../components/ui/ReadOnlyDashboardHeader";
import ReadOnlyChartFrame from "../components/ui/ReadOnlyChartFrame";
import ReadOnlyStateCard from "../components/ui/ReadOnlyStateCard";

export default function SharePage() {
  const { sheetId } = useParams();
  const projects = useStore((s) => s.projects);
  const chartsPool = useStore((s) => s.charts);
  const resolveShareLink = useStore((s) => s.resolveShareLink);

  const [sheet, setSheet] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      const shareRecord = resolveShareLink(sheetId);
      const resolvedSheetId = shareRecord?.sheetId ?? sheetId;
      let found = null;

      for (const project of projects) {
        found = project.sheets.find((candidate) => candidate.id === resolvedSheetId);
        if (found) break;
      }

      setSheet(found ?? null);
      setLoading(false);
    }, 400);

    return () => clearTimeout(timer);
  }, [sheetId, projects, resolveShareLink]);

  const activeDashboard = sheet?.dashboards?.[0] ?? null;
  const dashboardCharts = useMemo(() => {
    if (!activeDashboard?.layout) return [];

    return activeDashboard.layout
      .map((item) => {
        const saved = chartsPool.find((chart) => chart.id === item.chartId);
        return saved
          ? { ...normalizeChartConfig(saved.config), id: item.i, chartId: saved.id }
          : null;
      })
      .filter(Boolean);
  }, [activeDashboard, chartsPool]);

  const shareSummary = useMemo(() => {
    if (!dashboardCharts.length) {
      return {
        chartCount: 0,
        chartTypes: 0,
        primaryDataset: "Unavailable",
        updatedLabel: "Ready for review",
      };
    }

    const typeSet = new Set();
    const datasetCounts = new Map();

    for (const chart of dashboardCharts) {
      if (chart.chartType) typeSet.add(chart.chartType);
      if (chart.dataset) {
        datasetCounts.set(chart.dataset, (datasetCounts.get(chart.dataset) ?? 0) + 1);
      }
    }

    const primaryDataset = [...datasetCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Unavailable";

    return {
      chartCount: dashboardCharts.length,
      chartTypes: typeSet.size,
      primaryDataset,
      updatedLabel: activeDashboard?.name ? "Published shared view" : "Ready for review",
    };
  }, [activeDashboard?.name, dashboardCharts]);

  const dashboardTitle = activeDashboard?.name ?? "Shared View";

  if (loading) {
    return (
      <div className="share-page share-page-shell">
        <ReadOnlyStateCard
          loading
          kicker="Preparing Shared View"
          title="Loading dashboard"
          description="Please wait while we prepare this read-only dashboard for viewing."
        />
      </div>
    );
  }

  if (!sheet) {
    return (
      <div className="share-page share-page-shell">
        <ReadOnlyStateCard
          kicker="Link Unavailable"
          title="Dashboard not found"
          description="This shared link may have expired, been removed, or no longer has an available dashboard behind it."
          linkTo="/login"
          linkLabel="Go to sign in"
        />
      </div>
    );
  }

  return (
    <div className="share-page share-page-shell">
      <ReadOnlyDashboardHeader
        title={sheet.name}
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
                <span className="readonly-summary-label">Available charts</span>
                <strong className="readonly-summary-value">{shareSummary.chartCount}</strong>
                <p className="readonly-summary-note">Prepared for secure read-only review.</p>
              </div>
              <div className="readonly-summary-card">
                <span className="readonly-summary-label">Visualization mix</span>
                <strong className="readonly-summary-value">{shareSummary.chartTypes} types</strong>
                <p className="readonly-summary-note">Clear framing across the current dashboard layout.</p>
              </div>
              <div className="readonly-summary-card">
                <span className="readonly-summary-label">Primary dataset</span>
                <strong className="readonly-summary-value">{shareSummary.primaryDataset}</strong>
                <p className="readonly-summary-note">Presented exactly as shared by the dashboard owner.</p>
              </div>
            </div>

            <aside className="readonly-viewer-note" aria-label="Read-only viewer guidance">
              <span className="readonly-viewer-note-kicker">Viewer Notes</span>
              <h2 className="readonly-viewer-note-title">{dashboardTitle}</h2>
              <p className="readonly-viewer-note-text">
                This shared link opens a stable presentation view with editing, layout changes, and builder actions disabled.
              </p>
              <div className="readonly-viewer-note-list">
                <span>Read-only access only</span>
                <span>Shared chart layout preserved</span>
                <span>No sign-in required to review</span>
              </div>
            </aside>
          </div>
        ) : null}

        {!dashboardCharts.length ? (
          <ReadOnlyStateCard
            kicker="No Charts Yet"
            title="This shared dashboard has no charts"
            description="The owner has not published any visualizations to this read-only view yet. Check back later or ask them to republish the dashboard when content is ready."
            linkTo="/login"
            linkLabel="Sign in"
          />
        ) : (
          <div className="share-grid" role="list" aria-label="Shared dashboard charts">
            {dashboardCharts.map((chart) => (
              <ReadOnlyChartFrame key={chart.id} chart={chart} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
