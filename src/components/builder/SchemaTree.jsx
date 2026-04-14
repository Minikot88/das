/**
 * components/builder/SchemaTree.jsx
 * Unified schema explorer with drag-and-drop and touch support.
 */
import React, { useState, memo } from "react";
import { schema, TYPE_BADGE, TYPE_COLOR } from "../../data/mockData";

const DRAG_KEY = "bi-field";

const SchemaTree = memo(function SchemaTree({
  onFieldAssign,
  selectedDb,
  selectedTable,
  getFieldRoleHints,
}) {
  const [openDbs, setOpenDbs] = useState(() => new Set(Object.keys(schema)));
  const [openTables, setOpenTables] = useState(() => new Set());
  const [draggingFieldKey, setDraggingFieldKey] = useState(null);
  const [search, setSearch] = useState("");

  const toggle = (set, setFn, key) =>
    setFn((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  function handleDragStart(e, db, tbl, field) {
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData(DRAG_KEY, JSON.stringify({ db, tbl, field }));
    setDraggingFieldKey(`${db}.${tbl}.${field.name}`);
    window.dispatchEvent(
      new CustomEvent("builder-field-drag", {
        detail: { db, tbl, field },
      })
    );
  }

  function handleDragEnd() {
    setDraggingFieldKey(null);
    window.dispatchEvent(new CustomEvent("builder-field-drag-end"));
  }

  const query = search.trim().toLowerCase();

  return (
    <div
      className="schema-explorer"
      style={{
        display: "flex",
        flexDirection: "column",
        flex: "1 1 auto",
        gap: 6,
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      <label className="builder-schema-search" style={{ gap: 4, marginBottom: 0 }}>
        <span className="builder-query-label">Explorer</span>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search fields"
          className="builder-schema-search-input"
        />
      </label>
      <div
        className="schema-explorer-list"
        style={{
          display: "grid",
          flex: "1 1 auto",
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          overscrollBehavior: "auto",
          scrollbarGutter: "stable",
          paddingRight: 2,
          gap: 6,
          alignContent: "start",
        }}
      >
        {Object.entries(schema).map(([db, tables]) => (
          <div key={db} className="schema-group" style={{ borderRadius: 5, background: "var(--surface)" }}>
            <div className="schema-db-title" onClick={() => toggle(openDbs, setOpenDbs, db)} style={{ padding: "6px 8px", background: "var(--surface-secondary)" }}>
              <span className="schema-expander">{openDbs.has(db) ? "v" : ">"}</span>
              <span className="schema-db-icon" aria-hidden="true" style={{ fontSize: 9, color: "var(--text-secondary)" }}>DB</span>
              <span className="schema-db-label" style={{ fontWeight: 600 }}>{db}</span>
            </div>
            {openDbs.has(db) && Object.entries(tables).map(([tbl, info]) => {
              const tableKey = `${db}.${tbl}`;
              const isOpen = openTables.has(tableKey);
              const isActive = selectedDb === db && selectedTable === tbl;
              return (
                <div key={tbl}>
                  <div
                    className={`schema-table-title${isActive ? " active" : ""}`}
                    onClick={() => toggle(openTables, setOpenTables, tableKey)}
                    style={{ padding: "6px 8px" }}
                  >
                    <span className="schema-expander">{isOpen ? "v" : ">"}</span>
                    <span className="schema-table-icon" aria-hidden="true" style={{ fontSize: 9, color: "var(--text-secondary)" }}>TB</span>
                    <span className="schema-table-label">{tbl}</span>
                    <span className="schema-table-count">{info.fields?.length ?? 0} fields</span>
                  </div>
                  {isOpen ? (
                    <div className="schema-table-fields">
                      {info.fields
                        .filter((field) => {
                          if (!query) return true;
                          return `${field.name} ${field.type}`.toLowerCase().includes(query);
                        })
                        .map((field) => {
                          const roleHints = getFieldRoleHints?.({
                            id: `${db}.${tbl}.${field.name}`,
                            name: field.name,
                            type: field.type,
                            db,
                            tbl,
                          }) ?? [];

                          return (
                            <div
                              key={field.name}
                              className={`schema-item${
                                draggingFieldKey === `${db}.${tbl}.${field.name}` ? " dragging" : ""
                              }`}
                              draggable="true"
                              onDragStart={(e) => handleDragStart(e, db, tbl, field)}
                              onDragEnd={handleDragEnd}
                              onClick={() => onFieldAssign(db, tbl, field)}
                              style={{ padding: "6px 8px", gap: 6 }}
                            >
                              <span className="field-dot" style={{ background: TYPE_COLOR[field.type] }} />
                              <span className="schema-item-copy">
                                <span className="schema-item-name">{field.name}</span>
                                <span className="schema-item-meta">{field.type}</span>
                              </span>
                              <span className="schema-type-badge" style={{ minWidth: 32, minHeight: 18, borderRadius: 5, fontSize: 9 }}>
                                {TYPE_BADGE[field.type] ?? field.type}
                              </span>
                              {roleHints.length ? (
                                <div className="builder-schema-role-actions" style={{ gap: 4 }}>
                                  {roleHints.slice(0, 3).map((role) => (
                                    <button
                                      key={`${field.name}-${role.key}`}
                                      type="button"
                                      className={`builder-schema-role-btn${role.required ? " is-required" : ""}`}
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        onFieldAssign(db, tbl, field, role.key);
                                      }}
                                      style={{ minHeight: 22, padding: "0 7px", borderRadius: 5, fontSize: 9 }}
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
                  ) : null}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
});

export default SchemaTree;
