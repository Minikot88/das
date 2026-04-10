import React from "react";

export default function Toolbar({ left, right, className = "" }) {
  return (
    <div className={`ui-toolbar${className ? ` ${className}` : ""}`}>
      <div className="ui-toolbar-group">{left}</div>
      <div className="ui-toolbar-group">{right}</div>
    </div>
  );
}
