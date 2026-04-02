import React from "react";

export default function BuilderSourceSummary({
  selectedDb,
  selectedTable,
  tableData,
  tableFields,
}) {
  return (
    <div className="builder-source-summary">
      <div className="builder-mini-stat">
        <span className="builder-mini-label">Database</span>
        <strong>{selectedDb ?? "Pending"}</strong>
      </div>
      <div className="builder-mini-stat">
        <span className="builder-mini-label">Table</span>
        <strong>{selectedTable ?? "Pending"}</strong>
      </div>
      <div className="builder-mini-stat">
        <span className="builder-mini-label">Rows</span>
        <strong>{tableData.length.toLocaleString()}</strong>
      </div>
      <div className="builder-mini-stat">
        <span className="builder-mini-label">Fields</span>
        <strong>{tableFields.length}</strong>
      </div>
    </div>
  );
}
