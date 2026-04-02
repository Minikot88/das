import { getChartMeta } from "./chartCatalog";

const TYPE_LABELS = {
  string: "Text",
  number: "Number",
  date: "Date",
  boolean: "Boolean",
};

const DEFAULT_ROLE_META = {
  category: {
    label: "Category",
    description: "Group values into buckets or labels.",
    emptyHint: "Drop a category field here",
    preserveFrom: ["x", "time", "row", "column", "hierarchy"],
  },
  value: {
    label: "Value",
    description: "Primary numeric measure for the chart.",
    emptyHint: "Drop a numeric field here",
    preserveFrom: ["y", "size", "progress", "open", "high", "low", "close"],
  },
  series: {
    label: "Series",
    description: "Split the chart into multiple groups.",
    emptyHint: "Drop a grouping field here",
    preserveFrom: ["group", "category", "label", "detail"],
  },
  x: {
    label: "X Axis",
    description: "Controls the horizontal position.",
    emptyHint: "Drop an X field here",
    preserveFrom: ["category", "time", "x"],
  },
  y: {
    label: "Y Axis",
    description: "Controls the vertical position.",
    emptyHint: "Drop a numeric field here",
    preserveFrom: ["value", "y"],
  },
  size: {
    label: "Size",
    description: "Controls bubble or node size.",
    emptyHint: "Drop a numeric size field here",
    preserveFrom: ["value", "size", "y"],
  },
  time: {
    label: "Time",
    description: "Date or time field for sequence charts.",
    emptyHint: "Drop a date field here",
    preserveFrom: ["x", "category", "time"],
  },
  row: {
    label: "Row",
    description: "Row grouping for matrix-style visuals.",
    emptyHint: "Drop a row field here",
    preserveFrom: ["category", "series", "row"],
  },
  column: {
    label: "Column",
    description: "Column grouping for matrix-style visuals.",
    emptyHint: "Drop a column field here",
    preserveFrom: ["category", "x", "column"],
  },
  hierarchy: {
    label: "Hierarchy",
    description: "One or more levels for parent-child grouping.",
    emptyHint: "Drop hierarchy fields here",
    preserveFrom: ["hierarchy", "category", "series", "row", "column"],
  },
  source: {
    label: "Source",
    description: "Flow or link origin.",
    emptyHint: "Drop the source field here",
    preserveFrom: ["category", "source", "row"],
  },
  target: {
    label: "Target",
    description: "Flow or link destination.",
    emptyHint: "Drop the target field here",
    preserveFrom: ["series", "target", "column", "category"],
  },
  open: {
    label: "Open",
    description: "Opening value for the period.",
    emptyHint: "Drop the open field here",
    preserveFrom: ["value", "open", "y"],
  },
  high: {
    label: "High",
    description: "Highest value for the period.",
    emptyHint: "Drop the high field here",
    preserveFrom: ["value", "high", "size"],
  },
  low: {
    label: "Low",
    description: "Lowest value for the period.",
    emptyHint: "Drop the low field here",
    preserveFrom: ["value", "low", "size"],
  },
  close: {
    label: "Close",
    description: "Closing value for the period.",
    emptyHint: "Drop the close field here",
    preserveFrom: ["value", "close", "y"],
  },
  detail: {
    label: "Detail",
    description: "Extra supporting dimension.",
    emptyHint: "Drop a detail field here",
    preserveFrom: ["detail", "category", "series", "label"],
  },
  label: {
    label: "Label",
    description: "Display label for marks or nodes.",
    emptyHint: "Drop a label field here",
    preserveFrom: ["label", "category", "detail"],
  },
  progress: {
    label: "Progress",
    description: "Numeric progress measure.",
    emptyHint: "Drop a progress field here",
    preserveFrom: ["value", "progress", "y"],
  },
};

const NUMERIC_TYPES = ["number"];
const CATEGORY_TYPES = ["string", "date", "boolean"];
const TIME_TYPES = ["date"];
const ANY_TYPES = [];

const SLOT_ROLE_PRESETS = {
  x: { label: "X", acceptedTypes: CATEGORY_TYPES, description: "Primary grouping or sequence field.", slotBindings: ["x"] },
  y: { label: "Y", acceptedTypes: NUMERIC_TYPES, description: "Primary numeric field.", slotBindings: ["y"] },
  group: { label: "Group", acceptedTypes: CATEGORY_TYPES, description: "Secondary grouping field.", slotBindings: ["group"] },
  size: { label: "Size", acceptedTypes: NUMERIC_TYPES, description: "Numeric size field.", slotBindings: ["size"] },
};

const CHART_ROLE_PRESETS = {
  bar: [
    { key: "category", required: true, acceptedTypes: CATEGORY_TYPES, slotBindings: ["x"] },
    { key: "value", required: true, acceptedTypes: NUMERIC_TYPES, slotBindings: ["y"] },
    { key: "series", acceptedTypes: CATEGORY_TYPES, slotBindings: ["group"] },
  ],
  "grouped-bar": [
    { key: "category", required: true, acceptedTypes: CATEGORY_TYPES, slotBindings: ["x"] },
    { key: "value", required: true, acceptedTypes: NUMERIC_TYPES, slotBindings: ["y"] },
    { key: "series", required: true, acceptedTypes: CATEGORY_TYPES, slotBindings: ["group"] },
  ],
  "stacked-bar": [
    { key: "category", required: true, acceptedTypes: CATEGORY_TYPES, slotBindings: ["x"] },
    { key: "value", required: true, acceptedTypes: NUMERIC_TYPES, slotBindings: ["y"] },
    { key: "series", required: true, acceptedTypes: CATEGORY_TYPES, slotBindings: ["group"] },
  ],
  "horizontal-bar": [
    { key: "category", required: true, acceptedTypes: CATEGORY_TYPES, slotBindings: ["x"] },
    { key: "value", required: true, acceptedTypes: NUMERIC_TYPES, slotBindings: ["y"] },
    { key: "series", acceptedTypes: CATEGORY_TYPES, slotBindings: ["group"] },
  ],
  line: [
    { key: "time", label: "X Axis", required: true, acceptedTypes: ["date", "string", "boolean"], slotBindings: ["x"] },
    { key: "value", required: true, acceptedTypes: NUMERIC_TYPES, slotBindings: ["y"] },
    { key: "series", acceptedTypes: CATEGORY_TYPES, slotBindings: ["group"] },
  ],
  "multi-line": [
    { key: "time", label: "X Axis", required: true, acceptedTypes: ["date", "string", "boolean"], slotBindings: ["x"] },
    { key: "value", required: true, acceptedTypes: NUMERIC_TYPES, slotBindings: ["y"] },
    { key: "series", required: true, acceptedTypes: CATEGORY_TYPES, slotBindings: ["group"] },
  ],
  area: [
    { key: "time", label: "X Axis", required: true, acceptedTypes: ["date", "string", "boolean"], slotBindings: ["x"] },
    { key: "value", required: true, acceptedTypes: NUMERIC_TYPES, slotBindings: ["y"] },
    { key: "series", acceptedTypes: CATEGORY_TYPES, slotBindings: ["group"] },
  ],
  "stacked-area": [
    { key: "time", label: "X Axis", required: true, acceptedTypes: ["date", "string", "boolean"], slotBindings: ["x"] },
    { key: "value", required: true, acceptedTypes: NUMERIC_TYPES, slotBindings: ["y"] },
    { key: "series", required: true, acceptedTypes: CATEGORY_TYPES, slotBindings: ["group"] },
  ],
  "step-line": [
    { key: "time", label: "X Axis", required: true, acceptedTypes: ["date", "string", "boolean"], slotBindings: ["x"] },
    { key: "value", required: true, acceptedTypes: NUMERIC_TYPES, slotBindings: ["y"] },
    { key: "series", acceptedTypes: CATEGORY_TYPES, slotBindings: ["group"] },
  ],
  scatter: [
    { key: "x", required: true, acceptedTypes: NUMERIC_TYPES, slotBindings: ["x"] },
    { key: "y", required: true, acceptedTypes: NUMERIC_TYPES, slotBindings: ["y"] },
    { key: "series", acceptedTypes: CATEGORY_TYPES, slotBindings: ["group"] },
  ],
  bubble: [
    { key: "x", required: true, acceptedTypes: NUMERIC_TYPES, slotBindings: ["x"] },
    { key: "y", required: true, acceptedTypes: NUMERIC_TYPES, slotBindings: ["y"] },
    { key: "size", required: true, acceptedTypes: NUMERIC_TYPES, slotBindings: ["size"] },
    { key: "series", acceptedTypes: CATEGORY_TYPES, slotBindings: ["group"] },
  ],
  pie: [
    { key: "category", required: true, acceptedTypes: CATEGORY_TYPES, slotBindings: ["x"] },
    { key: "value", required: true, acceptedTypes: NUMERIC_TYPES, slotBindings: ["y"] },
  ],
  donut: [
    { key: "category", required: true, acceptedTypes: CATEGORY_TYPES, slotBindings: ["x"] },
    { key: "value", required: true, acceptedTypes: NUMERIC_TYPES, slotBindings: ["y"] },
  ],
  rose: [
    { key: "category", required: true, acceptedTypes: CATEGORY_TYPES, slotBindings: ["x"] },
    { key: "value", required: true, acceptedTypes: NUMERIC_TYPES, slotBindings: ["y"] },
  ],
  funnel: [
    { key: "category", required: true, acceptedTypes: CATEGORY_TYPES, slotBindings: ["x"] },
    { key: "value", required: true, acceptedTypes: NUMERIC_TYPES, slotBindings: ["y"] },
  ],
  heatmap: [
    { key: "row", required: true, acceptedTypes: CATEGORY_TYPES, slotBindings: ["group"] },
    { key: "column", required: true, acceptedTypes: CATEGORY_TYPES, slotBindings: ["x"] },
    { key: "value", required: true, acceptedTypes: NUMERIC_TYPES, slotBindings: ["y"] },
  ],
  treemap: [
    { key: "hierarchy", required: true, min: 1, max: 2, acceptedTypes: ["string", "date"], slotBindings: ["x", "group"], helper: "Add one or two hierarchy levels." },
    { key: "value", required: true, acceptedTypes: NUMERIC_TYPES, slotBindings: ["y"] },
  ],
  sunburst: [
    { key: "hierarchy", required: true, min: 1, max: 2, acceptedTypes: ["string", "date"], slotBindings: ["x", "group"], helper: "Add one or two hierarchy levels." },
    { key: "value", required: true, acceptedTypes: NUMERIC_TYPES, slotBindings: ["y"] },
  ],
  sankey: [
    { key: "source", required: true, acceptedTypes: CATEGORY_TYPES, slotBindings: ["x"] },
    { key: "target", required: true, acceptedTypes: CATEGORY_TYPES, slotBindings: ["group"] },
    { key: "value", required: true, acceptedTypes: NUMERIC_TYPES, slotBindings: ["y"] },
  ],
  candlestick: [
    { key: "time", required: true, acceptedTypes: TIME_TYPES, slotBindings: ["x"] },
    { key: "open", required: true, acceptedTypes: NUMERIC_TYPES, slotBindings: ["y"] },
    { key: "high", required: true, acceptedTypes: NUMERIC_TYPES, slotBindings: [] },
    { key: "low", required: true, acceptedTypes: NUMERIC_TYPES, slotBindings: [] },
    { key: "close", required: true, acceptedTypes: NUMERIC_TYPES, slotBindings: [] },
  ],
  radar: [
    { key: "category", label: "Indicator", required: true, acceptedTypes: CATEGORY_TYPES, slotBindings: ["x"] },
    { key: "value", required: true, acceptedTypes: NUMERIC_TYPES, slotBindings: ["y"] },
    { key: "series", acceptedTypes: CATEGORY_TYPES, slotBindings: ["group"] },
  ],
  histogram: [{ key: "value", label: "Value Field", required: true, acceptedTypes: NUMERIC_TYPES, slotBindings: ["x"] }],
  kpi: [{ key: "value", required: true, acceptedTypes: NUMERIC_TYPES, slotBindings: ["y"] }],
  gauge: [{ key: "value", required: true, acceptedTypes: NUMERIC_TYPES, slotBindings: ["y"] }],
  "progress-ring": [{ key: "progress", required: true, acceptedTypes: NUMERIC_TYPES, slotBindings: ["y"] }],
  "pivot-table": [
    { key: "row", required: true, acceptedTypes: CATEGORY_TYPES, slotBindings: ["x"] },
    { key: "column", required: true, acceptedTypes: CATEGORY_TYPES, slotBindings: ["group"] },
    { key: "value", required: true, acceptedTypes: NUMERIC_TYPES, slotBindings: ["y"] },
  ],
  table: [
    { key: "category", acceptedTypes: CATEGORY_TYPES, slotBindings: ["x"] },
    { key: "detail", acceptedTypes: ANY_TYPES, slotBindings: ["group"] },
    { key: "value", acceptedTypes: NUMERIC_TYPES, slotBindings: ["y"] },
  ],
  graph: [
    { key: "source", required: true, acceptedTypes: CATEGORY_TYPES, slotBindings: ["x"] },
    { key: "target", required: true, acceptedTypes: CATEGORY_TYPES, slotBindings: ["group"] },
    { key: "value", acceptedTypes: NUMERIC_TYPES, slotBindings: ["y"] },
  ],
  waterfall: [
    { key: "category", required: true, acceptedTypes: CATEGORY_TYPES, slotBindings: ["x"] },
    { key: "value", required: true, acceptedTypes: NUMERIC_TYPES, slotBindings: ["y"] },
  ],
};

function createFieldMap(tableFields = []) {
  return new Map((tableFields ?? []).map((field) => [field.name, field.type]));
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function dedupeById(items = []) {
  const seen = new Set();
  return items.filter((item) => {
    const key = item?.id ?? item?.name;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function getAcceptedTypeLabel(acceptedTypes = []) {
  if (!acceptedTypes?.length) return "Any";
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

  return {
    id: field.id ?? `${field.db ?? "db"}.${field.tbl ?? "table"}.${field.name}`,
    name: field.name,
    type: field.type ?? lookup.get(field.name)?.type ?? null,
    db: field.db ?? lookup.get(field.name)?.db ?? null,
    tbl: field.tbl ?? lookup.get(field.name)?.tbl ?? null,
  };
}

function getLookup(fields = []) {
  return new Map(
    fields
      .filter(Boolean)
      .map((field) => [field.name, { ...field }])
  );
}

function typeMatches(fieldType, acceptedTypes = []) {
  if (!acceptedTypes?.length) return true;
  if (!fieldType) return true;
  return acceptedTypes.includes(fieldType);
}

function formatCapacity(min = 0, max = 1) {
  if (max == null) return min > 1 ? `${min}-n fields` : "Multiple fields";
  if (min === 1 && max === 1) return "1 field";
  if (min === 0 && max === 1) return "Up to 1 field";
  if (min === max) return `${max} fields`;
  return `${min}-${max} fields`;
}

function getFallbackRoleConfig(meta) {
  return (meta.slots ?? []).map((slotConfig) => {
    const preset = SLOT_ROLE_PRESETS[slotConfig.key] ?? {};
    return {
      key: slotConfig.key,
      label: slotConfig.label ?? preset.label ?? slotConfig.key,
      description: slotConfig.description ?? preset.description ?? "",
      helper: slotConfig.helper ?? "",
      emptyHint: slotConfig.helper ?? "Drop a field here",
      acceptedTypes: slotConfig.acceptedTypes ?? preset.acceptedTypes ?? [],
      acceptedTypeLabel: getAcceptedTypeLabel(slotConfig.acceptedTypes ?? preset.acceptedTypes ?? []),
      required: Boolean(slotConfig.required),
      min: slotConfig.required ? 1 : 0,
      max: 1,
      capacityLabel: formatCapacity(slotConfig.required ? 1 : 0, 1),
      slotBindings: [slotConfig.key],
      preserveFrom: [slotConfig.key],
    };
  });
}

export function getChartRoleConfig(chartId) {
  const meta = getChartMeta(chartId);
  const preset = CHART_ROLE_PRESETS[chartId];
  const roles = (preset ?? getFallbackRoleConfig(meta)).map((role) => {
    const base = DEFAULT_ROLE_META[role.key] ?? {};
    const min = role.min ?? (role.required ? 1 : 0);
    const max = role.max ?? 1;
    const acceptedTypes = role.acceptedTypes ?? [];

    return {
      key: role.key,
      label: role.label ?? base.label ?? role.key,
      description: role.description ?? base.description ?? "",
      helper: role.helper ?? base.helper ?? "",
      emptyHint: role.emptyHint ?? base.emptyHint ?? "Drop a field here",
      required: Boolean(role.required),
      min,
      max,
      acceptedTypes,
      acceptedTypeLabel: getAcceptedTypeLabel(acceptedTypes),
      capacityLabel: formatCapacity(min, max),
      slotBindings: role.slotBindings ?? [],
      preserveFrom: role.preserveFrom ?? base.preserveFrom ?? [role.key],
    };
  });

  return {
    chartId,
    chartMeta: meta,
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
  const availableFields = tableFields.map((field) => buildFieldRef({ db: selectedDb, tbl: selectedTable, field })).filter(Boolean);
  const lookup = getLookup(availableFields);
  const nextMapping = {};

  Object.entries(builderState.roleMapping ?? {}).forEach(([roleKey, items]) => {
    nextMapping[roleKey] = dedupeById(ensureArray(items).map((item) => normalizeFieldRef(item, lookup)).filter(Boolean));
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
    const fromSlots = role.slotBindings
      .map((slotKey) => {
        const fieldName = slotValues[slotKey];
        if (!fieldName) return null;
        return normalizeFieldRef(
          {
            name: fieldName,
            type: slotTypes[slotKey] ?? lookup.get(fieldName)?.type ?? null,
            db: selectedDb,
            tbl: selectedTable,
          },
          lookup
        );
      })
      .filter(Boolean);

    nextMapping[role.key] = dedupeById([...existing, ...fromSlots]).slice(0, role.max ?? undefined);
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
    const fields = dedupeById(ensureArray(mapping[role.key])).slice(0, role.max ?? undefined);
    nextState.roleMapping[role.key] = fields;

    fields.forEach((field, index) => {
      const slotKey = role.slotBindings[index];
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

export function getRoleValidationState(chartId, roleKey, mappedFields = []) {
  const role = getChartRoleConfig(chartId).roles.find((item) => item.key === roleKey);
  if (!role) {
    return { status: "invalid", message: "Unknown role", missingCount: 0, invalidFields: [], overflow: false };
  }

  const fields = ensureArray(mappedFields);
  const invalidFields = fields.filter((field) => !typeMatches(field?.type, role.acceptedTypes));
  const overflow = role.max != null && fields.length > role.max;
  const missingCount = Math.max(0, role.min - fields.length);

  let status = "valid";
  if (!fields.length) {
    status = role.required ? "empty" : "empty-optional";
  }
  if (missingCount > 0 && fields.length > 0) {
    status = "partial";
  }
  if (missingCount > 0 && !fields.length) {
    status = "empty";
  }
  if (invalidFields.length || overflow) {
    status = "invalid";
  }

  let message = role.emptyHint;
  if (invalidFields.length) {
    message = `${role.label} requires ${role.acceptedTypeLabel.toLowerCase()} fields`;
  } else if (overflow) {
    message = `${role.label} accepts ${role.capacityLabel.toLowerCase()}`;
  } else if (missingCount > 0) {
    message = `Add ${role.label.toLowerCase()}${missingCount > 1 ? ` (${missingCount} more)` : ""}`;
  } else if (fields.length) {
    message = `${fields.length} mapped`;
  }

  return { status, message, missingCount, invalidFields, overflow };
}

export function validateRoleMapping(chartId, mapping = {}, options = {}) {
  const { selectedTable = null, previewSupported = true } = options;
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
    const state = getRoleValidationState(chartId, role.key, mapping[role.key] ?? []);
    roleStates[role.key] = state;

    if (state.missingCount > 0 && role.required) {
      blockers.push({
        level: "error",
        code: `missing-${role.key}`,
        title: `${role.label} is required`,
        message: `${role.label} needs ${role.acceptedTypeLabel.toLowerCase()} input before ${roleConfig.chartMeta.name} can render.`,
        action: role.emptyHint,
      });
    }

    if (state.invalidFields.length) {
      blockers.push({
        level: "error",
        code: `invalid-${role.key}-type`,
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

  if (["treemap", "sunburst"].includes(chartId) && (mapping.hierarchy?.length ?? 0) === 1) {
    cautions.push({
      level: "warning",
      code: "single-level-hierarchy",
      title: `${roleConfig.chartMeta.name} works better with two levels`,
      message: "You can preview with one hierarchy field, but adding a second level creates a richer hierarchy.",
      action: "Add another hierarchy field if your data supports it.",
    });
  }

  if (["line", "multi-line", "area", "stacked-area", "step-line"].includes(chartId)) {
    const timeField = mapping.time?.[0];
    if (timeField && timeField.type && timeField.type !== "date") {
      cautions.push({
        level: "warning",
        code: "trend-non-date",
        title: "Trend charts work best with dates",
        message: "The chart can still render, but a date field usually produces a clearer trend.",
        action: "Use a date field on X Axis if one is available.",
      });
    }
  }

  if (previewSupported === false) {
    cautions.push({
      level: "warning",
      code: "preview-unavailable",
      title: "Preview not available",
      message: roleConfig.chartMeta.disabledReason || "This chart type is listed but not yet wired into preview.",
      action: "You can still inspect the required role mapping before switching to a supported chart.",
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
  const nextRoleFields = decision.replace
    ? [field]
    : [...ensureArray(mapping[roleKey]), field];

  return {
    changed: true,
    reason: null,
    mapping: {
      ...mapping,
      [roleKey]: dedupeById(nextRoleFields).slice(0, role.max ?? undefined),
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
    [roleKey]: dedupeById(nextOrder),
  };
}

function scoreFieldForRole(role, field) {
  if (!field) return -1;
  if (!typeMatches(field.type, role.acceptedTypes)) return -1;

  let score = 10;

  if (role.key === "time" && field.type === "date") score += 10;
  if (["value", "y", "size", "progress", "open", "high", "low", "close"].includes(role.key) && field.type === "number") score += 8;
  if (["category", "series", "row", "column", "source", "target", "hierarchy", "label", "detail"].includes(role.key) && field.type === "string") score += 6;
  if (role.key === "category" && field.type === "date") score += 4;

  const name = field.name.toLowerCase();
  if (role.key === "time" && /date|time|month|day|year/.test(name)) score += 8;
  if (role.key === "value" && /sales|revenue|profit|amount|count|value|total|metric/.test(name)) score += 6;
  if (role.key === "x" && /x|width|score|price|cost/.test(name)) score += 4;
  if (role.key === "y" && /y|value|amount|sales|profit|count|score/.test(name)) score += 4;
  if (role.key === "size" && /size|volume|weight|count|sales/.test(name)) score += 5;
  if (role.key === "series" && /group|segment|region|type|category/.test(name)) score += 5;
  if (role.key === "category" && /category|name|product|label|month|date|region/.test(name)) score += 5;
  if (role.key === "hierarchy" && /category|department|segment|region|group/.test(name)) score += 5;
  if (role.key === "source" && /source|from|origin/.test(name)) score += 8;
  if (role.key === "target" && /target|to|destination/.test(name)) score += 8;
  if (role.key === "open" && /open/.test(name)) score += 10;
  if (role.key === "high" && /high|max/.test(name)) score += 10;
  if (role.key === "low" && /low|min/.test(name)) score += 10;
  if (role.key === "close" && /close|end/.test(name)) score += 10;

  return score;
}

function pickBestField(role, fields, usedNames) {
  return [...fields]
    .filter((field) => !usedNames.has(field.name))
    .map((field) => ({ field, score: scoreFieldForRole(role, field) }))
    .filter((item) => item.score >= 0)
    .sort((a, b) => b.score - a.score)[0]?.field ?? null;
}

export function suggestRoleMapping(chartId, availableFields = [], currentMapping = {}) {
  const roleConfig = getChartRoleConfig(chartId);
  const nextMapping = {};
  const usedNames = new Set();

  roleConfig.roles.forEach((role) => {
    const preserved = dedupeById(ensureArray(currentMapping[role.key]))
      .filter((field) => typeMatches(field.type, role.acceptedTypes))
      .slice(0, role.max ?? undefined);

    nextMapping[role.key] = preserved;
    preserved.forEach((field) => usedNames.add(field.name));
  });

  roleConfig.roles.forEach((role) => {
    const current = ensureArray(nextMapping[role.key]);
    const needed = Math.max(0, role.min - current.length);
    const max = role.max ?? role.min ?? 1;
    const remaining = Math.max(needed, max - current.length);

    for (let index = 0; index < remaining; index += 1) {
      const field = pickBestField(role, availableFields, usedNames);
      if (!field) break;
      nextMapping[role.key] = [...ensureArray(nextMapping[role.key]), field].slice(0, max);
      usedNames.add(field.name);
    }
  });

  return nextMapping;
}

export function autoMapFieldsForChart(chartId, availableFields = [], currentMapping = {}) {
  return suggestRoleMapping(chartId, availableFields, currentMapping);
}

export function preserveCompatibleMapping(nextChartId, currentMapping = {}, availableFields = []) {
  const nextRoles = getChartRoleConfig(nextChartId).roles;
  const nextMapping = {};
  const lookup = getLookup(availableFields);

  nextRoles.forEach((role) => {
    const candidateKeys = [role.key, ...(role.preserveFrom ?? [])];
    const candidates = candidateKeys
      .flatMap((candidateKey) => ensureArray(currentMapping[candidateKey]))
      .map((field) => normalizeFieldRef(field, lookup))
      .filter(Boolean)
      .filter((field) => typeMatches(field.type, role.acceptedTypes));

    nextMapping[role.key] = dedupeById(candidates).slice(0, role.max ?? undefined);
  });

  return nextMapping;
}

export function getRoleAssignments(chartId, mapping = {}) {
  const roleConfig = getChartRoleConfig(chartId);
  return roleConfig.roles.map((role) => ({
    ...role,
    fields: ensureArray(mapping[role.key]),
    state: getRoleValidationState(chartId, role.key, mapping[role.key] ?? []),
  }));
}

export function getCompatibleRolesForField(chartId, field, mapping = {}) {
  return getChartRoleConfig(chartId).roles
    .map((role) => ({
      ...role,
      decision: canAssignFieldToRole(chartId, role.key, field, mapping),
    }))
    .filter((role) => role.decision.ok);
}

export function getFieldRoleHints(chartId, field, mapping = {}) {
  const compatible = getCompatibleRolesForField(chartId, field, mapping);
  return compatible.map((role) => ({
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

export function createFieldLookupFromTable(tableFields = [], selectedDb = null, selectedTable = null) {
  return tableFields.map((field) => buildFieldRef({ db: selectedDb, tbl: selectedTable, field })).filter(Boolean);
}

export function getFieldTypeFromTable(tableFields = [], fieldName) {
  return createFieldMap(tableFields).get(fieldName) ?? null;
}
