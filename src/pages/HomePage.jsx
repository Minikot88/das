import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createProject as createProjectApi } from "../api/projectApi";
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
import { createBuilderContextForDashboard } from "../utils/dashboardWorkspace";
import { TEMPLATE_GALLERY_CATALOG } from "../data/templateGalleryCatalog";

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
  const renameProject = useStore((state) => state.renameProject);
  const deleteProject = useStore((state) => state.deleteProject);
  const setActiveProject = useStore((state) => state.setActiveProject);
  const [showModal, setShowModal] = useState(false);
  const [projectSort, setProjectSort] = useState("recent");

  const totalDashboards = projects.reduce(
    (count, project) =>
      count +
      (project.sheets?.reduce((sheetCount, sheet) => sheetCount + (sheet.dashboards?.length ?? 0), 0) ?? 0),
    0
  );
  const workspaceTitle = projects.find((project) => project.id === activeProjectId)?.name ?? "พื้นที่ทำงาน";
  const readyItems = activeDashboardId ? 3 : activeProjectId ? 2 : 1;
  const recentActivityCount = Math.min(ui?.recentProjectIds?.length ?? 0, projects.length);
  const favoritesCount = projects.filter((project) => project?.isFavorite).length;

  const sortedProjects = useMemo(() => {
    const recentProjectIds = ui?.recentProjectIds ?? [];
    return [...projects].sort((a, b) => {
      const aIndex = recentProjectIds.indexOf(a.id);
      const bIndex = recentProjectIds.indexOf(b.id);
      const safeA = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
      const safeB = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;
      return safeA - safeB;
    });
  }, [projects, ui?.recentProjectIds]);

  const activeProject = projects.find((project) => project.id === activeProjectId) ?? projects[0] ?? null;
  const activeSheet = activeProject?.sheets.find((sheet) => sheet.id === activeSheetId) ?? activeProject?.sheets?.[0] ?? null;
  const activeDashboard =
    activeSheet?.dashboards.find((dashboard) => dashboard.id === activeDashboardId) ??
    activeSheet?.dashboards?.[0] ??
    null;

  const projectSummaries = useMemo(() => {
    return Object.fromEntries(
      projects.map((project) => {
        const sheetCount = project.sheets?.length ?? 0;
        const dashboardCount =
          project.sheets?.reduce((total, sheet) => total + (sheet.dashboards?.length ?? 0), 0) ?? 0;
        const activeSheet = project.sheets?.[0] ?? null;
        const activeDashboard = activeSheet?.dashboards?.[0] ?? null;
        const lastOpened = ui?.lastOpenedContextByProject?.[project.id];
        const lastOpenedSheet =
          project.sheets?.find((sheet) => sheet.id === lastOpened?.sheetId) ?? activeSheet;
        const lastOpenedDashboard =
          lastOpenedSheet?.dashboards?.find((dashboard) => dashboard.id === lastOpened?.dashboardId) ??
          activeDashboard;
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

  const visibleProjects = useMemo(() => {
    let next = [...projects];

    if (projectSort === "recent") {
      next = [...sortedProjects];
    } else if (projectSort === "active") {
      next.sort((a, b) => {
        if (a.id === activeProjectId) return -1;
        if (b.id === activeProjectId) return 1;
        return a.name.localeCompare(b.name, "th");
      });
    } else {
      next.sort((a, b) => a.name.localeCompare(b.name, "th"));
    }
    return next;
  }, [activeProjectId, projectSort, projects, sortedProjects]);

  const recentActivityFeed = useMemo(
    () => [
      {
        id: "activity-1",
        title: "รีเฟรชแดชบอร์ดการเงินแล้ว",
        details: "อัปเดตล่าสุดเมื่อ 6 นาทีที่แล้ว",
        context: workspaceTitle,
      },
      {
        id: "activity-2",
        title: "นำเข้าโมเดลยอดขายรายเดือนแล้ว",
        details: "ซิงก์แหล่งข้อมูลเสร็จแล้ว",
        context: "ทีมข้อมูล",
      },
      {
        id: "activity-3",
        title: "แชร์แดชบอร์ดผู้บริหารแล้ว",
        details: "สมาชิกทีม 2 คนดูในสัปดาห์นี้",
        context: "รายงานผู้เกี่ยวข้อง",
      },
    ],
    [workspaceTitle]
  );

  const templateCatalog = useMemo(() => TEMPLATE_GALLERY_CATALOG, []);

  const activeTemplateContext = useMemo(() => {
    if (!activeProjectId) return null;
    const activeProject = projects.find((project) => project.id === activeProjectId) ?? null;
    const activeSheet = activeProject?.sheets.find((sheet) => sheet.id === activeSheetId) ?? activeProject?.sheets?.[0] ?? null;
    const activeDashboard = activeSheet?.dashboards.find((dashboard) => dashboard.id === activeDashboardId) ?? activeSheet?.dashboards?.[0] ?? null;

    if (!activeProject || !activeSheet || !activeDashboard) return null;

    return createBuilderContextForDashboard({
      projectId: activeProject.id,
      sheetId: activeSheet.id,
      dashboardId: activeDashboard.id,
      returnTo: "/dashboard",
      source: "template-gallery",
    });
  }, [activeDashboardId, activeProjectId, activeSheetId, projects]);

  function handleUseTemplate(template) {
    const builderContext = activeTemplateContext
      ? {
          ...activeTemplateContext,
          prefillTemplateId: template?.prefillTemplateId,
        }
      : null;
    if (builderContext) {
      navigate("/builder", {
        state: { builderContext },
      });
      return;
    }
    navigate("/builder");
  }

  const handleOpenProject = (id) => {
    setActiveProject(id);
    navigate("/dashboard");
  };

  const handleCreate = async (name) => {
    await createProjectApi(name);
    navigate("/dashboard");
  };

  return (
    <PageContainer className="home-page" role="main">
      <Panel className="home-panel home-command-center" compact>
        <PageHeader
          kicker="ศูนย์งานผู้บริหาร"
          title={workspaceTitle}
          subtitle="เข้าสู่แดชบอร์ดสำคัญ ติดตามความเคลื่อนไหว และเริ่มงานใหม่ได้อย่างรวดเร็ว"
          actions={(
            <div className="home-toolbar-actions">
              <Button id="create-project-btn" variant="primary" className="home-create-btn" onClick={() => setShowModal(true)}>
                {t("home.newProject")}
              </Button>
              <Button variant="secondary" className="home-dashboard-btn" onClick={() => navigate("/dashboard")}>
                เปิดแดชบอร์ด
              </Button>
            </div>
          )}
        >
          <Toolbar
            className="home-toolbar home-command-toolbar"
            left={(
              <div className="home-toolbar-status home-toolbar-chip-row">
                <Badge tone="primary">โหมดผู้บริหาร</Badge>
                <Badge>{projects.length} {t("home.projects")}</Badge>
                <Badge>{readyItems} {t("home.ready")}</Badge>
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
          <div className="home-stat-card is-projects">
            <span className="home-stat-card-label">โปรเจกต์ทั้งหมด</span>
            <strong>{projects.length}</strong>
            <span className="home-stat-card-helper">แฟ้มงานพื้นที่ทำงาน</span>
          </div>
          <div className="home-stat-card is-dashboards">
            <span className="home-stat-card-label">แดชบอร์ดทั้งหมด</span>
            <strong>{totalDashboards}</strong>
            <span className="home-stat-card-helper">มุมมองผู้บริหาร</span>
          </div>
          <div className="home-stat-card is-activity">
            <span className="home-stat-card-label">กิจกรรมล่าสุด</span>
            <strong>{recentActivityCount}</strong>
            <span className="home-stat-card-helper">พื้นที่ทำงานล่าสุด</span>
          </div>
          <div className="home-stat-card is-highlight">
            <span className="home-stat-card-label">รายการโปรด</span>
            <strong>{favoritesCount}</strong>
            <span className="home-stat-card-helper">รายการที่ปักหมุด</span>
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
            title={(
              <span className="home-section-title-row">
                <span>{t("home.projects")}</span>
                <Badge className="home-title-count-badge">{visibleProjects.length}</Badge>
              </span>
            )}
            actions={(
              <div className="home-projects-controls">
                <div className="home-section-pills home-sort-pills" aria-label="ตัวกรองมุมมองโปรเจกต์">
                  <button
                    type="button"
                    className={`home-filter-chip${projectSort === "recent" ? " is-active" : ""}`}
                    aria-pressed={projectSort === "recent"}
                    onClick={() => setProjectSort("recent")}
                  >
                    ล่าสุด
                  </button>
                  <button
                    type="button"
                    className={`home-filter-chip${projectSort === "active" ? " is-active" : ""}`}
                    aria-pressed={projectSort === "active"}
                    onClick={() => setProjectSort("active")}
                  >
                    ใช้งาน
                  </button>
                  <button
                    type="button"
                    className={`home-filter-chip${projectSort === "az" ? " is-active" : ""}`}
                    aria-pressed={projectSort === "az"}
                    onClick={() => setProjectSort("az")}
                  >
                    ก-ฮ
                  </button>
                </div>
              </div>
            )}
          />
          <div className="project-grid project-grid-command-center">
            {visibleProjects.map((project) => (
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

      <section className="home-section home-section-shell">
        <SectionHeader
          kicker="เทมเพลต"
          title="คลังเทมเพลต"
          description="เริ่มงานได้เร็วขึ้นด้วยเทมเพลตพื้นที่ทำงานที่คัดสรรไว้"
        />
        <div className="project-grid">
          {templateCatalog.map((template) => (
            <article className="project-card home-template-card" key={template.id}>
              <div className="project-card-accent" />
              <div className="project-card-body">
                <div className="project-card-top">
                  <div className="project-card-heading">
                    <div className="project-card-topline">
                      <div className="project-card-icon">ทม</div>
                      <div className="project-card-type">เทมเพลต</div>
                    </div>
                  </div>
                  <span className="project-card-status is-ready">พร้อมใช้</span>
                </div>
                <div className="project-card-name">{template.title}</div>
                <div className="project-card-context">
                  <span className="project-card-context-label">ภาพรวม</span>
                  <div className="project-card-context-value">{template.description}</div>
                </div>
                <div className="project-card-footer">
                  <div className="project-card-updated">
                    <span className="project-card-updated-label">เทมเพลต</span>
                    <strong>พร้อมใช้งาน</strong>
                  </div>
                <button
                  type="button"
                  className="project-card-manage-btn"
                  onClick={() => handleUseTemplate(template)}
                >
                  ใช้เทมเพลต
                </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="home-section home-section-shell home-section-shell-muted">
        <SectionHeader
          kicker="พื้นที่ทำงาน"
          title="กิจกรรมล่าสุด"
          description="กิจกรรมในพื้นที่ทำงานและรายการติดตามล่าสุด"
        />
        <div className="project-grid">
          {recentActivityFeed.map((activity) => (
            <article className="project-card home-activity-card" key={activity.id}>
              <div className="project-card-accent" />
              <div className="project-card-body">
                <div className="project-card-top">
                  <div className="project-card-topline">
                    <div className="project-card-icon">กจ</div>
                    <div className="project-card-type">{activity.context}</div>
                  </div>
                  <span className="project-card-status is-active">กิจกรรม</span>
                </div>
                <div className="project-card-name">{activity.title}</div>
                <div className="project-card-meta">
                  <span>{activity.details}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {showModal ? <CreateProjectModal onClose={() => setShowModal(false)} onCreate={handleCreate} /> : null}
    </PageContainer>
  );
}
