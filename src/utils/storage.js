const WORKSPACE_STORAGE_KEY = "mini-bi-v8-workspace";
const BUILDER_DRAFT_STORAGE_KEY = "mini-bi-v8-builder-draft";
const AUTOSAVE_DELAY_MS = 400;

let workspaceSaveTimer = null;
let storageHealth = { ok: true, message: "" };
const storageHealthListeners = new Set();

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
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
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
  return normalizeStoredText({
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
  });
}

export function loadWorkspaceState() {
  return readJson(WORKSPACE_STORAGE_KEY);
}

export function saveWorkspaceState(state) {
  writeJson(WORKSPACE_STORAGE_KEY, createWorkspaceSnapshot(state));
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

export function loadBuilderDraft() {
  return readJson(BUILDER_DRAFT_STORAGE_KEY);
}

export function saveBuilderDraft(draft) {
  writeJson(BUILDER_DRAFT_STORAGE_KEY, draft);
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
