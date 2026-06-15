import React, { useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
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
import ChartAnalyticsPanel from "./ChartAnalyticsPanel";
import ChartSavePanel from "./ChartSavePanel";
import useChartBuilder from "./hooks/useChartBuilder";

function getBuilderContextFromRoute(locationState, fallbackContext) {
  return locationState?.builderContext ?? fallbackContext ?? null;
}

function getFirstMappingValue(mapping = {}, keys = []) {
  for (const key of keys) {
    const value = mapping[key];
    if (Array.isArray(value)) {
      const first = value.find(Boolean);
      if (first) return first;
      continue;
    }
    if (value) return value;
  }
  return "";
}

function getFieldLabel(schema, fieldName) {
  if (!fieldName) return "ยังไม่ได้เลือก";
  const field = Array.isArray(schema?.fields)
    ? schema.fields.find((item) => item.name === fieldName)
    : null;
  return field?.label || fieldName;
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
  const summaryFields = useMemo(() => {
    const mapping = builder.mapping ?? {};
    const xField = getFirstMappingValue(mapping, ["x", "category", "row"]);
    const yField = getFirstMappingValue(mapping, ["y", "value", "column"]);
    const seriesField = getFirstMappingValue(mapping, ["series", "legend", "label"]);
    return [
      { label: "ประเภทกราฟ", value: builder.selectedTemplate?.name || builder.selectedTemplate?.id || "ยังไม่ได้เลือก" },
      { label: "ชุดข้อมูล", value: builder.explorerDataset?.name || builder.explorerDataset?.id || "ยังไม่ได้เลือก" },
      { label: "X Axis", value: getFieldLabel(builder.effectiveSchema, xField) },
      { label: "Y Axis", value: getFieldLabel(builder.effectiveSchema, yField) },
      { label: "Series", value: getFieldLabel(builder.effectiveSchema, seriesField) },
    ];
  }, [builder.effectiveSchema, builder.explorerDataset, builder.mapping, builder.selectedTemplate]);
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

  return (
    <PageContainer className="builder-shell builder-v3-shell">
      <section className="builder-v3-summary-bar" aria-label="สรุปกราฟ">
        <div className="builder-v3-summary-grid">
          {summaryFields.map((item) => (
            <div key={item.label} className="builder-v3-summary-item">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
        <button type="button" className="builder-v3-button is-primary builder-v3-top-save" onClick={() => setIsSaveModalOpen(true)}>
          บันทึกกราฟ
        </button>
      </section>

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
            <ChartTypePicker
              templates={builder.templates}
              selectedTemplateId={builder.selectedTemplateId}
              onChange={builder.setSelectedTemplate}
            />
            <ChartPreviewPanel
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
          <section className="builder-v3-panel builder-v3-tabbed-builder-panel">
            <div className="builder-v3-section-head">
              <div>
                <span className="builder-v3-kicker">ตั้งค่า</span>
                <h2 className="builder-v3-title">การตั้งค่ากราฟ</h2>
              </div>
            </div>
            <div className="builder-v3-settings-accordion-stack">
              <details className="builder-v3-subsection builder-v3-format-accordion" open>
                <summary className="builder-v3-inline-meta">
                  <strong>ฟิลด์</strong>
                  <span>แมปฟิลด์ข้อมูลเข้ากับบทบาทของกราฟ</span>
                </summary>
                <ChartMappingPanel
                  template={builder.selectedTemplate}
                  mapping={builder.mapping}
                  validation={builder.validation}
                  onDropField={builder.assignField}
                  onRemoveField={builder.removeField}
                  canAssignField={builder.canAssignField}
                />
              </details>
              <ChartSettingsPanel
                template={builder.selectedTemplate}
                mapping={builder.mapping}
                settings={builder.settings}
                onSettingChange={builder.updateSetting}
              />
              <details className="builder-v3-subsection builder-v3-format-accordion">
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
