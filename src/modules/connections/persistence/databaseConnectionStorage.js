export const DB_CONNECTIONS_STORAGE_KEY = "mini-bi-db-connections";

const SENSITIVE_KEYS = new Set([
  "password", "passwd", "passphrase", "token", "accesstoken", "refreshtoken", "idtoken",
  "secret", "secretkey", "apikey", "accesskey", "privatekey", "clientkey", "clientsecret",
  "cacertificate", "clientcertificate", "credential", "credentials", "authorization", "cookie",
  "signature", "sig", "xamzcredential", "xamzsignature", "xamzsecuritytoken",
  "authmechanismproperties",
]);
const SAFE_URL_PARAMETER_KEYS = new Set([
  "applicationname", "connecttimeout", "databasename", "encrypt", "fetchsize", "gid",
  "instance", "instancename", "keepalive", "readonly", "range", "readtimeout", "schema",
  "sockettimeout", "ssl", "sslmode", "timezone", "trustservercertificate", "usecompression", "usp",
]);
const SAFE_ADVANCED_KEYS = [
  "connectionTimeout", "readTimeout", "fetchSize", "schema", "defaultRole",
  "applicationName", "timezone", "keepAlive", "autoReconnect", "readOnly", "useCompression",
];

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function compactObject(value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
}

function normalizeCredentialKey(value) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isSensitiveKey(value) {
  return SENSITIVE_KEYS.has(normalizeCredentialKey(value));
}

function isSafeUrlParameter(value) {
  return SAFE_URL_PARAMETER_KEYS.has(normalizeCredentialKey(value));
}

function sanitizeSemicolonParameters(value) {
  return value.replace(/;([^=;/?#]+)=([^;/?#]*)/g, (match, key) => isSafeUrlParameter(key) ? match : "");
}

function sanitizeOpaqueConnectionUrl(value) {
  let sanitized = value.replace(/(\w+:\/\/)[^/\s:@]+:[^@\s/]+@/g, "$1");
  const hashIndex = sanitized.indexOf("#");
  if (hashIndex >= 0) sanitized = sanitized.slice(0, hashIndex);
  const queryIndex = sanitized.indexOf("?");
  if (queryIndex >= 0) {
    const params = new URLSearchParams(sanitized.slice(queryIndex + 1));
    Array.from(params.keys()).forEach((key) => {
      if (!isSafeUrlParameter(key)) params.delete(key);
    });
    const query = params.toString();
    sanitized = `${sanitized.slice(0, queryIndex)}${query ? `?${query}` : ""}`;
  }
  return sanitizeSemicolonParameters(sanitized).replace(/[?&;]$/, "");
}

function safeParseConnections(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(Boolean).map(sanitizeConnectionMetadata) : [];
  } catch {
    return [];
  }
}

export function sanitizeConnectionUrl(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const jdbcPrefix = /^jdbc:/i.test(raw) ? "jdbc:" : "";
  const candidate = jdbcPrefix ? raw.replace(/^jdbc:/i, "") : raw;

  try {
    const url = new URL(candidate);
    url.username = "";
    url.password = "";
    Array.from(url.searchParams.keys()).forEach((key) => {
      if (!isSafeUrlParameter(key)) url.searchParams.delete(key);
    });
    url.hash = "";
    return sanitizeSemicolonParameters(`${jdbcPrefix}${url.toString()}`);
  } catch {
    return sanitizeOpaqueConnectionUrl(jdbcPrefix ? `${jdbcPrefix}${candidate}` : raw);
  }
}

function sanitizeSsl(ssl) {
  if (!isObject(ssl)) return { enabled: false, mode: "disable" };
  return {
    enabled: Boolean(ssl.enabled),
    mode: String(ssl.mode || "disable"),
  };
}

function sanitizeSsh(ssh) {
  if (!isObject(ssh)) return { enabled: false };
  return compactObject({
    enabled: Boolean(ssh.enabled),
    host: typeof ssh.host === "string" ? ssh.host : undefined,
    port: typeof ssh.port === "string" || typeof ssh.port === "number" ? String(ssh.port) : undefined,
    user: typeof ssh.user === "string" ? ssh.user : undefined,
    authMethod: typeof ssh.authMethod === "string" ? ssh.authMethod : undefined,
    localPort: typeof ssh.localPort === "string" ? ssh.localPort : undefined,
    remoteHost: typeof ssh.remoteHost === "string" ? ssh.remoteHost : undefined,
    remotePort: typeof ssh.remotePort === "string" ? ssh.remotePort : undefined,
  });
}

function sanitizeAdvanced(advanced) {
  if (!isObject(advanced)) return {};
  return Object.fromEntries(SAFE_ADVANCED_KEYS.filter((key) => advanced[key] !== undefined).map((key) => [key, advanced[key]]));
}

export function sanitizeConnectionMetadata(profile) {
  if (!isObject(profile)) return null;
  return compactObject({
    id: typeof profile.id === "string" ? profile.id : undefined,
    projectId: typeof profile.projectId === "string" ? profile.projectId : undefined,
    name: typeof profile.name === "string" ? profile.name : undefined,
    type: typeof profile.type === "string" ? profile.type : undefined,
    typeName: typeof profile.typeName === "string" ? profile.typeName : undefined,
    mode: typeof profile.mode === "string" ? profile.mode : undefined,
    host: typeof profile.host === "string" ? profile.host : undefined,
    port: typeof profile.port === "string" || typeof profile.port === "number" ? String(profile.port) : undefined,
    database: typeof profile.database === "string" ? profile.database : undefined,
    filePath: typeof profile.filePath === "string" ? profile.filePath : undefined,
    sheetUrl: typeof profile.sheetUrl === "string" ? sanitizeConnectionUrl(profile.sheetUrl) : undefined,
    url: typeof profile.url === "string" ? sanitizeConnectionUrl(profile.url) : undefined,
    authType: typeof profile.authType === "string" ? profile.authType : undefined,
    username: typeof profile.username === "string" ? profile.username : undefined,
    passwordSaved: false,
    credentialState: "not-persisted",
    secretRef: null,
    ssl: sanitizeSsl(profile.ssl),
    ssh: sanitizeSsh(profile.ssh),
    advanced: sanitizeAdvanced(profile.advanced),
    workspace: typeof profile.workspace === "string" ? profile.workspace : undefined,
    tags: typeof profile.tags === "string" ? profile.tags : undefined,
    status: typeof profile.status === "string" ? profile.status : "demo",
    createdAt: typeof profile.createdAt === "string" ? profile.createdAt : undefined,
    updatedAt: typeof profile.updatedAt === "string" ? profile.updatedAt : undefined,
    lastTestedAt: typeof profile.lastTestedAt === "string" ? profile.lastTestedAt : null,
  });
}

export function containsCredentialMaterial(value) {
  let found = false;
  function visit(current) {
    if (found) return;
    if (Array.isArray(current)) {
      current.forEach(visit);
      return;
    }
    if (!isObject(current)) {
      if (typeof current === "string" && sanitizeConnectionUrl(current) !== current) found = true;
      return;
    }
    Object.entries(current).forEach(([key, item]) => {
      if (isSensitiveKey(key) && item !== null && item !== "" && item !== false) found = true;
      visit(item);
    });
  }
  visit(value);
  return found;
}

export function loadDatabaseConnections() {
  if (typeof window === "undefined") return [];
  try {
    return safeParseConnections(window.localStorage.getItem(DB_CONNECTIONS_STORAGE_KEY));
  } catch {
    return [];
  }
}

export function saveDatabaseConnections(connections) {
  if (typeof window === "undefined") return [];
  const safeConnections = Array.isArray(connections)
    ? connections.map(sanitizeConnectionMetadata).filter(Boolean)
    : [];
  try {
    window.localStorage.setItem(DB_CONNECTIONS_STORAGE_KEY, JSON.stringify(safeConnections));
    return safeConnections;
  } catch {
    return null;
  }
}

export function upsertDatabaseConnection(profile) {
  const connections = loadDatabaseConnections();
  const safeProfile = sanitizeConnectionMetadata({ ...profile, updatedAt: new Date().toISOString() });
  const index = connections.findIndex((item) => item.id === safeProfile.id);
  const nextConnections = index >= 0
    ? connections.map((item) => (item.id === safeProfile.id ? safeProfile : item))
    : [safeProfile, ...connections];
  return saveDatabaseConnections(nextConnections);
}

export function deleteDatabaseConnection(profileId) {
  const nextConnections = loadDatabaseConnections().filter((profile) => profile.id !== profileId);
  return saveDatabaseConnections(nextConnections);
}

export function createConnectionProfile({ form, type, status = "demo", lastTestedAt = null }) {
  const now = new Date().toISOString();
  return sanitizeConnectionMetadata({
    id: form.id || `db-${Date.now()}`,
    projectId: form.projectId,
    name: form.connectionName || `${type.name} Connection`,
    type: type.id,
    typeName: type.name,
    mode: form.connectionMode,
    host: form.host,
    port: form.port,
    database: form.database,
    filePath: form.filePath,
    sheetUrl: form.sheetUrl,
    url: form.url,
    authType: form.authType,
    username: form.username,
    ssl: form.ssl,
    ssh: form.ssh,
    advanced: form.advanced,
    workspace: form.workspace,
    tags: form.tags,
    createdAt: form.createdAt || now,
    updatedAt: now,
    lastTestedAt,
    status,
  });
}
