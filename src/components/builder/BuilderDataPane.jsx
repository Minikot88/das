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
    <div className="builder-sql-field-list">
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

  return (
    <aside className="builder-pane-shell builder-pane-shell-left">
      <div className="builder-pane-frame builder-pane-frame-left">
        <div className="builder-pane-header">
          <div className="builder-pane-header-copy">
            <h2 className="builder-pane-title">Data</h2>
          </div>
          <span className="builder-pane-status">{selectedTable ? "Connected" : "Pending"}</span>
        </div>

        <BuilderSourceSummary
          selectedDb={selectedDb}
          selectedTable={selectedTable}
          tableData={tableData}
          tableFields={tableFields}
        />

        <div className="builder-data-pane-chart-brief">
          <div>
            <span className="builder-query-label">Current chart</span>
            <strong>{chartDefinition?.title ?? "Chart"}</strong>
          </div>
          <span className={`builder-status-badge${completedRoles === requiredRoles.length && requiredRoles.length ? " ready" : ""}`}>
            {completedRoles}/{requiredRoles.length}
          </span>
        </div>

        {lastMappingNotice ? <div className="builder-data-pane-note">{lastMappingNotice}</div> : null}

        <div className="builder-left-section-label">{queryMode === "sql" ? "Result Fields" : "Schema"}</div>
        {queryMode === "sql" && queryResult?.fieldMeta?.length ? (
          <SqlResultFieldList
            selectedDb={selectedDb}
            selectedTable={selectedTable}
            fields={queryResult.fieldMeta}
            onFieldAssign={onFieldAssign}
            getFieldRoleHints={getFieldRoleHints}
          />
        ) : null}
        <div className="builder-pane-body builder-pane-body-scroll">
          <SchemaTree
            onFieldAssign={onFieldAssign}
            selectedDb={selectedDb}
            selectedTable={selectedTable}
            getFieldRoleHints={getFieldRoleHints}
          />
        </div>
      </div>
    </aside>
  );
}

