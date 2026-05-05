import React, { useEffect, useMemo, useState } from "react";

export default function ChartTypePicker({ templates = [], selectedTemplateId, onChange }) {
  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) ?? templates[0] ?? null;
  const [activeFamily, setActiveFamily] = useState(selectedTemplate?.family ?? "bar");

  useEffect(() => {
    if (selectedTemplate?.family) {
      setActiveFamily(selectedTemplate.family);
    }
  }, [selectedTemplate?.family]);

  const families = useMemo(
    () => Array.from(new Set(templates.map((template) => template.family))),
    [templates]
  );
  const visibleTemplates = templates.filter((template) => template.family === activeFamily);

  return (
    <section className="builder-v3-panel">
      <div className="builder-v3-section-head">
        <div>
          <span className="builder-v3-kicker">Chart Type</span>
          <h2 className="builder-v3-title">Choose a variant</h2>
        </div>
      </div>

      <div className="builder-v3-family-tabs">
        {families.map((family) => (
          <button
            key={family}
            type="button"
            className={`builder-v3-family-tab${family === activeFamily ? " is-active" : ""}`}
            onClick={() => setActiveFamily(family)}
          >
            {family}
          </button>
        ))}
      </div>

      <div className="builder-v3-template-grid">
        {visibleTemplates.map((template) => (
          <button
            key={template.id}
            type="button"
            className={`builder-v3-template-card${template.id === selectedTemplateId ? " is-active" : ""}`}
            onClick={() => onChange(template.id)}
          >
            <strong>{template.name}</strong>
            <span>{template.description}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
