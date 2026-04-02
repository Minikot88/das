/**
 * components/dashboard/Tab.jsx
 * Inline-editable tab component.
 */
import React, { useEffect, useRef, useState } from "react";

export default function Tab({ label, isActive, count, onSelect, onRename, onRemove, canRemove }) {
  const [renaming, setRenaming] = useState(false);
  const [val, setVal] = useState(label);
  const inputRef = useRef(null);

  useEffect(() => {
    setVal(label);
  }, [label]);

  useEffect(() => {
    if (!renaming) return;

    inputRef.current?.focus();
    inputRef.current?.select();
  }, [renaming]);

  const startRename = (event) => {
    event.stopPropagation();
    setVal(label);
    setRenaming(true);
  };

  const closeRename = () => {
    setRenaming(false);
    setVal(label);
  };

  const commit = () => {
    if (val.trim() && val.trim() !== label) {
      onRename(val.trim());
    }
    setRenaming(false);
  };

  return (
    <div
      className={`dtab${isActive ? " active" : ""}`}
      onClick={onSelect}
      role="tab"
      aria-selected={isActive}
    >
      {renaming ? (
        <div className="dtab-edit-wrap" onClick={(event) => event.stopPropagation()}>
          <input
            ref={inputRef}
            className="dtab-rename-input"
            value={val}
            maxLength={80}
            onChange={(event) => setVal(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === "Enter") commit();
              if (event.key === "Escape") closeRename();
            }}
          />
        </div>
      ) : (
        <>
          <span
            className="dtab-label"
            onDoubleClick={startRename}
            title="Double-click to rename"
          >
            {label}
            {count != null && <span className="dtab-count">{count}</span>}
          </span>

          <div className="dtab-actions">
            <button
              type="button"
              className="dtab-action-btn"
              onClick={startRename}
              aria-label={`Rename ${label}`}
              title="Rename"
            >
              Edit
            </button>

            {canRemove ? (
              <button
                type="button"
                className="dtab-close"
                onClick={(event) => {
                  event.stopPropagation();
                  onRemove();
                }}
                aria-label={`Remove ${label}`}
              >
                x
              </button>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
