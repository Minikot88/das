const WORKSPACE_STORAGE_KEY = "mini-bi-v8-workspace";
const BUILDER_DRAFT_STORAGE_KEY = "mini-bi-v8-builder-draft";
const AUTOSAVE_DELAY_MS = 400;

let workspaceSaveTimer = null;

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function repairMojibakeString(value) {
  if (typeof value !== "string") return value;

  if (/[àâÃ]/.test(value)) {
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
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? normalizeStoredText(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function writeJson(key, value) {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage failures for now
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
    filterPresets: state.filterPresets,
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
  if (!canUseStorage()) return;
  try {
    window.localStorage.removeItem(BUILDER_DRAFT_STORAGE_KEY);
  } catch {
    // ignore storage failures for now
  }
}
