import React from "react";
import SchemaTree from "./SchemaTree";
import BuilderSourceSummary from "./BuilderSourceSummary";

const DRAG_KEY = "bi-field";

function SqlResultFieldList({ selectedDb, selectedTable, fields = [], onFieldAssign, getFieldRoleHints }) {
  function handleDragStart(event, field) {
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData(DRAG_KEY, JSON.stringify({ db: selectedDb, tbl: selectedTable, field }));
    window.dispatchEvent(new CustomEvent("builder-field-drag", { detail: { db: selectedDb, tbl: selectedTable, field } }));
  }

  function handleDragEnd() {
    window.dispatchEvent(new CustomEvent("builder-field-drag-end"));
  }

  return (
    <div className="builder-sql-field-list" style={{ gap: 5 }}>
      {fields.map((field) => {
        const roleHints = getFieldRoleHints?.({
          id: `${selectedDb}.${selectedTable}.${field.name}`,
          name: field.name,
          type: field.type,
          db: selectedDb,
          tbl: selectedTable,
        }) ?? [];

        return (
          <div
            key={field.name}
            className="builder-sql-field-item"
            draggable="true"
            onDragStart={(event) => handleDragStart(event, field)}
            onDragEnd={handleDragEnd}
            onClick={() => onFieldAssign(selectedDb, selectedTable, field)}
            style={{ padding: "6px 8px" }}
          >
            <div className="builder-sql-field-copy">
              <strong>{field.name}</strong>
              <span>{field.type}</span>
            </div>
            {roleHints.length ? (
              <div className="builder-sql-field-hints">
                {roleHints.slice(0, 2).map((role) => (
                  <button
                    key={`${field.name}-${role.key}`}
                    type="button"
                    className="builder-sql-field-hint-btn"
                    onClick={(event) => {
                      event.stopPropagation();
                      onFieldAssign(selectedDb, selectedTable, field, role.key);
                    }}
                    style={{ minHeight: 22, padding: "0 7px", fontSize: 10 }}
                  >
                    {role.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export default function BuilderDataPane({
  selectedDb,
  selectedTable,
  tableData,
  tableFields,
  queryMode,
  queryResult,
  onFieldAssign,
  chartDefinition,
  roleAssignments,
  lastMappingNotice,
  getFieldRoleHints,
}) {
  const requiredRoles = (roleAssignments ?? []).filter((role) => role.required);
  const completedRoles = requiredRoles.filter((role) => role.state.status === "valid").length;
  const explorerLabel = queryMode === "sql" ? "Query Result" : "Explorer";
  const explorerCount = queryMode === "sql" ? `${queryResult?.fieldMeta?.length ?? 0} fields` : `${tableFields?.length ?? 0} fields`;

  return (
    <aside className="builder-pane-shell builder-pane-shell-left">
      <div
        className="builder-pane-frame builder-pane-frame-left"
        style={{ minHeight: 0, height: "100%", overflow: "hidden", gap: 6 }}
      >
        <div className="builder-data-pane">
          <div className="builder-data-pane__header">
            <div className="builder-pane-header" style={{ paddingBottom: 6 }}>
              <div className="builder-pane-header-copy" style={{ gap: 8, flexWrap: "wrap" }}>
                <h2 className="builder-pane-title">Data Source</h2>
                <span className="builder-preview-chip is-soft" style={{ minHeight: 20 }}>{explorerLabel}</span>
              </div>
              <span className="builder-pane-status">{selectedTable ? "Ready" : "Select"}</span>
            </div>

            <BuilderSourceSummary
              selectedDb={selectedDb}
              selectedTable={selectedTable}
              tableData={tableData}
              tableFields={tableFields}
            />

            <div
              className="builder-data-pane-chart-brief"
              style={{
                padding: "7px 8px",
                borderRadius: 5,
                background: "var(--surface)",
                borderStyle: "dashed",
              }}
            >
              <div>
                <span className="builder-query-label">Selection</span>
                <strong>{chartDefinition?.title ?? "Chart"}</strong>
              </div>
              <span className={`builder-status-badge${completedRoles === requiredRoles.length && requiredRoles.length ? " ready" : ""}`}>
                {completedRoles}/{requiredRoles.length} ready
              </span>
            </div>

            <div
              className="builder-left-section-label"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingInline: 2,
                marginTop: 2,
              }}
            >
              <span>{explorerLabel}</span>
              <span>{explorerCount}</span>
            </div>
          </div>

          <div
            className="builder-data-pane__body builder-pane-body builder-pane-body-scroll"
            style={{
              paddingRight: 2,
              borderTop: "1px solid var(--divider)",
              paddingTop: 6,
              display: "grid",
              gap: 8,
              alignContent: "start",
            }}
          >
            {queryMode === "sql" && queryResult?.fieldMeta?.length ? (
              <SqlResultFieldList
                selectedDb={selectedDb}
                selectedTable={selectedTable}
                fields={queryResult.fieldMeta}
                onFieldAssign={onFieldAssign}
                getFieldRoleHints={getFieldRoleHints}
              />
            ) : null}
            <SchemaTree
              onFieldAssign={onFieldAssign}
              selectedDb={selectedDb}
              selectedTable={selectedTable}
              getFieldRoleHints={getFieldRoleHints}
            />
          </div>
        </div>
      </div>
    </aside>
  );
}
