/**
 * components/dashboard/DashboardTabBar.jsx
 * Unified dual-row tab navigation for Sheets and Dashboards.
 */
import React from "react";
import { useStore } from "../../store/useStore";
import Tab from "./Tab";

export default function DashboardTabBar() {
  const projects = useStore((s) => s.projects);
  const activeProjectId = useStore((s) => s.activeProjectId);
  const activeSheetId = useStore((s) => s.activeSheetId);
  const activeDashboardId = useStore((s) => s.activeDashboardId);

  const createSheet = useStore((s) => s.createSheet);
  const setActiveSheet = useStore((s) => s.setActiveSheet);
  const renameSheet = useStore((s) => s.renameSheet);
  const removeSheet = useStore((s) => s.removeSheet);

  const createDashboard = useStore((s) => s.createDashboard);
  const setActiveDashboard = useStore((s) => s.setActiveDashboard);
  const renameDashboard = useStore((s) => s.renameDashboard);
  const removeDashboard = useStore((s) => s.removeDashboard);

  const project = projects.find((p) => p.id === activeProjectId) ?? projects[0];
  if (!project) return null;

  const sheets = project.sheets;
  const activeSheet = sheets.find((sh) => sh.id === activeSheetId) ?? sheets[0];
  const dashboards = activeSheet?.dashboards ?? [];

  const handleAddSheet = () => createSheet(`Sheet ${sheets.length + 1}`);
  const handleAddDashboard = () => createDashboard(`Dashboard ${dashboards.length + 1}`);

  return (
    <div className="tab-bar-root">
      <div className="tab-row" role="tablist" aria-label="Sheets">
        <span className="tab-row-label">Sheets</span>
        <div className="tab-row-scroll">
          {sheets.map((sh) => (
            <Tab
              key={sh.id}
              label={sh.name}
              isActive={sh.id === activeSheetId}
              onSelect={() => setActiveSheet(sh.id)}
              onRename={(name) => renameSheet(sh.id, name)}
              onRemove={() => removeSheet(sh.id)}
              canRemove={sheets.length > 1}
            />
          ))}
          <button className="tab-add-btn" onClick={handleAddSheet} title="Add Sheet">+</button>
        </div>
      </div>

      <div className="tab-row secondary" role="tablist" aria-label="Dashboards">
        <span className="tab-row-label">Views</span>
        <div className="tab-row-scroll">
          {dashboards.map((d) => (
            <Tab
              key={d.id}
              label={d.name}
              isActive={d.id === activeDashboardId}
              onSelect={() => setActiveDashboard(d.id)}
              onRename={(name) => renameDashboard(d.id, name)}
              onRemove={() => removeDashboard(d.id)}
              canRemove={dashboards.length > 1}
            />
          ))}
          <button className="tab-add-btn" onClick={handleAddDashboard} title="Add Dashboard">+</button>
        </div>
      </div>
    </div>
  );
}
