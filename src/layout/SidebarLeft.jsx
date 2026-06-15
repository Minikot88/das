import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useStore } from "../store/useStore";

const NAV_GROUPS = [
  {
    title: "หน้าหลัก",
    items: [{ to: "/", exact: true, icon: "home", label: "หน้าหลัก", hint: "โปรเจกต์" }],
  },
  {
    title: "วิเคราะห์",
    items: [
      { to: "/dashboard", exact: false, icon: "dashboard", label: "แดชบอร์ด", hint: "พื้นที่วิเคราะห์" },
      { to: "/builder", exact: false, icon: "builder", label: "ตัวสร้างกราฟ", hint: "แก้ไขกราฟ" },
    ],
  },
  {
    title: "คลังข้อมูล",
    items: [
      { id: "templates", icon: "templates", label: "เทมเพลต", hint: "เร็วๆ นี้", disabled: true },
      { to: "/datasets", exact: false, icon: "datasets", label: "ชุดข้อมูล", hint: "นำเข้า CSV" },
    ],
  },
  {
    title: "ส่วนตัว",
    items: [
      { id: "favorites", icon: "favorites", label: "รายการโปรด", hint: "เร็วๆ นี้", disabled: true },
      { id: "recent", icon: "recent", label: "ล่าสุด", hint: "เร็วๆ นี้", disabled: true },
    ],
  },
  {
    title: "ตั้งค่า",
    items: [{ to: "/settings", exact: false, icon: "settings", label: "ตั้งค่า", hint: "ค่าการใช้งาน" }],
  },
];

function NavGlyph({ name }) {
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
    templates: <path d="M5 4h6v6H5V4Zm8 0h6v6h-6V4ZM5 14h6v6H5v-6Zm8 0h6v6h-6v-6Z" />,
    datasets: <path d="M5 7c0-1.7 3.1-3 7-3s7 1.3 7 3-3.1 3-7 3-7-1.3-7-3Zm0 0v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5" />,
    favorites: <path d="m12 4 2.5 5 5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.5-.8L12 4Z" />,
    recent: <path d="M12 6v6l4 2m5-2a9 9 0 1 1-2.6-6.4" />,
    settings: <path d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm8 3a7.7 7.7 0 0 0-.1-1l2-1.5-2-3.5-2.4 1a8.8 8.8 0 0 0-1.7-1L15.5 2h-4l-.3 3a8.8 8.8 0 0 0-1.7 1l-2.4-1-2 3.5 2 1.5A7.7 7.7 0 0 0 7 12c0 .3 0 .7.1 1l-2 1.5 2 3.5 2.4-1c.5.4 1.1.7 1.7 1l.3 3h4l.3-3c.6-.3 1.2-.6 1.7-1l2.4 1 2-3.5-2-1.5c.1-.3.1-.7.1-1Z" />,
  };

  return <svg {...common}>{paths[name] ?? paths.home}</svg>;
}

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
    activeProject?.sheets?.find((sheet) => sheet.id === activeSheetId)?.dashboards?.find(
      (dashboard) => dashboard.id === activeDashboardId
    ) ??
    activeSheet?.dashboards?.[0] ??
    null;

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
              <span title={activeProject?.name ?? "พื้นที่ทำงาน"}>{activeProject?.name ?? "พื้นที่ทำงาน"}</span>
            </div>
          ) : null}
        </div>

        <div className="sidebar-top">
          <div className="sidebar-label">
            {!isCollapsed ? (
              <>
                <span>เมนู</span>
                <strong>พื้นที่ทำงาน</strong>
              </>
            ) : (
              "WS"
            )}
          </div>
          <button
            type="button"
            className="sidebar-collapse-btn"
            onClick={toggleSidebar}
            aria-label={isCollapsed ? "ขยายเมนูด้านข้าง" : "ย่อเมนูด้านข้าง"}
            title={isCollapsed ? "ขยาย" : "ย่อ"}
          >
            {isCollapsed ? ">" : "<"}
          </button>
        </div>

        {!isCollapsed ? (
          <div className="sidebar-workspace-card">
            <span className="sidebar-workspace-kicker">พื้นที่ทำงานปัจจุบัน</span>
            <strong title={activeProject?.name ?? "โปรเจกต์"}>{activeProject?.name ?? "โปรเจกต์"}</strong>
            <span
              title={`${activeSheet?.name ?? "ชีต"} / ${activeDashboard?.name ?? "แดชบอร์ด"}`}
            >
              {activeSheet?.name ?? "ชีต"} / {activeDashboard?.name ?? "แดชบอร์ด"}
            </span>
          </div>
        ) : null}

        <div className="sidebar-nav">
          {NAV_GROUPS.map((group) => (
            <section className="sidebar-nav-section" key={group.title}>
              {!isCollapsed ? <h3 className="sidebar-nav-title">{group.title}</h3> : null}
              <div className="sidebar-nav-group">
                {group.items.map((item) =>
                  item.to ? (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.exact}
                      className={({ isActive }) => {
                        const isHomeAlias = item.to === "/" && location.pathname === "/home";
                        return `nav-link${isActive || isHomeAlias ? " active" : ""}${isCollapsed ? " icon-only" : ""}`;
                      }}
                      onClick={() => setMobileMenuOpen(false)}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <span className="nav-icon" aria-hidden="true">
                        <span className="nav-glyph"><NavGlyph name={item.icon} /></span>
                      </span>
                      {!isCollapsed ? (
                        <span className="nav-copy">
                          <span className="nav-label" title={item.label}>
                            {item.label}
                          </span>
                          <small>{item.hint}</small>
                        </span>
                      ) : null}
                    </NavLink>
                  ) : (
                    <span
                      key={item.id}
                      className={`nav-link nav-placeholder${isCollapsed ? " icon-only" : ""}`}
                      aria-disabled="true"
                      title={isCollapsed ? item.label : item.hint}
                    >
                      <span className="nav-icon" aria-hidden="true">
                        <span className="nav-glyph"><NavGlyph name={item.icon} /></span>
                      </span>
                      {!isCollapsed ? (
                        <span className="nav-copy">
                          <span className="nav-label" title={item.label}>
                            {item.label}
                          </span>
                          <small>{item.hint}</small>
                        </span>
                      ) : null}
                    </span>
                  )
                )}
              </div>
            </section>
          ))}
        </div>

        {!isCollapsed ? (
          <div className="sidebar-footer">
            <div className="sidebar-footer-block">
              <span className="sidebar-footer-label">บริบทที่ใช้งาน</span>
              <span className="sidebar-footer-path" title={location.pathname}>
                {location.pathname}
              </span>
            </div>
          </div>
        ) : null}
      </nav>
    </>
  );
}
