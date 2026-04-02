import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useStore } from "../../store/useStore";
import { useI18n } from "../../utils/i18n";
import LanguageSwitcher from "./LanguageSwitcher";

export default function AppHeader() {
  const { t } = useI18n();
  const theme = useStore((state) => state.theme);
  const toggleTheme = useStore((state) => state.toggleTheme);
  const user = useStore((state) => state.user);
  const logout = useStore((state) => state.logout);
  const toggleKpiBar = useStore((state) => state.toggleKpiBar);
  const mobileMenuOpen = useStore((state) => state.mobileMenuOpen);
  const toggleMobileMenu = useStore((state) => state.toggleMobileMenu);
  const toggleRightPanel = useStore((state) => state.toggleRightPanel);
  const projects = useStore((state) => state.projects);
  const activeProjectId = useStore((state) => state.activeProjectId);
  const setActiveProject = useStore((state) => state.setActiveProject);
  const navigate = useNavigate();

  const [search, setSearch] = useState("");

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="appbar" role="banner">
      <div className="appbar-left">
        <button
          type="button"
          className="appbar-hamburger"
          onClick={toggleMobileMenu}
          aria-label={mobileMenuOpen ? t("app.closeMenu") : t("app.openMenu")}
        >
          <span className={`hamburger-line${mobileMenuOpen ? " open" : ""}`} />
          <span className={`hamburger-line${mobileMenuOpen ? " open" : ""}`} />
          <span className={`hamburger-line${mobileMenuOpen ? " open" : ""}`} />
        </button>

        <button type="button" className="appbar-logo" onClick={() => navigate("/")}>
          <span className="logo">{t("app.name")}</span>
          <span className="appbar-logo-sub">{t("app.brandLine")}</span>
        </button>
      </div>

      <div className="appbar-center">
        <nav className="nav-links">
          <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
            {t("common.home")}
          </NavLink>
          <NavLink to="/dashboard" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
            {t("common.dashboard")}
          </NavLink>
          <NavLink to="/builder" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
            {t("common.builder")}
          </NavLink>
        </nav>
      </div>

      <div className="appbar-right">
        <input
          className="appbar-search"
          placeholder={t("app.searchPlaceholder")}
          aria-label={t("app.searchPlaceholder")}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <select
          className="appbar-select"
          aria-label={t("app.projectSwitcher")}
          value={activeProjectId}
          onChange={(event) => setActiveProject(event.target.value)}
        >
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>

        <LanguageSwitcher compact />

        <button type="button" className="appbar-btn" onClick={() => navigate("/builder")}>
          {t("app.newChart")}
        </button>

        <button type="button" className="appbar-icon" onClick={toggleKpiBar} title={t("app.toggleKpi")} aria-label={t("app.toggleKpi")}>
          KP
        </button>

        <button type="button" className="appbar-panel-btn" onClick={toggleRightPanel} title={t("app.workspacePanel")}>
          {t("app.insights")}
        </button>

        <button type="button" className="appbar-theme-btn" onClick={toggleTheme} aria-label={t("app.toggleTheme")}>
          {theme === "dark" ? "LI" : "DK"}
        </button>

        {user ? (
          <button type="button" className="appbar-user" onClick={handleLogout} title={t("app.signOut")} aria-label={t("app.signOut")}>
            <div className="avatar-circle">{user.name?.[0]?.toUpperCase() ?? "U"}</div>
          </button>
        ) : null}
      </div>
    </header>
  );
}
