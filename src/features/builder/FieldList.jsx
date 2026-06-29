import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

const EXPANDED_NODES_STORAGE_KEY = "mini-bi.datasource.expandedNodes";
const TREE_ROW_HEIGHT = 25;
const TREE_OVERSCAN = 8;
const TREE_VIRTUALIZATION_THRESHOLD = 180;

function getDomId(prefix, value = "") {
  return `${prefix}-${String(value).replace(/[^a-zA-Z0-9_-]+/g, "-")}`;
}

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

function formatFieldType(type) {
  const labels = {
    string: "ข้อความ",
    number: "ตัวเลข",
    date: "วันที่",
    boolean: "บูลีน",
    category: "หมวดหมู่",
  };
  return labels[type] ?? type;
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
  nodeId,
  controlsId,
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
  tabIndex = -1,
  onKeyDown,
  onFocus,
  rowRef,
  posInSet,
  setSize,
}) {
  const iconKey = String(icon || "node").toLowerCase();
  const rowClassName = [
    "builder-tree-row",
    `is-depth-${depth}`,
    `is-icon-${iconKey}`,
    active ? "is-active" : "",
    collapsible ? "is-collapsible" : "",
    collapsible && expanded ? "is-expanded" : "",
    draggable ? "is-field" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={rowClassName}
      role="none"
      style={{ "--depth": depth }}
      data-tree-depth={depth}
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
          aria-controls={controlsId}
          tabIndex={-1}
        >
          <TreeChevron expanded={expanded} />
        </button>
      ) : (
        <span className="datasource-tree-toggle-spacer" aria-hidden="true">
          <TreeChevron hidden />
        </span>
      )}
      <span className="builder-tree-icon" data-tree-icon={icon} aria-hidden="true">{icon}</span>
      <button
        id={nodeId}
        type="button"
        className="builder-tree-main"
        role="treeitem"
        onClick={onClick}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        ref={rowRef}
        tabIndex={tabIndex}
        aria-label={ariaLabel || label}
        aria-level={depth + 1}
        aria-selected={active || undefined}
        aria-expanded={collapsible ? expanded : undefined}
        aria-controls={collapsible ? controlsId : undefined}
        aria-posinset={posInSet}
        aria-setsize={setSize}
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
  const [showAllFields, setShowAllFields] = useState(false);
  const [treeScrollTop, setTreeScrollTop] = useState(0);
  const [activeTreeIndex, setActiveTreeIndex] = useState(0);
  const searchExpandedSnapshotRef = useRef(null);
  const treeWrapRef = useRef(null);
  const treeItemRefs = useRef(new Map());
  const [treeViewportHeight, setTreeViewportHeight] = useState(420);

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
  const recommendedFields = useMemo(() => (selectedTable?.fields || []).slice(0, 6), [selectedTable]);

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

  useEffect(() => {
    const node = treeWrapRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(([entry]) => {
      const nextHeight = entry?.contentRect?.height;
      if (Number.isFinite(nextHeight) && nextHeight > 0) {
        setTreeViewportHeight(nextHeight);
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

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

  const toggle = useCallback((nodeId) => {
    setExpandedNodes((current) => {
      const next = new Set(current);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  const isExpanded = useCallback((nodeId) => {
    return expandedNodes.has(nodeId);
  }, [expandedNodes]);

  const onTableClick = useCallback((table, isOpen) => {
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
  }, [structure.database]);

  const visibleTables = filtered.schemas.flatMap((schemaItem) => schemaItem.tables || []);
  const hasResults = visibleTables.length > 0;

  const dbNodeId = getNodeId("db", structure.database);
  const schemasNodeId = getNodeId("folder", "schemas");
  const dbExpanded = isExpanded(dbNodeId);
  const schemasExpanded = dbExpanded && isExpanded(schemasNodeId);

  useEffect(() => {
    setTreeScrollTop(0);
    if (treeWrapRef.current) treeWrapRef.current.scrollTop = 0;
  }, [search]);

  const treeRows = useMemo(() => {
    const rows = [
      {
        id: dbNodeId,
        kind: "node",
        depth: 0,
        icon: "DB",
        label: structure.database,
        meta: structure.readOnly ? "อ่านอย่างเดียว" : "อ่าน/เขียน",
        collapsible: true,
        expanded: dbExpanded,
        onClick: () => toggle(dbNodeId),
        ariaLabel: `เปิดหรือปิดฐานข้อมูล ${structure.database}`,
      },
    ];

    if (!dbExpanded) return rows;

    rows.push({
      id: schemasNodeId,
      kind: "node",
      depth: 1,
      icon: "SC",
      label: "สคีมา",
      collapsible: true,
      expanded: schemasExpanded,
      onClick: () => toggle(schemasNodeId),
      ariaLabel: "เปิดหรือปิดโฟลเดอร์สคีมา",
    });

    if (!schemasExpanded) return rows;

    if (!hasResults) {
      rows.push({
        id: "empty:search",
        kind: "empty",
        depth: 2,
        label: "ไม่พบสคีมา ตาราง หรือฟิลด์ที่ตรงกัน",
      });
      return rows;
    }

    filtered.schemas.forEach((schemaItem) => {
      const schemaNodeId = getNodeId("schema", schemaItem.name);
      const tablesNodeId = getNodeId("folder", `${schemaItem.name}:tables`);
      const schemaExpanded = isExpanded(schemaNodeId);
      const tablesExpanded = schemaExpanded && isExpanded(tablesNodeId);

      rows.push({
        id: schemaNodeId,
        kind: "node",
        depth: 2,
        icon: "SC",
        label: schemaItem.name,
        meta: `${schemaItem.tables.length} ตาราง`,
        collapsible: true,
        expanded: schemaExpanded,
        onClick: () => toggle(schemaNodeId),
        ariaLabel: `เปิดหรือปิดสคีมา ${schemaItem.name}`,
      });

      if (!schemaExpanded) return;

      rows.push({
        id: tablesNodeId,
        kind: "node",
        depth: 3,
        icon: "TB",
        label: "ตาราง",
        collapsible: true,
        expanded: tablesExpanded,
        onClick: () => toggle(tablesNodeId),
        ariaLabel: `เปิดหรือปิดตารางในสคีมา ${schemaItem.name}`,
      });

      if (!tablesExpanded) return;

      if (!schemaItem.tables.length) {
        rows.push({
          id: `empty:${schemaItem.name}:tables`,
          kind: "empty",
          depth: 4,
          label: "ไม่มีตาราง",
        });
        return;
      }

      schemaItem.tables.forEach((table) => {
        const tableNodeId = getNodeId("table", getTableNodeKey(table));
        const tableExpanded = isExpanded(tableNodeId);
        const isSelected = selectedTable?.id === table.id;
        const tableMeta = `${table.fields?.length ?? 0} ฟิลด์${Number.isFinite(table.rowCount) ? ` | ${table.rowCount} แถว` : ""}`;

        rows.push({
          id: tableNodeId,
          kind: "node",
          depth: 4,
          icon: "TB",
          label: table.name,
          meta: tableMeta,
          active: isSelected,
          collapsible: true,
          expanded: tableExpanded,
          onClick: () => onTableClick(table, tableExpanded),
          ariaLabel: `เลือกและเปิดหรือปิดตาราง ${table.name}`,
        });

        if (!tableExpanded) return;

        const fields = table.fields || [];
        if (!fields.length) {
          rows.push({
            id: `empty:${table.id}:fields`,
            kind: "empty",
            depth: 5,
            label: "ไม่มีฟิลด์",
          });
          return;
        }

        const visibleFields = showAllFields || searchActive ? fields : fields.slice(0, 8);
        visibleFields.forEach((field) => {
          const typeBadge = getTypeBadge(field);
          const fieldMeta = formatFieldType(field.type || field.semanticType || field.sourceType || "string");
          rows.push({
            id: `${table.id}:${field.name}`,
            kind: "node",
            depth: 5,
            icon: typeBadge,
            label: field.label || field.name,
            meta: fieldMeta,
            active: mappedSet.has(field.name),
            draggable: true,
            onClick: () => setSelectedTableId(table.id),
            onDragStart: (event) => {
              if (typeof onDragStart === "function") {
                onDragStart(event, field);
              }
            },
            ariaLabel: `ฟิลด์ ${field.name}`,
          });
        });

        if (!showAllFields && !searchActive && fields.length > 8) {
          rows.push({
            id: `show-more:${table.id}`,
            kind: "showMore",
            depth: 5,
            label: `แสดงฟิลด์ทั้งหมด (${fields.length})`,
            onClick: () => setShowAllFields(true),
          });
        }
      });
    });

    return rows;
  }, [
    dbExpanded,
    dbNodeId,
    filtered.schemas,
    hasResults,
    isExpanded,
    mappedSet,
    onDragStart,
    onTableClick,
    schemasExpanded,
    schemasNodeId,
    searchActive,
    selectedTable?.id,
    showAllFields,
    structure.database,
    structure.readOnly,
    toggle,
  ]);

  const shouldVirtualizeTree = treeRows.length > TREE_VIRTUALIZATION_THRESHOLD;
  const virtualStartIndex = shouldVirtualizeTree
    ? Math.max(0, Math.floor(treeScrollTop / TREE_ROW_HEIGHT) - TREE_OVERSCAN)
    : 0;
  const virtualVisibleCount = shouldVirtualizeTree
    ? Math.ceil(treeViewportHeight / TREE_ROW_HEIGHT) + TREE_OVERSCAN * 2
    : treeRows.length;
  const virtualRows = shouldVirtualizeTree
    ? treeRows.slice(virtualStartIndex, virtualStartIndex + virtualVisibleCount)
    : treeRows;
  const ownedTreeItemIds = virtualRows
    .filter((row) => row.kind === "node")
    .map((row) => getDomId("builder-treeitem", row.id))
    .join(" ");

  useEffect(() => {
    setActiveTreeIndex((index) => Math.min(Math.max(index, 0), Math.max(treeRows.length - 1, 0)));
  }, [treeRows.length]);

  const focusTreeIndex = useCallback((index) => {
    const nextIndex = Math.min(Math.max(index, 0), Math.max(treeRows.length - 1, 0));
    const nextRow = treeRows[nextIndex];
    if (!nextRow) return;

    setActiveTreeIndex(nextIndex);
    if (treeWrapRef.current) {
      const nextTop = nextIndex * TREE_ROW_HEIGHT;
      const nextBottom = nextTop + TREE_ROW_HEIGHT;
      const currentTop = treeWrapRef.current.scrollTop;
      const currentBottom = currentTop + treeWrapRef.current.clientHeight;

      if (nextTop < currentTop) {
        treeWrapRef.current.scrollTop = nextTop;
      } else if (nextBottom > currentBottom) {
        treeWrapRef.current.scrollTop = nextBottom - treeWrapRef.current.clientHeight;
      }
    }

    if (typeof window === "undefined") return;
    window.requestAnimationFrame?.(() => {
      treeItemRefs.current.get(nextRow.id)?.focus();
    });
  }, [treeRows]);

  function handleTreeItemKeyDown(event, rowIndex, row) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        focusTreeIndex(rowIndex + 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        focusTreeIndex(rowIndex - 1);
        break;
      case "Home":
        event.preventDefault();
        focusTreeIndex(0);
        break;
      case "End":
        event.preventDefault();
        focusTreeIndex(treeRows.length - 1);
        break;
      case "ArrowRight":
        if (row.collapsible && !row.expanded) {
          event.preventDefault();
          row.onClick?.();
        }
        break;
      case "ArrowLeft":
        if (row.collapsible && row.expanded) {
          event.preventDefault();
          row.onClick?.();
        } else if (rowIndex > 0) {
          event.preventDefault();
          const parentIndex = treeRows
            .slice(0, rowIndex)
            .map((candidate, index) => ({ candidate, index }))
            .reverse()
            .find(({ candidate }) => candidate.depth < row.depth)?.index;
          if (Number.isInteger(parentIndex)) focusTreeIndex(parentIndex);
        }
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        row.onClick?.();
        break;
      default:
        break;
    }
  }

  function renderTreeItem(row, index) {
    const rowIndex = shouldVirtualizeTree ? virtualStartIndex + index : index;
    const nodeId = getDomId("builder-treeitem", row.id);
    const controlsId = row.collapsible ? getDomId("builder-treegroup", row.id) : undefined;
    const content =
      row.kind === "empty" ? (
        <div className="builder-tree-empty" role="status" style={{ "--depth": row.depth }}>
          {row.label}
        </div>
      ) : row.kind === "showMore" ? (
        <button
          type="button"
          className="builder-tree-show-more"
          style={{ "--depth": row.depth }}
          onClick={row.onClick}
          aria-label={row.label}
          title={row.label}
        >
          {row.label}
        </button>
      ) : (
        <TreeRow
          nodeId={nodeId}
          controlsId={controlsId}
          depth={row.depth}
          icon={row.icon}
          label={row.label}
          meta={row.meta}
          active={row.active}
          collapsible={row.collapsible}
          expanded={row.expanded}
          onClick={row.onClick}
          ariaLabel={row.ariaLabel}
          draggable={row.draggable}
          onDragStart={row.onDragStart}
          tabIndex={rowIndex === activeTreeIndex ? 0 : -1}
          onKeyDown={(event) => handleTreeItemKeyDown(event, rowIndex, row)}
          onFocus={() => setActiveTreeIndex(rowIndex)}
          rowRef={(node) => {
            if (node) {
              treeItemRefs.current.set(row.id, node);
            } else {
              treeItemRefs.current.delete(row.id);
            }
          }}
          posInSet={rowIndex + 1}
          setSize={treeRows.length}
        />
      );
    const contentWithControls = (
      <>
        {content}
        {row.collapsible && controlsId ? <span id={controlsId} hidden /> : null}
      </>
    );

    if (!shouldVirtualizeTree) return <React.Fragment key={row.id}>{contentWithControls}</React.Fragment>;

    return (
      <div
        key={row.id}
        className="builder-tree-virtual-row"
        role="none"
        style={{
          height: TREE_ROW_HEIGHT,
          transform: `translateY(${(virtualStartIndex + index) * TREE_ROW_HEIGHT}px)`,
        }}
      >
        {contentWithControls}
      </div>
    );
  }

  return (
    <section className="builder-v3-panel builder-v3-explorer-panel">
      <div className="builder-v3-section-head">
        <div>
          <span className="builder-v3-kicker">ข้อมูล</span>
          <h2 className="builder-v3-title">ชุดข้อมูล ตาราง และฟิลด์</h2>
          <p className="builder-tree-meta-line">
            {structure.database} | {structure.readOnly ? "อ่านอย่างเดียว" : "อ่าน/เขียน"} | {structure.stats.schemaCount} สคีมา | {structure.stats.tableCount} ตาราง | {structure.stats.fieldCount} ฟิลด์
          </p>
        </div>
      </div>

      <label className="builder-v3-field-search" htmlFor="datasource-search-input">
        <span className="sr-only">ค้นหาสคีมา ตาราง และฟิลด์</span>
        <input
          id="datasource-search-input"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="ค้นหาฟิลด์ ตาราง..."
          aria-label="ค้นหาสคีมา ตาราง และฟิลด์"
          aria-controls="builder-dataset-tree"
        />
      </label>
      <p id="builder-dataset-tree-help" className="sr-only">
        Use Up and Down Arrow keys to move through the dataset tree. Use Right Arrow to expand, Left Arrow to collapse, and Enter or Space to select.
      </p>

      {recommendedFields.length ? (
        <div className="builder-v3-recommended-fields">
          <div className="builder-v3-mini-section-head">
            <span>Recommended Fields</span>
            <button type="button" className="builder-v3-link-button" onClick={() => setShowAllFields((value) => !value)}>
              {showAllFields ? "แสดงฟิลด์แนะนำ" : "แสดงฟิลด์ทั้งหมด"}
            </button>
          </div>
          <div className="builder-v3-recommended-field-grid">
            {recommendedFields.map((field) => {
              const typeBadge = getTypeBadge(field);
              const fieldMeta = formatFieldType(field.type || field.semanticType || field.sourceType || "string");
              return (
                <button
                  key={`${selectedTable?.id || "table"}:recommended:${field.name}`}
                  type="button"
                  className={`builder-v3-recommended-field${mappedSet.has(field.name) ? " is-active" : ""}`}
                  draggable
                  onClick={() => {
                    if (selectedTable?.id) setSelectedTableId(selectedTable.id);
                  }}
                  onDragStart={(event) => {
                    if (typeof onDragStart === "function") {
                      onDragStart(event, field);
                    }
                  }}
                >
                  <span>{typeBadge}</span>
                  <strong>{field.label || field.name}</strong>
                  <small>{fieldMeta}</small>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div
        id="builder-dataset-tree"
        ref={treeWrapRef}
        className={`builder-tree-wrap${shouldVirtualizeTree ? " is-virtualized" : ""}`}
        role="tree"
        aria-label={"\u0E42\u0E04\u0E23\u0E07\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E15\u0E31\u0E27\u0E2A\u0E33\u0E23\u0E27\u0E08\u0E10\u0E32\u0E19\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25"}
        aria-describedby="builder-dataset-tree-help"
        aria-owns={ownedTreeItemIds || undefined}
        data-tree-rows={treeRows.length}
        onScroll={(event) => {
          if (shouldVirtualizeTree) setTreeScrollTop(event.currentTarget.scrollTop);
        }}
      >
        {shouldVirtualizeTree ? (
          <div className="builder-tree-virtual-spacer" role="none" style={{ height: treeRows.length * TREE_ROW_HEIGHT }}>
            {virtualRows.map(renderTreeItem)}
          </div>
        ) : (
          virtualRows.map(renderTreeItem)
        )}
      </div>
    </section>
  );
}
