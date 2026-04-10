import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useStore } from "../store/useStore";
import { normalizeChartConfig } from "../utils/normalizeChartConfig";
import ReadOnlyDashboardHeader from "../components/ui/ReadOnlyDashboardHeader";
import ReadOnlyChartFrame from "../components/ui/ReadOnlyChartFrame";
import ReadOnlyStateCard from "../components/ui/ReadOnlyStateCard";

export default function SharePage() {
  const { sheetId } = useParams();
  const projects = useStore((s) => s.projects);
  const chartsPool = useStore((s) => s.charts);
  const resolveShareLink = useStore((s) => s.resolveShareLink);
  const [loading, setLoading] = useState(true);

  const sheet = useMemo(() => {
    const shareRecord = resolveShareLink(sheetId);
    const resolvedSheetId = shareRecord?.sheetId ?? sheetId;
    if (!resolvedSheetId) return null;

    for (const project of projects ?? []) {
      const foundSheet = project?.sheets?.find((candidate) => candidate?.id === resolvedSheetId);
      if (foundSheet) return foundSheet;
    }

    return null;
  }, [projects, resolveShareLink, sheetId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLoading(false);
    }, 180);

    return () => window.clearTimeout(timer);
  }, [sheetId, sheet]);

  const activeDashboard = sheet?.dashboards?.[0] ?? null;
  const dashboardCharts = useMemo(() => {
    if (!activeDashboard?.layout) return [];

    return activeDashboard.layout
      .map((item) => {
        const saved = chartsPool.find((chart) => chart.id === item.chartId);
        return saved
          ? { ...normalizeChartConfig(saved.config), id: item.i, chartId: saved.id }
          : null;
      })
      .filter(Boolean);
  }, [activeDashboard, chartsPool]);

  const shareSummary = useMemo(() => {
    if (!dashboardCharts.length) {
      return {
        chartCount: 0,
        chartTypes: 0,
        primaryDataset: "ไม่พบข้อมูล",
        updatedLabel: "พร้อมดู",
      };
    }

    const typeSet = new Set();
    const datasetCounts = new Map();

    for (const chart of dashboardCharts) {
      if (chart.chartType) typeSet.add(chart.chartType);
      if (chart.dataset) {
        datasetCounts.set(chart.dataset, (datasetCounts.get(chart.dataset) ?? 0) + 1);
      }
    }

    const primaryDataset = [...datasetCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "ไม่พบข้อมูล";

    return {
      chartCount: dashboardCharts.length,
      chartTypes: typeSet.size,
      primaryDataset,
      updatedLabel: activeDashboard?.name ? "เผยแพร่แล้ว" : "พร้อมดู",
    };
  }, [activeDashboard?.name, dashboardCharts]);

  const dashboardTitle = activeDashboard?.name ?? "หน้าที่แชร์";

  if (loading) {
    return (
      <div className="share-page share-page-shell">
        <ReadOnlyStateCard
          loading
          kicker="กำลังเตรียมหน้าที่แชร์"
          title="กำลังโหลด Dashboard"
          description="โปรดรอสักครู่"
        />
      </div>
    );
  }

  if (!sheet) {
    return (
      <div className="share-page share-page-shell">
        <ReadOnlyStateCard
          kicker="ลิงก์ใช้งานไม่ได้"
          title="ไม่พบ Dashboard"
          description="ลิงก์นี้อาจหมดอายุหรือถูกลบแล้ว"
          linkTo="/login"
          linkLabel="ไปหน้าเข้าสู่ระบบ"
        />
      </div>
    );
  }

  return (
    <div className="share-page share-page-shell">
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
            <div className="readonly-summary-strip" role="region" aria-label="สรุป Dashboard ที่แชร์">
              <div className="readonly-summary-card accent">
                <span className="readonly-summary-label">Charts</span>
                <strong className="readonly-summary-value">{shareSummary.chartCount}</strong>
              </div>
              <div className="readonly-summary-card">
                <span className="readonly-summary-label">ประเภท</span>
                <strong className="readonly-summary-value">{shareSummary.chartTypes} แบบ</strong>
              </div>
              <div className="readonly-summary-card">
                <span className="readonly-summary-label">Dataset หลัก</span>
                <strong className="readonly-summary-value">{shareSummary.primaryDataset}</strong>
              </div>
            </div>

            <aside className="readonly-viewer-note" aria-label="รายละเอียดมุมมองแบบอ่านอย่างเดียว">
              <span className="readonly-viewer-note-kicker">อ่านอย่างเดียว</span>
              <h2 className="readonly-viewer-note-title">{dashboardTitle}</h2>
              <div className="readonly-viewer-note-list">
                <span>แก้ไขไม่ได้</span>
                <span>คง layout เดิม</span>
                <span>ไม่ต้องเข้าสู่ระบบ</span>
              </div>
            </aside>
          </div>
        ) : null}

        {!dashboardCharts.length ? (
          <ReadOnlyStateCard
            kicker="ยังไม่มี Chart"
            title="Dashboard นี้ยังไม่มี Chart"
            description="โปรดลองอีกครั้งภายหลัง"
            linkTo="/login"
            linkLabel="เข้าสู่ระบบ"
          />
        ) : (
          <div className="share-grid" role="list" aria-label="Charts ที่แชร์">
            {dashboardCharts.map((chart) => (
              <ReadOnlyChartFrame key={chart.id} chart={chart} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
