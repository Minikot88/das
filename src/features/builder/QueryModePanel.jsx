import React, { useState } from "react";

const SQL_EXPANDED_STORAGE_KEY = "dashboard-mini-bi.builder.sqlExpanded";

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
  const [isExpanded, setIsExpanded] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(SQL_EXPANDED_STORAGE_KEY) === "true";
  });

  function handleToggle(event) {
    const nextExpanded = event.currentTarget.open;
    setIsExpanded(nextExpanded);
    try {
      window.localStorage.setItem(SQL_EXPANDED_STORAGE_KEY, String(nextExpanded));
    } catch {
      // Local storage can be unavailable in restricted browsing contexts.
    }
  }

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
    <section className="builder-v3-panel builder-v3-query-panel">
      <details className="builder-v3-sql-advanced" open={isExpanded} onToggle={handleToggle}>
        <summary className="builder-v3-sql-summary">
          <span>SQL ขั้นสูง</span>
        </summary>

        <div className="builder-v3-sql-editor-stack is-full-width">
          <div className="builder-v3-inline-meta">
            <strong>{queryMode === "sql" ? "SQL แบบกำหนดเอง" : "SQL ที่สร้างอัตโนมัติ"}</strong>
            <span>แก้ไขได้เมื่อสลับเป็น SQL แบบกำหนดเอง และใช้ปุ่มรีเซ็ตเพื่อกลับสู่คำสั่งที่ระบบสร้าง</span>
          </div>
          <textarea
            className="builder-v3-sql-editor"
            rows={1}
            value={displayedSql || ""}
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
            <div className="builder-v3-validation-card is-error">
              <p>{queryError}</p>
            </div>
          ) : null}
        </div>
      </details>
    </section>
  );
}
