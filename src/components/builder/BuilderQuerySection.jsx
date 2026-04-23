import React from "react";

function getShapeLabel(chartDefinition, slots) {
  const mapped = slots.filter((slot) => slot.field).map((slot) => slot.label);
  if (!mapped.length) return "รอการแมป";
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
  const rowCount = queryPreview?.rowCount ?? 0;
  const columnCount = queryPreview?.columnCount ?? (queryPreview?.columns?.length ?? 0);
  const hasSql = Boolean(sql);
  const isSqlMode = queryPreview?.mode === "sql";

  const handleCopySql = async () => {
    if (!sql) return;
    try {
      await navigator.clipboard?.writeText(sql);
    } catch {
      // Ignore clipboard failures.
    }
  };

  return (
    <section className="builder-query-panel" style={{ gap: 6 }} aria-label="Query panel">
      <div
        className="builder-query-header"
        style={{
          listStyle: "none",
        }}
      >
        <div className="builder-query-header-copy">
          <span className="builder-query-label">Query</span>
          <p className="builder-section-description">{isSqlMode ? "SQL mode" : "Visual mode"}</p>
        </div>
        <div className="builder-query-header-actions">
          <span className={`builder-query-status${hasSql ? " ready" : ""}`}>{rowCount} rows</span>
          <span className="builder-query-sql-badge">{hasSql ? `${sql.split("\n").length} lines` : "Waiting"}</span>
        </div>
      </div>

      <div className="builder-query-summary">
        <div className="builder-query-row builder-query-row-compact">
          <div className="builder-query-tags">
            <span className="builder-query-tag">{selectedTable ?? "No table"}</span>
            {slotAssignments.filter((slot) => slot.field).slice(0, 3).map((slot) => (
              <span key={slot.key} className="builder-query-tag">{slot.label}: {slot.field}</span>
            ))}
            {queryPreview?.aggregate ? (
              <span className="builder-query-tag builder-query-tag-accent">{String(aggregation ?? queryPreview.aggregate).toUpperCase()}</span>
            ) : null}
            <span className="builder-query-tag builder-query-tag-soft">{columnCount} cols</span>
            <span className="builder-query-tag builder-query-tag-muted">{getShapeLabel(chartDefinition, slotAssignments)}</span>
          </div>
        </div>

        {queryPreview?.error ? <div className="builder-query-sql-empty">{queryPreview.error}</div> : null}

        <div className="builder-query-sql-panel">
          <div className="builder-query-sql-header">
            <div>
              <span className="builder-query-label">SQL</span>
            </div>
            <div className="builder-query-header-actions" style={{ gap: 6 }}>
              <button type="button" className="builder-query-copy-btn" onClick={handleCopySql} disabled={!hasSql}>
                Copy SQL
              </button>
            </div>
          </div>
          {hasSql ? (
            <pre className="builder-query-sql-block">
              <code>{sql}</code>
            </pre>
          ) : (
            <div className="builder-query-sql-empty">Waiting for a complete mapping.</div>
          )}
        </div>
      </div>
    </section>
  );
}
