/**
 * FieldSelector.jsx
 * Shows selected X/Y fields as chips with clear buttons.
 * Reads from builderState in the Zustand store.
 */
import React from "react";
import { useStore } from "../store/useStore";
import { TYPE_COLOR } from "../utils/chartUtils";

function FieldChip({ axis, label, field, type, onClear }) {
  const hint = axis === "x"
    ? "Click a string/date column"
    : "Click a numeric column";

  if (!field) {
    return (
      <div className="field-drop-zone empty">
        <span className="drop-axis-label">{label}</span>
        <span className="drop-hint">{hint} →</span>
      </div>
    );
  }

  return (
    <div className="field-drop-zone filled" style={{ borderColor: TYPE_COLOR[type] }}>
      <span className="drop-axis-label">{label}</span>
      <span className="drop-field-name" style={{ color: TYPE_COLOR[type] }}>
        {field}
      </span>
      <button className="drop-clear" onClick={onClear} title={`Clear ${label}`}>
        ×
      </button>
    </div>
  );
}

export default function FieldSelector() {
  const { xField, xType, yField, yType } = useStore((s) => s.builderState);
  const setBuilderState = useStore((s) => s.setBuilderState);

  return (
    <div className="field-selector">
      <div className="config-section-label">Assigned Fields</div>
      <FieldChip
        axis="x"
        label="X Axis"
        field={xField}
        type={xType}
        onClear={() => setBuilderState({ xField: null, xType: null })}
      />
      <FieldChip
        axis="y"
        label="Y Axis"
        field={yField}
        type={yType}
        onClear={() => setBuilderState({ yField: null, yType: null })}
      />
    </div>
  );
}
