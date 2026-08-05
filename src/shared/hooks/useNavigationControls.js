import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";

const HISTORY_KEY = "mini-bi-navigation-history-v1";
const FALLBACK_ROUTE = "/home";

function getPath(location) {
  return `${location.pathname}${location.search || ""}${location.hash || ""}`;
}

function normalizeHistory(value) {
  if (!value || !Array.isArray(value.entries)) return { entries: [], index: -1 };
  const entries = value.entries.filter((entry) => typeof entry === "string" && entry);
  const index = Math.max(-1, Math.min(Number(value.index) || 0, entries.length - 1));
  return { entries, index };
}

function readHistory() {
  if (typeof window !== "undefined" && window.__MINI_BI_NAV_HISTORY__) {
    return normalizeHistory(window.__MINI_BI_NAV_HISTORY__);
  }

  try {
    return normalizeHistory(JSON.parse(window.sessionStorage.getItem(HISTORY_KEY) || "null"));
  } catch {
    return { entries: [], index: -1 };
  }
}

function writeHistory(history) {
  const normalized = normalizeHistory(history);
  if (typeof window !== "undefined") {
    window.__MINI_BI_NAV_HISTORY__ = normalized;
  }

  try {
    window.sessionStorage.setItem(HISTORY_KEY, JSON.stringify(normalized));
  } catch {
    // Navigation still works without persisted app history.
  }
}

function deriveNextHistory(current, path) {
  const history = normalizeHistory(current);
  const { entries, index } = history;

  if (entries[index] === path) return history;
  if (index > 0 && entries[index - 1] === path) return { entries, index: index - 1 };
  if (index < entries.length - 1 && entries[index + 1] === path) return { entries, index: index + 1 };

  const nextEntries = entries.slice(0, index + 1);
  if (nextEntries[nextEntries.length - 1] !== path) nextEntries.push(path);
  return { entries: nextEntries.slice(-40), index: Math.min(nextEntries.length - 1, 39) };
}

export function useNavigationControls() {
  const location = useLocation();
  const navigate = useNavigate();
  const [historyState, setHistoryState] = useState(() => deriveNextHistory(readHistory(), getPath(location)));
  const currentPath = getPath(location);

  useEffect(() => {
    setHistoryState((current) => {
      const next = deriveNextHistory(current, currentPath);
      writeHistory(next);
      return next;
    });
  }, [currentPath]);

  const canGoBack = useMemo(() => historyState.index > 0 || currentPath !== FALLBACK_ROUTE, [currentPath, historyState.index]);
  const canGoForward = historyState.index >= 0 && historyState.index < historyState.entries.length - 1;

  const goBack = useCallback(() => {
    const latest = readHistory();
    if (latest.index > 0 && latest.entries[latest.index - 1]) {
      navigate(latest.entries[latest.index - 1]);
      return;
    }
    if (currentPath !== FALLBACK_ROUTE) {
      navigate(FALLBACK_ROUTE);
    }
  }, [currentPath, navigate]);

  const goForward = useCallback(() => {
    const latest = readHistory();
    if (latest.index >= 0 && latest.index < latest.entries.length - 1) {
      navigate(latest.entries[latest.index + 1]);
    }
  }, [navigate]);

  const goHome = useCallback(() => {
    navigate(FALLBACK_ROUTE);
  }, [navigate]);

  return {
    canGoBack,
    canGoForward,
    currentPath,
    goBack,
    goForward,
    goHome,
  };
}

export default useNavigationControls;
