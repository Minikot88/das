/**
 * DashboardTabBar.jsx
 * Two-row tab bar:
 *   Row 1 — Sheet tabs (with add / rename / remove)
 *   Row 2 — Dashboard tabs inside the active sheet (with add / rename / remove)
 */
import React, { useRef, useState } from "react";
import { useStore } from "../store/useStore";

// ─── Generic rename-in-place tab ───────────────────────────────────
function Tab({ label, isActive, count, onSelect, onRename, onRemove, canRemove }) {
  const [renaming, setRenaming] = useState(false);
  const [val,      setVal]      = useState(label);
  const inputRef = useRef(null);

  function startRename(e) {
    e.stopPropagation();
    setVal(label);
    setRenaming(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function commit() {
    if (val.trim() && val.trim() !== label) onRename(val.trim());
    setRenaming(false);
  }

  return (
    <div
      className={`dtab${isActive ? " active" : ""}`}
      onClick={onSelect}
      role="tab"
      aria-selected={isActive}
    >
      {renaming ? (
        <input
          ref={inputRef}
          className="dtab-rename-input"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter")  commit();
            if (e.key === "Escape") setRenaming(false);
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span
          className="dtab-label"
          onDoubleClick={startRename}
          title="Double-click to rename"
        >
          {label}
          {count != null && <span className="dtab-count">{count}</span>}
        </span>
      )}

      {canRemove && (
        <button
          className="dtab-close"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          aria-label={`Remove ${label}`}
        >×</button>
      )}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────
export default function DashboardTabBar() {
  const projects          = useStore((s) => s.projects);
  const activeProjectId   = useStore((s) => s.activeProjectId);
  const activeSheetId     = useStore((s) => s.activeSheetId);
  const activeDashboardId = useStore((s) => s.activeDashboardId);

  const createSheet      = useStore((s) => s.createSheet);
  const setActiveSheet   = useStore((s) => s.setActiveSheet);
  const renameSheet      = useStore((s) => s.renameSheet);
  const removeSheet      = useStore((s) => s.removeSheet);

  const createDashboard    = useStore((s) => s.createDashboard);
  const setActiveDashboard = useStore((s) => s.setActiveDashboard);
  const renameDashboard    = useStore((s) => s.renameDashboard);
  const removeDashboard    = useStore((s) => s.removeDashboard);

  const project = projects.find((p) => p.id === activeProjectId) ?? projects[0];
  if (!project) return null;

  const sheets      = project.sheets;
  const activeSheet = sheets.find((sh) => sh.id === activeSheetId) ?? sheets[0];
  const dashboards  = activeSheet?.dashboards ?? [];

  // Derived chart count per sheet (sum across all dashboards)
  function sheetChartCount(sheet) {
    return sheet.dashboards.reduce((n, d) => n + d.charts.length, 0);
  }

  function handleAddSheet() {
    const name = `Sheet ${sheets.length + 1}`;
    createSheet(name);
  }

  function handleAddDashboard() {
    const name = `Dashboard ${dashboards.length + 1}`;
    createDashboard(name);
  }

  return (
    <div className="tab-bar-root">
      {/* ── Row 1: Sheet tabs ───────────────────────────── */}
      <div className="tab-row sheet-tab-row" role="tablist" aria-label="Sheets">
        <span className="tab-row-label">Sheet</span>

        <div className="tab-row-scroll">
          {sheets.map((sh) => (
            <Tab
              key={sh.id}
              label={sh.name}
              isActive={sh.id === activeSheetId}
              count={sheetChartCount(sh)}
              onSelect={() => setActiveSheet(sh.id)}
              onRename={(name) => renameSheet(sh.id, name)}
              onRemove={() => removeSheet(sh.id)}
              canRemove={sheets.length > 1}
            />
          ))}

          <button className="tab-add-btn" onClick={handleAddSheet} title="Add sheet">
            ＋
          </button>
        </div>
      </div>

      {/* ── Row 2: Dashboard tabs ─────────────────────── */}
      <div className="tab-row dash-tab-row" role="tablist" aria-label="Dashboards">
        <span className="tab-row-label">Dashboard</span>

        <div className="tab-row-scroll">
          {dashboards.map((d) => (
            <Tab
              key={d.id}
              label={d.name}
              isActive={d.id === activeDashboardId}
              count={d.charts.length || null}
              onSelect={() => setActiveDashboard(d.id)}
              onRename={(name) => renameDashboard(d.id, name)}
              onRemove={() => removeDashboard(d.id)}
              canRemove={dashboards.length > 1}
            />
          ))}

          <button className="tab-add-btn" onClick={handleAddDashboard} title="Add dashboard">
            ＋
          </button>
        </div>
      </div>
    </div>
  );
}
