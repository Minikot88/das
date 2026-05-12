import React, { useMemo, useState } from "react";

const TYPE_META = {
  category: { badge: "TXT", tone: "is-category" },
  string: { badge: "TXT", tone: "is-category" },
  number: { badge: "123", tone: "is-number" },
  date: { badge: "DATE", tone: "is-date" },
  boolean: { badge: "BOOL", tone: "is-boolean" },
};

function ExplorerNode({
  label,
  meta = "",
  icon = "DB",
  defaultOpen = true,
  depth = 0,
  isFirst = true,
  isLast = true,
  children,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const hasChildren = Boolean(children);

  return (
    <div
      className={[
        "builder-v3-explorer-node",
        "tree-node",
        `tree-node-depth-${depth}`,
        `depth-${depth}`,
        open ? "tree-node-expanded is-expanded" : "tree-node-collapsed",
        isFirst ? "tree-node-first is-first" : "",
        isLast ? "tree-node-last is-last" : "tree-node-has-next",
      ].join(" ")}
    >
      <button
        type="button"
        className={`builder-v3-explorer-toggle tree-node-row${open ? " is-open" : ""}`}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        <span className="builder-v3-explorer-chevron" aria-hidden="true">
          {open ? "v" : ">"}
        </span>
        <span className="builder-v3-explorer-icon" aria-hidden="true">
          {icon}
        </span>
        <span className="builder-v3-explorer-copy">
          <strong>{label}</strong>
          {meta ? <small>{meta}</small> : null}
        </span>
      </button>
      {open && hasChildren ? <div className="builder-v3-explorer-children tree-children">{children}</div> : null}
    </div>
  );
}

export default function FieldList({ dataset, schema, onDragStart, queryMode = "visual" }) {
  const explorerMeta = useMemo(() => ({
    connectionName: dataset?.connectionName ?? "Mock Connection",
    namespace: dataset?.namespace ?? "analytics",
    tableName: dataset?.tableName ?? dataset?.id ?? "dataset",
    sourceLabel: dataset?.sourceLabel ?? (queryMode === "sql" ? "SQL result" : "Base dataset"),
  }), [dataset, queryMode]);

  const fields = schema?.fields ?? [];

  return (
    <section className="builder-v3-panel builder-v3-panel-stretch builder-v3-explorer-panel">
      <div className="builder-v3-section-head">
        <div>
          <span className="builder-v3-kicker">Data Source</span>
          <h2 className="builder-v3-title">Explorer</h2>
        </div>
        <span className="builder-v3-pill">{fields.length} columns</span>
      </div>

      <div className="builder-v3-dataset-card builder-v3-dataset-card-compact builder-v3-explorer-summary">
        <strong>{dataset?.name ?? "Dataset"}</strong>
        <span>{explorerMeta.sourceLabel}</span>
        <div className="builder-v3-dataset-stats">
          <span>{dataset?.rows?.length ?? 0} rows</span>
          <span>{fields.length} fields</span>
        </div>
      </div>

      <div className="builder-v3-explorer">
        <ExplorerNode label="Data Source" meta="Builder connection" icon="DB" depth={0} isFirst isLast>
          <ExplorerNode label={explorerMeta.connectionName} meta="Connection" icon="CN" depth={1} isFirst isLast>
            <ExplorerNode label={explorerMeta.namespace} meta="Schema" icon="SC" depth={2} isFirst isLast>
              <ExplorerNode
                label={explorerMeta.tableName}
                meta={`${dataset?.rows?.length ?? 0} rows`}
                icon="TB"
                depth={3}
                isFirst
                isLast
              >
                <div className="builder-v3-explorer-fields tree-children">
                  {fields.map((field, index) => {
                    const fieldMeta = TYPE_META[field.type] ?? TYPE_META.string;
                    const isFirstField = index === 0;
                    const isLastField = index === fields.length - 1;
                    return (
                      <button
                        key={field.name}
                        type="button"
                        className={[
                          "builder-v3-explorer-field",
                          "tree-node-row",
                          "tree-field-row",
                          isFirstField ? "tree-node-first is-first" : "",
                          isLastField ? "tree-node-last is-last" : "tree-node-has-next",
                        ].join(" ")}
                        draggable
                        onDragStart={(event) => onDragStart(event, field)}
                        title={field.label ?? field.name}
                      >
                        <span className={`builder-v3-field-type-badge ${fieldMeta.tone}`}>{fieldMeta.badge}</span>
                        <span className="builder-v3-explorer-field-copy">
                          <strong>{field.label ?? field.name}</strong>
                          <small>{field.name}</small>
                        </span>
                        <span className="builder-v3-explorer-field-kind">{field.type}</span>
                      </button>
                    );
                  })}
                </div>
              </ExplorerNode>
            </ExplorerNode>
          </ExplorerNode>
        </ExplorerNode>
      </div>
    </section>
  );
}
