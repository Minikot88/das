/**
 * components/common/MainLayout.jsx
 * Master layout wrapper for protected routes.
 */
import React, { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import AppHeader from "./AppHeader";
import SidebarLeft from "./SidebarLeft";
import SidebarRight from "./SidebarRightV2";
import { useStore } from "../../store/useStore";

export default function MainLayout() {
  const theme = useStore((s) => s.theme);
  const sidebarCollapsed = useStore((s) => s.sidebarCollapsed);
  const setMobileMenuOpen = useStore((s) => s.setMobileMenuOpen);
  const location = useLocation();

  useEffect(() => {
    document.body.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname, setMobileMenuOpen]);

  const isWorkspaceRoute = location.pathname === "/builder" || location.pathname === "/dashboard";
  const isBuilderRoute = location.pathname === "/builder";
  const shellClassName = [
    "shell",
    sidebarCollapsed ? "sidebar-collapsed" : "",
    isWorkspaceRoute ? "is-workspace-route" : "",
    isBuilderRoute ? "is-builder-route" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const mainClassName = [
    "main-content",
    isWorkspaceRoute ? "is-workspace-route" : "",
    isBuilderRoute ? "is-builder-route" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={shellClassName}>
      <AppHeader />
      <div className="body-row">
        <SidebarLeft />
        <main className={mainClassName} id="main-content" role="main">
          <Outlet />
        </main>
        {!isWorkspaceRoute && <SidebarRight />}
      </div>
    </div>
  );
}
