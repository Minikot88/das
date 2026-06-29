import React, { useEffect, useMemo, useRef, useState } from "react";
import useFocusTrap from "../../hooks/useFocusTrap";

const NO_ACTIONS_COPY = "ไม่พบคำสั่งที่ตรงกับการค้นหา";

function normalizeValue(value) {
  return String(value || "").toLowerCase();
}

export default function CommandPaletteModal({
  isOpen,
  actions = [],
  initialQuery = "",
  onClose,
  onOpenDatasetExplorer,
}) {
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef(null);
  const dialogRef = useFocusTrap(isOpen, onClose);

  const visibleActions = useMemo(() => {
    const search = normalizeValue(query.trim());
    if (!search) return actions;

    return actions.filter((action) => {
      const label = normalizeValue(action.label);
      const detail = normalizeValue(action.detail ?? "");
      const group = normalizeValue(action.group ?? "");
      const keywords = normalizeValue(action.keywords ?? "");
      return label.includes(search) || detail.includes(search) || group.includes(search) || keywords.includes(search);
    });
  }, [actions, query]);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setHighlightedIndex(0);
      return;
    }

    setQuery(initialQuery);
    setHighlightedIndex(0);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [initialQuery, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setHighlightedIndex(0);
  }, [visibleActions, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setHighlightedIndex((current) =>
          visibleActions.length ? (current + 1) % visibleActions.length : 0
        );
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setHighlightedIndex((current) =>
          visibleActions.length ? (current - 1 + visibleActions.length) % visibleActions.length : 0
        );
      }

      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }

      if (event.key === "Enter" && visibleActions[highlightedIndex]) {
        event.preventDefault();
        const action = visibleActions[highlightedIndex];
        if (action?.disabled) return;
        if (action.id === "open-dataset-explorer") {
          onOpenDatasetExplorer?.();
          return;
        }
        action.onActivate?.();
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [highlightedIndex, isOpen, onClose, onOpenDatasetExplorer, visibleActions]);

  if (!isOpen) return null;

  function handleSelectAction(action) {
    if (!action || action.disabled) return;
    if (action.id === "open-dataset-explorer") {
      onOpenDatasetExplorer?.();
      onClose();
      return;
    }
    action.onActivate?.();
    onClose();
  }

  return (
    <div
      className="command-palette-overlay"
      role="presentation"
      onClick={onClose}
    >
      <section
        ref={dialogRef}
        className="command-palette-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="command-palette-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="command-palette-header">
          <div className="command-palette-title">
            <span className="command-palette-kicker">คำสั่ง</span>
            <h2 id="command-palette-title">แผงคำสั่ง</h2>
            <p>ไปยังหน้า เรียกใช้คำสั่ง และเปิดเครื่องมือ BI ได้ทันที</p>
          </div>
          <button type="button" className="command-palette-close" onClick={onClose} aria-label="ปิดแผงคำสั่ง">
            x
          </button>
        </header>

        <div className="command-palette-search-wrap">
          <input
            ref={inputRef}
            type="text"
            className="command-palette-search"
            placeholder="ค้นหาคำสั่ง..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoComplete="off"
            aria-label="ค้นหาคำสั่ง"
          />
        </div>

        <div className="command-palette-list">
          {visibleActions.length ? (
            visibleActions.map((action, index) => (
              <button
                key={action.id}
                type="button"
                className={`command-palette-action${index === highlightedIndex ? " is-active" : ""}`}
                onMouseEnter={() => setHighlightedIndex(index)}
                onClick={() => handleSelectAction(action)}
                disabled={action.disabled}
              >
                <span className="command-palette-action-copy">
                  <span className="command-palette-action-label">{action.label}</span>
                  {action.detail ? <span className="command-palette-action-detail">{action.detail}</span> : null}
                </span>
                <span className="command-palette-action-meta">
                  <span>{action.group}</span>
                  {action.shortcut ? <span className="command-palette-action-shortcut">{action.shortcut}</span> : null}
                </span>
              </button>
            ))
          ) : (
            <div className="command-palette-empty" role="status">
              {NO_ACTIONS_COPY}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
