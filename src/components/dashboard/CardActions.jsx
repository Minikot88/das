/**
 * components/dashboard/CardActions.jsx
 * Context menu for chart cards in the dashboard.
 */
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../../store/useStore";

export default function CardActions({ chart, sheetId, cardRef, onExportCSV, onExportPNG }) {
  const [open, setOpen]          = useState(false);
  const navigate                 = useNavigate();
  const removeChart              = useStore((s) => s.removeChart);
  const duplicateChart           = useStore((s) => s.duplicateChart);
  const loadChartIntoBuilder     = useStore((s) => s.loadChartIntoBuilder);
  const menuRef                  = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handle = (e) => { if (!menuRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  function handleEdit(e) {
    e.stopPropagation();
    loadChartIntoBuilder({ ...chart, id: chart.chartId, sheetId });
    navigate("/builder");
    setOpen(false);
  }

  return (
    <div className="card-actions-wrap" ref={menuRef}>
      <button
        className="card-menu-btn"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        aria-label="Chart actions"
        aria-haspopup="true"
        aria-expanded={open}
        title="Chart actions"
      >⋯</button>

      {open && (
        <div className="card-actions-menu" role="menu">
          <button className="card-action-item" onClick={handleEdit} role="menuitem">
            <span>✏</span> Edit
          </button>
          <button
            className="card-action-item"
            role="menuitem"
            onClick={(e) => { e.stopPropagation(); duplicateChart(sheetId, chart.id); setOpen(false); }}
          >
            <span>⧉</span> Duplicate
          </button>
          <button
            className="card-action-item"
            role="menuitem"
            onClick={(e) => { e.stopPropagation(); onExportCSV(chart); setOpen(false); }}
          >
            <span>↓</span> Export CSV
          </button>
          <button
            className="card-action-item"
            role="menuitem"
            onClick={(e) => { e.stopPropagation(); if (cardRef.current) onExportPNG(cardRef.current, chart); setOpen(false); }}
          >
            <span>🖼</span> Export PNG
          </button>
          <div className="card-action-divider" />
          <button
            className="card-action-item danger"
            role="menuitem"
            onClick={(e) => { e.stopPropagation(); removeChart(sheetId, chart.id); }}
          >
            <span>🗑</span> Delete
          </button>
        </div>
      )}
    </div>
  );
}
