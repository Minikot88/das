/**
 * components/common/SidebarRight.jsx
 * Elite context-sensitive side panel.
 */
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
      <div className="filter-panel-header">🔗 Share Dashboard</div>
      <div className="share-url" title={shareUrl}>{shareUrl}</div>
      <button className="rp-btn" onClick={handleCopy}>
        {copied ? "✔ Copied!" : "📋 Copy Link"}
      </button>
    </div>
  );
}

function DashboardControls({ activeSheet }) {
  const navigate   = useNavigate();
  const clearSheet = useStore((s) => s.clearSheet);
  const [showShare, setShowShare] = useState(false);

  return (
    <div className="right-panel-section">
      <div className="panel-section-title">Dashboard Dashboard Controls</div>

      <button
        id="rp-add-chart"
        className="rp-btn primary"
        onClick={() => navigate("/builder")}
        aria-label="Open chart builder"
      >
        ＋ New Chart
      </button>

      <button className="rp-btn" onClick={() => setShowShare((v) => !v)}>
        {showShare ? "▲ Hide Share" : "🔗 Share Dashboard"}
      </button>

      <button
        className="rp-btn danger"
        onClick={() => {
          if (activeSheet && window.confirm("Clear all charts from this sheet?")) {
            clearSheet(activeSheet.id);
          }
        }}
      >
        🗑 Clear Sheet
      </button>

      {showShare && activeSheet && <SharePanel sheetId={activeSheet.id} />}
    </div>
  );
}

export default function SidebarRight() {
  const location        = useLocation();
  const projects        = useStore((s) => s.projects);
  const activeProjectId = useStore((s) => s.activeProjectId);
  const activeSheetId   = useStore((s) => s.activeSheetId);

  const activeProject = projects.find((p) => p.id === activeProjectId) ?? projects[0];
  const activeSheet   = activeProject?.sheets.find((sh) => sh.id === activeSheetId) ?? activeProject?.sheets[0];

  const isDashboard = location.pathname === "/dashboard";

  return (
    <aside className="sidebar-right" aria-label="Control panel">
      {isDashboard && (
        <>
          <DashboardControls activeSheet={activeSheet} />
          <div className="right-panel-section">
            <div className="panel-section-title">Analysis</div>
            <p style={{ opacity: 0.5, fontSize: "12px", padding: "0 10px" }}>
              Global insights and filters moved to the dashboard toolbar for better accessibility.
            </p>
          </div>
        </>
      )}
    </aside>
  );
}
