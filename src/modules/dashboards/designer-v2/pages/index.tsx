import React, { Suspense, lazy } from "react";
import { Alert, Box, Button, CssBaseline, Drawer, GlobalStyles, Skeleton, Snackbar, Stack, ThemeProvider, useMediaQuery } from "@mui/material";
import { shouldRenderDesignerPreview } from "@modules/dashboards/designer-v2/components/utils/designerLayout";
import { useLocation, useNavigate } from "react-router";
import { HTML5Backend } from "react-dnd-html5-backend";
import { DndProvider } from "react-dnd";
import BottomStatus from "@modules/dashboards/designer-v2/components/BottomStatus";
import ChartGallery from "@modules/dashboards/designer-v2/components/ChartGallery";
import DataPanel from "@modules/dashboards/designer-v2/components/DataPanel";
import FeaturePreviewDialog from "@modules/dashboards/designer-v2/components/FeaturePreviewDialog";
import FieldMapping from "@modules/dashboards/designer-v2/components/FieldMapping";
import MultiTableContext from "@modules/dashboards/designer-v2/components/MultiTableContext";
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
import { countActiveFilters } from "@modules/dashboards/designer-v2/components/utils/filterStatus";

const PreviewCanvas = lazy(() => import("@modules/dashboards/designer-v2/components/PreviewCanvas"));
const PropertyPanel = lazy(() => import("@modules/dashboards/designer-v2/components/PropertyPanel"));

type MobileDesignerTab = "tables" | "relationships" | "fields" | "mapping" | "preview" | "settings";

const mobileTabs: Array<{ id: MobileDesignerTab | "save"; label: string }> = [
  { id: "tables", label: "1 ตาราง" },
  { id: "relationships", label: "2 ความสัมพันธ์" },
  { id: "fields", label: "3 ฟิลด์" },
  { id: "mapping", label: "4 Mapping" },
  { id: "preview", label: "5 Preview" },
  { id: "save", label: "6 บันทึก" },
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
  const [mobileTab, setMobileTab] = React.useState<MobileDesignerTab>("tables");
  const [dataPanelOpen, setDataPanelOpen] = React.useState(true);
  const [settingsPanelOpen, setSettingsPanelOpen] = React.useState(true);
  const [settingsDrawerOpen, setSettingsDrawerOpen] = React.useState(false);
  const tabletOrMobile = useMediaQuery("(max-width:820px)");
  const laptop = useMediaQuery("(min-width:821px) and (max-width:1360px)");
  const activeDatasource = state.datasources.find((datasource) => datasource.id === state.activeDatasourceId) ?? state.datasources[0];
  const mobilePreviewOnly = !state.previewMode && mobileTab === "preview";
  const centerRows = state.previewMode ? "minmax(0, 1fr)" : "minmax(150px, auto) minmax(78px, auto) minmax(0, 1fr)";
  const mobileCenterRows = state.previewMode || mobilePreviewOnly ? "minmax(0, 1fr)" : "minmax(156px, auto) minmax(78px, auto)";
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
  const returnDashboardPath = React.useMemo(() => {
    const params = new URLSearchParams();
    if (returnContext.projectId) params.set("projectId", returnContext.projectId);
    if (returnContext.dashboardId) params.set("dashboardId", returnContext.dashboardId);
    const search = params.toString();
    return `/dashboard${search ? `?${search}` : ""}`;
  }, [returnContext.dashboardId, returnContext.projectId]);
  const handleSaveChart = React.useCallback(() => {
    actions.saveChart();
    if (state.returnToDashboard) {
      actions.showMessage("บันทึกกราฟแล้ว กำลังกลับไปแดชบอร์ด");
      window.setTimeout(() => {
        navigate(returnDashboardPath);
      }, 350);
    }
  }, [actions, navigate, returnDashboardPath, state.returnToDashboard]);

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
            display: { xs: "grid", sm: "flex", md: "none" },
            gridTemplateColumns: { xs: "repeat(3, minmax(0, 1fr))", sm: "none" },
            height: { xs: 64, sm: 34 },
            flex: { xs: "0 0 64px", sm: "0 0 34px" },
            alignItems: "center",
            gap: 0.5,
            px: 1,
            borderBottom: "1px solid",
            borderColor: tokens.color.borderSubtle,
            bgcolor: tokens.color.surface,
            overflowX: { xs: "hidden", sm: "auto" },
          }}
        >
          {mobileTabs.map((tab) => {
            const selected = mobileTab === tab.id;
            return (
              <Box
                key={tab.id}
                component="button"
                type="button"
                onClick={() => {
                  if (tab.id === "save") {
                    handleSaveChart();
                    return;
                  }
                  setMobileTab(tab.id);
                }}
                aria-pressed={selected}
                aria-selected={selected}
                role="tab"
                sx={{
                  appearance: "none",
                  height: 26,
                  px: 1,
                  minWidth: 0,
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

      {!state.previewMode && !tabletOrMobile ? (
        <Box
          sx={{
            height: 34,
            flex: "0 0 34px",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 0.5,
            px: 1,
            borderBottom: "1px solid",
            borderColor: tokens.color.borderSubtle,
            bgcolor: tokens.color.surface,
          }}
        >
          <Button
            size="small"
            variant="text"
            aria-expanded={dataPanelOpen}
            onClick={() => setDataPanelOpen((open) => !open)}
          >
            {dataPanelOpen ? "ยุบ DATA" : "เปิด DATA"}
          </Button>
          <Button
            size="small"
            variant="text"
            aria-expanded={laptop ? settingsDrawerOpen : settingsPanelOpen}
            onClick={() => laptop ? setSettingsDrawerOpen(true) : setSettingsPanelOpen((open) => !open)}
          >
            {laptop ? "เปิด Settings" : settingsPanelOpen ? "ยุบ Settings" : "เปิด Settings"}
          </Button>
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
              navigate(returnDashboardPath);
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
          position: "relative",
          gridTemplateColumns: state.previewMode
            ? "minmax(0, 1fr)"
            : `${dataPanelOpen ? "280px" : ""} minmax(0, 1fr) ${settingsPanelOpen ? "336px" : ""}`.trim(),
          gap: "10px",
          p: "10px",
          "@media (max-width: 1360px)": {
            gridTemplateColumns: state.previewMode
              ? "minmax(0, 1fr)"
              : dataPanelOpen ? "240px minmax(0, 1fr)" : "minmax(0, 1fr)",
            gap: "8px",
            p: "8px",
          },
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
        {state.datasetError ? (
          <Alert
            severity="error"
            role="alert"
            action={<Button color="inherit" size="small" onClick={actions.refreshDataset}>ลองใหม่</Button>}
            sx={{ position: "absolute", zIndex: tokens.zIndex.sticky, top: 8, left: "50%", transform: "translateX(-50%)", maxWidth: "calc(100% - 32px)" }}
          >
            {state.datasetError}
          </Alert>
        ) : null}
        {!state.previewMode ? (
        <Box sx={{ minHeight: 0, display: { xs: mobileTab === "tables" || mobileTab === "fields" ? "block" : "none", md: dataPanelOpen ? "block" : "none" } }}>
          <DataPanel
            datasources={state.datasources}
            schemaCatalog={state.externalSchemaCatalog}
            activeDatasourceId={state.activeDatasourceId}
            fields={state.fields}
            rows={state.rows}
            searchValue={state.searchValue}
            selectedTable={state.selectedTable}
            selectedFieldId={state.selectedFieldId}
            selectedTables={state.selectedTables}
            onSearchChange={actions.setSearchValue}
            onDatasourceChange={actions.setActiveDatasourceId}
            onSelectTable={actions.setSelectedTable}
            onSelectField={actions.setSelectedField}
          />
        </Box>
        ) : null}

        <Box
          sx={{
            minWidth: 0,
            minHeight: 0,
            display: { xs: mobileTab === "relationships" || mobileTab === "mapping" || mobileTab === "preview" || state.previewMode ? "grid" : "none", md: "grid" },
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
            <Box sx={{ display: { xs: mobileTab === "relationships" ? "block" : "none", md: "block" } }}>
              <MultiTableContext
                tables={state.selectedTables}
                joins={state.datasetJoins}
                fields={state.fields}
                queryPreview={state.queryPreview}
                safeCasts={state.safeCasts}
                onSetJoin={actions.setManualJoin}
                onRemoveTable={actions.removeDatasetTable}
                onSemanticTypeChange={actions.updateSemanticType}
                onSafeCastChange={actions.updateSafeCast}
                onAddCalculatedField={actions.addCalculatedField}
              />
            </Box>
            <Box sx={{ display: { xs: mobileTab === "mapping" ? "block" : "none", md: "block" } }}>
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

          {shouldRenderDesignerPreview(tabletOrMobile, mobileTab, state.previewMode) ? (
            <Suspense fallback={<Skeleton variant="rounded" height="100%" />}>
              <PreviewCanvas
              chart={state.selectedChart}
              config={state.config}
              datasetRows={state.rows}
              fields={state.fields}
              transformedData={state.transformedData}
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
          ) : null}
        </Box>

        {!state.previewMode ? (
        <Box sx={{ minHeight: 0, display: { xs: mobileTab === "settings" ? "block" : "none", md: laptop || !settingsPanelOpen ? "none" : "block" } }}>
          <Suspense fallback={<Skeleton variant="rounded" height="100%" />}>
            <PropertyPanel
              config={state.config}
              themePresets={state.demoThemes}
              onSettingsChange={actions.updateSettings}
              onSortChange={actions.changeSort}
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

      {!state.previewMode && laptop ? (
        <Drawer
          anchor="right"
          open={settingsDrawerOpen}
          onClose={() => setSettingsDrawerOpen(false)}
          ModalProps={{ keepMounted: true }}
          PaperProps={{ sx: { width: 336, maxWidth: "92vw", p: 1 } }}
        >
          <Box role="dialog" aria-label="Settings drawer" sx={{ height: "100%", minHeight: 0 }}>
            <Suspense fallback={<Skeleton variant="rounded" height="100%" />}>
              <PropertyPanel
                config={state.config}
                themePresets={state.demoThemes}
                onSettingsChange={actions.updateSettings}
                onSortChange={actions.changeSort}
                onThemePresetChange={actions.applyThemePreset}
                onSave={handleSaveChart}
                onPreview={actions.togglePreviewMode}
                onShare={() => actions.setShareOpen(true)}
                onExportJson={actions.exportJson}
                onExportCsv={actions.exportCsv}
                onExportPng={actions.exportPng}
                onReset={actions.resetConfig}
                onCopyConfig={() => { void actions.copyConfig(); }}
                onReplaceConfig={actions.replaceConfig}
              />
            </Suspense>
          </Box>
        </Drawer>
      ) : null}

      <BottomStatus
        chart={state.selectedChart}
        mappings={state.config.mappings}
        datasourceName={activeDatasource?.name ?? "ยังไม่ได้เลือกชุดข้อมูล"}
        sourceLabel={state.sqlSourceActive ? "SQL query" : activeDatasource ? "Dataset" : "ยังไม่มีข้อมูล"}
        rowCount={state.rows.length}
        fieldCount={state.fields.length}
        filteredRowCount={state.transformedData.filteredRows.length}
        activeFilterCount={countActiveFilters(state.config.filters)}
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
