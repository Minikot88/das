import React, { Suspense, lazy } from "react";
import { Alert, Box, CssBaseline, GlobalStyles, Skeleton, Snackbar, Stack, ThemeProvider } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import { HTML5Backend } from "react-dnd-html5-backend";
import { DndProvider } from "react-dnd";
import BottomStatus from "@modules/dashboards/designer-v2/components/BottomStatus";
import ChartGallery from "@modules/dashboards/designer-v2/components/ChartGallery";
import DataPanel from "@modules/dashboards/designer-v2/components/DataPanel";
import FeaturePreviewDialog from "@modules/dashboards/designer-v2/components/FeaturePreviewDialog";
import FieldMapping from "@modules/dashboards/designer-v2/components/FieldMapping";
import PresentationBar from "@modules/dashboards/designer-v2/components/PresentationBar";
import ShareDialog from "@modules/dashboards/designer-v2/components/ShareDialog";
import SqlQueryPanel from "@modules/dashboards/designer-v2/components/SqlQueryPanel";
import TemplateDialog from "@modules/dashboards/designer-v2/components/TemplateDialog";
import { getFutureFeature } from "@modules/dashboards/designer-v2/components/demo/futureFeatures";
import { chartCatalog } from "@modules/dashboards/designer-v2/components/mockData";
import { dashboardV2Theme, dashboardV2Tokens as tokens } from "@modules/dashboards/designer-v2/components/theme";
import { DashboardDesignerProvider } from "@modules/dashboards/designer-v2/context/DashboardDesignerContext";
import { useDashboardDesigner } from "@modules/dashboards/designer-v2/context/useDashboardDesigner";
import type { ChartType } from "@modules/dashboards/designer-v2/components/types";
import {
  setActiveDashboard as setStoredActiveDashboard,
  setActiveProject as setStoredActiveProject,
} from "@infrastructure/persistence/project-storage/projectStorage";

const PreviewCanvas = lazy(() => import("@modules/dashboards/designer-v2/components/PreviewCanvas"));
const PropertyPanel = lazy(() => import("@modules/dashboards/designer-v2/components/PropertyPanel"));

type MobileDesignerTab = "data" | "design" | "preview" | "settings";

const mobileTabs: Array<{ id: MobileDesignerTab; label: string }> = [
  { id: "data", label: "DATA" },
  { id: "design", label: "DESIGN" },
  { id: "preview", label: "PREVIEW" },
  { id: "settings", label: "SETTINGS" },
];

function GallerySkeleton() {
  return (
    <Box sx={{ height: 96, border: "1px solid", borderColor: "divider", p: 1, bgcolor: "background.paper" }}>
      <Stack spacing={0.5}>
        <Skeleton width={144} height={20} />
        <Stack direction="row" spacing={1}>
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} variant="rounded" width={80} height={24} />
          ))}
        </Stack>
        <Stack direction="row" spacing={1}>
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} variant="rounded" sx={{ flex: 1, minWidth: 108 }} height={54} />
          ))}
        </Stack>
      </Stack>
    </Box>
  );
}

function DashboardDesignerContent() {
  const { state, actions } = useDashboardDesigner();
  const navigate = useNavigate();
  const location = useLocation();
  const [templateOpen, setTemplateOpen] = React.useState(false);
  const [featurePreviewId, setFeaturePreviewId] = React.useState<string | null>(null);
  const [mobileTab, setMobileTab] = React.useState<MobileDesignerTab>("preview");
  const activeDatasource = state.datasources.find((datasource) => datasource.id === state.activeDatasourceId) ?? state.datasources[0];
  const mobilePreviewOnly = !state.previewMode && mobileTab === "preview";
  const centerRows = state.previewMode ? "minmax(0, 1fr)" : "minmax(150px, auto) minmax(78px, auto) minmax(0, 1fr)";
  const mobileCenterRows = state.previewMode || mobilePreviewOnly ? "minmax(0, 1fr)" : "minmax(156px, auto) minmax(78px, auto) minmax(0, 1fr)";
  const currentPresets = state.chartPresets.filter((preset) => !state.config.chartType || preset.chartTypes.includes(state.config.chartType));
  const featurePreview = getFutureFeature(featurePreviewId);
  const returnContext = React.useMemo(() => {
    const params = new URLSearchParams(location.search);
    return {
      projectId: params.get("projectId"),
      dashboardId: params.get("dashboardId"),
    };
  }, [location.search]);
  const closeTransientOverlays = React.useCallback(() => {
    setTemplateOpen(false);
    setFeaturePreviewId(null);
    actions.setShareOpen(false);
    actions.setSqlPanelOpen(false);
  }, [actions]);
  const restoreReturnContext = React.useCallback(() => {
    if (returnContext.projectId) {
      setStoredActiveProject(returnContext.projectId, returnContext.dashboardId || undefined);
      return;
    }
    if (returnContext.dashboardId) {
      setStoredActiveDashboard(returnContext.dashboardId);
    }
  }, [returnContext.dashboardId, returnContext.projectId]);
  const handleSaveChart = React.useCallback(() => {
    actions.saveChart();
    if (state.returnToDashboard) {
      actions.showMessage("บันทึกกราฟแล้ว กำลังกลับไปแดชบอร์ด");
      restoreReturnContext();
      window.setTimeout(() => {
        navigate("/dashboard");
      }, 350);
    }
  }, [actions, navigate, restoreReturnContext, state.returnToDashboard]);

  React.useEffect(() => {
    function handlePageHide() {
      closeTransientOverlays();
    }

    function handlePageShow(event: PageTransitionEvent) {
      if (event.persisted) closeTransientOverlays();
    }

    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("pageshow", handlePageShow);
    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [closeTransientOverlays]);

  React.useEffect(() => {
    function handleRibbonCommand(event: Event) {
      const detail = (event as CustomEvent<{ scope?: string; command?: string; chartType?: ChartType }>).detail;
      if (detail?.scope !== "chart") return;

      if (detail.command === "templates") {
        setTemplateOpen(true);
        return;
      }
      if (detail.command === "sql") {
        actions.setSqlPanelOpen(true);
        return;
      }
      if (detail.command === "presets") {
        document.querySelector("[data-testid='dashboard-v2-chart-selector']")?.scrollIntoView({ block: "nearest" });
        actions.showMessage("เลือก Preset ได้จากแถบประเภทกราฟ");
        return;
      }
      if (detail.command === "select" && detail.chartType) {
        actions.selectChart(detail.chartType);
        return;
      }
      if (detail.command === "save") {
        handleSaveChart();
        return;
      }
      if (detail.command === "preview") {
        actions.togglePreviewMode();
        return;
      }
      if (detail.command === "share") {
        actions.setShareOpen(true);
        return;
      }
      if (detail.command === "export") {
        actions.exportJson();
        actions.showMessage("ส่งออก JSON config แล้ว");
      }
    }

    window.addEventListener("mini-bi:ribbon-command", handleRibbonCommand);
    return () => {
      window.removeEventListener("mini-bi:ribbon-command", handleRibbonCommand);
    };
  }, [
    actions,
    handleSaveChart,
  ]);

  return (
    <Box
      className={`dashboard-v2-designer${state.previewMode ? " is-presentation-mode" : ""}`}
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.default",
        color: "text.primary",
        overflow: "hidden",
      }}
    >
      <h1 className="sr-only">ตัวสร้างกราฟ</h1>
      {state.previewMode ? (
        <PresentationBar
          deviceMode={state.deviceMode}
          zoom={state.zoom}
          onExit={actions.togglePreviewMode}
          onDeviceChange={actions.setDeviceMode}
          onZoomChange={actions.setZoom}
          onShare={() => actions.setShareOpen(true)}
          onExportPng={() => {
            void actions.exportPng();
          }}
        />
      ) : null}

      {!state.previewMode ? (
        <Box
          sx={{
            display: { xs: "flex", md: "none" },
            height: 34,
            flex: "0 0 34px",
            alignItems: "center",
            gap: 0.5,
            px: 1,
            borderBottom: "1px solid",
            borderColor: tokens.color.borderSubtle,
            bgcolor: tokens.color.surface,
            overflowX: "auto",
          }}
        >
          {mobileTabs.map((tab) => {
            const selected = mobileTab === tab.id;
            return (
              <Box
                key={tab.id}
                component="button"
                type="button"
                onClick={() => setMobileTab(tab.id)}
                aria-pressed={selected}
                sx={{
                  appearance: "none",
                  height: 26,
                  px: 1,
                  border: "1px solid",
                  borderColor: selected ? tokens.color.selectedBorder : "transparent",
                  borderRadius: `${tokens.radius.control}px`,
                  bgcolor: selected ? tokens.color.selectedSurface : "transparent",
                  color: selected ? tokens.color.primary : tokens.color.textMuted,
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  "&:hover": { bgcolor: tokens.color.primarySubtle },
                  "&:focus-visible": {
                    outline: `2px solid ${tokens.color.focusOutline}`,
                    outlineOffset: 1,
                  },
                }}
              >
                {tab.label}
              </Box>
            );
          })}
        </Box>
      ) : null}

      {!state.previewMode && state.returnToDashboard ? (
        <Box
          sx={{
            height: 32,
            flex: "0 0 32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            px: 1.25,
            borderBottom: "1px solid",
            borderColor: tokens.color.borderSubtle,
            bgcolor: tokens.color.surface,
            fontSize: 11,
            color: tokens.color.textMuted,
          }}
        >
          <span>กำลังแก้ไขกราฟจากตัวจัดวางแดชบอร์ด</span>
          <Box
            component="button"
            type="button"
            onClick={() => {
              restoreReturnContext();
              navigate("/dashboard");
            }}
            sx={{
              height: 24,
              px: 1,
              border: "1px solid",
              borderColor: tokens.color.border,
              borderRadius: `${tokens.radius.control}px`,
              bgcolor: tokens.color.surface,
              color: tokens.color.text,
              font: "inherit",
              fontWeight: 500,
              cursor: "pointer",
              "&:hover": { bgcolor: tokens.color.primarySubtle },
            }}
          >
            กลับแดชบอร์ด
          </Box>
        </Box>
      ) : null}

      <Box
        component="section"
        aria-label="พื้นที่ออกแบบกราฟ"
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
          display: "grid",
          gridTemplateColumns: state.previewMode ? "minmax(0, 1fr)" : "280px minmax(0, 1fr) 336px",
          gap: "10px",
          p: "10px",
          "@media (max-width: 1120px)": {
            gridTemplateColumns: state.previewMode ? "minmax(0, 1fr)" : "220px minmax(0, 1fr) 280px",
            gap: "8px",
            p: "8px",
          },
          "@media (max-width: 820px)": {
            gridTemplateColumns: "minmax(0, 1fr)",
            gap: "8px",
            p: "8px",
          },
        }}
      >
        {!state.previewMode ? (
        <Box sx={{ minHeight: 0, display: { xs: mobileTab === "data" ? "block" : "none", md: "block" } }}>
          <DataPanel
            datasources={state.datasources}
            activeDatasourceId={state.activeDatasourceId}
            fields={state.fields}
            rows={state.rows}
            searchValue={state.searchValue}
            selectedTable={state.selectedTable}
            selectedFieldId={state.selectedFieldId}
            sqlSourceActive={state.sqlSourceActive}
            onSearchChange={actions.setSearchValue}
            onDatasourceChange={actions.setActiveDatasourceId}
            onSelectTable={actions.setSelectedTable}
            onSelectField={actions.setSelectedField}
            onRestoreDemoDataset={actions.activateDemoDataset}
          />
        </Box>
        ) : null}

        <Box
          sx={{
            minWidth: 0,
            minHeight: 0,
            display: { xs: mobileTab === "design" || mobileTab === "preview" || state.previewMode ? "grid" : "none", md: "grid" },
            gridTemplateColumns: "minmax(0, 1fr)",
            gridTemplateRows: { xs: mobileCenterRows, md: centerRows },
            gap: "10px",
            transition: `grid-template-rows ${tokens.motion.base}`,
            "@media (max-width: 820px)": {
              gap: "8px",
            },
          }}
        >
          {!state.previewMode ? (
          <Box sx={{ minHeight: 0, overflow: "visible", display: { xs: mobilePreviewOnly ? "none" : "block", md: "block" } }}>
            <FieldMapping
              mappings={state.config.mappings}
              rows={state.rows}
              filters={state.config.filters}
              chartType={state.config.chartType}
              focusedSlotId={state.focusedSlotId}
              selectedField={state.selectedField}
              onDropField={actions.dropField}
              onRemoveField={actions.removeField}
              onAggregationChange={actions.changeAggregation}
              onFilterChange={actions.updateFilter}
              onSortSlot={actions.sortSlot}
            />
            </Box>
          ) : null}

          {!state.previewMode ? (
            <Box sx={{ minHeight: 0, overflow: "visible", display: { xs: mobilePreviewOnly ? "none" : "block", md: "block" } }}>
              {state.isLoading ? (
                <GallerySkeleton />
              ) : (
                <ChartGallery
                  charts={chartCatalog}
                  selectedChartId={state.selectedChartId}
                  selectedCategory={state.selectedCategory}
                  mappings={state.config.mappings}
                  presets={currentPresets}
                  onCategoryChange={actions.setSelectedCategory}
                  onSelectChart={actions.selectChart}
                  onApplyPreset={actions.applyChartPreset}
                />
              )}
            </Box>
          ) : null}

          <Suspense fallback={<Skeleton variant="rounded" height="100%" />}>
            <PreviewCanvas
              chart={state.selectedChart}
              config={state.config}
              datasetRows={state.rows}
              fields={state.fields}
              previewMode={state.previewMode}
              deviceMode={state.deviceMode}
              zoom={state.zoom}
              canUndo={state.canUndo}
              canRedo={state.canRedo}
              insights={state.demoInsights}
              previewRef={state.previewRef}
              onDeviceChange={actions.setDeviceMode}
              onZoomChange={actions.setZoom}
              onCanvasDrop={actions.dropFieldOnCanvas}
              onUndo={actions.undo}
              onRedo={actions.redo}
              onRefresh={actions.refreshDataset}
              onResetChart={actions.resetConfig}
            />
          </Suspense>
        </Box>

        {!state.previewMode ? (
        <Box sx={{ minHeight: 0, display: { xs: mobileTab === "settings" ? "block" : "none", md: "block" } }}>
          <Suspense fallback={<Skeleton variant="rounded" height="100%" />}>
            <PropertyPanel
              config={state.config}
              saveStatus={state.saveStatus}
              lastSavedAt={state.lastSavedAt}
              themePresets={state.demoThemes}
              onSettingsChange={actions.updateSettings}
              onThemePresetChange={actions.applyThemePreset}
              onSave={handleSaveChart}
              onPreview={actions.togglePreviewMode}
              onShare={() => actions.setShareOpen(true)}
              onExportJson={actions.exportJson}
              onExportCsv={actions.exportCsv}
              onExportPng={actions.exportPng}
              onReset={actions.resetConfig}
              onCopyConfig={() => {
                void actions.copyConfig();
              }}
              onReplaceConfig={actions.replaceConfig}
            />
          </Suspense>
        </Box>
        ) : null}
      </Box>

      <BottomStatus
        chart={state.selectedChart}
        mappings={state.config.mappings}
        datasourceName={activeDatasource.name}
        sourceLabel={state.sqlSourceActive ? "Demo SQL" : "Demo Dataset"}
        rowCount={state.rows.length}
        fieldCount={state.fields.length}
        filteredRowCount={state.transformedData.filteredRows.length}
        saveStatus={state.saveStatus}
        lastSavedAt={state.lastSavedAt}
      />

      <ShareDialog
        open={state.shareOpen}
        access={state.shareAccess}
        copyFallback={state.shareCopyFallback}
        onAccessChange={(access) => {
          actions.setShareAccess(access);
          if (access === "team") setFeaturePreviewId("team-workspace");
        }}
        onClose={() => actions.setShareOpen(false)}
        onCopy={() => {
          void actions.copyShareLink();
        }}
        onCopyEmbed={() => {
          void actions.copyShareEmbed();
        }}
      />

      <TemplateDialog
        open={templateOpen}
        templates={state.templates}
        activeTemplateId={state.activeTemplateId}
        onApply={actions.applyDemoTemplate}
        onClose={() => setTemplateOpen(false)}
      />

      <SqlQueryPanel
        open={state.sqlPanelOpen}
        query={state.sqlQuery}
        result={state.sqlResult}
        error={state.sqlError}
        examples={state.sqlExamples}
        savedQueries={state.savedSqlQueries}
        isActiveDataset={state.sqlSourceActive}
        onClose={() => actions.setSqlPanelOpen(false)}
        onQueryChange={actions.setSqlQuery}
        onRun={actions.runSqlQuery}
        onFormat={actions.formatSqlQuery}
        onClear={actions.clearSqlQuery}
        onLoadExample={actions.loadSqlExample}
        onUseResult={actions.useSqlResultAsDataset}
        onExportResultCsv={actions.exportSqlResultCsv}
        onCopyQuery={actions.copySqlQuery}
        onSaveQuery={actions.saveCurrentSqlQuery}
        onLoadSaved={actions.loadSavedSqlQuery}
        onRenameSaved={actions.renameSavedSqlQuery}
        onDeleteSaved={actions.deleteSavedSqlQuery}
        onRunSaved={actions.runSavedSqlQuery}
      />

      <FeaturePreviewDialog feature={featurePreview} onClose={() => setFeaturePreviewId(null)} />

      <Snackbar
        open={Boolean(state.snackbar)}
        autoHideDuration={2400}
        onClose={actions.closeSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        sx={{ mb: 3, mr: 2 }}
      >
        <Alert
          severity="success"
          variant="standard"
          onClose={actions.closeSnackbar}
          sx={{
            minWidth: 240,
            maxWidth: 360,
            borderRadius: `${tokens.radius.control}px`,
            boxShadow: tokens.shadow.toast,
            alignItems: "center",
            bgcolor: tokens.color.surface,
            color: tokens.color.text,
            fontSize: 12,
          }}
        >
          {state.snackbar}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default function DashboardDesignerV2() {
  return (
    <ThemeProvider theme={dashboardV2Theme}>
      <CssBaseline />
      <GlobalStyles
        styles={{
          html: { height: "100dvh", overflow: "hidden" },
          body: { height: "100dvh", overflow: "hidden" },
          "#root": { height: "100dvh", overflow: "hidden" },
        }}
      />
      <DndProvider backend={HTML5Backend}>
        <DashboardDesignerProvider>
          <DashboardDesignerContent />
        </DashboardDesignerProvider>
      </DndProvider>
    </ThemeProvider>
  );
}
