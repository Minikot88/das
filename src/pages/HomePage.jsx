import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createProject as createProjectApi } from "../api/projectApi";
import { PageContainer } from "../components/layout/Layout";
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
  const totalSheets = projects.reduce((count, project) => count + (project.sheets?.length ?? 0), 0);
  const workspaceTitle = "พื้นที่ทำงาน 01";
  const activeProject = projects.find((project) => project.id === activeProjectId) ?? projects[0] ?? null;
  const quickTools = [
    {
      icon: "DB",
      label: "เปิดแดชบอร์ด",
      description: "จัดวางวิดเจ็ตบน Canvas",
      action: () => navigate("/dashboard"),
      primary: true,
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
      description: "ดูและนำเข้าข้อมูลตัวอย่าง",
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
    { label: "ชุดข้อมูล", value: totalSheets },
    { label: "ผู้ใช้งาน", value: activeProject ? 1 : 0 },
  ];
  const systemStatusItems = [
    { label: "Demo Mode", value: "เปิดใช้งาน", tone: "success" },
    { label: "Local Save", value: "พร้อมบันทึก", tone: "success" },
    { label: "Chart Engine", value: "Apache ECharts", tone: "neutral" },
    { label: "Export", value: "PNG / CSV / JSON", tone: "neutral" },
    { label: "Backend", value: "ยังไม่เชื่อมต่อ", tone: "muted" },
  ];
  const gettingStartedItems = [
    "เลือกชุดข้อมูล",
    "เปิดแดชบอร์ด",
    "เลือก Template",
    "Export หรือ Share",
  ];

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
                  <Button variant="primary" className="home-dashboard-btn" onClick={() => navigate("/dashboard")}>
                    เปิดแดชบอร์ด
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
            <strong>{totalSheets}</strong>
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
              <div className="project-grid project-grid-command-center">
                {visibleProjects.slice(0, 3).map((project) => (
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
