import React, { useState } from "react";
import { useI18n } from "../../utils/i18n";

export default function ProjectCard({ project, isActive, onOpen, onRename, onDelete }) {
  const { t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const [renamingOpen, setRenamingOpen] = useState(false);
  const [renameVal, setRenameVal] = useState(project.name);
  const sheetCount = project.sheets?.length ?? 0;
  const dashboardCount = project.sheets?.reduce((total, sheet) => total + sheet.dashboards.length, 0) ?? 0;

  const handleRenameSubmit = (event) => {
    event.preventDefault();
    if (renameVal.trim()) onRename(project.id, renameVal.trim());
    setRenamingOpen(false);
  };

  return (
    <div className={`project-card${isActive ? " active" : ""}`} onClick={() => onOpen(project.id)} role="button" tabIndex={0} onKeyDown={(event) => event.key === "Enter" && onOpen(project.id)}>
      <div className="project-card-accent" />
      <div className="project-card-body">
        <div className="project-card-top">
          <div className="project-card-icon">PR</div>
          <div className="project-card-type">Project</div>
        </div>
        {renamingOpen ? (
          <form onSubmit={handleRenameSubmit} onClick={(event) => event.stopPropagation()}>
            <input className="project-rename-input" value={renameVal} onChange={(event) => setRenameVal(event.target.value)} autoFocus onBlur={handleRenameSubmit} />
          </form>
        ) : (
          <div className="project-card-name">{project.name}</div>
        )}
        <div className="project-card-meta">
          <span>{sheetCount} {t("home.sheets")}</span>
          <span>{dashboardCount} {t("home.dashboards")}</span>
        </div>
      </div>
      {isActive ? <div className="project-card-active-badge">{t("home.active")}</div> : null}
      <div className="project-card-menu-wrap" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="project-card-menu-btn" onClick={() => setMenuOpen((value) => !value)}>•••</button>
        {menuOpen ? (
          <div className="project-card-menu">
            <button type="button" onClick={() => { setRenamingOpen(true); setMenuOpen(false); }}>{t("home.renameProject")}</button>
            <button type="button" className="danger" onClick={() => { onDelete(project.id); setMenuOpen(false); }}>{t("home.deleteProject")}</button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
