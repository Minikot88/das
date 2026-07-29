function finiteInteger(value, fallback, minimum = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(minimum, Math.round(number));
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error || "Unable to save dashboard");
}

function isResolvedIdentifier(value) {
  if (typeof value !== "string") return false;
  const identifier = value.trim();
  return Boolean(identifier) && identifier !== "null" && identifier !== "undefined";
}

export function isDashboardPersistenceReady(dashboard) {
  return isResolvedIdentifier(dashboard?.projectId) && isResolvedIdentifier(dashboard?.dashboardId ?? dashboard?.id);
}

export function dashboardSelectValue(dashboardId) {
  return isResolvedIdentifier(dashboardId) ? dashboardId.trim() : "";
}

export function normalizeDashboardLayout(dashboard, options = {}) {
  const columns = finiteInteger(options.columns, 180, 1);
  const id = String(dashboard?.id || dashboard?.dashboardId || "");
  const projectId = String(dashboard?.projectId || "");
  const widgets = Array.isArray(dashboard?.widgets)
    ? dashboard.widgets.map((widget) => {
        const width = Math.min(columns, finiteInteger(widget?.w, 1, 1));
        return {
          ...widget,
          id: String(widget?.id || ""),
          projectId,
          dashboardId: id,
          x: Math.min(columns - width, finiteInteger(widget?.x, 0)),
          y: finiteInteger(widget?.y, 0),
          w: width,
          h: finiteInteger(widget?.h, 1, 1),
          zIndex: finiteInteger(widget?.zIndex, 1, 1),
        };
      })
    : [];

  return {
    ...dashboard,
    id,
    dashboardId: id,
    projectId,
    widgets,
  };
}

export function createDashboardAutosave({ save, delay = 750, clock = () => new Date().toISOString() }) {
  if (typeof save !== "function") throw new TypeError("save must be a function");
  let saveHandler = save;
  let timer = null;
  let latestPayload;
  let state = { status: "idle", error: null, lastSavedAt: null };
  const listeners = new Set();

  const emit = (patch) => {
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener(state));
  };

  const clearTimer = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };

  const flush = async (payload) => {
    if (payload !== undefined) latestPayload = payload;
    clearTimer();
    if (latestPayload === undefined) return state;
    const payloadToSave = latestPayload;
    emit({ status: "saving", error: null });
    try {
      await saveHandler(payloadToSave);
      if (latestPayload === payloadToSave) latestPayload = undefined;
      emit({ status: "saved", error: null, lastSavedAt: clock() });
      return state;
    } catch (error) {
      emit({ status: "error", error: errorMessage(error) });
      throw error;
    }
  };

  return {
    setSave(nextSave) {
      if (typeof nextSave !== "function") throw new TypeError("save must be a function");
      saveHandler = nextSave;
    },
    schedule(payload) {
      latestPayload = payload;
      clearTimer();
      emit({ status: "pending", error: null });
      timer = setTimeout(() => {
        timer = null;
        void flush().catch(() => {});
      }, Math.max(0, delay));
      return state;
    },
    flush,
    retry() {
      return flush();
    },
    cancel() {
      clearTimer();
      latestPayload = undefined;
      emit({ status: "idle", error: null });
    },
    async dispose() {
      clearTimer();
      try {
        return await flush();
      } finally {
        listeners.clear();
      }
    },
    getState() {
      return state;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export function shouldWarnAboutUnsavedChanges(status) {
  return status === "pending" || status === "saving" || status === "error" || status === "unsaved";
}

export async function runExplicitDashboardSave({ autosave, payload, onSuccess = () => {}, onError = () => {} }) {
  try {
    await autosave.flush(payload);
    onSuccess();
    return true;
  } catch (error) {
    onError(error);
    return false;
  }
}

export function createBeforeUnloadHandler(getDirty) {
  return (event) => {
    if (!getDirty()) return undefined;
    event.preventDefault();
    event.returnValue = "";
    return "";
  };
}

export function createSessionImageAsset(file, urlApi = URL) {
  const src = urlApi.createObjectURL(file);
  return {
    src,
    metadata: {
      kind: "object-url",
      durability: "session-only",
      persisted: false,
      available: true,
      fileName: String(file?.name || "image"),
      mediaType: String(file?.type || "application/octet-stream"),
      bytes: Number.isFinite(file?.size) ? file.size : null,
    },
  };
}

function sessionObjectUrl(widget) {
  const src = widget?.config?.src;
  return widget?.type === "image" && widget?.config?.asset?.durability === "session-only" && typeof src === "string" && src.startsWith("blob:")
    ? src
    : null;
}

export function revokeRemovedSessionAssets(previousWidgets = [], nextWidgets = [], urlApi = URL) {
  const retained = new Set(nextWidgets.map(sessionObjectUrl).filter(Boolean));
  previousWidgets.map(sessionObjectUrl).filter(Boolean).forEach((url) => {
    if (!retained.has(url)) urlApi.revokeObjectURL(url);
  });
}

export function prepareDashboardForPersistence(dashboard) {
  return {
    ...dashboard,
    widgets: (dashboard?.widgets ?? []).map((widget) => {
      const url = sessionObjectUrl(widget);
      if (!url) return { ...widget, config: widget?.config ? { ...widget.config } : widget?.config };
      return {
        ...widget,
        config: {
          ...widget.config,
          src: null,
          asset: {
            ...widget.config.asset,
            available: false,
            persisted: false,
          },
        },
      };
    }),
  };
}
