import React from "react";

export default function ChartSavePanel({
  builderContext,
  validation,
  saving,
  error,
  onSave,
  onCancel,
}) {
  const contextLabel = builderContext
    ? `${builderContext.projectId} / ${builderContext.sheetId} / ${builderContext.dashboardId}`
    : "Unavailable";

  return (
    <section className="builder-v3-panel builder-v3-save-panel">
      <div className="builder-v3-section-head">
        <div>
          <span className="builder-v3-kicker">Save</span>
          <h2 className="builder-v3-title">Add to dashboard</h2>
        </div>
      </div>

      <div className="builder-v3-save-card">
        <strong>Target context</strong>
        <span>{contextLabel}</span>
      </div>

      {error ? <div className="builder-v3-validation-card is-error"><p>{error}</p></div> : null}
      {!error && validation.warnings.length ? (
        <div className="builder-v3-validation-card">
          {validation.warnings.map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
      ) : null}

      <div className="builder-v3-save-actions">
        <button type="button" className="builder-v3-button" onClick={onCancel}>
          Back
        </button>
        <button
          type="button"
          className="builder-v3-button is-primary"
          onClick={onSave}
          disabled={!validation.valid || saving}
        >
          {saving ? "Saving..." : "Save chart"}
        </button>
      </div>
    </section>
  );
}
