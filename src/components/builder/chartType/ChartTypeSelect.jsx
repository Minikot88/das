import React, { useEffect, useRef, useState } from "react";
import "./chartTypeSelector.css";
import ChartFamilyDropdown from "./ChartFamilyDropdown";

export default function ChartTypeSelect({
  families,
  selectedFamily,
  selectedFamilyMeta,
  selectedCategory,
  onFamilyChange,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    function handleDocumentClick(event) {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleDocumentClick);
    return () => document.removeEventListener("mousedown", handleDocumentClick);
  }, []);

  return (
    <div className="builder-chart-type-select" ref={rootRef}>
      <button
        type="button"
        className={`builder-chart-type-select-trigger${open ? " is-open" : ""}${selectedFamily ? " is-active" : ""}`}
        onClick={() => setOpen((current) => !current)}
      >
        <div className="builder-chart-type-select-copy">
          <span className="builder-query-label">Selected family</span>
          <strong>{selectedFamilyMeta?.label ?? "Select chart family"}</strong>
        </div>
        <span className="builder-chart-type-select-chevron">{open ? "▲" : "▼"}</span>
      </button>

      {open ? (
        <ChartFamilyDropdown
          families={families}
          selectedFamily={selectedFamily}
          selectedCategory={selectedCategory}
          onFamilySelect={(familyId) => {
            onFamilyChange(familyId);
            setOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}
