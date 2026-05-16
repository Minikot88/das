import React, { useEffect, useMemo, useRef, useState } from "react";

const EXPANDED_NODES_STORAGE_KEY = "mini-bi.datasource.expandedNodes";

function normalizeType(type = "") {
  return String(type || "string").trim().toLowerCase();
}

function getTypeBadge(field = {}) {
  const type = normalizeType(field.type || field.semanticType || field.sourceType);
  if (["number", "integer", "float", "double", "decimal", "numeric"].includes(type)) return "123";
  if (["date", "datetime", "timestamp", "time"].includes(type)) return "DATE";
  if (["boolean", "bool"].includes(type)) return "BOOL";
  if (/(^id$|_id$|key|uuid|code)/.test(String(field.name ?? "").toLowerCase())) return "ID";
  return "TXT";
}

function normalizeStructure(dataset, schema) {
  const baseFields = Array.isArray(schema?.fields)
    ? schema.fields
    : Array.isArray(dataset?.fields)
      ? dataset.fields.map((field) => ({
          name: field.name,
          label: field.label,
          type: field.semanticType ?? field.type,
          sourceType: field.type,
        }))
      : [];

  const tables = Array.isArray(schema?.tables)
    ? schema.tables
        .filter((table) => table?.name)
        .map((table) => ({
          id: table.id || `${table.schemaName || "analytics"}.${table.name}`,
          name: table.name,
          schemaName: table.schemaName || "analytics",
          rowCount: Number.isFinite(table.rowCount) ? table.rowCount : null,
          fields: Array.isArray(table.fields) ? table.fields : baseFields,
        }))
    : dataset
      ? [
          {
            id: dataset.id || "sales_performance",
            name: dataset.tableName || dataset.id || "sales_performance",
            schemaName: dataset.namespace || "analytics",
            rowCount: Array.isArray(dataset.rows) ? dataset.rows.length : null,
            fields: baseFields,
          },
        ]
      : [];

  const schemaMap = new Map();
  tables.forEach((table) => {
    if (!schemaMap.has(table.schemaName)) schemaMap.set(table.schemaName, []);
    schemaMap.get(table.schemaName).push(table);
  });

  const schemas = Array.from(schemaMap.entries())
    .map(([name, schemaTables]) => ({ name, tables: schemaTables }))
    .filter((schemaItem) => schemaItem.tables.length > 0);

  const tableCount = schemas.reduce((sum, schemaItem) => sum + schemaItem.tables.length, 0);
  const fieldCount = schemas.reduce(
    (sum, schemaItem) => sum + schemaItem.tables.reduce((tableSum, table) => tableSum + (table.fields?.length ?? 0), 0),
    0
  );

  return {
    database: dataset?.databaseName || "researchdb",
    readOnly: dataset?.readOnly ?? true,
    schemas,
    stats: {
      schemaCount: schemas.length,
      tableCount,
      fieldCount,
    },
  };
}

function filterStructure(structure, query = "") {
  const term = String(query || "").trim().toLowerCase();
  if (!term) return structure;

  const schemas = structure.schemas
    .map((schemaItem) => {
      const schemaMatch = schemaItem.name.toLowerCase().includes(term);
      const tables = schemaItem.tables
        .map((table) => {
          const tableMatch = table.name.toLowerCase().includes(term);
          const matchedFields = (table.fields || []).filter((field) => {
            const tokens = [field.name, field.label, field.type, field.sourceType]
              .filter(Boolean)
              .map((token) => String(token).toLowerCase());
            return tokens.some((token) => token.includes(term));
          });

          if (schemaMatch || tableMatch || matchedFields.length) {
            return {
              ...table,
              fields: schemaMatch || tableMatch ? table.fields : matchedFields,
            };
          }
          return null;
        })
        .filter(Boolean);

      if (schemaMatch || tables.length) return { ...schemaItem, tables };
      return null;
    })
    .filter(Boolean);

  return { ...structure, schemas };
}

function getNodeId(kind, value = "") {
  return `${kind}:${value}`;
}

function getTableNodeKey(table) {
  return `${table.schemaName || "analytics"}.${table.name}`;
}

function getDefaultExpandedNodes(structure, selectedTableId = "") {
  const expanded = new Set([getNodeId("db", structure.database), getNodeId("folder", "schemas")]);

  structure.schemas.forEach((schemaItem) => {
    expanded.add(getNodeId("schema", schemaItem.name));
    expanded.add(getNodeId("folder", `${schemaItem.name}:tables`));

    schemaItem.tables.forEach((table) => {
      if (!selectedTableId || selectedTableId === table.id) {
        expanded.add(getNodeId("table", getTableNodeKey(table)));
      }
    });
  });

  return expanded;
}

function readExpandedNodes() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(EXPANDED_NODES_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed) : null;
  } catch {
    return null;
  }
}

function writeExpandedNodes(expandedNodes) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(EXPANDED_NODES_STORAGE_KEY, JSON.stringify(Array.from(expandedNodes)));
  } catch {
    // ignore storage errors
  }
}

function TreeChevron({ expanded = false, hidden = false }) {
  if (hidden) return <span className="builder-tree-chevron is-empty" aria-hidden="true" />;

  return (
    <span className="builder-tree-chevron" aria-hidden="true">
      <svg viewBox="0 0 10 10" focusable="false" aria-hidden="true">
        <path d={expanded ? "M2 3.5L5 6.5L8 3.5" : "M3.5 2L6.5 5L3.5 8"} />
      </svg>
    </span>
  );
}

function TreeRow({
  depth = 0,
  icon,
  label,
  meta = "",
  collapsible = false,
  expanded = false,
  active = false,
  onClick,
  ariaLabel,
  draggable = false,
  onDragStart,
}) {
  return (
    <div
      className={`builder-tree-row${active ? " is-active" : ""}${draggable ? " is-field" : ""}`}
      style={{ "--depth": depth }}
      title={meta ? `${label} - ${meta}` : label}
    >
      <span className="builder-tree-indent" aria-hidden="true" />
      {collapsible ? (
        <button
          type="button"
          className="datasource-tree-toggle"
          onClick={onClick}
          aria-label={ariaLabel || label}
          aria-expanded={expanded}
        >
          <TreeChevron expanded={expanded} />
        </button>
      ) : (
        <span className="datasource-tree-toggle-spacer" aria-hidden="true">
          <TreeChevron hidden />
        </span>
      )}
      <span className="builder-tree-icon" aria-hidden="true">{icon}</span>
      <button
        type="button"
        className="builder-tree-main"
        onClick={onClick}
        aria-label={ariaLabel || label}
        aria-expanded={collapsible ? expanded : undefined}
        draggable={draggable}
        onDragStart={onDragStart}
      >
        <strong>{label}</strong>
        {meta ? <small>{meta}</small> : null}
      </button>
    </div>
  );
}

export default function FieldList({ dataset, schema, onDragStart, mappedFieldNames = [] }) {
  const [search, setSearch] = useState("");
  const [selectedTableId, setSelectedTableId] = useState("");
  const searchExpandedSnapshotRef = useRef(null);

  const structure = useMemo(() => normalizeStructure(dataset, schema), [dataset, schema]);
  const filtered = useMemo(() => filterStructure(structure, search), [structure, search]);
  const mappedSet = useMemo(() => new Set(mappedFieldNames || []), [mappedFieldNames]);

  const allTables = useMemo(() => structure.schemas.flatMap((schemaItem) => schemaItem.tables || []), [structure.schemas]);

  const selectedTable = useMemo(() => {
    if (!allTables.length) return null;
    return allTables.find((table) => table.id === selectedTableId) || allTables[0];
  }, [allTables, selectedTableId]);
  const selectedTableNodeId = useMemo(
    () => (selectedTable ? getNodeId("table", getTableNodeKey(selectedTable)) : null),
    [selectedTable]
  );

  const [expandedNodes, setExpandedNodes] = useState(() => {
    const saved = readExpandedNodes();
    return saved ?? getDefaultExpandedNodes(structure, selectedTableId);
  });

  useEffect(() => {
    if (!selectedTable?.id) return;
    setSelectedTableId((current) => current || selectedTable.id);
  }, [selectedTable?.id]);

  useEffect(() => {
    if (!selectedTable?.id || !selectedTableNodeId) return;
    setExpandedNodes((current) => {
      const next = new Set(current);
      const schemaName = selectedTable.schemaName || "analytics";
      let changed = false;
      const safeAdd = (id) => {
        if (!next.has(id)) {
          next.add(id);
          changed = true;
        }
      };
      safeAdd(getNodeId("db", structure.database));
      safeAdd(getNodeId("folder", "schemas"));
      safeAdd(getNodeId("schema", schemaName));
      safeAdd(getNodeId("folder", `${schemaName}:tables`));
      safeAdd(selectedTableNodeId);
      return changed ? next : current;
    });
  }, [selectedTable?.id, selectedTable?.schemaName, selectedTableNodeId, structure.database]);

  useEffect(() => {
    writeExpandedNodes(expandedNodes);
  }, [expandedNodes]);

  const searchActive = Boolean(search.trim());

  useEffect(() => {
    if (!searchActive) {
      if (searchExpandedSnapshotRef.current) {
        setExpandedNodes(searchExpandedSnapshotRef.current);
        searchExpandedSnapshotRef.current = null;
      }
      return;
    }

    if (!searchExpandedSnapshotRef.current) {
      searchExpandedSnapshotRef.current = new Set(expandedNodes);
    }

    setExpandedNodes((current) => {
      const next = new Set(current);
      let changed = false;
      const safeAdd = (id) => {
        if (!next.has(id)) {
          next.add(id);
          changed = true;
        }
      };
      safeAdd(getNodeId("db", structure.database));
      safeAdd(getNodeId("folder", "schemas"));

      filtered.schemas.forEach((schemaItem) => {
        safeAdd(getNodeId("schema", schemaItem.name));
        safeAdd(getNodeId("folder", `${schemaItem.name}:tables`));
        schemaItem.tables.forEach((table) => {
          safeAdd(getNodeId("table", getTableNodeKey(table)));
        });
      });

      return changed ? next : current;
    });
  }, [expandedNodes, filtered.schemas, searchActive, structure.database]);

  function toggle(nodeId) {
    setExpandedNodes((current) => {
      const next = new Set(current);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }

  function isExpanded(nodeId) {
    return expandedNodes.has(nodeId);
  }

  function onTableClick(table, isOpen) {
    const schemaName = table.schemaName || "analytics";
    const tableNodeId = getNodeId("table", getTableNodeKey(table));
    setSelectedTableId(table.id);

    setExpandedNodes((current) => {
      const next = new Set(current);
      next.add(getNodeId("db", structure.database));
      next.add(getNodeId("folder", "schemas"));
      next.add(getNodeId("schema", schemaName));
      next.add(getNodeId("folder", `${schemaName}:tables`));
      if (isOpen) {
        next.delete(tableNodeId);
      } else {
        next.add(tableNodeId);
      }
      return next;
    });
  }

  const visibleTables = filtered.schemas.flatMap((schemaItem) => schemaItem.tables || []);
  const hasResults = visibleTables.length > 0;

  const dbNodeId = getNodeId("db", structure.database);
  const schemasNodeId = getNodeId("folder", "schemas");
  const dbExpanded = isExpanded(dbNodeId);
  const schemasExpanded = dbExpanded && isExpanded(schemasNodeId);

  return (
    <section className="builder-v3-panel builder-v3-explorer-panel">
      <div className="builder-v3-section-head">
        <div>
          <span className="builder-v3-kicker">Data Source</span>
          <h2 className="builder-v3-title">Explorer</h2>
          <p className="builder-tree-meta-line">
            {structure.database} | {structure.readOnly ? "Read-only" : "Read/write"} | {structure.stats.schemaCount} schema{structure.stats.schemaCount === 1 ? "" : "s"} | {structure.stats.tableCount} table{structure.stats.tableCount === 1 ? "" : "s"} | {structure.stats.fieldCount} fields
          </p>
        </div>
      </div>

      <label className="builder-v3-field-search" htmlFor="datasource-search-input">
        <span className="sr-only">Search schemas, tables, fields</span>
        <input
          id="datasource-search-input"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search fields, tables..."
          aria-label="Search schemas, tables, fields"
        />
      </label>

      <div className="builder-tree-wrap" role="tree" aria-label="Database explorer tree">
        <TreeRow
          depth={0}
          icon="DB"
          label={structure.database}
          meta={structure.readOnly ? "Read-only" : "Read/write"}
          collapsible
          expanded={dbExpanded}
          onClick={() => toggle(dbNodeId)}
          ariaLabel={`Toggle database ${structure.database}`}
        />

        {dbExpanded ? (
          <>
            <TreeRow
              depth={1}
              icon="SC"
              label="Schemas"
              collapsible
              expanded={schemasExpanded}
              onClick={() => toggle(schemasNodeId)}
              ariaLabel="Toggle Schemas folder"
            />

            {schemasExpanded ? (
              hasResults ? (
                filtered.schemas.map((schemaItem) => {
                  const schemaNodeId = getNodeId("schema", schemaItem.name);
                  const tablesNodeId = getNodeId("folder", `${schemaItem.name}:tables`);
                  const schemaExpanded = isExpanded(schemaNodeId);
                  const tablesExpanded = schemaExpanded && isExpanded(tablesNodeId);

                  return (
                    <div key={schemaItem.name}>
                      <TreeRow
                        depth={2}
                        icon="SC"
                        label={schemaItem.name}
                        meta={`${schemaItem.tables.length} tables`}
                        collapsible
                        expanded={schemaExpanded}
                        onClick={() => toggle(schemaNodeId)}
                        ariaLabel={`Toggle schema ${schemaItem.name}`}
                      />

                      {schemaExpanded ? (
                        <>
                          <TreeRow
                            depth={3}
                            icon="TB"
                            label="Tables"
                            collapsible
                            expanded={tablesExpanded}
                            onClick={() => toggle(tablesNodeId)}
                            ariaLabel={`Toggle tables in schema ${schemaItem.name}`}
                          />

                          {tablesExpanded ? (
                            schemaItem.tables.length ? (
                              schemaItem.tables.map((table) => {
                                const tableNodeId = getNodeId("table", getTableNodeKey(table));
                                const tableExpanded = isExpanded(tableNodeId);
                                const isSelected = selectedTable?.id === table.id;
                                const tableMeta = `${table.fields?.length ?? 0} fields${Number.isFinite(table.rowCount) ? ` | ${table.rowCount} rows` : ""}`;

                                return (
                                  <div key={table.id}>
                                    <TreeRow
                                      depth={4}
                                      icon="TB"
                                      label={table.name}
                                      meta={tableMeta}
                                      active={isSelected}
                                      collapsible
                                      expanded={tableExpanded}
                                      onClick={() => onTableClick(table, tableExpanded)}
                                      ariaLabel={`Select and toggle table ${table.name}`}
                                    />

                                    {tableExpanded ? (
                                      table.fields?.length ? (
                                        table.fields.map((field) => {
                                          const typeBadge = getTypeBadge(field);
                                          const fieldMeta = `${field.type || field.semanticType || field.sourceType || "string"}`;
                                          return (
                                            <TreeRow
                                              key={`${table.id}:${field.name}`}
                                              depth={5}
                                              icon={typeBadge}
                                              label={field.label || field.name}
                                              meta={fieldMeta}
                                              active={mappedSet.has(field.name)}
                                              ariaLabel={`Field ${field.name}`}
                                              draggable
                                              onClick={() => setSelectedTableId(table.id)}
                                              onDragStart={(event) => {
                                                if (typeof onDragStart === "function") {
                                                  onDragStart(event, field);
                                                }
                                              }}
                                            />
                                          );
                                        })
                                      ) : (
                                        <div className="builder-tree-empty" style={{ "--depth": 5 }}>
                                          No fields
                                        </div>
                                      )
                                    ) : null}
                                  </div>
                                );
                              })
                            ) : (
                              <div className="builder-tree-empty" style={{ "--depth": 4 }}>
                                No tables
                              </div>
                            )
                          ) : null}
                        </>
                      ) : null}
                    </div>
                  );
                })
              ) : (
                <div className="builder-tree-empty" style={{ "--depth": 2 }}>
                  No matching schemas, tables, or fields
                </div>
              )
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  );
}
