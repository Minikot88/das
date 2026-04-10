import React from "react";

export default function Badge({ children, tone = "default", className = "", ...props }) {
  const toneClass = tone !== "default" ? ` is-${tone}` : "";
  return (
    <span className={`ui-badge${toneClass}${className ? ` ${className}` : ""}`} {...props}>
      {children}
    </span>
  );
}
