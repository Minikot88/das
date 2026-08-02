import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { PageContainer } from "@app/layouts/Layout";
import Button from "@shared/components/ui/Button";
import EmptyState from "@shared/components/ui/EmptyState";
import Panel from "@shared/components/ui/Panel";
import ProjectCard from "@modules/projects/components/ProjectCard";
import SectionHeader from "@shared/components/ui/SectionHeader";
import CreateProjectModal from "@modules/projects/components/CreateProjectModal";
import { useStore } from "@app/store/useStore";
import { useI18n } from "@shared/lib/i18n";
import { isMockMode } from "@infrastructure/http/client";
import {
  archiveProject as archiveApiProject,
  createProject as createApiProject,
  getProjects as getApiProjects,
  updateProject as updateApiProject,
  API_ACTIVE_PROJECT_KEY,
} from "@modules/projects/api/projectApi";
import { createDashboard as createApiDashboard, listDashboards } from "@modules/dashboards/public/api";
import { listDatasets } from "@modules/datasets/public/api";
import { getCharts } from "@modules/charts/public/api";
import { createBuilderContextForDashboard } from "@modules/dashboards/public/workspace";
import { TEMPLATE_GALLERY_CATALOG } from "@modules/charts/public/catalog";
import { resolveHomeActiveProject, shouldPersistLegacyDashboard } from "./homeProjectSelection";
import {
  ACTIVE_DASHBOARD_KEY,
  ACTIVE_PROJECT_KEY,
  createDashboard as createStoredDashboard,
  createProject as createStoredProject,
  getActiveProject as getStoredActiveProject,
  getProjects as getStoredProjects,
  PROJECTS_KEY,
  renameProject as renameStoredProject,
  setActiveDashboard as setStoredActiveDashboard,
  setActiveProject as setStoredActiveProject,
} from "@infrastructure/persistence/project-storage/projectStorage";

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

function latestDate(...values) {
  return values
    .flat()
    .filter(Boolean)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;
}

function dashboardDisplayName(dashboard) {
  return dashboard?.name || dashboard?.dashboardName || "แดชบอร์ด";
}

export default function HomePage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const legacyProjects = useStore((state) => state.projects);
  const legacyUi = useStore((state) => state.ui);
  const legacyActiveProjectId = useStore((state) => state.activeProjectId);
  const legacyActiveSheetId = useStore((state) => state.activeSheetId);
  const legacyActiveDashboardId = useStore((state) => state.activeDashboardId);
  const [workspaceRevision, setWorkspaceRevision] = useState(0);
  const [remoteProjects, setRemoteProjects] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [projectSort, setProjectSort] = useState("recent");
  const [homeNotice, setHomeNotice] = useState("");
  const projects = useMemo(() => {
    void workspaceRevision;
    void legacyProjects;
    return isMockMode() ? getStoredProjects() : remoteProjects;
  }, [legacyProjects, remoteProjects, workspaceRevision]);
  const preferredApiProjectId = !isMockMode()
    ? window.localStorage.getItem(API_ACTIVE_PROJECT_KEY)
    : null;
  const activeProject = useMemo(() => resolveHomeActiveProject(projects, {
    mockMode: isMockMode(),
    activeProjectId: legacyActiveProjectId,
    preferredProjectId: preferredApiProjectId,
    resolveMockProject: getStoredActiveProject,
  }), [legacyActiveProjectId, preferredApiProjectId, projects]);
  const activeProjectId = activeProject?.id ?? projects[0]?.id ?? null;

  const totalDashboards = projects.reduce((count, project) => count + (project.dashboards?.length ?? 0), 0);
  const totalDatasets = projects.reduce((count, project) => count + (project.datasets?.length ?? 0), 0);
  const totalCharts = projects.reduce((count, project) => count + (project.charts?.length ?? 0), 0);
  const workspaceTitle = activeProject?.name ? `โปรเจกต์: ${activeProject.name}` : "พื้นที่ทำงาน 01";
  const refreshProjects = () => setWorkspaceRevision((revision) => revision + 1);

  const reloadRemoteProjects = React.useCallback(async () => {
    if (isMockMode()) return;
    try {
      const [apiProjects, charts] = await Promise.all([getApiProjects(), getCharts()]);
      const enriched = await Promise.all((apiProjects ?? []).map(async (project) => {
        const [dashboards, datasetResponse] = await Promise.all([
          listDashboards(project.id),
          listDatasets({ projectId: project.id, page: 1, pageSize: 100 }),
        ]);
        return {
          ...project,
          dashboards: dashboards ?? [],
          datasets: datasetResponse?.items ?? [],
          charts: (charts ?? []).filter((chart) => chart.projectId === project.id),
        };
      }));
      setRemoteProjects(enriched);
    } catch (error) {
      setHomeNotice(error?.message || "Unable to load projects from the API.");
    }
  }, []);

  React.useEffect(() => {
    void reloadRemoteProjects();
  }, [reloadRemoteProjects]);

  React.useEffect(() => {
    if (!isMockMode()) return undefined;
    const onStorage = (event) => {
      if ([PROJECTS_KEY, ACTIVE_PROJECT_KEY, ACTIVE_DASHBOARD_KEY].includes(event.key)) refreshProjects();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  React.useEffect(() => {
    if (!homeNotice) return undefined;
    const timer = window.setTimeout(() => setHomeNotice(""), 2800);
    return () => window.clearTimeout(timer);
  }, [homeNotice]);

  const activateProject = (projectId, dashboardId) => {
    if (isMockMode()) {
      setStoredActiveProject(projectId, dashboardId);
      return;
    }
    window.localStorage.setItem(API_ACTIVE_PROJECT_KEY, projectId);
    if (dashboardId) window.localStorage.setItem(ACTIVE_DASHBOARD_KEY, dashboardId);
    useStore.setState({
      activeProjectId: projectId,
      ...(dashboardId ? { activeDashboardId: dashboardId } : {}),
    });
  };

  const openProject = (projectId) => {
    if (!projectId) return;
    activateProject(projectId);
    refreshProjects();
    navigate("/dashboard");
  };

  const openDashboard = (projectId, dashboardId) => {
    if (!projectId || !dashboardId) return;
    activateProject(projectId, dashboardId);
    if (shouldPersistLegacyDashboard(isMockMode())) setStoredActiveDashboard(dashboardId);
    refreshProjects();
    navigate("/dashboard");
  };

  const createDashboardInProject = async (projectId) => {
    if (!projectId) return;
    if (!isMockMode()) {
      try {
        const dashboard = await createApiDashboard({ projectId, name: "Dashboard ใหม่" });
        activateProject(projectId, dashboard.id);
        await reloadRemoteProjects();
        setHomeNotice("สร้าง Dashboard ใหม่แล้ว");
        navigate("/dashboard");
      } catch (error) {
        setHomeNotice(error?.message || "Unable to create dashboard.");
      }
      return;
    }
    const dashboard = createStoredDashboard(projectId, "แดชบอร์ดใหม่");
    activateProject(projectId, dashboard.id);
    setStoredActiveDashboard(dashboard.id);
    refreshProjects();
    setHomeNotice("สร้าง Dashboard ใหม่แล้ว");
    navigate("/dashboard");
  };

  const renameProject = async (projectId, name) => {
    if (!isMockMode()) {
      const project = projects.find((item) => item.id === projectId);
      if (!project) return;
      try {
        await updateApiProject(projectId, { name, revision: project.revision });
        await reloadRemoteProjects();
        setHomeNotice("เปลี่ยนชื่อโปรเจกต์แล้ว");
      } catch (error) {
        setHomeNotice(error?.message || "Unable to rename project.");
      }
      return;
    }
    renameStoredProject(projectId, name);
    refreshProjects();
    setHomeNotice("เปลี่ยนชื่อโปรเจกต์แล้ว");
  };

  const deleteProject = async (projectId) => {
    if (!isMockMode()) {
      const project = projects.find((item) => item.id === projectId);
      if (!project) return;
      try {
        await archiveApiProject(projectId, project.revision);
        await reloadRemoteProjects();
        setHomeNotice("ลบโปรเจกต์แล้ว");
      } catch (error) {
        setHomeNotice(error?.message || "Unable to delete project.");
      }
      return;
    }
    setHomeNotice("การลบโปรเจกต์จะเปิดใช้เมื่อเชื่อมต่อ backend แล้ว");
  };

  const changeProjectSort = (nextSort) => {
    const sortLabels = {
      recent: "ล่าสุด",
      active: "ใช้งาน",
      az: "ก-ฮ",
    };

    setProjectSort(nextSort);
    setHomeNotice(`จัดเรียงรายการทำงานต่อ: ${sortLabels[nextSort] ?? "ล่าสุด"}`);
  };

  const quickTools = [
    {
      icon: "DB",
      label: "เปิดแดชบอร์ด",
      description: "จัดวางวิดเจ็ตบน Canvas",
      action: () => openProject(activeProjectId),
      primary: true,
    },
    {
      icon: "ND",
      label: "สร้าง Dashboard",
      description: "สร้าง Dashboard ใหม่ภายในโปรเจกต์ปัจจุบัน",
      action: () => createDashboardInProject(activeProjectId),
    },
    {
      icon: "CH",
      label: "สร้างกราฟ",
      description: "ออกแบบและบันทึกกราฟ reusable",
      action: () => navigate("/dashboard-v2"),
    },
    {
      icon: "LG",
      label: "แดชบอร์ดเดิม",
      description: "เปิดหน้าแดชบอร์ดรุ่นเดิม",
      action: () => navigate("/dashboard-legacy"),
    },
    {
      icon: "DS",
      label: "จัดการชุดข้อมูล",
      description: "ดูและนำเข้าชุดข้อมูลจากระบบ",
      action: () => navigate("/datasets"),
    },
    {
      icon: "IM",
      label: "นำเข้าข้อมูล",
      description: "เตรียมข้อมูลสำหรับรายงาน",
      action: () => navigate("/datasets"),
    },
    {
      icon: "ST",
      label: "ตั้งค่าพื้นที่ทำงาน",
      description: "จัดการค่าพื้นฐานของระบบ",
      action: () => navigate("/settings"),
    },
  ];
  const workspaceStatusItems = [
    { label: "โปรเจกต์", value: projects.length },
    { label: "แดชบอร์ด", value: totalDashboards },
    { label: "ชุดข้อมูล", value: totalDatasets },
    { label: "กราฟ", value: totalCharts },
  ];
  const systemStatusItems = [
    {
      label: isMockMode() ? "Mock Mode" : "Data Source",
      value: isMockMode() ? "เปิดสำหรับการพัฒนา" : "PostgreSQL API",
      tone: isMockMode() ? "muted" : "success",
    },
    {
      label: "Persistence",
      value: isMockMode() ? "Local workspace" : "Backend API",
      tone: "success",
    },
    { label: "Chart Engine", value: "Apache ECharts", tone: "neutral" },
    { label: "Export", value: "PNG / CSV / JSON", tone: "neutral" },
    { label: "Backend", value: isMockMode() ? "Mock adapter" : "เชื่อมต่อแล้ว", tone: isMockMode() ? "muted" : "success" },
  ];
  const gettingStartedItems = [
    "\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e0a\u0e38\u0e14\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25",
    "\u0e40\u0e1b\u0e34\u0e14\u0e41\u0e14\u0e0a\u0e1a\u0e2d\u0e23\u0e4c\u0e14",
    "\u0e40\u0e25\u0e37\u0e2d\u0e01 Template",
    "Export \u0e2b\u0e23\u0e37\u0e2d Share",
  ];
  const sortedProjects = useMemo(() => {
    const recentProjectIds = legacyUi?.recentProjectIds ?? [];
    return [...projects].sort((a, b) => {
      const aIndex = recentProjectIds.indexOf(a.id);
      const bIndex = recentProjectIds.indexOf(b.id);
      const safeA = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
      const safeB = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;
      return safeA - safeB;
    });
  }, [legacyUi?.recentProjectIds, projects]);

  const projectSummaries = useMemo(() => {
    return Object.fromEntries(
      projects.map((project) => {
        const dashboards = project.dashboards ?? [];
        const dashboardCount = dashboards.length;
        const datasetCount = project.datasets?.length ?? 0;
        const chartCount = project.charts?.length ?? 0;
        const dashboardList = dashboards.slice(0, 3).map((dashboard) => {
          const lastUpdated = latestDate(dashboard.updatedAt, dashboard.createdAt);
          return {
            id: dashboard.id,
            name: dashboardDisplayName(dashboard),
            widgetCount: dashboard.widgets?.length ?? 0,
            updatedLabel: formatLastUpdated(lastUpdated) ?? "ยังไม่มีการอัปเดต",
          };
        });
        const lastUpdated = latestDate(
          dashboards.map((dashboard) => dashboard.updatedAt ?? dashboard.createdAt),
          project.charts?.map((chart) => chart.updatedAt ?? chart.createdAt),
          project.updatedAt,
          project.createdAt
        );

        return [
          project.id,
          {
            dashboardCount,
            datasetCount,
            chartCount,
            dashboardList,
            lastUpdatedLabel: formatLastUpdated(lastUpdated) ?? t("home.noRecentUpdates"),
          },
        ];
      })
    );
  }, [projects, t]);

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

  const recommendedTemplates = useMemo(
    () => [
      {
        ...(TEMPLATE_GALLERY_CATALOG[0] ?? {}),
        id: "recommended-sales",
        title: "แดชบอร์ดยอดขาย",
        description: "ติดตามรายได้ เป้าหมายการขาย และแนวโน้มสำคัญ",
      },
      {
        ...(TEMPLATE_GALLERY_CATALOG[1] ?? {}),
        id: "recommended-finance",
        title: "แดชบอร์ดการเงิน",
        description: "ดูงบประมาณ กำไร กระแสเงินสด และภาพรวมการเงิน",
      },
      {
        ...(TEMPLATE_GALLERY_CATALOG[2] ?? {}),
        id: "recommended-marketing",
        title: "แดชบอร์ดการตลาด",
        description: "วิเคราะห์แคมเปญ ช่องทางการเติบโต และผลลัพธ์การตลาด",
      },
      {
        ...(TEMPLATE_GALLERY_CATALOG[3] ?? {}),
        id: "recommended-research",
        title: "แดชบอร์ดงานวิจัย",
        description: "ติดตามความคืบหน้า อินไซต์ และสถานะการทดลอง",
      },
      {
        ...(TEMPLATE_GALLERY_CATALOG[4] ?? {}),
        id: "recommended-hr",
        title: "แดชบอร์ดผู้บริหาร",
        description: "สรุปตัวชี้วัดสำคัญสำหรับการตัดสินใจระดับผู้บริหาร",
      },
    ],
    []
  );

  const activeTemplateContext = useMemo(() => {
    if (!legacyActiveProjectId) return null;
    const activeProject = legacyProjects.find((project) => project.id === legacyActiveProjectId) ?? null;
    const activeSheet = activeProject?.sheets.find((sheet) => sheet.id === legacyActiveSheetId) ?? activeProject?.sheets?.[0] ?? null;
    const activeDashboard = activeSheet?.dashboards.find((dashboard) => dashboard.id === legacyActiveDashboardId) ?? activeSheet?.dashboards?.[0] ?? null;

    if (!activeProject || !activeSheet || !activeDashboard) return null;

    return createBuilderContextForDashboard({
      projectId: activeProject.id,
      sheetId: activeSheet.id,
      dashboardId: activeDashboard.id,
      returnTo: "/dashboard",
      source: "template-gallery",
    });
  }, [legacyActiveDashboardId, legacyActiveProjectId, legacyActiveSheetId, legacyProjects]);

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
    openProject(id);
  };

  const handleCreate = async (name) => {
    if (!isMockMode()) {
      try {
        const project = await createApiProject(name);
        const dashboard = await createApiDashboard({ projectId: project.id, name: "Dashboard 1" });
        await reloadRemoteProjects();
        activateProject(project.id, dashboard.id);
        navigate("/dashboard");
      } catch (error) {
        setHomeNotice(error?.message || "Unable to create project.");
      }
      return;
    }
    const project = createStoredProject(name);
    refreshProjects();
    activateProject(project.id, project.dashboards[0]?.id);
    navigate("/dashboard");
  };

  return (
    <PageContainer className="home-page" role="region" aria-label="ภาพรวมพื้นที่ทำงาน">
      {homeNotice ? <div className="home-toast" role="status">{homeNotice}</div> : null}
      <section className="home-top-showcase" aria-label="ภาพรวมพื้นที่ทำงาน">
        <Panel className="home-panel home-command-center" compact>
          <div className="home-hero-layout">
            <div className="home-hero-copy">
              <span className="home-hero-emoji" aria-hidden="true">BI</span>
              <div className="home-hero-text">
                <h1 className="home-hero-title">หน้าหลัก</h1>
                <p className="home-hero-workspace">{workspaceTitle}</p>
                <p className="home-hero-summary">
                  จัดการแดชบอร์ด ชุดข้อมูล และเครื่องมือทั้งหมดจากที่เดียว
                </p>
                <div className="home-toolbar-actions">
                  <Button variant="primary" className="home-dashboard-btn" onClick={() => openProject(activeProjectId)}>
                    เปิดแดชบอร์ด
                  </Button>
                  <Button variant="secondary" className="home-dashboard-btn" onClick={() => createDashboardInProject(activeProjectId)}>
                    สร้าง Dashboard
                  </Button>
                  <Button variant="secondary" className="home-designer-btn" onClick={() => navigate("/dashboard-v2")}>
                    สร้างกราฟ
                  </Button>
                  <Button variant="ghost" className="home-legacy-btn" onClick={() => navigate("/dashboard-legacy")}>
                    แดชบอร์ดเดิม
                  </Button>
                  <Button variant="secondary" className="home-create-btn" onClick={() => navigate("/datasets")}>
                    นำเข้าข้อมูล
                  </Button>
                  <Button id="create-project-btn" variant="ghost" className="home-create-btn" onClick={() => setShowModal(true)}>
                    สร้างโปรเจกต์ใหม่
                  </Button>
                </div>
              </div>
            </div>
            <div className="home-workspace-status" aria-label="สรุปสถานะพื้นที่ทำงาน">
              <div className="home-workspace-status-title">Workspace status</div>
              <div className="home-workspace-status-grid">
                {workspaceStatusItems.map((item) => (
                  <div className="home-workspace-status-row" key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Panel>

        <div className="home-stats-grid">
          <div className="home-stat-card is-projects">
            <span className="home-stat-icon" aria-hidden="true">PR</span>
            <span className="home-stat-card-label">โปรเจกต์</span>
            <strong>{projects.length}</strong>
            <span className="home-stat-card-helper">ทั้งหมด</span>
          </div>
          <div className="home-stat-card is-dashboards">
            <span className="home-stat-icon" aria-hidden="true">DB</span>
            <span className="home-stat-card-label">แดชบอร์ด</span>
            <strong>{totalDashboards}</strong>
            <span className="home-stat-card-helper">พร้อมใช้งาน</span>
          </div>
          <div className="home-stat-card is-activity">
            <span className="home-stat-icon" aria-hidden="true">DS</span>
            <span className="home-stat-card-label">ชุดข้อมูล</span>
            <strong>{totalDatasets}</strong>
            <span className="home-stat-card-helper">เชื่อมต่อแล้ว</span>
          </div>
          <div className="home-stat-card is-highlight">
            <span className="home-stat-icon" aria-hidden="true">US</span>
            <span className="home-stat-card-label">ผู้ใช้งาน</span>
            <strong>{activeProject ? 1 : 0}</strong>
            <span className="home-stat-card-helper">กำลังใช้งาน</span>
          </div>
        </div>
      </section>

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
        <div className="home-command-grid">
          <div className="home-command-main">
            <section className="home-section home-section-shell home-continue-card">
              <SectionHeader
                kicker={null}
                title="ดำเนินการต่อ"
                actions={(
                  <button type="button" className="home-view-all-link" onClick={() => navigate("/dashboard")}>
                    ดูทั้งหมด
                  </button>
                )}
              />
              <div className="home-continue-filters" aria-label="ตัวกรองรายการทำงานต่อ">
                <button
                  type="button"
                  className={`home-filter-chip${projectSort === "recent" ? " is-active" : ""}`}
                  aria-pressed={projectSort === "recent"}
                  onClick={() => changeProjectSort("recent")}
                >
                  ล่าสุด
                </button>
                <button
                  type="button"
                  className={`home-filter-chip${projectSort === "active" ? " is-active" : ""}`}
                  aria-pressed={projectSort === "active"}
                  onClick={() => changeProjectSort("active")}
                >
                  ใช้งาน
                </button>
                <button
                  type="button"
                  className={`home-filter-chip${projectSort === "az" ? " is-active" : ""}`}
                  aria-pressed={projectSort === "az"}
                  onClick={() => changeProjectSort("az")}
                >
                  ก-ฮ
                </button>
              </div>
              <div className="project-grid project-grid-command-center">
                {visibleProjects.slice(0, 3).map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    summary={projectSummaries[project.id]}
                    isActive={project.id === activeProjectId}
                    onOpen={handleOpenProject}
                    onOpenDashboard={openDashboard}
                    onCreateDashboard={createDashboardInProject}
                    onRenameProject={renameProject}
                    onDelete={deleteProject}
                    canDelete={projects.length > 1}
                  />
                ))}
              </div>
            </section>

            <section className="home-section home-section-shell home-template-section">
              <SectionHeader
                kicker={null}
                title="เทมเพลตแนะนำ"
              />
              <div className="home-template-list">
                {recommendedTemplates.slice(0, 4).map((template) => (
                  <article className="home-template-row" key={template.id}>
                    <span className="home-template-icon" aria-hidden="true">BI</span>
                    <div className="home-template-copy">
                      <strong>{template.title}</strong>
                      <span>{template.description}</span>
                    </div>
                    <button
                      type="button"
                      className="home-template-action"
                      onClick={() => handleUseTemplate(template)}
                    >
                      ใช้
                    </button>
                  </article>
                ))}
              </div>
            </section>
          </div>

          <aside className="home-command-side" aria-label="เครื่องมือและสถานะพื้นที่ทำงาน">
            <section className="home-section home-section-shell home-tools-panel">
              <SectionHeader kicker={null} title="เครื่องมือด่วน" />
              <div className="home-tools-list">
                {quickTools.map((tool) => (
                  <button
                    type="button"
                    className={`home-tool-row${tool.primary ? " is-primary" : ""}`}
                    key={tool.label}
                    onClick={tool.action}
                  >
                    <span className="home-tool-icon" aria-hidden="true">{tool.icon}</span>
                    <span className="home-tool-copy">
                      <strong>{tool.label}</strong>
                      <span>{tool.description}</span>
                    </span>
                    <span className="home-tool-chevron" aria-hidden="true">›</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="home-section home-section-shell home-status-panel">
              <SectionHeader kicker={null} title="สถานะระบบ" />
              <div className="home-status-list">
                {systemStatusItems.map((item) => (
                  <div className="home-status-row" key={item.label}>
                    <span className={`home-status-dot is-${item.tone}`} aria-hidden="true" />
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            </section>

            <section className="home-section home-section-shell home-tips-panel">
              <SectionHeader kicker={null} title="เริ่มต้นใช้งาน" />
              <ol className="home-tips-list">
                {gettingStartedItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            </section>
          </aside>
        </div>
      )}

      {showModal ? <CreateProjectModal onClose={() => setShowModal(false)} onCreate={handleCreate} /> : null}
    </PageContainer>
  );
}
