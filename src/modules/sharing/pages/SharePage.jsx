import React, { useEffect, useMemo, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { useStore } from "@/store/useStore";
import { normalizeLocalShareRecord, resolveLocalShare, validateLocalShare } from "@domain/shares/localShareContract";
import { useWorkspaceSelector } from "@domain/workspace/workspaceSelectors";
import { findDashboardContextById } from "@modules/dashboards/lib/dashboardWorkspace";
import ReadOnlyDashboardHeader from "@modules/sharing/components/ReadOnlyDashboardHeader";
import ReadOnlyChartFrame from "@modules/sharing/components/ReadOnlyChartFrame";
import ReadOnlyStateCard from "@modules/sharing/components/ReadOnlyStateCard";

export default function SharePage() {
  const { sheetId } = useParams();
  const projects = useStore((state) => state.projects);
  const chartsPool = useStore((state) => state.charts);
  const resolveShareLink = useStore((state) => state.resolveShareLink);
  const workspaceSnapshot = useWorkspaceSelector((snapshot) => snapshot);
  const [loading, setLoading] = useState(true);
  const [viewedAt] = useState(() => Date.now());

  const shareResolution = useMemo(() => {
    const canonical = resolveLocalShare(workspaceSnapshot, sheetId);
    if (canonical.status !== "missing") return canonical;

    const legacyShare = normalizeLocalShareRecord(resolveShareLink(sheetId));
    if (!legacyShare) return canonical;
    const context = findDashboardContextById(projects, chartsPool, legacyShare.dashboardId);
    const validation = validateLocalShare(legacyShare, {
      project: context?.project,
      dashboard: context?.dashboard,
    });
    if (!context || !validation.valid) {
      return { status: "invalid", share: legacyShare, project: context?.project ?? null, dashboard: context?.dashboard ?? null };
    }
    if (legacyShare.expiresAt && Date.parse(legacyShare.expiresAt) <= viewedAt) {
      return { status: "expired", share: legacyShare, project: context.project, dashboard: context.dashboard };
    }
    return { status: "ready", share: legacyShare, project: context.project, dashboard: context.dashboard };
  }, [chartsPool, projects, resolveShareLink, sheetId, viewedAt, workspaceSnapshot]);

  // The legacy route never renders mutable live Sheet data. Valid records are
  // handed to the same readonly snapshot route as current share links.
  const sheet = null;

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 180);
    return () => window.clearTimeout(timer);
  }, [sheetId, sheet]);

  const activeDashboard = sheet?.dashboards?.[0] ?? null;
  const dashboardCharts = useMemo(() => {
    if (!activeDashboard?.layout) return [];

    return activeDashboard.layout
      .map((item) => {
        const savedChart = chartsPool.find((chart) => chart.id === item.chartId);
        if (!savedChart) return null;

        return {
          ...savedChart,
          id: item.i,
          chartId: savedChart.id,
          title: item.titleOverride || savedChart.title || savedChart.name,
          name: item.titleOverride || savedChart.title || savedChart.name,
          rows: Array.isArray(savedChart.rows)
            ? savedChart.rows
            : Array.isArray(savedChart.data)
              ? savedChart.data
              : savedChart.config?.rows ?? [],
        };
      })
      .filter(Boolean);
  }, [activeDashboard, chartsPool]);

  const shareSummary = useMemo(() => {
    if (!dashboardCharts.length) {
      return {
        chartCount: 0,
        chartTypes: 0,
        primaryDataset: "ไม่มีชุดข้อมูล",
        updatedLabel: "พร้อมใช้",
      };
    }

    const typeSet = new Set();
    const datasetCounts = new Map();

    for (const chart of dashboardCharts) {
      if (chart.type) typeSet.add(chart.type);
      if (chart.dataset) {
        datasetCounts.set(chart.dataset, (datasetCounts.get(chart.dataset) ?? 0) + 1);
      }
    }

    const primaryDataset = [...datasetCounts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? "ไม่มีชุดข้อมูล";

    return {
      chartCount: dashboardCharts.length,
      chartTypes: typeSet.size,
      primaryDataset,
      updatedLabel: activeDashboard?.name ? "เผยแพร่แล้ว" : "พร้อมใช้",
    };
  }, [activeDashboard?.name, dashboardCharts]);

  const dashboardTitle = activeDashboard?.name ?? "แดชบอร์ดที่แชร์";

  useEffect(() => {
    document.title = loading
      ? "Loading Local share | Mini BI"
      : sheet
        ? `${dashboardTitle} | Mini BI`
        : "Local share unavailable | Mini BI";
  }, [dashboardTitle, loading, sheet]);

  if (shareResolution.status === "ready") {
    return (
      <Navigate
        replace
        to={`/dashboard/${encodeURIComponent(shareResolution.share.dashboardId)}/view?share=${encodeURIComponent(shareResolution.share.id)}`}
      />
    );
  }

  if (loading) {
    return (
      <main className="share-page share-page-shell">
        <ReadOnlyStateCard
          headingLevel={1}
          loading
          kicker="กำลังเตรียมมุมมองที่แชร์"
          title="กำลังโหลดแดชบอร์ด"
          description="โปรดรอสักครู่"
        />
      </main>
    );
  }

  if (!sheet) {
    return (
      <main className="share-page share-page-shell">
        <ReadOnlyStateCard
          headingLevel={1}
          kicker="ลิงก์ไม่พร้อมใช้งาน"
          title="ไม่พบแดชบอร์ด"
          description="ลิงก์ที่แชร์นี้อาจหมดอายุหรือถูกลบแล้ว"
          linkTo="/login"
          linkLabel="ไปหน้าเข้าสู่ระบบ"
        />
      </main>
    );
  }

  return (
    <main className="share-page share-page-shell">
      <ReadOnlyDashboardHeader
        title={sheet?.name ?? "ชีตที่แชร์"}
        dashboardName={dashboardTitle}
        chartCount={dashboardCharts.length}
        chartTypes={shareSummary.chartTypes}
        primaryDataset={shareSummary.primaryDataset}
        statusLabel={shareSummary.updatedLabel}
      />

      <section className="share-content-shell">
        {dashboardCharts.length ? (
          <div className="readonly-overview-grid">
            <div className="readonly-summary-strip" role="region" aria-label="สรุปแดชบอร์ดที่แชร์">
              <div className="readonly-summary-card accent">
                <span className="readonly-summary-label">กราฟ</span>
                <strong className="readonly-summary-value">{shareSummary.chartCount}</strong>
              </div>
              <div className="readonly-summary-card">
                <span className="readonly-summary-label">ประเภท</span>
                <strong className="readonly-summary-value">{shareSummary.chartTypes}</strong>
              </div>
              <div className="readonly-summary-card">
                <span className="readonly-summary-label">ชุดข้อมูล</span>
                <strong className="readonly-summary-value">{shareSummary.primaryDataset}</strong>
              </div>
            </div>

            <aside className="readonly-viewer-note" aria-label="รายละเอียดโหมดอ่านอย่างเดียว">
              <span className="readonly-viewer-note-kicker">อ่านอย่างเดียว</span>
              <h2 className="readonly-viewer-note-title">{dashboardTitle}</h2>
              <div className="readonly-viewer-note-list">
                <span>ปิดการแก้ไข</span>
                <span>คงรูปแบบเดิม</span>
                <span>ใช้ข้อมูล Local ในเบราว์เซอร์นี้</span>
              </div>
            </aside>
          </div>
        ) : null}

        {!dashboardCharts.length ? (
          <ReadOnlyStateCard
            kicker="ยังไม่มีกราฟ"
            title="แดชบอร์ดนี้ยังไม่มีกราฟ"
            description="กลับมาตรวจอีกครั้งหลังจากบันทึกกราฟใหม่แล้ว"
            linkTo="/login"
            linkLabel="เข้าสู่ระบบ"
          />
        ) : (
          <div className="share-grid" role="list" aria-label="กราฟที่แชร์">
            {dashboardCharts.map((chart) => (
              <ReadOnlyChartFrame key={chart.id} chart={chart} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
