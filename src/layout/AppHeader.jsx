/**
 * AppHeader.jsx — Enterprise BI header.
 * - Center navigation (Home | Dashboard | Builder)
 * - Active project breadcrumb
 * - Mobile hamburger to open sidebar drawer
 * - Theme toggle, user avatar + logout
 */
import React, { useState } from "react";
import { useStore } from "../store/useStore";
import { useNavigate, NavLink } from "react-router-dom";

export default function AppHeader() {
  const theme            = useStore((s) => s.theme);
  const toggleTheme      = useStore((s) => s.toggleTheme);
  const user             = useStore((s) => s.user);
  const logout           = useStore((s) => s.logout);
  const kpiBarVisible    = useStore((s) => s.kpiBarVisible);
  const toggleKpiBar     = useStore((s) => s.toggleKpiBar);
  const mobileMenuOpen   = useStore((s) => s.mobileMenuOpen);
  const toggleMobileMenu = useStore((s) => s.toggleMobileMenu);

  const projects         = useStore((s) => s.projects);
  const activeProjectId  = useStore((s) => s.activeProjectId);
  const setActiveProject = useStore((s) => s.setActiveProject);

  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <header className="appbar" role="banner">
      {/* LEFT: Logo & Menu Toggle */}
      <div className="appbar-left">
        <button
          className="appbar-hamburger"
          onClick={toggleMobileMenu}
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
        >
          <span className={`hamburger-line${mobileMenuOpen ? " open" : ""}`} />
          <span className={`hamburger-line${mobileMenuOpen ? " open" : ""}`} />
          <span className={`hamburger-line${mobileMenuOpen ? " open" : ""}`} />
        </button>

        <div className="appbar-logo" onClick={() => navigate("/")} style={{ cursor:"pointer" }}>
          <span className="logo">Mini BI</span>
        </div>
      </div>

      {/* CENTER: Breadcrumbs or Page Title */}
      <div className="appbar-center">
        <nav className="nav-links">
          <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>Home</NavLink>
          <NavLink to="/dashboard" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>Dashboard</NavLink>
          <NavLink to="/builder" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>Builder</NavLink>
        </nav>
      </div>

      {/* RIGHT: Modern Actions & User */}
      <div className="appbar-right">
        <input
          className="appbar-search"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="appbar-select"
          value={activeProjectId}
          onChange={(e) => setActiveProject(e.target.value)}
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <button className="appbar-btn" onClick={() => navigate("/builder")}>+ New</button>

        <div className="appbar-icon" onClick={toggleKpiBar} title="KPI Notifications">🔔</div>

        <button className="appbar-theme-btn" onClick={toggleTheme}>
          {theme === "dark" ? "☀" : "☾"}
        </button>

        {user && (
          <div className="appbar-user" onClick={handleLogout} title="Sign Out">
            <div className="avatar-circle">
              {user.name?.[0]?.toUpperCase() ?? "U"}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
