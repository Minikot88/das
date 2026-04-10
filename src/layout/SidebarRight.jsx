import React from "react";
import { InspectorLayout } from "../components/layout/Layout";
import { useStore } from "../store/useStore";

function SidebarSection({ title, children, compact = false }) {
  return (
    <section className={`dashboard-sidebar-section${compact ? " is-compact" : ""}`}>
      <div className="dashboard-sidebar-section-head">
        <div className="dashboard-sidebar-section-title">{title}</div>
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
              <span className="dashboard-sidebar-chart-meta">{isActive ? "Selected" : widget.metaLabel}</span>
            </div>
          </div>
          <span className="dashboard-sidebar-chart-bullet" aria-hidden="true" />
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
          <span className="dashboard-sidebar-rail-text">Tools</span>
        </button>
      </InspectorLayout>
    );
  }

  if (!isWorkspaceInspector) {
    return (
      <InspectorLayout className="dashboard-sidebar dashboard-sidebar-home" aria-label="Workspace sidebar">
        <div className="dashboard-sidebar-header">
          <div className="dashboard-sidebar-header-copy">
            <div className="dashboard-sidebar-kicker">Workspace</div>
            <div className="dashboard-sidebar-title">Status</div>
            <div className="dashboard-sidebar-meta">Current context</div>
          </div>
        </div>

        <SidebarSection title="Active">
          <div className="dashboard-sidebar-overview-card">
            <div className="dashboard-sidebar-overview-topline">
              <span className="dashboard-sidebar-overview-label">Project</span>
              <span className="dashboard-sidebar-overview-badge is-live">
                {activeProject ? "Ready" : "Empty"}
              </span>
            </div>
            <div className="dashboard-sidebar-overview-title">{activeProject?.name ?? "No project"}</div>
            <div className="dashboard-sidebar-selection-card">
              <div className="dashboard-sidebar-selection-row">
                <span>Sheet</span>
                <strong>{activeSheet?.name ?? "None"}</strong>
              </div>
              <div className="dashboard-sidebar-selection-row">
                <span>Dashboard</span>
                <strong>{activeDashboard?.name ?? "None"}</strong>
              </div>
            </div>
          </div>
        </SidebarSection>

        <SidebarSection title="Counts">
          <div className="dashboard-sidebar-overview-grid">
            <div>
              <span>Projects</span>
              <strong>{projects.length}</strong>
            </div>
            <div>
              <span>Sheets</span>
              <strong>{totalSheets}</strong>
            </div>
            <div>
              <span>Dashboards</span>
              <strong>{totalDashboards}</strong>
            </div>
            <div>
              <span>Status</span>
              <strong>{projects.length ? "Live" : "Setup"}</strong>
            </div>
          </div>
        </SidebarSection>

        <SidebarSection title="Notes" compact>
          <div className="dashboard-sidebar-empty is-subtle">
            Open a project to continue in Dashboard or Builder.
          </div>
        </SidebarSection>
      </InspectorLayout>
    );
  }

  return (
    <InspectorLayout className="dashboard-sidebar" aria-label="Dashboard inspector">
      <div className="dashboard-sidebar-header">
        <div className="dashboard-sidebar-header-copy">
          <div className="dashboard-sidebar-kicker">Inspector</div>
          <div className="dashboard-sidebar-title">Dashboard</div>
          {(projectName || dashboardName) ? (
            <div className="dashboard-sidebar-meta">{[projectName, dashboardName].filter(Boolean).join(" / ")}</div>
          ) : null}
        </div>
        <button type="button" onClick={onToggle} className="dashboard-sidebar-toggle" aria-label="Collapse dashboard inspector">
          -
        </button>
      </div>

      <SidebarSection title="Overview">
        <div className="dashboard-sidebar-overview-card">
          <div className="dashboard-sidebar-overview-topline">
            <span className="dashboard-sidebar-overview-label">Canvas</span>
            <span className={`dashboard-sidebar-overview-badge${widgets.length ? " is-live" : ""}`}>
              {widgets.length ? "Active" : "Empty"}
            </span>
          </div>
          <div className="dashboard-sidebar-overview-title">{dashboardName || "Dashboard"}</div>
          <div className="dashboard-sidebar-overview-grid">
            <div>
              <span>Widgets</span>
              <strong>{widgets.length}</strong>
            </div>
            <div>
              <span>Selection</span>
              <strong>{selectedWidget ? "Active" : "None"}</strong>
            </div>
          </div>
        </div>
      </SidebarSection>

      <SidebarSection title="Quick Actions">
        <div className="dashboard-sidebar-button-stack">
          <ActionButton primary onClick={onBuildChart}>Create New Chart</ActionButton>
          <ActionButton onClick={onOpenSavedCharts}>Add Saved Chart</ActionButton>
          <ActionButton onClick={onAutoArrange} disabled={!widgets.length}>Auto Arrange</ActionButton>
        </div>
      </SidebarSection>

      <SidebarSection title="Selection">
        {selectedWidget ? (
          <div className="dashboard-sidebar-selection-card">
            <div className="dashboard-sidebar-selection-row">
              <span>Chart</span>
              <strong>{selectedWidget.name}</strong>
            </div>
            <div className="dashboard-sidebar-selection-row">
              <span>Type</span>
              <strong>{selectedWidget.typeLabel}</strong>
            </div>
            <div className="dashboard-sidebar-selection-row">
              <span>Status</span>
              <strong>Ready</strong>
            </div>
          </div>
        ) : (
          <div className="dashboard-sidebar-empty is-subtle">
            Select a chart.
          </div>
        )}
      </SidebarSection>

      <SidebarSection title={`Charts ${widgets.length ? `(${widgets.length})` : ""}`}>
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
            <div className="dashboard-sidebar-empty-title">No charts yet</div>
            <div className="dashboard-sidebar-empty-copy">Create your first chart.</div>
          </div>
        )}
      </SidebarSection>

      <SidebarSection title="Export" compact>
        <div className="dashboard-sidebar-button-grid">
          <ActionButton disabled={!selectedWidget} onClick={onExportSelected}>Export Selection</ActionButton>
          <ActionButton disabled={!widgets.length} onClick={onExportDashboard}>Export Dashboard</ActionButton>
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
            {selectedWidget ? "Ready to export." : "Select a chart."}
          </div>
        )}
      </SidebarSection>
    </InspectorLayout>
  );
}
