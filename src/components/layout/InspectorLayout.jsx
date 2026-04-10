import React from "react";

export default function InspectorLayout({ children, className = "", ...props }) {
  return (
    <aside className={`ui-inspector${className ? ` ${className}` : ""}`} {...props}>
      {children}
    </aside>
  );
}
