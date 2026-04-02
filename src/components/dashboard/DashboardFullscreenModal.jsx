import React, { useEffect, useMemo, useState } from "react";
import ChartCard from "./ChartCardV2";

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
  drilldown,
  onDrilldown,
  onResetDrilldown,
  onClose,
}) {
  const [pixelHeight, setPixelHeight] = useState(getFullscreenHeight);

  useEffect(() => {
    const handleResize = () => setPixelHeight(getFullscreenHeight());

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.body.classList.add("dashboard-fullscreen-open");
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.classList.remove("dashboard-fullscreen-open");
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const modalTitle = useMemo(() => chart?.title ?? "Widget", [chart?.title]);
  const chartType = chart?.chartType ?? chart?.type ?? "chart";
  const chartDataset = chart?.dataset ?? chart?.table ?? "Not selected";

  if (!chart) return null;

  return (
    <div
      className="dashboard-fullscreen-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dashboard-fullscreen-title"
      onClick={onClose}
    >
      <div
        className="dashboard-fullscreen-shell"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dashboard-fullscreen-topbar">
          <div className="dashboard-fullscreen-heading">
            <span className="dashboard-fullscreen-kicker">Fullscreen Widget</span>
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
            aria-label="Close fullscreen widget"
          >
            Close
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
