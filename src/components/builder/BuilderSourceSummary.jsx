import React from "react";

export default function BuilderSourceSummary({
  selectedDb,
  selectedTable,
  tableData,
  tableFields,
}) {
  return (
    <div className="builder-source-summary" style={{ gridTemplateColumns: "1fr", gap: 5 }}>
      <div
        className="builder-mini-stat"
        style={{
          display: "grid",
          gridTemplateColumns: "24px minmax(0, 1fr) auto",
          gap: 6,
          alignItems: "center",
          padding: "7px 8px",
          background: "var(--surface)",
        }}
      >
        <div
          className="builder-mini-stat-icon"
          aria-hidden="true"
          style={{
            width: 20,
            height: 20,
            borderRadius: 4,
            display: "grid",
            placeItems: "center",
            fontSize: 9,
            fontWeight: 700,
            background: "var(--surface-soft)",
            color: "var(--primary)",
          }}
        >
          DB
        </div>
        <div style={{ minWidth: 0, display: "grid", gap: 2 }}>
          <span className="builder-mini-label">Source</span>
          <strong style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {selectedDb ?? "No database selected"}
          </strong>
          <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
            {selectedTable ?? "Choose a table to start mapping"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <span className="builder-preview-chip is-soft" style={{ minHeight: 20 }}>{tableData.length.toLocaleString()} rows</span>
          <span className="builder-preview-chip is-soft" style={{ minHeight: 20 }}>{tableFields.length} fields</span>
        </div>
      </div>
    </div>
  );
}
