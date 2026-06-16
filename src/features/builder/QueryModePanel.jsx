import React from "react";

export default function QueryModePanel({
  queryMode,
  generatedSql,
  customSql,
  queryError,
  onChangeMode,
  onChangeSql,
  onResetSql,
}) {
  const displayedSql = queryMode === "sql" ? customSql : generatedSql;

  async function handleCopySql() {
    const sql = displayedSql || generatedSql || "";
    if (!sql) return;
    try {
      await navigator.clipboard?.writeText(sql);
    } catch {
      // Clipboard availability depends on the browser context.
    }
  }

  return (
    <section className="builder-v3-query-panel" aria-labelledby="builder-sql-editor-title">
      <div className="builder-v3-sql-editor-stack is-full-width">
        <div className="builder-v3-inline-meta">
          <strong id="builder-sql-editor-title">{queryMode === "sql" ? "SQL แบบกำหนดเอง" : "SQL ที่สร้างอัตโนมัติ"}</strong>
          <span id="builder-sql-editor-help">ตรวจสอบ แก้ไข หรือคัดลอก SQL ที่ใช้สร้างตัวอย่างกราฟนี้</span>
        </div>

        <textarea
          className="builder-v3-sql-editor"
          rows={3}
          value={displayedSql || ""}
          aria-labelledby="builder-sql-editor-title"
          aria-describedby={queryError ? "builder-sql-editor-help builder-sql-error" : "builder-sql-editor-help"}
          aria-invalid={Boolean(queryError)}
          onChange={(event) => {
            if (queryMode !== "sql") {
              onChangeMode("sql");
            }
            onChangeSql(event.target.value);
          }}
          spellCheck={false}
          placeholder="SELECT month, SUM(sales) AS sales FROM sales_performance GROUP BY month ORDER BY month"
        />

        <div className="builder-v3-sql-actions">
          <button type="button" className="builder-v3-button" onClick={handleCopySql}>
            คัดลอก SQL
          </button>
          <button type="button" className="builder-v3-button" onClick={onResetSql}>
            รีเซ็ต SQL
          </button>
        </div>

        {queryError ? (
          <div id="builder-sql-error" className="builder-v3-validation-card is-error" role="alert">
            <p>{queryError}</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
