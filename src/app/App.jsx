import React, { useEffect } from "react";
import { BrowserRouter } from "react-router";
import AppRoutes from "@app/router/AppRoutes";
import { useStore } from "@app/store/useStore";
import { applyThemeMode } from "@shared/lib/themeMode";
import { loadCurrentUser } from "@modules/auth/api/authApi";
import { isMockMode } from "@infrastructure/http/client";

export default function App() {
  const theme = useStore((state) => state.theme);

  useEffect(() => {
    if (isMockMode()) return undefined;
    let active = true;
    loadCurrentUser().catch(() => {
      if (active) useStore.getState().setAuthAnonymous();
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const handleSessionExpired = () => useStore.getState().setAuthAnonymous();
    window.addEventListener("mini-bi:session-expired", handleSessionExpired);
    return () => window.removeEventListener("mini-bi:session-expired", handleSessionExpired);
  }, []);

  useEffect(() => {
    applyThemeMode(theme);

    if (theme !== "system" || typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return undefined;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = () => applyThemeMode("system");

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", handleSystemThemeChange);
      return () => media.removeEventListener("change", handleSystemThemeChange);
    }

    media.addListener(handleSystemThemeChange);
    return () => media.removeListener(handleSystemThemeChange);
  }, [theme]);

  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
