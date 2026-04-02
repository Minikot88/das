import React, { useEffect, useState } from "react";

function SummaryItem({ label, value, accent = false }) {
  return (
    <div className={`dashboard-summary-item${accent ? " accent" : ""}`}>
      <span className="dashboard-summary-label">{label}</span>
      <strong className="dashboard-summary-value">{value}</strong>
    </div>
  );
}

export default function DashboardToolbar({
  activeDashboardId,
  activeProjectName,
  activeSheetName,
  activeDashboardName,
  chartCount,
  readyChartsCount,
  emptyChartsCount,
  totalWidgetRows,
  coveragePercent,
  leadInsight,
  onRenameDashboard,
  onOpenChartPicker,
  onBuildChart,
}) {
  const [editingTarget, setEditingTarget] = useState(null);
  const [draftName, setDraftName] = useState("");

  useEffect(() => {
    if (!editingTarget) return;
    setDraftName(activeDashboardName || "");
  }, [activeDashboardName, editingTarget]);

  function openRename(target) {
    setEditingTarget(target);
    setDraftName(activeDashboardName || "");
  }

  function closeRename() {
    setEditingTarget(null);
    setDraftName("");
  }

  function submitRename(event) {
    event.preventDefault();

    const nextName = draftName.trim();
    if (!nextName) return;

    if (editingTarget === "dashboard" && activeDashboardId) {
      onRenameDashboard?.(activeDashboardId, nextName);
    }

    closeRename();
  }

  const renameTargetLabel = "view";
  const workspaceTone = emptyChartsCount
    ? emptyChartsCount >= chartCount
      ? "Needs attention"
      : "Monitoring exceptions"
    : "Fully active";
  const workspaceStats = [
    { label: "Widgets", value: chartCount, accent: true },
    { label: "Reporting", value: readyChartsCount ?? chartCount },
    { label: "Coverage", value: `${coveragePercent ?? 0}%` },
    { label: "Rows in scope", value: totalWidgetRows?.toLocaleString?.() ?? "0" },
  ];

  return (
    <section className="dashboard-page-header" aria-label="Dashboard header">
      <div className="dashboard-page-header-main dashboard-page-header-main-premium">
        <div className="dashboard-page-kicker-row">
          <span className="dashboard-page-kicker">Analytics workspace</span>
          <span className={`dashboard-page-status-badge${emptyChartsCount ? " is-warning" : ""}`}>
            {workspaceTone}
          </span>
        </div>

        <div className="dashboard-page-heading-layout">
          <div className="dashboard-page-heading-copy">
            <div className="dashboard-page-breadcrumb">
              <span>{activeProjectName || "Project"}</span>
              <span>/</span>
              <span>{activeSheetName || "Sheet"}</span>
              <span>/</span>
              <span>{activeDashboardName || "View"}</span>
            </div>
            <h1 className="dashboard-page-title">{activeDashboardName || "Dashboard"}</h1>
            <p className="dashboard-page-subtitle">
              A focused analytical workspace for monitoring the live board.
            </p>

            <div className="dashboard-page-inline-metrics" aria-label="Dashboard overview">
              <div className="dashboard-page-inline-metric">
                <span>Widgets</span>
                <strong>{chartCount}</strong>
              </div>
              <div className="dashboard-page-inline-metric">
                <span>Coverage</span>
                <strong>{coveragePercent ?? 0}%</strong>
              </div>
              <div className="dashboard-page-inline-metric">
                <span>Rows in scope</span>
                <strong>{totalWidgetRows?.toLocaleString?.() ?? "0"}</strong>
              </div>
            </div>
          </div>

          <div className="dashboard-page-spotlight-card" aria-label="Workspace spotlight">
            <div className="dashboard-page-spotlight-head">
              <span className="dashboard-page-spotlight-kicker">Workspace signal</span>
              <strong>{leadInsight?.title ?? "Board ready for review"}</strong>
            </div>
            <p className="dashboard-page-spotlight-copy">
              {leadInsight
                ? `Trend: ${leadInsight.trendLabel}. Max ${leadInsight.max}. Min ${leadInsight.min}.`
                : "Use the live widget canvas to compare charts, review coverage, and export what matters."}
            </p>
            <div className="dashboard-page-spotlight-meta">
              <span>{readyChartsCount ?? chartCount} reporting widgets</span>
              <span>{emptyChartsCount ?? 0} empty widgets</span>
              <span>{coveragePercent ?? 0}% coverage</span>
            </div>

            <div className="dashboard-toolbar-actions">
              <button
                type="button"
                className={`add-chart-btn secondary${editingTarget === "dashboard" ? " is-active" : ""}`}
                onClick={() => openRename("dashboard")}
              >
                Rename View
              </button>
              <button
                type="button"
                className="add-chart-btn secondary"
                onClick={onOpenChartPicker}
              >
                Add Saved Chart
              </button>
              <button type="button" className="add-chart-btn" onClick={onBuildChart}>
                Build New Chart
              </button>
            </div>
          </div>
        </div>

        {editingTarget ? (
          <form className="dashboard-rename-panel" onSubmit={submitRename}>
            <div className="dashboard-rename-copy">
              <span className="dashboard-rename-kicker">Quick rename</span>
              <strong className="dashboard-rename-title">
                Update the active {renameTargetLabel} name without leaving the dashboard.
              </strong>
            </div>
            <input
              className="dashboard-rename-input"
              value={draftName}
              maxLength={80}
              onChange={(event) => setDraftName(event.target.value)}
              placeholder="Enter view name"
              autoFocus
            />
            <div className="dashboard-rename-actions">
              <button
                type="button"
                className="dashboard-rename-btn ghost"
                onClick={closeRename}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="dashboard-rename-btn"
                disabled={!draftName.trim()}
              >
                Save {renameTargetLabel}
              </button>
            </div>
          </form>
        ) : null}
      </div>

      <div className="dashboard-summary-strip dashboard-summary-strip-compact">
        <SummaryItem label="Project" value={activeProjectName || "Untitled"} />
        <SummaryItem label="Sheet" value={activeSheetName || "Not selected"} />
        <SummaryItem label="View" value={activeDashboardName || "Untitled"} />
        <SummaryItem label="Active Coverage" value={`${coveragePercent ?? 0}%`} accent />
      </div>

      <div className="dashboard-workspace-stats">
        {workspaceStats.map((item) => (
          <SummaryItem
            key={item.label}
            label={item.label}
            value={item.value}
            accent={item.accent}
          />
        ))}
      </div>
    </section>
  );
}
