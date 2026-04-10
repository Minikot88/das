import React from "react";

export default function PageHeader({ kicker, title, subtitle, actions = null, children = null, className = "" }) {
  return (
    <header className={`ui-page-header${className ? ` ${className}` : ""}`}>
      <div className="ui-page-header-main">
        <div className="ui-page-header-copy">
          {kicker ? <span className="ui-page-kicker">{kicker}</span> : null}
          {title ? <h1 className="ui-page-title">{title}</h1> : null}
          {subtitle ? <p className="ui-page-subtitle">{subtitle}</p> : null}
        </div>
        {actions}
      </div>
      {children}
    </header>
  );
}
