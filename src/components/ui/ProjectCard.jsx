import React, { useState } from "react";

export default function ProjectCard({
  project,
  isActive,
  onOpen,
  onRename,
  onDelete,
  summary,
  canDelete = true,
}) {
  const [renamingOpen, setRenamingOpen] = useState(false);
  const [renameVal, setRenameVal] = useState(project.name);
  const sheetCount = summary?.sheetCount ?? project.sheets?.length ?? 0;
  const dashboardCount = summary?.dashboardCount ?? project.sheets?.reduce((total, sheet) => total + sheet.dashboards.length, 0) ?? 0;
  const activeSheetName = summary?.activeSheetName ?? "ไม่มีชีต";
  const activeDashboardName = summary?.activeDashboardName ?? "ไม่มีแดชบอร์ด";
  const lastUpdatedLabel = summary?.lastUpdatedLabel ?? "ยังไม่มีการอัปเดต";
  const statusLabel = isActive ? "ใช้งาน" : "พร้อมใช้";
  const statusTone = isActive ? "is-active" : "is-ready";
  const metricItems = [
    { label: "ชีต", value: sheetCount },
    { label: "แดชบอร์ด", value: dashboardCount },
  ];

  const handleRenameSubmit = (event) => {
    event.preventDefault();
    if (renameVal.trim()) onRename(project.id, renameVal.trim());
    setRenamingOpen(false);
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
          <span className="project-card-context-label">บริบท</span>
          <div className="project-card-context-value">{activeSheetName} / {activeDashboardName}</div>
        </div>

        <div className="project-card-metrics">
          {metricItems.map((item) => (
            <div key={item.label} className="project-card-metric">
              <span className="project-card-metric-label">{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>

        <div className="project-card-footer">
          <div className="project-card-updated">
            <span className="project-card-updated-label">อัปเดตล่าสุด</span>
            <strong>{lastUpdatedLabel}</strong>
          </div>
          <div className="project-card-meta">
            <span>{activeSheetName}</span>
            <span>{activeDashboardName}</span>
          </div>
          <div className="project-card-actions" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="project-card-manage-btn"
              onClick={() => setRenamingOpen(true)}
              title="จัดการ"
              aria-label="จัดการ"
            >
              จัดการ
            </button>
            {canDelete ? (
              <button
                type="button"
                className="project-card-delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(project.id);
                }}
                title="ลบ"
                aria-label="ลบ"
              >
                ลบ
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
