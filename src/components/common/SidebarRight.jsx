import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useStore } from "../../store/useStore";

function SharePanel({ sheetId }) {
  const [copied, setCopied] = useState(false);
  const shareUrl = `${window.location.origin}/share/${sheetId}`;

  const handleCopy = () => {
    navigator.clipboard?.writeText(shareUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="share-panel">
      <div className="filter-panel-header">Share Dashboard</div>
      <div className="share-url" title={shareUrl}>{shareUrl}</div>
      <button className="rp-btn" onClick={handleCopy}>
        {copied ? "Copied" : "Copy Link"}
      </button>
    </div>
  );
}

function DashboardControls({ activeSheet }) {
  const navigate = useNavigate();
  const clearSheet = useStore((state) => state.clearSheet);
  const [showShare, setShowShare] = useState(false);

  return (
    <div className="right-panel-section">
      <div className="panel-section-head">
        <div>
          <div className="panel-section-title">Quick Actions</div>
        </div>
      </div>

      <button
        id="rp-add-chart"
        className="rp-btn primary"
        onClick={() => navigate("/builder")}
        aria-label="Open chart builder"
      >
        New Chart
      </button>

      <button className="rp-btn" onClick={() => setShowShare((value) => !value)}>
        {showShare ? "Hide Share" : "Share Dashboard"}
      </button>

      <button
        className="rp-btn danger"
        onClick={() => {
          if (activeSheet && window.confirm("Clear all charts from this sheet?")) {
            clearSheet(activeSheet.id);
          }
        }}
      >
        Clear Sheet
      </button>

      {showShare && activeSheet ? <SharePanel sheetId={activeSheet.id} /> : null}
    </div>
  );
}

export default function SidebarRight() {
  const location = useLocation();
  const projects = useStore((state) => state.projects);
  const activeProjectId = useStore((state) => state.activeProjectId);
  const activeSheetId = useStore((state) => state.activeSheetId);

  const activeProject = projects.find((project) => project.id === activeProjectId) ?? projects[0];
  const activeSheet = activeProject?.sheets.find((sheet) => sheet.id === activeSheetId) ?? activeProject?.sheets[0];
  const isDashboard = location.pathname === "/dashboard";

  return (
    <aside className="sidebar-right" aria-label="Control panel">
      {isDashboard ? (
        <>
          <div className="sidebar-right-header">
            <div className="sidebar-right-header-copy">
              <span className="panel-section-title">Inspector</span>
            </div>
          </div>

          <DashboardControls activeSheet={activeSheet} />
        </>
      ) : null}
    </aside>
  );
}
