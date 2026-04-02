import React from "react";

function ValidationPill({ issue }) {
  return (
    <div className={`builder-validation-pill-row ${issue.level}`}>
      <div className="builder-validation-pill-copy">
        <span className={`builder-validation-pill ${issue.level}`}>{issue.level === "error" ? "Blocker" : "Note"}</span>
        <strong>{issue.title}</strong>
      </div>
      <p>{issue.message}</p>
      {issue.action ? <p className="builder-validation-action-copy">{issue.action}</p> : null}
    </div>
  );
}

export default function BuilderValidationPanel({ blockers = [], cautions = [], nextStep }) {
  const activeIssues = [...blockers, ...cautions];

  return (
    <div className="builder-config-section builder-inspector-section">
      <div className="builder-section-head">
        <div>
          <span className="builder-query-label">Validation</span>
          <p className="builder-section-description">{nextStep ?? "Status"}</p>
        </div>
        <span className={`builder-validation-pill ${blockers.length ? "error" : cautions.length ? "warning" : "success"}`}>
          {activeIssues.length}
        </span>
      </div>

      <div className="builder-inspector-subrow">
        <span>{blockers.length} blockers</span>
        <span>{cautions.length} notes</span>
      </div>

      {activeIssues.length ? (
        <div className="builder-validation-group compact">
          {activeIssues.map((issue) => (
            <ValidationPill key={issue.code} issue={issue} />
          ))}
        </div>
      ) : (
        <div className="builder-validation-empty">Ready to save</div>
      )}
    </div>
  );
}
