/**
 * SidebarLeft.jsx
 * Collapsible left navigation sidebar.
 * - Shows Home, Dashboard, Builder nav items
 * - Shows active project name + sheet/dashboard context
 * - Icon-only mode when collapsed
 * - Mobile: drawer overlay triggered by hamburger in AppHeader
 */
import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useStore } from "../store/useStore";

const NAV_ITEMS = [
  { to: "/",          exact: true, icon: "🏠", label: "Home"      },
  { to: "/dashboard", exact: false, icon: "📊", label: "Dashboard" },
  { to: "/builder",   exact: false, icon: "🔧", label: "Builder"   },
];

export default function SidebarLeft() {
  const sidebarCollapsed  = useStore((s) => s.sidebarCollapsed);
  const toggleSidebar     = useStore((s) => s.toggleSidebar);
  const mobileMenuOpen    = useStore((s) => s.mobileMenuOpen);
  const setMobileMenuOpen = useStore((s) => s.setMobileMenuOpen);

  const projects          = useStore((s) => s.projects);
  const activeProjectId   = useStore((s) => s.activeProjectId);
  const activeSheetId     = useStore((s) => s.activeSheetId);
  const activeDashboardId = useStore((s) => s.activeDashboardId);

  const navigate = useNavigate();

  // Derive display labels
  const activeProject = projects.find((p) => p.id === activeProjectId) ?? projects[0];
  const activeSheet   = activeProject?.sheets.find((sh) => sh.id === activeSheetId) ?? activeProject?.sheets[0];
  const activeDash    = activeSheet?.dashboards.find((d) => d.id === activeDashboardId) ?? activeSheet?.dashboards[0];

  return (
    <>
      {/* Mobile backdrop */}
      {mobileMenuOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <nav
        className={`sidebar-left${sidebarCollapsed ? " collapsed" : ""}${mobileMenuOpen ? " mobile-open" : ""}`}
        aria-label="Main navigation"
      >
        <div className="sidebar-top">
          <div className="sidebar-label">{!sidebarCollapsed && "Navigation"}</div>

          {/* Collapse toggle — desktop only */}
          <button
            className="sidebar-collapse-btn"
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={sidebarCollapsed ? "Expand" : "Collapse"}
          >
            {sidebarCollapsed ? "›" : "‹"}
          </button>
        </div>

        {NAV_ITEMS.map(({ to, exact, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) => `nav-link${isActive ? " active" : ""}${sidebarCollapsed ? " icon-only" : ""}`}
            onClick={() => setMobileMenuOpen(false)}
            title={sidebarCollapsed ? label : undefined}
          >
            <span className="nav-icon">{icon}</span>
            {!sidebarCollapsed && <span className="nav-label">{label}</span>}
          </NavLink>
        ))}

        {/* Version badge at bottom */}
        {!sidebarCollapsed && (
          <div className="sidebar-footer">
            <span className="sidebar-version">Enterprise v7</span>
          </div>
        )}
      </nav>
    </>
  );
}
