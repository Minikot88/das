import React from "react";

function getShapeLabel(chartDefinition, slots) {
  const mapped = slots.filter((slot) => slot.field).map((slot) => slot.label);
  if (!mapped.length) return "Pending";
  return `${chartDefinition.family} · ${mapped.join(" / ")}`;
}

export default function BuilderQuerySection({
  chartDefinition,
  selectedTable,
  aggregation,
  queryPreview,
  slotAssignments,
}) {
  const sql = queryPreview?.sql ?? "";
  const params = queryPreview?.params ?? [];
  const columns = queryPreview?.columns ?? [];
  const rowCount = queryPreview?.rowCount ?? 0;
  const columnCount = queryPreview?.columnCount ?? columns.length;
  const hasSql = Boolean(sql);

  const handleCopySql = async () => {
    if (!sql) return;
    try {
      await navigator.clipboard?.writeText(sql);
    } catch {
      // Ignore clipboard failures in unsupported environments.
    }
  };

  return (
    <div className="builder-query-panel">
      <div className="builder-query-header">
        <div className="builder-query-header-copy">
          <span className="builder-query-label">Query</span>
          <p className="builder-section-description">{queryPreview?.mode === "sql" ? "SQL mode" : "Visual mode"}</p>
        </div>
        <div className="builder-query-header-actions">
          <span className={`builder-query-status${hasSql ? " ready" : ""}`}>{rowCount} rows</span>
          <button type="button" className="builder-query-copy-btn" onClick={handleCopySql} disabled={!hasSql}>
            Copy SQL
          </button>
        </div>
      </div>

      <div className="builder-query-summary">
        <div className="builder-query-row builder-query-row-compact">
          <div className="builder-query-tags">
            <span className="builder-query-tag">{selectedTable ?? "No table"}</span>
            {slotAssignments.filter((slot) => slot.field).map((slot) => (
              <span key={slot.key} className="builder-query-tag">{slot.label}: {slot.field}</span>
            ))}
            {queryPreview?.aggregate ? (
              <span className="builder-query-tag builder-query-tag-accent">{String(aggregation ?? queryPreview.aggregate).toUpperCase()}</span>
            ) : null}
            <span className="builder-query-tag builder-query-tag-soft">{columnCount} cols</span>
            <span className="builder-query-tag builder-query-tag-muted">{getShapeLabel(chartDefinition, slotAssignments)}</span>
          </div>
        </div>

        {queryPreview?.error ? (
          <div className="builder-query-sql-empty">{queryPreview.error}</div>
        ) : null}

        <div className="builder-query-sql-panel">
          <div className="builder-query-sql-header">
            <div>
              <span className="builder-query-label">SQL</span>
            </div>
            <span className="builder-query-sql-badge">{hasSql ? `${sql.split("\n").length} lines` : "Incomplete"}</span>
          </div>
          {hasSql ? (
            <pre className="builder-query-sql-block">
              <code>{sql}</code>
            </pre>
          ) : (
            <div className="builder-query-sql-empty">
              Pending
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

