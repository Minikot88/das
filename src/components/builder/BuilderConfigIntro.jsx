import React from "react";

export default function BuilderConfigIntro({
  chartDefinition,
  saveSuccess,
  canAddChart,
  validationSummary,
  mappedCount,
  mappedTarget,
}) {
  const statusTone = saveSuccess ? "success" : canAddChart ? "ready" : "idle";
  const blockerCount = validationSummary?.blockers?.length ?? 0;
  const cautionCount = validationSummary?.cautions?.length ?? 0;
  const statusMessage = saveSuccess
    ? "Saved to dashboard"
    : blockerCount
      ? `${blockerCount} blocker${blockerCount > 1 ? "s" : ""} to fix`
      : cautionCount
        ? `${cautionCount} guidance item${cautionCount > 1 ? "s" : ""}`
        : "Ready to save";

  return (
    <div className="builder-config-intro">
      <div className="builder-config-intro-header">
        <div className={`builder-status-badge ${statusTone}`}>
          {saveSuccess ? "Saved" : canAddChart ? "Ready" : "In Progress"}
        </div>
        <div className="builder-config-progress">
          <span className="builder-config-progress-value">{mappedCount}/{mappedTarget}</span>
          <span className="builder-config-progress-label">mapped</span>
        </div>
      </div>
      <div className="builder-config-copy">
        <h3>{chartDefinition.title}</h3>
        <p>{statusMessage}</p>
      </div>
    </div>
  );
}

