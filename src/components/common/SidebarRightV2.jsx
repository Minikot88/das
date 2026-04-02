import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useStore } from "../../store/useStore";
import { getCacheStats, getLastQueryResult } from "../../utils/queryCache";
import { buildQuery } from "../../utils/queryEngine";
import { useI18n } from "../../utils/i18n";
import { normalizeChartConfig } from "../../utils/normalizeChartConfig";

function SharePanel({ sheetId }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [generatedShareId, setGeneratedShareId] = useState(null);
  const generateShareLink = useStore((state) => state.generateShareLink);

  const shareUrl = generatedShareId
    ? `${window.location.origin}/share/${generatedShareId}`
    : `${window.location.origin}/share/${sheetId}`;

  const handleGenerate = () => {
    const shareId = generateShareLink(sheetId);
    setGeneratedShareId(shareId);
    setCopied(false);
  };

  const handleCopy = () => {
    navigator.clipboard?.writeText(shareUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
      <div className="dashboard-rail-card dashboard-rail-subcard">
      <div className="dashboard-rail-card-head">
        <span className="filter-panel-header">{t("app.shareDashboard")}</span>
        <strong>Read-only delivery</strong>
      </div>
      <div className="share-url" title={shareUrl}>{shareUrl}</div>
      <div className="dashboard-rail-action-stack compact">
        <button type="button" className="rp-btn primary" onClick={handleGenerate}>
          {t("app.generateReadonlyLink")}
        </button>
        <button type="button" className="rp-btn" onClick={handleCopy}>
          {copied ? t("app.copied") : t("app.copyLink")}
        </button>
      </div>
    </div>
  );
}

function InsightPanel() {
  const { t } = useI18n();
  const aiInsights = useStore((state) => state.aiInsights);
  const isLoadingInsights = useStore((state) => state.isLoadingInsights);
  const cacheStats = getCacheStats();
  const lastQuery = getLastQueryResult();

  return (
    <div className="right-panel-section">
      <div className="panel-section-title">{t("app.analysis")}</div>
      {isLoadingInsights ? (
        <p className="sidebar-muted-copy">{t("app.refreshingInsights")}</p>
      ) : aiInsights.length ? (
        <div className="dashboard-rail-card dashboard-rail-card-emphasis">
          <div className="dashboard-rail-card-head">
            <span className="filter-panel-header">Insights</span>
            <strong>Top signals</strong>
          </div>
          {aiInsights.slice(0, 3).map((insight) => (
            <div key={insight.chartId} className="insight-card">
              <div className="insight-title">{insight.title}</div>
              <div className="insight-row"><span>Max</span><strong>{insight.max}</strong></div>
              <div className="insight-row"><span>Min</span><strong>{insight.min}</strong></div>
              <div className="insight-row"><span>Trend</span><strong>{insight.trendLabel}</strong></div>
            </div>
          ))}
        </div>
      ) : (
        <p className="sidebar-muted-copy">{t("app.insightsWaiting")}</p>
      )}

      <div className="dashboard-rail-card">
        <div className="dashboard-rail-card-head">
          <span className="filter-panel-header">{t("app.queryCache")}</span>
          <strong>Query cache</strong>
        </div>
        <div className="insight-row"><span>{t("app.entries")}</span><strong>{cacheStats.size}</strong></div>
        <div className="insight-row"><span>{t("app.lastSource")}</span><strong>{lastQuery?.meta?.table ?? lastQuery?.meta?.source ?? t("common.unavailable")}</strong></div>
        <div className="insight-row"><span>{t("app.lastRows")}</span><strong>{lastQuery?.meta?.rowCount ?? 0}</strong></div>
      </div>
    </div>
  );
}

function DashboardControls({ activeSheet, activeDashboardName, widgetCount, datasetCount }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const clearSheet = useStore((state) => state.clearSheet);
  const [showShare, setShowShare] = useState(false);

  return (
    <div className="right-panel-section">
      <div className="panel-section-title">{t("app.dashboardControls")}</div>
      <div className="dashboard-rail-card dashboard-rail-hero">
        <div className="dashboard-rail-card-head">
          <span className="filter-panel-header">Workspace</span>
          <strong>{activeDashboardName ?? "Dashboard"}</strong>
        </div>
        <div className="dashboard-rail-stats">
          <div>
            <span>Widgets</span>
            <strong>{widgetCount}</strong>
          </div>
          <div>
            <span>Datasets</span>
            <strong>{datasetCount}</strong>
          </div>
        </div>
        <div className="dashboard-rail-action-stack">
          <button type="button" className="rp-btn primary" onClick={() => navigate("/builder")}>{t("app.newChart")}</button>
          <button type="button" className="rp-btn" onClick={() => setShowShare((value) => !value)}>{showShare ? t("app.hideShare") : t("app.shareDashboard")}</button>
          <button
            type="button"
            className="rp-btn danger"
            onClick={() => {
              if (activeSheet && window.confirm(t("app.clearSheetConfirm"))) {
                clearSheet(activeSheet.id);
              }
            }}
          >
            {t("app.clearSheet")}
          </button>
        </div>
      </div>
      {showShare && activeSheet ? <SharePanel sheetId={activeSheet.id} /> : null}
    </div>
  );
}

function BuilderQueryInspector() {
  const { t } = useI18n();
  const builderState = useStore((state) => state.builderState);
  const cacheStats = getCacheStats();
  const queryPreview = buildQuery({ dataset: builderState.selectedTable, x: builderState.xField, y: builderState.yField, groupBy: builderState.groupField, aggregate: builderState.aggregation });
  const queryStatus = queryPreview.sql ? t("app.readyToInspect") : t("app.addTableAndFields");
  const outputColumns = queryPreview.columns?.length ? queryPreview.columns.join(", ") : t("common.unavailable");

  return (
    <div className="right-panel-section">
      <div className="panel-section-title">{t("app.builderQuery")}</div>
      <div className="dashboard-rail-card builder-inspector-panel">
        <div className="dashboard-rail-card-head">
          <span className="filter-panel-header">{t("app.liveSqlStatus")}</span>
          <strong>SQL readiness</strong>
        </div>
        <div className="insight-row"><span>{t("app.state")}</span><strong>{queryStatus}</strong></div>
        <div className="insight-row"><span>{t("common.table")}</span><strong>{builderState.selectedTable ?? t("common.notSelected")}</strong></div>
        <div className="insight-row"><span>{t("app.aggregate")}</span><strong>{String(builderState.aggregation ?? "sum").toUpperCase()}</strong></div>
        <div className="insight-row"><span>{t("app.output")}</span><strong>{outputColumns}</strong></div>
        <div className="builder-inspector-note">{t("app.queryInspectorNote")}</div>
      </div>
      <div className="dashboard-rail-card builder-inspector-panel">
        <div className="dashboard-rail-card-head">
          <span className="filter-panel-header">{t("app.cacheContext")}</span>
          <strong>Preview cache</strong>
        </div>
        <div className="insight-row"><span>{t("app.entries")}</span><strong>{cacheStats.size}</strong></div>
        <div className="insight-row"><span>{t("app.generatedLines")}</span><strong>{queryPreview.sql ? queryPreview.sql.split("\n").length : 0}</strong></div>
        <div className="insight-row"><span>{t("app.parameters")}</span><strong>{queryPreview.params?.length ?? 0}</strong></div>
      </div>
    </div>
  );
}

export default function SidebarRightV2() {
  const { t } = useI18n();
  const location = useLocation();
  const projects = useStore((state) => state.projects);
  const chartsPool = useStore((state) => state.charts);
  const activeProjectId = useStore((state) => state.activeProjectId);
  const activeSheetId = useStore((state) => state.activeSheetId);
  const activeDashboardId = useStore((state) => state.activeDashboardId);
  const rightPanelOpen = useStore((state) => state.rightPanelOpen);
  const setRightPanelOpen = useStore((state) => state.setRightPanelOpen);

  const activeProject = projects.find((project) => project.id === activeProjectId) ?? projects[0];
  const activeSheet = activeProject?.sheets.find((sheet) => sheet.id === activeSheetId) ?? activeProject?.sheets[0];
  const activeDashboard = activeSheet?.dashboards?.find((dashboard) => dashboard.id === activeDashboardId) ?? activeSheet?.dashboards?.[0] ?? null;
  const dashboardCharts = activeDashboard?.layout?.map((item) => {
    const saved = chartsPool.find((chart) => chart.id === item.chartId);
    return saved ? normalizeChartConfig(saved.config) : null;
  }).filter(Boolean) ?? [];
  const datasetCount = [...new Set(dashboardCharts.map((chart) => chart.dataset).filter(Boolean))].length;
  const isDashboard = location.pathname === "/dashboard";
  const isBuilder = location.pathname === "/builder";

  if (isDashboard) {
    return null;
  }

  return (
    <>
      {rightPanelOpen ? <div className="right-panel-backdrop" aria-hidden="true" onClick={() => setRightPanelOpen(false)} /> : null}
      <aside className={`sidebar-right${rightPanelOpen ? " mobile-open" : ""}${isDashboard ? " dashboard-insight-rail" : ""}`} aria-label={t("app.workspacePanel")}>
        <div className="sidebar-right-header">
          <div className="panel-section-title">{t("app.workspacePanel")}</div>
          <button type="button" className="sidebar-right-close" onClick={() => setRightPanelOpen(false)}>{t("common.close")}</button>
        </div>
        {isDashboard ? (
          <>
            <DashboardControls
              activeSheet={activeSheet}
              activeDashboardName={activeDashboard?.name ?? activeSheet?.name}
              widgetCount={dashboardCharts.length}
              datasetCount={datasetCount}
            />
            <InsightPanel />
          </>
        ) : null}
        {isBuilder ? <BuilderQueryInspector /> : null}
      </aside>
    </>
  );
}
