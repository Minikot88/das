import React, { useEffect, useMemo, useState } from "react";
import ChartCard from "./ChartCard";
import useFocusTrap from "../../hooks/useFocusTrap";

function getFullscreenHeight() {
  if (typeof window === "undefined") return 640;
  return Math.max(360, window.innerHeight - 176);
}

export default function DashboardFullscreenModal({
  chart,
  sheetId,
  filters,
  onExportCSV,
  onExportPNG,
  onDataPointClick,
  drilldown,
  onDrilldown,
  onResetDrilldown,
  onClose,
}) {
  const [pixelHeight, setPixelHeight] = useState(getFullscreenHeight);
  const dialogRef = useFocusTrap(Boolean(chart), onClose);

  useEffect(() => {
    const handleResize = () => setPixelHeight(getFullscreenHeight());

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    document.body.classList.add("dashboard-fullscreen-open");

    return () => {
      document.body.classList.remove("dashboard-fullscreen-open");
    };
  }, []);

  const modalTitle = useMemo(() => chart?.title ?? "วิดเจ็ต", [chart?.title]);
  const chartType = chart?.chartType ?? chart?.type ?? "chart";
  const chartDataset = chart?.dataset ?? chart?.table ?? "ยังไม่ได้เลือก";

  if (!chart) return null;

  return (
    <div
      ref={dialogRef}
      className="dashboard-fullscreen-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dashboard-fullscreen-title"
      tabIndex={-1}
      onClick={onClose}
    >
      <div
        className="dashboard-fullscreen-shell"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dashboard-fullscreen-topbar">
          <div className="dashboard-fullscreen-heading">
            <span className="dashboard-fullscreen-kicker">วิดเจ็ตเต็มหน้าจอ</span>
            <h2 id="dashboard-fullscreen-title" className="dashboard-fullscreen-title">
              {modalTitle}
            </h2>
            <div className="dashboard-fullscreen-meta">
              <span>{chartType}</span>
              <span>{chartDataset}</span>
            </div>
          </div>
          <button
            type="button"
            className="dashboard-fullscreen-close"
            onClick={onClose}
            aria-label="ปิดวิดเจ็ตเต็มหน้าจอ"
          >
            ปิด
          </button>
        </div>

        <div className="dashboard-fullscreen-content">
          <ChartCard
            chart={chart}
            pixelHeight={pixelHeight}
            sheetId={sheetId}
            filters={filters}
            onExportCSV={onExportCSV}
            onExportPNG={onExportPNG}
            onDataPointClick={onDataPointClick}
            drilldown={drilldown}
            onDrilldown={onDrilldown}
            onResetDrilldown={onResetDrilldown}
            isFullscreen
            onToggleFullscreen={onClose}
          />
        </div>
      </div>
    </div>
  );
}
