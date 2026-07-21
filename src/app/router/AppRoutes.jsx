import React, { Suspense, lazy } from "react";
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { MainLayout } from "@app/layouts/Layout";
import RouteErrorBoundary from "@app/error-boundaries/RouteErrorBoundary";
import { useStore } from "@/store/useStore";

const BuilderPage = lazy(() => import("@modules/charts/pages/Builder.jsx"));
const DashboardCanvasBuilder = lazy(() => import("@modules/dashboards/current/DashboardCanvasBuilder.jsx"));
const DashboardDesignerV2 = lazy(() => import("@modules/dashboards/designer-v2/pages"));
const DashboardPage = lazy(() => import("@modules/dashboards/legacy/pages/DashboardPage.jsx"));
const DashboardPublicPage = lazy(() => import("@modules/sharing/pages/DashboardPublicPage.jsx"));
const DatabaseConnectionPage = lazy(() => import("@modules/connections/pages/DatabaseConnectionPage.jsx"));
const DatasetsPage = lazy(() => import("@modules/datasets/pages/DatasetsPage.jsx"));
const HomePage = lazy(() => import("@modules/projects/pages/HomePage.jsx"));
const LoginPage = lazy(() => import("@modules/auth/pages/LoginPage"));
const RegisterPage = lazy(() => import("@modules/auth/pages/RegisterPage"));
const SettingsPage = lazy(() => import("@modules/settings/pages/SettingsPage.jsx"));
const SharePage = lazy(() => import("@modules/sharing/pages/SharePage"));

function RouteFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        color: "var(--muted)",
        background: "var(--app-bg)",
      }}
    >
      Loading workspace...
    </div>
  );
}

function ProtectedRoute() {
  const location = useLocation();
  const isAuthenticated = useStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

function withRouteBoundary(element) {
  return <RouteErrorBoundary>{element}</RouteErrorBoundary>;
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/login" element={withRouteBoundary(<LoginPage />)} />
        <Route path="/register" element={withRouteBoundary(<RegisterPage />)} />
        <Route path="/share/:sheetId" element={withRouteBoundary(<SharePage />)} />
        <Route path="/dashboard/:dashboardId/view" element={withRouteBoundary(<DashboardPublicPage />)} />
        <Route path="/dashboard/:dashboardId/embed" element={withRouteBoundary(<DashboardPublicPage />)} />

        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route index element={withRouteBoundary(<HomePage />)} />
            <Route path="/home" element={withRouteBoundary(<HomePage />)} />
            <Route path="/dashboard" element={withRouteBoundary(<DashboardCanvasBuilder />)} />
            <Route path="/dashboard-v2" element={withRouteBoundary(<DashboardDesignerV2 />)} />
            <Route path="/dashboard-legacy" element={withRouteBoundary(<DashboardPage />)} />
            <Route path="/builder" element={withRouteBoundary(<BuilderPage />)} />
            <Route path="/connections" element={withRouteBoundary(<DatabaseConnectionPage />)} />
            <Route path="/datasets" element={withRouteBoundary(<DatasetsPage />)} />
            <Route path="/settings" element={withRouteBoundary(<SettingsPage />)} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </Suspense>
  );
}
