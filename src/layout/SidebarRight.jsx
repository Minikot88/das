import React, { useMemo, useState } from "react";
import { useStore } from "../store/useStore";

const WIDGET_LIBRARY_ITEMS = [
  {
    id: "kpi",
    category: "วิเคราะห์",
    name: "KPI",
    copy: "การ์ดตัวชี้วัดเดี่ยวพร้อมแนวโน้มและคำอธิบายเปรียบเทียบ",
    type: "kpi",
    preview: "คะแนนสดพร้อมสัญญาณทิศทาง",
    isPlaceholder: false,
  },
  {
    id: "bar-chart",
    category: "วิเคราะห์",
    name: "กราฟแท่ง",
    copy: "เปรียบเทียบกลุ่มและประสิทธิภาพรายส่วนได้รวดเร็ว",
    type: "bar",
    preview: "แท่งข้อมูลเปรียบเทียบหลายมิติ",
    isPlaceholder: false,
  },
  {
    id: "line-chart",
    category: "วิเคราะห์",
    name: "กราฟเส้น",
    copy: "ดูแนวโน้มตามเวลาของตัวชี้วัดหลัก",
    type: "line",
    preview: "ไทม์ไลน์พร้อมจุดข้อมูล",
    isPlaceholder: false,
  },
  {
    id: "area-chart",
    category: "วิเคราะห์",
    name: "กราฟพื้นที่",
    copy: "ติดตามปริมาณและการเติบโตสะสม",
    type: "area",
    preview: "แนวโน้มพื้นที่แบบซ้อน",
    isPlaceholder: false,
  },
  {
    id: "pie-chart",
    category: "วิเคราะห์",
    name: "กราฟวงกลม",
    copy: "สัดส่วนรวมแยกตามหมวดหมู่",
    type: "pie",
    preview: "สัดส่วนแบบโดนัท",
    isPlaceholder: false,
  },
  {
    id: "table",
    category: "ข้อมูล",
    name: "ตาราง",
    copy: "รายละเอียดแบบตารางพร้อมฟิลด์ที่เรียงได้",
    type: "table",
    preview: "แถวและคอลัมน์ในกริดข้อมูล",
    isPlaceholder: true,
  },
  {
    id: "pivot-table",
    category: "ข้อมูล",
    name: "ตาราง Pivot",
    copy: "สรุปแบบไขว้สำหรับการเจาะดูข้อมูล",
    type: "pivot",
    preview: "เลย์เอาต์เมทริกซ์พร้อมฟิลด์ Pivot",
    isPlaceholder: true,
  },
  {
    id: "text",
    category: "สื่อ",
    name: "ข้อความ",
    copy: "บล็อกคำอธิบายและข้อคิดเห็นผู้บริหาร",
    type: "text",
    preview: "หัวข้อและข้อความบริบท",
    isPlaceholder: true,
  },
  {
    id: "image",
    category: "สื่อ",
    name: "รูปภาพ",
    copy: "ภาพแบรนด์ โลโก้ และสื่อคงที่",
    type: "image",
    preview: "พื้นที่รูปภาพพร้อมขนาดที่ปลอดภัย",
    isPlaceholder: true,
  },
  {
    id: "filter",
    category: "เครื่องมือ",
    name: "ตัวกรอง",
    copy: "คอนโทรลที่ใช้ซ้ำได้สำหรับหน้าแดชบอร์ด",
    type: "filter",
    preview: "ชิปตัวกรองและสรุปผล",
    isPlaceholder: true,
  },
  {
    id: "divider",
    category: "เครื่องมือ",
    name: "เส้นแบ่ง",
    copy: "ตัวแบ่งส่วนเพื่อจัดลำดับภาพ",
    type: "divider",
    preview: "เส้นแบ่งและจังหวะระยะห่าง",
    isPlaceholder: true,
  },
];

const INSPECTOR_TABS = [
  { id: "properties", label: "คุณสมบัติ" },
  { id: "visual", label: "ภาพ" },
  { id: "data", label: "ข้อมูล" },
  { id: "interactions", label: "การโต้ตอบ" },
];

function SidebarSection({ title, meta = null, children, compact = false }) {
  return (
    <section className={`dashboard-sidebar-section${compact ? " is-compact" : ""}`}>
      <div className="dashboard-sidebar-section-head">
        <div className="dashboard-sidebar-section-title">{title}</div>
        {meta ? <div className="dashboard-sidebar-section-meta">{meta}</div> : null}
      </div>
      {children}
    </section>
  );
}

function SidebarStatTile({ label, value, tone = "" }) {
  return (
    <div className={`dashboard-sidebar-stat-tile${tone ? ` is-${tone}` : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SidebarKeyValue({ label, value }) {
  return (
    <div className="dashboard-sidebar-selection-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function WidgetListItem({ widget, isActive, onSelectWidget, onRemoveWidget }) {
  return (
    <div className={`dashboard-sidebar-chart-item${isActive ? " is-active" : ""}`}>
      <button
        type="button"
        onClick={() => onSelectWidget(widget.id)}
        className="dashboard-sidebar-chart-item-trigger"
      >
        <div className="dashboard-sidebar-chart-row">
          <div className="dashboard-sidebar-chart-title-wrap">
            <div className="dashboard-sidebar-chart-title">{widget.name}</div>
            <div className="dashboard-sidebar-chart-meta-row">
              <span className="dashboard-sidebar-chart-type">{widget.typeLabel}</span>
              <span className={`dashboard-sidebar-chart-state${isActive ? " is-active" : ""}`}>
                {isActive ? "เลือกอยู่" : "พร้อมใช้"}
              </span>
            </div>
          </div>
          <span className="dashboard-sidebar-chart-bullet" aria-hidden="true" />
        </div>
        <div className="dashboard-sidebar-chart-secondary-row">
          <span className="dashboard-sidebar-chart-meta">{widget.metaLabel}</span>
        </div>
      </button>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onRemoveWidget(widget.id);
        }}
        className="dashboard-sidebar-delete-btn"
        aria-label={`ลบ ${widget.name}`}
      >
        ลบ
      </button>
    </div>
  );
}

function InspectorAccordion({ title, meta = null, children, defaultOpen = true }) {
  return (
    <details className="dashboard-inspector-accordion" open={defaultOpen}>
      <summary className="dashboard-inspector-accordion-summary">
        <span>{title}</span>
        {meta ? <small>{meta}</small> : null}
      </summary>
      <div className="dashboard-inspector-accordion-body">{children}</div>
    </details>
  );
}

function InspectorFieldRow({ label, value, tone = "" }) {
  return (
    <div className={`dashboard-inspector-field-row${tone ? ` is-${tone}` : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function InspectorControlPreview({ label, value, helper = null }) {
  return (
    <div className="dashboard-inspector-control-preview">
      <span>{label}</span>
      <strong>{value}</strong>
      {helper ? <small>{helper}</small> : null}
    </div>
  );
}

function InspectorTogglePreview({ label, checked = false, helper = null }) {
  return (
    <div className="dashboard-inspector-toggle-preview">
      <span>
        <strong>{label}</strong>
        {helper ? <small>{helper}</small> : null}
      </span>
      <span className={`dashboard-inspector-toggle${checked ? " is-on" : ""}`} aria-hidden="true" />
    </div>
  );
}

function InspectorSwatch({ label, color }) {
  return (
    <span className="dashboard-inspector-swatch">
      <span style={{ background: color }} aria-hidden="true" />
      {label}
    </span>
  );
}

function WidgetLibraryItem({ item, isFavorite, onFavoriteToggle }) {
  return (
    <article className="dashboard-sidebar-widget-card">
      <div className="dashboard-sidebar-widget-preview" aria-hidden="true">
        {item.preview}
      </div>
      <div className="dashboard-sidebar-widget-copy">
        <span className={`dashboard-sidebar-chart-type ${item.isPlaceholder ? "is-utility" : ""}`}>{item.type}</span>
        <strong className="dashboard-sidebar-widget-title">{item.name}</strong>
        <span className="dashboard-sidebar-widget-copy-text">{item.copy}</span>
      </div>
      <span className="dashboard-sidebar-widget-actions">
        <span className={`dashboard-sidebar-widget-meta-chip${item.isPlaceholder ? " is-soft" : " is-live"}`}>
          {item.category}
        </span>
        <button
          type="button"
          className={`dashboard-sidebar-delete-btn dashboard-sidebar-widget-favorite${isFavorite ? " is-favorite" : ""}`}
          onClick={(event) => {
            event.stopPropagation();
            onFavoriteToggle(item.id);
          }}
          aria-label={`${isFavorite ? "นำออกจากรายการที่บันทึก" : "บันทึก"} เทมเพลตวิดเจ็ต ${item.name}`}
        >
          {isFavorite ? "บันทึกแล้ว" : "บันทึก"}
        </button>
      </span>
    </article>
  );
}

export default function SidebarRight({
  widgets = [],
  selectedWidgetId = null,
  projectName = "",
  dashboardName = "",
  isCollapsed = false,
  onSelectWidget,
  onRemoveWidget,
  favoriteDashboardIds = [],
  recentDashboardIds = [],
  onToggleCollapsed,
  onToggleFavoriteDashboard,
}) {
  const projects = useStore((state) => state.projects);
  const activeProjectId = useStore((state) => state.activeProjectId);
  const activeSheetId = useStore((state) => state.activeSheetId);
  const activeDashboardId = useStore((state) => state.activeDashboardId);
  const setActiveDashboard = useStore((state) => state.setActiveDashboard);
  const selectedWidget = widgets.find((widget) => widget.id === selectedWidgetId) ?? null;
  const isWorkspaceInspector = Boolean(projectName || dashboardName || widgets.length);
  const activeProject = projects.find((project) => project.id === activeProjectId) ?? projects[0] ?? null;
  const activeSheet = activeProject?.sheets.find((sheet) => sheet.id === activeSheetId) ?? activeProject?.sheets?.[0] ?? null;
  const activeDashboard =
    activeSheet?.dashboards.find((dashboard) => dashboard.id === activeDashboardId) ??
    activeSheet?.dashboards?.[0] ??
    null;
  const totalSheets = projects.reduce((count, project) => count + (project.sheets?.length ?? 0), 0);
  const totalDashboards = projects.reduce(
    (count, project) => count + (project.sheets?.reduce((sheetCount, sheet) => sheetCount + (sheet.dashboards?.length ?? 0), 0) ?? 0),
    0
  );
  const hasWidgets = widgets.length > 0;
  const dashboardContextLabel = [projectName, dashboardName].filter(Boolean).join(" / ");
  const workspaceContextLabel = [activeSheet?.name ?? "ไม่มีชีต", activeDashboard?.name ?? "ไม่มีแดชบอร์ด"].join(" / ");
  const [widgetSearch, setWidgetSearch] = useState("");
  const [favoriteWidgetIds, setFavoriteWidgetIds] = useState(["kpi", "bar-chart", "line-chart"]);
  const [activeInspectorTab, setActiveInspectorTab] = useState("properties");
  const dashboardLookup = useMemo(() => {
    const rows = [];
    projects.forEach((project) => {
      (project.sheets ?? []).forEach((sheet) => {
        (sheet.dashboards ?? []).forEach((dashboard) => {
          rows.push({
            id: dashboard.id,
            name: dashboard.name,
            projectName: project.name,
            sheetName: sheet.name,
          });
        });
      });
    });
    return rows;
  }, [projects]);
  const favoriteDashboards = useMemo(() => {
    const map = new Map(dashboardLookup.map((item) => [item.id, item]));
    return favoriteDashboardIds.map((id) => map.get(id)).filter(Boolean);
  }, [dashboardLookup, favoriteDashboardIds]);
  const recentDashboards = useMemo(() => {
    const map = new Map(dashboardLookup.map((item) => [item.id, item]));
    return recentDashboardIds.map((id) => map.get(id)).filter(Boolean);
  }, [dashboardLookup, recentDashboardIds]);
  const widgetLibraryItems = useMemo(
    () => WIDGET_LIBRARY_ITEMS.filter((item) => {
      if (!widgetSearch.trim()) return true;
      const query = widgetSearch.trim().toLowerCase();
      return (
        item.name.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        item.copy.toLowerCase().includes(query)
      );
    }),
    [widgetSearch]
  );
  const groupedLibraryItems = useMemo(() => {
    const result = {};
    widgetLibraryItems.forEach((item) => {
      if (!result[item.category]) result[item.category] = [];
      result[item.category].push(item);
    });
    return result;
  }, [widgetLibraryItems]);

  function toggleFavoriteWidget(widgetId) {
    setFavoriteWidgetIds((previous) => {
      const next = new Set(previous);
      if (next.has(widgetId)) next.delete(widgetId);
      else next.add(widgetId);
      return [...next];
    });
  }

  function activateDashboardById(dashboardId) {
    setActiveDashboard(dashboardId);
  }

  function handleInspectorTabKeyDown(event, currentIndex) {
    let nextIndex = currentIndex;
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % INSPECTOR_TABS.length;
    else if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + INSPECTOR_TABS.length) % INSPECTOR_TABS.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = INSPECTOR_TABS.length - 1;
    else return;

    event.preventDefault();
    const nextTab = INSPECTOR_TABS[nextIndex];
    setActiveInspectorTab(nextTab.id);
    document.getElementById(`dashboard-inspector-tab-${nextTab.id}`)?.focus();
  }

  const selectedWidgetTitle = selectedWidget?.name ?? "ยังไม่ได้เลือกวิดเจ็ต";
  const selectedWidgetType = selectedWidget?.typeLabel ?? "พื้นที่วิเคราะห์";
  const selectedWidgetMeta = selectedWidget?.metaLabel ?? "เลือกวิดเจ็ตเพื่อตรวจการตั้งค่าภาพ ข้อมูล และการโต้ตอบ";

  if (!isWorkspaceInspector) {
    return (
      <aside className="ui-inspector dashboard-sidebar dashboard-sidebar-home" aria-label="แถบพื้นที่ทำงาน">
        <div className="dashboard-sidebar-header dashboard-sidebar-home-header">
          <div className="dashboard-sidebar-header-copy">
            <div className="dashboard-sidebar-kicker">พื้นที่ทำงาน</div>
            <div className="dashboard-sidebar-title">ภาพรวม</div>
            <div className="dashboard-sidebar-meta">สถานะพื้นที่ทำงานและบริบทปัจจุบัน</div>
          </div>
          <span className={`dashboard-sidebar-overview-badge${activeProject ? " is-live" : ""}`}>
            {activeProject ? "พร้อมใช้" : "ว่าง"}
          </span>
        </div>

        <SidebarSection title="สรุปภาพรวม">
          <div className="dashboard-sidebar-overview-card dashboard-sidebar-home-hero">
            <div className="dashboard-sidebar-home-hero-copy">
              <span className="dashboard-sidebar-overview-label">โปรเจกต์ปัจจุบัน</span>
              <strong className="dashboard-sidebar-overview-title">{activeProject?.name ?? "ไม่มีโปรเจกต์"}</strong>
              <div className="dashboard-sidebar-meta">{workspaceContextLabel}</div>
            </div>
            <div className="dashboard-sidebar-home-hero-mark" aria-hidden="true">WS</div>
          </div>

          <div className="dashboard-sidebar-overview-grid dashboard-sidebar-overview-grid-home">
            <SidebarStatTile label="โปรเจกต์" value={projects.length} tone="primary" />
            <SidebarStatTile label="ชีต" value={totalSheets} />
            <SidebarStatTile label="แดชบอร์ด" value={totalDashboards} />
            <SidebarStatTile label="สถานะ" value={projects.length ? "ใช้งาน" : "ตั้งค่า"} tone="success" />
          </div>
        </SidebarSection>

        <SidebarSection title="บริบทปัจจุบัน">
          <div className="dashboard-sidebar-selection-card dashboard-sidebar-home-context-card">
            <SidebarKeyValue label="โปรเจกต์" value={activeProject?.name ?? "ไม่มี"} />
            <SidebarKeyValue label="ชีต" value={activeSheet?.name ?? "ไม่มี"} />
            <SidebarKeyValue label="แดชบอร์ด" value={activeDashboard?.name ?? "ไม่มี"} />
          </div>
        </SidebarSection>

        <SidebarSection title="สถานะ" compact>
          <div className="dashboard-sidebar-empty is-subtle">
            {activeProject ? "พื้นที่ทำงานพร้อมแล้ว เปิดแดชบอร์ดเพื่อทำงานต่อ" : "สร้างหรือเปิดโปรเจกต์เพื่อเริ่มพื้นที่ทำงาน"}
          </div>
        </SidebarSection>
      </aside>
    );
  }

  return (
    <aside
      className={`ui-inspector dashboard-sidebar${isCollapsed ? " is-collapsed" : ""}`}
      aria-label="แผงตรวจแดชบอร์ด"
    >
      <div className="dashboard-sidebar-header dashboard-sidebar-header-inspector">
        <div className="dashboard-sidebar-header-copy">
          <div className="dashboard-sidebar-kicker">ตัวตรวจ</div>
          <div className="dashboard-sidebar-title">แดชบอร์ด</div>
          {dashboardContextLabel ? <div className="dashboard-sidebar-meta">{dashboardContextLabel}</div> : null}
        </div>
        <div className="dashboard-sidebar-header-actions">
          <span className={`dashboard-sidebar-overview-badge${hasWidgets ? " is-live" : ""}`}>
            {hasWidgets ? "ใช้งาน" : "ร่าง"}
          </span>
          <button
            type="button"
            className="dashboard-sidebar-btn dashboard-sidebar-collapse-btn"
            onClick={onToggleCollapsed}
            aria-label={isCollapsed ? "ขยายแผงตรวจ" : "ย่อแผงตรวจ"}
            aria-expanded={!isCollapsed}
            aria-controls="dashboard-sidebar-content"
          >
            {isCollapsed ? "ตัวตรวจ" : "ย่อ"}
          </button>
        </div>
      </div>
      <div className="dashboard-sidebar-body dashboard-inspector-body" id="dashboard-sidebar-content">
        <div className="dashboard-inspector-tabs" role="tablist" aria-label="ส่วนของแผงตรวจ">
          {INSPECTOR_TABS.map((tab, index) => (
            <button
              key={tab.id}
              id={`dashboard-inspector-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={activeInspectorTab === tab.id}
              aria-controls={`dashboard-inspector-panel-${tab.id}`}
              tabIndex={activeInspectorTab === tab.id ? 0 : -1}
              className={`dashboard-inspector-tab${activeInspectorTab === tab.id ? " is-active" : ""}`}
              onClick={() => setActiveInspectorTab(tab.id)}
              onKeyDown={(event) => handleInspectorTabKeyDown(event, index)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="dashboard-inspector-context-card">
          <div>
            <span className="dashboard-sidebar-overview-label">{selectedWidget ? "ภาพที่เลือก" : "พื้นที่แดชบอร์ด"}</span>
            <strong>{selectedWidgetTitle}</strong>
            <small>{selectedWidgetMeta}</small>
          </div>
          <span className={`dashboard-sidebar-overview-badge${selectedWidget ? " is-live" : ""}`}>
            {selectedWidget ? "พร้อมใช้" : "พื้นที่"}
          </span>
        </div>

        {activeInspectorTab === "properties" ? (
          <div
            className="dashboard-inspector-tab-panel"
            role="tabpanel"
            id="dashboard-inspector-panel-properties"
            aria-labelledby="dashboard-inspector-tab-properties"
          >
            <InspectorAccordion title="ชื่อวิดเจ็ต" meta={selectedWidgetType}>
              <InspectorControlPreview label="ชื่อ" value={selectedWidgetTitle} helper="ใช้รายการที่เลือกในแดชบอร์ดปัจจุบัน" />
              <InspectorControlPreview label="คำอธิบาย" value={selectedWidget ? selectedWidgetMeta : "ไม่มีคำอธิบายวิดเจ็ต"} />
            </InspectorAccordion>

            <InspectorAccordion title="การแสดงผล" meta={selectedWidget ? "แสดงอยู่" : "พื้นที่"}>
              <InspectorTogglePreview label="แสดงภาพ" checked helper="ตัวเลือกนี้เป็นการแสดงผลเท่านั้น" />
              <InspectorTogglePreview label="แสดงหัวข้อ" checked={false} helper="พื้นที่แดชบอร์ดซ่อนหัววิดเจ็ตในตอนนี้" />
              <InspectorTogglePreview label="แสดงเมทาดาทา" checked={false} helper="ลดเมทาดาทาเพื่อให้โฟกัสที่ข้อมูล" />
            </InspectorAccordion>

            <InspectorAccordion title="เลย์เอาต์" meta={`${widgets.length} วิดเจ็ต`}>
              <div className="dashboard-inspector-grid">
                <InspectorFieldRow label="วิดเจ็ต" value={widgets.length} tone="primary" />
                <InspectorFieldRow label="รายการที่เลือก" value={selectedWidget ? "1" : "0"} />
                <InspectorFieldRow label="สถานะ" value={hasWidgets ? "ใช้งาน" : "ร่าง"} tone={hasWidgets ? "success" : ""} />
                <InspectorFieldRow label="พื้นที่" value={dashboardName || "แดชบอร์ด"} />
              </div>
            </InspectorAccordion>
          </div>
        ) : null}

        {activeInspectorTab === "visual" ? (
          <div
            className="dashboard-inspector-tab-panel"
            role="tabpanel"
            id="dashboard-inspector-panel-visual"
            aria-labelledby="dashboard-inspector-tab-visual"
          >
            <InspectorAccordion title="สี" meta="ธีม">
              <div className="dashboard-inspector-swatch-row">
                <InspectorSwatch label="หลัก" color="#2563eb" />
                <InspectorSwatch label="สำเร็จ" color="#22c55e" />
                <InspectorSwatch label="เตือน" color="#f59e0b" />
                <InspectorSwatch label="กลาง" color="#64748b" />
              </div>
            </InspectorAccordion>

            <InspectorAccordion title="ตัวอักษร" meta="สเกลแดชบอร์ด">
              <InspectorControlPreview label="หัวเรื่อง" value="22px / 600" />
              <InspectorControlPreview label="เนื้อหา" value="14px / 500" />
              <InspectorControlPreview label="คำกำกับ" value="12px / 500" />
            </InspectorAccordion>

            <InspectorAccordion title="คำอธิบาย แกน และรูปแบบ" meta="ส่วนประกอบกราฟ">
              <InspectorTogglePreview label="คำอธิบายสี" checked helper="แสดงคำอธิบายเฉพาะเมื่อช่วยอ่านข้อมูล" />
              <InspectorTogglePreview label="ป้ายแกน" checked helper="ใช้ป้ายสั้นและชัดสำหรับแดชบอร์ดที่มีข้อมูลแน่น" />
              <InspectorTogglePreview label="เส้นกริด" checked={false} helper="ลดสัญญาณรบกวนในวิดเจ็ต" />
            </InspectorAccordion>

            <InspectorAccordion title="ภาพที่ใช้ได้" meta={`${Object.keys(groupedLibraryItems).length} กลุ่ม`} defaultOpen={false}>
              <div className="dashboard-sidebar-widget-search-wrap">
                <input
                  className="dashboard-sidebar-search-input"
                  value={widgetSearch}
                  onChange={(event) => setWidgetSearch(event.target.value)}
                  placeholder="ค้นหาภาพ"
                  aria-label="ค้นหาคลังวิดเจ็ต"
                />
              </div>
              {Object.entries(groupedLibraryItems).map(([category, items]) => (
                <div key={category} className="dashboard-sidebar-widget-block">
                  <div className="dashboard-sidebar-widget-section-head">
                    <span>{category}</span>
                    <span>{items.length}</span>
                  </div>
                  <div className="dashboard-sidebar-widget-list">
                    {items.map((item) => (
                      <WidgetLibraryItem
                        key={item.id}
                        item={item}
                        isFavorite={favoriteWidgetIds.includes(item.id)}
                        onFavoriteToggle={toggleFavoriteWidget}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </InspectorAccordion>
          </div>
        ) : null}

        {activeInspectorTab === "data" ? (
          <div
            className="dashboard-inspector-tab-panel"
            role="tabpanel"
            id="dashboard-inspector-panel-data"
            aria-labelledby="dashboard-inspector-tab-data"
          >
            <InspectorAccordion title="ฟิลด์" meta={selectedWidget ? "เลือกแล้ว" : "ไม่มี"}>
              {selectedWidget ? (
                <div className="dashboard-sidebar-selection-card dashboard-sidebar-selection-card-premium">
                  <SidebarKeyValue label="ภาพ" value={selectedWidget.name} />
                  <SidebarKeyValue label="ประเภท" value={selectedWidget.typeLabel} />
                  <SidebarKeyValue label="แหล่งข้อมูล" value={selectedWidget.metaLabel ?? "พร้อมใช้"} />
                </div>
              ) : (
                <div className="dashboard-sidebar-empty is-subtle">เลือกวิดเจ็ตเพื่อตรวจฟิลด์และการแมปข้อมูล</div>
              )}
            </InspectorAccordion>

            <InspectorAccordion title="มาตรวัดและมิติ" meta="การแมป">
              <div className="dashboard-inspector-grid">
                <InspectorFieldRow label="มาตรวัด" value={selectedWidget ? "แมปแล้ว" : "ไม่มี"} tone={selectedWidget ? "success" : ""} />
                <InspectorFieldRow label="มิติ" value={selectedWidget ? "แมปแล้ว" : "ไม่มี"} />
                <InspectorFieldRow label="ตัวกรอง" value="รวมทั้งแดชบอร์ด" />
                <InspectorFieldRow label="ชุดข้อมูล" value="ใช้งาน" tone="primary" />
              </div>
            </InspectorAccordion>

            <InspectorAccordion title="วิดเจ็ตบนพื้นที่" meta={widgets.length ? `${widgets.length} รายการ` : "ว่าง"}>
              {widgets.length ? (
                <div className="dashboard-sidebar-chart-list">
                  {widgets.map((widget) => (
                    <WidgetListItem
                      key={widget.id}
                      widget={widget}
                      isActive={widget.id === selectedWidgetId}
                      onSelectWidget={onSelectWidget}
                      onRemoveWidget={onRemoveWidget}
                    />
                  ))}
                </div>
              ) : (
                <div className="dashboard-sidebar-empty">
                  <div className="dashboard-sidebar-empty-title">ยังไม่มีวิดเจ็ต</div>
                  <div className="dashboard-sidebar-empty-copy">เพิ่มกราฟเพื่อเริ่มพื้นที่แดชบอร์ด</div>
                </div>
              )}
            </InspectorAccordion>
          </div>
        ) : null}

        {activeInspectorTab === "interactions" ? (
          <div
            className="dashboard-inspector-tab-panel"
            role="tabpanel"
            id="dashboard-inspector-panel-interactions"
            aria-labelledby="dashboard-inspector-tab-interactions"
          >
            <InspectorAccordion title="เจาะดูข้อมูล" meta="การนำทาง">
              <InspectorTogglePreview label="เปิดการเจาะดูข้อมูล" checked={Boolean(selectedWidget)} helper="พร้อมใช้เมื่อเลือกภาพ" />
              <InspectorTogglePreview label="คงบริบทตัวกรอง" checked helper="รักษาสถานะตัวกรองรวมระหว่างการกระทำ" />
            </InspectorAccordion>

            <InspectorAccordion title="การกรอง" meta="กรองข้ามวิดเจ็ต">
              <InspectorTogglePreview label="ตัวกรองรวม" checked helper="วันที่ แผนก ภูมิภาค และปีแสดงในแถบตัวกรอง" />
              <InspectorTogglePreview label="กรองข้ามภาพ" checked={false} helper="เตรียมเป็นตัวเลือกภาพโดยไม่เปลี่ยนตรรกะ" />
              <InspectorTogglePreview label="ล้างการเลือกเมื่อคลิกพื้นที่" checked helper="พฤติกรรมการเลือกยังเหมือนเดิม" />
            </InspectorAccordion>

            <InspectorAccordion title="การทำงาน" meta="แดชบอร์ด">
              <div className="dashboard-sidebar-dashboard-list">
                {recentDashboards.length ? (
                  recentDashboards.map((dashboardEntry) => (
                    <button
                      key={dashboardEntry.id}
                      type="button"
                      className="dashboard-sidebar-dashboard-item"
                      onClick={() => activateDashboardById(dashboardEntry.id)}
                    >
                      <span className="dashboard-sidebar-dashboard-item-main">
                        <span className="dashboard-sidebar-dashboard-item-title">{dashboardEntry.name}</span>
                        <span className="dashboard-sidebar-dashboard-item-meta">{dashboardEntry.projectName}</span>
                        <span className="dashboard-sidebar-dashboard-item-meta">{dashboardEntry.sheetName}</span>
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="dashboard-sidebar-empty is-subtle">เปิดแดชบอร์ดเพื่อแสดงการทำงานล่าสุด</div>
                )}
              </div>
            </InspectorAccordion>

            <InspectorAccordion title="แดชบอร์ดที่ปักหมุด" meta={`${favoriteDashboards.length} รายการ`} defaultOpen={false}>
              <div className="dashboard-sidebar-dashboard-list">
                {favoriteDashboards.length ? (
                  favoriteDashboards.map((dashboardEntry) => (
                    <div
                      key={dashboardEntry.id}
                      className="dashboard-sidebar-dashboard-item"
                      role="button"
                      tabIndex={0}
                      onClick={() => activateDashboardById(dashboardEntry.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          activateDashboardById(dashboardEntry.id);
                        }
                      }}
                    >
                      <span className="dashboard-sidebar-dashboard-item-main">
                        <span className="dashboard-sidebar-dashboard-item-title">{dashboardEntry.name}</span>
                        <span className="dashboard-sidebar-dashboard-item-meta">{dashboardEntry.projectName}</span>
                        <span className="dashboard-sidebar-dashboard-item-meta">{dashboardEntry.sheetName}</span>
                      </span>
                      <button
                        type="button"
                        className="dashboard-sidebar-dashboard-star"
                        onClick={(event) => {
                          event.stopPropagation();
                          onToggleFavoriteDashboard?.(dashboardEntry.id);
                        }}
                        aria-label={`นำ ${dashboardEntry.name} ออกจากแดชบอร์ดที่ปักหมุด`}
                      >
                        เลิกปักหมุด
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="dashboard-sidebar-empty is-subtle">
                    ปักหมุดแดชบอร์ดเพื่อสร้างรายการเข้าถึงด่วน
                  </div>
                )}
              </div>
            </InspectorAccordion>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
