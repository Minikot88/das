import React from "react";
import QueryModeSwitch from "./QueryModeSwitch";

export default function SqlEditorPanel({
  queryMode,
  generatedSql,
  customSql,
  queryStatus,
  queryError,
  queryResult,
  lastRunAt,
  onModeChange,
  onSqlChange,
  onRunSql,
  onFormatSql,
  onResetSql,
  onUseResult,
}) {
  const sqlValue = customSql || generatedSql || "";

  return (
    <div className="builder-config-section builder-inspector-section">
      <div className="builder-section-head">
        <div>
          <span className="builder-query-label">Query</span>
          <p className="builder-section-description">Switch between visual builder and SQL editor.</p>
        </div>
      </div>

      <QueryModeSwitch queryMode={queryMode} onChange={onModeChange} />

      {queryMode === "visual" ? (
        <div className="builder-query-visual-summary">
          <div className="builder-query-info-row">
            <span>Generated SQL</span>
            <span>{generatedSql ? `${generatedSql.split("\n").length} lines` : "Pending"}</span>
          </div>
          <pre className="builder-query-generated-preview"><code>{generatedSql || "Waiting for enough fields to generate SQL."}</code></pre>
        </div>
      ) : (
        <div className="builder-sql-editor-stack">
          <textarea
            className="builder-sql-editor"
            value={sqlValue}
            onChange={(event) => onSqlChange(event.target.value)}
            spellCheck={false}
            placeholder="SELECT category, SUM(sales) AS total_sales FROM sales GROUP BY category ORDER BY total_sales DESC LIMIT 10;"
          />

          <div className="builder-sql-toolbar">
            <button type="button" className="builder-sql-btn" onClick={onRunSql}>Run Query</button>
            <button type="button" className="builder-sql-btn" onClick={onFormatSql}>Format SQL</button>
            <button type="button" className="builder-sql-btn" onClick={onResetSql}>Reset</button>
            <button type="button" className="builder-sql-btn" onClick={onUseResult} disabled={!queryResult?.rows?.length}>
              Use Result for Chart
            </button>
          </div>

          <div className="builder-sql-run-meta">
            <span>Status: {queryStatus}</span>
            <span>Rows: {queryResult?.rowCount ?? 0}</span>
            <span>Cols: {queryResult?.columnCount ?? 0}</span>
            <span>Last run: {lastRunAt ? new Date(lastRunAt).toLocaleTimeString() : "Never"}</span>
          </div>

          {queryError ? <div className="builder-sql-error-panel">{queryError}</div> : null}
          {!queryError && queryStatus === "success" && queryResult?.rows?.length ? (
            <div className="builder-sql-success-note">SQL result is active for chart preview.</div>
          ) : null}
          <div className="builder-sql-hint">
            Custom SQL may not be fully reflected by the visual query builder when you switch back.
          </div>
        </div>
      )}
    </div>
  );
}
