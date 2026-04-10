import React from "react";

export default function Card({ children, className = "", onClick, noPadding = false, ...props }) {
  const Component = onClick ? "button" : "div";
  return (
    <Component
      className={`ui-card ui-surface${noPadding ? " no-padding" : ""}${onClick ? " is-interactive" : ""}${className ? ` ${className}` : ""}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </Component>
  );
}
