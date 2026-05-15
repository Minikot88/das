import React, { useMemo, useState } from "react";

const TYPE_META = {
  category: { label: "Dimension", badge: "Dimension", tone: "is-category", group: "dimensions" },
  string: { label: "Dimension", badge: "Dimension", tone: "is-category", group: "dimensions" },
  number: { label: "Measure", badge: "Measure", tone: "is-number", group: "measures" },
  date: { label: "Date", badge: "Date", tone: "is-date", group: "dimensions" },
  boolean: { label: "Dimension", badge: "Dimension", tone: "is-boolean", group: "dimensions" },
};

function formatDatasetName(value = "") {
  return String(value || "Dataset")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatType(value = "") {
  return String(value || "field").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function FieldGroup({ title, count, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="builder-v3-field-group">
      <button
        type="button"
        className="builder-v3-field-group-toggle"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        <span>{title}</span>
        <small>{count}</small>
      </button>
      {open ? <div className="builder-v3-explorer-fields">{children}</div> : null}
    </section>
  );
}

function FieldRow({ field, onDragStart }) {
  const fieldMeta = TYPE_META[field.type] ?? TYPE_META.string;
  const label = field.label ?? field.name;
  const showOriginalName = field.name && field.name !== label;

  return (
    <button
      type="button"
      className="builder-v3-explorer-field"
      draggable
      onDragStart={(event) => onDragStart(event, field)}
      title={showOriginalName ? `${label} (${field.name})` : label}
    >
      <span className={`builder-v3-field-type-badge ${fieldMeta.tone}`}>{fieldMeta.badge}</span>
      <span className="builder-v3-explorer-field-copy">
        <strong>{label}</strong>
        <small>{showOriginalName ? field.name : formatType(field.type)}</small>
      </span>
    </button>
  );
}

export default function FieldList({ dataset, schema, onDragStart, queryMode = "visual" }) {
  const [searchTerm, setSearchTerm] = useState("");
  const explorerMeta = useMemo(() => {
    const tableName = dataset?.tableName ?? dataset?.id ?? "dataset";
    return {
      connectionName: dataset?.connectionName ?? "Mock Connection",
      namespace: dataset?.namespace ?? "analytics",
      tableName,
      datasetName: dataset?.name ?? formatDatasetName(tableName),
      sourceLabel: dataset?.sourceLabel ?? (queryMode === "sql" ? "SQL result" : "Base dataset"),
    };
  }, [dataset, queryMode]);

  const fields = useMemo(() => schema?.fields ?? [], [schema]);
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const filteredFields = useMemo(() => {
    if (!normalizedSearchTerm) return fields;
    return fields.filter((field) => {
      const label = field.label ?? field.name;
      return [label, field.name, field.type]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearchTerm));
    });
  }, [fields, normalizedSearchTerm]);

  const groupedFields = useMemo(
    () =>
      filteredFields.reduce(
        (groups, field) => {
          const fieldMeta = TYPE_META[field.type] ?? TYPE_META.string;
          groups[fieldMeta.group].push(field);
          return groups;
        },
        { dimensions: [], measures: [] }
      ),
    [filteredFields]
  );

  const emptySearch = normalizedSearchTerm && !filteredFields.length;
  const rowsCount = dataset?.rows?.length ?? 0;

  return (
    <section className="builder-v3-panel builder-v3-panel-stretch builder-v3-explorer-panel">
      <div className="builder-v3-section-head">
        <div>
          <span className="builder-v3-kicker">Data Source</span>
          <h2 className="builder-v3-title">Explorer</h2>
        </div>
        <span className="builder-v3-pill">{fields.length} fields</span>
      </div>

      <div className="builder-v3-dataset-card builder-v3-dataset-card-compact builder-v3-explorer-summary">
        <strong>{explorerMeta.datasetName}</strong>
        <span>{rowsCount} rows · {fields.length} fields</span>
      </div>

      <label className="builder-v3-field-search">
        <span className="sr-only">Search fields</span>
        <input
          type="search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search fields..."
          aria-label="Search fields"
        />
      </label>

      <div className="builder-v3-explorer">
        {emptySearch ? (
          <div className="builder-v3-field-empty">No fields found</div>
        ) : (
          <>
            {(!normalizedSearchTerm || groupedFields.dimensions.length > 0) ? (
              <FieldGroup title="Dimensions" count={groupedFields.dimensions.length}>
                {groupedFields.dimensions.map((field) => (
                  <FieldRow key={field.name} field={field} onDragStart={onDragStart} />
                ))}
              </FieldGroup>
            ) : null}

            {(!normalizedSearchTerm || groupedFields.measures.length > 0) ? (
              <FieldGroup title="Measures" count={groupedFields.measures.length}>
                {groupedFields.measures.map((field) => (
                  <FieldRow key={field.name} field={field} onDragStart={onDragStart} />
                ))}
              </FieldGroup>
            ) : null}
          </>
        )}
      </div>

      <details className="builder-v3-connection-details">
        <summary>Connection details</summary>
        <dl>
          <div>
            <dt>Connection</dt>
            <dd>{explorerMeta.connectionName}</dd>
          </div>
          <div>
            <dt>Schema</dt>
            <dd>{explorerMeta.namespace}</dd>
          </div>
          <div>
            <dt>Table</dt>
            <dd>{explorerMeta.tableName}</dd>
          </div>
          <div>
            <dt>Source</dt>
            <dd>{explorerMeta.sourceLabel}</dd>
          </div>
        </dl>
      </details>
    </section>
  );
}
