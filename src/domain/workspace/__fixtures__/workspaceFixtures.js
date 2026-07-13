import { createEmptyWorkspace } from "../workspaceSchema";

export const FIXED_TIMESTAMP = "2026-07-11T00:00:00.000Z";
export const fixedClock = () => FIXED_TIMESTAMP;

export function createValidWorkspaceFixture() {
  return {
    ...createEmptyWorkspace(fixedClock),
    active: { projectId: "project-1", dashboardId: "dashboard-1" },
    projects: [
      {
        id: "project-1",
        name: "Sales workspace",
        datasets: [
          {
            id: "dataset-1",
            projectId: "project-1",
            name: "Revenue",
            source: "revenue.csv",
            fields: [{ id: "region", name: "region", label: "Region", type: "text" }],
            rows: [{ id: "row-1", region: "North" }],
            rowCount: 1,
            columnCount: 1,
            validation: { valid: true, errors: [], warnings: [] },
            createdAt: FIXED_TIMESTAMP,
            updatedAt: FIXED_TIMESTAMP,
          },
        ],
        charts: [
          {
            id: "chart-1",
            projectId: "project-1",
            datasetId: "dataset-1",
            name: "Revenue by region",
            title: "Revenue by region",
            chartType: "bar",
            engine: "echarts",
            config: {},
            dataContract: {
              sourceType: "dataset",
              datasetId: "dataset-1",
              fields: [{ id: "region", name: "region", label: "Region", type: "text" }],
              rows: [],
            },
            createdAt: FIXED_TIMESTAMP,
            updatedAt: FIXED_TIMESTAMP,
          },
        ],
        dashboards: [
          {
            id: "dashboard-1",
            projectId: "project-1",
            name: "Executive overview",
            widgets: [
              {
                id: "widget-1",
                projectId: "project-1",
                dashboardId: "dashboard-1",
                kind: "chart",
                chartId: "chart-1",
                layout: { x: 0, y: 0, w: 6, h: 4, zIndex: 1 },
                presentation: {},
                chartSnapshot: null,
                assetRef: null,
                createdAt: FIXED_TIMESTAMP,
                updatedAt: FIXED_TIMESTAMP,
              },
            ],
            canvasSettings: {},
            legacySheetId: "sheet-1",
            createdAt: FIXED_TIMESTAMP,
            updatedAt: FIXED_TIMESTAMP,
          },
        ],
        shares: [
          {
            id: "share-1",
            projectId: "project-1",
            dashboardId: "dashboard-1",
            legacySheetId: "sheet-1",
            mode: "local-readonly",
            snapshot: {},
            createdAt: FIXED_TIMESTAMP,
            updatedAt: FIXED_TIMESTAMP,
          },
        ],
        connectionProfiles: [],
        legacySheetAliases: [
          { sheetId: "sheet-1", name: "Sheet 1", dashboardIds: ["dashboard-1"] },
        ],
        createdAt: FIXED_TIMESTAMP,
        updatedAt: FIXED_TIMESTAMP,
      },
    ],
  };
}

export function createZustandLegacyFixture() {
  return {
    version: 8,
    activeProjectId: "project-1",
    activeSheetId: "sheet-1",
    activeDashboardId: "dashboard-1",
    projects: [
      {
        id: "project-1",
        name: "Legacy workspace",
        sheets: [
          {
            id: "sheet-1",
            name: "Sales sheet",
            activeDashboardId: "dashboard-1",
            dashboards: [
              {
                id: "dashboard-1",
                name: "Legacy dashboard",
                charts: [{ instanceId: "widget-shared", chartId: "chart-shared" }],
                layout: [{ i: "widget-shared", x: 0, y: 0, w: 6, h: 4 }],
                canvasSize: { width: 1440, height: 900 },
              },
            ],
          },
        ],
      },
    ],
    importedDatasets: [
      {
        id: "dataset-shared",
        name: "Imported revenue",
        source: "revenue.csv",
        fields: [{ name: "region", label: "Region", type: "category" }],
        rows: [{ id: "row-1", region: "North" }],
        rowCount: 1,
        columnCount: 1,
        validation: { valid: true, errors: [], warnings: [] },
        createdAt: FIXED_TIMESTAMP,
        updatedAt: FIXED_TIMESTAMP,
      },
    ],
    charts: [
      {
        id: "chart-shared",
        projectId: "project-1",
        datasetId: "dataset-shared",
        name: "Legacy revenue",
        title: "Legacy revenue",
        chartType: "bar",
        config: { legacy: true },
        createdAt: FIXED_TIMESTAMP,
        updatedAt: FIXED_TIMESTAMP,
      },
    ],
    shareLinks: {
      "share-1": {
        id: "share-1",
        projectId: "project-1",
        sheetId: "sheet-1",
        dashboardId: "dashboard-1",
        mode: "dashboard-readonly",
        snapshot: { title: "Local snapshot" },
        createdAt: FIXED_TIMESTAMP,
      },
    },
    theme: "dark",
    locale: "th",
    appSettings: {
      theme: "dark",
      density: "compact",
      dateFormat: "dd/MM/yyyy",
      numberFormat: "standard",
      dashboardPreferences: { showWidgetHeaders: true },
    },
  };
}

export function createProjectStorageLegacyFixture() {
  return [
    {
      id: "project-1",
      name: "Current workspace",
      datasets: [
        {
          id: "dataset-shared",
          projectId: "project-1",
          name: "Revenue metadata",
          source: "catalog",
          fields: [],
          rows: [],
          createdAt: FIXED_TIMESTAMP,
          updatedAt: FIXED_TIMESTAMP,
        },
        {
          id: "dataset-current",
          projectId: "project-1",
          name: "Current-only dataset",
          source: "demo",
          fields: [],
          rows: [],
          createdAt: FIXED_TIMESTAMP,
          updatedAt: FIXED_TIMESTAMP,
        },
      ],
      charts: [
        {
          id: "chart-shared",
          projectId: "project-1",
          datasetId: "dataset-shared",
          name: "Current revenue",
          title: "Current revenue",
          chartType: "line",
          config: { current: true },
          createdAt: FIXED_TIMESTAMP,
          updatedAt: FIXED_TIMESTAMP,
        },
        {
          id: "chart-current",
          projectId: "project-1",
          datasetId: "dataset-current",
          name: "Current-only chart",
          title: "Current-only chart",
          chartType: "bar",
          config: {},
          createdAt: FIXED_TIMESTAMP,
          updatedAt: FIXED_TIMESTAMP,
        },
      ],
      dashboards: [
        {
          id: "dashboard-1",
          projectId: "project-1",
          name: "Current dashboard",
          widgets: [
            {
              id: "widget-shared",
              projectId: "project-1",
              dashboardId: "dashboard-1",
              type: "text",
              sourceChartId: null,
              x: 1,
              y: 1,
              w: 4,
              h: 2,
              zIndex: 2,
              config: { text: "Current note" },
              createdAt: FIXED_TIMESTAMP,
              updatedAt: FIXED_TIMESTAMP,
            },
          ],
          canvasSettings: { width: 1440, height: 900 },
          createdAt: FIXED_TIMESTAMP,
          updatedAt: FIXED_TIMESTAMP,
        },
      ],
      createdAt: FIXED_TIMESTAMP,
      updatedAt: FIXED_TIMESTAMP,
    },
  ];
}
