import React, { Suspense, lazy } from "react";
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { MainLayout } from "@/components/layout/Layout";
import RouteErrorBoundary from "@/components/common/RouteErrorBoundary";
import { useStore } from "@/store/useStore";

const BuilderPage = lazy(() => import("@/pages/Builder.jsx"));
const DashboardCanvasBuilder = lazy(() => import("@/pages/DashboardCanvasBuilder.jsx"));
const DashboardDesignerV2 = lazy(() => import("@/pages/DashboardDesignerV2"));
const DashboardPage = lazy(() => import("@/pages/DashboardPage.jsx"));
const DashboardPublicPage = lazy(() => import("@/pages/DashboardPublicPage.jsx"));
const DatabaseConnectionPage = lazy(() => import("@/pages/DatabaseConnectionPage.jsx"));
const DatasetsPage = lazy(() => import("@/pages/DatasetsPage.jsx"));
const HomePage = lazy(() => import("@/pages/HomePage.jsx"));
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const RegisterPage = lazy(() => import("@/pages/RegisterPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage.jsx"));
const SharePage = lazy(() => import("@/pages/SharePage"));

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
