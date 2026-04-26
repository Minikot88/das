/**
 * components/dashboard/CardActionsV2.jsx
 * Widget toolbar for active dashboard cards.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "../../store/useStore";

const CARD_ACTIONS = [
  { key: "fullscreen", label: "Open fullscreen", icon: "FS" },
  { key: "duplicate", label: "Duplicate widget", icon: "DU" },
];

const EXPORT_ACTIONS = [
  { key: "csv", label: "Export CSV", icon: "CS", description: "Download the widget data" },
  { key: "png", label: "Export PNG", icon: "PN", description: "Save the rendered chart image" },
];

export default function CardActionsV2({
  chart,
  sheetId,
  cardRef,
  onExportCSV,
  onExportPNG,
  onToggleFullscreen,
  isFullscreen = false,
}) {
  const [openMenu, setOpenMenu] = useState(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [draftTitle, setDraftTitle] = useState(chart.title ?? "");
  const removeChart = useStore((s) => s.removeChart);
  const duplicateChart = useStore((s) => s.duplicateChart);
  const renameChartWidget = useStore((s) => s.renameChartWidget);
  const menuRef = useRef(null);
  const inputRef = useRef(null);

  const closeMenus = useCallback(() => {
    setIsRenaming(false);
    setDraftTitle(chart.title ?? "");
    setOpenMenu(null);
  }, [chart.title]);

  useEffect(() => {
    if (!openMenu) return;

    const handleOutsideClick = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        closeMenus();
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [closeMenus, openMenu]);

  useEffect(() => {
    if (openMenu === "menu" && isRenaming) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isRenaming, openMenu]);

  function beginRename(event) {
    event.stopPropagation();
    setDraftTitle(chart.title ?? "");
    setIsRenaming(true);
  }

  function cancelRename(event) {
    event?.stopPropagation();
    setDraftTitle(chart.title ?? "");
    setIsRenaming(false);
  }

  function submitRename(event) {
    event.preventDefault();
    event.stopPropagation();

    const nextTitle = draftTitle.trim();
    if (!nextTitle || nextTitle === chart.title) {
      setIsRenaming(false);
      return;
    }

    renameChartWidget(sheetId, chart.id, nextTitle);
    setIsRenaming(false);
    setOpenMenu(null);
  }

  function handleAction(actionKey, event) {
    event.stopPropagation();

    if (actionKey === "duplicate") {
      duplicateChart(sheetId, chart.id);
      closeMenus();
      return;
    }

    if (actionKey === "fullscreen") {
      onToggleFullscreen?.();
      closeMenus();
      return;
    }

    if (actionKey === "csv") {
      onExportCSV?.(chart);
      closeMenus();
      return;
    }

    if (actionKey === "png") {
      if (cardRef.current) {
        onExportPNG?.(cardRef.current, chart);
      }
      closeMenus();
    }
  }

  function togglePanel(panelKey, event) {
    event.stopPropagation();
    setDraftTitle(chart.title ?? "");
    setIsRenaming(false);
    setOpenMenu((current) => (current === panelKey ? null : panelKey));
  }

  return (
    <div className="card-actions-wrap" ref={menuRef}>
      <button
        type="button"
        className={`card-export-btn${openMenu === "export" ? " is-active" : ""}`}
        onClick={(event) => togglePanel("export", event)}
        aria-label="Export widget"
        aria-haspopup="true"
        aria-expanded={openMenu === "export"}
        title="Export widget"
      >
        <span className="card-export-btn-icon" aria-hidden="true">EX</span>
        <span className="card-export-btn-label">Export</span>
      </button>

      <button
        type="button"
        className={`card-menu-btn${openMenu === "menu" ? " is-active" : ""}`}
        onClick={(event) => togglePanel("menu", event)}
        aria-label="Widget actions"
        aria-haspopup="true"
        aria-expanded={openMenu === "menu"}
        title="Widget actions"
      >
        MO
      </button>

      {openMenu === "export" ? (
        <div className="card-actions-menu card-actions-menu-export" role="menu" aria-label={`Export ${chart.title}`}>
          <div className="card-actions-header">
            <span className="card-actions-label">Export Widget</span>
            <strong className="card-actions-title" title={chart.title}>
              {chart.title}
            </strong>
          </div>

          <div className="card-actions-section-copy">
            Download this widget as data or as a rendered chart image.
          </div>

          {EXPORT_ACTIONS.map((action) => (
            <button
              key={action.key}
              className="card-action-item"
              role="menuitem"
              type="button"
              onClick={(event) => handleAction(action.key, event)}
            >
              <span className="card-action-icon">{action.icon}</span>
              <span className="card-action-copy">
                <strong>{action.label}</strong>
                <small>{action.description}</small>
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {openMenu === "menu" ? (
        <div className="card-actions-menu" role="menu" aria-label={`Actions for ${chart.title}`}>
          <div className="card-actions-header">
            <span className="card-actions-label">Widget Toolbar</span>
            <strong className="card-actions-title" title={chart.title}>
              {chart.title}
            </strong>
          </div>

          {isRenaming ? (
            <form className="card-rename-form" onSubmit={submitRename}>
              <label className="card-rename-label" htmlFor={`widget-title-${chart.id}`}>
                Rename widget
              </label>
              <input
                id={`widget-title-${chart.id}`}
                ref={inputRef}
                className="card-rename-input"
                value={draftTitle}
                maxLength={80}
                onClick={(event) => event.stopPropagation()}
                onChange={(event) => setDraftTitle(event.target.value)}
              />
              <div className="card-rename-actions">
                <button
                  type="button"
                  className="card-action-ghost"
                  onClick={cancelRename}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="card-action-confirm"
                  disabled={!draftTitle.trim()}
                >
                  Save
                </button>
              </div>
            </form>
          ) : (
            <>
              <button className="card-action-item" onClick={beginRename} role="menuitem" type="button">
                <span className="card-action-icon">RN</span>
                <span>Rename widget</span>
              </button>

              {CARD_ACTIONS.map((action) => (
                <button
                  key={action.key}
                  className="card-action-item"
                  role="menuitem"
                  type="button"
                  onClick={(event) => handleAction(action.key, event)}
                >
                  <span className="card-action-icon">{action.icon}</span>
                  <span>
                    {action.key === "fullscreen" && isFullscreen ? "Exit fullscreen" : action.label}
                  </span>
                </button>
              ))}

              <div className="card-action-divider" />

              <button
                className="card-action-item danger"
                role="menuitem"
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  removeChart(sheetId, chart.id);
                  closeMenus();
                }}
              >
                <span className="card-action-icon">RM</span>
                <span>Remove widget</span>
              </button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
