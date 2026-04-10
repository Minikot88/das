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
          <span className="readonly-badge">อ่านอย่างเดียว</span>
          <span className="readonly-trust-pill">ลิงก์ที่แชร์</span>
        </div>

        <div className="readonly-copy">
          <div className="readonly-kicker">Dashboard ที่แชร์</div>
          <h1 className="readonly-title">{title}</h1>
        </div>

        <div className="readonly-hero-panel">
          <div className="readonly-hero-panel-copy">
            <span className="readonly-hero-panel-kicker">สถานะ</span>
            <strong className="readonly-hero-panel-title">{dashboardName}</strong>
          </div>
          <div className="readonly-hero-panel-badges" aria-label="สถานะหน้าที่แชร์">
            <span className="readonly-inline-badge">{statusLabel}</span>
            <span className="readonly-inline-badge muted">{chartCount} Charts</span>
            <span className="readonly-inline-badge muted">{chartTypes ?? 0} ประเภท</span>
          </div>
        </div>
      </div>

      <div className="readonly-hero-side">
        <div className="readonly-meta-grid">
          <Stat label="ชีต" value={title} />
          <Stat label="Dashboard" value={dashboardName} />
          <Stat label="Charts" value={chartCount} />
          <Stat label="ประเภท" value={chartTypes ?? 0} />
          <Stat label="Dataset" value={primaryDataset ?? "ไม่พบข้อมูล"} />
          <Stat label="สิทธิ์" value="อ่านอย่างเดียว" />
        </div>
        <Link to="/login" className="share-signin-link readonly-signin-link">
          เข้าสู่ระบบ
        </Link>
      </div>
    </header>
  );
}
