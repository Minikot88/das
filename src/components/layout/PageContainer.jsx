import React from "react";

export default function PageContainer({ children, className = "", ...props }) {
  return (
    <div className={`ui-page-container${className ? ` ${className}` : ""}`} {...props}>
      {children}
    </div>
  );
}
