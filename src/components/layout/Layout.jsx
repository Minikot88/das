import React, { useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import AppHeader from "../../layout/AppHeader";
import SidebarRight from "../../layout/SidebarRight";
import { useStore } from "../../store/useStore";
import { applyThemeMode } from "../../utils/themeMode";

const ROUTE_TITLES = {
  "/": "Home",
  "/home": "Home",
  "/dashboard": "Dashboard",
  "/dashboard-v2": "Chart Designer",
  "/dashboard-legacy": "Dashboard workspace",
  "/builder": "Chart Builder",
  "/connections": "Connections",
  "/datasets": "Datasets",
  "/settings": "Settings",
};

function joinClassNames(...values) {
  return values.filter(Boolean).join(" ");
}

export function PageContainer({ children, className = "", ...props }) {
  return (
    <div className={joinClassNames("ui-page-container", className)} {...props}>
      {children}
    </div>
  );
}

export function PageHeader({
  kicker,
  title,
  subtitle,
  actions = null,
  children = null,
  className = "",
}) {
  return (
    <header className={joinClassNames("ui-page-header", className)}>
      <div className="ui-page-header-main">
        <div className="ui-page-header-copy">
          {kicker ? <span className="ui-page-kicker">{kicker}</span> : null}
          {title ? <h1 className="ui-page-title">{title}</h1> : null}
          {subtitle ? <p className="ui-page-subtitle">{subtitle}</p> : null}
        </div>
        {actions}
      </div>
      {children}
    </header>
  );
}

export function Toolbar({ left, right, className = "" }) {
  return (
    <div className={joinClassNames("ui-toolbar", className)}>
      <div className="ui-toolbar-group">{left}</div>
      <div className="ui-toolbar-group">{right}</div>
    </div>
  );
}

export function InspectorLayout({ children, className = "", ...props }) {
  return (
    <aside className={joinClassNames("ui-inspector", className)} {...props}>
      {children}
    </aside>
  );
}

export function WorkspaceLayout({ columns = "two", className = "", children, ...props }) {
  const columnClass = columns === "three" ? "is-three-column" : "is-two-column";

  return (
    <div className={joinClassNames("ui-workspace", columnClass, className)} {...props}>
      {children}
    </div>
  );
}

export function MainLayout() {
  const theme = useStore((state) => state.theme);
  const density = useStore((state) => state.appSettings.density);
  const sidebarCollapsed = useStore((state) => state.sidebarCollapsed);
  const setMobileMenuOpen = useStore((state) => state.setMobileMenuOpen);
  const location = useLocation();
  const mainRef = useRef(null);

  useEffect(() => {
    applyThemeMode(theme);
  }, [theme]);

  useEffect(() => {
    document.body.classList.remove("density-compact", "density-comfortable", "density-spacious");
    document.body.classList.add(`density-${density}`);
  }, [density]);

  useEffect(() => {
    const isBuilderRoute = location.pathname === "/builder";
    document.body.classList.toggle("builder-route-active", isBuilderRoute);

    return () => {
      document.body.classList.remove("builder-route-active");
    };
  }, [location.pathname]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname, setMobileMenuOpen]);

  useEffect(() => {
    const routeTitle = ROUTE_TITLES[location.pathname] ?? "Workspace";
    document.title = `${routeTitle} | Mini BI`;
    const frameId = window.requestAnimationFrame(() => {
      mainRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [location.pathname]);

  const isDashboardCanvasRoute = location.pathname === "/dashboard";
  const isChartDesignerRoute = location.pathname === "/dashboard-v2";
  const isWorkspaceRoute =
    isDashboardCanvasRoute ||
    isChartDesignerRoute ||
    location.pathname === "/dashboard-legacy" ||
    location.pathname === "/builder";
  const isHomeRoute = location.pathname === "/" || location.pathname === "/home";
  const isBuilderRoute = location.pathname === "/builder";
  const isConnectionRoute = location.pathname === "/connections";
  const shellClassName = joinClassNames(
    "shell",
    "mini-bi-ribbon-shell",
    "mini-bi-app-shell",
    sidebarCollapsed && "sidebar-collapsed",
    isWorkspaceRoute && "is-workspace-route",
    isBuilderRoute && "is-builder-route",
    isConnectionRoute && "is-connection-route",
    isDashboardCanvasRoute && "is-dashboard-canvas-route",
    isChartDesignerRoute && "is-chart-designer-route"
  );
  const mainClassName = joinClassNames(
    "main-content",
    isWorkspaceRoute && "is-workspace-route",
    isBuilderRoute && "is-builder-route",
    isConnectionRoute && "is-connection-route",
    isDashboardCanvasRoute && "is-dashboard-canvas-route",
    isChartDesignerRoute && "is-chart-designer-route"
  );

  return (
    <div className={shellClassName}>
      <a className="skip-link" href="#main-content">ข้ามไปยังเนื้อหาหลัก</a>
      <AppHeader />
      <div className="body-row">
        <main ref={mainRef} className={mainClassName} id="main-content" role="main" tabIndex={-1}>
          <Outlet />
        </main>
        {!isWorkspaceRoute && !isHomeRoute && !isConnectionRoute ? <SidebarRight /> : null}
      </div>
    </div>
  );
}

export default MainLayout;
