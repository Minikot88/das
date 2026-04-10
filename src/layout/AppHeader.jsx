import React, { useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useStore } from "../store/useStore";

const NAV_ITEMS = [
  { to: "/", label: "Home", meta: "Projects" },
  { to: "/dashboard", label: "Dashboard", meta: "Canvas" },
  { to: "/builder", label: "Builder", meta: "Editor" },
];

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="8.5" cy="8.5" r="4.75" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 12L16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
    </svg>
  );
}

function ThemeIcon({ theme }) {
  if (theme === "dark") {
    return (
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path
          d="M10 3.5V1.75M10 18.25V16.5M4.93 4.93L3.7 3.7M16.3 16.3L15.07 15.07M3.5 10H1.75M18.25 10H16.5M4.93 15.07L3.7 16.3M16.3 3.7L15.07 4.93"
          stroke="currentColor"
          strokeWidth="1.35"
          strokeLinecap="square"
        />
        <circle cx="10" cy="10" r="3.5" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M13.75 2.5C11.37 2.76 9.5 4.77 9.5 7.25C9.5 9.9 11.65 12.05 14.3 12.05C15.15 12.05 15.95 11.83 16.64 11.45C15.97 14.45 13.29 16.7 10.08 16.7C6.37 16.7 3.37 13.7 3.37 9.99C3.37 6.79 5.61 4.11 8.61 3.43C8.24 4.12 8.02 4.92 8.02 5.77C8.02 8.42 10.17 10.57 12.82 10.57C13.15 10.57 13.46 10.54 13.75 10.47"
        fill="currentColor"
      />
    </svg>
  );
}

export default function AppHeader() {
  const theme = useStore((s) => s.theme);
  const toggleTheme = useStore((s) => s.toggleTheme);
  const user = useStore((s) => s.user);
  const logout = useStore((s) => s.logout);
  const mobileMenuOpen = useStore((s) => s.mobileMenuOpen);
  const toggleMobileMenu = useStore((s) => s.toggleMobileMenu);
  const projects = useStore((s) => s.projects);
  const activeProjectId = useStore((s) => s.activeProjectId);
  const activeSheetId = useStore((s) => s.activeSheetId);
  const activeDashboardId = useStore((s) => s.activeDashboardId);
  const setActiveProject = useStore((s) => s.setActiveProject);

  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const activeProject = useMemo(
    () => projects.find((project) => project.id === activeProjectId) ?? projects[0] ?? null,
    [projects, activeProjectId]
  );

  const activeSheet = useMemo(
    () => activeProject?.sheets.find((sheet) => sheet.id === activeSheetId) ?? activeProject?.sheets?.[0] ?? null,
    [activeProject, activeSheetId]
  );

  const activeDashboard = useMemo(
    () =>
      activeSheet?.dashboards.find((dashboard) => dashboard.id === activeDashboardId) ??
      activeSheet?.dashboards?.[0] ??
      null,
    [activeSheet, activeDashboardId]
  );

  const projectMeta = useMemo(() => {
    const sheetCount = activeProject?.sheets?.length ?? 0;
    const dashboardCount = activeProject?.sheets?.reduce(
      (count, sheet) => count + (sheet?.dashboards?.length ?? 0),
      0
    ) ?? 0;
    return `${sheetCount} sheet${sheetCount === 1 ? "" : "s"} • ${dashboardCount} dashboard${dashboardCount === 1 ? "" : "s"}`;
  }, [activeProject]);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <header className="appbar" role="banner">
      <div className="appbar-left">
        <button
          type="button"
          className="appbar-hamburger"
          onClick={toggleMobileMenu}
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
        >
          <span className={`hamburger-line${mobileMenuOpen ? " open" : ""}`} />
          <span className={`hamburger-line${mobileMenuOpen ? " open" : ""}`} />
          <span className={`hamburger-line${mobileMenuOpen ? " open" : ""}`} />
        </button>

        <button type="button" className="appbar-logo" onClick={() => navigate("/")}>
          <span className="appbar-logo-mark" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </span>
          <span className="appbar-logo-copy">
            <strong>Mini BI</strong>
            <span>{activeProject?.name ?? "Project"}</span>
          </span>
        </button>
      </div>

      <div className="appbar-center">
        <nav className="appbar-nav" aria-label="Primary navigation">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) => `appbar-nav-link${isActive ? " active" : ""}`}
            >
              <span className="appbar-nav-label">{item.label}</span>
              <span className="appbar-nav-meta">{item.meta}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="appbar-right">
        <label className="appbar-search-wrap" aria-label="Search">
          <span className="appbar-search-icon" aria-hidden="true">
            <SearchIcon />
          </span>
          <input
            className="appbar-search"
            placeholder="Search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>

        <label className="appbar-project-switcher">
          <span className="appbar-control-label">Project</span>
          <select
            className="appbar-select"
            value={activeProjectId}
            onChange={(event) => setActiveProject(event.target.value)}
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <span className="appbar-project-meta">{projectMeta}</span>
        </label>

        <button type="button" className="appbar-btn" onClick={() => navigate("/builder")}>
          <span className="appbar-btn-kicker">New</span>
          <span>New Chart</span>
        </button>

        <button
          type="button"
          className="appbar-theme-btn"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          title={theme === "dark" ? "Light mode" : "Dark mode"}
        >
          <span className="appbar-theme-icon" aria-hidden="true">
            <ThemeIcon theme={theme} />
          </span>
          <span className="appbar-theme-label">{theme === "dark" ? "Light" : "Dark"}</span>
        </button>

        {user ? (
          <button type="button" className="appbar-user" onClick={handleLogout} title="Sign out">
            <div className="avatar-circle">{user.name?.[0]?.toUpperCase() ?? "U"}</div>
            <div className="appbar-user-copy">
              <strong>{user.name ?? "User"}</strong>
              <span>{activeProject?.name ?? activeDashboard?.name ?? activeSheet?.name ?? "Workspace"}</span>
            </div>
          </button>
        ) : null}
      </div>
    </header>
  );
}
