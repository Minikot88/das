import React, { useState } from "react";
import SchemaTree from "./SchemaTree";
import BuilderSourceSummary from "./BuilderSourceSummary";

const DRAG_KEY = "bi-field";

function findScrollableElement(startNode, boundaryNode) {
  let node = startNode;
  while (node && node !== boundaryNode) {
    if (node instanceof HTMLElement) {
      const style = window.getComputedStyle(node);
      const overflowY = style.overflowY || style.overflow;
      const canScroll = (overflowY === "auto" || overflowY === "scroll") && node.scrollHeight > node.clientHeight + 1;
      if (canScroll) return node;
    }
    node = node.parentElement;
  }
  return null;
}

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
    <div
      className="builder-sql-field-list builder-sql-field-list-scroll"
      style={{
        gap: 5,
        alignContent: "start",
      }}
    >
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
  getFieldRoleHints,
}) {
  const [search, setSearch] = useState("");
  const requiredRoles = (roleAssignments ?? []).filter((role) => role.required);
  const completedRoles = requiredRoles.filter((role) => role.state.status === "valid").length;
  const explorerLabel = queryMode === "sql" ? "Query Result" : "Explorer";
  const explorerCount = queryMode === "sql" ? `${queryResult?.fieldMeta?.length ?? 0} fields` : `${tableFields?.length ?? 0} fields`;

  function handleBodyWheel(event) {
    const root = event.currentTarget;
    const start = event.target instanceof HTMLElement ? event.target : null;
    const directScrollable = start ? findScrollableElement(start, root) : null;
    const fallbackScrollable =
      root.querySelector(".builder-data-pane__list-scroll") ??
      root.querySelector(".schema-explorer-list") ??
      root.querySelector(".schema-table-fields") ??
      root.querySelector(".builder-sql-field-list");
    const scroller = directScrollable ?? fallbackScrollable;
    if (!(scroller instanceof HTMLElement)) return;

    const previousTop = scroller.scrollTop;
    scroller.scrollTop += event.deltaY;
    if (scroller.scrollTop !== previousTop) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  return (
    <aside
      className="builder-pane-shell builder-pane-shell-left"
      style={{
        display: "flex",
        flexDirection: "column",
        flex: "1 1 auto",
        minHeight: 0,
        height: "100%",
        overflow: "hidden",
      }}
    >
      <div
        className="builder-pane-frame builder-pane-frame-left"
        style={{
          display: "flex",
          flexDirection: "column",
          flex: "1 1 auto",
          minHeight: 0,
          height: "100%",
          overflow: "hidden",
          gap: 6,
        }}
      >
        <div
          className="builder-data-pane"
          style={{
            display: "flex",
            flexDirection: "column",
            flex: "1 1 auto",
            minHeight: 0,
            height: "100%",
            overflow: "hidden",
            gap: 6,
          }}
        >
          <div className="builder-data-pane__header builder-data-pane__header-shell">
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

            <div className="builder-data-pane__utility-row">
              <div
                className="builder-left-section-label builder-left-section-label-pill"
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

              <label className="builder-schema-search builder-data-pane__search" style={{ gap: 4, marginBottom: 0 }}>
                <span className="builder-query-label">Search</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search fields"
                  className="builder-schema-search-input"
                />
              </label>
            </div>
          </div>

          <div
            className="builder-data-pane__body builder-pane-body builder-pane-body-scroll"
            onWheelCapture={handleBodyWheel}
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              minHeight: 0,
              height: 0,
              overflow: "hidden",
              paddingRight: 2,
              borderTop: "1px solid var(--divider)",
              paddingTop: 6,
              gap: 8,
            }}
          >
            <div
              className="builder-data-pane__list-scroll"
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                overflowX: "hidden",
                scrollbarGutter: "stable",
                padding: "0 2px 2px",
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
                search={search}
                showSearch={false}
                scrollable={false}
              />
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
