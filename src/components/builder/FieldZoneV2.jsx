/**
 * components/builder/FieldZoneV2.jsx
 * Active drag-and-drop drop zone for Builder field roles.
 */
import React, { useEffect, useState } from "react";

const DRAG_KEY = "bi-field";

export default function FieldZoneV2({
  label,
  badge,
  field,
  fieldType,
  helper,
  tagPrefix,
  onClear,
  zone,
  required = false,
  onDrop,
}) {
  const [dragOver, setDragOver] = useState(false);
  const [activeDragField, setActiveDragField] = useState(null);

  useEffect(() => {
    function handleFieldDrag(event) {
      setActiveDragField(event.detail?.field ?? null);
    }

    function handleFieldDragEnd() {
      setActiveDragField(null);
      setDragOver(false);
    }

    window.addEventListener("builder-field-drag", handleFieldDrag);
    window.addEventListener("builder-field-drag-end", handleFieldDragEnd);

    return () => {
      window.removeEventListener("builder-field-drag", handleFieldDrag);
      window.removeEventListener("builder-field-drag-end", handleFieldDragEnd);
    };
  }, []);

  function handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setDragOver(true);
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragOver(false);
    try {
      const payload = JSON.parse(event.dataTransfer.getData(DRAG_KEY));
      if (payload?.field) onDrop(payload.field, zone);
    } catch {
      // Ignore invalid drag payloads.
    }
  }

  const emptyTitle = activeDragField ? `Drop ${activeDragField.name}` : helper ?? "Drag a field here";

  return (
    <div
      className={`field-drop-zone compact${dragOver ? " drag-over" : ""}${field ? " has-value" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <div className="zone-header compact">
        <div className="zone-label-row">
          <div className="zone-label-mini">{label}</div>
          {badge ? <span className="zone-role-badge">{badge}</span> : null}
          {required ? <span className="zone-required-badge">Req</span> : null}
        </div>
        {field ? (
          <button type="button" className="zone-remove" onClick={onClear} aria-label={`Clear ${label}`}>
            Clear
          </button>
        ) : null}
      </div>

      {field ? (
        <div className="zone-filled-content compact">
          <div className="zone-tag-stack">
            {tagPrefix ? <span className="zone-field-tag zone-field-tag-accent">{tagPrefix}</span> : null}
            <span className="zone-field-name">{field}</span>
            {fieldType ? <span className="zone-field-tag">{fieldType}</span> : null}
          </div>
        </div>
      ) : (
        <div className="zone-empty-state compact">
          <span className="zone-drop-icon">+</span>
          <div className="zone-empty-copy">
            <strong className="zone-empty-title">{emptyTitle}</strong>
          </div>
        </div>
      )}
    </div>
  );
}
