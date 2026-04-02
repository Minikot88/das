import { FIELD_ROLES } from "./chartCatalog";
import { getChartRoleConfig } from "./builderMappingUtils";

export { FIELD_ROLES };

export function getChartRequirements(chartId) {
  const roleConfig = getChartRoleConfig(chartId);
  return {
    chartId,
    requiredFields: roleConfig.required,
    optionalFields: roleConfig.optional,
    allowedFieldTypes: Object.fromEntries(
      roleConfig.roles.map((role) => [role.key, role.acceptedTypes])
    ),
    minFields: roleConfig.required.reduce((sum, role) => sum + role.min, 0),
    maxFields: roleConfig.roles.reduce((sum, role) => sum + (role.max ?? 0), 0),
  };
}
