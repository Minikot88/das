const USE_MOCK = import.meta.env.VITE_USE_MOCK !== "false";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 15000);
const INTERNAL_SINGLE_USER = import.meta.env.VITE_INTERNAL_SINGLE_USER === "true";

export function isMockMode() {
  return USE_MOCK;
}

export function isInternalSingleUserMode() {
  return INTERNAL_SINGLE_USER;
}

export function encodeApiPathSegment(value) {
  return encodeURIComponent(String(value));
}

export function csrfHeaderForRequest(method = "GET") {
  if (["GET", "HEAD", "OPTIONS"].includes(String(method).toUpperCase()) || typeof document === "undefined") return {};
  const entry = String(document.cookie || "").split(";").map((part) => part.trim()).find((part) => part.startsWith("mini_bi_csrf="));
  const token = entry ? decodeURIComponent(entry.slice("mini_bi_csrf=".length)) : "";
  return token ? { "X-CSRF-Token": token } : {};
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
  const headers = {
    ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    ...csrfHeaderForRequest(options.method),
    ...options.headers,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      credentials: "same-origin",
      ...options,
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
