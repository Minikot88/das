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

  return (
    <div className={`shell${sidebarCollapsed ? " sidebar-collapsed" : ""}`}>
      <AppHeader />
      <div className="body-row">
        <SidebarLeft />
        <main className="main-content" id="main-content" role="main">
          <Outlet />
        </main>
        {!isWorkspaceRoute && <SidebarRight />}
      </div>
    </div>
  );
}
