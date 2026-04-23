import React, { useMemo, useState } from "react";
import {
  getChartPalette,
  getChartThemeGroups,
  resolveChartThemeKey,
} from "../../utils/chartPalette";

function Toggle({ label, checked, onChange, hint = "", showHint = true }) {
  return (
    <label className="builder-toggle-row">
      <span className="builder-toggle-copy">
        <strong>{label}</strong>
        {hint && showHint ? <small>{hint}</small> : null}
      </span>
      <span className={`builder-toggle-pill${checked ? " is-on" : ""}`}>
        <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
        <span className="builder-toggle-knob" aria-hidden="true" />
      </span>
    </label>
  );
}

function ThemeOption({ theme, isActive, onSelect, showDescriptions }) {
  return (
    <button
      type="button"
      className={`builder-theme-option${isActive ? " is-active" : ""}`}
      onClick={() => onSelect(theme.value)}
      title={theme.description}
    >
      <div className="builder-theme-option-head">
        <div className="builder-theme-option-copy">
          <strong>{theme.label}</strong>
          <span>{theme.toneLabel || "Theme preset"}</span>
        </div>
        {isActive ? <span className="builder-theme-option-badge">Active</span> : null}
      </div>
      <div className="builder-theme-swatch-row" aria-hidden="true">
        {theme.swatches.map((color) => (
          <span
            key={`${theme.value}-${color}`}
            className="builder-theme-swatch"
            style={{ background: color }}
          />
        ))}
      </div>
      {showDescriptions ? <p className="builder-theme-option-description">{theme.description}</p> : null}
    </button>
  );
}

export default function DisplayOptionsSection({
  displayOptions,
  onDisplayChange,
  showDescriptions = false,
}) {
  const [themeQuery, setThemeQuery] = useState("");
  const {
    colorTheme,
    showLegend,
    legendPosition,
    showTooltip,
    showGrid,
    showAxis,
    showLabels,
    backgroundOpacity,
    padding,
  } = displayOptions;

  const activeThemeKey = resolveChartThemeKey(colorTheme);
  const activeTheme = getChartPalette(activeThemeKey);
  const groupedThemes = useMemo(() => {
    const query = themeQuery.trim().toLowerCase();

    return getChartThemeGroups()
      .map((group) => {
        if (!query) return group;

        return {
          ...group,
          themes: group.themes.filter((theme) => {
            const haystack = [
              theme.label,
              theme.description,
              theme.toneLabel,
              ...theme.keywords,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();

            return haystack.includes(query);
          }),
        };
      })
      .filter((group) => group.themes.length > 0);
  }, [themeQuery]);

  return (
    <div className="builder-config-section builder-inspector-section" style={{ gap: 8 }}>
      <div className="builder-section-head">
        <strong className="builder-section-title">Display</strong>
      </div>

      <div className="builder-display-stack" style={{ gap: 8 }}>
        <div className="builder-theme-picker">
          <div className="builder-theme-picker-toolbar">
            <div className="builder-theme-picker-copy">
              <span className="builder-form-label">Chart theme</span>
              <strong>{activeTheme.label}</strong>
              {showDescriptions ? <p>{activeTheme.description}</p> : null}
            </div>

            <label className="builder-form-field builder-theme-search-field">
              <span className="builder-form-label">Find theme</span>
              <input
                className="builder-form-input"
                type="search"
                value={themeQuery}
                onChange={(event) => setThemeQuery(event.target.value)}
                placeholder="Search chart themes"
              />
            </label>
          </div>

          <div className="builder-theme-selected-strip" aria-hidden="true">
            {activeTheme.swatches.map((color) => (
              <span
                key={`active-${color}`}
                className="builder-theme-swatch is-selected"
                style={{ background: color }}
              />
            ))}
          </div>

          <div className="builder-theme-group-stack">
            {groupedThemes.length ? (
              groupedThemes.map((group) => (
                <section key={group.id} className="builder-theme-group">
                  <div className="builder-theme-group-head">
                    <div>
                      <strong>{group.label}</strong>
                      {showDescriptions ? <p>{group.description}</p> : null}
                    </div>
                    <span>{group.themes.length} themes</span>
                  </div>

                  <div className="builder-theme-option-grid">
                    {group.themes.map((theme) => (
                      <ThemeOption
                        key={theme.value}
                        theme={theme}
                        isActive={activeThemeKey === theme.value}
                        showDescriptions={showDescriptions}
                        onSelect={(nextTheme) => onDisplayChange("colorTheme", nextTheme)}
                      />
                    ))}
                  </div>
                </section>
              ))
            ) : (
              <div className="builder-settings-helper">
                No theme matched your search. Try another keyword.
              </div>
            )}
          </div>
        </div>

        <Toggle
          label="Legend"
          hint="Shared legend."
          showHint={showDescriptions}
          checked={showLegend !== false}
          onChange={(nextValue) => onDisplayChange("showLegend", nextValue)}
        />
        <Toggle
          label="Tooltip"
          hint="Hover details."
          showHint={showDescriptions}
          checked={showTooltip !== false}
          onChange={(nextValue) => onDisplayChange("showTooltip", nextValue)}
        />
        <Toggle
          label="Grid lines"
          hint="Axis grid."
          showHint={showDescriptions}
          checked={showGrid !== false}
          onChange={(nextValue) => onDisplayChange("showGrid", nextValue)}
        />
        <Toggle
          label="Axes"
          hint="Axis chrome."
          showHint={showDescriptions}
          checked={showAxis !== false}
          onChange={(nextValue) => onDisplayChange("showAxis", nextValue)}
        />
        <Toggle
          label="Data labels"
          hint="Shared labels."
          showHint={showDescriptions}
          checked={showLabels === true}
          onChange={(nextValue) => onDisplayChange("showLabels", nextValue)}
        />

        <div className="builder-form-grid builder-form-grid-two">
          <label className="builder-form-field">
            <span className="builder-form-label">Legend position</span>
            <select
              className="builder-form-input"
              value={legendPosition}
              onChange={(event) => onDisplayChange("legendPosition", event.target.value)}
            >
              <option value="bottom">Bottom</option>
              <option value="top">Top</option>
              <option value="left">Left</option>
              <option value="right">Right</option>
            </select>
          </label>
          <label className="builder-form-field">
            <span className="builder-form-label">Background transparency</span>
            <input
              className="builder-form-input"
              type="range"
              min="0"
              max="0.9"
              step="0.05"
              value={backgroundOpacity}
              onChange={(event) => onDisplayChange("backgroundOpacity", Number(event.target.value))}
            />
          </label>
        </div>

        <div className="builder-form-grid builder-form-grid-two">
          <label className="builder-form-field">
            <span className="builder-form-label">Padding</span>
            <input
              className="builder-form-input"
              type="number"
              min="0"
              max="64"
              step="2"
              value={padding}
              onChange={(event) => onDisplayChange("padding", Number(event.target.value))}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
