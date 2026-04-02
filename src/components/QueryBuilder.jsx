/**
 * QueryBuilder.jsx
 * DBeaver-style schema tree + interactive column picker.
 * Updates the shared builderState in Zustand when user selects fields.
 */
import React, { useState } from "react";
import { schema, TYPE_BADGE, TYPE_COLOR } from "../data/mockSchema";
import { useStore } from "../store/useStore";
import { suggestChartType } from "../utils/chartUtils";
import { Line, Column } from "@ant-design/charts";
import { datasets } from "../data/mockData";
import { buildChartConfig } from "../utils/chartUtils";

// ─── Schema Tree ─────────────────────────────────────────────────
function SchemaTree({ onSelectTable, selectedDb, selectedTable }) {
  const [openDbs, setOpenDbs] = useState(() => new Set(Object.keys(schema)));

  function toggleDb(db) {
    setOpenDbs((prev) => {
      const next = new Set(prev);
      next.has(db) ? next.delete(db) : next.add(db);
      return next;
    });
  }

  return (
    <div className="schema-tree">
      <div className="schema-tree-header">Schema Explorer</div>

      {Object.entries(schema).map(([dbKey, db]) => (
        <div key={dbKey}>
          {/* Database */}
          <div className="tree-db" onClick={() => toggleDb(dbKey)}>
            <span className="tree-arrow">{openDbs.has(dbKey) ? "▾" : "▸"}</span>
            <span className="tree-db-icon">🗄</span>
            {db.label}
          </div>

          {/* Tables */}
          {openDbs.has(dbKey) &&
            Object.entries(db.tables).map(([tblKey, tbl]) => {
              const isActive = selectedDb === dbKey && selectedTable === tblKey;
              return (
                <div key={tblKey}>
                  <div
                    className={`tree-table${isActive ? " active" : ""}`}
                    onClick={() => onSelectTable(dbKey, tblKey, tbl)}
                  >
                    <span className="tree-arrow" style={{ marginLeft: 8 }}>📋</span>
                    <span style={{ flex: 1 }}>{tbl.label}</span>
                    <span className="tree-count">{tbl.fields.length}</span>
                  </div>

                  {/* Fields (always visible when table is expanded) */}
                  {isActive && tbl.fields.map((f) => (
                    <div key={f.name} className="tree-field">
                      <span
                        className="field-type-dot"
                        style={{ background: TYPE_COLOR[f.type] }}
                      />
                      <span className="tree-field-name">{f.name}</span>
                      <span className="tree-field-badge" style={{ color: TYPE_COLOR[f.type] }}>
                        {TYPE_BADGE[f.type]}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })}
        </div>
      ))}
    </div>
  );
}

// ─── Column Picker ────────────────────────────────────────────────
function ColumnPicker({ tableInfo, selectedDb, selectedTable, xField, yField, onFieldClick }) {
  if (!tableInfo) {
    return (
      <div className="col-picker-empty">
        <span style={{ fontSize: 32, opacity: 0.2 }}>👈</span>
        <p>Select a table from the schema explorer</p>
      </div>
    );
  }

  return (
    <div className="col-picker">
      <div className="col-picker-header">
        <span className="col-picker-path">{selectedDb} › {selectedTable}</span>
        <span className="col-picker-hint">Click column to assign X or Y axis</span>
      </div>
      <div className="col-list">
        {tableInfo.fields.map((field) => {
          const isX = field.name === xField;
          const isY = field.name === yField;
          return (
            <button
              key={field.name}
              className={`col-item${isX ? " col-x" : ""}${isY ? " col-y" : ""}`}
              onClick={() => onFieldClick(field)}
              title={`type: ${field.type}`}
            >
              <span className="col-type-dot" style={{ background: TYPE_COLOR[field.type] }} />
              <span className="col-name">{field.name}</span>
              <span className="col-type-badge" style={{ color: TYPE_COLOR[field.type] }}>
                {TYPE_BADGE[field.type]}
              </span>
              {isX && <span className="col-axis-pill x">X</span>}
              {isY && <span className="col-axis-pill y">Y</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Live Preview ─────────────────────────────────────────────────
function LivePreview({ chart }) {
  if (!chart) {
    return (
      <div className="preview-empty">
        <span className="empty-icon" style={{ fontSize: 36, opacity: 0.15 }}>📊</span>
        <p>Select X and Y fields to preview</p>
      </div>
    );
  }

  const data   = datasets[chart.table] ?? [];
  const config = buildChartConfig(chart, data);

  return chart.type === "bar"
    ? <Column {...config} />
    : <Line   {...config} />;
}

// ─── Main QueryBuilder component ──────────────────────────────────
export default function QueryBuilder() {
  const builderState    = useStore((s) => s.builderState);
  const setBuilderState = useStore((s) => s.setBuilderState);

  const {
    selectedDb, selectedTable,
    xField,
    yField,
    chartType,
  } = builderState;

  // Current table metadata
  const tableInfo = selectedDb && selectedTable
    ? schema[selectedDb]?.tables?.[selectedTable]
    : null;

  function handleSelectTable(db, tbl) {
    // Reset fields when switching table
    setBuilderState({
      selectedDb: db,
      selectedTable: tbl,
      xField: null, xType: null,
      yField: null, yType: null,
      chartType: "line",
    });
  }

  function handleFieldClick(field) {
    if (field.type === "number") {
      // Numeric → Y axis
      setBuilderState({ yField: field.name, yType: field.type });
    } else {
      // String / date → X axis; auto-suggest chart type
      setBuilderState({
        xField: field.name,
        xType: field.type,
        chartType: suggestChartType(field.type),
      });
    }
  }

  // Build preview chart definition
  const previewChart = tableInfo && xField && yField
    ? { table: tableInfo.dataKey, xField, yField, type: chartType }
    : null;

  return (
    <div className="query-builder-layout">
      {/* Left: Schema tree */}
      <SchemaTree
        onSelectTable={handleSelectTable}
        selectedDb={selectedDb}
        selectedTable={selectedTable}
      />

      {/* Middle: Column picker + Live preview */}
      <div className="query-builder-middle">
        <ColumnPicker
          tableInfo={tableInfo}
          selectedDb={selectedDb}
          selectedTable={selectedTable}
          xField={xField}
          yField={yField}
          onFieldClick={handleFieldClick}
        />
        <div className="builder-preview-panel">
          <div className="builder-preview-header">
            Live Preview
            {previewChart && (
              <span className="preview-subtitle">
                — {selectedTable} ({xField} / {yField})
              </span>
            )}
          </div>
          <div className="builder-preview-body">
            <LivePreview chart={previewChart} />
          </div>
        </div>
      </div>
    </div>
  );
}
