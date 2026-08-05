const USE_MOCK = import.meta.env.DEV && import.meta.env.VITE_USE_MOCK === "true";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 15000);

export function isMockMode() {
  return USE_MOCK;
}

export function encodeApiPathSegment(value) {
  return encodeURIComponent(String(value));
}

function csrfTokenFor(method) {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(String(method || "GET").toUpperCase())) return "";
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|;\s*)dashboardmini_csrf=([^;]+)/);
  if (!match) return "";
  try {
    const value = decodeURIComponent(match[1]);
    return /^[A-Za-z0-9_-]{40,512}$/.test(value) ? value : "";
  } catch {
    return "";
  }
}

async function parseResponseBody(response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function apiRequest(path, options = {}) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  const signal = options.signal ? AbortSignal.any([options.signal, controller.signal]) : controller.signal;
  const { headers: optionHeaders, signal: _callerSignal, ...fetchOptions } = options;

  try {
    const headers = {
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...optionHeaders,
    };
    const csrfToken = csrfTokenFor(options.method);
    if (csrfToken) headers["X-CSRF-Token"] = csrfToken;
    const response = await fetch(`${API_BASE_URL}${path}`, {
      credentials: "same-origin",
      ...fetchOptions,
      headers,
      signal,
    });

    const payload = await parseResponseBody(response);

    if (!response.ok) {
      if (response.status === 401 && typeof window !== "undefined") window.dispatchEvent(new CustomEvent("mini-bi:session-expired"));
      const message =
        (payload && typeof payload === "object" && (payload.message || payload.error)) ||
        (typeof payload === "string" && payload) ||
        `API error: ${response.status}`;
      const error = new Error(message);
      error.status = response.status;
      error.code = payload && typeof payload === "object" ? payload.code : undefined;
      error.payload = payload;
      throw error;
    }

    return payload && typeof payload === "object" && "data" in payload ? payload.data : payload;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("Request timed out. Please try again.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}
