import React, { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import AppHeader from "../../layout/AppHeader";
import SidebarLeft from "../../layout/SidebarLeft";
import SidebarRight from "../../layout/SidebarRight";
import { useStore } from "../../store/useStore";

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
  const sidebarCollapsed = useStore((state) => state.sidebarCollapsed);
  const setMobileMenuOpen = useStore((state) => state.setMobileMenuOpen);
  const location = useLocation();

  useEffect(() => {
    document.body.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname, setMobileMenuOpen]);

  const isWorkspaceRoute = location.pathname === "/dashboard" || location.pathname === "/builder";

  return (
    <div className={joinClassNames("shell", sidebarCollapsed && "sidebar-collapsed")}>
      <AppHeader />
      <div className="body-row">
        <SidebarLeft />
        <main className="main-content" id="main-content" role="main">
          <Outlet />
        </main>
        {!isWorkspaceRoute ? <SidebarRight /> : null}
      </div>
    </div>
  );
}

export default MainLayout;
