import React, { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import AppHeader from "./AppHeader";
import SidebarLeft from "./SidebarLeft";
import SidebarRight from "./SidebarRight";
import { useStore } from "../store/useStore";

export default function MainLayout() {
  const theme = useStore((state) => state.theme);
  const sidebarCollapsed = useStore((state) => state.sidebarCollapsed);
  const setMobileMenuOpen = useStore((state) => state.setMobileMenuOpen);
  const location = useLocation();

  useEffect(() => {
    document.body.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname, setMobileMenuOpen]);

  const isWorkspaceRoute = location.pathname === "/dashboard" || location.pathname === "/builder";

  return (
    <div className={`shell${sidebarCollapsed ? " sidebar-collapsed" : ""}`}>
      <AppHeader />
      <div className="body-row">
        <SidebarLeft />
        <main className="main-content" id="main-content" role="main">
          <Outlet />
        </main>
        {!isWorkspaceRoute ? <SidebarRight /> : null}
      </div>
    </div>
  );
}
