import { getBuilderChartCatalog, getChartMeta } from "./chartCatalog";
import {
  createFieldLookupFromTable,
  createRoleMappingFromConfig,
  getChartRoleConfig,
  validateRoleMapping,
} from "./builderMappingUtils";

function createWarning(code, message) {
  return { code, message };
}

export function getMissingRequirements(chartId, builderState = {}, tableFields = []) {
  const roleMapping = createRoleMappingFromConfig(builderState, chartId, {
    tableFields,
    selectedDb: builderState.selectedDb,
    selectedTable: builderState.selectedTable ?? builderState.dataset ?? builderState.table,
  });

  return getChartRoleConfig(chartId).required
    .filter((role) => (roleMapping[role.key]?.length ?? 0) < role.min)
    .map((role) => ({
      key: role.key,
      role: role.key,
      label: role.label,
      message: `Need ${role.label.toLowerCase()}`,
      helper: role.emptyHint,
    }));
}

export function getChartCompatibility(chartId, builderState = {}, tableFields = []) {
  const meta = getChartMeta(chartId);
  const roleMapping = createRoleMappingFromConfig(builderState, chartId, {
    tableFields,
    selectedDb: builderState.selectedDb,
    selectedTable: builderState.selectedTable ?? builderState.dataset ?? builderState.table,
  });
  const validation = validateRoleMapping(chartId, roleMapping, {
    selectedTable: builderState.selectedTable ?? builderState.dataset ?? builderState.table,
    previewSupported: meta.previewSupported,
  });
  const roleAssignments = getChartRoleConfig(chartId).roles;
  const mappedCount = roleAssignments.filter((role) => (roleMapping[role.key]?.length ?? 0) > 0).length;
  const totalRoles = roleAssignments.length || 1;
  const missingFields = getMissingRequirements(chartId, builderState, tableFields);
  const invalidFields = Object.entries(validation.roleStates)
    .flatMap(([roleKey, state]) =>
      (state.invalidFields ?? []).map((field) => ({
        key: roleKey,
        role: roleKey,
        label: getChartRoleConfig(chartId).roles.find((role) => role.key === roleKey)?.label ?? roleKey,
        fieldName: field.name,
        fieldType: field.type,
        acceptedTypes: getChartRoleConfig(chartId).roles.find((role) => role.key === roleKey)?.acceptedTypes ?? [],
        message: `${field.name} is not compatible with ${roleKey}`,
      }))
    );
  const warnings = [];

  if (meta.experimental) {
    warnings.push(createWarning("experimental", "Experimental chart type"));
  }

  if (!meta.previewSupported) {
    warnings.push(createWarning("preview-unavailable", "Preview not available yet"));
  }

  const penalty = missingFields.length * 0.35 + invalidFields.length * 0.25 + (!meta.supported ? 0.5 : 0);
  const scoreBase = mappedCount / totalRoles;
  const score = Math.max(0, Math.min(1, scoreBase - penalty));
  const compatible = meta.supported && validation.blockers.length === 0;

  return {
    supported: meta.supported,
    compatible,
    score,
    meta,
    missingFields,
    invalidFields,
    warnings,
    requiredSummary: getChartRoleConfig(chartId).required.map((role) => role.label).join(" + "),
    availableFields: createFieldLookupFromTable(tableFields, builderState.selectedDb, builderState.selectedTable),
  };
}

export function isChartCompatible(chartId, builderState = {}, tableFields = []) {
  return getChartCompatibility(chartId, builderState, tableFields).compatible;
}

export function getCompatibilityScore(chartId, builderState = {}, tableFields = []) {
  return getChartCompatibility(chartId, builderState, tableFields).score;
}

export function getChartRecommendationBuckets(builderState = {}, tableFields = []) {
  const allCharts = getBuilderChartCatalog();
  const scored = allCharts.map((chart) => ({
    ...chart,
    compatibility: getChartCompatibility(chart.id, builderState, tableFields),
  }));

  const recommended = scored
    .filter((chart) => chart.compatibility.compatible)
    .sort((a, b) => b.compatibility.score - a.compatibility.score);
  const compatible = scored
    .filter((chart) => !chart.compatibility.compatible && chart.compatibility.supported)
    .sort((a, b) => b.compatibility.score - a.compatibility.score);
  const incompatible = scored.filter((chart) => !chart.compatibility.supported);

  return { recommended, compatible, incompatible };
}
