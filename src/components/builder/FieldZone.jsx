/**
 * components/builder/FieldZone.jsx
 * Drag-and-drop drop zone for Builder axes.
 */
import React, { useState } from "react";

const DRAG_KEY = "bi-field";

export default function FieldZone({ label, field, onClear, zone, onDrop }) {
  const [dragOver, setDragOver] = useState(false);

  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setDragOver(true);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    try {
      const payload = JSON.parse(e.dataTransfer.getData(DRAG_KEY));
      if (payload?.field) onDrop(payload.field, zone);
    } catch { /* ignore */ }
  }

  return (
    <div
      className={`field-drop-zone${dragOver ? " drag-over" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <div className="zone-label-mini">{label}</div>
      {field ? (
        <div className="zone-filled-content">
          <span className="zone-field-name">{field}</span>
          <button className="zone-remove" onClick={onClear}>×</button>
        </div>
      ) : (
        <div className="zone-placeholder">Drop Column</div>
      )}
    </div>
  );
}
