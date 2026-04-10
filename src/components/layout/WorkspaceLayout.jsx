import React from "react";

export default function WorkspaceLayout({ columns = "two", className = "", children, ...props }) {
  const columnClass = columns === "three" ? " is-three-column" : " is-two-column";
  return (
    <div className={`ui-workspace${columnClass}${className ? ` ${className}` : ""}`} {...props}>
      {children}
    </div>
  );
}
