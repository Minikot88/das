import React, { useId, useRef, useState } from "react";

const ROLE_LABELS = {
  category: "แกนนอน",
  x: "แกนนอน",
  time: "แกนนอน",
  date: "แกนนอน",
  column: "แกนนอน",
  geo: "แกนนอน",
  region: "แกนนอน",
  value: "ค่าที่ต้องการวัด",
  values: "ค่าที่ต้องการวัด",
  y: "ค่าที่ต้องการวัด",
  ys: "ค่าที่ต้องการวัด",
  size: "ค่าที่ต้องการวัด",
  dimensions: "ค่าที่ต้องการวัด",
  targetValue: "ค่าที่ต้องการวัด",
  progress: "ค่าที่ต้องการวัด",
  open: "ค่าที่ต้องการวัด",
  close: "ค่าที่ต้องการวัด",
  low: "ค่าที่ต้องการวัด",
  high: "ค่าที่ต้องการวัด",
  min: "ค่าที่ต้องการวัด",
  q1: "ค่าที่ต้องการวัด",
  median: "ค่าที่ต้องการวัด",
  q3: "ค่าที่ต้องการวัด",
  max: "ค่าที่ต้องการวัด",
  series: "แบ่งกลุ่ม",
  legend: "แบ่งกลุ่ม",
  group: "แบ่งกลุ่ม",
  hierarchy: "แบ่งกลุ่ม",
  row: "แบ่งกลุ่ม",
  source: "แบ่งกลุ่ม",
  target: "แบ่งกลุ่ม",
  nodes: "แบ่งกลุ่ม",
  edges: "แบ่งกลุ่ม",
  label: "ตัวกรอง",
  detail: "ตัวกรอง",
  custom: "ตัวกรอง",
  filter: "ตัวกรอง",
  filters: "ตัวกรอง",
};

const ROLE_HINTS = {
  "แกนนอน": "ลากฟิลด์มาวางเพื่อเลือกแกนนอน",
  "ค่าที่ต้องการวัด": "ลากฟิลด์มาวางเพื่อเลือกค่าที่ต้องการวัด",
  "แบ่งกลุ่ม": "ลากฟิลด์มาวางเพื่อแบ่งกลุ่มข้อมูล",
  "ตัวกรอง": "ลากฟิลด์มาวางเพื่อใช้เป็นตัวกรอง",
};

const TYPE_LABELS = {
  string: "Text",
  category: "Text",
  number: "Number",
  date: "Date",
  boolean: "Boolean",
};

function normalizeMappedValues(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return value ? [value] : [];
}

function getRoleLabel(role) {
  const key = String(role?.key ?? "").toLowerCase();
  return ROLE_LABELS[key] || role.label;
}

function getAcceptedTypes(role) {
  return role?.accepts || role?.acceptedTypes || [];
}

function getTypeLabel(type) {
  return TYPE_LABELS[type] || type || "Any";
}

function getRoleHint(displayLabel) {
  return ROLE_HINTS[displayLabel] || "ลากฟิลด์มาวาง หรือเลือกจากรายการ";
}

function getFieldOptionLabel(field) {
  const label = field?.label || field?.name || "";
  const type = getTypeLabel(field?.type || field?.semanticType || field?.sourceType);
  return type ? `${label} (${type})` : label;
}

export default function DropZone({
  role,
  mappedValue,
  validation,
  availableFields = [],
  onDropField,
  onRemoveField,
  canAssignField,
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const selectRef = useRef(null);
  const dropzoneId = useId();
  const mappedFields = normalizeMappedValues(mappedValue);
  const displayLabel = getRoleLabel(role);
  const acceptedTypes = getAcceptedTypes(role);
  const roleHint = getRoleHint(displayLabel);
  const selectableFields = availableFields.filter((field) => {
    if (!field?.name) return false;
    if (mappedFields.includes(field.name)) return false;
    return canAssignField(role.key, field.name);
  });
  const hasError = validation.errors.some((message) => message.toLowerCase().includes(role.label.toLowerCase()) || message.toLowerCase().includes(role.key.toLowerCase()));

  function handleSelectField(event) {
    const fieldName = event.target.value;
    if (!fieldName) return;
    onDropField(role.key, fieldName);
    event.target.value = "";
  }

  function handleDragEnter(event) {
    event.preventDefault();
    setIsDragOver(true);
  }

  function handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setIsDragOver(true);
  }

  function handleDragLeave(event) {
    if (event.currentTarget.contains(event.relatedTarget)) return;
    setIsDragOver(false);
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragOver(false);
    const payload = event.dataTransfer.getData("application/json");
    if (!payload) return;

    let field = null;
    try {
      field = JSON.parse(payload);
    } catch {
      return;
    }
    if (!canAssignField(role.key, field.name)) return;
    onDropField(role.key, field.name);
  }

  function handleKeyDown(event) {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (event.target instanceof HTMLSelectElement) return;
    event.preventDefault();
    selectRef.current?.focus();
  }

  return (
    <div
      id={`${dropzoneId}-target`}
      className={`builder-v3-dropzone${hasError ? " is-error" : ""}${isDragOver ? " is-drag-over" : ""}`}
      role="group"
      tabIndex={0}
      aria-label={`${displayLabel} drop target`}
      aria-describedby={`${dropzoneId}-hint`}
      aria-invalid={hasError || undefined}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onKeyDown={handleKeyDown}
    >
      <div className="builder-v3-dropzone-head">
        <div>
          <strong>{displayLabel}</strong>
          <span>{acceptedTypes.length ? acceptedTypes.map(getTypeLabel).join(" / ") : "เลือกฟิลด์ที่ต้องการ"}</span>
        </div>
        {role.multiple ? <span className="builder-v3-pill">เลือกได้หลายฟิลด์</span> : null}
      </div>
      <p id={`${dropzoneId}-hint`} className="sr-only">
        Drop a dataset field here, or press Enter to choose a field from the list.
      </p>

      {mappedFields.length ? (
        <div className="builder-v3-mapped-list" aria-live="polite">
          {mappedFields.map((fieldName) => (
            <button
              key={fieldName}
              type="button"
              className="builder-v3-mapped-chip"
              aria-label={`Remove ${fieldName} from ${displayLabel}`}
              onClick={() => onRemoveField(role.key, fieldName)}
            >
              <span>{fieldName}</span>
              <small>นำออก</small>
            </button>
          ))}
        </div>
      ) : (
        <div className="builder-v3-dropzone-empty">
          <strong>{roleHint}</strong>
          <span>ยังไม่ได้เลือกฟิลด์</span>
        </div>
      )}

      <label className="builder-v3-dropzone-select">
        <span>หรือเลือกจากรายการ</span>
        <select
          ref={selectRef}
          defaultValue=""
          onChange={handleSelectField}
          aria-label={`Choose a field for ${displayLabel}`}
          aria-controls={`${dropzoneId}-target`}
        >
          <option value="">เลือกฟิลด์...</option>
          {selectableFields.map((field) => (
            <option key={field.name} value={field.name}>
              {getFieldOptionLabel(field)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
