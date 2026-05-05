import React from "react";

function getStatusLabel(queryMode, queryStatus) {
  if (queryMode === "visual") return "Generated SQL";
  if (queryStatus === "running") return "Running";
  if (queryStatus === "ready") return "Query ready";
  if (queryStatus === "error") return "SQL error";
  return "Manual SQL";
}

export default function QueryModePanel({
  queryMode,
  generatedSql,
  customSql,
  queryStatus,
  queryError,
  queryResult,
  onChangeMode,
  onChangeSql,
  onRunSql,
  onResetSql,
}) {
  const rowCount = queryResult?.rowCount ?? queryResult?.rows?.length ?? 0;
  const columnCount = queryResult?.columnCount ?? queryResult?.columns?.length ?? 0;

  return (
    <section className="builder-v3-panel builder-v3-query-panel">
      <div className="builder-v3-section-head">
        <div>
          <span className="builder-v3-kicker">Query</span>
          <h2 className="builder-v3-title">Visual and SQL mode</h2>
        </div>
        <span className={`builder-v3-pill${queryStatus === "ready" ? " is-success" : queryStatus === "error" ? " is-warning" : ""}`}>
          {getStatusLabel(queryMode, queryStatus)}
        </span>
      </div>

      <div className="builder-v3-mode-switch">
        <button
          type="button"
          className={`builder-v3-mode-tab${queryMode === "visual" ? " is-active" : ""}`}
          onClick={() => onChangeMode("visual")}
        >
          Visual
        </button>
        <button
          type="button"
          className={`builder-v3-mode-tab${queryMode === "sql" ? " is-active" : ""}`}
          onClick={() => onChangeMode("sql")}
        >
          SQL
        </button>
      </div>

      {queryMode === "visual" ? (
        <div className="builder-v3-sql-preview-card">
          <div className="builder-v3-inline-meta">
            <strong>Generated SQL</strong>
            <span>Updates from chart mapping and settings.</span>
          </div>
          <pre className="builder-v3-sql-block">{generatedSql || "Map fields to generate SQL."}</pre>
        </div>
      ) : (
        <div className="builder-v3-sql-editor-stack">
          <div className="builder-v3-inline-meta">
            <strong>Manual SQL</strong>
            <span>Supported: SELECT, aliases, SUM, AVG, COUNT, MIN, MAX, GROUP BY, ORDER BY, LIMIT.</span>
          </div>
          <textarea
            className="builder-v3-sql-editor"
            value={customSql}
            onChange={(event) => onChangeSql(event.target.value)}
            spellCheck={false}
            placeholder="SELECT month, SUM(sales) AS sales FROM sales_performance GROUP BY month ORDER BY month"
          />
          <div className="builder-v3-save-actions">
            <button type="button" className="builder-v3-button" onClick={onResetSql}>
              Use generated SQL
            </button>
            <button
              type="button"
              className="builder-v3-button is-primary"
              onClick={onRunSql}
              disabled={queryStatus === "running"}
            >
              {queryStatus === "running" ? "Running..." : "Run SQL"}
            </button>
          </div>

          {queryError ? (
            <div className="builder-v3-validation-card is-error">
              <p>{queryError}</p>
            </div>
          ) : null}

          {!queryError && queryStatus === "ready" ? (
            <div className="builder-v3-query-result-card">
              <strong>Result set</strong>
              <span>{rowCount} rows</span>
              <span>{columnCount} columns</span>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
