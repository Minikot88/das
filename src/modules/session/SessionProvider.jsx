import React, { useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest } from "@infrastructure/http/client";
import { SessionContext, useSession } from "./sessionContext";

const sessionRequiredUrl = resolveExternalSessionUrl(import.meta.env.VITE_EXTERNAL_SESSION_REQUIRED_URL);

export function SessionProvider({ children }) {
  const [state, setState] = useState({ status: "loading", session: null, error: null });

  const refresh = useCallback(async () => {
    setState((current) => ({ ...current, status: "loading", error: null }));
    try {
      const session = await apiRequest("/api/session/me");
      setState({ status: "authenticated", session, error: null });
    } catch (error) {
      if (error?.status === 401) {
        setState({ status: "required", session: null, error: null });
        return;
      }
      setState({ status: "error", session: null, error });
    }
  }, []);

  useEffect(() => {
    let active = true;
    apiRequest("/api/session/me")
      .then((session) => {
        if (active) setState({ status: "authenticated", session, error: null });
      })
      .catch((error) => {
        if (!active) return;
        if (error?.status === 401) setState({ status: "required", session: null, error: null });
        else setState({ status: "error", session: null, error });
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const handleSessionExpired = () => setState({ status: "required", session: null, error: null });
    window.addEventListener("mini-bi:session-expired", handleSessionExpired);
    return () => window.removeEventListener("mini-bi:session-expired", handleSessionExpired);
  }, []);

  const value = useMemo(() => ({ ...state, refresh }), [refresh, state]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function SessionGate({ children, fallback }) {
  const { status } = useSession();
  if (status === "authenticated") return children;
  if (status === "loading") return fallback;
  return <ExternalSessionRequired />;
}

export function ExternalSessionRequired() {
  const { status, error, refresh } = useSession();
  const unavailable = status === "error";
  return (
    <main className="external-session-state" aria-labelledby="external-session-title">
      <section>
        <p className="external-session-kicker">DashboardMiniBi</p>
        <h1 id="external-session-title">{unavailable ? "Session service unavailable" : "External session required"}</h1>
        <p>
          {unavailable
            ? "DashboardMiniBi could not verify the current session. Try again when the service is available."
            : "Open DashboardMiniBi from the main website with a valid signed session."}
        </p>
        {error?.message ? <p role="alert">{error.message}</p> : null}
        <div className="external-session-actions">
          <button type="button" onClick={() => void refresh()}>Try again</button>
          {sessionRequiredUrl ? <a href={sessionRequiredUrl}>Return to main website</a> : null}
        </div>
      </section>
    </main>
  );
}

function resolveExternalSessionUrl(value) {
  if (!value || typeof window === "undefined") return "";
  try {
    const url = new URL(value, window.location.origin);
    if (!["http:", "https:"].includes(url.protocol)) return "";
    if (url.origin === window.location.origin && url.pathname === window.location.pathname) return "";
    return url.href;
  } catch {
    return "";
  }
}
