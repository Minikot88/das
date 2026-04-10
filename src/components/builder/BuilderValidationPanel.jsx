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

export default function BuilderValidationPanel({
  chartMeta,
  roleAssignments = [],
  roleValidation,
  blockers = [],
  cautions = [],
  nextStep,
  queryError,
}) {
  const activeIssues = [
    ...(queryError
      ? [{
          level: "error",
          code: "sql-query-error",
          title: "Query error",
          message: queryError,
          action: "Fix the SQL or switch back to visual mode.",
        }]
      : []),
    ...blockers,
    ...cautions,
  ];
  const invalidCodes = new Set(blockers.map((issue) => issue.code));

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

      {roleAssignments?.length ? (
        <div style={{ display: "grid", gap: "8px", marginBottom: activeIssues.length ? "10px" : "0" }}>
          {roleAssignments.filter((role) => role.required).map((role) => {
            const hasValue = Boolean(role.fields?.length);
            const invalid = Array.from(invalidCodes).some((code) => code.includes(role.key));
            const roleState = roleValidation?.roleStates?.[role.key];

            return (
              <div
                key={role.key}
                style={{
                  border: "1px solid #e5e7eb",
                  background: invalid ? "#fef2f2" : hasValue ? "#f0fdf4" : "#fff",
                  padding: "8px 10px",
                  display: "grid",
                  gap: "3px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                  <strong style={{ fontSize: "12px", color: "#111827" }}>{role.label}</strong>
                  <span className={`builder-validation-pill ${invalid ? "error" : hasValue ? "success" : "warning"}`}>
                    {invalid ? "Invalid" : hasValue ? "Mapped" : "Missing"}
                  </span>
                </div>
                <div style={{ fontSize: "11px", color: "#64748b" }}>
                  {hasValue
                    ? role.fields.map((field) => `${field.name}${field.type ? ` · ${field.type}` : ""}`).join(", ")
                    : roleState?.message ?? role.emptyHint}
                </div>
              </div>
            );
          })}
        </div>
      ) : chartMeta?.requiredFields?.length ? (
        <div style={{ fontSize: "11px", color: "#64748b" }}>
          {chartMeta.requiredFields.map((field) => field.roleLabel).join(", ")}
        </div>
      ) : null}

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
