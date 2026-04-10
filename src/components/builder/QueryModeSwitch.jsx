import React from "react";

export default function QueryModeSwitch({ queryMode, onChange }) {
  return (
    <div className="builder-query-mode-switch" role="tablist" aria-label="Query mode">
      <button
        type="button"
        role="tab"
        aria-selected={queryMode === "visual"}
        className={`builder-query-mode-btn${queryMode === "visual" ? " is-active" : ""}`}
        onClick={() => onChange("visual")}
      >
        <span>Visual</span>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={queryMode === "sql"}
        className={`builder-query-mode-btn${queryMode === "sql" ? " is-active" : ""}`}
        onClick={() => onChange("sql")}
      >
        <span>SQL</span>
      </button>
    </div>
  );
}
