import React from "react";
import RoleDropZone from "./RoleDropZone";

function RoleSection({ title, note, roles, onDropField, onRemoveField, onClearRole, onReorderRole }) {
  if (!roles.length) return null;

  return (
    <section className="builder-mapping-board-section">
      <div className="builder-mapping-board-section-head">
        <strong>{title}</strong>
        {note ? <span>{note}</span> : null}
      </div>
      <div className="builder-mapping-board-grid">
        {roles.map((role) => (
          <RoleDropZone
            key={role.key}
            role={role}
            onDropField={onDropField}
            onRemoveField={onRemoveField}
            onClearRole={onClearRole}
            onReorderRole={onReorderRole}
          />
        ))}
      </div>
    </section>
  );
}

export default function MappingBoard({
  roles = [],
  onDropField,
  onRemoveField,
  onClearRole,
  onReorderRole,
  statusText,
}) {
  const requiredRoles = roles.filter((role) => role.required);
  const optionalRoles = roles.filter((role) => !role.required);

  return (
    <div className="builder-mapping-board">
      {statusText ? (
        <div className="builder-mapping-board-summary">
          <span className="builder-mapping-note">{statusText}</span>
        </div>
      ) : null}

      <RoleSection
        title="Required"
        note=""
        roles={requiredRoles}
        onDropField={onDropField}
        onRemoveField={onRemoveField}
        onClearRole={onClearRole}
        onReorderRole={onReorderRole}
      />

      <RoleSection
        title="Optional"
        note=""
        roles={optionalRoles}
        onDropField={onDropField}
        onRemoveField={onRemoveField}
        onClearRole={onClearRole}
        onReorderRole={onReorderRole}
      />
    </div>
  );
}
