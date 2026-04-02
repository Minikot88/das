import React from "react";
import Button from "./Button";

export default function EmptyState({ title, description, icon = "--", actionText, onAction, className = "" }) {
  return (
    <div className={`empty-state-card${className ? ` ${className}` : ""}`}>
      <div className="empty-state-icon">{icon}</div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-description">{description}</p>
      {actionText && onAction ? <Button variant="primary" onClick={onAction}>{actionText}</Button> : null}
    </div>
  );
}
