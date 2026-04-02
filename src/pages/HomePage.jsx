import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import ProjectCard from "../components/ui/ProjectCard";
import CreateProjectModal from "../components/ui/CreateProjectModal";
import { useStore } from "../store/useStore";
import { useI18n } from "../utils/i18n";

export default function HomePage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const projects = useStore((state) => state.projects);
  const ui = useStore((state) => state.ui);
  const activeProjectId = useStore((state) => state.activeProjectId);
  const createProject = useStore((state) => state.createProject);
  const renameProject = useStore((state) => state.renameProject);
  const deleteProject = useStore((state) => state.deleteProject);
  const setActiveProject = useStore((state) => state.setActiveProject);
  const [showModal, setShowModal] = useState(false);
  const totalSheets = projects.reduce((count, project) => count + (project.sheets?.length ?? 0), 0);
  const totalDashboards = projects.reduce(
    (count, project) => count + (project.sheets?.reduce((sheetCount, sheet) => sheetCount + (sheet.dashboards?.length ?? 0), 0) ?? 0),
    0
  );
  const recentProjectIds = ui?.recentProjectIds ?? [];
  const sortedProjects = [...projects].sort((a, b) => {
    const aIndex = recentProjectIds.indexOf(a.id);
    const bIndex = recentProjectIds.indexOf(b.id);
    const safeA = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
    const safeB = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;
    return safeA - safeB;
  });

  const handleOpenProject = (id) => {
    setActiveProject(id);
    navigate("/dashboard");
  };

  const handleCreate = (name) => {
    createProject(name);
    navigate("/dashboard");
  };

  return (
    <div className="home-page" role="main">
      <section className="home-panel">
        <div className="home-header">
          <div className="home-header-left">
            <div className="home-kicker">ระบบสารสนเทศ</div>
            <h1 className="home-title">{t("home.title")}</h1>
            <p className="home-subtitle">{t("home.subtitle")}</p>
          </div>
          <button id="create-project-btn" className="home-create-btn" onClick={() => setShowModal(true)}>
            {t("home.newProject")}
          </button>
        </div>
        <div className="home-toolbar">
          <div className="home-count">จำนวนโครงการทั้งหมด {projects.length} รายการ</div>
          <div className="home-stats">
            <div className="home-stat-pill">
              <strong>{totalSheets}</strong>
              <span>{t("home.sheets")}</span>
            </div>
            <div className="home-stat-pill">
              <strong>{totalDashboards}</strong>
              <span>{t("home.dashboards")}</span>
            </div>
          </div>
        </div>
      </section>

      {!projects.length ? (
        <div className="home-empty">
          <div className="home-empty-icon">PR</div>
          <h2 className="home-empty-title">{t("home.noProjects")}</h2>
          <p className="home-empty-sub">{t("home.noProjectsBody")}</p>
          <button className="home-create-btn" onClick={() => setShowModal(true)}>{t("home.createProject")}</button>
        </div>
      ) : (
        <section className="home-section">
          <div className="project-grid">
            {sortedProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                isActive={project.id === activeProjectId}
                onOpen={handleOpenProject}
                onRename={renameProject}
                onDelete={deleteProject}
              />
            ))}
            <button type="button" className="project-card project-card-new" onClick={() => setShowModal(true)}>
              <div className="project-card-new-icon">+</div>
              <div className="project-card-new-label">{t("home.addProject")}</div>
            </button>
          </div>
        </section>
      )}

      {showModal ? <CreateProjectModal onClose={() => setShowModal(false)} onCreate={handleCreate} /> : null}
    </div>
  );
}
