import React from "react";
import { NavLink } from "react-router-dom";
import { useStore } from "../../store/useStore";
import { useI18n } from "../../utils/i18n";

export default function SidebarLeft() {
  const { t } = useI18n();
  const sidebarCollapsed = useStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useStore((state) => state.toggleSidebar);
  const mobileMenuOpen = useStore((state) => state.mobileMenuOpen);
  const setMobileMenuOpen = useStore((state) => state.setMobileMenuOpen);

  const navItems = [
    { to: "/", exact: true, icon: "HM", label: t("common.home") },
    { to: "/dashboard", exact: false, icon: "DB", label: t("common.dashboard") },
    { to: "/builder", exact: false, icon: "BL", label: t("common.builder") },
  ];

  return (
    <>
      {mobileMenuOpen ? <div className="sidebar-backdrop" onClick={() => setMobileMenuOpen(false)} aria-hidden="true" /> : null}

      <nav
        className={`sidebar-left${sidebarCollapsed ? " collapsed" : ""}${mobileMenuOpen ? " mobile-open" : ""}`}
        aria-label={t("app.navigation")}
      >
        <div className="sidebar-top">
          {sidebarCollapsed ? null : (
            <div className="sidebar-label">
              <span>{t("app.name")}</span>
              <strong>{t("app.navigation")}</strong>
            </div>
          )}
          <button
            type="button"
            className="sidebar-collapse-btn"
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? t("app.expandSidebar") : t("app.collapseSidebar")}
          >
            {sidebarCollapsed ? ">" : "<"}
          </button>
        </div>

        {sidebarCollapsed ? null : (
          <div className="sidebar-workspace-card">
            <span className="sidebar-workspace-kicker">Mini BI</span>
            <strong>Mini BI</strong>
          </div>
        )}

        <div className="sidebar-nav-group">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              className={({ isActive }) => `nav-link${isActive ? " active" : ""}${sidebarCollapsed ? " icon-only" : ""}`}
              onClick={() => setMobileMenuOpen(false)}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <span className="nav-icon">{item.icon}</span>
              {sidebarCollapsed ? null : <span className="nav-label">{item.label}</span>}
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
}
