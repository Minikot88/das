import { getChartMeta, resolveChartRuntimeType } from "./chartCatalog";
import { getChartRequirements } from "./chartRequirements";

const TYPE_LABELS = {
  string: "Text",
  number: "Number",
  date: "Date",
  boolean: "Boolean",
};

const TIME_PATTERN = /(^|[_\s-])(date|day|week|month|quarter|year|time|timestamp|created|updated|occurred|period)([_\s-]|$)/i;
const METRIC_PATTERN = /(^|[_\s-])(sales|revenue|profit|amount|total|count|qty|quantity|price|cost|score|rate|value|metric|gdp|population|volume|measure)([_\s-]|$)/i;
const CATEGORY_PATTERN = /(^|[_\s-])(category|name|product|item|region|country|state|city|segment|group|type|stage|team|department|channel|brand|market|industry)([_\s-]|$)/i;
const SERIES_PATTERN = /(^|[_\s-])(series|segment|group|type|channel|scenario|cohort|bucket|cluster)([_\s-]|$)/i;
const SOURCE_PATTERN = /(^|[_\s-])(source|from|origin|parent|start)([_\s-]|$)/i;
const TARGET_PATTERN = /(^|[_\s-])(target|to|destination|child|end)([_\s-]|$)/i;
const REGION_PATTERN = /(^|[_\s-])(region|country|state|province|city|market|territory|geo|location|area)([_\s-]|$)/i;
const LABEL_PATTERN = /(^|[_\s-])(label|title|name|description|detail|text)([_\s-]|$)/i;
const OPEN_PATTERN = /(^|[_\s-])open([_\s-]|$)/i;
const HIGH_PATTERN = /(^|[_\s-])(high|max)([_\s-]|$)/i;
const LOW_PATTERN = /(^|[_\s-])(low|min)([_\s-]|$)/i;
const CLOSE_PATTERN = /(^|[_\s-])(close|end)([_\s-]|$)/i;
const Q1_PATTERN = /(^|[_\s-])(q1|quartile1|quartile_1|p25|percentile25)([_\s-]|$)/i;
const MEDIAN_PATTERN = /(^|[_\s-])(median|q2|p50|percentile50)([_\s-]|$)/i;
const Q3_PATTERN = /(^|[_\s-])(q3|quartile3|quartile_3|p75|percentile75)([_\s-]|$)/i;
const TARGET_VALUE_PATTERN = /(^|[_\s-])(target|goal|max|quota|benchmark|plan)([_\s-]|$)/i;
const TEMPORAL_BUCKET_PATTERN = /(^|[_\s-])(day|week|month|quarter|year)([_\s-]|$)/i;
const LINE_AREA_RUNTIME_TYPES = new Set(["line", "multi-line", "smooth-line", "step-line", "area", "stacked-line", "stacked-area"]);

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeName(name = "") {
  return String(name).trim().toLowerCase();
}

export function getReadableFieldLabel(field) {
  if (Array.isArray(field)) {
    return field.map((item) => getReadableFieldLabel(item)).filter(Boolean).join(", ");
  }

  if (field === null || field === undefined) return "";
  if (typeof field === "string" || typeof field === "number") return String(field);

  if (typeof field === "object") {
    return field.__displayLabel || field.label || field.name || field.columnName || field.key || field.id || "";
  }

  return "";
}

export function getReadableFieldName(field) {
  if (typeof field === "object" && !Array.isArray(field) && field) {
    return field.name || field.columnName || field.key || field.id || getReadableFieldLabel(field);
  }

  return getReadableFieldLabel(field);
}

function dedupeByName(items = []) {
  const seen = new Set();
  return items.filter((item) => {
    const key = item?.name ?? item?.id;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isFieldAvailable(field, lookup) {
  if (!field?.name) return false;
  return lookup.size === 0 || lookup.has(field.name);
}

function getLookup(fields = []) {
  return new Map(fields.filter(Boolean).map((field) => [field.name, field]));
}

function typeMatches(fieldType, acceptedTypes = []) {
  if (!acceptedTypes.length || !fieldType) return true;
  return acceptedTypes.includes(fieldType);
}

export function classifyFieldSemantics(field) {
  const name = normalizeName(field?.name);
  const type = field?.type ?? null;
  const isNumeric = type === "number";
  const isDate = type === "date" || TIME_PATTERN.test(name);
  const isTemporalBucket = isNumeric && TEMPORAL_BUCKET_PATTERN.test(name);
  const isTextLike = type === "string" || type === "boolean" || type === "date";

  return {
    isNumeric,
    isDate,
    isTemporalBucket,
    isTextLike,
    isMetric: ((!isDate && !isTemporalBucket && isNumeric) || METRIC_PATTERN.test(name)),
    isCategory: isTextLike || CATEGORY_PATTERN.test(name),
    isSeries: SERIES_PATTERN.test(name),
    isSource: SOURCE_PATTERN.test(name),
    isTarget: TARGET_PATTERN.test(name),
    isRegion: REGION_PATTERN.test(name),
    isLabel: LABEL_PATTERN.test(name),
    isOpen: OPEN_PATTERN.test(name),
    isHigh: HIGH_PATTERN.test(name),
    isLow: LOW_PATTERN.test(name),
    isClose: CLOSE_PATTERN.test(name),
    isQ1: Q1_PATTERN.test(name),
    isMedian: MEDIAN_PATTERN.test(name),
    isQ3: Q3_PATTERN.test(name),
    hasTargetValueSignal: TARGET_VALUE_PATTERN.test(name),
  };
}

function isLineAreaRuntimeType(chartId) {
  return LINE_AREA_RUNTIME_TYPES.has(resolveChartRuntimeType(chartId));
}

function getMappedFields(mapping = {}, roleKey) {
  return ensureArray(mapping[roleKey]).filter(Boolean);
}

function listFieldNames(fields = []) {
  return fields.map((field) => field?.name).filter(Boolean);
}

export function getLineAreaMappingMode(chartId, mapping = {}) {
  if (!isLineAreaRuntimeType(chartId)) {
    return {
      supported: true,
      mode: "default",
      blockers: [],
      cautions: [],
      hasY: false,
      hasYs: false,
      hasSeries: false,
      yFields: [],
      yMeasureFields: [],
      seriesFields: [],
      temporalMeasureFields: [],
    };
  }

  const yFields = getMappedFields(mapping, "y");
  const yMeasureFields = getMappedFields(mapping, "ys");
  const seriesFields = getMappedFields(mapping, "series");
  const temporalMeasureFields = yMeasureFields.filter((field) => classifyFieldSemantics(field).isTemporalBucket);
  const blockers = [];
  const cautions = [];
  const hasY = yFields.length > 0;
  const hasYs = yMeasureFields.length > 0;
  const hasSeries = seriesFields.length > 0;

  if (!hasY && !hasYs) {
    blockers.push({
      code: "line-measure-missing",
      title: "Add a Y Axis or Y Measures",
      message: "Line and area charts need either one Y Axis field or one or more Y Measures.",
      action: "Map one numeric Y Axis field, or add one or more Y Measures.",
    });
  }

  if (hasY && hasYs) {
    blockers.push({
      code: "line-measure-conflict",
      title: "Use either Y Axis or Y Measures",
      message: "This chart supports either a single Y Axis field or multiple Y Measures, but not both at the same time.",
      action: "Keep Y Axis for grouped series charts, or remove it and use Y Measures instead.",
    });
  }

  if (hasYs && hasSeries) {
    blockers.push({
      code: "line-series-measure-conflict",
      title: "Use either Series or Y Measures",
      message: "This line or area variant supports grouped series mode or multi-measure mode, but not both together.",
      action: "Use Series with one Y Axis field, or remove Series and keep Y Measures.",
    });
  }

  if (temporalMeasureFields.length) {
    cautions.push({
      code: "line-temporal-measure",
      title: "Remove calendar fields from Y Measures",
      message: `${listFieldNames(temporalMeasureFields).join(", ")} look like calendar dimensions and usually belong on the X Axis, not in Y Measures.`,
      action: "Keep calendar fields on X Axis or Series, and use numeric metrics in Y Measures.",
    });
  }

  return {
    supported: blockers.length === 0,
    mode: hasYs ? "multi-measure" : hasY ? "grouped-series" : "unconfigured",
    blockers,
    cautions,
    hasY,
    hasYs,
    hasSeries,
    yFields,
    yMeasureFields,
    seriesFields,
    temporalMeasureFields,
  };
}

function formatCapacity(min = 0, max = 1) {
  if (max == null) return min > 1 ? `${min}+ fields` : "Multiple fields";
  if (min === 1 && max === 1) return "1 field";
  if (min === 0 && max === 1) return "Up to 1 field";
  if (min === max) return `${max} fields`;
  return `${min}-${max} fields`;
}

export function getAcceptedTypeLabel(acceptedTypes = []) {
  if (!acceptedTypes.length) return "Any";
  return acceptedTypes.map((type) => TYPE_LABELS[type] ?? type).join(" / ");
}

export function getFieldBadge(type) {
  return TYPE_LABELS[type] ?? type ?? "Any";
}

export function buildFieldRef({ db = null, tbl = null, field }) {
  if (!field?.name) return null;
  return {
    id: `${db ?? "db"}.${tbl ?? "table"}.${field.name}`,
    name: field.name,
    type: field.type ?? null,
    db,
    tbl,
  };
}

function normalizeFieldRef(field, lookup) {
  if (!field) return null;
  if (typeof field === "string") {
    const meta = lookup.get(field);
    return {
      id: meta?.id ?? field,
      name: field,
      type: meta?.type ?? null,
      db: meta?.db ?? null,
      tbl: meta?.tbl ?? null,
    };
  }

  const meta = lookup.get(field.name);
  return {
    id: field.id ?? meta?.id ?? `${field.db ?? meta?.db ?? "db"}.${field.tbl ?? meta?.tbl ?? "table"}.${field.name}`,
    name: field.name,
    type: field.type ?? meta?.type ?? null,
    db: field.db ?? meta?.db ?? null,
    tbl: field.tbl ?? meta?.tbl ?? null,
  };
}

export function createFieldLookupFromTable(tableFields = [], selectedDb = null, selectedTable = null) {
  return tableFields.map((field) => buildFieldRef({ db: selectedDb, tbl: selectedTable, field })).filter(Boolean);
}

export function getFieldTypeFromTable(tableFields = [], fieldName) {
  return tableFields.find((field) => field.name === fieldName)?.type ?? null;
}

export function getChartRoleConfig(chartId) {
  const requirements = getChartRequirements(chartId);
  const chartMeta = getChartMeta(chartId);
  const roles = requirements.roles.map((role) => ({
    ...role,
    acceptedTypeLabel: getAcceptedTypeLabel(role.acceptedTypes),
    capacityLabel: formatCapacity(role.min, role.max),
  }));

  return {
    chartId,
    chartMeta,
    roles,
    required: roles.filter((role) => role.required),
    optional: roles.filter((role) => !role.required),
  };
}

export function getAcceptedFieldTypes(chartId, roleKey) {
  return getChartRoleConfig(chartId).roles.find((role) => role.key === roleKey)?.acceptedTypes ?? [];
}

export function getRoleCapacity(chartId, roleKey) {
  const role = getChartRoleConfig(chartId).roles.find((item) => item.key === roleKey);
  return role ? { min: role.min, max: role.max, label: role.capacityLabel } : { min: 0, max: 0, label: "0" };
}

export function createRoleMappingFromConfig(builderState = {}, chartId, options = {}) {
  const { tableFields = [], selectedDb = null, selectedTable = null } = options;
  const roleConfig = getChartRoleConfig(chartId);
  const availableFields = createFieldLookupFromTable(tableFields, selectedDb, selectedTable);
  const lookup = getLookup(availableFields);
  const nextMapping = {};

  Object.entries(builderState.roleMapping ?? {}).forEach(([roleKey, items]) => {
    nextMapping[roleKey] = dedupeByName(ensureArray(items).map((item) => normalizeFieldRef(item, lookup)).filter(Boolean));
  });

  const slotValues = {
    x: builderState.x ?? builderState.xField ?? null,
    y: builderState.y ?? builderState.yField ?? null,
    group: builderState.groupBy ?? builderState.groupField ?? null,
    size: builderState.sizeField ?? builderState.size ?? null,
  };
  const slotTypes = {
    x: builderState.xType ?? null,
    y: builderState.yType ?? null,
    size: builderState.sizeType ?? null,
  };

  roleConfig.roles.forEach((role) => {
    const existing = nextMapping[role.key] ?? [];
    const fromSlots = (role.slotBindings ?? [])
      .map((slotKey) => {
        const fieldName = slotValues[slotKey];
        if (!fieldName) return null;
        return normalizeFieldRef({ name: fieldName, type: slotTypes[slotKey] ?? lookup.get(fieldName)?.type ?? null, db: selectedDb, tbl: selectedTable }, lookup);
      })
      .filter(Boolean)
      .filter((field) => typeMatches(field.type, role.acceptedTypes));

    nextMapping[role.key] = dedupeByName([...existing, ...fromSlots]).slice(0, role.max ?? undefined);
  });

  return nextMapping;
}

export function createBuilderStateFromRoleMapping(chartId, mapping = {}, options = {}) {
  const { selectedDb = null, selectedTable = null } = options;
  const roleConfig = getChartRoleConfig(chartId);
  const nextState = {
    selectedDb,
    selectedTable,
    xField: null,
    xType: null,
    yField: null,
    yType: null,
    groupField: null,
    sizeField: null,
    sizeType: null,
    roleMapping: {},
  };
  const assignedSlots = new Set();

  roleConfig.roles.forEach((role) => {
    const fields = dedupeByName(ensureArray(mapping[role.key])).slice(0, role.max ?? undefined);
    nextState.roleMapping[role.key] = fields;

    fields.forEach((field, index) => {
      const slotKey = role.slotBindings?.[index];
      if (!slotKey || assignedSlots.has(slotKey)) return;
      assignedSlots.add(slotKey);

      if (slotKey === "x") {
        nextState.xField = field.name;
        nextState.xType = field.type ?? null;
      }
      if (slotKey === "y") {
        nextState.yField = field.name;
        nextState.yType = field.type ?? null;
      }
      if (slotKey === "group") {
        nextState.groupField = field.name;
      }
      if (slotKey === "size") {
        nextState.sizeField = field.name;
        nextState.sizeType = field.type ?? null;
      }
    });
  });

  return nextState;
}

export function getRoleValidationState(chartId, roleKey, mappedFields = [], options = {}) {
  const role = getChartRoleConfig(chartId).roles.find((item) => item.key === roleKey);
  if (!role) {
    return { status: "invalid", message: "Unknown role", missingCount: 0, invalidFields: [], overflow: false, missingFields: [] };
  }

  const lookup = getLookup(options.availableFields ?? []);
  const fields = ensureArray(mappedFields);
  const invalidFields = fields.filter((field) => !typeMatches(field?.type, role.acceptedTypes));
  const missingFields = lookup.size
    ? fields.filter((field) => field?.name && !lookup.has(field.name))
    : [];
  const overflow = role.max != null && fields.length > role.max;
  const missingCount = Math.max(0, role.min - fields.length);
  let status = "valid";

  if (!fields.length) status = role.required ? "empty" : "empty-optional";
  if (missingCount > 0 && fields.length > 0) status = "partial";
  if (invalidFields.length || overflow || missingFields.length) status = "invalid";

  let message = role.emptyHint;
  if (missingFields.length) {
    message = `${role.label} has fields missing from the active source`;
  } else if (invalidFields.length) {
    message = `${role.label} requires ${role.acceptedTypeLabel.toLowerCase()} fields`;
  } else if (overflow) {
    message = `${role.label} accepts ${role.capacityLabel.toLowerCase()}`;
  } else if (missingCount > 0) {
    message = `Add ${role.label.toLowerCase()}${missingCount > 1 ? ` (${missingCount} more)` : ""}`;
  } else if (fields.length) {
    message = `${fields.length} mapped`;
  }

  return { status, message, missingCount, invalidFields, overflow, missingFields };
}

export function validateRoleMapping(chartId, mapping = {}, options = {}) {
  const { selectedTable = null, previewSupported = true, availableFields = [] } = options;
  const roleConfig = getChartRoleConfig(chartId);
  const blockers = [];
  const cautions = [];
  const roleStates = {};

  if (!selectedTable) {
    blockers.push({
      level: "error",
      code: "missing-table",
      title: "Select a table",
      message: "Choose a data source table before previewing or saving.",
      action: "Pick a table from the data explorer, then map the required roles.",
    });
  }

  roleConfig.roles.forEach((role) => {
    const state = getRoleValidationState(chartId, role.key, mapping[role.key] ?? [], { availableFields });
    roleStates[role.key] = state;

    if (state.missingCount > 0 && role.required) {
      blockers.push({
        level: "error",
        code: `missing-${role.key}`,
        title: `${role.label} is required`,
        message: `${roleConfig.chartMeta.name} needs ${role.label.toLowerCase()} before it can render.`,
        action: role.emptyHint,
      });
    }

    if (state.missingFields.length) {
      blockers.push({
        level: "error",
        code: `missing-source-field-${role.key}`,
        title: `${role.label} is mapped to an unavailable field`,
        message: `${state.missingFields.map((field) => field.name).join(", ")} no longer exists in the active source.`,
        action: "Remap this role using a field from the active source.",
      });
    }

    if (state.invalidFields.length) {
      blockers.push({
        level: "error",
        code: `invalid-${role.key}`,
        title: `${role.label} has the wrong field type`,
        message: `${role.label} requires ${role.acceptedTypeLabel.toLowerCase()}.`,
        action: `Replace the mapped field with a compatible ${role.acceptedTypeLabel.toLowerCase()} field.`,
      });
    }

    if (state.overflow) {
      blockers.push({
        level: "error",
        code: `overflow-${role.key}`,
        title: `${role.label} has too many fields`,
        message: `${role.label} accepts ${role.capacityLabel.toLowerCase()}.`,
        action: "Remove extra fields from this role.",
      });
    }
  });

  const runtimeType = resolveChartRuntimeType(chartId);
  const lineAreaMode = getLineAreaMappingMode(chartId, mapping);

  if (isLineAreaRuntimeType(chartId)) {
    const valueBlockerIndex = blockers.findIndex((item) => item.code === "missing-y");
    if (valueBlockerIndex >= 0) blockers.splice(valueBlockerIndex, 1);
    if (roleStates.y?.status === "empty") {
      roleStates.y = {
        ...roleStates.y,
        status: "empty-optional",
        missingCount: 0,
        message: "Optional when Y Measures are used",
      };
    }
  }

  if (runtimeType === "boxplot") {
    const hasRawValue = (mapping.value?.length ?? 0) > 0;
    const hasQuartiles = ["min", "q1", "median", "q3", "max"].every((roleKey) => (mapping[roleKey]?.length ?? 0) > 0);
    if (!hasRawValue && hasQuartiles) {
      const valueBlockerIndex = blockers.findIndex((item) => item.code === "missing-value");
      if (valueBlockerIndex >= 0) blockers.splice(valueBlockerIndex, 1);
      if (roleStates.value) {
        roleStates.value = {
          ...roleStates.value,
          status: "valid",
          missingCount: 0,
          message: "Using quartile fields",
        };
      }
    }

    if (!hasRawValue && !hasQuartiles) {
      cautions.push({
        level: "warning",
        code: "boxplot-shape",
        title: "Boxplot needs raw values or full quartiles",
        message: "Map one raw numeric value field, or provide min, Q1, median, Q3, and max fields.",
        action: "Add a raw value field or complete the quartile mappings.",
      });
    }
  }

  if (["treemap", "sunburst", "tree"].includes(runtimeType) && (mapping.hierarchy?.length ?? 0) < 2) {
    cautions.push({
      level: "warning",
      code: "hierarchy-depth",
      title: `${roleConfig.chartMeta.name} benefits from a second hierarchy level`,
      message: "You can preview with one hierarchy field, but deeper structure gives a richer result.",
      action: "Add another hierarchy field if your data supports it.",
    });
  }

  if (["line", "multi-line", "smooth-line", "area", "stacked-area", "step-line", "theme-river", "bar-racing"].includes(runtimeType)) {
    const timeField = mapping.time?.[0] ?? mapping.date?.[0] ?? mapping.x?.[0];
    if (timeField && timeField.type && timeField.type !== "date") {
      cautions.push({
        level: "warning",
        code: "trend-non-date",
        title: "Trend charts work best with dates",
        message: "The chart can still render, but a date field usually produces a clearer trend.",
        action: "Use a date field on the time role if one is available.",
      });
    }
  }

  if (isLineAreaRuntimeType(chartId)) {
    lineAreaMode.blockers.forEach((item) => {
      blockers.push({
        level: "error",
        code: item.code,
        title: item.title,
        message: item.message,
        action: item.action,
      });
    });

    lineAreaMode.cautions.forEach((item) => {
      cautions.push({
        level: "warning",
        code: item.code,
        title: item.title,
        message: item.message,
        action: item.action,
      });
    });
  }

  if (!previewSupported) {
    cautions.push({
      level: "warning",
      code: "preview-unavailable",
      title: "Preview not available",
      message: roleConfig.chartMeta.disabledReason || "This chart needs additional configuration before preview can render.",
      action: "Finish the required setup or switch to a preview-ready chart.",
    });
  }

  return {
    valid: blockers.length === 0,
    blockers,
    cautions,
    roleStates,
    nextStep: blockers[0]?.action ?? cautions[0]?.action ?? "Ready to preview",
  };
}

export function canAssignFieldToRole(chartId, roleKey, field, currentMapping = {}) {
  const role = getChartRoleConfig(chartId).roles.find((item) => item.key === roleKey);
  if (!role) return { ok: false, reason: "Unknown role" };
  const normalizedField = normalizeFieldRef(field, new Map());
  if (!normalizedField?.name) return { ok: false, reason: "Invalid field" };
  if (!typeMatches(normalizedField.type, role.acceptedTypes)) {
    return { ok: false, reason: `Requires ${role.acceptedTypeLabel.toLowerCase()}` };
  }

  const existing = ensureArray(currentMapping[roleKey]);
  if (existing.some((item) => item.name === normalizedField.name)) {
    return { ok: false, reason: "Already mapped" };
  }

  if (role.max === 1 && existing.length === 1) {
    return { ok: true, replace: true, reason: `Replace ${existing[0].name}` };
  }

  if (role.max != null && existing.length >= role.max) {
    return { ok: false, reason: `Accepts ${role.capacityLabel.toLowerCase()}` };
  }

  return { ok: true, replace: false, reason: "" };
}

export function assignFieldToRole(chartId, mapping = {}, roleKey, field) {
  const decision = canAssignFieldToRole(chartId, roleKey, field, mapping);
  if (!decision.ok) {
    return { mapping, changed: false, reason: decision.reason };
  }

  const role = getChartRoleConfig(chartId).roles.find((item) => item.key === roleKey);
  const nextRoleFields = decision.replace ? [field] : [...ensureArray(mapping[roleKey]), field];

  return {
    changed: true,
    reason: null,
    mapping: {
      ...mapping,
      [roleKey]: dedupeByName(nextRoleFields).slice(0, role.max ?? undefined),
    },
  };
}

export function removeFieldFromRole(mapping = {}, roleKey, fieldName) {
  return {
    ...mapping,
    [roleKey]: ensureArray(mapping[roleKey]).filter((field) => field.name !== fieldName),
  };
}

export function clearRole(mapping = {}, roleKey) {
  return {
    ...mapping,
    [roleKey]: [],
  };
}

export function reorderRoleFields(mapping = {}, roleKey, nextOrder = []) {
  return {
    ...mapping,
    [roleKey]: dedupeByName(nextOrder),
  };
}

function scoreFieldForRole(role, field, chartId) {
  if (!field || !typeMatches(field.type, role.acceptedTypes)) return -1;

  const semantics = classifyFieldSemantics(field);
  const runtimeType = resolveChartRuntimeType(chartId);
  let score = 10;

  if (semantics.isNumeric && ["value", "values", "y", "ys", "size", "progress", "targetValue", "open", "high", "low", "close", "min", "q1", "median", "q3", "max", "dimensions"].includes(role.key)) score += 12;
  if (semantics.isDate && ["time", "date"].includes(role.key)) score += 16;
  if (semantics.isCategory && ["category", "series", "row", "column", "hierarchy", "source", "target", "region", "label", "detail", "geoFrom", "geoTo"].includes(role.key)) score += 8;
  if (semantics.isMetric && ["value", "values", "y", "ys", "progress"].includes(role.key)) score += 8;
  if (semantics.isSource && ["source", "geoFrom"].includes(role.key)) score += 18;
  if (semantics.isTarget && ["target", "geoTo"].includes(role.key)) score += 18;
  if (semantics.isRegion && ["region", "geoFrom", "geoTo", "category"].includes(role.key)) score += 10;
  if (semantics.isSeries && role.key === "series") score += 12;
  if (semantics.isLabel && ["label", "detail", "category"].includes(role.key)) score += 8;
  if (semantics.isOpen && role.key === "open") score += 22;
  if (semantics.isHigh && role.key === "high") score += 22;
  if (semantics.isLow && role.key === "low") score += 22;
  if (semantics.isClose && role.key === "close") score += 22;
  if (semantics.isLow && role.key === "min") score += 18;
  if (semantics.isQ1 && role.key === "q1") score += 22;
  if (semantics.isMedian && role.key === "median") score += 22;
  if (semantics.isQ3 && role.key === "q3") score += 22;
  if (semantics.isHigh && role.key === "max") score += 18;
  if (semantics.hasTargetValueSignal && role.key === "targetValue") score += 18;

  if (["scatter", "effect-scatter", "bubble"].includes(runtimeType)) {
    if (["x", "y", "size"].includes(role.key) && semantics.isNumeric) score += 10;
    if (role.key === "series" && semantics.isCategory) score += 4;
  }

  if (["line", "multi-line", "smooth-line", "step-line", "area", "stacked-line", "stacked-area", "theme-river", "calendar", "bar-racing", "candlestick"].includes(runtimeType)) {
    if (["x", "time", "date", "category"].includes(role.key) && semantics.isDate) score += 10;
  }

  if (semantics.isTemporalBucket && ["value", "values", "y", "ys"].includes(role.key)) score -= 20;
  if (semantics.isTemporalBucket && ["x", "time", "date", "category", "series"].includes(role.key)) score += 8;

  return score;
}

function sortFieldsForRole(role, fields = [], chartId, usedNames = new Set()) {
  return [...fields]
    .filter((field) => !usedNames.has(field.name))
    .map((field) => ({ field, score: scoreFieldForRole(role, field, chartId) }))
    .filter((item) => item.score >= 0)
    .sort((left, right) => right.score - left.score || left.field.name.localeCompare(right.field.name))
    .map((item) => item.field);
}

function getFieldBuckets(fields = []) {
  const typed = fields.map((field) => ({ field, semantics: classifyFieldSemantics(field) }));
  return {
    numeric: typed.filter((item) => item.semantics.isNumeric).map((item) => item.field),
    numericMetrics: typed.filter((item) => item.semantics.isMetric).map((item) => item.field),
    dateLike: typed.filter((item) => item.semantics.isDate).map((item) => item.field),
    categoryLike: typed.filter((item) => item.semantics.isCategory || item.semantics.isTextLike).map((item) => item.field),
  };
}

function addSuggestedFields(mapping, role, fields, usedNames) {
  if (!role || !fields?.length) return;
  const merged = dedupeByName([...(mapping[role.key] ?? []), ...fields]).slice(0, role.max ?? undefined);
  mapping[role.key] = merged;
  merged.forEach((field) => usedNames.add(field.name));
}

function getSuggestedRoleOrder(chartId, roles = []) {
  const runtimeType = resolveChartRuntimeType(chartId);
  const orderMap = {
    line: ["time", "date", "x", "y", "ys", "series"],
    "multi-line": ["time", "date", "x", "y", "ys", "series"],
    "smooth-line": ["time", "date", "x", "y", "ys", "series"],
    "step-line": ["time", "date", "x", "y", "ys", "series"],
    area: ["time", "date", "x", "y", "ys", "series"],
    "stacked-line": ["time", "date", "x", "y", "ys", "series"],
    "stacked-area": ["time", "date", "x", "y", "ys", "series"],
    bar: ["category", "value", "values", "series"],
    "grouped-bar": ["category", "value", "values", "series"],
    "stacked-bar": ["category", "value", "values", "series"],
    "horizontal-bar": ["category", "value", "values", "series"],
    waterfall: ["category", "value"],
    pie: ["category", "value", "label"],
    donut: ["category", "value", "label"],
    rose: ["category", "value", "label"],
    scatter: ["x", "y", "size", "series", "label"],
    "effect-scatter": ["x", "y", "size", "series", "label"],
    bubble: ["x", "y", "size", "series", "label"],
    heatmap: ["column", "row", "value", "series"],
    matrix: ["column", "row", "value", "series", "label"],
    gauge: ["value", "targetValue", "label", "detail"],
    "progress-ring": ["progress", "targetValue", "label", "detail"],
    sankey: ["source", "target", "value", "label"],
    graph: ["source", "target", "value", "size", "series", "label"],
    tree: ["hierarchy", "value", "label"],
    treemap: ["hierarchy", "value", "label"],
    sunburst: ["hierarchy", "value", "label"],
    parallel: ["dimensions", "series"],
    calendar: ["date", "value", "series", "label"],
    "theme-river": ["time", "series", "value"],
    candlestick: ["time", "open", "high", "low", "close"],
    boxplot: ["category", "value", "min", "q1", "median", "q3", "max"],
    map: ["region", "value", "label"],
    lines: ["geoFrom", "geoTo", "value", "series"],
  };

  const orderedKeys = orderMap[runtimeType] ?? roles.map((role) => role.key);
  return orderedKeys
    .map((key) => roles.find((role) => role.key === key))
    .filter(Boolean)
    .concat(roles.filter((role) => !orderedKeys.includes(role.key)));
}

function applyChartSpecificSuggestions(chartId, roleConfig, availableFields, nextMapping, usedNames) {
  const runtimeType = resolveChartRuntimeType(chartId);
  const byKey = (key) => roleConfig.roles.find((role) => role.key === key);
  const buckets = getFieldBuckets(availableFields);

  const assignOne = (roleKey, pool) => {
    const role = byKey(roleKey);
    if (!role || (nextMapping[role.key]?.length ?? 0) > 0) return;
    const field = sortFieldsForRole(role, pool, chartId, usedNames)[0];
    addSuggestedFields(nextMapping, role, field ? [field] : [], usedNames);
  };

  const assignMany = (roleKey, pool) => {
    const role = byKey(roleKey);
    if (!role || (nextMapping[role.key]?.length ?? 0) > 0) return;
    const fields = sortFieldsForRole(role, pool, chartId, usedNames).slice(0, role.max ?? 0);
    addSuggestedFields(nextMapping, role, fields, usedNames);
  };

  if (["line", "multi-line", "smooth-line", "step-line", "area", "stacked-line", "stacked-area"].includes(runtimeType)) {
    assignOne("time", [...buckets.dateLike, ...buckets.categoryLike]);
    assignOne("date", [...buckets.dateLike, ...buckets.categoryLike]);
    assignOne("x", [...buckets.dateLike, ...buckets.categoryLike]);
    assignOne("y", buckets.numericMetrics);
    assignMany("ys", buckets.numericMetrics);
    assignOne("series", buckets.categoryLike);
  }

  if (["bar", "grouped-bar", "stacked-bar", "horizontal-bar", "waterfall", "funnel", "pie", "donut", "rose", "radar"].includes(runtimeType)) {
    assignOne("category", [...buckets.categoryLike, ...buckets.dateLike]);
    assignOne("value", buckets.numericMetrics);
    assignMany("values", buckets.numericMetrics);
    assignOne("series", buckets.categoryLike);
  }

  if (["scatter", "effect-scatter", "bubble"].includes(runtimeType)) {
    assignOne("x", buckets.numeric);
    assignOne("y", buckets.numeric);
    assignOne("size", buckets.numeric);
    assignOne("series", buckets.categoryLike);
  }

  if (["heatmap", "matrix"].includes(runtimeType)) {
    assignOne("column", buckets.categoryLike);
    assignOne("row", buckets.categoryLike);
    assignOne("value", buckets.numeric);
    assignOne("series", buckets.categoryLike);
  }

  if (["tree", "treemap", "sunburst"].includes(runtimeType)) {
    assignMany("hierarchy", buckets.categoryLike);
    assignOne("value", buckets.numeric);
  }

  if (runtimeType === "parallel") {
    assignMany("dimensions", buckets.numeric);
    assignOne("series", buckets.categoryLike);
  }

  if (runtimeType === "candlestick") {
    assignOne("time", [...buckets.dateLike, ...availableFields]);
    assignOne("open", buckets.numeric);
    assignOne("high", buckets.numeric);
    assignOne("low", buckets.numeric);
    assignOne("close", buckets.numeric);
  }

  if (["sankey", "graph", "lines"].includes(runtimeType)) {
    assignOne(runtimeType === "lines" ? "geoFrom" : "source", buckets.categoryLike);
    assignOne(runtimeType === "lines" ? "geoTo" : "target", buckets.categoryLike);
    assignOne("value", buckets.numeric);
    assignOne("size", buckets.numeric);
    assignOne("series", buckets.categoryLike);
  }

  if (runtimeType === "theme-river") {
    assignOne("time", [...buckets.dateLike, ...buckets.categoryLike]);
    assignOne("series", buckets.categoryLike);
    assignOne("value", buckets.numeric);
  }

  if (runtimeType === "calendar") {
    assignOne("date", [...buckets.dateLike, ...buckets.categoryLike]);
    assignOne("value", buckets.numeric);
    assignOne("series", buckets.categoryLike);
  }

  if (["gauge", "progress-ring", "kpi"].includes(runtimeType)) {
    assignOne("progress", buckets.numeric);
    assignOne("value", buckets.numeric);
    assignOne("targetValue", buckets.numeric);
  }

  if (runtimeType === "map") {
    assignOne("region", buckets.categoryLike);
    assignOne("value", buckets.numeric);
  }
}

export function suggestRoleMapping(chartId, availableFields = [], currentMapping = {}) {
  const roleConfig = getChartRoleConfig(chartId);
  const nextMapping = {};
  const usedNames = new Set();
  const lookup = getLookup(availableFields);

  roleConfig.roles.forEach((role) => {
    const preserved = dedupeByName(ensureArray(currentMapping[role.key]))
      .map((field) => normalizeFieldRef(field, lookup))
      .filter(Boolean)
      .filter((field) => isFieldAvailable(field, lookup))
      .filter((field) => typeMatches(field.type, role.acceptedTypes))
      .slice(0, role.max ?? undefined);

    nextMapping[role.key] = preserved;
    preserved.forEach((field) => usedNames.add(field.name));
  });

  applyChartSpecificSuggestions(chartId, roleConfig, availableFields, nextMapping, usedNames);

  getSuggestedRoleOrder(chartId, roleConfig.roles).forEach((role) => {
    const current = ensureArray(nextMapping[role.key]);
    const remaining = Math.max(0, (role.max ?? role.min ?? 1) - current.length);
    if (!remaining) return;
    const additions = sortFieldsForRole(role, availableFields, chartId, usedNames).slice(0, remaining);
    addSuggestedFields(nextMapping, role, additions, usedNames);
  });

  return nextMapping;
}

export function autoMapFieldsForChart(chartId, availableFields = [], currentMapping = {}) {
  return suggestRoleMapping(chartId, availableFields, currentMapping);
}

export function preserveCompatibleMapping(nextChartId, currentMapping = {}, availableFields = []) {
  const nextRoles = getChartRoleConfig(nextChartId).roles;
  const lookup = getLookup(availableFields);
  const usedNames = new Set();
  const nextMapping = {};

  nextRoles.forEach((role) => {
    const candidateKeys = [role.key, ...(role.preserveFrom ?? [])];
    const candidates = candidateKeys
      .flatMap((candidateKey) => ensureArray(currentMapping[candidateKey]))
      .map((field) => normalizeFieldRef(field, lookup))
      .filter(Boolean)
      .filter((field) => isFieldAvailable(field, lookup))
      .filter((field) => !usedNames.has(field.name))
      .filter((field) => typeMatches(field.type, role.acceptedTypes));

    nextMapping[role.key] = dedupeByName(candidates).slice(0, role.max ?? undefined);
    nextMapping[role.key].forEach((field) => usedNames.add(field.name));
  });

  return nextMapping;
}

export function getRoleAssignments(chartId, mapping = {}) {
  return getChartRoleConfig(chartId).roles.map((role) => ({
    ...role,
    fields: ensureArray(mapping[role.key]),
    state: getRoleValidationState(chartId, role.key, mapping[role.key] ?? []),
  }));
}

export function getCompatibleRolesForField(chartId, field, mapping = {}) {
  return getChartRoleConfig(chartId).roles
    .map((role) => ({
      ...role,
      score: scoreFieldForRole(role, field, chartId),
      decision: canAssignFieldToRole(chartId, role.key, field, mapping),
    }))
    .filter((role) => role.decision.ok)
    .sort((left, right) => right.score - left.score);
}

export function getFieldRoleHints(chartId, field, mapping = {}) {
  return getCompatibleRolesForField(chartId, field, mapping).map((role) => ({
    key: role.key,
    label: role.label,
    required: role.required,
  }));
}

export function getMissingRoleSummary(chartId, mapping = {}) {
  return getRoleAssignments(chartId, mapping)
    .filter((role) => role.required && role.state.missingCount > 0)
    .map((role) => role.label);
}

export function getMappingSummary(chartId, mapping = {}) {
  return getRoleAssignments(chartId, mapping).map((role) => ({
    key: role.key,
    label: role.label,
    fieldNames: ensureArray(role.fields).map((field) => field.name),
    required: role.required,
    status: role.state.status,
  }));
}
