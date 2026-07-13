export const WORKSPACE_SCHEMA_VERSION = 1;
export const CANONICAL_WORKSPACE_KEY = "mini-bi-workspace-v1";
export const MIGRATION_MARKER_KEY = "mini-bi-workspace-v1-migration-complete";

const DEFAULT_SETTINGS = Object.freeze({
  theme: "system",
  locale: "th",
  density: "comfortable",
  dateFormat: "MMM d, yyyy",
  numberFormat: "compact",
  dashboardPreferences: Object.freeze({}),
});

const ALLOWED_THEMES = new Set(["light", "dark", "system"]);
const ALLOWED_DENSITIES = new Set(["compact", "comfortable", "spacious"]);
const SECRET_PROPERTY_KEYS = new Set([
  "password", "passwd", "passphrase", "token", "accesstoken", "refreshtoken", "idtoken",
  "apikey", "accesskey", "secret", "secretkey", "privatekey", "sshpassword", "clientsecret",
  "clientkey", "sessionsecret", "authorization", "cookie", "setcookie", "connectionstring",
  "credential", "credentials", "signature", "sig", "xamzcredential", "xamzsignature",
  "xamzsecuritytoken", "authmechanismproperties",
]);
const SENSITIVE_URL_PARAMETER_KEYS = new Set([
  "password", "passwd", "passphrase", "token", "accesstoken", "refreshtoken", "idtoken",
  "apikey", "accesskey", "secret", "secretkey", "clientsecret", "sessionsecret", "authorization",
  "credential", "credentials", "signature", "sig", "xamzcredential", "xamzsignature",
  "xamzsecuritytoken", "authmechanismproperties",
]);
const SAFE_SECRET_METADATA_KEYS = new Set(["hasPassword", "secretRef", "vaultSecretId"]);
const CONNECTION_METADATA_KEYS = new Set([
  "id",
  "projectId",
  "displayName",
  "name",
  "connectorType",
  "type",
  "host",
  "port",
  "capabilities",
  "status",
  "createdAt",
  "updatedAt",
]);

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pathFor(parent, key) {
  if (typeof key === "number") return `${parent}[${key}]`;
  return parent ? `${parent}.${key}` : String(key);
}

function normalizeCredentialKey(value) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isOpaqueDatasetRowPath(path) {
  const isRowRecord = /(?:^|\.)(?:rows|sqlResultRows|previewRows)\[\d+\](?:\.|$)/.test(path);
  if (!isRowRecord) return false;
  return /(?:^|\.)(?:datasets|charts)\[\d+\]\./.test(path)
    || /(?:^|\.)snapshot\.widgets\[\d+\]\./.test(path)
    || /(?:^|\.)dashboards\[\d+\]\.widgets\[\d+\]\.(?:chartSnapshot|config)\./.test(path);
}

function urlCredentialFindings(value) {
  if (typeof value !== "string" || !/^[a-z][a-z\d+.-]*:\/\//i.test(value)) return [];
  try {
    const parsed = new URL(value);
    const findings = [];
    if (parsed.username || parsed.password) findings.push("contains URL credentials");
    parsed.searchParams.forEach((_parameterValue, key) => {
      if (SENSITIVE_URL_PARAMETER_KEYS.has(normalizeCredentialKey(key))) {
        findings.push(`contains sensitive URL parameter: ${key}`);
      }
    });
    const fragment = parsed.hash.startsWith("#") ? parsed.hash.slice(1) : parsed.hash;
    if (fragment.includes("=")) {
      new URLSearchParams(fragment).forEach((_parameterValue, key) => {
        if (SENSITIVE_URL_PARAMETER_KEYS.has(normalizeCredentialKey(key))) {
          findings.push(`contains sensitive URL fragment parameter: ${key}`);
        }
      });
    }
    return findings;
  } catch {
    return /:\/\/[^/@\s]+:[^/@\s]+@/.test(value) ? ["contains URL credentials"] : [];
  }
}

function normalizeSettings(value) {
  const settings = isObject(value) ? value : {};
  return {
    theme: ALLOWED_THEMES.has(settings.theme) ? settings.theme : DEFAULT_SETTINGS.theme,
    locale: typeof settings.locale === "string" && settings.locale.trim() ? settings.locale : DEFAULT_SETTINGS.locale,
    density: ALLOWED_DENSITIES.has(settings.density) ? settings.density : DEFAULT_SETTINGS.density,
    dateFormat: typeof settings.dateFormat === "string" && settings.dateFormat.trim()
      ? settings.dateFormat
      : DEFAULT_SETTINGS.dateFormat,
    numberFormat: typeof settings.numberFormat === "string" && settings.numberFormat.trim()
      ? settings.numberFormat
      : DEFAULT_SETTINGS.numberFormat,
    dashboardPreferences: isObject(settings.dashboardPreferences) ? cloneWorkspace(settings.dashboardPreferences) : {},
  };
}

function hasDuplicateIds(items) {
  const ids = items.map((item) => item?.id).filter((id) => typeof id === "string" && id.trim());
  return new Set(ids).size !== ids.length;
}

function hasNonEmptyString(value) {
  return typeof value === "string" && Boolean(value.trim());
}

function hasDuplicateKey(items, key) {
  const values = items.map((item) => item?.[key]).filter(hasNonEmptyString);
  return new Set(values).size !== values.length;
}

export function createEmptyWorkspace(clock = () => new Date().toISOString()) {
  const timestamp = clock();
  return {
    schemaVersion: WORKSPACE_SCHEMA_VERSION,
    revision: 0,
    active: { projectId: null, dashboardId: null },
    projects: [],
    settings: {
      ...DEFAULT_SETTINGS,
      dashboardPreferences: {},
    },
    migration: {
      status: "not-started",
      completedAt: null,
      sourceKeys: [],
      sourceFingerprints: {},
      conflicts: [],
      warnings: [],
      unresolvedReferences: [],
    },
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function cloneWorkspace(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

export function scanForSecretMaterial(value, rootPath = "") {
  const findings = [];

  function visit(current, currentPath, suppressSecretKeyScan = false) {
    const inOpaqueDatasetRow = suppressSecretKeyScan || isOpaqueDatasetRowPath(currentPath);
    if (Array.isArray(current)) {
      current.forEach((item, index) => visit(item, pathFor(currentPath, index), inOpaqueDatasetRow));
      return;
    }
    if (!isObject(current)) return;

    Object.entries(current).forEach(([key, item]) => {
      const itemPath = pathFor(currentPath, key);
      if (
        !inOpaqueDatasetRow &&
        SECRET_PROPERTY_KEYS.has(normalizeCredentialKey(key)) &&
        !SAFE_SECRET_METADATA_KEYS.has(key) &&
        item !== null &&
        item !== "" &&
        item !== false
      ) {
        findings.push(itemPath);
      }
      urlCredentialFindings(item).forEach((finding) => findings.push(`${itemPath} ${finding}`));
      visit(item, itemPath, inOpaqueDatasetRow);
    });
  }

  visit(value, rootPath);
  return findings;
}

export function validateWorkspaceDocument(value) {
  const errors = [];
  const warnings = [];

  if (!isObject(value)) {
    return { valid: false, errors: ["workspace must be an object"], warnings };
  }
  if (value.schemaVersion !== WORKSPACE_SCHEMA_VERSION) {
    errors.push(`unsupported workspace schema version: ${String(value.schemaVersion)}`);
  }
  if (!Array.isArray(value.projects)) {
    errors.push("projects must be an array");
    return { valid: false, errors, warnings };
  }

  const projectIds = new Set(value.projects.map((project) => project?.id).filter(Boolean));
  const activeProject = value.projects.find((project) => project?.id === value.active?.projectId);
  const activeDashboards = Array.isArray(activeProject?.dashboards) ? activeProject.dashboards : [];
  if (value.active?.projectId !== null && !activeProject) {
    errors.push(`active.projectId references a missing project: ${String(value.active?.projectId)}`);
  }
  if (
    value.active?.dashboardId !== null &&
    !activeDashboards.some((dashboard) => dashboard?.id === value.active.dashboardId)
  ) {
    errors.push(`active.dashboardId references a missing dashboard: ${String(value.active?.dashboardId)}`);
  }

  value.projects.forEach((project) => {
    if (!isObject(project) || !hasNonEmptyString(project.id)) {
      errors.push("every project must have an id");
      return;
    }
    ["datasets", "charts", "dashboards", "shares", "connectionProfiles", "legacySheetAliases"].forEach((collection) => {
      if (!Array.isArray(project[collection])) {
        errors.push(`project ${project.id} ${collection} must be an array`);
      }
    });
    const datasets = Array.isArray(project.datasets) ? project.datasets : [];
    const charts = Array.isArray(project.charts) ? project.charts : [];
    const dashboards = Array.isArray(project.dashboards) ? project.dashboards : [];
    const shares = Array.isArray(project.shares) ? project.shares : [];
    const connectionProfiles = Array.isArray(project.connectionProfiles) ? project.connectionProfiles : [];
    const legacySheetAliases = Array.isArray(project.legacySheetAliases) ? project.legacySheetAliases : [];
    const datasetIds = new Set(datasets.map((dataset) => dataset?.id).filter(Boolean));
    const chartIds = new Set(charts.map((chart) => chart?.id).filter(Boolean));
    const dashboardIds = new Set(dashboards.map((dashboard) => dashboard?.id).filter(Boolean));

    if (hasDuplicateIds(datasets)) errors.push(`dataset ids must be unique within project ${project.id}`);
    if (hasDuplicateIds(charts)) errors.push(`chart ids must be unique within project ${project.id}`);
    if (hasDuplicateIds(dashboards)) errors.push(`dashboard ids must be unique within project ${project.id}`);
    if (hasDuplicateIds(shares)) errors.push(`share ids must be unique within project ${project.id}`);
    if (hasDuplicateIds(connectionProfiles)) errors.push(`connection profile ids must be unique within project ${project.id}`);
    if (hasDuplicateKey(legacySheetAliases, "sheetId")) errors.push(`sheet alias ids must be unique within project ${project.id}`);

    datasets.forEach((dataset) => {
      if (!isObject(dataset) || !hasNonEmptyString(dataset.id)) {
        errors.push("every dataset must be an object with a non-empty id");
        return;
      }
      if (dataset?.projectId !== project.id) {
        errors.push(`dataset ${String(dataset?.id)} must belong to project ${project.id}`);
      }
      if (!Array.isArray(dataset?.fields)) {
        errors.push(`dataset ${String(dataset?.id)} fields must be an array`);
      } else if (dataset.fields.some((field) => !isObject(field) || !hasNonEmptyString(field.id))) {
        errors.push(`dataset ${dataset.id} fields must contain objects with non-empty ids`);
      }
      if (!Array.isArray(dataset?.rows)) {
        errors.push(`dataset ${String(dataset?.id)} rows must be an array`);
      } else if (dataset.rows.some((row) => !isObject(row))) {
        errors.push(`dataset ${dataset.id} rows must contain objects`);
      }
    });
    charts.forEach((chart) => {
      if (!isObject(chart) || !hasNonEmptyString(chart.id)) {
        errors.push("every chart must be an object with a non-empty id");
        return;
      }
      if (chart?.projectId !== project.id) {
        errors.push(`chart ${String(chart?.id)} must belong to project ${project.id}`);
      }
      if (chart?.datasetId && !datasetIds.has(chart.datasetId)) {
        warnings.push(`chart ${String(chart.id)} references a missing dataset: ${chart.datasetId}`);
      }
      if (!isObject(chart.config)) {
        errors.push(`chart ${chart.id} config must be an object`);
      }
      if (chart.dataContract !== null && typeof chart.dataContract !== "undefined") {
        const contract = chart.dataContract;
        if (
          !isObject(contract) ||
          !Array.isArray(contract.fields) ||
          !Array.isArray(contract.rows) ||
          contract.fields.some((field) => !isObject(field)) ||
          contract.rows.some((row) => !isObject(row))
        ) {
          errors.push(`chart ${chart.id} dataContract must contain object fields and rows`);
        }
      }
    });
    dashboards.forEach((dashboard) => {
      if (!isObject(dashboard) || !hasNonEmptyString(dashboard.id)) {
        errors.push("every dashboard must be an object with a non-empty id");
        return;
      }
      if (dashboard?.projectId !== project.id) {
        errors.push(`dashboard ${String(dashboard?.id)} must belong to project ${project.id}`);
      }
      if (!Array.isArray(dashboard?.widgets)) {
        errors.push(`dashboard ${String(dashboard?.id)} widgets must be an array`);
      }
      const widgets = Array.isArray(dashboard?.widgets) ? dashboard.widgets : [];
      if (hasDuplicateIds(widgets)) {
        errors.push(`widget ids must be unique within dashboard ${dashboard.id}`);
      }
      widgets.forEach((widget) => {
        if (!isObject(widget) || !hasNonEmptyString(widget.id)) {
          errors.push(`every widget in dashboard ${dashboard.id} must be an object with a non-empty id`);
          return;
        }
        if (widget?.projectId !== project.id || widget?.dashboardId !== dashboard.id) {
          errors.push(`widget ${String(widget?.id)} has invalid project or dashboard ownership`);
        }
        if (widget?.chartId && !chartIds.has(widget.chartId)) {
          warnings.push(`widget ${String(widget.id)} references a missing chart: ${widget.chartId}`);
        }
        if (!isObject(widget.layout)) {
          errors.push(`widget ${widget.id} layout must be an object`);
        }
      });
    });
    shares.forEach((share) => {
      if (!isObject(share) || !hasNonEmptyString(share.id)) {
        errors.push("every share must be an object with a non-empty id");
        return;
      }
      if (share?.projectId !== project.id) {
        errors.push(`share ${String(share?.id)} must belong to project ${project.id}`);
      }
      if (!dashboardIds.has(share?.dashboardId)) {
        warnings.push(`share ${String(share?.id)} references a missing dashboard: ${String(share?.dashboardId)}`);
      }
      if (!isObject(share.snapshot)) {
        errors.push(`share ${share.id} snapshot must be an object`);
      }
    });
    connectionProfiles.forEach((profile) => {
      if (!isObject(profile) || !hasNonEmptyString(profile.id)) {
        errors.push("every connection profile must be an object with a non-empty id");
        return;
      }
      if (profile?.projectId !== project.id) {
        errors.push(`connection profile ${String(profile?.id)} must belong to project ${project.id}`);
      }
      Object.keys(isObject(profile) ? profile : {}).forEach((key) => {
        if (!CONNECTION_METADATA_KEYS.has(key)) {
          errors.push(`connection profile ${String(profile?.id)} contains non-whitelisted field: ${key}`);
        }
      });
    });
    legacySheetAliases.forEach((alias) => {
      if (!isObject(alias) || !hasNonEmptyString(alias.sheetId)) {
        errors.push("every sheet alias must have a non-empty sheetId");
        return;
      }
      if (!Array.isArray(alias?.dashboardIds)) {
        errors.push(`sheet alias ${String(alias?.sheetId)} dashboardIds must be an array`);
      }
      const aliasDashboardIds = Array.isArray(alias?.dashboardIds) ? alias.dashboardIds : [];
      aliasDashboardIds.forEach((dashboardId) => {
        if (!dashboardIds.has(dashboardId)) {
          warnings.push(`sheet alias ${String(alias?.sheetId)} references a missing dashboard: ${dashboardId}`);
        }
      });
    });
  });

  if (projectIds.size !== value.projects.filter((project) => project?.id).length) {
    errors.push("project ids must be unique");
  }

  scanForSecretMaterial(value).forEach((finding) => {
    errors.push(`canonical workspace contains forbidden secret material: ${finding}`);
  });

  return { valid: errors.length === 0, errors, warnings };
}

export function normalizeWorkspaceDocument(value, { clock = () => new Date().toISOString() } = {}) {
  if (!isObject(value)) throw new Error("Workspace document must be an object");
  if (value.schemaVersion !== WORKSPACE_SCHEMA_VERSION) {
    throw new Error(`Unsupported workspace schema version: ${String(value.schemaVersion)}`);
  }

  const normalized = cloneWorkspace(value);
  const timestamp = clock();
  normalized.revision = Number.isInteger(normalized.revision) && normalized.revision >= 0 ? normalized.revision : 0;
  normalized.active = isObject(normalized.active)
    ? {
        projectId: typeof normalized.active.projectId === "string" ? normalized.active.projectId : null,
        dashboardId: typeof normalized.active.dashboardId === "string" ? normalized.active.dashboardId : null,
      }
    : { projectId: null, dashboardId: null };
  normalized.projects = Array.isArray(normalized.projects) ? normalized.projects : [];
  normalized.settings = normalizeSettings(normalized.settings);
  normalized.migration = {
    ...createEmptyWorkspace(() => timestamp).migration,
    ...(isObject(normalized.migration) ? normalized.migration : {}),
  };
  normalized.createdAt = typeof normalized.createdAt === "string" ? normalized.createdAt : timestamp;
  normalized.updatedAt = typeof normalized.updatedAt === "string" ? normalized.updatedAt : timestamp;
  return normalized;
}
