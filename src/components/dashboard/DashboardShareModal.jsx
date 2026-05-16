import React, { useEffect, useMemo, useState } from "react";

function copyWithFallback(text) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    document.execCommand("copy");
    return Promise.resolve();
  } finally {
    textarea.remove();
  }
}

function TabButton({ id, label, isActive, onSelect }) {
  return (
    <button
      type="button"
      className={`dashboard-share-tab${isActive ? " is-active" : ""}`}
      onClick={() => onSelect(id)}
    >
      {label}
    </button>
  );
}

function ToggleField({ label, checked, onChange, hint }) {
  return (
    <label className="dashboard-share-toggle">
      <span className="dashboard-share-toggle-copy">
        <strong>{label}</strong>
        {hint ? <small>{hint}</small> : null}
      </span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

export default function DashboardShareModal({
  dashboardName,
  activeTab = "share",
  onChangeTab,
  canExport = false,
  exportBusy = false,
  onDownloadPng,
  onDownloadJpg,
  publicUrl,
  embedUrl,
  embedCode,
  options,
  onChangeOptions,
  onClose,
}) {
  const [copyState, setCopyState] = useState("");

  useEffect(() => {
    if (!copyState) return undefined;
    const timer = window.setTimeout(() => setCopyState(""), 1600);
    return () => window.clearTimeout(timer);
  }, [copyState]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };

    document.body.classList.add("dashboard-share-open");
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.classList.remove("dashboard-share-open");
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const exportHint = useMemo(() => {
    if (canExport) return "Export the current dashboard canvas as a clean image.";
    return "Add at least one widget before exporting dashboard images.";
  }, [canExport]);

  async function handleCopy(label, value) {
    try {
      await copyWithFallback(value);
      setCopyState(`${label} copied`);
    } catch {
      setCopyState(`Unable to copy ${label}`);
    }
  }

  return (
    <div className="dashboard-share-modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="dashboard-share-modal" onClick={(event) => event.stopPropagation()}>
        <div className="dashboard-share-modal-head">
          <div className="dashboard-share-modal-copy">
            <span className="dashboard-share-kicker">Share Dashboard</span>
            <h2 className="dashboard-share-title">{dashboardName}</h2>
            <p className="dashboard-share-description">
              Export as image, copy public links, or generate iframe embed code.
            </p>
          </div>
          <button type="button" className="dashboard-share-close" onClick={onClose} aria-label="Close share dialog">
            Close
          </button>
        </div>

        <div className="dashboard-share-tabs" role="tablist" aria-label="Dashboard sharing options">
          <TabButton id="export" label="Export Image" isActive={activeTab === "export"} onSelect={onChangeTab} />
          <TabButton id="share" label="Share Link" isActive={activeTab === "share"} onSelect={onChangeTab} />
          <TabButton id="embed" label="Embed" isActive={activeTab === "embed"} onSelect={onChangeTab} />
        </div>

        {copyState ? (
          <div className="dashboard-share-feedback" role="status">
            {copyState}
          </div>
        ) : null}

        <div className="dashboard-share-body">
          {activeTab === "export" ? (
            <section className="dashboard-share-panel">
              <div className="dashboard-share-panel-copy">
                <strong>Export Image</strong>
                <p>{exportHint}</p>
              </div>
              <div className="dashboard-share-action-row">
                <button
                  type="button"
                  className="dashboard-toolbar-btn is-primary"
                  onClick={onDownloadPng}
                  disabled={!canExport || exportBusy}
                >
                  {exportBusy ? "Preparing file..." : "Download PNG"}
                </button>
                <button
                  type="button"
                  className="dashboard-toolbar-btn"
                  onClick={onDownloadJpg}
                  disabled={!canExport || exportBusy}
                >
                  Download JPG
                </button>
              </div>
            </section>
          ) : null}

          {activeTab === "share" ? (
            <section className="dashboard-share-panel">
              <div className="dashboard-share-panel-copy">
                <strong>Public Link</strong>
                <p>Open a view-only dashboard URL with editor controls hidden.</p>
              </div>
              <label className="dashboard-share-field">
                <span>Public URL</span>
                <textarea readOnly value={publicUrl} className="dashboard-share-textarea" />
              </label>
              <div className="dashboard-share-action-row">
                <button type="button" className="dashboard-toolbar-btn is-primary" onClick={() => handleCopy("Link", publicUrl)}>
                  Copy Link
                </button>
                <a className="dashboard-toolbar-btn" href={publicUrl} target="_blank" rel="noreferrer">
                  Open
                </a>
              </div>
            </section>
          ) : null}

          {activeTab === "embed" ? (
            <section className="dashboard-share-panel">
              <div className="dashboard-share-panel-copy">
                <strong>Embed with iframe</strong>
                <p>Embed in external pages with a clean viewer mode.</p>
              </div>

              <div className="dashboard-share-form-grid">
                <label className="dashboard-share-field">
                  <span>Width</span>
                  <input
                    className="dashboard-share-input"
                    type="number"
                    min="480"
                    step="20"
                    value={options.width}
                    onChange={(event) => onChangeOptions({ width: Number(event.target.value) || 1200 })}
                  />
                </label>
                <label className="dashboard-share-field">
                  <span>Height</span>
                  <input
                    className="dashboard-share-input"
                    type="number"
                    min="320"
                    step="20"
                    value={options.height}
                    onChange={(event) => onChangeOptions({ height: Number(event.target.value) || 720 })}
                  />
                </label>
                <label className="dashboard-share-field">
                  <span>Theme</span>
                  <select
                    className="dashboard-share-input"
                    value={options.theme}
                    onChange={(event) => onChangeOptions({ theme: event.target.value })}
                  >
                    <option value="auto">Auto</option>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                </label>
              </div>

              <div className="dashboard-share-toggle-grid">
                <ToggleField
                  label="Responsive Width"
                  checked={options.responsive}
                  hint="Use 100% width and keep max-width constraints."
                  onChange={(nextValue) => onChangeOptions({ responsive: nextValue })}
                />
                <ToggleField
                  label="Show Header"
                  checked={options.showHeader}
                  hint="Turn off for tighter embedded output."
                  onChange={(nextValue) => onChangeOptions({ showHeader: nextValue })}
                />
              </div>

              <label className="dashboard-share-field">
                <span>Embed URL</span>
                <textarea readOnly value={embedUrl} className="dashboard-share-textarea" />
              </label>
              <label className="dashboard-share-field">
                <span>iframe Code</span>
                <textarea readOnly value={embedCode} className="dashboard-share-textarea is-code" />
              </label>
              <div className="dashboard-share-action-row">
                <button type="button" className="dashboard-toolbar-btn is-primary" onClick={() => handleCopy("iframe code", embedCode)}>
                  Copy iframe Code
                </button>
                <a className="dashboard-toolbar-btn" href={embedUrl} target="_blank" rel="noreferrer">
                  Open
                </a>
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
