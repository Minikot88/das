import React, { useState } from "react";
import { useI18n } from "../../utils/i18n";

export default function CreateProjectModal({ onClose, onCreate }) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!name.trim()) {
      setError(t("home.projectNameRequired"));
      return;
    }
    onCreate(name.trim());
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-box" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-copy">
            <h2 className="modal-title">{t("home.newProject")}</h2>
            <p className="modal-subtitle">{t("home.projectNamePlaceholder")}</p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label={t("common.close")}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="modal-field">
            <label className="modal-label" htmlFor="project-name-input">{t("home.projectName")}</label>
            <input id="project-name-input" className="modal-input" type="text" placeholder={t("home.projectNamePlaceholder")} value={name} onChange={(event) => { setName(event.target.value); setError(""); }} autoFocus />
          </div>
          {error ? <div className="modal-error">{error}</div> : null}
          <div className="modal-actions">
            <button type="button" className="modal-btn cancel" onClick={onClose}>{t("common.cancel")}</button>
            <button type="submit" className="modal-btn primary">{t("home.createProject")}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
