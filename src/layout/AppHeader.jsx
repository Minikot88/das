import React, { useCallback, useEffect, useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useStore } from "../store/useStore";
import CommandPaletteModal from "../components/bi/CommandPaletteModal";
import DatasetExplorerModal from "../components/bi/DatasetExplorerModal";
import { TEMPLATE_GALLERY_CATALOG } from "../data/templateGalleryCatalog";
import { createBuilderContextForDashboard } from "../utils/dashboardWorkspace";
import { getStorageHealth, subscribeStorageHealth } from "../utils/storage";

const NAV_ITEMS = [
  { to: "/", label: "หน้าหลัก", meta: "โปรเจกต์", icon: "home" },
  { to: "/dashboard", label: "แดชบอร์ด", meta: "พื้นที่วิเคราะห์", icon: "dashboard" },
  { to: "/builder", label: "ตัวสร้างกราฟ", meta: "แก้ไขกราฟ", icon: "builder" },
];

function HeaderNavIcon({ name }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: 1.8,
    viewBox: "0 0 24 24",
    "aria-hidden": "true",
  };

  const paths = {
    home: <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1v-9.5Z" />,
    dashboard: <path d="M4 5h7v7H4V5Zm9 0h7v4h-7V5ZM4 14h7v5H4v-5Zm9-3h7v8h-7v-8Z" />,
    builder: <path d="M5 5h14M5 12h9M5 19h5m8-8 2 2-6.5 6.5H11v-2.5L17.5 10Z" />,
  };

  return <svg {...common}>{paths[name] ?? paths.home}</svg>;
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
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [datasetExplorerOpen, setDatasetExplorerOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [storageHealth, setStorageHealth] = useState(() => getStorageHealth());
  const setActiveProject = useStore((s) => s.setActiveProject);

  const navigate = useNavigate();
  const location = useLocation();

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
    const dashboardCount =
      activeProject?.sheets?.reduce(
        (count, sheet) => count + (sheet?.dashboards?.length ?? 0),
        0
      ) ?? 0;
    return `${sheetCount} ชีต / ${dashboardCount} แดชบอร์ด`;
  }, [activeProject]);

  const quickBuilderContext = useMemo(
    () =>
      createBuilderContextForDashboard({
        projectId: activeProject?.id,
        sheetId: activeSheet?.id,
        dashboardId: activeDashboard?.id,
        returnTo: "/dashboard",
        source: "command-palette",
      }),
    [activeDashboard?.id, activeProject?.id, activeSheet?.id]
  );

  const commandActions = useMemo(
    () => [
      {
        id: "go-home",
        label: "ไปหน้าหลัก",
        detail: "เปิดพื้นที่โปรเจกต์",
        group: "การนำทาง",
        shortcut: "Ctrl",
        onActivate: () => navigate("/"),
      },
      {
        id: "go-dashboard",
        label: "เปิดแดชบอร์ด",
        detail: "เปิดพื้นที่วิเคราะห์หลัก",
        group: "การนำทาง",
        shortcut: "D",
        onActivate: () => navigate("/dashboard"),
      },
      {
        id: "go-builder",
        label: "เปิดตัวสร้างกราฟ",
        detail: "สร้างหรือแก้ไขกราฟ",
        group: "การนำทาง",
        shortcut: "C",
        onActivate: () => navigate("/builder"),
      },
      {
        id: "open-dataset-explorer",
        label: "เปิดตัวสำรวจชุดข้อมูล",
        detail: "ตรวจฟิลด์และข้อมูลตัวอย่าง",
        group: "ข้อมูล",
        shortcut: "Ctrl+D",
        onActivate: null,
      },
      ...TEMPLATE_GALLERY_CATALOG.map((template) => ({
        id: `template-${template.id}`,
        label: template.title,
        detail: `${template.category} - ${template.hint}`,
        group: "แกลเลอรีเทมเพลต",
        onActivate: () => {
          if (quickBuilderContext) {
            navigate("/builder", {
              state: {
                builderContext: {
                  ...quickBuilderContext,
                  prefillTemplateId: template.prefillTemplateId,
                },
              },
            });
          } else {
            navigate("/builder");
          }
        },
      })),
    ],
    [navigate, quickBuilderContext]
  );

  const openCommandPalette = useCallback(() => {
    setCommandPaletteOpen(true);
  }, []);

  const closeCommandPalette = useCallback(() => {
    setCommandPaletteOpen(false);
  }, []);

  const openDatasetExplorer = useCallback(() => {
    closeCommandPalette();
    setDatasetExplorerOpen(true);
  }, [closeCommandPalette]);

  useEffect(() => subscribeStorageHealth(setStorageHealth), []);

  useEffect(() => {
    function handleShortcut(event) {
      const target = event.target;
      const isInputElement =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k" && !isInputElement) {
        event.preventDefault();
        openCommandPalette();
      }
    }

    document.addEventListener("keydown", handleShortcut);
    return () => {
      document.removeEventListener("keydown", handleShortcut);
    };
  }, [openCommandPalette]);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <>
      {!storageHealth.ok ? (
        <div className="storage-health-banner" role="alert">
          {storageHealth.message || "การเปลี่ยนแปลงพื้นที่ทำงานอาจไม่ถูกบันทึก"}
        </div>
      ) : null}
      <header className="appbar" role="banner">
        <div className="appbar-left">
          <button
            type="button"
            className="appbar-hamburger"
            onClick={toggleMobileMenu}
            aria-label={mobileMenuOpen ? "ปิดเมนู" : "เปิดเมนู"}
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
              <span>{activeProject?.name ?? "พื้นที่ทำงานเริ่มต้น"}</span>
            </span>
          </button>

          <div className="appbar-workspace-context">
            <span className="appbar-kicker">พื้นที่ทำงาน</span>
            <strong>{activeProject?.name ?? "พื้นที่ทำงานเริ่มต้น"}</strong>
            <span>{projectMeta}</span>
          </div>
        </div>

        <div className="appbar-center">
          <label className="appbar-search-wrap">
            <span className="appbar-search-icon" aria-hidden="true">
              <svg viewBox="0 0 20 20" fill="none">
                <path
                  d="M18 18L14.2 14.2M15.5 9.2a6.3 6.3 0 1 1-12.6 0 6.3 6.3 0 0 1 12.6 0Z"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <input
              type="text"
              className="appbar-search"
              placeholder="ค้นหาแดชบอร์ด กราฟ ชุดข้อมูล"
              aria-label="ค้นหา"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              onFocus={openCommandPalette}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  openCommandPalette();
                }
              }}
            />
          </label>

          <nav className="appbar-nav" aria-label="เมนูนำทางหลัก">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) => {
                  const isHomeAlias = item.to === "/" && location.pathname === "/home";
                  return `appbar-nav-link${isActive || isHomeAlias ? " active" : ""}`;
                }}
            >
                <span className="appbar-nav-icon" aria-hidden="true">
                  <HeaderNavIcon name={item.icon} />
                </span>
                <span className="appbar-nav-copy">
                  <span className="appbar-nav-label">{item.label}</span>
                  <span className="appbar-nav-meta">{item.meta}</span>
                </span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="appbar-right">
          <div className="appbar-project-switcher">
            <span className="appbar-control-label">โปรเจกต์</span>
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
          </div>

          <div className="appbar-quick-actions">
            <button type="button" className="appbar-btn appbar-command-btn" onClick={openCommandPalette}>
              <span className="appbar-btn-kicker">Ctrl</span>
              <span>คำสั่ง</span>
            </button>
            <button type="button" className="appbar-btn" onClick={() => navigate("/builder")}>
              <span className="appbar-btn-kicker">ใหม่</span>
              <span>กราฟ</span>
            </button>
          </div>

          <div className="appbar-theme-control">
            <button
              type="button"
              className="appbar-theme-btn"
              onClick={toggleTheme}
              aria-label="สลับธีม"
              title={theme === "dark" ? "โหมดสว่าง" : "โหมดมืด"}
            >
              <span className="appbar-theme-icon" aria-hidden="true">
                <ThemeIcon theme={theme} />
              </span>
              <span className="appbar-theme-label">{theme === "dark" ? "สว่าง" : "มืด"}</span>
            </button>
          </div>

          {user ? (
            <div className="appbar-user-area">
              <button type="button" className="appbar-user" onClick={handleLogout} title="ออกจากระบบ">
                <div className="avatar-circle">{user.name?.[0]?.toUpperCase() ?? "U"}</div>
                <div className="appbar-user-copy">
                  <strong>{user.name ?? "ผู้ใช้"}</strong>
                  <span>{activeProject?.name ?? activeDashboard?.name ?? activeSheet?.name ?? "พื้นที่ทำงาน"}</span>
                </div>
              </button>
            </div>
          ) : null}
        </div>
      </header>

      <CommandPaletteModal
        isOpen={commandPaletteOpen}
        actions={commandActions}
        onClose={closeCommandPalette}
        onOpenDatasetExplorer={openDatasetExplorer}
      />
      <DatasetExplorerModal isOpen={datasetExplorerOpen} onClose={() => setDatasetExplorerOpen(false)} />
    </>
  );
}
