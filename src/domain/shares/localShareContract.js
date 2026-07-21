import { scanForSecretMaterial } from "@domain/workspace/workspaceSchema";

const SECRET_KEY_PATTERN = /(password|passwd|secret|token|private.?key|client.?key|ssh.?password|credential|authorization|cookie)/i;
const CREDENTIAL_URL_PATTERN = /:\/\/[^/\s:@]+:[^@\s/]+@|[?&](?:password|passwd|secret|token|api_?key|access_?key|client_?secret)=/i;
const SECRET_SNAPSHOT_KEYS = new Set([
  "password", "passwd", "passphrase", "token", "accesstoken", "refreshtoken", "idtoken",
  "apikey", "accesskey", "privatekey", "sshpassword", "secret", "secretkey", "clientsecret",
  "clientkey", "sessionsecret", "sessiontoken", "authorization", "cookie", "setcookie",
  "connectionstring", "credential", "credentials", "signature", "sig", "oauthtoken",
  "xamzcredential", "xamzsignature", "xamzsecuritytoken", "xgoogcredential", "xgoogsignature",
  "authmechanismproperties", "cacertificate", "clientcertificate",
]);

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isSecretSnapshotKey(value) {
  return SECRET_SNAPSHOT_KEYS.has(String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, ""));
}

function isOpaqueDatasetRowPath(path) {
  const rowIndex = path.findIndex((segment, index) =>
    ["rows", "sqlResultRows", "previewRows"].includes(segment) && typeof path[index + 1] === "number"
  );
  return rowIndex >= 0 && path.slice(0, rowIndex).includes("widgets");
}

function sanitizeOpaqueDatasetString(value) {
  if (typeof value !== "string" || !/^[a-z][a-z\d+.-]*:\/\//i.test(value)) return value;
  try {
    const url = new URL(value);
    let changed = false;
    if (url.username || url.password) {
      url.username = "";
      url.password = "";
      changed = true;
    }
    Array.from(url.searchParams.keys()).forEach((key) => {
      if (isSecretSnapshotKey(key)) {
        url.searchParams.delete(key);
        changed = true;
      }
    });
    const fragment = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
    if (fragment.includes("=")) {
      const params = new URLSearchParams(fragment);
      Array.from(params.keys()).forEach((key) => {
        if (isSecretSnapshotKey(key)) {
          params.delete(key);
          changed = true;
        }
      });
      url.hash = params.toString();
    }
    return changed ? url.toString() : value;
  } catch {
    return CREDENTIAL_URL_PATTERN.test(value) ? "" : value;
  }
}

function sanitizeOpaqueDatasetValue(value) {
  if (Array.isArray(value)) return value.map(sanitizeOpaqueDatasetValue);
  if (isObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, sanitizeOpaqueDatasetValue(item)])
    );
  }
  return sanitizeOpaqueDatasetString(value);
}

function sanitizeSnapshotValue(value, path = []) {
  if (isOpaqueDatasetRowPath(path)) return sanitizeOpaqueDatasetValue(value);
  if (Array.isArray(value)) {
    return value
      .map((item, index) => sanitizeSnapshotValue(item, [...path, index]))
      .filter((item) => item !== undefined);
  }
  if (!isObject(value)) {
    if (typeof value === "string" && sanitizeOpaqueDatasetString(value) !== value) return undefined;
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !SECRET_KEY_PATTERN.test(key) && !isSecretSnapshotKey(key))
      .map(([key, item]) => [key, sanitizeSnapshotValue(item, [...path, key])])
      .filter(([, item]) => item !== undefined)
  );
}

export function sanitizeLocalShareSnapshot(snapshot, dashboardId) {
  return sanitizeSnapshotValue({
    ...(isObject(snapshot) ? snapshot : {}),
    dashboardId,
    editable: false,
    locality: "same-browser-only",
  });
}

export function normalizeLocalShareRecord(share) {
  if (!isObject(share)) return null;
  return {
    ...share,
    legacySheetId: share.legacySheetId ?? share.sheetId ?? null,
    mode: ["local-readonly", "dashboard-readonly", "readonly"].includes(share.mode) ? "local-readonly" : share.mode,
    snapshot: sanitizeLocalShareSnapshot(share.snapshot, share.dashboardId),
  };
}

export function createLocalReadonlyShare({
  id,
  project,
  dashboard,
  snapshot,
  legacySheetId = null,
  createdAt = new Date().toISOString(),
  expiresAt = null,
} = {}) {
  if (!project?.id) throw new Error("project is required");
  if (!dashboard?.id) throw new Error("dashboard is required");
  if (dashboard.projectId && dashboard.projectId !== project.id) throw new Error("dashboard ownership is invalid");

  const sourceSnapshot = snapshot ?? {
    projectName: project.name,
    dashboardName: dashboard.name ?? dashboard.dashboardName,
    dashboardId: dashboard.id,
    layout: dashboard.layout ?? [],
    widgets: dashboard.widgets ?? [],
    canvasSettings: dashboard.canvasSettings,
    theme: dashboard.theme,
  };
  const safeSnapshot = sanitizeLocalShareSnapshot(sourceSnapshot, dashboard.id);

  return {
    id: String(id || `share-${dashboard.id}-${Date.parse(createdAt) || 0}`),
    projectId: String(project.id),
    dashboardId: String(dashboard.id),
    legacySheetId: typeof legacySheetId === "string" ? legacySheetId : null,
    mode: "local-readonly",
    snapshot: safeSnapshot,
    createdAt: String(createdAt),
    updatedAt: String(createdAt),
    expiresAt: expiresAt ? String(expiresAt) : null,
  };
}

export function validateLocalShare(share, context = {}) {
  const errors = [];
  if (!isObject(share)) return { valid: false, errors: ["share must be an object"] };
  if (!share.id) errors.push("share id is required");
  if (!share.projectId) errors.push("projectId is required");
  if (!share.dashboardId) errors.push("dashboardId is required");
  if (share.mode !== "local-readonly") errors.push("share mode must be local-readonly");
  if (share.availability === "unavailable") errors.push("share is unavailable");
  if (!isObject(share.snapshot)) errors.push("readonly snapshot is required");
  if (share.snapshot?.editable !== false) errors.push("snapshot must be readonly");
  if (share.snapshot?.dashboardId !== share.dashboardId) errors.push("snapshot dashboard ownership is invalid");
  if (context.project?.id && context.project.id !== share.projectId) errors.push("project ownership is invalid");
  if (context.dashboard?.id && context.dashboard.id !== share.dashboardId) errors.push("dashboard ownership is invalid");
  if (context.dashboard?.projectId && context.dashboard.projectId !== share.projectId) errors.push("dashboard project ownership is invalid");
  if (share.expiresAt && Number.isNaN(Date.parse(share.expiresAt))) errors.push("expiresAt is invalid");
  if (scanForSecretMaterial(share).length) errors.push("share contains secret material");
  return { valid: errors.length === 0, errors };
}

export function resolveLocalShare(workspace, shareId, { now = new Date().toISOString() } = {}) {
  if (!shareId) return { status: "missing", share: null, project: null, dashboard: null };
  const matches = (workspace?.projects ?? []).flatMap((project) =>
    (project.shares ?? [])
      .filter((share) => share.id === shareId)
      .map((share) => ({ project, share })),
  );
  if (matches.length > 1) {
    return {
      status: "invalid",
      share: null,
      project: null,
      dashboard: null,
      errors: ["share id is ambiguous across projects"],
    };
  }
  if (!matches.length) return { status: "missing", share: null, project: null, dashboard: null };
  const { project, share } = matches[0];
  const dashboard = (project.dashboards ?? []).find((item) => item.id === share.dashboardId) ?? null;
  const validation = validateLocalShare(share, { project, dashboard });
  if (!dashboard || !validation.valid) {
    return { status: "invalid", share, project, dashboard, errors: validation.errors };
  }
  if (share.expiresAt && Date.parse(share.expiresAt) <= Date.parse(now)) {
    return { status: "expired", share, project, dashboard };
  }
  return { status: "ready", share, project, dashboard };
}

export function createLocalShareUrl({ origin, dashboardId, shareId, mode = "view", theme = "auto", showHeader = true } = {}) {
  if (!dashboardId) throw new Error("dashboardId is required");
  if (!shareId) throw new Error("shareId is required for a local readonly URL");
  const routeMode = mode === "embed" ? "embed" : "view";
  const url = new URL(`/dashboard/${encodeURIComponent(dashboardId)}/${routeMode}`, origin);
  url.searchParams.set("share", shareId);
  if (theme === "light" || theme === "dark") url.searchParams.set("theme", theme);
  if (!showHeader) url.searchParams.set("header", "0");
  return url.toString();
}
