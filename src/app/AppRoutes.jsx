import React, { Suspense, lazy } from "react";
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { MainLayout } from "@/components/layout/Layout";
import { useStore } from "@/store/useStore";

const BuilderPage = lazy(() => import("@/pages/Builder.jsx"));
const DashboardPage = lazy(() => import("@/pages/DashboardPage.jsx"));
const DashboardPublicPage = lazy(() => import("@/pages/DashboardPublicPage.jsx"));
const HomePage = lazy(() => import("@/pages/HomePage.jsx"));
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const RegisterPage = lazy(() => import("@/pages/RegisterPage"));
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

export default function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/share/:sheetId" element={<SharePage />} />
        <Route path="/dashboard/:dashboardId/view" element={<DashboardPublicPage />} />
        <Route path="/dashboard/:dashboardId/embed" element={<DashboardPublicPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route index element={<HomePage />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/builder" element={<BuilderPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </Suspense>
  );
}
