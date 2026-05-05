import React from "react";

function normalizeMappedValues(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return value ? [value] : [];
}

export default function DropZone({
  role,
  mappedValue,
  validation,
  onDropField,
  onRemoveField,
  canAssignField,
}) {
  const mappedFields = normalizeMappedValues(mappedValue);
  const hasError = validation.errors.some((message) => message.toLowerCase().includes(role.label.toLowerCase()) || message.toLowerCase().includes(role.key.toLowerCase()));

  function handleDrop(event) {
    event.preventDefault();
    const payload = event.dataTransfer.getData("application/json");
    if (!payload) return;

    const field = JSON.parse(payload);
    if (!canAssignField(role.key, field.name)) return;
    onDropField(role.key, field.name);
  }

  return (
    <div
      className={`builder-v3-dropzone${hasError ? " is-error" : ""}`}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
    >
      <div className="builder-v3-dropzone-head">
        <div>
          <strong>{role.label}</strong>
          <span>{role.accepts.join(" or ")}</span>
        </div>
        {role.multiple ? <span className="builder-v3-pill">Multi</span> : null}
      </div>

      {mappedFields.length ? (
        <div className="builder-v3-mapped-list">
          {mappedFields.map((fieldName) => (
            <button
              key={fieldName}
              type="button"
              className="builder-v3-mapped-chip"
              onClick={() => onRemoveField(role.key, fieldName)}
            >
              <span>{fieldName}</span>
              <small>Remove</small>
            </button>
          ))}
        </div>
      ) : (
        <div className="builder-v3-dropzone-empty">Drop a field here</div>
      )}
    </div>
  );
}

