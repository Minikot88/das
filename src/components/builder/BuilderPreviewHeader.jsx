import React from "react";

export default function BuilderPreviewHeader({
  title,
  name,
  subtitle,
  chartDefinition,
  activeChartLabel,
  selectedTable,
  hasQueryPreview,
  readinessLabel,
  mappedCount,
  mappedTarget,
  slotAssignments,
  validationSummary,
  compact = false,
}) {
  const mappedLabels = slotAssignments.filter((slot) => slot.field).map((slot) => `${slot.label}: ${slot.field}`);
  const blockerTitles = validationSummary?.blockers?.map((item) => item.title) ?? [];
  const cautionTitles = validationSummary?.cautions?.map((item) => item.title) ?? [];
  const effectiveTitle = title || name || activeChartLabel || "Preview";

  return (
    <div className={`builder-preview-header builder-preview-header-upgraded${compact ? " compact" : ""}`}>
      <div className="builder-preview-main">
        <div className="builder-preview-title-row">
          <div className="builder-section-kicker">Preview</div>
          <div className="builder-preview-chip-row">
            <span className="builder-preview-chip">{activeChartLabel ?? "Chart"}</span>
            <span className={`builder-preview-chip subtle${hasQueryPreview ? " is-ready" : ""}`}>
              {hasQueryPreview ? "SQL Ready" : "SQL Pending"}
            </span>
          </div>
        </div>

        <h2 className="builder-preview-title">{effectiveTitle}</h2>
        <p className="builder-preview-sub compact">
          {selectedTable
            ? `${chartDefinition.title} · ${selectedTable}`
            : "Table and fields required."}
        </p>
        {subtitle ? <p className="builder-preview-sub builder-preview-sub-muted">{subtitle}</p> : null}

        <div className="builder-preview-overview compact">
          <span className="builder-preview-overview-pill">{mappedCount}/{mappedTarget} mapped</span>
          <span className="builder-preview-overview-pill subtle">{readinessLabel}</span>
          {mappedLabels.map((label) => (
            <span key={label} className="builder-preview-overview-pill subtle-light">{label}</span>
          ))}
        </div>

        {!compact && cautionTitles.length > 0 && blockerTitles.length === 0 ? (
          <div className="builder-preview-guidance">
            <span className="builder-preview-guidance-label">Note</span>
            <span>{cautionTitles[0]}</span>
          </div>
        ) : null}

        {!!blockerTitles.length && !compact && (
          <div className="builder-preview-alerts">
            {blockerTitles.map((titleText) => (
              <span key={titleText} className="builder-preview-alert-pill">{titleText}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
