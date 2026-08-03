const USE_MOCK = import.meta.env.VITE_USE_MOCK !== "false";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 15000);
let accessTokenProvider = null;

export function isMockMode() {
  return USE_MOCK;
}

export function setExternalAccessTokenProvider(provider) {
  if (provider !== null && typeof provider !== "function") {
    throw new TypeError("External access token provider must be a function or null.");
  }
  accessTokenProvider = provider;
}

export function encodeApiPathSegment(value) {
  return encodeURIComponent(String(value));
}

async function authorizationHeader() {
  const hostProvider = typeof globalThis.dashboardMiniBiAuth?.getAccessToken === "function"
    ? () => globalThis.dashboardMiniBiAuth.getAccessToken()
    : null;
  const provider = accessTokenProvider || hostProvider;
  if (!provider) return {};
  const token = await provider();
  if (token === null || token === undefined || token === "") return {};
  if (typeof token !== "string" || token.length > 16_384 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) {
    throw new Error("The external session did not provide a valid JWT.");
  }
  return { Authorization: `Bearer ${token}` };
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
      ...(await authorizationHeader()),
    };
    const response = await fetch(`${API_BASE_URL}${path}`, {
      credentials: "omit",
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
