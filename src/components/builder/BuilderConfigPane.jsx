import React from "react";
import BuilderMappingsSection from "./BuilderMappingsSection";
import BuilderVisualSection from "./BuilderVisualSectionV2";
import BuilderLabelSection from "./BuilderLabelSection";
import DisplayOptionsSection from "./DisplayOptionsSection";
import SqlEditorPanel from "./SqlEditorPanel";

export default function BuilderConfigPane({
  chartDefinition,
  chartType,
  activeChartMeta,
  chartCatalog,
  recommendedCharts,
  onChartTypeChange,
  saveSuccess,
  canAddChart,
  validationSummary,
  aggregation,
  aggregationOptions,
  queryMode,
  generatedSql,
  customSql,
  queryResult,
  queryError,
  queryStatus,
  lastRunAt,
  setBuilderState,
  slotAssignments,
  roleAssignments,
  roleValidation,
  handleFieldAssign,
  clearSlot,
  handleRoleFieldRemove,
  handleReorderRole,
  lastMappingNotice,
  canAssignFieldToRole,
  name,
  title,
  subtitle,
  colorTheme,
  legendVisible,
  showGrid,
  showLabels,
  xLabel,
  yLabel,
  handleQueryModeChange,
  handleSqlChange,
  handleRunSql,
  handleFormatSql,
  handleResetSql,
  handleUseSqlResultForChart,
}) {
  const blockerCount = validationSummary?.blockers?.length ?? 0;
  const inlineIssue = queryError || validationSummary?.blockers?.[0]?.title || "";

  return (
    <aside className="builder-pane-shell builder-pane-shell-right">
      <section className="builder-controls-panel">
        {inlineIssue ? <div className="builder-inline-validation">Warning: {inlineIssue}</div> : null}

        <div className="builder-controls-grid">
          <div className="builder-controls-card builder-inspector-card">
            <BuilderVisualSection
              chartDefinition={chartDefinition}
              chartType={chartType}
              activeChartMeta={activeChartMeta}
              chartCatalog={chartCatalog}
              recommendedCharts={recommendedCharts}
              onChartTypeChange={onChartTypeChange}
            />
          </div>

          <div className="builder-controls-card builder-inspector-card">
            <BuilderMappingsSection
              roleAssignments={roleAssignments}
              lastMappingNotice={lastMappingNotice}
              handleFieldAssign={handleFieldAssign}
              handleRoleFieldRemove={handleRoleFieldRemove}
              handleClearRole={clearSlot}
              handleReorderRole={handleReorderRole}
              canAssignFieldToRole={canAssignFieldToRole}
            />
          </div>

          <div className="builder-controls-card builder-inspector-card">
            <div className="builder-config-stack">
              <SqlEditorPanel
                queryMode={queryMode}
                generatedSql={generatedSql}
                customSql={customSql}
                queryResult={queryResult}
                queryError={queryError}
                queryStatus={queryStatus}
                lastRunAt={lastRunAt}
                onModeChange={handleQueryModeChange}
                onSqlChange={handleSqlChange}
                onRunSql={handleRunSql}
                onFormatSql={handleFormatSql}
                onResetSql={handleResetSql}
                onUseResult={handleUseSqlResultForChart}
              />
              <div className="builder-config-section builder-inspector-section">
                <div className="builder-section-head">
                  <span className="builder-query-label">Chart</span>
                  {aggregationOptions.length ? <span className="builder-inline-note">Aggregate</span> : null}
                </div>
                <div className="builder-form-grid">
                  <label className="builder-form-field">
                    <span className="builder-form-label">Chart name</span>
                    <input
                      className="builder-form-input"
                      placeholder="Sales summary"
                      value={name}
                      onChange={(event) => setBuilderState({ name: event.target.value })}
                    />
                  </label>
                </div>
                {aggregationOptions.length ? (
                  <div className="builder-aggregation-toggle compact">
                    {aggregationOptions.map((agg) => (
                      <button
                        key={agg}
                        type="button"
                        onClick={() => setBuilderState({ aggregation: agg })}
                        className={`builder-aggregation-btn${aggregation === agg ? " active" : ""}`}
                      >
                        {agg}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <BuilderLabelSection
                chartMeta={activeChartMeta}
                title={title}
                subtitle={subtitle}
                xLabel={xLabel}
                yLabel={yLabel}
                setBuilderState={setBuilderState}
              />
              <DisplayOptionsSection
                legendVisible={legendVisible}
                showGrid={showGrid}
                showLabels={showLabels}
                colorTheme={colorTheme}
                setBuilderState={setBuilderState}
              />
              {blockerCount ? (
                <div className="builder-validation-inline-list">
                  {validationSummary.blockers.slice(0, 2).map((issue) => (
                    <div key={issue.code} className="builder-validation-inline-item">{issue.title}</div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </aside>
  );
}
