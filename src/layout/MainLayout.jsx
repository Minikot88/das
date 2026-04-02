
import React, { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import AppHeader    from "./AppHeader";
import SidebarLeft  from "./SidebarLeft";
import SidebarRight from "./SidebarRight";
import { useStore } from "../store/useStore";

export default function MainLayout() {
  const theme           = useStore((s) => s.theme);
  const sidebarCollapsed = useStore((s) => s.sidebarCollapsed);

  useEffect(() => {
    document.body.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const location        = useLocation();
  const isBuilder       = location.pathname === "/builder";

  return (
    <div className={`shell${sidebarCollapsed ? " sidebar-collapsed" : ""}`}>
      <AppHeader />

      <div className="body-row">
        <SidebarLeft />

        <main className="main-content" id="main-content" role="main">
          <Outlet />
        </main>

        {!isBuilder && <SidebarRight />}
      </div>
    </div>
  );
}
