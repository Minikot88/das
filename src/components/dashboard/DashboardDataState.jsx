import React from "react";

export default function DashboardDataState({
  chartCount,
  emptyChartsCount,
  onBuildChart,
}) {
  if (!chartCount || !emptyChartsCount) {
    return null;
  }

  const allEmpty = emptyChartsCount >= chartCount;
  const title = allEmpty
    ? "No widgets are returning data"
    : `${emptyChartsCount} widget${emptyChartsCount > 1 ? "s" : ""} need attention`;
  const description = allEmpty
    ? "The active queries returned empty results."
    : "Some widgets are healthy while others need broader coverage.";

  return (
    <section
      className={`dashboard-data-state${allEmpty ? " is-critical" : ""}`}
      aria-label="Dashboard data status"
    >
      <div className="dashboard-data-state-leading">
        <div className="dashboard-data-state-severity" aria-hidden="true" />
        <div className="dashboard-data-state-copy">
          <span className="dashboard-data-state-kicker">
            {allEmpty ? "No Data Returned" : "Partial Data Coverage"}
          </span>
          <h2 className="dashboard-data-state-title">{title}</h2>
          <p className="dashboard-data-state-subtitle">{description}</p>
        </div>
      </div>

      <div className="dashboard-data-state-meta">
        <div className="dashboard-data-state-stat">
          <span>Widgets with data</span>
          <strong>{Math.max(chartCount - emptyChartsCount, 0)}</strong>
        </div>
        <div className="dashboard-data-state-stat">
          <span>Empty widgets</span>
          <strong>{emptyChartsCount}</strong>
        </div>
      </div>

      <div className="dashboard-data-state-actions">
        <button type="button" className="add-chart-btn" onClick={onBuildChart}>
          Build Another Chart
        </button>
      </div>

      <div className="dashboard-data-state-footer">
        {allEmpty
          ? "Every active widget is currently empty."
          : "Some widgets are healthy while others need broader coverage."}
      </div>
    </section>
  );
}
