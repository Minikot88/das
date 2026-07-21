import React, { useEffect, useMemo } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useState } from "react";
import DashboardGrid from "@/components/dashboard/DashboardGrid";
import ReadOnlyStateCard from "@modules/sharing/components/ReadOnlyStateCard";
import { useStore } from "@/store/useStore";
import { findDashboardContextById } from "@/utils/dashboardWorkspace";
import { resolveDashboardViewOptions } from "@modules/sharing/lib/dashboardShareUtils";
import { normalizeLocalShareRecord, resolveLocalShare, validateLocalShare } from "@domain/shares/localShareContract";
import { useWorkspaceSelector } from "@domain/workspace/workspaceSelectors";

function countChartTypes(widgets = []) {
  return new Set(widgets.map((widget) => widget.type).filter(Boolean)).size;
}

function getRouteMode(pathname = "", routeMode = "") {
  if (routeMode === "embed" || pathname.endsWith("/embed")) return "embed";
  return "view";
}

function CanvasSnapshotWidget({ widget }) {
  if (widget.type === "kpi") {
    return (
      <article className="dashboard-public-snapshot-card is-kpi" aria-label={widget.config?.metricTitle || widget.title || "KPI"}>
        <span>{widget.config?.metricTitle || widget.title || "KPI"}</span>
        <strong>{widget.config?.value || "—"}</strong>
        <small>{widget.config?.comparison || "ไม่มีข้อมูลเปรียบเทียบ"}</small>
      </article>
    );
  }
  if (widget.type === "text") {
    return (
      <article className="dashboard-public-snapshot-card is-text">
        <strong>{widget.title || "ข้อความ"}</strong>
        <p>{widget.config?.text || ""}</p>
      </article>
    );
  }
  if (widget.type === "image") {
    return (
      <article className="dashboard-public-snapshot-card is-image">
        {widget.config?.src ? <img src={widget.config.src} alt={widget.title || widget.config?.fileName || "รูปภาพ"} /> : null}
        {!widget.config?.src ? <span>รูปภาพเป็น asset เฉพาะเซสชันและไม่อยู่ใน snapshot นี้</span> : null}
      </article>
    );
  }
  return (
    <article className="dashboard-public-snapshot-card">
      <strong>{widget.title || widget.config?.title || widget.type || "วิดเจ็ต"}</strong>
      <span>{widget.type === "chart" ? "กราฟ snapshot แบบอ่านอย่างเดียว" : "วิดเจ็ตแบบอ่านอย่างเดียว"}</span>
    </article>
  );
}

function CanvasSnapshotView({ widgets }) {
  return (
    <div className="dashboard-public-snapshot-grid" role="list" aria-label="วิดเจ็ตใน snapshot">
      {widgets.map((widget) => (
        <div
          key={widget.id}
          role="listitem"
          style={{
            gridColumn: `span ${Math.max(2, Math.min(12, Math.round((Number(widget.w) || 30) / 15)))}`,
            minHeight: Math.max(120, Math.min(420, (Number(widget.h) || 18) * 6)),
          }}
        >
          <CanvasSnapshotWidget widget={widget} />
        </div>
      ))}
    </div>
  );
}

export default function DashboardPublicPage() {
  const { dashboardId, mode: routeMode } = useParams();
  const location = useLocation();
  const projects = useStore((state) => state.projects);
  const charts = useStore((state) => state.charts);
  const storeTheme = useStore((state) => state.theme);
  const resolveShareLink = useStore((state) => state.resolveShareLink);
  const [viewedAt, setViewedAt] = useState(() => Date.now());
  const workspaceSnapshot = useWorkspaceSelector((snapshot) => snapshot);
  const mode = getRouteMode(location.pathname, routeMode);
  const shareId = useMemo(() => new URLSearchParams(location.search).get("share") ?? "", [location.search]);
  const canonicalShare = useMemo(
    () => resolveLocalShare(workspaceSnapshot, shareId, { now: new Date(viewedAt).toISOString() }),
    [shareId, viewedAt, workspaceSnapshot]
  );
  const shareRecord = useMemo(() => (
    canonicalShare.status === "missing"
      ? normalizeLocalShareRecord(resolveShareLink(shareId))
      : normalizeLocalShareRecord(canonicalShare.share)
  ), [canonicalShare, resolveShareLink, shareId]);
  const legacyDashboardContext = useMemo(() => (
    canonicalShare.status === "missing" && shareRecord
      ? findDashboardContextById(projects, charts, shareRecord.dashboardId)
      : null
  ), [canonicalShare.status, charts, projects, shareRecord]);
  const shareState = useMemo(() => {
    if (canonicalShare.status !== "missing") return canonicalShare.status;
    if (!shareRecord) return "missing";
    if (!legacyDashboardContext || !validateLocalShare(shareRecord, {
      project: legacyDashboardContext.project,
      dashboard: legacyDashboardContext.dashboard,
    }).valid) return "invalid";
    if (shareRecord.expiresAt && Date.parse(shareRecord.expiresAt) <= viewedAt) return "expired";
    return "ready";
  }, [canonicalShare.status, legacyDashboardContext, shareRecord, viewedAt]);
  useEffect(() => {
    const expiresAt = Date.parse(shareRecord?.expiresAt ?? "");
    if (!Number.isFinite(expiresAt)) return undefined;
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) {
      setViewedAt(Date.now());
      return undefined;
    }
    const timer = window.setTimeout(() => setViewedAt(Date.now()), remaining + 1);
    return () => window.clearTimeout(timer);
  }, [shareRecord?.expiresAt]);
  const viewOptions = useMemo(
    () => resolveDashboardViewOptions(location.search, mode),
    [location.search, mode]
  );
  const dashboardContext = useMemo(
    () => {
      if (shareState !== "ready" || shareRecord.dashboardId !== dashboardId) return null;
      if (shareRecord.snapshot?.dashboardId === dashboardId) {
        return {
          project: { name: shareRecord.snapshot.projectName ?? "พื้นที่ทำงานที่แชร์" },
          sheet: { name: shareRecord.snapshot.sheetName ?? "ชีตที่แชร์" },
          dashboard: {
            id: dashboardId,
            name: shareRecord.snapshot.dashboardName ?? "แดชบอร์ดที่แชร์",
            layout: shareRecord.snapshot.layout ?? [],
          },
          widgets: shareRecord.snapshot.widgets ?? [],
          snapshot: shareRecord.snapshot,
        };
      }
      const context = findDashboardContextById(projects, charts, dashboardId);
      if (shareRecord.projectId && context?.project?.id !== shareRecord.projectId) return null;
      if (shareRecord.sheetId && context?.sheet?.id !== shareRecord.sheetId) return null;
      return context;
    },
    [charts, dashboardId, projects, shareRecord, shareState]
  );
  const effectiveTheme = viewOptions.theme === "auto" ? storeTheme : viewOptions.theme;

  useEffect(() => {
    document.title = dashboardContext
      ? `${dashboardContext.dashboard.name} | Mini BI`
      : "Local share unavailable | Mini BI";
  }, [dashboardContext]);

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
      <main className="dashboard-public-page is-empty">
        <ReadOnlyStateCard
          headingLevel={1}
          kicker="ไม่พร้อมใช้งาน"
          title="ไม่พบแดชบอร์ด"
          description={shareState === "expired"
            ? "ลิงก์ภายในเบราว์เซอร์นี้หมดอายุแล้ว กรุณาสร้างลิงก์ใหม่จากหน้าแดชบอร์ด"
            : shareState === "invalid"
              ? "ข้อมูลแชร์ภายในเครื่องไม่สมบูรณ์หรือไม่ผ่านการตรวจสอบ"
              : "ไม่พบลิงก์นี้ในเบราว์เซอร์ปัจจุบัน ลิงก์แบบ Local ใช้งานได้เฉพาะโปรไฟล์เบราว์เซอร์ที่สร้างลิงก์"}
        />
      </main>
    );
  }

  const { project, sheet, dashboard, widgets, snapshot } = dashboardContext;
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
            <span className="dashboard-public-kicker">{isEmbedMode ? "แดชบอร์ด Local แบบฝัง" : "แดชบอร์ด Local แบบอ่านอย่างเดียว"}</span>
            <h1 className="dashboard-public-title">{dashboard.name}</h1>
            <div className="dashboard-public-breadcrumb">
              <span>{project.name}</span>
              <span>/</span>
              <span>{sheet.name}</span>
              <span>/</span>
              <span>{isEmbedMode ? "ดูอย่างเดียว" : "Local snapshot"}</span>
            </div>
            {snapshot?.contextItems?.length ? (
              <div className="dashboard-public-breadcrumb">
                {snapshot.contextItems.slice(0, 4).map((item) => <span key={item}>{item}</span>)}
              </div>
            ) : null}
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
        {!showHeader ? <h1 className="sr-only">{dashboard.name}</h1> : null}
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
              {snapshot?.canvasSettings ? (
                <CanvasSnapshotView widgets={widgets} />
              ) : (
                <DashboardGrid
                  widgets={widgets}
                  layout={dashboard.layout ?? []}
                  isEditable={false}
                  isSelectable={false}
                  themeMode={viewOptions.theme === "auto" ? undefined : viewOptions.theme}
                  className={isEmbedMode ? "is-embed-mode" : "is-public-mode"}
                />
              )}
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
