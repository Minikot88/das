import React from "react";
import MappingBoard from "./MappingBoard";

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
    onValidateField: (field) => canAssignFieldToRole(role.key, field),
  }));

  return (
    <div className="builder-config-section builder-inspector-section">
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
