import React, { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { PageContainer, WorkspaceLayout } from "../../components/layout/Layout";
import { useStore } from "../../store/useStore";
import {
  createBuilderContextForDashboard,
  createBuilderReturnState,
} from "../../utils/dashboardWorkspace";
import { clearBuilderDraft } from "../../utils/storage";
import FieldList from "./FieldList";
import ChartTypePicker from "./ChartTypePicker";
import QueryModePanel from "./QueryModePanel";
import ChartMappingPanel from "./ChartMappingPanel";
import ChartPreviewPanel from "./ChartPreviewPanel";
import ChartSettingsPanel from "./ChartSettingsPanel";
import ChartSavePanel from "./ChartSavePanel";
import useChartBuilder from "./hooks/useChartBuilder";

function getBuilderContextFromRoute(locationState, fallbackContext) {
  return locationState?.builderContext ?? fallbackContext ?? null;
}

export default function BuilderPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const activeProjectId = useStore((state) => state.activeProjectId);
  const activeSheetId = useStore((state) => state.activeSheetId);
  const activeDashboardId = useStore((state) => state.activeDashboardId);
  const builderNavigationContext = useStore((state) => state.builderNavigationContext);
  const clearBuilderNavigationContext = useStore((state) => state.clearBuilderNavigationContext);

  const fallbackContext = useMemo(
    () =>
      createBuilderContextForDashboard({
        projectId: activeProjectId,
        sheetId: activeSheetId,
        dashboardId: activeDashboardId,
        returnTo: "/dashboard",
      }),
    [activeDashboardId, activeProjectId, activeSheetId]
  );

  const builderContext = useMemo(
    () => getBuilderContextFromRoute(location.state, builderNavigationContext ?? fallbackContext),
    [builderNavigationContext, fallbackContext, location.state]
  );

  const builder = useChartBuilder(builderContext);

  async function handleSave() {
    try {
      const result = await builder.saveChartToDashboard();
      clearBuilderDraft();
      clearBuilderNavigationContext();
      navigate(builderContext?.returnTo || "/dashboard", {
        replace: true,
        state: createBuilderReturnState(builderContext, {
          createdWidgetId: result.layoutItem?.i ?? null,
          shouldSelectCreatedWidget: true,
        }),
      });
    } catch {
      // Hook already stores the error state.
    }
  }

  function handleCancel() {
    clearBuilderNavigationContext();
    navigate(builderContext?.returnTo || "/dashboard", {
      replace: true,
      state: createBuilderReturnState(builderContext),
    });
  }

  return (
    <PageContainer className="builder-shell builder-v3-shell">
      <header className="builder-v3-header builder-v3-header-compact">
        <div>
          <h1 className="builder-v3-page-title">Chart Builder</h1>
          <p className="builder-v3-page-copy">Choose a chart type, map fields, preview, and save.</p>
        </div>
      </header>

      <WorkspaceLayout columns="three" className="builder-v3-workspace">
        <div className="builder-v3-column builder-v3-column-left">
          <FieldList
            dataset={builder.explorerDataset}
            schema={builder.effectiveSchema}
            queryMode={builder.queryMode}
            onDragStart={(event, field) => {
              event.dataTransfer.setData("application/json", JSON.stringify(field));
              event.dataTransfer.effectAllowed = "copy";
            }}
          />
        </div>

        <div className="builder-v3-column builder-v3-column-main">
          <div className="builder-v3-center-scroll">
            <ChartTypePicker
              templates={builder.templates}
              selectedTemplateId={builder.selectedTemplateId}
              onChange={builder.setSelectedTemplate}
            />
            <ChartMappingPanel
              template={builder.selectedTemplate}
              mapping={builder.mapping}
              validation={builder.validation}
              onDropField={builder.assignField}
              onRemoveField={builder.removeField}
              canAssignField={builder.canAssignField}
            />
            <ChartPreviewPanel
              template={builder.selectedTemplate}
              previewConfig={builder.previewConfig}
              settings={builder.settings}
              validation={builder.validation}
            />
            <QueryModePanel
              queryMode={builder.queryMode}
              generatedSql={builder.generatedSql}
              customSql={builder.customSql}
              queryStatus={builder.queryStatus}
              queryError={builder.queryError}
              queryResult={builder.queryResult}
              onChangeMode={builder.setQueryMode}
              onChangeSql={builder.updateCustomSql}
              onRunSql={builder.applySql}
              onResetSql={builder.resetSqlToGenerated}
            />
          </div>
        </div>

        <div className="builder-v3-column builder-v3-column-right">
          <ChartSettingsPanel
            template={builder.selectedTemplate}
            settings={builder.settings}
            onSettingChange={builder.updateSetting}
          />
          <ChartSavePanel
            builderContext={builderContext}
            validation={builder.validation}
            saving={builder.saving}
            error={builder.error}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        </div>
      </WorkspaceLayout>
    </PageContainer>
  );
}
