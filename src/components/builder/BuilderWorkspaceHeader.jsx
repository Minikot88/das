import React from "react";

export default function BuilderWorkspaceHeader({
  isEditing,
  activeChartLabel,
  chartFamily,
  selectedTable,
  readinessLabel,
  nextStep,
  blockerCount,
  cautionCount,
  mappedCount,
  mappedTarget,
}) {
  const summaryItems = [
    { label: "Mode", value: isEditing ? "Editing existing visual" : "Create new visual" },
    { label: "Dataset", value: selectedTable ?? "No table selected" },
    { label: "Readiness", value: readinessLabel },
  ];

  return (
    <header className="builder-workspace-header">
      <div className="builder-workspace-header-copy">
        <div className="builder-workspace-header-topline">
          <span className="builder-pane-kicker">Builder workspace</span>
          <span className={`builder-workspace-header-state${blockerCount ? " is-blocked" : ""}`}>
            {blockerCount ? `${blockerCount} blocker${blockerCount > 1 ? "s" : ""}` : "Flow healthy"}
          </span>
        </div>
        <h1 className="builder-workspace-title">{activeChartLabel} builder</h1>
        <p className="builder-workspace-subtitle">
          {chartFamily} visual setup with live preview, mapped fields, and save readiness in one workspace.
        </p>
      </div>

      <div className="builder-workspace-metrics">
        <div className="builder-workspace-metric">
          <span>Mapped</span>
          <strong>{mappedCount}/{mappedTarget}</strong>
        </div>
        <div className="builder-workspace-metric">
          <span>Guidance</span>
          <strong>{cautionCount ? `${cautionCount} notes` : "Clear"}</strong>
        </div>
      </div>

      <div className="builder-workspace-summary">
        {summaryItems.map((item) => (
          <div key={item.label} className="builder-workspace-summary-card">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
        <div className="builder-workspace-summary-card builder-workspace-summary-card-wide">
          <span>Next step</span>
          <strong>{nextStep}</strong>
        </div>
      </div>
    </header>
  );
}
