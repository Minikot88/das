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
  const [copyState, setCopyState] = React.useState("");

  React.useEffect(() => {
    if (!copyState) return undefined;
    const timer = window.setTimeout(() => setCopyState(""), 2400);
    return () => window.clearTimeout(timer);
  }, [copyState]);

  async function handleCopySql() {
    const sql = displayedSql || generatedSql || "";
    if (!sql) {
      setCopyState("ยังไม่มี SQL ให้คัดลอก");
      return;
    }
    let copied = false;
    try {
      await navigator.clipboard?.writeText(sql);
      copied = true;
    } catch {
      // Clipboard availability depends on the browser context.
    }
    if (!copied) {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = sql;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        copied = document.execCommand("copy");
        textarea.remove();
      } catch {
        copied = false;
      }
    }
    setCopyState(copied ? "คัดลอก SQL แล้ว" : "ไม่สามารถคัดลอกอัตโนมัติได้ กรุณาเลือกข้อความในช่อง SQL");
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

        {copyState ? (
          <div className="builder-v3-inline-notice" role="status">
            {copyState}
          </div>
        ) : null}

        {queryError ? (
          <div id="builder-sql-error" className="builder-v3-validation-card is-error" role="alert">
            <p>{queryError}</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
