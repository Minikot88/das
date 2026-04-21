import React, { useState } from "react";
import { useI18n } from "../../utils/i18n";

export default function ProjectCard({
  project,
  isActive,
  onOpen,
  onRename,
  onDelete,
  summary,
  canDelete = true,
}) {
  const { t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const [renamingOpen, setRenamingOpen] = useState(false);
  const [renameVal, setRenameVal] = useState(project.name);
  const sheetCount = summary?.sheetCount ?? project.sheets?.length ?? 0;
  const dashboardCount = summary?.dashboardCount ?? project.sheets?.reduce((total, sheet) => total + sheet.dashboards.length, 0) ?? 0;
  const activeSheetName = summary?.activeSheetName ?? "No sheet";
  const activeDashboardName = summary?.activeDashboardName ?? "No dashboard";
  const lastUpdatedLabel = summary?.lastUpdatedLabel ?? "No recent updates";
  const statusLabel = isActive ? t("home.active") : "Ready";
  const statusTone = isActive ? "is-active" : "is-ready";
  const metricItems = [
    { label: t("home.sheets"), value: sheetCount },
    { label: t("home.dashboards"), value: dashboardCount },
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
      tabIndex={0}
      onKeyDown={(event) => event.key === "Enter" && onOpen(project.id)}
    >
      <div className="project-card-accent" />
      <div className="project-card-body">
        <div className="project-card-top">
          <div className="project-card-heading">
            <div className="project-card-topline">
              <div className="project-card-icon">PR</div>
              <div className="project-card-type">Project</div>
            </div>
            <div className={`project-card-status ${statusTone}`}>{statusLabel}</div>
          </div>
          <div className="project-card-actions" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="project-card-menu-btn project-card-menu-trigger"
              onClick={() => setMenuOpen((value) => !value)}
            >
              {t("home.manageProject")}
            </button>
            {canDelete ? (
              <button
                type="button"
                className="project-card-delete-btn"
                onClick={() => onDelete(project.id)}
              >
                {t("home.deleteProject")}
              </button>
            ) : null}
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
          <span className="project-card-context-label">Context</span>
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
            <span className="project-card-updated-label">Last updated</span>
            <strong>{lastUpdatedLabel}</strong>
          </div>
          <div className="project-card-meta">
            <span>{activeSheetName}</span>
            <span>{activeDashboardName}</span>
          </div>
        </div>
      </div>

      <div className="project-card-menu-wrap" onClick={(event) => event.stopPropagation()}>
        {menuOpen ? (
          <div className="project-card-menu">
            <button type="button" onClick={() => { setRenamingOpen(true); setMenuOpen(false); }}>{t("home.renameProject")}</button>
            {canDelete ? (
              <button type="button" className="danger" onClick={() => { onDelete(project.id); setMenuOpen(false); }}>{t("home.deleteProject")}</button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
