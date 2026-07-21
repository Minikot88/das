import React, { useEffect, useMemo, useState } from "react";
import { Resizable } from "react-resizable";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { PageContainer, WorkspaceLayout } from "@app/layouts/Layout";
import { useStore } from "@app/store/useStore";
import {
  createBuilderContextForDashboard,
  createBuilderReturnState,
} from "@modules/dashboards/public/workspace";
import { clearBuilderDraft } from "@infrastructure/persistence/workspace-ui/storage";
import FieldList from "@modules/charts/builder/FieldList";
import ChartTypePicker from "@modules/charts/builder/ChartTypePicker";
import QueryModePanel from "@modules/charts/builder/QueryModePanel";
import ChartMappingPanel from "@modules/charts/builder/ChartMappingPanel";
import ChartPreviewPanel from "@modules/charts/builder/ChartPreviewPanel";
import ChartSettingsPanel from "@modules/charts/builder/ChartSettingsPanel";
import ChartAnalyticsPanel from "@modules/charts/builder/ChartAnalyticsPanel";
import ChartSavePanel from "@modules/charts/builder/ChartSavePanel";
import useChartBuilder from "@modules/charts/builder/hooks/useChartBuilder";

function getBuilderContextFromRoute(locationState, fallbackContext) {
  return locationState?.builderContext ?? fallbackContext ?? null;
}

const SQL_PANEL_DEFAULT_HEIGHT = 180;
const SQL_PANEL_MIN_HEIGHT = 120;
const SQL_PANEL_COLLAPSED_HEIGHT = 42;

function getSqlPanelMaxHeight() {
  if (typeof window === "undefined") return 360;
  return Math.max(SQL_PANEL_MIN_HEIGHT, Math.floor(window.innerHeight * 0.5));
}

function clampSqlPanelHeight(height) {
  return Math.min(Math.max(height, SQL_PANEL_MIN_HEIGHT), getSqlPanelMaxHeight());
}

export default function BuilderPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const activeProjectId = useStore((state) => state.activeProjectId);
  const activeSheetId = useStore((state) => state.activeSheetId);
  const activeDashboardId = useStore((state) => state.activeDashboardId);
  const builderNavigationContext = useStore((state) => state.builderNavigationContext);
  const clearBuilderNavigationContext = useStore((state) => state.clearBuilderNavigationContext);
  const editingChartId = searchParams.get("chartId") ?? "";
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [sqlPanelHeight, setSqlPanelHeight] = useState(SQL_PANEL_DEFAULT_HEIGHT);
  const [isSqlPanelCollapsed, setIsSqlPanelCollapsed] = useState(false);

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

  const builder = useChartBuilder(builderContext, editingChartId);
  const mappedFieldNames = useMemo(
    () =>
      Array.from(
        new Set(
          Object.values(builder.mapping ?? {}).flatMap((value) =>
            Array.isArray(value) ? value.filter(Boolean) : value ? [value] : []
          )
        )
      ),
    [builder.mapping]
  );

  async function handleSave() {
    try {
      const result = await builder.saveChartToDashboard();
      setIsSaveModalOpen(false);
      if (!builder.isEditing) {
        clearBuilderDraft();
      }
      clearBuilderNavigationContext();
      navigate(builderContext?.returnTo || "/dashboard", {
        replace: true,
        state: result.updated
          ? createBuilderReturnState(builderContext)
          : createBuilderReturnState(builderContext, {
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

  useEffect(() => {
    function handleViewportResize() {
      setSqlPanelHeight((height) => clampSqlPanelHeight(height));
    }

    window.addEventListener("resize", handleViewportResize);
    return () => window.removeEventListener("resize", handleViewportResize);
  }, []);

  function handleSqlResize(_event, data) {
    setSqlPanelHeight(clampSqlPanelHeight(data.size.height));
  }

  function handleSqlKeyboardResize(event) {
    const step = event.shiftKey ? 40 : 10;
    let nextHeight = sqlPanelHeight;

    if (event.key === "ArrowUp") nextHeight += step;
    if (event.key === "ArrowDown") nextHeight -= step;
    if (event.key === "PageUp") nextHeight += 40;
    if (event.key === "PageDown") nextHeight -= 40;
    if (event.key === "Home") nextHeight = SQL_PANEL_MIN_HEIGHT;
    if (event.key === "End") nextHeight = getSqlPanelMaxHeight();
    if (nextHeight === sqlPanelHeight) return;

    event.preventDefault();
    setSqlPanelHeight(clampSqlPanelHeight(nextHeight));
  }

  const sqlPanel = (
    <section
      id="builder-sql-panel"
      className={`builder-v3-bottom-sql-panel${isSqlPanelCollapsed ? " is-collapsed" : ""}`}
      aria-labelledby="builder-sql-panel-title"
      style={{
        "--builder-sql-panel-current-height": `${isSqlPanelCollapsed ? SQL_PANEL_COLLAPSED_HEIGHT : sqlPanelHeight}px`,
      }}
    >
      {!isSqlPanelCollapsed ? <div className="builder-v3-sql-resize-handle" aria-hidden="true" /> : null}
      <div className="builder-v3-sql-ide-toolbar">
        <div>
          <strong id="builder-sql-panel-title">SQL Preview</strong>
          <span>{isSqlPanelCollapsed ? "ย่ออยู่" : "ปรับความสูงได้เหมือน IDE"}</span>
        </div>
        <button
          type="button"
          className="builder-v3-button builder-v3-sql-toggle"
          onClick={() => setIsSqlPanelCollapsed((value) => !value)}
          aria-expanded={!isSqlPanelCollapsed}
          aria-controls="builder-sql-panel-body"
        >
          {isSqlPanelCollapsed ? "Expand" : "Collapse"}
        </button>
      </div>

      {!isSqlPanelCollapsed ? (
        <div id="builder-sql-panel-body">
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
      ) : null}
    </section>
  );

  return (
    <PageContainer
      className={`builder-shell builder-v3-shell${isSqlPanelCollapsed ? " is-sql-panel-collapsed" : ""}`}
      style={{
        "--builder-sql-panel-height": `${isSqlPanelCollapsed ? SQL_PANEL_COLLAPSED_HEIGHT : sqlPanelHeight}px`,
      }}
    >
      <h1 className="sr-only">ตัวสร้างกราฟแบบเดิม</h1>
      <WorkspaceLayout columns="three" className="builder-v3-workspace">
        <div className="builder-v3-column builder-v3-column-left">
          <FieldList
            dataset={builder.explorerDataset}
            schema={builder.effectiveSchema}
            queryMode={builder.queryMode}
            mappedFieldNames={mappedFieldNames}
            onDragStart={(event, field) => {
              event.dataTransfer.setData("application/json", JSON.stringify(field));
              event.dataTransfer.effectAllowed = "copy";
            }}
          />
        </div>

        <div className="builder-v3-column builder-v3-column-main">
          <div className="builder-v3-center-scroll">
            <div className="builder-v3-chart-builder-stack">
              <ChartTypePicker
                templates={builder.templates}
                selectedTemplateId={builder.selectedTemplateId}
                onChange={builder.setSelectedTemplate}
              />
              <ChartMappingPanel
                template={builder.selectedTemplate}
                mapping={builder.mapping}
                validation={builder.validation}
                availableFields={builder.effectiveSchema?.fields ?? []}
                onDropField={builder.assignField}
                onRemoveField={builder.removeField}
                canAssignField={builder.canAssignField}
              />
            </div>
            <ChartPreviewPanel
              previewConfig={builder.previewConfig}
              settings={builder.settings}
              validation={builder.validation}
            />
          </div>
        </div>

        <div className="builder-v3-column builder-v3-column-right">
          <section className="builder-v3-panel builder-v3-tabbed-builder-panel">
            <div className="builder-v3-section-head">
              <div>
                <span className="builder-v3-kicker">ตั้งค่า</span>
                <h2 className="builder-v3-title">การตั้งค่ากราฟ</h2>
              </div>
              <button type="button" className="builder-v3-button is-primary builder-v3-top-save" onClick={() => setIsSaveModalOpen(true)}>
                บันทึกกราฟ
              </button>
            </div>
            <div className="builder-v3-settings-accordion-stack">
              <ChartSettingsPanel
                template={builder.selectedTemplate}
                mapping={builder.mapping}
                settings={builder.settings}
                onSettingChange={builder.updateSetting}
              />
              <details className="builder-v3-subsection builder-v3-format-accordion" name="builder-config-accordion">
                <summary className="builder-v3-inline-meta">
                  <strong>วิเคราะห์</strong>
                  <span>เพิ่มแนวโน้ม เป้าหมาย เกณฑ์ คาดการณ์ และเส้นอ้างอิง</span>
                </summary>
                <ChartAnalyticsPanel
                  template={builder.selectedTemplate}
                  settings={builder.settings}
                  onSettingChange={builder.updateSetting}
                />
              </details>
            </div>
          </section>
        </div>
      </WorkspaceLayout>

      {isSqlPanelCollapsed ? (
        sqlPanel
      ) : (
        <Resizable
          axis="y"
          height={sqlPanelHeight}
          width={0}
          minConstraints={[0, SQL_PANEL_MIN_HEIGHT]}
          maxConstraints={[0, getSqlPanelMaxHeight()]}
          resizeHandles={["n"]}
          handle={(_axis, ref) => (
            <span
              ref={ref}
              className="builder-v3-sql-resize-grip"
              role="separator"
              tabIndex={0}
              aria-label="Resize SQL preview panel"
              aria-controls="builder-sql-panel"
              aria-orientation="horizontal"
              aria-valuemin={SQL_PANEL_MIN_HEIGHT}
              aria-valuemax={getSqlPanelMaxHeight()}
              aria-valuenow={sqlPanelHeight}
              onKeyDown={handleSqlKeyboardResize}
            />
          )}
          onResize={handleSqlResize}
        >
          {sqlPanel}
        </Resizable>
      )}

      {isSaveModalOpen ? (
        <ChartSavePanel
          builderContext={builderContext}
          settings={builder.settings}
          validation={builder.validation}
          saving={builder.saving}
          error={builder.error}
          isEditing={builder.isEditing}
          onSettingChange={builder.updateSetting}
          onSave={handleSave}
          onCancel={handleCancel}
          onClose={() => setIsSaveModalOpen(false)}
        />
      ) : null}
    </PageContainer>
  );
}
