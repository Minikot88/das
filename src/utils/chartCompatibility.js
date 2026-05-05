import { getChartJsTemplateById } from "./chartTemplates.js";

function normalizeSchema(schema) {
  if (Array.isArray(schema)) return schema;
  if (Array.isArray(schema?.fields)) return schema.fields;
  return [];
}

function normalizeFieldType(type) {
  if (!type) return "unknown";
  if (type === "string") return "category";
  return type;
}

function normalizeRoleFields(mapping = {}, role) {
  const value = mapping?.[role];
  if (Array.isArray(value)) return value.filter(Boolean);
  return value ? [value] : [];
}

function findField(schema, fieldName) {
  return normalizeSchema(schema).find((field) => field.name === fieldName) ?? null;
}

function isAcceptedField(field, accepts = []) {
  if (!field) return false;
  return accepts.includes(normalizeFieldType(field.type));
}

function validateRequiredFieldType({ schema, mapping, roleConfig, errors }) {
  const fields = normalizeRoleFields(mapping, roleConfig.key);
  if (!fields.length) return;

  fields.forEach((fieldName) => {
    const field = findField(schema, fieldName);
    if (!isAcceptedField(field, roleConfig.accepts)) {
      errors.push(`${roleConfig.label} requires ${roleConfig.accepts.join(" or ")} fields.`);
    }
  });
}

function countDistinctValues(rows = [], fieldName) {
  return new Set(rows.map((row) => row?.[fieldName]).filter((value) => value !== undefined && value !== null && value !== "")).size;
}

function getMissingRoles(template, mapping) {
  return template.requiredRoles.filter((role) => normalizeRoleFields(mapping, role).length === 0);
}

function validateBaseRoles(template, schema, mapping, errors) {
  template.roles.forEach((roleConfig) => {
    validateRequiredFieldType({ schema, mapping, roleConfig, errors });
  });
}

function validateBar(template, schema, mapping, errors) {
  if (template.variant === "floating") {
    if (!normalizeRoleFields(mapping, "x").length) errors.push("Floating Bar requires a category or date field.");
    if (!normalizeRoleFields(mapping, "min").length || !normalizeRoleFields(mapping, "max").length) {
      errors.push("Floating Bar requires both min and max numeric fields.");
    }
    return;
  }

  if (!normalizeRoleFields(mapping, "x").length) errors.push("Bar charts require an X field.");
  if (!normalizeRoleFields(mapping, "y").length) errors.push("Bar charts require a numeric Y field.");
  if (["stacked", "grouped"].includes(template.variant) && !normalizeRoleFields(mapping, "series").length) {
    errors.push(`${template.name} requires a series field.`);
  }
}

function validateLineLike(template, mapping, errors) {
  if (!normalizeRoleFields(mapping, "x").length) errors.push(`${template.name} requires an X field.`);

  if (template.variant === "multi") {
    const hasSeriesStrategy = normalizeRoleFields(mapping, "series").length > 0 && normalizeRoleFields(mapping, "y").length > 0;
    const measureCount = normalizeRoleFields(mapping, "measures").length;
    if (!hasSeriesStrategy && measureCount < 2) {
      errors.push("Multi Line requires either Y + Series or at least two numeric measures.");
    }
    return;
  }

  if (template.variant === "multi-axis") {
    if (normalizeRoleFields(mapping, "measures").length < 2) {
      errors.push("Multi Axis Line requires at least two numeric measures.");
    }
    return;
  }

  if (!normalizeRoleFields(mapping, "y").length) {
    errors.push(`${template.name} requires a numeric Y field.`);
  }
}

function validateArea(template, mapping, errors) {
  if (!normalizeRoleFields(mapping, "x").length) errors.push(`${template.name} requires an X field.`);
  if (!normalizeRoleFields(mapping, "y").length) errors.push(`${template.name} requires a numeric Y field.`);
  if (template.variant === "stacked" && !normalizeRoleFields(mapping, "series").length) {
    errors.push("Stacked Area requires a series field.");
  }
}

function validatePieLike(template, mapping, errors) {
  if (!normalizeRoleFields(mapping, "label").length) errors.push(`${template.name} requires a label field.`);

  if (template.variant === "multi-ring") {
    const measures = normalizeRoleFields(mapping, "measures");
    const seriesStrategy = normalizeRoleFields(mapping, "series").length > 0 && normalizeRoleFields(mapping, "value").length > 0;
    if (measures.length < 2 && !seriesStrategy) {
      errors.push("Multi Ring Doughnut requires at least two measures or a grouped series.");
    }
    return;
  }

  if (!normalizeRoleFields(mapping, "value").length) errors.push(`${template.name} requires a numeric value field.`);
}

function validateRadar(template, mapping, errors) {
  if (!normalizeRoleFields(mapping, "label").length) errors.push(`${template.name} requires a label field.`);

  if (template.variant === "multi-dataset") {
    const measures = normalizeRoleFields(mapping, "measures");
    const seriesStrategy = normalizeRoleFields(mapping, "series").length > 0 && normalizeRoleFields(mapping, "value").length > 0;
    if (measures.length < 2 && !seriesStrategy) {
      errors.push("Multi Dataset Radar requires at least two measures or a grouped series.");
    }
    return;
  }

  if (!normalizeRoleFields(mapping, "value").length) errors.push(`${template.name} requires a numeric value field.`);
}

function validateScatter(template, mapping, errors) {
  if (!normalizeRoleFields(mapping, "x").length) errors.push(`${template.name} requires an X value.`);
  if (!normalizeRoleFields(mapping, "y").length) errors.push(`${template.name} requires a Y value.`);
  if (template.variant === "multi-series" && !normalizeRoleFields(mapping, "series").length) {
    errors.push("Multi Series Scatter requires a series field.");
  }
}

function validateBubble(mapping, errors) {
  if (!normalizeRoleFields(mapping, "x").length) errors.push("Bubble requires an X value.");
  if (!normalizeRoleFields(mapping, "y").length) errors.push("Bubble requires a Y value.");
  if (!normalizeRoleFields(mapping, "size").length) errors.push("Bubble requires a size field.");
  if (!normalizeRoleFields(mapping, "series").length && normalizeRoleFields(mapping, "size").length > 0) {
    // optional, no error
  }
}

function validateMixed(template, mapping, errors) {
  if (!normalizeRoleFields(mapping, "x").length) errors.push(`${template.name} requires a category or date field.`);
  if (!normalizeRoleFields(mapping, "bar").length) errors.push(`${template.name} requires a numeric bar value.`);
  if (!normalizeRoleFields(mapping, "line").length) errors.push(`${template.name} requires a numeric line value.`);
  if (template.variant === "stacked-bar-line" && !normalizeRoleFields(mapping, "series").length) {
    errors.push("Stacked Bar + Line requires a series field for the bar stack.");
  }
}

export function getRequiredMappingRoles(templateId) {
  return getChartJsTemplateById(templateId).requiredRoles;
}

export function validateChartMapping({ templateId, mapping = {}, schema, rows = [] }) {
  const template = getChartJsTemplateById(templateId);
  const errors = [];
  const warnings = [];
  const requiredRoles = getMissingRoles(template, mapping);

  validateBaseRoles(template, schema, mapping, errors);

  if (template.family === "bar") validateBar(template, schema, mapping, errors);
  if (template.family === "line") validateLineLike(template, mapping, errors);
  if (template.family === "area") validateArea(template, mapping, errors);
  if (["pie", "doughnut", "polar-area"].includes(template.family)) validatePieLike(template, mapping, errors);
  if (template.family === "radar") validateRadar(template, mapping, errors);
  if (template.family === "scatter") validateScatter(template, mapping, errors);
  if (template.family === "bubble") validateBubble(mapping, errors);
  if (template.family === "mixed") validateMixed(template, mapping, errors);

  const labelField = normalizeRoleFields(mapping, "label")[0];
  if (labelField && ["pie", "doughnut"].includes(template.family)) {
    const distinctLabels = countDistinctValues(rows, labelField);
    if (distinctLabels > 8) {
      warnings.push("Pie-like charts read better with eight or fewer slices.");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    requiredRoles,
  };
}

export function getCompatibleFieldsForRole({ templateId, role, schema }) {
  const template = getChartJsTemplateById(templateId);
  const roleConfig = template.roles.find((item) => item.key === role);
  if (!roleConfig) return [];

  return normalizeSchema(schema).filter((field) => isAcceptedField(field, roleConfig.accepts));
}

export function getChartValidationMessage(result) {
  if (result.valid && !result.warnings.length) return "Mapping is valid.";
  if (result.errors.length) return result.errors.join(" ");
  return result.warnings.join(" ");
}
