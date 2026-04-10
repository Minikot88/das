import React from "react";

export default function Tabs({ items = [], value, onChange, className = "" }) {
  return (
    <div className={`ui-tabs${className ? ` ${className}` : ""}`} role="tablist">
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          role="tab"
          aria-selected={value === item.value}
          className={`ui-tab${value === item.value ? " is-active" : ""}`}
          onClick={() => onChange?.(item.value)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
