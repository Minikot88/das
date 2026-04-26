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
  search: controlledSearch,
  showSearch = true,
  scrollable = true,
}) {
  const [openDbs, setOpenDbs] = useState(() => new Set(Object.keys(schema)));
  const [openTables, setOpenTables] = useState(() => new Set());
  const [draggingFieldKey, setDraggingFieldKey] = useState(null);
  const [internalSearch, setInternalSearch] = useState("");

  const search = controlledSearch ?? internalSearch;

  const toggle = (set, setFn, key) =>
    setFn((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  function handleSearchChange(event) {
    const nextValue = event.target.value;
    if (controlledSearch !== undefined) return;
    setInternalSearch(nextValue);
  }

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
      className={`schema-explorer${scrollable ? "" : " is-scroll-managed"}`}
      style={{
        display: "flex",
        flexDirection: "column",
        flex: scrollable ? "1 1 auto" : "0 0 auto",
        gap: 6,
        minHeight: 0,
        overflow: scrollable ? "hidden" : "visible",
      }}
    >
      {showSearch ? (
        <label className="builder-schema-search" style={{ gap: 4, marginBottom: 0 }}>
          <span className="builder-query-label">Explorer</span>
          <input
            value={search}
            onChange={handleSearchChange}
            placeholder="Search fields"
            className="builder-schema-search-input"
          />
        </label>
      ) : null}

      <div
        className="schema-explorer-list"
        style={{
          display: "grid",
          flex: scrollable ? "1 1 auto" : "0 0 auto",
          minHeight: 0,
          overflowY: scrollable ? "auto" : "visible",
          overflowX: "hidden",
          overscrollBehavior: scrollable ? "auto" : "contain",
          scrollbarGutter: scrollable ? "stable" : "auto",
          paddingRight: 2,
          paddingBottom: 2,
          gap: 8,
          alignContent: "start",
        }}
      >
        {Object.entries(schema).map(([db, tables]) => {
          const tableEntries = Object.entries(tables);
          const totalFieldCount = tableEntries.reduce((sum, [, info]) => sum + (info.fields?.length ?? 0), 0);
          return (
          <div
            key={db}
            className={`schema-group${openDbs.has(db) ? " is-open" : ""}`}
            style={{
              borderRadius: 8,
              background: "var(--surface)",
              border: "1px solid var(--divider)",
              overflow: "hidden",
            }}
          >
            <div
              className={`schema-db-title${openDbs.has(db) ? " is-open" : ""}`}
              onClick={() => toggle(openDbs, setOpenDbs, db)}
              style={{
                minHeight: 36,
                padding: "0 10px",
                background: "var(--surface-secondary)",
                borderBottom: openDbs.has(db) ? "1px solid var(--divider)" : "none",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span className="schema-expander" style={{ width: 12, textAlign: "center", color: "var(--text-secondary)" }}>
                {openDbs.has(db) ? "v" : ">"}
              </span>
              <span
                className="schema-db-icon"
                aria-hidden="true"
                style={{
                  minWidth: 24,
                  height: 18,
                  borderRadius: 999,
                  border: "1px solid color-mix(in srgb, var(--border) 82%, transparent)",
                  color: "var(--text-secondary)",
                  fontSize: 9,
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  letterSpacing: "0.06em",
                }}
              >
                DB
              </span>
              <span className="schema-db-label" style={{ fontWeight: 600, minWidth: 0, flex: 1 }}>{db}</span>
              <span className="schema-table-count" style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                {totalFieldCount} fields
              </span>
            </div>
            {openDbs.has(db) && tableEntries.map(([tbl, info]) => {
              const tableKey = `${db}.${tbl}`;
              const isOpen = openTables.has(tableKey);
              const isActive = selectedDb === db && selectedTable === tbl;
              return (
                <div key={tbl}>
                    <div
                      className={`schema-table-title${isActive ? " active" : ""}${isOpen ? " is-open" : ""}`}
                      onClick={() => toggle(openTables, setOpenTables, tableKey)}
                      style={{
                        minHeight: 36,
                        padding: "0 10px",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        borderBottom: "1px solid var(--divider)",
                        background: isActive || isOpen
                          ? "color-mix(in srgb, var(--primary-soft) 40%, var(--surface) 60%)"
                          : "transparent",
                      }}
                    >
                    <span className="schema-expander" style={{ width: 12, textAlign: "center", color: "var(--text-secondary)" }}>
                      {isOpen ? "v" : ">"}
                    </span>
                    <span
                      className="schema-table-icon"
                      aria-hidden="true"
                      style={{
                        minWidth: 24,
                        height: 18,
                        borderRadius: 999,
                        border: "1px solid color-mix(in srgb, var(--border) 82%, transparent)",
                        color: "var(--text-secondary)",
                        fontSize: 9,
                        fontWeight: 700,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        letterSpacing: "0.06em",
                      }}
                    >
                      TB
                    </span>
                    <span className="schema-table-label" style={{ minWidth: 0, flex: 1, fontWeight: 600 }}>{tbl}</span>
                    <span className="schema-table-count" style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                      {info.fields?.length ?? 0} fields
                    </span>
                  </div>
                    {isOpen ? (
                      <div
                        className="schema-table-fields is-open"
                        style={{
                          minHeight: 0,
                          maxHeight: scrollable ? "min(44vh, 420px)" : "none",
                          overflowY: scrollable ? "auto" : "visible",
                          overflowX: "hidden",
                          padding: "4px 0 6px",
                          background: "color-mix(in srgb, var(--surface-secondary) 58%, var(--surface) 42%)",
                        }}
                    >
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
                              style={{
                                minHeight: 34,
                                padding: "7px 10px 7px 30px",
                                gap: 8,
                                borderBottom: "1px solid color-mix(in srgb, var(--divider) 78%, transparent)",
                                display: "flex",
                                alignItems: "center",
                              }}
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
                                      style={{ minHeight: 22, padding: "0 7px", borderRadius: 999, fontSize: 9 }}
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
        )})}
      </div>
    </div>
  );
});

export default SchemaTree;
