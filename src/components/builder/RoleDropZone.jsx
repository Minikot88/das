import React, { useEffect, useMemo, useState } from "react";
import { getFieldBadge } from "../../utils/builderMappingUtils";

const DRAG_KEY = "bi-field";

function FieldChip({ field, canMoveLeft, canMoveRight, onRemove, onMoveLeft, onMoveRight }) {
  return (
    <div className="builder-role-chip">
      <span className="builder-role-chip-name">{field.name}</span>
      <span className="builder-role-chip-type">{getFieldBadge(field.type)}</span>
      {canMoveLeft ? (
        <button type="button" className="builder-role-chip-action" onClick={onMoveLeft} aria-label={`Move ${field.name} left`}>
          &lt;
        </button>
      ) : null}
      {canMoveRight ? (
        <button type="button" className="builder-role-chip-action" onClick={onMoveRight} aria-label={`Move ${field.name} right`}>
          &gt;
        </button>
      ) : null}
      <button type="button" className="builder-role-chip-action" onClick={onRemove} aria-label={`Remove ${field.name}`}>
        x
      </button>
    </div>
  );
}

export default function RoleDropZone({
  role,
  onDropField,
  onRemoveField,
  onClearRole,
  onReorderRole,
}) {
  const [dragField, setDragField] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [dropFeedback, setDropFeedback] = useState("");

  useEffect(() => {
    function handleFieldDrag(event) {
      setDragField(event.detail?.field ?? null);
    }

    function handleFieldDragEnd() {
      setDragField(null);
      setDragOver(false);
      setDropFeedback("");
    }

    window.addEventListener("builder-field-drag", handleFieldDrag);
    window.addEventListener("builder-field-drag-end", handleFieldDragEnd);
    return () => {
      window.removeEventListener("builder-field-drag", handleFieldDrag);
      window.removeEventListener("builder-field-drag-end", handleFieldDragEnd);
    };
  }, []);

  const dragDecision = useMemo(() => {
    if (!dragField || !role.onValidateField) return null;
    return role.onValidateField(dragField);
  }, [dragField, role]);

  function handleDragOver(event) {
    event.preventDefault();
    setDragOver(true);
    event.dataTransfer.dropEffect = dragDecision?.ok ? "copy" : "none";
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragOver(false);

    try {
      const payload = JSON.parse(event.dataTransfer.getData(DRAG_KEY));
      if (!payload?.field) return;
      const result = onDropField(
        {
          ...payload.field,
          db: payload.db ?? payload.field.db ?? null,
          tbl: payload.tbl ?? payload.field.tbl ?? null,
        },
        role.key
      );
      if (result?.reason) setDropFeedback(result.reason);
      else setDropFeedback("");
    } catch {
      setDropFeedback("Drop failed");
    }
  }

  function moveField(index, direction) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= role.fields.length) return;
    const nextOrder = [...role.fields];
    const [item] = nextOrder.splice(index, 1);
    nextOrder.splice(nextIndex, 0, item);
    onReorderRole(role.key, nextOrder);
  }

  const zoneStateClass = role.state.status ? `is-${role.state.status}` : "";
  const dragClass = dragOver ? (dragDecision?.ok ? " is-drag-valid" : " is-drag-invalid") : "";
  const helperText = dropFeedback || dragDecision?.reason || role.emptyHint || `Add ${role.label}`;

  return (
    <div
      className={`builder-role-zone ${zoneStateClass}${dragClass}${role.required ? " is-required-role" : " is-optional-role"}`}
      onDragOver={handleDragOver}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <div className="builder-role-zone-head">
        <div className="builder-role-zone-head-copy">
          <div className="builder-role-zone-title-row">
            <strong>{role.label}</strong>
          </div>
        </div>
        {role.fields.length ? (
          <button type="button" className="builder-role-zone-clear" onClick={() => onClearRole(role.key)}>
            Clear
          </button>
        ) : null}
      </div>

      {role.fields.length ? (
        <div className="builder-role-zone-chips">
          {role.fields.map((field, index) => (
            <FieldChip
              key={`${role.key}-${field.name}`}
              field={field}
              canMoveLeft={index > 0}
              canMoveRight={index < role.fields.length - 1}
              onMoveLeft={() => moveField(index, -1)}
              onMoveRight={() => moveField(index, 1)}
              onRemove={() => onRemoveField(role.key, field.name)}
            />
          ))}
        </div>
      ) : (
        <div className="builder-role-zone-empty">{helperText}</div>
      )}
    </div>
  );
}
