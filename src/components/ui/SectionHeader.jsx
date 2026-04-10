import React from "react";

export default function SectionHeader({
  kicker,
  title,
  description,
  actions = null,
  className = "",
}) {
  return (
    <div className={`ui-section-header${className ? ` ${className}` : ""}`}>
      <div className="ui-section-header-copy">
        {kicker ? <span className="ui-section-kicker">{kicker}</span> : null}
        {title ? <h2 className="ui-section-title">{title}</h2> : null}
        {description ? <p className="ui-section-description">{description}</p> : null}
      </div>
      {actions}
    </div>
  );
}
