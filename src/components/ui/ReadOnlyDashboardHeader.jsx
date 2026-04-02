import React from "react";
import { Link } from "react-router-dom";

function Stat({ label, value }) {
  return (
    <div className="readonly-stat">
      <span className="readonly-stat-label">{label}</span>
      <strong className="readonly-stat-value">{value}</strong>
    </div>
  );
}

export default function ReadOnlyDashboardHeader({
  title,
  dashboardName,
  chartCount,
  chartTypes,
  primaryDataset,
  statusLabel,
}) {
  return (
    <header className="readonly-hero">
      <div className="readonly-hero-main">
        <div className="readonly-brand-row">
          <div className="readonly-brand">Mini BI</div>
          <span className="readonly-badge">View Only</span>
          <span className="readonly-trust-pill">Trusted share link</span>
        </div>

        <div className="readonly-copy">
          <div className="readonly-kicker">Shared Dashboard</div>
          <h1 className="readonly-title">{title}</h1>
          <p className="readonly-subtitle">
            A polished dashboard presentation prepared for external review. Viewing is enabled, while editing, dashboard changes, and builder interactions remain disabled.
          </p>
        </div>

        <div className="readonly-hero-panel">
          <div className="readonly-hero-panel-copy">
            <span className="readonly-hero-panel-kicker">Presentation status</span>
            <strong className="readonly-hero-panel-title">{dashboardName}</strong>
            <p className="readonly-hero-panel-text">
              Charts below are presented in a stable read-only layout so external viewers can focus on the information being shared, not the tooling around it.
            </p>
          </div>
          <div className="readonly-hero-panel-badges" aria-label="Share page status">
            <span className="readonly-inline-badge">{statusLabel}</span>
            <span className="readonly-inline-badge muted">{chartCount} charts visible</span>
            <span className="readonly-inline-badge muted">{chartTypes ?? 0} visualization types</span>
          </div>
        </div>
      </div>

      <div className="readonly-hero-side">
        <div className="readonly-meta-grid">
          <Stat label="Sheet" value={title} />
          <Stat label="View" value={dashboardName} />
          <Stat label="Charts" value={chartCount} />
          <Stat label="Types" value={chartTypes ?? 0} />
          <Stat label="Dataset" value={primaryDataset ?? "Unavailable"} />
          <Stat label="Access" value="Read only" />
        </div>
        <Link to="/login" className="share-signin-link readonly-signin-link">
          Sign in for workspace access
        </Link>
      </div>
    </header>
  );
}
