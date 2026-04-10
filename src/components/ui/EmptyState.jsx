import React from "react";
import Button from "./Button";

export default function EmptyState({ title, description, icon = "--", actionText, onAction, className = "" }) {
  return (
    <div className={`ui-empty-state empty-state-card${className ? ` ${className}` : ""}`}>
      <div className="ui-empty-state-icon empty-state-icon">{icon}</div>
      <h3 className="ui-empty-state-title empty-state-title">{title}</h3>
      {description ? <p className="ui-empty-state-description empty-state-description">{description}</p> : null}
      {actionText && onAction ? <Button variant="primary" onClick={onAction}>{actionText}</Button> : null}
    </div>
  );
}
