import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer, PageHeader, Toolbar } from "../components/layout/Layout";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import Panel from "../components/ui/Panel";
import ProjectCard from "../components/ui/ProjectCard";
import SectionHeader from "../components/ui/SectionHeader";
import CreateProjectModal from "../components/ui/CreateProjectModal";
import { useStore } from "../store/useStore";
import { useI18n } from "../utils/i18n";

function formatLastUpdated(dateValue) {
  if (!dateValue) return null;

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getProjectLastUpdated(project, charts) {
  const projectCharts = charts.filter((chart) => chart.projectId === project.id);
  const latestChart = projectCharts
    .map((chart) => chart.createdAt)
    .filter(Boolean)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

  return latestChart ?? null;
}

export default function HomePage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const projects = useStore((state) => state.projects);
  const charts = useStore((state) => state.charts);
  const ui = useStore((state) => state.ui);
  const activeProjectId = useStore((state) => state.activeProjectId);
  const activeSheetId = useStore((state) => state.activeSheetId);
  const activeDashboardId = useStore((state) => state.activeDashboardId);
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

  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => {
      const aIndex = recentProjectIds.indexOf(a.id);
      const bIndex = recentProjectIds.indexOf(b.id);
      const safeA = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
      const safeB = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;
      return safeA - safeB;
    });
  }, [projects, recentProjectIds]);

  const activeProject = projects.find((project) => project.id === activeProjectId) ?? projects[0] ?? null;
  const activeSheet = activeProject?.sheets.find((sheet) => sheet.id === activeSheetId) ?? activeProject?.sheets?.[0] ?? null;
  const activeDashboard = activeSheet?.dashboards.find((dashboard) => dashboard.id === activeDashboardId) ?? activeSheet?.dashboards?.[0] ?? null;

  const projectSummaries = useMemo(() => {
    return Object.fromEntries(
      projects.map((project) => {
        const sheetCount = project.sheets?.length ?? 0;
        const dashboardCount = project.sheets?.reduce((total, sheet) => total + (sheet.dashboards?.length ?? 0), 0) ?? 0;
        const activeSheet = project.sheets?.[0] ?? null;
        const activeDashboard = activeSheet?.dashboards?.[0] ?? null;
        const lastOpened = ui?.lastOpenedContextByProject?.[project.id];
        const lastOpenedSheet = project.sheets?.find((sheet) => sheet.id === lastOpened?.sheetId) ?? activeSheet;
        const lastOpenedDashboard = lastOpenedSheet?.dashboards?.find((dashboard) => dashboard.id === lastOpened?.dashboardId) ?? activeDashboard;
        const lastUpdated = getProjectLastUpdated(project, charts);

        return [
          project.id,
          {
            sheetCount,
            dashboardCount,
            activeSheetName: lastOpenedSheet?.name ?? t("home.noSheet"),
            activeDashboardName: lastOpenedDashboard?.name ?? t("home.noDashboard"),
            lastUpdatedLabel: formatLastUpdated(lastUpdated) ?? t("home.noRecentUpdates"),
          },
        ];
      })
    );
  }, [charts, projects, t, ui?.lastOpenedContextByProject]);

  const handleOpenProject = (id) => {
    setActiveProject(id);
    navigate("/dashboard");
  };

  const handleCreate = (name) => {
    createProject(name);
    navigate("/dashboard");
  };

  return (
    <PageContainer className="home-page" role="main">
      <Panel className="home-panel home-command-center" compact>
        <PageHeader
          kicker="Workspace"
          title="Workspace"
          actions={(
            <Button id="create-project-btn" variant="primary" className="home-create-btn" onClick={() => setShowModal(true)}>
              {t("home.newProject")}
            </Button>
          )}
        >
          <Toolbar
            className="home-toolbar home-command-toolbar"
            left={(
              <div className="home-toolbar-status">
                <Badge tone="primary">Active</Badge>
                <span>{projects.length} projects</span>
              </div>
            )}
            right={(
              <div className="home-active-context">
                <span>{t("home.current")}</span>
                <strong>
                  {activeProject?.name ?? t("home.none")}
                  {activeSheet ? ` / ${activeSheet.name}` : ""}
                  {activeDashboard ? ` / ${activeDashboard.name}` : ""}
                </strong>
              </div>
            )}
          />
        </PageHeader>

        <div className="home-stats-grid">
          <div className="home-stat-card">
            <span className="home-stat-card-label">{t("home.projects")}</span>
            <strong>{projects.length}</strong>
          </div>
          <div className="home-stat-card">
            <span className="home-stat-card-label">{t("home.sheets")}</span>
            <strong>{totalSheets}</strong>
          </div>
          <div className="home-stat-card">
            <span className="home-stat-card-label">{t("home.dashboards")}</span>
            <strong>{totalDashboards}</strong>
          </div>
          <div className="home-stat-card is-highlight">
            <span className="home-stat-card-label">{t("home.activeItems")}</span>
            <strong>{activeDashboard ? 3 : activeProject ? 2 : 1}</strong>
          </div>
        </div>
      </Panel>

      {!projects.length ? (
        <EmptyState
          className="home-empty"
          icon="PR"
          title={t("home.noProjects")}
          description={t("home.noProjectsBody")}
          actionText={t("home.createProject")}
          onAction={() => setShowModal(true)}
        />
      ) : (
        <section className="home-section home-section-shell">
          <SectionHeader
            kicker={t("home.projects")}
            title={t("home.projects")}
            actions={(
              <div className="home-section-pills">
                <Badge>Recent</Badge>
                <Badge>{sortedProjects.length} total</Badge>
              </div>
            )}
          />

          <div className="project-grid project-grid-command-center">
            {sortedProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                summary={projectSummaries[project.id]}
                isActive={project.id === activeProjectId}
                onOpen={handleOpenProject}
                onRename={renameProject}
                onDelete={deleteProject}
                canDelete={projects.length > 1}
              />
            ))}
            <button type="button" className="project-card project-card-new" onClick={() => setShowModal(true)}>
              <div className="project-card-new-icon">+</div>
              <div className="project-card-new-copy">
                <strong>{t("home.addProject")}</strong>
                <span>{t("home.createWorkspace")}</span>
              </div>
            </button>
          </div>
        </section>
      )}

      {showModal ? <CreateProjectModal onClose={() => setShowModal(false)} onCreate={handleCreate} /> : null}
    </PageContainer>
  );
}
