import React from "react";
import { NavLink } from "react-router-dom";
import { useStore } from "../store/useStore";

const NAV_ITEMS = [
  { to: "/", exact: true, icon: "HM", label: "หน้าหลัก", hint: "Projects" },
  { to: "/dashboard", exact: false, icon: "DB", label: "Dashboard", hint: "Canvas" },
  { to: "/builder", exact: false, icon: "BL", label: "Builder", hint: "Chart editor" },
];

export default function SidebarLeft() {
  const sidebarCollapsed = useStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useStore((s) => s.toggleSidebar);
  const mobileMenuOpen = useStore((s) => s.mobileMenuOpen);
  const setMobileMenuOpen = useStore((s) => s.setMobileMenuOpen);
  const projects = useStore((s) => s.projects);
  const activeProjectId = useStore((s) => s.activeProjectId);
  const activeSheetId = useStore((s) => s.activeSheetId);
  const activeDashboardId = useStore((s) => s.activeDashboardId);

  const activeProject = projects.find((p) => p.id === activeProjectId) ?? projects[0];
  const activeSheet = activeProject?.sheets.find((sheet) => sheet.id === activeSheetId) ?? activeProject?.sheets[0];
  const activeDashboard =
    activeSheet?.dashboards.find((dashboard) => dashboard.id === activeDashboardId) ??
    activeSheet?.dashboards[0];

  return (
    <>
      {mobileMenuOpen ? (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      ) : null}

      <nav
        className={`sidebar-left${sidebarCollapsed ? " collapsed" : ""}${mobileMenuOpen ? " mobile-open" : ""}`}
        aria-label="เมนูหลัก"
      >
        <div className="sidebar-top">
          <div className="sidebar-label">
            {!sidebarCollapsed ? (
              <>
                <span>Menu</span>
                <strong>Workspace</strong>
              </>
            ) : (
              "WS"
            )}
          </div>
          <button
            type="button"
            className="sidebar-collapse-btn"
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? "ขยายแถบด้านข้าง" : "ย่อแถบด้านข้าง"}
            title={sidebarCollapsed ? "ขยาย" : "ย่อ"}
          >
            {sidebarCollapsed ? ">" : "<"}
          </button>
        </div>

        {!sidebarCollapsed ? (
          <div className="sidebar-workspace-card">
            <span className="sidebar-workspace-kicker">Current</span>
            <strong>{activeProject?.name ?? "โปรเจกต์"}</strong>
            <span>{activeSheet?.name ?? "ชีต"} / {activeDashboard?.name ?? "Dashboard"}</span>
          </div>
        ) : null}

        <div className="sidebar-nav-group">
          {NAV_ITEMS.map(({ to, exact, icon, label, hint }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                `nav-link${isActive ? " active" : ""}${sidebarCollapsed ? " icon-only" : ""}`
              }
              onClick={() => setMobileMenuOpen(false)}
              title={sidebarCollapsed ? label : undefined}
            >
              <span className="nav-icon">{icon}</span>
              {!sidebarCollapsed ? (
                <span className="nav-copy">
                  <span className="nav-label">{label}</span>
                  <small>{hint}</small>
                </span>
              ) : null}
            </NavLink>
          ))}
        </div>

        {!sidebarCollapsed ? (
          <div className="sidebar-footer">
            <div className="sidebar-footer-block">
              <span className="sidebar-footer-label">Active Context</span>
              <span className="sidebar-version">
                {activeProject?.name ?? "โปรเจกต์"}
                {activeSheet ? ` / ${activeSheet.name}` : ""}
                {activeDashboard ? ` / ${activeDashboard.name}` : ""}
              </span>
            </div>
          </div>
        ) : null}
      </nav>
    </>
  );
}
