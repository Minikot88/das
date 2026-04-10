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
    <div className="builder-config-section builder-inspector-section" style={{ gap: 6 }}>
      <div className="builder-section-head">
        <strong className="builder-section-title">Query Mode</strong>
      </div>

      <QueryModeSwitch queryMode={queryMode} onChange={onModeChange} />

      {queryMode === "visual" ? (
        <div className="builder-query-visual-summary" style={{ display: "grid", gap: 6 }}>
          <div className="builder-query-info-row">
            <span>SQL</span>
            <span>{generatedSql ? `${generatedSql.split("\n").length} lines` : "Waiting"}</span>
          </div>
          <pre className="builder-query-generated-preview"><code>{generatedSql || "Map fields."}</code></pre>
        </div>
      ) : (
        <div className="builder-sql-editor-stack" style={{ gap: 6 }}>
          <textarea
            className="builder-sql-editor"
            value={sqlValue}
            onChange={(event) => onSqlChange(event.target.value)}
            spellCheck={false}
            placeholder="SELECT category, SUM(sales) AS total_sales FROM sales GROUP BY category;"
          />

          <div className="builder-sql-toolbar" style={{ gap: 6, flexWrap: "wrap" }}>
            <button type="button" className="builder-sql-btn" onClick={onRunSql}>Run SQL</button>
            <button type="button" className="builder-sql-btn" onClick={onFormatSql}>Format</button>
            <button type="button" className="builder-sql-btn" onClick={onResetSql}>Reset</button>
            <button type="button" className="builder-sql-btn" onClick={onUseResult} disabled={!queryResult?.rows?.length}>
              Use Result
            </button>
          </div>

          <div className="builder-sql-run-meta">
            <span>Status: {queryStatus}</span>
            <span>Rows: {queryResult?.rowCount ?? 0}</span>
            <span>Cols: {queryResult?.columnCount ?? 0}</span>
            <span>Run: {lastRunAt ? new Date(lastRunAt).toLocaleTimeString() : "-"}</span>
          </div>

          {queryError ? <div className="builder-sql-error-panel">{queryError}</div> : null}
          {!queryError && queryStatus === "success" && queryResult?.rows?.length ? (
            <div className="builder-sql-success-note">Ready.</div>
          ) : null}
        </div>
      )}
    </div>
  );
}
