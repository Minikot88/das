import React, { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "../../store/useStore";

const QUICK_ACTIONS = [
  { key: "fullscreen", label: "เปิดเต็มจอ", icon: "FS" },
  { key: "duplicate", label: "ทำซ้ำ", icon: "CP" },
];

const EXPORT_ACTIONS = [
  { key: "csv", label: "Export CSV", icon: "CSV", description: "ดาวน์โหลดข้อมูลของ widget" },
  { key: "png", label: "Export PNG", icon: "PNG", description: "บันทึกภาพกราฟที่ render แล้ว" },
];

export default function CardActions({
  chart,
  sheetId,
  cardRef,
  onExportCSV,
  onExportPNG,
  onToggleFullscreen,
  isFullscreen = false,
}) {
  const [openPanel, setOpenPanel] = useState(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [draftTitle, setDraftTitle] = useState(chart.title ?? "");
  const removeChart = useStore((state) => state.removeChart);
  const duplicateChart = useStore((state) => state.duplicateChart);
  const renameChartWidget = useStore((state) => state.renameChartWidget);
  const menuRef = useRef(null);
  const inputRef = useRef(null);

  const closeMenus = useCallback(() => {
    setIsRenaming(false);
    setDraftTitle(chart.title ?? "");
    setOpenPanel(null);
  }, [chart.title]);

  useEffect(() => {
    if (!openPanel) return undefined;

    function handleOutsideClick(event) {
      if (!menuRef.current?.contains(event.target)) {
        closeMenus();
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [closeMenus, openPanel]);

  useEffect(() => {
    if (openPanel === "menu" && isRenaming) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isRenaming, openPanel]);

  function togglePanel(panelKey, event) {
    event.stopPropagation();
    setDraftTitle(chart.title ?? "");
    setIsRenaming(false);
    setOpenPanel((current) => (current === panelKey ? null : panelKey));
  }

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
    closeMenus();
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

  return (
    <div className="card-actions-wrap" ref={menuRef}>
      <button
        type="button"
        className={`card-export-btn${openPanel === "export" ? " is-active" : ""}`}
        onClick={(event) => togglePanel("export", event)}
        aria-label="ส่งออก widget"
        aria-haspopup="true"
        aria-expanded={openPanel === "export"}
        title="ส่งออก widget"
      >
        <span className="card-export-btn-icon" aria-hidden="true">EX</span>
        <span className="card-export-btn-label">Export</span>
      </button>

      <button
        type="button"
        className={`card-menu-btn${openPanel === "menu" ? " is-active" : ""}`}
        onClick={(event) => togglePanel("menu", event)}
        aria-label="เมนู widget"
        aria-haspopup="true"
        aria-expanded={openPanel === "menu"}
        title="เมนู widget"
      >
        ME
      </button>

      {openPanel === "export" ? (
        <div className="card-actions-menu card-actions-menu-export" role="menu" aria-label={`ส่งออก ${chart.title}`}>
          <div className="card-actions-header">
            <span className="card-actions-label">ส่งออก</span>
            <strong className="card-actions-title" title={chart.title}>
              {chart.title}
            </strong>
          </div>

          <div className="card-actions-section-copy">
            เลือกส่งออกเป็นข้อมูลหรือภาพกราฟ
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

      {openPanel === "menu" ? (
        <div className="card-actions-menu" role="menu" aria-label={`การจัดการ ${chart.title}`}>
          <div className="card-actions-header">
            <span className="card-actions-label">เครื่องมือ Widget</span>
            <strong className="card-actions-title" title={chart.title}>
              {chart.title}
            </strong>
          </div>

          {isRenaming ? (
            <form className="card-rename-form" onSubmit={submitRename}>
              <label className="card-rename-label" htmlFor={`widget-title-${chart.id}`}>
                เปลี่ยนชื่อ widget
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
                <button type="button" className="card-action-ghost" onClick={cancelRename}>
                  ยกเลิก
                </button>
                <button type="submit" className="card-action-confirm" disabled={!draftTitle.trim()}>
                  บันทึก
                </button>
              </div>
            </form>
          ) : (
            <>
              <button className="card-action-item" onClick={beginRename} role="menuitem" type="button">
                <span className="card-action-icon">RN</span>
                <span>เปลี่ยนชื่อ</span>
              </button>

              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.key}
                  className="card-action-item"
                  role="menuitem"
                  type="button"
                  onClick={(event) => handleAction(action.key, event)}
                >
                  <span className="card-action-icon">{action.icon}</span>
                  <span>
                    {action.key === "fullscreen" && isFullscreen ? "ออกจากเต็มจอ" : action.label}
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
                <span>ลบ widget</span>
              </button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
