import React from "react";
import MappingBoard from "./MappingBoard";
import { getReadableFieldLabel } from "../../utils/builderMappingUtils";

export default function BuilderMappingsSection({
  roleAssignments,
  lastMappingNotice,
  handleFieldAssign,
  handleRoleFieldRemove,
  handleClearRole,
  handleReorderRole,
  canAssignFieldToRole,
}) {
  const rolesWithValidation = roleAssignments.map((role) => ({
    ...role,
    fields: (role.fields ?? []).map((field) => {
      if (!field || typeof field !== "object" || Array.isArray(field)) return field;
      return {
        ...field,
        __displayLabel: getReadableFieldLabel(field),
      };
    }),
    onValidateField: (field) => canAssignFieldToRole(role.key, field),
  }));

  return (
    <div className="builder-config-section builder-inspector-section">
      <div className="builder-section-head">
        <strong className="builder-section-title">Mappings</strong>
      </div>
      <MappingBoard
        roles={rolesWithValidation}
        statusText={lastMappingNotice || ""}
        onDropField={(field, roleKey) => handleFieldAssign(field.db, field.tbl, field, roleKey)}
        onRemoveField={handleRoleFieldRemove}
        onClearRole={handleClearRole}
        onReorderRole={handleReorderRole}
      />
    </div>
  );
}
