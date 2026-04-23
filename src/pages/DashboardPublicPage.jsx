import React, { useEffect, useMemo } from "react";
import { useLocation, useParams } from "react-router-dom";
import DashboardGrid from "../components/dashboard/DashboardGrid";
import ReadOnlyStateCard from "../components/ui/ReadOnlyStateCard";
import { useStore } from "../store/useStore";
import { findDashboardContextById } from "../utils/dashboardWorkspace";
import { resolveDashboardViewOptions } from "../utils/dashboardShareUtils";

function countChartTypes(widgets = []) {
  return new Set(widgets.map((widget) => widget.type).filter(Boolean)).size;
}

export default function DashboardPublicPage() {
  const { dashboardId, mode = "view" } = useParams();
  const location = useLocation();
  const projects = useStore((state) => state.projects);
  const charts = useStore((state) => state.charts);
  const storeTheme = useStore((state) => state.theme);
  const viewOptions = useMemo(
    () => resolveDashboardViewOptions(location.search, mode),
    [location.search, mode]
  );
  const dashboardContext = useMemo(
    () => findDashboardContextById(projects, charts, dashboardId),
    [charts, dashboardId, projects]
  );
  const effectiveTheme = viewOptions.theme === "auto" ? storeTheme : viewOptions.theme;

  useEffect(() => {
    const body = document.body;
    const previousDarkState = body.classList.contains("dark");

    body.classList.add("dashboard-public-open");
    if (viewOptions.theme !== "auto") {
      body.classList.toggle("dark", viewOptions.theme === "dark");
    }

    return () => {
      body.classList.remove("dashboard-public-open");
      if (viewOptions.theme !== "auto") {
        body.classList.toggle("dark", previousDarkState);
      }
    };
  }, [viewOptions.theme]);

  if (!dashboardContext) {
    return (
      <div className="dashboard-public-page is-empty">
        <ReadOnlyStateCard
          kicker="ไม่พร้อมใช้งาน"
          title="ไม่พบแดชบอร์ด"
          description="ลิงก์สำหรับแชร์หรือฝังนี้ไม่ชี้ไปยังแดชบอร์ดที่ใช้งานได้แล้ว"
        />
      </div>
    );
  }

  const { project, sheet, dashboard, widgets } = dashboardContext;
  const chartCount = widgets.length;
  const chartTypes = countChartTypes(widgets);
  const showHeader = viewOptions.showHeader;
  const isEmbedMode = mode === "embed";
  const pagePadding = isEmbedMode ? 0 : 16;
  const pageGap = showHeader ? 16 : 0;
  const pageBackground = isEmbedMode
    ? "var(--app-bg)"
    : "linear-gradient(180deg, var(--app-bg) 0%, color-mix(in srgb, var(--surface) 96%, var(--primary) 4%) 100%)";

  return (
    <div
      className={`dashboard-public-page${isEmbedMode ? " is-embed" : " is-view"}${effectiveTheme === "dark" ? " is-dark" : ""}`}
      style={{
        minHeight: "100dvh",
        width: isEmbedMode ? "100vw" : "100%",
        padding: pagePadding,
        display: "flex",
        flexDirection: "column",
        gap: pageGap,
        background: pageBackground,
      }}
    >
      {showHeader ? (
        <header
          className="dashboard-public-header"
          style={{
            width: "100%",
            maxWidth: "none",
            margin: 0,
            borderRadius: isEmbedMode ? 0 : 22,
            padding: isEmbedMode ? "14px 16px" : "18px 20px",
            boxShadow: "none",
          }}
        >
          <div className="dashboard-public-header-copy">
            <span className="dashboard-public-kicker">{isEmbedMode ? "แดชบอร์ดแบบฝังเว็บไซต์" : "แดชบอร์ดสำหรับแชร์"}</span>
            <h1 className="dashboard-public-title">{dashboard.name}</h1>
            <div className="dashboard-public-breadcrumb">
              <span>{project.name}</span>
              <span>/</span>
              <span>{sheet.name}</span>
              <span>/</span>
              <span>{isEmbedMode ? "ดูอย่างเดียว" : "มุมมองสาธารณะ"}</span>
            </div>
          </div>
          <div className="dashboard-public-stats">
            <div className="dashboard-public-stat">
              <span>กราฟ</span>
              <strong>{chartCount}</strong>
            </div>
            <div className="dashboard-public-stat">
              <span>ประเภท</span>
              <strong>{chartTypes}</strong>
            </div>
            <div className="dashboard-public-stat">
              <span>โหมด</span>
              <strong>{isEmbedMode ? "ฝังเว็บ" : "ดูอย่างเดียว"}</strong>
            </div>
          </div>
        </header>
      ) : null}

      <main
        className="dashboard-public-shell"
        style={{
          flex: 1,
          minHeight: 0,
          width: "100%",
          maxWidth: "none",
          margin: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {widgets.length ? (
          <div
            className="dashboard-public-frame"
            style={{
              flex: 1,
              minHeight: 0,
              width: "100%",
              maxWidth: "none",
              padding: isEmbedMode ? 12 : 16,
              margin: 0,
              border: isEmbedMode ? 0 : "1px solid var(--border)",
              borderRadius: isEmbedMode ? 0 : 22,
              boxShadow: "none",
              background: isEmbedMode ? "transparent" : "var(--surface)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                flex: 1,
                minHeight: isEmbedMode ? 0 : 360,
                width: "100%",
              }}
            >
              <DashboardGrid
                widgets={widgets}
                layout={dashboard.layout ?? []}
                isEditable={false}
                isSelectable={false}
                themeMode={viewOptions.theme === "auto" ? undefined : viewOptions.theme}
                className={isEmbedMode ? "is-embed-mode" : "is-public-mode"}
              />
            </div>
          </div>
        ) : (
          <ReadOnlyStateCard
            kicker="ยังไม่มีวิดเจ็ต"
            title="แดชบอร์ดนี้ยังไม่มีกราฟ"
            description="เพิ่มกราฟลงในแดชบอร์ดก่อน แล้วจึงแชร์หรือฝังเว็บไซต์ได้"
          />
        )}
      </main>
    </div>
  );
}
