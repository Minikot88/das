import React from "react";

function SidebarSection({ title, children }) {
  return (
    <section className="dashboard-sidebar-section">
      <div className="dashboard-sidebar-section-title">{title}</div>
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
          <div className="dashboard-sidebar-chart-title">{widget.name}</div>
        </div>
        <div className="dashboard-sidebar-chart-meta">
          <span>{widget.typeLabel}</span>
          <span>{isActive ? "Selected" : widget.metaLabel}</span>
        </div>
      </button>
      <button
        type="button"
        onClick={() => onRemoveWidget(widget.id)}
        className="dashboard-sidebar-delete-btn"
      >
        Delete
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
  const selectedWidget = widgets.find((widget) => widget.id === selectedWidgetId) ?? null;

  if (!isOpen) {
    return (
      <aside className="dashboard-sidebar is-collapsed" aria-label="Right sidebar">
        <button type="button" onClick={onToggle} className="dashboard-sidebar-rail-button" aria-label="Open right sidebar">
          <span className="dashboard-sidebar-rail-arrow">{"<"}</span>
          <span className="dashboard-sidebar-rail-label">Tools</span>
        </button>
      </aside>
    );
  }

  return (
    <aside className="dashboard-sidebar" aria-label="Right sidebar">
      <div className="dashboard-sidebar-header">
        <div>
          <div className="dashboard-sidebar-kicker">Dashboard Panel</div>
          <div className="dashboard-sidebar-title">Chart Tools</div>
          {(projectName || dashboardName) ? (
            <div className="dashboard-sidebar-meta">{[projectName, dashboardName].filter(Boolean).join(" / ")}</div>
          ) : null}
        </div>
        <button type="button" onClick={onToggle} className="dashboard-sidebar-toggle" aria-label="Collapse right sidebar">
          {">"}
        </button>
      </div>

      <SidebarSection title="Chart Actions">
        <div className="dashboard-sidebar-button-stack">
          <ActionButton primary onClick={onOpenSavedCharts}>Add Saved Chart</ActionButton>
          <ActionButton onClick={onBuildChart}>Build New Chart</ActionButton>
          <ActionButton onClick={onAutoArrange} disabled={!widgets.length}>Auto Arrange Dashboard</ActionButton>
        </div>
      </SidebarSection>

      <SidebarSection title={`Chart List (${widgets.length})`}>
        {widgets.length ? (
          <div className="dashboard-sidebar-chart-list">
            {widgets.map((widget) => {
              const isActive = widget.id === selectedWidgetId;

              return (
                <WidgetListItem
                  key={widget.id}
                  widget={widget}
                  isActive={isActive}
                  onSelectWidget={onSelectWidget}
                  onRemoveWidget={onRemoveWidget}
                />
              );
            })}
          </div>
        ) : (
          <div className="dashboard-sidebar-empty">
            <div className="dashboard-sidebar-empty-title">No charts yet</div>
            <div>Build a chart for this dashboard or add one from the current project.</div>
          </div>
        )}
      </SidebarSection>

      <SidebarSection title="Export">
        <div className="dashboard-sidebar-button-grid">
          <ActionButton disabled={!selectedWidget} onClick={onExportSelected}>Export Selected</ActionButton>
          <ActionButton disabled={!widgets.length} onClick={onExportDashboard}>Export Dashboard</ActionButton>
        </div>

        {exportState?.code ? (
          <>
            <div className="dashboard-sidebar-export-meta">
              <span className="dashboard-sidebar-export-title">{exportState.title}</span>
              <button type="button" onClick={onCopyCode} className="dashboard-sidebar-copy-btn">Copy Code</button>
            </div>
            <textarea readOnly value={exportState.code} className="dashboard-sidebar-code" />
          </>
        ) : (
          <div className="dashboard-sidebar-empty is-subtle">
            {selectedWidget ? "Generate code for the selected chart or the whole dashboard." : "Select a chart first, or export the whole dashboard."}
          </div>
        )}
      </SidebarSection>
    </aside>
  );
}
