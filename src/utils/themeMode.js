export const THEME_STORAGE_KEY = "mini-bi-theme";
export const THEME_VALUES = ["light", "dark", "system"];

function canUseDom() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

export function normalizeThemeMode(value, fallback = "light") {
  return THEME_VALUES.includes(value) ? value : fallback;
}

export function getSystemThemeMode() {
  if (!canUseDom() || typeof window.matchMedia !== "function") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function resolveThemeMode(value) {
  const normalized = normalizeThemeMode(value);
  return normalized === "system" ? getSystemThemeMode() : normalized;
}

export function readStoredThemeMode(fallback = "light") {
  if (typeof window === "undefined" || !window.localStorage) return fallback;
  try {
    return normalizeThemeMode(window.localStorage.getItem(THEME_STORAGE_KEY), fallback);
  } catch {
    return fallback;
  }
}

export function writeStoredThemeMode(value) {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, normalizeThemeMode(value));
  } catch {
    // Theme persistence must never block the UI.
  }
}

export function applyThemeMode(value) {
  if (!canUseDom()) return;
  const normalized = normalizeThemeMode(value);
  const resolved = resolveThemeMode(normalized);
  const isDark = resolved === "dark";

  document.documentElement.dataset.theme = resolved;
  document.documentElement.dataset.themePreference = normalized;
  document.documentElement.style.colorScheme = resolved;
  document.body.dataset.theme = resolved;
  document.body.classList.toggle("dark", isDark);
  document.body.classList.toggle("dark-mode", isDark);
  document.body.classList.toggle("light", !isDark);
}
