import React from "react";
import DropZone from "./DropZone";

export default function ChartMappingPanel({
  template,
  mapping,
  validation,
  onDropField,
  onRemoveField,
  canAssignField,
}) {
  if (!template) return null;

  return (
    <section className="builder-v3-panel builder-v3-mapping-panel">
      <div className="builder-v3-section-head">
        <div>
          <span className="builder-v3-kicker">Mapping</span>
          <h2 className="builder-v3-title">Assign fields</h2>
        </div>
        <span className="builder-v3-pill">{template.roles.length} roles</span>
      </div>

      <div className="builder-v3-mapping-grid">
        {template.roles.map((role) => (
          <DropZone
            key={role.key}
            role={role}
            mappedValue={mapping[role.key]}
            validation={validation}
            onDropField={onDropField}
            onRemoveField={onRemoveField}
            canAssignField={canAssignField}
          />
        ))}
      </div>
    </section>
  );
}

