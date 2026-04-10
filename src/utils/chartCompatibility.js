import { getBuilderChartCatalog, getChartMeta } from "./chartCatalog";
import {
  autoMapFieldsForChart,
  createFieldLookupFromTable,
  createRoleMappingFromConfig,
  getChartRoleConfig,
  getMissingRoleSummary,
  preserveCompatibleMapping,
  validateRoleMapping,
} from "./builderMappingUtils";
import { getPreviewReadiness } from "./builderChartUtils";

function summarizeRoleLabels(roleKeys = [], chartId) {
  const roles = getChartRoleConfig(chartId).roles;
  return roleKeys.map((roleKey) => roles.find((role) => role.key === roleKey)?.label ?? roleKey);
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
  const selectedTable = builderState.selectedTable ?? builderState.dataset ?? builderState.table;
  const baseRoleMapping = createRoleMappingFromConfig(builderState, chartId, {
    tableFields,
    selectedDb: builderState.selectedDb,
    selectedTable,
  });
  const availableFields = createFieldLookupFromTable(tableFields, builderState.selectedDb, selectedTable);
  const roleMapping = autoMapFieldsForChart(chartId, availableFields, baseRoleMapping);
  const validation = validateRoleMapping(chartId, roleMapping, {
    selectedTable,
    previewSupported: meta.previewSupported,
    availableFields,
  });
  const previewReadiness = getPreviewReadiness({
    chartId,
    chartMeta: meta,
    roleMapping,
    validation,
    selectedTable,
    rows: builderState.queryMode === "sql"
      ? (builderState.queryResult?.rows ?? [])
      : [],
  });
  const roleAssignments = getChartRoleConfig(chartId).roles;
  const mappedCount = roleAssignments.filter((role) => (roleMapping[role.key]?.length ?? 0) > 0).length;
  const totalRoles = Math.max(roleAssignments.length, 1);
  const missingFields = getMissingRequirements(chartId, builderState, tableFields);
  const invalidFields = Object.entries(validation.roleStates).flatMap(([roleKey, state]) =>
    (state.invalidFields ?? []).map((field) => ({
      key: roleKey,
      role: roleKey,
      label: roleAssignments.find((role) => role.key === roleKey)?.label ?? roleKey,
      fieldName: field.name,
      fieldType: field.type,
      acceptedTypes: roleAssignments.find((role) => role.key === roleKey)?.acceptedTypes ?? [],
      message: `${field.name} is not compatible with ${roleKey}`,
    }))
  );
  const warnings = [...(previewReadiness.cautions ?? [])];

  if (meta.experimental) warnings.push({ code: "experimental", message: "Experimental chart type" });
  if (!meta.previewSupported) warnings.push({ code: "preview-unavailable", message: "Preview needs additional setup" });
  if (meta.advanced) warnings.push({ code: "advanced", message: "Advanced chart configuration" });

  const scoreBase = mappedCount / totalRoles;
  const penalty = missingFields.length * 0.28 + invalidFields.length * 0.18 + (previewReadiness.blockers.length ? 0.2 : 0) + (!meta.previewSupported ? 0.1 : 0);
  const score = Math.max(0, Math.min(1, scoreBase - penalty));
  const compatible = previewReadiness.blockers.length === 0;

  return {
    supported: meta.supported,
    compatible,
    score,
    meta,
    roleMapping,
    validation,
    previewReadiness,
    missingFields,
    invalidFields,
    warnings,
    requiredSummary: getChartRoleConfig(chartId).required.map((role) => role.label).join(" + "),
    availableFields,
  };
}

export function getChartSwitchPlan(nextChartId, currentState = {}, tableFields = []) {
  const currentChartId = currentState.chartType ?? "bar";
  const currentMapping = createRoleMappingFromConfig(currentState, currentChartId, {
    tableFields,
    selectedDb: currentState.selectedDb,
    selectedTable: currentState.selectedTable ?? currentState.dataset ?? currentState.table,
  });
  const availableFields = createFieldLookupFromTable(
    tableFields,
    currentState.selectedDb,
    currentState.selectedTable ?? currentState.dataset ?? currentState.table
  );
  const nextMapping = preserveCompatibleMapping(nextChartId, currentMapping, availableFields);
  const autoMappedNext = autoMapFieldsForChart(nextChartId, availableFields, nextMapping);
  const nextValidation = validateRoleMapping(nextChartId, autoMappedNext, {
    selectedTable: currentState.selectedTable ?? currentState.dataset ?? currentState.table,
    previewSupported: getChartMeta(nextChartId).previewSupported,
    availableFields,
  });

  const preservedRoles = Object.entries(autoMappedNext)
    .filter(([, fields]) => (fields?.length ?? 0) > 0)
    .map(([roleKey]) => roleKey);
  const droppedRoles = Object.entries(currentMapping)
    .filter(([roleKey, fields]) => (fields?.length ?? 0) > 0 && !Object.values(autoMappedNext).flat().some((field) => ensureArray(fields).some((item) => item.name === field?.name)))
    .map(([roleKey]) => roleKey);
  const missingRoles = getMissingRoleSummary(nextChartId, autoMappedNext);

  return {
    currentChartId,
    nextChartId,
    currentMapping,
    nextMapping: autoMappedNext,
    preservedRoles,
    droppedRoles,
    missingRoles,
    preservedRoleLabels: summarizeRoleLabels(preservedRoles, nextChartId),
    droppedRoleLabels: summarizeRoleLabels(droppedRoles, currentChartId),
    validation: nextValidation,
    compatible: nextValidation.blockers.length === 0,
    message: missingRoles.length
      ? `${getChartMeta(nextChartId).name} still needs ${missingRoles.join(", ")}.`
      : `${getChartMeta(nextChartId).name} preserved compatible mappings.`,
  };
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
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

  return {
    recommended: scored.filter((chart) => chart.compatibility.compatible).sort((a, b) => b.compatibility.score - a.compatibility.score),
    compatible: scored.filter((chart) => !chart.compatibility.compatible && chart.compatibility.score > 0).sort((a, b) => b.compatibility.score - a.compatibility.score),
    incompatible: scored.filter((chart) => chart.compatibility.score === 0),
  };
}
