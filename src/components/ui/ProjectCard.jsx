import React, { useState } from "react";

export default function ProjectCard({
  project,
  isActive,
  onOpen,
  onOpenDashboard,
  onCreateDashboard,
  onRenameProject,
  onDelete,
  summary,
  canDelete = true,
}) {
  const [renamingOpen, setRenamingOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [renameVal, setRenameVal] = useState(project.name);
  const dashboardCount = summary?.dashboardCount ?? project.dashboards?.length ?? 0;
  const datasetCount = summary?.datasetCount ?? project.datasets?.length ?? 0;
  const chartCount = summary?.chartCount ?? project.charts?.length ?? 0;
  const dashboardList = summary?.dashboardList ?? [];
  const moreDashboardCount = Math.max(0, dashboardCount - dashboardList.length);
  const lastUpdatedLabel = summary?.lastUpdatedLabel ?? "ยังไม่มีการอัปเดต";
  const statusLabel = isActive ? "ใช้งาน" : "พร้อมใช้";
  const statusTone = isActive ? "is-active" : "is-ready";
  const metricItems = [
    { label: "แดชบอร์ด", value: dashboardCount },
    { label: "ชุดข้อมูล", value: datasetCount },
    { label: "กราฟ", value: chartCount },
  ];

  const handleRenameSubmit = (event) => {
    event.preventDefault();
    if (renameVal.trim()) onRenameProject?.(project.id, renameVal.trim());
    setRenamingOpen(false);
    setMenuOpen(false);
  };

  return (
    <div
      className={`project-card${isActive ? " active" : ""}`}
      onClick={() => onOpen(project.id)}
      role="button"
      aria-label={`เปิดโปรเจกต์ ${project.name}`}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(project.id);
        }
      }}
    >
      <div className="project-card-accent" />
      <div className="project-card-body">
        <div className="project-card-top">
          <div className="project-card-heading">
            <div className="project-card-topline">
              <div className="project-card-icon">PR</div>
              <div className="project-card-type">โปรเจกต์</div>
            </div>
            <div className={`project-card-status ${statusTone}`}>{statusLabel}</div>
          </div>
        </div>

        {renamingOpen ? (
          <form onSubmit={handleRenameSubmit} onClick={(event) => event.stopPropagation()}>
            <input
              className="project-rename-input"
              value={renameVal}
              onChange={(event) => setRenameVal(event.target.value)}
              autoFocus
              onBlur={handleRenameSubmit}
            />
          </form>
        ) : (
          <div className="project-card-name">{project.name}</div>
        )}

        <div className="project-card-context">
          <span className="project-card-context-label">สรุป</span>
          <div className="project-card-context-value">
            {dashboardCount} แดชบอร์ด · {datasetCount} ชุดข้อมูล · {chartCount} กราฟ
          </div>
        </div>

        <div className="project-card-metrics">
          {metricItems.map((item) => (
            <div key={item.label} className="project-card-metric">
              <span className="project-card-metric-label">{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>

        <div className="project-card-dashboard-list" onClick={(event) => event.stopPropagation()}>
          {dashboardList.length ? (
            dashboardList.map((dashboard) => (
              <button
                key={dashboard.id}
                type="button"
                className="project-card-dashboard-row"
                onClick={() => onOpenDashboard?.(project.id, dashboard.id)}
              >
                <span className="project-card-dashboard-name">{dashboard.name}</span>
                <span className="project-card-dashboard-meta">
                  {dashboard.widgetCount} วิดเจ็ต · {dashboard.updatedLabel}
                </span>
              </button>
            ))
          ) : (
            <div className="project-card-dashboard-empty">ยังไม่มีแดชบอร์ด</div>
          )}
          {moreDashboardCount > 0 ? (
            <span className="project-card-dashboard-more">อีก {moreDashboardCount} แดชบอร์ด</span>
          ) : null}
        </div>

        <div className="project-card-footer">
          <div className="project-card-updated">
            <span className="project-card-updated-label">อัปเดตล่าสุด</span>
            <strong>{lastUpdatedLabel}</strong>
          </div>
          <div className="project-card-meta">
            <span>{dashboardCount} แดชบอร์ด</span>
            <span>{chartCount} กราฟ</span>
          </div>
          <div className="project-card-actions" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="project-card-open-btn"
              onClick={() => onOpen(project.id)}
            >
              เปิดโปรเจกต์
            </button>
            <button
              type="button"
              className="project-card-create-dashboard-btn"
              onClick={() => onCreateDashboard?.(project.id)}
            >
              สร้าง Dashboard
            </button>
            <button
              type="button"
              className="project-card-manage-btn"
              onClick={() => setMenuOpen((open) => !open)}
              title="จัดการ"
              aria-label="จัดการ"
              aria-expanded={menuOpen}
            >
              จัดการ
            </button>
            {menuOpen ? (
              <div className="project-card-menu" role="menu">
                <button type="button" role="menuitem" onClick={() => setRenamingOpen(true)}>
                  เปลี่ยนชื่อโปรเจกต์
                </button>
                <button type="button" role="menuitem" onClick={() => onCreateDashboard?.(project.id)}>
                  สร้าง Dashboard
                </button>
                <button type="button" role="menuitem" onClick={() => onOpen(project.id)}>
                  ดู Dashboards
                </button>
                <button
                  type="button"
                  role="menuitem"
                  disabled={!canDelete}
                  title={canDelete ? "ลบโปรเจกต์" : "ต้องมีโปรเจกต์อย่างน้อย 1 รายการ"}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete?.(project.id);
                    setMenuOpen(false);
                  }}
                >
                  ลบโปรเจกต์
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
