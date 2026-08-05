import React, { useEffect } from "react";
import { BrowserRouter } from "react-router";
import AppRoutes from "@app/router/AppRoutes";
import { useStore } from "@app/store/useStore";
import { applyThemeMode } from "@shared/lib/themeMode";
import { SessionProvider } from "@modules/session/SessionProvider";

export default function App() {
  const theme = useStore((state) => state.theme);

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
      <SessionProvider>
        <AppRoutes />
      </SessionProvider>
    </BrowserRouter>
  );
}
