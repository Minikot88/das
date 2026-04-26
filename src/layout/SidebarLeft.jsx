import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useStore } from "../store/useStore";

const NAV_ITEMS = [
  { to: "/", exact: true, icon: "HM", label: "Home", hint: "Projects" },
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
  const location = useLocation();

  const activeProject = projects.find((p) => p.id === activeProjectId) ?? projects[0];
  const activeSheet = activeProject?.sheets.find((sheet) => sheet.id === activeSheetId) ?? activeProject?.sheets[0];
  const activeDashboard =
    activeSheet?.dashboards.find((dashboard) => dashboard.id === activeDashboardId) ??
    activeSheet?.dashboards[0];
  const isCollapsed = sidebarCollapsed && !mobileMenuOpen;

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
        className={`sidebar-left${isCollapsed ? " collapsed" : ""}${mobileMenuOpen ? " mobile-open" : ""}`}
        aria-label="เมนูหลัก"
      >
        <div className="sidebar-brand" title={activeProject?.name ?? "Mini BI"}>
          <div className="sidebar-brand-mark" aria-hidden="true">
            MB
          </div>
          {!isCollapsed ? (
            <div className="sidebar-brand-copy">
              <strong>Mini BI</strong>
              <span title={activeProject?.name ?? "Workspace"}>
                {activeProject?.name ?? "Workspace"}
              </span>
            </div>
          ) : null}
        </div>

        <div className="sidebar-top">
          <div className="sidebar-label">
            {!isCollapsed ? (
              <>
                <span>MENU</span>
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
            aria-label={isCollapsed ? "ขยายแถบด้านข้าง" : "ย่อแถบด้านข้าง"}
            title={isCollapsed ? "ขยาย" : "ย่อ"}
          >
            {isCollapsed ? ">" : "<"}
          </button>
        </div>

        {!isCollapsed ? (
          <div className="sidebar-workspace-card">
            <span className="sidebar-workspace-kicker">CURRENT</span>
            <strong title={activeProject?.name ?? "โปรเจกต์"}>{activeProject?.name ?? "โปรเจกต์"}</strong>
            <span title={`${activeSheet?.name ?? "ชีต"} / ${activeDashboard?.name ?? "Dashboard"}`}>
              {activeSheet?.name ?? "ชีต"} / {activeDashboard?.name ?? "Dashboard"}
            </span>
          </div>
        ) : null}

        <div className="sidebar-nav-group">
          {NAV_ITEMS.map(({ to, exact, icon, label, hint }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                `nav-link${isActive ? " active" : ""}${isCollapsed ? " icon-only" : ""}`
              }
              onClick={() => setMobileMenuOpen(false)}
              title={isCollapsed ? label : undefined}
            >
              <span className="nav-icon">{icon}</span>
              {!isCollapsed ? (
                <span className="nav-copy">
                  <span className="nav-label" title={label}>{label}</span>
                  <small>{hint}</small>
                </span>
              ) : null}
            </NavLink>
          ))}
        </div>

        {!isCollapsed ? (
          <div className="sidebar-footer">
            <div className="sidebar-footer-block">
              <span className="sidebar-footer-label">ACTIVE CONTEXT</span>
              <span
                className="sidebar-version"
                title={location.pathname}
              >
                {location.pathname}
              </span>
            </div>
          </div>
        ) : null}
      </nav>
    </>
  );
}
