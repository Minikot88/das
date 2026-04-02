import React from "react";

export default function DashboardEmptyState({ savedChartCount = 0, onBuildChart, onOpenChartPicker }) {
  return (
    <div className="dashboard-empty-card">
      <div className="dashboard-empty-hero">
        <div className="dashboard-empty-visual" aria-hidden="true">
          {[60, 85, 45, 95, 70, 55, 80].map((height, index) => (
            <div
              key={index}
              className="dashboard-empty-bar"
              style={{ height: `${height}%`, animationDelay: `${index * 0.07}s` }}
            />
          ))}
        </div>

        <div className="dashboard-empty-panel">
          <div className="dashboard-empty-panel-kicker">Dashboard Canvas</div>
          <div className="dashboard-empty-panel-grid">
            <div className="dashboard-empty-panel-card">
              <span>Saved charts</span>
              <strong>{savedChartCount}</strong>
            </div>
            <div className="dashboard-empty-panel-card">
              <span>Next move</span>
              <strong>{savedChartCount ? "Place a proven widget" : "Start with Builder"}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-empty-copy">
        <div className="dashboard-empty-kicker">No widgets yet</div>
        <h2 className="dashboard-empty-title">Shape this dashboard into a decision-ready workspace</h2>
        <p className="dashboard-empty-subtitle">
          Add a saved widget for speed or build a new chart to define the first story this dashboard should tell.
        </p>
      </div>

      <div className="dashboard-empty-status-strip">
        <div className="dashboard-empty-status-card">
          <span>Canvas status</span>
          <strong>Ready for first widget</strong>
        </div>
        <div className="dashboard-empty-status-card">
          <span>Builder path</span>
          <strong>Chart Builder</strong>
        </div>
        <div className="dashboard-empty-status-card">
          <span>Library path</span>
          <strong>{savedChartCount ? "Saved chart library" : "No saved charts yet"}</strong>
        </div>
      </div>

      <div className="dashboard-empty-guidance" aria-label="Dashboard setup guidance">
        <div className="dashboard-empty-guidance-item">
          <span className="dashboard-empty-guidance-step">01</span>
          <div>
            <strong>Add your first widget</strong>
            <p>Start with a KPI, trend, or comparison chart that answers the main business question.</p>
          </div>
        </div>
        <div className="dashboard-empty-guidance-item">
          <span className="dashboard-empty-guidance-step">02</span>
          <div>
            <strong>Layer in saved views</strong>
            <p>Reuse proven charts from your project library to populate this canvas quickly.</p>
          </div>
        </div>
        <div className="dashboard-empty-guidance-item">
          <span className="dashboard-empty-guidance-step">03</span>
          <div>
            <strong>Refine with filters</strong>
            <p>Once widgets are in place, use global filters to turn the dashboard into a focused operator view.</p>
          </div>
        </div>
      </div>

      <div className="dashboard-empty-actions">
        {savedChartCount ? (
          <button type="button" className="add-chart-btn secondary" onClick={onOpenChartPicker}>
            Add Saved Chart
          </button>
        ) : null}
        <button type="button" className="add-chart-btn empty-cta" onClick={onBuildChart}>
          Build First Chart
        </button>
      </div>
    </div>
  );
}
