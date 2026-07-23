import { workspaceRepository } from "@infrastructure/persistence/workspace-repository/workspaceRepository";
import {
  mergeZustandWorkspaceSnapshot,
  toZustandWorkspaceSnapshot,
} from "@domain/workspace/workspaceCompatibility";

const WORKSPACE_STORAGE_KEY = "mini-bi-v8-workspace";
const BUILDER_DRAFT_STORAGE_KEY = "mini-bi-v8-builder-draft";
export const UI_STORAGE_KEY = "mini-bi-ui-v1";
const AUTOSAVE_DELAY_MS = 400;
const SECRET_UI_KEYS = new Set([
  "password", "passwd", "passphrase", "token", "accesstoken", "refreshtoken", "idtoken",
  "apikey", "accesskey", "privatekey", "sshpassword", "secret", "secretkey", "clientsecret",
  "clientkey", "sessionsecret", "sessiontoken", "authorization", "cookie", "setcookie",
  "connectionstring", "credential", "credentials", "signature", "sig", "oauthtoken",
  "xamzcredential", "xamzsignature", "xamzsecuritytoken", "xgoogcredential", "xgoogsignature",
  "authmechanismproperties", "cacertificate", "clientcertificate",
]);

let workspaceSaveTimer = null;
let storageHealth = { ok: true, message: "" };
const storageHealthListeners = new Set();

function isSecretUiKey(value) {
  return SECRET_UI_KEYS.has(String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, ""));
}

function setStorageHealth(nextHealth) {
  storageHealth = {
    ok: Boolean(nextHealth?.ok),
    message: nextHealth?.message || "",
  };
  storageHealthListeners.forEach((listener) => listener(storageHealth));
}

export function getStorageHealth() {
  return storageHealth;
}

export function subscribeStorageHealth(listener) {
  storageHealthListeners.add(listener);
  listener(storageHealth);
  return () => storageHealthListeners.delete(listener);
}

function canUseStorage() {
  if (typeof window === "undefined") return false;
  try {
    return typeof window.localStorage !== "undefined";
  } catch {
    return false;
  }
}

function repairMojibakeString(value) {
  if (typeof value !== "string") return value;

  if (/[\u00C3\u00C2\u00E0\u00E2]/.test(value)) {
    try {
      const bytes = Uint8Array.from(value, (char) => char.charCodeAt(0) & 0xff);
      const decoded = new TextDecoder("utf-8").decode(bytes);
      if (/[\u0E00-\u0E7F]/.test(decoded)) {
        return decoded;
      }
    } catch {
      // fall through to original value
    }
  }

  return value;
}

function normalizeStoredText(value) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeStoredText(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, normalizeStoredText(nestedValue)])
    );
  }

  return repairMojibakeString(value);
}

function sanitizePersistedString(value) {
  if (typeof value !== "string" || !/^[a-z][a-z\d+.-]*:\/\//i.test(value)) return value;
  try {
    const parsed = new URL(value);
    parsed.username = "";
    parsed.password = "";
    Array.from(parsed.searchParams.keys()).forEach((key) => {
      if (isSecretUiKey(key)) parsed.searchParams.delete(key);
    });
    const fragment = parsed.hash.startsWith("#") ? parsed.hash.slice(1) : parsed.hash;
    if (fragment.includes("=")) {
      const fragmentParams = new URLSearchParams(fragment);
      Array.from(fragmentParams.keys()).forEach((key) => {
        if (isSecretUiKey(key)) fragmentParams.delete(key);
      });
      parsed.hash = fragmentParams.toString();
    }
    return parsed.toString();
  } catch {
    return /:\/\/[^/@\s]+:[^/@\s]+@/.test(value) ? "" : value;
  }
}

function isOpaqueDatasetRowPath(path) {
  const rowIndex = path.findIndex((segment, index) =>
    ["rows", "sqlResultRows", "previewRows"].includes(segment) && typeof path[index + 1] === "number"
  );
  if (rowIndex < 0) return false;
  const owners = path.slice(0, rowIndex);
  return owners.includes("datasets")
    || owners.includes("importedDatasets")
    || owners.includes("charts")
    || (owners.includes("snapshot") && owners.includes("widgets"))
    || (owners.includes("dashboards") && owners.includes("widgets") && owners.includes("chartSnapshot"));
}

function sanitizeOpaqueDatasetValue(value) {
  if (Array.isArray(value)) return value.map(sanitizeOpaqueDatasetValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, sanitizeOpaqueDatasetValue(nestedValue)])
    );
  }
  return sanitizePersistedString(value);
}

function sanitizeUiValue(value, path = []) {
  if (isOpaqueDatasetRowPath(path)) return sanitizeOpaqueDatasetValue(value);
  if (Array.isArray(value)) return value.map((item, index) => sanitizeUiValue(item, [...path, index]));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !isSecretUiKey(key))
        .map(([key, nestedValue]) => [key, sanitizeUiValue(nestedValue, [...path, key])])
    );
  }
  return sanitizePersistedString(value);
}

function readJson(key) {
  if (!canUseStorage()) {
    setStorageHealth({ ok: false, message: "Local storage is unavailable. Changes may not persist after refresh." });
    return null;
  }
  try {
    const raw = window.localStorage.getItem(key);
    setStorageHealth({ ok: true, message: "" });
    return raw ? normalizeStoredText(JSON.parse(raw)) : null;
  } catch (error) {
    setStorageHealth({
      ok: false,
      message: `Saved workspace data could not be read${error?.message ? `: ${error.message}` : "."}`,
    });
    return null;
  }
}

function writeJson(key, value) {
  if (!canUseStorage()) {
    setStorageHealth({ ok: false, message: "Local storage is unavailable. Changes may not persist after refresh." });
    return;
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    setStorageHealth({ ok: true, message: "" });
  } catch (error) {
    setStorageHealth({
      ok: false,
      message: `Workspace changes could not be saved${error?.message ? `: ${error.message}` : "."}`,
    });
  }
}

export function createWorkspaceSnapshot(state) {
  return sanitizeUiValue(normalizeStoredText({
    version: 8,
    projects: state.projects,
    activeProjectId: state.activeProjectId,
    activeSheetId: state.activeSheetId,
    activeDashboardId: state.activeDashboardId,
    theme: state.theme,
    locale: state.locale,
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    filters: state.filters,
    dashboardFilters: state.dashboardFilters,
    dashboardInteractions: state.dashboardInteractions,
    savedViews: state.savedViews,
    filterPresets: state.filterPresets,
    appSettings: state.appSettings,
    importedDatasets: state.importedDatasets,
    sidebarCollapsed: state.sidebarCollapsed,
    kpiBarVisible: state.kpiBarVisible,
    charts: state.charts,
    shareLinks: state.shareLinks,
    ui: state.ui,
  }));
}

export function createWorkspaceUiSnapshot(state = {}) {
  const user = state.user && typeof state.user === "object"
    ? {
        id: state.user.id ?? null,
        email: state.user.email ?? "",
        name: state.user.name ?? "",
        role: state.user.role ?? "",
        lastLoginAt: state.user.lastLoginAt ?? "",
      }
    : null;
  return sanitizeUiValue({
    user,
    isAuthenticated: Boolean(state.isAuthenticated),
    filters: state.filters ?? {},
    dashboardFilters: state.dashboardFilters ?? {},
    dashboardInteractions: state.dashboardInteractions ?? {},
    savedViews: state.savedViews ?? [],
    filterPresets: state.filterPresets ?? [],
    sidebarCollapsed: Boolean(state.sidebarCollapsed),
    kpiBarVisible: state.kpiBarVisible !== false,
    ui: state.ui ?? {},
  });
}

function ensureWorkspaceRepository() {
  if (workspaceRepository.getStatus().mode === "uninitialized") {
    workspaceRepository.migrateIfNeeded();
  }
  return workspaceRepository.getStatus().mode === "canonical";
}

export function loadWorkspaceState() {
  const legacyState = readJson(WORKSPACE_STORAGE_KEY);
  if (!ensureWorkspaceRepository()) return legacyState;
  const persistedUi = readJson(UI_STORAGE_KEY);
  const uiState = persistedUi && typeof persistedUi === "object"
    ? persistedUi
    : createWorkspaceUiSnapshot(legacyState ?? {});
  return toZustandWorkspaceSnapshot(workspaceRepository.getSnapshot(), uiState);
}

export function saveWorkspaceState(state) {
  if (!ensureWorkspaceRepository()) {
    writeJson(WORKSPACE_STORAGE_KEY, createWorkspaceSnapshot(state));
    return;
  }
  try {
    const snapshot = createWorkspaceSnapshot(state);
    workspaceRepository.update((current) => mergeZustandWorkspaceSnapshot(current, snapshot));
    writeJson(UI_STORAGE_KEY, createWorkspaceUiSnapshot(state));
    if (getStorageHealth().ok) setStorageHealth({ ok: true, message: "" });
  } catch (error) {
    setStorageHealth({
      ok: false,
      message: `Workspace changes could not be saved${error?.message ? `: ${error.message}` : "."}`,
    });
  }
}

export function queueWorkspaceSave(state) {
  if (typeof window === "undefined") return;

  if (workspaceSaveTimer) {
    window.clearTimeout(workspaceSaveTimer);
  }

  workspaceSaveTimer = window.setTimeout(() => {
    saveWorkspaceState(state);
    workspaceSaveTimer = null;
  }, AUTOSAVE_DELAY_MS);
}

export function flushWorkspaceSave(state) {
  if (typeof window === "undefined") return;

  if (workspaceSaveTimer) {
    window.clearTimeout(workspaceSaveTimer);
    workspaceSaveTimer = null;
  }
  saveWorkspaceState(state);
}

export function flushPendingWorkspaceSave(state) {
  if (typeof window === "undefined" || !workspaceSaveTimer) return false;
  window.clearTimeout(workspaceSaveTimer);
  workspaceSaveTimer = null;
  saveWorkspaceState(state);
  return true;
}

export function loadBuilderDraft() {
  return readJson(BUILDER_DRAFT_STORAGE_KEY);
}

export function saveBuilderDraft(draft) {
  writeJson(BUILDER_DRAFT_STORAGE_KEY, sanitizeUiValue(draft));
}

export function clearBuilderDraft() {
  if (!canUseStorage()) {
    setStorageHealth({ ok: false, message: "Local storage is unavailable. Changes may not persist after refresh." });
    return;
  }
  try {
    window.localStorage.removeItem(BUILDER_DRAFT_STORAGE_KEY);
    setStorageHealth({ ok: true, message: "" });
  } catch (error) {
    setStorageHealth({
      ok: false,
      message: `Builder draft could not be cleared${error?.message ? `: ${error.message}` : "."}`,
    });
  }
}
