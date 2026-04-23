import React from "react";
import { InspectorLayout } from "../components/layout/Layout";
import { useStore } from "../store/useStore";

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

function ActionButton({ children, onClick, disabled = false, primary = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`dashboard-sidebar-btn${primary ? " is-primary" : ""}`}
    >
      {children}
    </button>
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
                {isActive ? "Selected" : "Ready"}
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
        onClick={() => onRemoveWidget(widget.id)}
        className="dashboard-sidebar-delete-btn"
        aria-label={`Remove ${widget.name}`}
      >
        Remove
      </button>
    </div>
  );
}

export default function SidebarRight({
  isOpen = true,
  widgets = [],
  selectedWidgetId = null,
  exportState = null,
  projectName = "",
  dashboardName = "",
  onToggle,
  onOpenSavedCharts,
  onBuildChart,
  onAutoArrange,
  onSelectWidget,
  onRemoveWidget,
  onExportSelected,
  onExportDashboard,
  onCopyCode,
}) {
  const projects = useStore((state) => state.projects);
  const activeProjectId = useStore((state) => state.activeProjectId);
  const activeSheetId = useStore((state) => state.activeSheetId);
  const activeDashboardId = useStore((state) => state.activeDashboardId);
  const selectedWidget = widgets.find((widget) => widget.id === selectedWidgetId) ?? null;
  const isWorkspaceInspector = Boolean(
    projectName ||
    dashboardName ||
    widgets.length ||
    onBuildChart ||
    onOpenSavedCharts ||
    onAutoArrange ||
    onExportSelected ||
    onExportDashboard
  );
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
  const workspaceContextLabel = [activeSheet?.name ?? "No sheet", activeDashboard?.name ?? "No dashboard"].join(" / ");

  if (!isOpen) {
    return (
      <InspectorLayout className="dashboard-sidebar is-collapsed" aria-label="Dashboard inspector">
        <button
          type="button"
          onClick={onToggle}
          className="dashboard-sidebar-rail-button"
          aria-label="Open dashboard inspector"
        >
          <span className="dashboard-sidebar-rail-pulse" />
          <span className="dashboard-sidebar-rail-icon">BI</span>
          <span className="dashboard-sidebar-rail-text">Inspector</span>
        </button>
      </InspectorLayout>
    );
  }

  if (!isWorkspaceInspector) {
    return (
      <InspectorLayout className="dashboard-sidebar dashboard-sidebar-home" aria-label="Workspace sidebar">
        <div className="dashboard-sidebar-header dashboard-sidebar-home-header">
          <div className="dashboard-sidebar-header-copy">
            <div className="dashboard-sidebar-kicker">Workspace</div>
            <div className="dashboard-sidebar-title">Overview</div>
            <div className="dashboard-sidebar-meta">Workspace status and current context</div>
          </div>
          <span className={`dashboard-sidebar-overview-badge${activeProject ? " is-live" : ""}`}>
            {activeProject ? "Ready" : "Empty"}
          </span>
        </div>

        <SidebarSection title="Snapshot">
          <div className="dashboard-sidebar-overview-card dashboard-sidebar-home-hero">
            <div className="dashboard-sidebar-home-hero-copy">
              <span className="dashboard-sidebar-overview-label">Current project</span>
              <strong className="dashboard-sidebar-overview-title">{activeProject?.name ?? "No project"}</strong>
              <div className="dashboard-sidebar-meta">{workspaceContextLabel}</div>
            </div>
            <div className="dashboard-sidebar-home-hero-mark" aria-hidden="true">WS</div>
          </div>

          <div className="dashboard-sidebar-overview-grid dashboard-sidebar-overview-grid-home">
            <SidebarStatTile label="Projects" value={projects.length} tone="primary" />
            <SidebarStatTile label="Sheets" value={totalSheets} />
            <SidebarStatTile label="Dashboards" value={totalDashboards} />
            <SidebarStatTile label="Status" value={projects.length ? "Live" : "Setup"} tone="success" />
          </div>
        </SidebarSection>

        <SidebarSection title="Current Context">
          <div className="dashboard-sidebar-selection-card dashboard-sidebar-home-context-card">
            <SidebarKeyValue label="Project" value={activeProject?.name ?? "None"} />
            <SidebarKeyValue label="Sheet" value={activeSheet?.name ?? "None"} />
            <SidebarKeyValue label="Dashboard" value={activeDashboard?.name ?? "None"} />
          </div>
        </SidebarSection>

        <SidebarSection title="Status" compact>
          <div className="dashboard-sidebar-empty is-subtle">
            {activeProject ? "Workspace is ready. Open a dashboard to continue building." : "Create or open a project to start your workspace."}
          </div>
        </SidebarSection>
      </InspectorLayout>
    );
  }

  return (
    <InspectorLayout className="dashboard-sidebar" aria-label="Dashboard inspector">
      <div className="dashboard-sidebar-header dashboard-sidebar-header-inspector">
        <div className="dashboard-sidebar-header-copy">
          <div className="dashboard-sidebar-kicker">Inspector</div>
          <div className="dashboard-sidebar-title">Dashboard</div>
          {dashboardContextLabel ? <div className="dashboard-sidebar-meta">{dashboardContextLabel}</div> : null}
        </div>
        <div className="dashboard-sidebar-header-actions">
          <span className={`dashboard-sidebar-overview-badge${hasWidgets ? " is-live" : ""}`}>
            {hasWidgets ? "Active" : "Draft"}
          </span>
          <button
            type="button"
            onClick={onToggle}
            className="dashboard-sidebar-toggle"
            aria-label="Collapse dashboard inspector"
          >
            -
          </button>
        </div>
      </div>

      <SidebarSection title="Canvas Summary">
        <div className="dashboard-sidebar-overview-card dashboard-sidebar-overview-card-premium">
          <div className="dashboard-sidebar-overview-topline">
            <span className="dashboard-sidebar-overview-label">Canvas</span>
            <span className={`dashboard-sidebar-overview-badge${hasWidgets ? " is-live" : ""}`}>
              {hasWidgets ? "Active" : "Empty"}
            </span>
          </div>
          <div className="dashboard-sidebar-overview-title">{dashboardName || "Dashboard"}</div>
          <div className="dashboard-sidebar-overview-grid dashboard-sidebar-overview-grid-summary">
            <SidebarStatTile label="Widgets" value={widgets.length} tone="primary" />
            <SidebarStatTile label="Selection" value={selectedWidget ? "1" : "0"} />
            <SidebarStatTile label="Active" value={selectedWidget ? "Yes" : "No"} />
            <SidebarStatTile label="State" value={hasWidgets ? "Live" : "Draft"} tone={hasWidgets ? "success" : ""} />
          </div>
        </div>
      </SidebarSection>

      <SidebarSection title="Actions">
        <div className="dashboard-sidebar-button-stack dashboard-sidebar-action-grid">
          <ActionButton primary onClick={onBuildChart}>Add Chart</ActionButton>
          <ActionButton onClick={onOpenSavedCharts}>Saved Charts</ActionButton>
          <ActionButton onClick={onAutoArrange} disabled={!widgets.length}>Auto Layout</ActionButton>
          <ActionButton onClick={onExportDashboard} disabled={!widgets.length}>Export Canvas</ActionButton>
        </div>
      </SidebarSection>

      <SidebarSection title="Active Selection">
        {selectedWidget ? (
          <div className="dashboard-sidebar-selection-card dashboard-sidebar-selection-card-premium">
            <div className="dashboard-sidebar-selection-head">
              <div className="dashboard-sidebar-selection-copy">
                <span className="dashboard-sidebar-overview-label">Chart name</span>
                <strong>{selectedWidget.name}</strong>
              </div>
              <span className="dashboard-sidebar-overview-badge is-live">Ready</span>
            </div>
            <div className="dashboard-sidebar-selection-grid">
              <SidebarKeyValue label="Type" value={selectedWidget.typeLabel} />
              <SidebarKeyValue label="Status" value="Selected" />
              <SidebarKeyValue label="Meta" value={selectedWidget.metaLabel ?? "Available"} />
            </div>
          </div>
        ) : (
          <div className="dashboard-sidebar-empty is-subtle">
            Select a widget to inspect its details.
          </div>
        )}
      </SidebarSection>

      <SidebarSection title="Widgets List" meta={widgets.length ? `${widgets.length} items` : null}>
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
            <div className="dashboard-sidebar-empty-title">No widgets yet</div>
            <div className="dashboard-sidebar-empty-copy">Add a chart to start the canvas.</div>
          </div>
        )}
      </SidebarSection>

      <SidebarSection title="Export" compact>
        <div className="dashboard-sidebar-button-grid">
          <ActionButton disabled={!selectedWidget} onClick={onExportSelected}>Export Widget</ActionButton>
          <ActionButton disabled={!widgets.length} onClick={onExportDashboard}>Export Code</ActionButton>
        </div>

        {exportState?.code ? (
          <>
            <div className="dashboard-sidebar-export-meta">
              <span className="dashboard-sidebar-export-title">{exportState.title}</span>
              <button type="button" onClick={onCopyCode} className="dashboard-sidebar-copy-btn">Copy code</button>
            </div>
            <textarea readOnly value={exportState.code} className="dashboard-sidebar-code" />
          </>
        ) : (
          <div className="dashboard-sidebar-empty is-subtle">
            {selectedWidget ? "Exports are ready when you need them." : "Select a widget or build the canvas first."}
          </div>
        )}
      </SidebarSection>
    </InspectorLayout>
  );
}
