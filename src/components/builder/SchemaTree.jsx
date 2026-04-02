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
    <div className="schema-explorer">
      <label className="builder-schema-search">
        <span className="builder-query-label">Find fields</span>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search field name or type"
          className="builder-schema-search-input"
        />
      </label>
      {Object.entries(schema).map(([db, tables]) => (
        <div key={db} className="schema-group">
          <div className="schema-db-title" onClick={() => toggle(openDbs, setOpenDbs, db)}>
            {openDbs.has(db) ? "v" : ">"} {db}
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
                >
                  {isOpen ? "v" : ">"} {tbl}
                </div>
                {isOpen && info.fields
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
                      >
                        <span className="field-dot" style={{ background: TYPE_COLOR[field.type] }} />
                        <span className="schema-item-copy">
                          <span className="schema-item-name">{field.name}</span>
                          <span className="schema-item-meta">{field.type}</span>
                        </span>
                        <span className="schema-type-badge">{TYPE_BADGE[field.type] ?? field.type}</span>
                        {roleHints.length ? (
                          <div className="builder-schema-role-actions">
                            {roleHints.slice(0, 3).map((role) => (
                              <button
                                key={`${field.name}-${role.key}`}
                                type="button"
                                className={`builder-schema-role-btn${role.required ? " is-required" : ""}`}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onFieldAssign(db, tbl, field, role.key);
                                }}
                              >
                                Add to {role.label}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
});

export default SchemaTree;
